# 22 — Architecture patterns catalog (every pattern, one place)

**Goal:** when an interviewer names a pattern — or describes a problem that needs one — you know what it is, when to use it, and what it costs.

Each entry: **problem → pattern → BookNest example → trade-off**. Deep versions live in earlier guides (linked in brackets).

---

## Part A — Big-picture architecture styles

### A1. Layered (n-tier)
- **Problem:** code with UI, logic and SQL all mixed.
- **Pattern:** controller → service → repository → DB; each layer only calls the one below.
- **Trade-off:** simple and familiar; can turn into "anemic" services that just pass data through. [05]

### A2. Hexagonal / ports and adapters, clean, onion
- **Problem:** business rules tied to frameworks, hard to test or swap tech.
- **Pattern:** domain core defines interfaces (ports); adapters implement them (REST, JPA, Kafka, HTTP clients). Dependencies point **inward**.
- **Trade-off:** more interfaces and mapping code; worth it for complex domains. [13]

### A3. Monolith → modular monolith → microservices
- Modular monolith: one deployable with strict module boundaries (often enforced with ArchUnit or separate Maven modules). Microservices: independently deployable services with their own data. [13]

### A4. Service-oriented architecture (SOA) and ESB
- Older enterprise style: services talk through a central **enterprise service bus** that also transforms/routes messages. Microservices moved the logic out of the bus ("smart endpoints, dumb pipes").

### A5. Event-driven architecture (EDA)
- **Problem:** services tightly coupled by synchronous calls.
- **Pattern:** producers emit facts (`OrderPlaced`); consumers react independently through a broker.
- **Trade-off:** decoupling and scale vs eventual consistency and harder tracing. [12]

### A6. Serverless architecture
- **Pattern:** functions (Lambda) + managed services (API Gateway, DynamoDB, SQS, S3, Step Functions); no servers to manage, pay per use, scale to zero.
- **Trade-off:** cold starts, execution limits, vendor lock-in, distributed debugging; cost can exceed containers at constant high load. [18, 25]

### A7. Space-based / in-memory grid
- Data and processing partitioned in an in-memory grid (Hazelcast, Redis) to avoid DB bottlenecks for extreme spikes. Rare; know the name.

### A8. Microkernel / plugin architecture
- A small core with plugins (IDEs, browsers, rule engines). Use when features are added by third parties or per customer.

### A9. Pipes and filters
- **Pattern:** a chain of independent steps, each consuming input and producing output (upload → virus scan → resize → thumbnail → index).
- On AWS: S3 event → SQS → Lambda → next queue, or Step Functions. Steps scale and fail independently.

### A10. Cell-based architecture
- **Problem:** one bad deploy or a "poison" customer takes down everyone.
- **Pattern:** run many identical, fully independent copies ("cells") of the whole stack, each serving a subset of customers; a thin router maps customer → cell.
- **Trade-off:** limits blast radius to one cell; more infrastructure and a routing layer. Used by large AWS-scale services.

### A11. Deployment stamps
- Same idea as cells, framed for multi-tenant SaaS: deploy a "stamp" (full stack) per region or per group of tenants, scale by adding stamps.

### A12. Multi-region: active-passive and active-active
- **Active-passive:** one region serves traffic, the other is a warm standby with replicated data; fail over with DNS (Route 53 health checks). Simpler, some data loss (RPO) on failover.
- **Active-active:** all regions serve traffic; needs conflict handling for writes (region-pinned users, DynamoDB global tables last-writer-wins, CRDTs). Lowest latency and highest availability, hardest to build.

