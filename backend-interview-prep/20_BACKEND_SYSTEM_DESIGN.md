# 20 — Backend system design

**Goal:** answer "design X" interview questions with a repeatable method, and know the building blocks well enough to justify every box you draw.

---

## 1. The method (use it every time, ~45 minutes)

```text
1. Requirements (5 min)      functional: what users do
                             non-functional: scale, latency, availability, consistency, durability
2. Estimates (3 min)         users, requests/s, storage, bandwidth — rough numbers
3. API (5 min)               main endpoints / events
4. Data model (5 min)        entities, keys, which DB and why
5. High-level design (10 min) boxes and arrows for the main flows
6. Deep dives (15 min)       the hard parts: hot keys, consistency, failure, scaling
7. Wrap-up (2 min)           trade-offs, what you'd do next, monitoring
```

Say trade-offs out loud. There is no perfect design; the interviewer wants to see you choose and explain.

---

## 2. Back-of-envelope numbers

```text
1 day ≈ 86,400 s ≈ 100k s (round for mental math)
1M requests/day  ≈ 12 req/s average;  peak ≈ 2–5× average
1 KB × 1M = 1 GB      1 KB × 1B = 1 TB
```

Latency ladder (orders of magnitude):

| Operation | Time |
|---|---|
| Memory access | ~100 ns |
| Redis GET in the same zone | ~0.5–1 ms |
| Simple indexed Postgres query | ~1–5 ms |
| Cross-AZ round trip | ~1–2 ms |
| Cross-region round trip | ~50–150 ms |
| Disk seek (HDD) | ~10 ms |

What one box can do (very rough): a well-tuned API instance — hundreds to a few thousand req/s; one Postgres primary — thousands to tens of thousands of simple queries/s; one Redis — ~100k ops/s; one Kafka partition — several MB/s.

**Example (BookNest):** 10M users, 1M daily active, each views 20 pages → 20M reads/day ≈ 230/s avg, ~1,000/s peak. 50k orders/day ≈ 0.6/s writes. → **Read-heavy**: cache + replicas; writes are easy.

---

## 3. Building blocks and when to use each

### Scaling the app tier

- **Vertical** (bigger machine): simple, has a ceiling.
- **Horizontal** (more machines behind a load balancer): needs **stateless** apps — sessions in Redis/tokens, files in S3.

Load balancing algorithms: round robin, least connections, consistent hashing (sticky by key). L4 (TCP) vs L7 (HTTP, can route by path/header).

### Scaling the database

```text
Step 1  Indexes + query fixes (most "scaling problems" end here)
Step 2  Cache hot reads (Redis)
Step 3  Read replicas: writes → primary, reads → replicas (replication lag!)
Step 4  Vertical scale the primary
Step 5  Partitioning (split big tables by time/range inside one DB)
Step 6  Sharding (split data across many DBs by a shard key)
```

**Replication lag:** user updates profile, next read hits a replica that has not caught up → old data. Fixes: read-your-writes (read from primary for a few seconds after a write, or for that user), or session stickiness.

**Sharding:**

```text
shard = hash(user_id) % N           ← simple, but changing N moves almost all data
consistent hashing (ring + virtual nodes) ← adding a node moves only ~1/N of keys
range / directory based             ← lookup table maps key ranges → shard
```

Choosing a shard key: high cardinality, even spread, and most queries include it. Cross-shard queries and joins become expensive — denormalize or use a separate read store. Hot keys (one celebrity user) need special handling (split the key, cache).

### CAP and PACELC

- **CAP:** during a network **P**artition, choose **C**onsistency (refuse some requests) or **A**vailability (serve possibly stale data).
- **PACELC:** **E**lse (no partition), choose **L**atency or **C**onsistency.
- In practice: payments/inventory → consistency; feeds, likes, view counts → availability + eventual consistency.

Consistency levels: strong, read-your-writes, monotonic reads, causal, eventual.

### Quorums (Dynamo-style DBs)

N replicas, write to W, read from R. If **R + W > N**, a read always sees the latest write (e.g., N=3, W=2, R=2).

### IDs at scale

| Option | Pros | Cons |
|---|---|---|
| DB auto-increment | Simple, ordered | Single writer, guessable |
| UUID v4 | No coordination | Random → index fragmentation, 16 bytes |
| **UUID v7 / ULID** | Time-ordered, no coordination | 16 bytes |
| Snowflake (time + machine + sequence, 64-bit) | Ordered, compact | Needs machine IDs, clock care |

