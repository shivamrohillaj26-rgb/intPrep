# 21 — Backend interview question bank

Short answers you should be able to say without notes. The guide number in brackets has the deep version.

**How to use:** cover the answer, say yours out loud, then compare.

---

## HTTP, REST, networking [01, 02]

1. **What happens when you type a URL and press Enter?** DNS lookup → TCP handshake → TLS handshake → HTTP request → load balancer → app server thread → app code → DB → response back, browser renders.
2. **PUT vs PATCH?** PUT replaces the whole resource (idempotent); PATCH changes some fields.
3. **Which methods are idempotent?** GET, PUT, DELETE, HEAD, OPTIONS. POST is not; PATCH not necessarily.
4. **401 vs 403?** 401: not authenticated (who are you?). 403: authenticated but not allowed.
5. **400 vs 422?** 400: malformed request. 422: well-formed but fails validation/business rules (many teams just use 400).
6. **409 when?** Conflict with current state: duplicate, version mismatch, wrong state transition.
7. **How do you make POST safe to retry?** Idempotency-Key header; server stores the key + result and returns the same result on repeat.
8. **Offset vs cursor pagination?** Offset is simple but slow at depth and skips/duplicates on changes; cursor (keyset) uses the last seen sort key, fast and stable.
9. **How do you version an API?** URL (`/v1`) or header; prefer additive changes so versions are rare; deprecate with notice.
10. **What are ETags for?** Caching (`If-None-Match` → 304) and optimistic concurrency (`If-Match` → 412 if changed).
11. **HTTP/1.1 vs HTTP/2?** HTTP/2 multiplexes many requests over one connection, binary framing, header compression.
12. **What does TLS give you?** Encryption, integrity, and server identity via certificates.

## Java [03, 04]

13. **`==` vs `equals`?** `==` compares references (or primitive values); `equals` compares logical value.
14. **Why override `hashCode` with `equals`?** Equal objects must have equal hash codes or HashMap/HashSet break.
15. **How does HashMap work?** Array of buckets by hash; collisions in a list, turned into a tree when large; resizes at load factor 0.75.
16. **ArrayList vs LinkedList?** ArrayList almost always: fast index access, cache friendly.
17. **Checked vs unchecked exceptions?** Checked must be declared/caught (IOException); unchecked extend RuntimeException. Modern code mostly uses unchecked.
18. **What is a record?** An immutable data carrier with auto constructor, accessors, equals/hashCode/toString.
19. **Why immutability?** Thread-safe by default, easier to reason about, safe as map keys.
20. **`Optional` — where?** As a return type for "maybe no value"; not for fields or parameters.
21. **Why not `double` for money?** Binary floating point cannot represent 0.1 exactly; use `BigDecimal` or integer cents.
22. **Stream `map` vs `flatMap`?** map: one-to-one; flatMap: one-to-many flattened.
23. **What is the JVM heap vs stack?** Heap: objects, shared, garbage collected. Stack: per thread, method frames and local primitives/references.
24. **How does GC work, briefly?** Finds unreachable objects and frees memory; generational (most objects die young); G1 default, ZGC for low pause.
25. **What is a memory leak in Java?** Objects still referenced but not needed (static maps, caches without limits, listeners, ThreadLocals not cleared).

## Concurrency [04]

26. **What is a race condition?** Result depends on timing of threads; e.g., `count++` from two threads loses updates.
27. **Fixes for a shared counter?** `AtomicInteger`/`LongAdder`, `synchronized`, or in a DB an atomic `UPDATE ... SET x = x + 1`.
28. **What does `volatile` guarantee?** Visibility of writes across threads, not atomicity of compound actions.
29. **What is a deadlock and how to avoid it?** Two threads each hold a lock the other needs; acquire locks in a fixed order, use timeouts.
30. **Why use a thread pool?** Reuse threads, bound concurrency, queue work; never unbounded.
31. **`ConcurrentHashMap` vs `synchronizedMap`?** CHM has fine-grained locking and atomic `compute`/`merge`; much better under contention.
32. **What are virtual threads?** Cheap JVM-managed threads (Java 21); blocking code scales to many thousands of concurrent tasks. Limit downstream with semaphores/pools; watch pinning in old `synchronized` blocks (improved in newer JDKs).
33. **`CompletableFuture` — when?** Run independent remote calls in parallel and combine; always with timeouts and an explicit executor.
34. **ThreadLocal risk?** Leaks in pooled threads if not cleared; context not passed to other threads automatically.

## Spring / Quarkus [05, 06]