### A13. Lambda and Kappa (data architectures)
- **Lambda architecture:** a **batch layer** (recompute accurate views from all data, e.g. nightly Spark) + a **speed layer** (stream processing for recent data) + a serving layer merging both. Accurate but two codebases.
- **Kappa architecture:** **stream only**; reprocess history by replaying the log (Kafka retention / S3 archive). One codebase; needs a replayable log.
- **Data lake / lakehouse:** raw data in S3 (Parquet), catalogued (Glue), queried in place (Athena/Spark); lakehouse adds table formats (Iceberg, Delta) with ACID and updates.
- **ETL vs ELT:** transform before loading vs load raw then transform inside the warehouse.

---

## Part B — Service boundary and integration patterns

### B1. Database per service
Each service owns its data; others use its API or events. [13]

### B2. Shared database (anti-pattern, sometimes pragmatic)
Fast to start; couples schemas and deploys. Acceptable only temporarily during a migration.

### B3. API gateway
Single entry: routing, TLS, auth, rate limiting, request IDs. Variants:
- **Gateway routing:** `/orders/*` → order service.
- **Gateway aggregation:** one client call → gateway calls 3 services → combined response.
- **Gateway offloading:** move TLS, auth, compression, caching out of services into the gateway.

### B4. Backend for Frontend (BFF)
One thin backend per client type (web, mobile, partner) shaping data for that UI. Prevents one "general" API full of client-specific hacks.

### B5. API composition
A composer (gateway/BFF/service) calls several services and joins results in memory for a read screen. Simple; latency is the slowest call; partial failure handling needed.

### B6. Anti-corruption layer (ACL)
- **Problem:** a legacy system or partner API has a messy model that would leak into your clean domain.
- **Pattern:** a translation layer (adapter + mapper) between them; your domain only sees your model.
- BookNest: an old warehouse SOAP API with codes like `STK_Q_AVL` is wrapped by `WarehouseAdapter.availableQuantity(bookId)`.

### B7. Strangler fig
Route traffic for one capability at a time from the old system to the new one behind a proxy. [13]

### B8. Sidecar
- **Pattern:** a helper container deployed next to each service instance (same pod/task) handling cross-cutting work: proxying, mTLS, log shipping, config reload.
- Examples: Envoy in a service mesh, a Fluent Bit log shipper, the OTel collector, the Datadog/X-Ray daemon.
- **Trade-off:** language-agnostic, no code change; extra resource use and latency per hop.

### B9. Ambassador
A sidecar specialized as an **outbound** proxy: the app calls `localhost:9000`, the ambassador handles retries, circuit breaking, TLS and discovery to the real remote service.

### B10. Adapter (container pattern)
A sidecar that **normalizes** the app's output for the platform (e.g., converts a legacy app's metrics to Prometheus format).

### B11. Service mesh
Sidecars everywhere + a control plane (Istio, Linkerd, AWS App Mesh-style): mTLS, retries, timeouts, traffic splitting (canary), metrics — without code. Cost: operational complexity.

### B12. Service discovery
Client-side (client looks up instances in a registry like Eureka/Cloud Map and load-balances) vs server-side (client calls a load balancer / Kubernetes Service DNS).

### B13. Shared library vs platform
Thin shared libraries for plumbing only; business logic in shared libs re-couples services.

### B14. Contract-first APIs
Write the OpenAPI/proto first, generate server stubs and clients, review contract changes like code. [02, 14, 16]

---

## Part C — Data management patterns

### C1. CQRS (Command Query Responsibility Segregation)
- **Problem:** the model that is good for writing (normalized, validated, transactional) is bad for complex reads (search, dashboards, joins across services).
- **Pattern:** separate the **command side** (writes, business rules) from the **query side** (denormalized read models), synced by events.

```text
POST /orders ──► Order command handler ──► Postgres (orders)  ──outbox──► OrderPlaced
                                                                         │
GET /my-orders?search= ◄── Query service ◄── OpenSearch read model ◄── projector consumes events
```

- Can be light (same DB, separate read-only DTO queries/views) or full (separate stores).
- **Trade-off:** read models are eventually consistent; more moving parts. Use where reads and writes differ a lot.

