# 12 — Messaging and streaming (Kafka, Kinesis, SQS)

**Goal:** when a BookNest order is placed, send the email, update analytics and reserve stock **without** making the user wait, and without losing or double-processing anything.

---

## 1. Why messages at all

Synchronous (everything in the request):

```text
POST /orders → save order → call email service → call analytics → call warehouse → 201
               if email is slow, the user waits; if analytics is down, the order fails
```

Asynchronous:

```text
POST /orders → save order + publish "OrderPlaced" → 201 (fast)
                         │
                         ├─► Email service   (sends when it can)
                         ├─► Analytics       (can be down for an hour, catches up)
                         └─► Warehouse
```

Benefits: faster responses, services do not need each other online (**decoupling**), traffic spikes are absorbed (**buffering**), new consumers can be added without touching the producer.

Costs: eventual consistency, harder debugging, duplicates and ordering problems you must handle.

---

## 2. Queue vs stream (the key distinction)

| | Queue (SQS, RabbitMQ) | Stream / log (Kafka, Kinesis) |
|---|---|---|
| Model | Message is a **task**; one worker takes it, then it is deleted | Message is an **event** in an append-only log; kept for days |
| Many consumers? | Competing workers share the work | Each consumer group reads **everything** independently |
| Replay old messages | No (gone after delete) | Yes, rewind the offset |
| Ordering | Best effort (FIFO queues: per group) | Strict **per partition / shard** |
| Good for | Background jobs: resize image, send email | Event history, many subscribers, analytics, high volume |

Pub/sub (SNS, Redis pub/sub) = fan-out to many subscribers. Common combo: **SNS → several SQS queues**.

---

## 3. Kafka in plain words

```text
Topic "orders" (like a table of events)
 ├─ partition 0: [e0][e1][e2][e3] ...  ← append only, each has an offset
 ├─ partition 1: [e0][e1] ...
 └─ partition 2: [e0][e1][e2] ...

Producer: picks the partition by hashing the KEY (e.g. orderId) → same key, same partition, kept in order
Consumer group "email-service": partitions divided among its instances; each instance tracks its offset
Consumer group "analytics":     reads the same data independently with its own offsets
```

- **Ordering is only guaranteed inside one partition.** Choose the key so events that must be ordered share it (all events for order 501 → key `501`).
- Max parallelism of one group = number of partitions. 6 partitions → at most 6 busy consumers.
- **Replication:** each partition has a leader and followers on other brokers. `acks=all` + `min.insync.replicas=2` = a write survives a broker crash.
- **Retention:** keep by time/size (e.g. 7 days) or **log compaction** (keep the latest value per key — useful for "current state" topics).
- **Rebalance:** when consumers join/leave, partitions are reassigned. Processing pauses briefly. Commit offsets carefully around it.

### Producer (Spring Kafka)

```java
@Service
class OrderEventsPublisher {
    private final KafkaTemplate<String, OrderPlaced> kafka;

    void publish(OrderPlaced e) {
        kafka.send("orders.order-placed.v1", String.valueOf(e.orderId()), e);   // key = orderId
    }
}
```

```yaml
spring.kafka.producer:
  acks: all
  properties:
    enable.idempotence: true          # no duplicate writes from producer retries
```

### Consumer

```java
@Component
class OrderPlacedEmailListener {
    @KafkaListener(topics = "orders.order-placed.v1", groupId = "email-service")
    void on(OrderPlaced e) {
        emailService.sendConfirmation(e);    // must be idempotent, see section 5
    }
}
```

Spring commits the offset after the method returns normally. If it throws, the error handler retries, then sends to a DLT (dead-letter topic) if configured.

---

## 4. AWS Kinesis Data Streams (Kafka's AWS cousin)

| Kafka | Kinesis |
|---|---|
| Topic | Stream |
| Partition | **Shard** |
| Key | Partition key |
| Offset | Sequence number |
| Consumer group offsets | **Checkpoints** (KCL stores them in DynamoDB) |

- Each shard: about 1 MB/s or 1,000 records/s in, 2 MB/s out (shared by consumers unless **enhanced fan-out**).
- Retention 24 h by default (up to 365 days).
- Consumers: the **KCL** (Kinesis Client Library) handles shard leases, checkpoints and rebalancing, or a **Lambda** trigger that receives batches.
- Hot shard: one partition key gets too much traffic → that shard throttles. Fix: better key spread, or more shards.