35. **What is dependency injection?** The framework creates objects and passes dependencies in; code depends on interfaces, easy to test.
36. **Constructor vs field injection?** Constructor: immutable, explicit, testable without the framework. Prefer it.
37. **Bean scopes?** Singleton (default), prototype, request, session.
38. **How does `@Transactional` work?** A proxy opens a transaction before the method and commits/rolls back after.
39. **Why does `@Transactional` sometimes not work?** Self-invocation bypasses the proxy; private methods; checked exceptions do not roll back by default; wrong thread.
40. **Propagation REQUIRED vs REQUIRES_NEW?** REQUIRED joins the current transaction; REQUIRES_NEW suspends it and starts a separate one (e.g., audit log that must persist).
41. **How do you handle errors globally?** `@RestControllerAdvice` mapping exceptions to Problem Details responses.
42. **How is config handled across environments?** Profiles + env vars; secrets from a secrets manager; type-safe `@ConfigurationProperties`.
43. **What is Actuator?** Health, metrics, info endpoints for operations.
44. **Spring Boot vs Quarkus?** Spring: largest ecosystem, runtime reflection. Quarkus: build-time processing, fast startup, low memory, native images — great for containers and serverless.
45. **Filter vs interceptor?** Filter: servlet level, every request (auth, logging). Interceptor/AOP: around controllers or beans.

## Databases [07, 08, 09]

46. **What is an index and its cost?** A sorted structure (B-tree) for fast lookups; costs disk and slows writes.
47. **Composite index column order?** Equality columns first, then range/sort; leftmost prefix rule.
48. **How do you find a slow query's cause?** `EXPLAIN ANALYZE`: look for sequential scans, wrong estimates, sorts, nested loops over many rows.
49. **What is ACID?** Atomicity, Consistency, Isolation, Durability.
50. **Isolation levels and anomalies?** Read uncommitted (dirty reads), read committed (non-repeatable reads), repeatable read (phantoms in the standard), serializable (none). Postgres default: read committed.
51. **Optimistic vs pessimistic locking?** Optimistic: version column, fail on conflict — good for low contention. Pessimistic: `SELECT FOR UPDATE` — good for high contention, short transactions.
52. **How to prevent overselling stock?** `UPDATE stock SET n = n - 1 WHERE id = ? AND n >= 1` and check rows affected; or row lock; plus a CHECK constraint `n >= 0`.
53. **What is the N+1 problem?** One query for a list, then one query per item; fix with joins/fetch joins, entity graphs, batch fetching, or DTO queries.
54. **Lazy vs eager loading?** Make associations lazy; fetch what each use case needs explicitly.
55. **What is open-in-view and why disable it?** Keeps the Hibernate session open during view rendering, hiding lazy loads and holding connections; disable and build DTOs in the service.
56. **Why a connection pool?** Opening connections is expensive; a pool (HikariCP) reuses a bounded number; size small (often ~10–30).
57. **Normalization vs denormalization?** Normalize to avoid duplicate data; denormalize read paths for speed when justified.
58. **SQL vs NoSQL?** SQL: relations, transactions, flexible queries. NoSQL: specific access patterns at huge scale, flexible schema. Default Postgres.
59. **Read replicas — the catch?** Replication lag; use read-your-writes for recently changed data.
60. **Sharding key choice?** High cardinality, even distribution, present in most queries.
61. **How do you rename a column with zero downtime?** Expand/contract: add new, dual-write, backfill in batches, switch reads, drop old later.
62. **Why never edit an applied migration?** Checksum mismatch and environments diverge; write a new migration.
63. **Soft delete trade-offs?** Keeps history/undo but every query must filter, unique constraints get tricky; use partial indexes.

## Security [10]

64. **How do you store passwords?** bcrypt/scrypt/Argon2 with salt; never plain or fast hashes.
65. **Session vs JWT?** Session: server state, easy revoke. JWT: stateless verification, hard to revoke → short-lived + refresh tokens.
66. **What must you verify on a JWT?** Signature with a fixed algorithm, exp, iss, aud (and nbf).
67. **HS256 vs RS256?** HS: shared secret (anyone verifying can sign). RS: private key signs, public key verifies — better across services.
68. **Refresh token rotation?** Each refresh issues a new refresh token; reuse of an old one signals theft → revoke the family.
69. **OAuth2 flow for a SPA/mobile app?** Authorization code with PKCE.
70. **Service-to-service auth?** Client credentials tokens or mTLS.
71. **OIDC vs SAML?** Both SSO; OIDC is JSON/JWT on OAuth2, SAML is XML assertions, common in older enterprise.
72. **What is IDOR / BOLA?** Accessing another user's object by changing an ID; fix with ownership/tenant checks on every object.
73. **What is mass assignment?** Binding client JSON directly onto entities lets users set fields like `role`; use request DTOs.
74. **SQL injection prevention?** Parameterized queries; never concatenate input.
75. **What is SSRF?** Server fetching a user-provided URL, reaching internal services/metadata; allow-list and block internal ranges.
76. **CSRF — when is it a concern?** Cookie-based auth; mitigate with SameSite cookies and CSRF tokens. Bearer tokens in headers are not sent automatically.
77. **Is CORS a security feature for the server?** It protects users' browsers from other sites reading responses; it does not stop direct API calls.
78. **Where do secrets live?** Secrets Manager/Vault/env injected at runtime, never in git or logs.