### C2. Event sourcing
- **Pattern:** store every change as an immutable event; current state = fold over events.

```text
order-501 events: Created(items) → ItemAdded(book 9) → Paid(ch_1) → Shipped(trk_7)
state = events.reduce(apply, emptyOrder)
```

```java
Order rehydrate(List<OrderEvent> events) {
    Order o = new Order();
    for (OrderEvent e : events) o.apply(e);      // apply() only changes state, no side effects
    return o;
}
```

- **Snapshots** every N events avoid replaying thousands. Projections build read models (CQRS).
- **Benefits:** full audit trail, time travel ("state on 1 Nov"), rebuild new read models from history.
- **Costs:** schema evolution of old events (upcasting), querying needs projections, GDPR deletion is hard (crypto-shredding), steep learning curve. Use for ledgers, audit-heavy domains — not by default.

### C3. Materialized view
Precompute a read-optimized table/index from source data (Postgres `MATERIALIZED VIEW`, a projection table, an OpenSearch index). Refresh on schedule or from events.

### C4. Transactional outbox / inbox, polling publisher, CDC
Atomic "save + publish" via an outbox table; idempotent receiving via an inbox/processed table; publish by polling or by reading the DB log (Debezium, DynamoDB Streams). [12]

### C5. Saga (choreography / orchestration) and compensating transaction
Multi-service workflows as local transactions plus compensations. [13]

### C6. Two-phase commit (2PC)
Coordinator asks all participants to *prepare*, then *commit*. Strong consistency; blocking, slow, coordinator failure is painful. Mostly inside one database system, rarely across services.

### C7. Sharding, partitioning, replication
[07, 20]

### C8. Index table / secondary index
Store an extra lookup (email → userId) when the main store cannot query by that field (classic in DynamoDB: GSI). [25]

### C9. Cache-aside, read-through, write-through, write-behind
[11]

### C10. Claim check
- **Problem:** messages too big for the broker (SQS max 256 KB, Kafka ~1 MB default).
- **Pattern:** store the payload in S3; send only a reference (`s3://bucket/key`) in the message; consumer fetches it.

### C11. Event-carried state transfer
Events include the data consumers need, so they keep a local copy and do not call back. [12]

### C12. Polyglot persistence
Different stores for different needs: Postgres for orders, Redis for sessions, OpenSearch for search, S3 for files, a time-series DB for metrics.

### C13. Multi-tenancy models (SaaS)

| Model | How | Isolation | Cost | Notes |
|---|---|---|---|---|
| **Silo** | DB (or whole stack) per tenant | Strongest | Highest | Big/regulated customers |
| **Bridge** | Schema per tenant in a shared DB | Medium | Medium | Migrations × N schemas |
| **Pool** | Shared tables with `tenant_id` column | Weakest (app enforced) | Lowest | Must filter every query; Postgres **row-level security** helps |

```sql
ALTER TABLE orders ENABLE ROW LEVEL SECURITY;
CREATE POLICY tenant_isolation ON orders
  USING (tenant_id = current_setting('app.tenant_id')::bigint);
-- app runs: SET app.tenant_id = '42'; at the start of each transaction
```

Also: **noisy neighbour** (one tenant hogging resources) → per-tenant rate limits/quotas, tier big tenants into silos.

---

## Part D — Messaging patterns