Lambda + Kinesis knobs worth knowing: `BatchSize`, `MaximumBatchingWindow`, `BisectBatchOnFunctionError` (split a failing batch to find the bad record), `MaximumRetryAttempts`, an on-failure destination (SQS DLQ), and `ReportBatchItemFailures` so only failed records are retried.

**SQS** (queue): visibility timeout (message hidden while a worker processes it, reappears if not deleted), max receive count → **DLQ**, standard (at-least-once, any order) vs FIFO (ordered per `MessageGroupId`, dedup window).

---

## 5. Delivery guarantees and idempotency (the most asked topic)

| Guarantee | Meaning | Reality |
|---|---|---|
| At most once | Might be lost, never duplicated | Commit before processing |
| **At least once** | Never lost, **may be duplicated** | The normal setting |
| Exactly once | Neither | Only inside one system (Kafka transactions); end-to-end you **build** it with idempotency |

Why duplicates happen: consumer processes the message, crashes before committing the offset, restarts, gets the same message again. Or a producer retry after a timeout.

**So every consumer must be idempotent:** processing the same message twice has the same effect as once.

```sql
CREATE TABLE processed_messages (
    consumer   TEXT NOT NULL,
    message_id TEXT NOT NULL,
    processed_at TIMESTAMPTZ NOT NULL DEFAULT now(),
    PRIMARY KEY (consumer, message_id)
);
```

```java
@Transactional
public void handle(OrderPlaced e) {
    int inserted = jdbc.update("""
        INSERT INTO processed_messages (consumer, message_id) VALUES ('warehouse', ?)
        ON CONFLICT DO NOTHING
        """, e.eventId());
    if (inserted == 0) return;                // already done → skip

    stockService.reserve(e.orderId(), e.items());   // same transaction as the marker
}
```

Other ways to be idempotent: natural upserts (`INSERT ... ON CONFLICT (order_id) DO UPDATE`), state checks (`UPDATE orders SET status='SHIPPED' WHERE id=? AND status='PAID'`), or pass an idempotency key to the external API (payments, email providers support this).

---

## 6. The dual-write problem and the outbox pattern

Bad:

```java
@Transactional
public Order place(...) {
    Order o = orderRepo.save(...);
    kafka.send("orders", o.toEvent());     // what if this succeeds and the DB commit fails?
    return o;                              // or the commit succeeds and the app crashes before send?
}
```

You are writing to **two systems** with no shared transaction. One can succeed while the other fails → lost or phantom events.

**Transactional outbox:**

```sql
CREATE TABLE outbox (
    id          UUID PRIMARY KEY,
    aggregate   TEXT NOT NULL,          -- 'order'
    aggregate_id TEXT NOT NULL,         -- '501'  (used as message key)
    type        TEXT NOT NULL,          -- 'OrderPlaced'
    payload     JSONB NOT NULL,
    created_at  TIMESTAMPTZ NOT NULL DEFAULT now(),
    published_at TIMESTAMPTZ
);
```

```java
@Transactional
public Order place(PlaceOrderCommand cmd) {
    Order o = orderRepo.save(Order.from(cmd));
    outboxRepo.save(OutboxEvent.of("order", o.getId(), "OrderPlaced", toJson(o)));   // SAME transaction
    return o;
}
```

A relay then publishes outbox rows:

```java
@Scheduled(fixedDelay = 500)
@Transactional
public void relay() {
    List<OutboxEvent> batch = jdbc.query("""
        SELECT * FROM outbox WHERE published_at IS NULL
        ORDER BY created_at LIMIT 100
        FOR UPDATE SKIP LOCKED
        """, mapper);                                  // SKIP LOCKED: several relays don't collide
    for (OutboxEvent e : batch) {
        kafka.send(e.topic(), e.aggregateId(), e.payload()).get();   // wait for ack
        markPublished(e.id());
    }
}
```

The relay can publish twice (crash after send, before marking) → consumers are idempotent anyway. Or use **CDC** (Debezium reads the Postgres WAL and publishes outbox rows), no polling.

The reverse (**inbox**) is the `processed_messages` table above.

---

## 7. Retries, backoff and the dead-letter queue

```text
attempt 1 fails → wait 1s → attempt 2 → wait 4s → attempt 3 → wait 16s → give up → DLQ
```