### Rate limiting

| Algorithm | Idea | Notes |
|---|---|---|
| Fixed window | Count per minute bucket | Burst at window edges |
| Sliding window log | Keep timestamps | Exact, more memory |
| Sliding window counter | Weighted current + previous window | Good approximation, cheap |
| **Token bucket** | Bucket refills at rate r, capacity b; each request takes a token | Allows bursts up to b; most common |
| Leaky bucket | Queue drains at fixed rate | Smooth output |

Redis implementation with an atomic Lua script (so check-and-decrement is one step):

```lua
-- KEYS[1]=bucket key, ARGV: capacity, refill_per_sec, now_ms
local b = redis.call('HMGET', KEYS[1], 'tokens', 'ts')
local tokens = tonumber(b[1]) or tonumber(ARGV[1])
local ts = tonumber(b[2]) or tonumber(ARGV[3])
tokens = math.min(tonumber(ARGV[1]), tokens + (tonumber(ARGV[3]) - ts) / 1000 * tonumber(ARGV[2]))
local allowed = tokens >= 1
if allowed then tokens = tokens - 1 end
redis.call('HSET', KEYS[1], 'tokens', tokens, 'ts', ARGV[3])
redis.call('PEXPIRE', KEYS[1], 60000)
return allowed and 1 or 0
```

Return `429 Too Many Requests` with `Retry-After`.

### Other blocks

CDN (static + cacheable GETs), object storage (files), queues/streams (async work, guide 12), search index (guide 15), cache (guide 11), blob processing pipelines, schedulers/cron (with a distributed lock or leader election so only one instance runs a job), WebSockets for push.

---

## 4. Full walk-through: BookNest checkout (flash sale)

**Requirements:** browse, cart, checkout, pay, email. 1M DAU; flash sale: 50k users try to buy 1,000 copies of one book at 10:00. Never oversell. Never charge twice.

**API:**

```text
GET  /v1/books?query=&cursor=      (search, cached)
POST /v1/cart/items
POST /v1/orders            Idempotency-Key: <uuid>   → 202 { orderId, status: PENDING }
GET  /v1/orders/{id}                                   (or SSE for status)
```

**Design:**

```text
Browser ─► CDN (book pages, images)
        ─► API Gateway (auth, rate limit per user, 429 on excess)
              │
              ├─► Catalog svc ─► Redis cache ─► Postgres replicas;  OpenSearch for search
              │
              └─► Order svc
                    1. Idempotency-Key seen? → return the stored response
                    2. Reserve stock atomically:
                         UPDATE stock SET available = available - 1
                         WHERE book_id = 42 AND available >= 1      (1 row = success)
                       (or for extreme spikes: Redis DECR as a gate first, DB as the truth)
                    3. INSERT order (PENDING) + outbox event, same transaction
                    4. 202 Accepted
                    │
              outbox relay ─► Kafka "order-placed"
                    ├─► Payment svc: charge with idempotency key = orderId
                    │      success → PaymentSucceeded → Order CONFIRMED
                    │      failure → PaymentFailed   → Order CANCELLED + release stock (compensation)
                    ├─► Email svc (idempotent)
                    └─► Analytics
Reservation expiry job: PENDING > 15 min → cancel + release stock
```

**Deep dives to offer:**

- **No overselling:** a conditional atomic update (or row lock) in the database is the source of truth; a cache counter is only a gate.
- **No double charge:** idempotency key from the client on `POST /orders`; order ID as the idempotency key to the payment provider; idempotent consumers.
- **Hot row:** one book row hammered by 50k users. Options: Redis gate in front (only ~1,000 requests reach the DB), split stock into N sub-rows ("buckets") and pick one randomly, or a queue that serializes reservations for that SKU.
- **Load:** waiting room / queue page, per-user rate limits, autoscaling pre-warmed before 10:00, static pages from CDN.
- **Failures:** payment provider down → circuit breaker, orders stay PENDING and retry; Kafka down → outbox keeps events safe in Postgres.
- **Observability:** orders/s, reservation failures, payment success rate, consumer lag, p99 checkout latency.

---

## 5. Other designs worth practicing (with the key idea)