| Pattern | What | AWS / Kafka example |
|---|---|---|
| **Point-to-point queue** | One consumer per message | SQS |
| **Publish/subscribe** | Every subscriber gets a copy | SNS, Kafka consumer groups, EventBridge |
| **Fan-out** | One event → many queues | SNS → several SQS queues |
| **Competing consumers** | Many workers on one queue share load | N Lambda/ECS workers on SQS |
| **Queue-based load leveling** | Queue absorbs spikes; workers process at a steady rate | Spike of 50k uploads → SQS → 20 workers |
| **Priority queue** | Urgent work first | Separate `high` and `low` queues, poll high first |
| **Request-reply over messaging** | Reply queue + correlation ID | Rare; prefer sync calls or callbacks |
| **Dead-letter channel** | Park failed messages | SQS DLQ, Kafka DLT |
| **Idempotent receiver** | Duplicates are harmless | processed-messages table |
| **Message ordering / sequential convoy** | Order per key | Kafka key, SQS FIFO `MessageGroupId` |
| **Content-based router** | Route by message content | EventBridge rules, SNS filter policies |
| **Scatter-gather** | Send to many, aggregate replies | Ask 3 shipping providers for quotes, take the best in 2 s |
| **Aggregator** | Combine related messages into one | Batch 100 events into one S3 file |
| **Splitter** | One message → many | An order → one message per item |
| **Claim check** | Big payload in storage, reference in message | S3 + SQS |
| **Event stream / log** | Retained, replayable | Kafka, Kinesis |
| **Transactional outbox** | Atomic save + publish | outbox table + relay |
| **Backpressure** | Slow consumers signal producers to slow down | Bounded queues, reactive streams, Kinesis throttling |

---

## Part E — Reliability and resilience patterns

| Pattern | Problem | Solution |
|---|---|---|
| **Timeout** | Hanging calls exhaust threads | Every remote call has a deadline |
| **Retry with backoff + jitter** | Transient failures | Exponential delays with randomness; only idempotent ops |
| **Retry budget** | Retry storms | Cap retries as a % of traffic |
| **Circuit breaker** | Hammering a dead dependency | Fail fast when error rate is high, probe with half-open |
| **Bulkhead** | One slow dependency takes all resources | Separate pools per dependency |
| **Fallback / graceful degradation** | Feature down | Cached/default response, reduced feature |
| **Rate limiting / throttling** | Overload, abuse | Token bucket; 429 |
| **Load shedding** | Already overloaded | Reject low-priority requests early (503) |
| **Health endpoint monitoring** | Know which instances are healthy | Liveness/readiness probes |
| **Leader election** | Only one instance should do X | DB lease, ZooKeeper/etcd, DynamoDB lock table |
| **Lease / heartbeat** | Detect dead workers holding work | Work item has `locked_until`; expired leases are reclaimed |
| **Fencing token** | Old leader still acting after losing the lock | Monotonic token checked by the storage on each write |
| **Idempotency key** | Client retries duplicate effects | Store key → result [02] |
| **Compensating transaction** | Undo across services | Saga [13] |
| **Static stability** | Dependency of the control plane fails | Data plane keeps working with last known config (pre-provisioned capacity in every AZ) |
| **Shuffle sharding** | One bad customer affects everyone sharing a worker | Each customer gets a random small set of workers; overlap between customers is tiny |
| **Chaos engineering** | Unknown failure modes | Inject failures on purpose in controlled experiments |

---

## Part F — Deployment and release patterns

| Pattern | What |
|---|---|
| Rolling update | Replace instances gradually [18] |
| Blue/green | Two environments, switch traffic |
| Canary | Small % first, watch metrics, expand |
| **Shadow (traffic mirroring)** | Copy real production traffic to the new version, discard its responses, compare results — test with zero user impact |
| **Dark launch** | Deploy hidden code paths, enable for internal users |
| Feature flags / toggles | Release separately from deploy; kill switches |
| **A/B test** | Split users to measure business impact (not the same as canary, which measures health) |
| **Immutable infrastructure** | Never patch servers in place; replace with a new image |
| **Infrastructure as Code / GitOps** | Infra in git; the cluster syncs from git (Argo CD) |
| **External configuration store** | Config outside the build (SSM Parameter Store, AppConfig, Consul), changeable without redeploy |
| **Expand / contract** | Backward compatible schema/API changes [09] |

---

## Part G — Security patterns