## Caching [11]

79. **Cache-aside steps?** Read cache → miss → read DB → set with TTL. On write: update DB, then delete the key after commit.
80. **Why delete instead of update the cache on write?** Avoids races where two writers leave the cache with the older value.
81. **Cache stampede fixes?** Single-flight lock, TTL jitter, refresh-ahead, stale-while-revalidate.
82. **Cache penetration?** Repeated misses for non-existent keys; cache negatives briefly or use a Bloom filter.
83. **Local vs distributed cache?** Local: fastest, per instance, can be inconsistent across instances. Redis: shared, network hop.
84. **What should you not cache?** Data that must be exactly current (stock at checkout, balances) or user data under shared keys.
85. **Redis use cases beyond caching?** Sessions, rate limits, locks, leaderboards (sorted sets), idempotency keys, pub/sub.

## Messaging [12]

86. **Queue vs stream?** Queue: tasks consumed once and deleted. Stream: retained log, many consumer groups, replay, ordering per partition.
87. **How is ordering guaranteed in Kafka?** Only within a partition; key messages by entity ID.
88. **At-least-once implications?** Duplicates happen; consumers must be idempotent.
89. **How do you make a consumer idempotent?** Processed-message table in the same transaction, upserts, conditional state updates, idempotency keys downstream.
90. **What is the dual-write problem and the fix?** DB write and publish can partially fail; use the transactional outbox (poller or CDC).
91. **What is a DLQ and how do you use it?** Destination for messages that keep failing; alarm on it, inspect, fix, redrive.
92. **Transient vs permanent failures?** Transient: retry with exponential backoff + jitter. Permanent: send to DLQ immediately.
93. **What is consumer lag?** How far behind the latest message a consumer is; key health metric.
94. **Kafka partition count — why does it matter?** It caps consumer parallelism in a group; hard to reduce later.
95. **Kinesis shard vs Kafka partition?** Same idea; shards have per-shard throughput limits; KCL checkpoints in DynamoDB.
96. **How do you evolve event schemas?** Additive optional fields; breaking change → new versioned topic; schema registry.

## Microservices and gRPC [13, 14]

97. **When to split into microservices?** Clear bounded contexts plus team, scaling or release-pace needs; otherwise modular monolith.
98. **Why database per service?** Independent schema changes and deploys; no hidden coupling.
99. **What is a saga?** A sequence of local transactions with compensating actions; choreography (events) or orchestration (coordinator).
100. **Why is 2PC rarely used across services?** Blocking, coordinator failure, poor availability and latency.
101. **Circuit breaker states?** Closed, open (fail fast), half-open (test calls).
102. **Why timeouts on every call?** Without them, slow dependencies exhaust threads and cascade failures.
103. **Retry storms — how to avoid?** Retry at one layer, small limits, backoff + jitter, retry budgets, circuit breakers.
104. **Bulkhead?** Isolate resources (pools) per dependency so one slow dependency cannot take everything.
105. **API gateway responsibilities?** Routing, TLS, auth checks, rate limiting, request IDs; not business logic.
106. **gRPC vs REST?** gRPC: typed contract, binary, HTTP/2 streaming — internal services. REST: universal, cacheable, browser-friendly — public edge.
107. **Why are proto field numbers important?** They identify fields on the wire; never change or reuse; reserve removed ones.
108. **What is a gRPC deadline?** Total time budget set by the caller, propagated downstream.
109. **Hexagonal architecture in one line?** Domain in the center depends only on ports (interfaces); adapters implement them for HTTP, DB, queues.

## Search [15]

110. **Inverted index?** Map from term → documents containing it; makes full-text search fast.
111. **`text` vs `keyword`?** text is analyzed for full-text; keyword is exact for filters, sorting, aggregations.
112. **`must` vs `filter`?** must contributes to score; filter is yes/no and cached.
113. **How do you keep search in sync?** Outbox events or CDC into an idempotent indexer; DB is the source of truth.
114. **How do you change a mapping without downtime?** New index, backfill, alias swap.

## Testing [16]

115. **Unit vs integration test?** Unit: one class, no I/O, fast. Integration: real DB/broker/HTTP.
116. **Why Testcontainers over H2?** Tests the real database engine, SQL dialect and migrations.
117. **When use WireMock?** To fake external HTTP APIs, including errors, delays and retries.
118. **What problem do contract tests solve?** Consumer and provider mocks drifting apart; provider CI verifies consumer expectations.
119. **How do you test time-dependent code?** Inject a `Clock`.
120. **How do you test async code?** Awaitility polling with a timeout, plus duplicate-message cases.
121. **What is ArchUnit for?** Enforcing architecture rules (layering, no framework in domain) as tests.