| System | The crux |
|---|---|
| URL shortener | ID generation (base62 of a counter/Snowflake), read-heavy cache, 301 vs 302, analytics async |
| Rate limiter | Token bucket in Redis, atomic Lua, per key, distributed counters |
| Notification system | Fan-out via queue, per-channel workers (email/SMS/push), retries, user preferences, dedup |
| Chat / messaging | WebSockets, connection registry, message ordering per conversation, offline storage, delivery receipts |
| News feed | Fan-out on write (push) vs on read (pull), hybrid for celebrities, ranking, cache per user |
| File storage / upload | Presigned S3 URLs, multipart upload, virus scan pipeline, metadata DB |
| Video / media pipeline | Upload → queue → transcode workers → CDN, adaptive bitrate |
| Search autocomplete | Trie / prefix index, top-k per prefix, cache, debounce on client |
| Distributed job scheduler | Durable job table, `SKIP LOCKED` workers, leases + heartbeats, retries, idempotency |
| Metrics / logging pipeline | Agents → stream → batch to time-series DB/object storage, downsampling, retention |
| Payment system | Idempotency, double-entry ledger, state machine, reconciliation with provider, exactly-once effects |
| Ride sharing / location | Geo index (geohash, S2, H3), frequent location updates via stream, matching service |
| Leaderboard | Redis sorted sets, sharded by region/time |
| Web crawler | URL frontier queue, politeness per domain, dedup with Bloom filter, distributed workers |

**Time-series / IoT style ingestion** (many devices sending events): devices → gateway → stream (Kafka/Kinesis) partitioned by device ID → consumers batch-write to a time-series or columnar store and object storage (S3 + Parquet); hot recent data in a fast store, cold data in S3 queried with Athena/Spark; alerts computed by stream processors. Key concerns: backpressure, late/out-of-order events (event time vs processing time, watermarks), dedup by event ID, retention tiers.

---

## 6. Consistency patterns cheat sheet

| Problem | Pattern |
|---|---|
| Save + publish atomically | Transactional outbox |
| Duplicate messages | Idempotent consumer (processed table / upsert / conditional update) |
| Multi-service transaction | Saga with compensations |
| Concurrent updates to one row | Optimistic locking (`version`) or `SELECT ... FOR UPDATE` |
| Client retries POST | Idempotency-Key |
| Read model in another store | CDC / events → projection, rebuildable |
| Only one instance runs a job | DB lease / `SKIP LOCKED` / leader election |
| Counting at huge scale | Sharded counters, approximate (HyperLogLog), periodic aggregation |

---

## 7. Data storage selection

| Need | Choose |
|---|---|
| Relations, transactions, flexible queries | PostgreSQL / MySQL |
| Simple key lookups at massive scale | DynamoDB / Cassandra |
| Flexible documents, nested data | MongoDB / DynamoDB / Postgres JSONB |
| Cache, counters, sessions, leaderboards | Redis |
| Full-text search, facets, log search | OpenSearch / Elasticsearch |
| Time-series metrics | TimescaleDB, InfluxDB, Prometheus |
| Analytics over huge data | Columnar: Redshift, BigQuery, ClickHouse, S3 + Parquet + Athena |
| Files / blobs | S3 |
| Graph relationships | Neo4j, Neptune |

Default answer: **"Postgres until proven otherwise"**, plus Redis and S3. Add others for a specific need.

---

## 8. Phrases that score well

- "This is read-heavy, so I'll cache and add replicas before thinking about sharding."
- "The database is the source of truth; the cache and search index are rebuildable."
- "Delivery is at least once, so this consumer is idempotent by event ID."
- "I'd accept eventual consistency for X, but Y needs strong consistency because money is involved."
- "Every remote call has a timeout and a fallback."
- "What I'd monitor first is…"

---

## Spoken answer (45s): "How do you approach a system design question?"

> I start with functional and non-functional requirements and rough numbers, because whether it's read- or write-heavy and how consistent it must be drives everything. Then I sketch the API and data model, draw the simplest design that works — stateless services behind a load balancer, Postgres, Redis, object storage — and scale it step by step: indexes, caching, replicas, then partitioning or sharding with a good key. For correctness I use atomic conditional updates or locks for contended rows, idempotency keys on writes, the outbox for events, idempotent consumers and sagas across services. I finish with failure modes, timeouts and fallbacks, and what I'd monitor.