- **Transient errors** (timeout, 503, DB failover): retry with **exponential backoff + jitter**.
- **Permanent errors** (bad JSON, missing field, a bug): retrying never helps. Send straight to the DLQ.
- **Poison message:** one bad record blocks a partition forever if you retry it endlessly. DLQ it and move on.
- A DLQ without an **alarm** and a **redrive** tool (fix, then replay) is just a place where data goes to die.

```java
@Bean
DefaultErrorHandler errorHandler(KafkaTemplate<Object, Object> template) {
    var recoverer = new DeadLetterPublishingRecoverer(template);           // → <topic>.DLT
    var backoff = new ExponentialBackOffWithMaxRetries(3);
    backoff.setInitialInterval(1_000);
    backoff.setMultiplier(4.0);
    var handler = new DefaultErrorHandler(recoverer, backoff);
    handler.addNotRetryableExceptions(JsonProcessingException.class, ValidationException.class);
    return handler;
}
```

Blocking retries hold up the partition. For long backoffs use **retry topics** (`orders.retry.1m`, `orders.retry.10m`) so the main topic keeps flowing (Spring's `@RetryableTopic`).

---

## 8. Ordering problems

- Only per partition/shard. Use the entity ID as the key.
- Retrying a message later (retry topic) breaks order. If order matters for that entity, block or park all later events for the same key.
- Defensive consumers: include a **version** or timestamp in each event and ignore older ones:

```sql
UPDATE book_stock SET qty = :qty, version = :v WHERE book_id = :id AND version < :v;
```

---

## 9. Designing events

```json
{
  "eventId": "6f1c...-uuid",
  "type": "OrderPlaced",
  "version": 1,
  "occurredAt": "2026-11-06T10:15:00Z",
  "source": "order-service",
  "data": { "orderId": 501, "userId": 7, "totalCents": 2598,
            "items": [{ "bookId": 42, "quantity": 2 }] }
}
```

- **Event = a fact in the past tense** (`OrderPlaced`), not a command (`SendEmail`).
- Thin event (just IDs, consumers call back for details) vs fat event (all data inside). Fat is more decoupled but bigger; consumers do not call you back under load.
- **Schema evolution:** add optional fields only; never rename or remove in place. Breaking change → new topic `orders.order-placed.v2`. A **schema registry** (Avro / Protobuf / JSON Schema) enforces compatibility.
- Topic naming: `<domain>.<event>.v<version>`.

---

## 10. Backpressure and lag

**Consumer lag** = how far behind the newest message a consumer group is. The number one stream metric.

Lag growing:

- Scale consumers (up to partition count) or add partitions/shards.
- Batch DB writes in the consumer.
- Find the slow dependency (often a DB or external API call per message).
- Alarm on lag and on "age of oldest message", not just errors.

---

## 11. Event-driven patterns vocabulary

- **Event notification:** "something happened", consumers react.
- **Event-carried state transfer:** the event includes the data so consumers keep a local copy.
- **Event sourcing:** the event log *is* the database; current state = replay all events. Powerful audit/history, but complex. Not a default.
- **CQRS:** separate write model and read model (e.g., writes to Postgres, events build an OpenSearch read model).

---

## Common mistakes

| Mistake | Fix |
|---|---|
| Assuming exactly-once | Idempotent consumers |
| DB save + publish in one method | Outbox |
| Infinite retry on a bad message | Classify errors, DLQ, alarm |
| Random partition key | Key by entity ID for ordering |
| Breaking event schemas | Additive changes, versioned topics, registry |
| Not watching lag | Alarm on lag / iterator age |
| Huge work per message with no batching | Batch, scale consumers |

---

## Spoken answer (50s)

> I use a queue like SQS for background tasks where one worker handles each message, and a stream like Kafka or Kinesis when several consumers need the same events, order per key, or replay. Ordering only holds inside a partition or shard, so I key by the entity ID. Delivery is at least once, so every consumer is idempotent, usually with a processed-messages table in the same transaction or a conditional update. To avoid the dual-write problem I use a transactional outbox, relayed by a poller with SKIP LOCKED or by CDC. Transient errors get exponential backoff with jitter, permanent ones go straight to a DLQ with an alarm and a redrive path, and I monitor consumer lag as the main health signal.