## Observability and operations [17, 18]

122. **Logs vs metrics vs traces?** Logs: individual events. Metrics: aggregates over time. Traces: one request across services.
123. **Why structured logging?** Machine-queryable fields, correlation by trace ID.
124. **What is high cardinality and why avoid it in metrics?** Labels with many values (user IDs) explode time series count.
125. **Why p99 and not average?** Averages hide slow tails that real users feel.
126. **RED and USE?** RED: rate, errors, duration for services. USE: utilization, saturation, errors for resources.
127. **SLI vs SLO vs SLA?** Measurement, internal target, external promise with penalties.
128. **Liveness vs readiness?** Liveness failing restarts the container; readiness failing removes it from traffic. Liveness must not check the DB.
129. **How does trace context cross services?** W3C `traceparent` header in HTTP/gRPC and message headers.
130. **Multi-stage Docker build — why?** Small runtime image without build tools/source; faster, safer.
131. **How do you handle secrets in AWS?** IAM roles for access, Secrets Manager/SSM for values, KMS for encryption.
132. **Rolling vs blue/green vs canary?** Gradual replace; full switch with instant rollback; small traffic slice first, watch metrics.
133. **Lambda cold start mitigations?** SnapStart, provisioned concurrency, smaller packages, native images, reuse clients outside the handler.
134. **Presigned URL?** A short-lived signed URL letting clients upload/download S3 objects directly.
135. **Graceful shutdown?** On SIGTERM: fail readiness, finish in-flight requests, stop consumers, close pools, exit.

## Node [19]

136. **Why is Node good for I/O-heavy servers?** Single event loop with non-blocking I/O handles many concurrent connections cheaply.
137. **What blocks the event loop?** CPU-heavy sync work, sync file/crypto APIs, huge JSON, catastrophic regex.
138. **How do you use multiple cores in Node?** Multiple processes/containers, cluster module, worker threads for CPU tasks.
139. **`process.nextTick` vs `setImmediate` vs promises?** nextTick runs first after the current operation, then promise microtasks, setImmediate in the check phase.
140. **Request context in async Node code?** `AsyncLocalStorage`.

## System design [20]

141. **First steps in any design question?** Requirements, scale estimates, API, data model — then the high-level design.
142. **Read-heavy system scaling order?** Indexes → cache → read replicas → CDN → partition/shard.
143. **CAP in practice?** During partitions choose consistency (money, inventory) or availability (feeds, counters).
144. **How do you design a rate limiter?** Token bucket per key in Redis with an atomic script; 429 + Retry-After.
145. **Fan-out on write vs read for feeds?** Write: precompute timelines (fast reads, heavy for celebrities). Read: compute on request. Hybrid in practice.
146. **Running a scheduled job on many instances safely?** DB lease / `FOR UPDATE SKIP LOCKED` / leader election.
147. **Generating unique IDs in a distributed system?** UUIDv7/ULID or Snowflake-style IDs.
148. **How do you avoid charging a customer twice?** Idempotency key end to end, idempotent payment calls, payment state machine, reconciliation.

---

## Behavioural questions for a frontend → backend switch

- **"Why move to backend?"** — "I kept working at the boundary: API contracts, auth flows, performance. I want to own the full request path, data modelling and reliability, not just the UI."
- **"What backend work have you done?"** — Talk about API contract design with backend teams, auth/session handling, BFF/Node glue, CI/CD, and what you built while studying (a BookNest-style service with Postgres, Redis, Kafka and Testcontainers). Be honest about depth.
- **"Tell me about a production issue you debugged."** — Use STAR: symptom, how you narrowed it (metrics → trace → logs), the fix, what you changed so it cannot repeat.
- **"How do you design an API with frontend consumers in mind?"** — Consistent errors, pagination, idempotency, versioning, and contracts/types shared or generated.

---

## A 2-week drill plan

| Day | Do |
|---|---|
| 1–2 | Guides 01–03; questions 1–25 |
| 3 | Guide 04; 26–34; write the race-condition fix yourself |
| 4–5 | Guides 05–06; build BookNest books CRUD with validation + errors |
| 6–7 | Guides 07–09; add Postgres, Flyway, orders with stock reservation; 46–63 |
| 8 | Guide 10; add JWT resource server + ownership checks; 64–78 |
| 9 | Guide 11; add Redis cache-aside; 79–85 |
| 10 | Guide 12; add outbox + Kafka consumer (idempotent); 86–96 |
| 11 | Guides 13–15; 97–114 |
| 12 | Guide 16; Testcontainers + WireMock tests for what you built |
| 13 | Guides 17–19; 122–140 |
| 14 | Guide 20; do the checkout design out loud in 45 minutes; 141–148 |