| Pattern | What |
|---|---|
| **Gatekeeper** | A dedicated layer validates/sanitizes requests before they reach services (gateway + WAF) |
| **Federated identity** | Users log in with an external IdP (OIDC/SAML); apps trust its tokens [10] |
| **Valet key** | Give clients a short-lived, scoped token to access a resource directly (S3 presigned URL) |
| **Token exchange / on-behalf-of** | Service exchanges a user token for a downstream-scoped token |
| **Zero trust** | No implicit trust from network location; authenticate and authorize every call (mTLS + tokens) |
| **Defense in depth** | WAF + gateway auth + service authz + DB permissions + encryption |
| **Least privilege** | Minimal IAM / DB permissions per service [24] |
| **Secrets rotation** | Automatic credential rotation (Secrets Manager) |
| **Envelope encryption** | Data encrypted with a data key, data key encrypted with a master key (KMS) [24] |
| **Audit log** | Append-only record of security-relevant actions |

---

## Part H — Concurrency and processing models

- **Thread-per-request** (classic Spring MVC/Tomcat): simple, blocking; scaled up by virtual threads. [04]
- **Event loop / reactive** (Node, Netty, WebFlux, Vert.x/Quarkus reactive): few threads, non-blocking I/O, backpressure via Reactive Streams (`Publisher`/`Subscriber`, Project Reactor `Mono`/`Flux`, Mutiny `Uni`/`Multi`). Great for many concurrent I/O calls; harder to debug; one blocking call ruins it.
- **Producer–consumer** with a bounded queue: decouples rates, applies backpressure when full.
- **Actor model** (Akka/Pekko, Orleans): each actor owns its state and processes one message at a time — no shared locks.
- **Batch processing** (Spring Batch, AWS Batch, Spark): chunked reads/writes, restartable jobs, checkpoints.
- **Stream processing** (Kafka Streams, Flink, Kinesis Data Analytics/Managed Flink): windows (tumbling, sliding, session), **event time vs processing time**, **watermarks** for late data, stateful aggregations.
- **Scheduler / cron** with a distributed lock (ShedLock, DB lease) or a managed scheduler (EventBridge Scheduler).

---

## Part I — Choosing: problem → pattern quick map

| You hear… | Reach for |
|---|---|
| "User sees stale data after update" | Read-your-writes, cache evict after commit |
| "Charged twice" | Idempotency key + idempotent consumer |
| "Lost events when service crashed" | Outbox |
| "Order needs payment + stock from different services" | Saga |
| "Search/dashboard needs data from 4 services" | CQRS read model / API composition |
| "Messages too big" | Claim check |
| "Traffic spikes crush the DB" | Queue-based load leveling, cache, rate limiting |
| "One slow API takes down everything" | Timeouts, circuit breaker, bulkhead |
| "Legacy system with ugly model" | Anti-corruption layer, strangler fig |
| "Need audit of every change / time travel" | Event sourcing (or an audit table) |
| "One customer's load hurts others" | Per-tenant limits, shuffle sharding, cells/silos |
| "Deploys are scary" | Canary, feature flags, shadow traffic, fast rollback |
| "Only one instance should run the nightly job" | Leader election / lease / managed scheduler |
| "Mobile and web need different data" | BFF |
| "mTLS/retries in every language" | Sidecar / service mesh |

---

## Spoken answer (40s): "Which architecture patterns have you used and why?"

> I choose patterns by the problem. For service boundaries I use database per service with an API gateway and BFFs, and an anti-corruption layer plus strangler fig when replacing legacy. For data consistency I use the transactional outbox, idempotent consumers and sagas instead of distributed transactions, and CQRS read models when reads need to combine data — event sourcing only where audit history is the requirement. For reliability: timeouts, retries with jitter, circuit breakers, bulkheads, queue-based load leveling and rate limiting. For releases: canary, feature flags and shadow traffic. Each one adds complexity, so I introduce it only when the simpler design actually fails.
