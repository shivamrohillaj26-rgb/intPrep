# 13 — Microservices and architecture

**Goal:** decide how to split BookNest, how the pieces talk, and how to stay reliable when parts fail.

---

Every other architecture pattern (CQRS, event sourcing, sidecar, anti-corruption layer, cells, multi-tenancy and more) is in guide 22. Class-level design (SOLID, GoF, LLD) is in guide 23.

## 1. Monolith, modular monolith, microservices

```text
Monolith                  Modular monolith                 Microservices
┌──────────────┐          ┌─────────────────────┐          ┌──────┐ ┌──────┐ ┌──────┐
│ users        │          │ [users] [catalog]   │          │users │ │books │ │orders│
│ books        │          │ [orders][payments]  │          │ +DB  │ │ +DB  │ │ +DB  │
│ orders  (one │          │ strict module walls │          └──────┘ └──────┘ └──────┘
│ payments app)│          │ one deploy, one DB  │          separate deploys, network calls
└──────────────┘          └─────────────────────┘
```

| | Monolith / modular monolith | Microservices |
|---|---|---|
| Deploy | One unit | Each service alone |
| Calls between parts | Method call (ns, never "down") | Network (ms, can fail) |
| Transactions | One DB transaction | Sagas, eventual consistency |
| Team scaling | Gets hard with many teams | Teams own services end to end |
| Scale parts separately | No | Yes |
| Operations | Simple | Needs CI/CD, observability, platform |

**Honest default:** start with a modular monolith. Split a module out when there is a real reason: a different team, a different scaling need, a different release pace, or a different reliability need. Splitting too early gives you a **distributed monolith** (services that must deploy together and call each other synchronously for everything) — the worst of both.

---

## 2. How to find service boundaries (DDD in plain words)

- **Bounded context:** an area where a word has one meaning. "Book" in Catalog = title, author, description. "Book" in Warehouse = SKU, shelf, quantity. Different models, different services.
- **Aggregate:** a cluster of objects changed together and kept consistent in one transaction (an `Order` with its `OrderItem`s). Transactions should not cross aggregates — so they do not cross services.
- Split by **business capability** (catalog, ordering, payments, notifications), not by technical layer ("DB service", "validation service").
- High cohesion inside, loose coupling between. If two services always change together, they are one service.

---

## 3. Database per service

Each service owns its tables. Others **never** read them directly.

```text
Order service  ──X──►  Users DB        (forbidden)
Order service  ──────► User service API / or keeps a local copy built from UserUpdated events
```

Why: if others read your tables, you cannot change your schema without breaking them, and you lose independent deploys.

Getting data from another service:

1. **Synchronous call** (REST / gRPC) — simple, but couples availability.
2. **Local replica from events** — order service keeps `user_snapshot(user_id, name, email)` updated from `UserUpdated` events. Fast and resilient, eventually consistent.
3. **API composition** at a gateway/BFF for read screens that combine services.

---

## 4. Communication styles

| Style | Example | Use when |
|---|---|---|
| Sync request/response (REST, gRPC) | Order → Payment "charge now" | You need the answer to continue |
| Async events | `OrderPlaced` → Email, Analytics | Others react; producer does not need them |
| Async commands via queue | "resize image 42" | Background work |

Rule of thumb: a user request should not depend on a long **chain** of synchronous calls. Availability multiplies: 5 services at 99.9% in a chain ≈ 99.5%.

---

## 5. API gateway and BFF

```text
Clients ──► API Gateway ──► services
            - TLS termination, routing (/v1/orders → order-service)
            - auth token check, rate limiting, request size limits
            - CORS, request IDs, logging
```

**BFF (Backend for Frontend):** a thin backend per client type (web BFF, mobile BFF) that combines calls and shapes data for that UI. Keeps business logic in services, presentation glue in the BFF.

Examples: AWS API Gateway, Kong, Nginx, Envoy, Spring Cloud Gateway.

---

## 6. Service discovery and load balancing

Services scale up and down, IPs change. How does Order find Payment?

- **Kubernetes:** a `Service` gives a stable DNS name (`payment-service.default.svc`) that load-balances to healthy pods.
- **AWS:** internal load balancer, ECS service discovery (Cloud Map).
- **Service mesh** (Istio, Linkerd): a sidecar proxy next to each service handles mTLS, retries, timeouts and metrics outside your code.

---

## 7. Distributed transactions: sagas

Placing an order touches Orders, Payments and Warehouse — three databases. No single ACID transaction. (Two-phase commit exists but is slow, blocking and rarely used between services.)

A **saga** is a sequence of local transactions. If a step fails, run **compensating** actions for the steps already done.

```text
1. Order service:     create order (PENDING)
2. Payment service:   charge card             → fails?  → 1c: mark order CANCELLED
3. Warehouse service: reserve stock           → fails?  → 2c: refund payment, 1c: cancel order
4. Order service:     mark order CONFIRMED
```

**Choreography** — services react to each other's events:

```text
OrderCreated → Payment charges → PaymentSucceeded → Warehouse reserves → StockReserved → Order confirms
                                 PaymentFailed    → Order cancels
```

✅ No central brain, loose coupling. ❌ Hard to see the whole flow; cycles creep in.

**Orchestration** — one orchestrator tells each service what to do:

```java
// simplified orchestrator state machine in the order service
switch (saga.step()) {
    case STARTED          -> paymentClient.charge(saga.orderId());
    case PAYMENT_DONE     -> warehouseClient.reserve(saga.orderId());
    case STOCK_RESERVED   -> orders.confirm(saga.orderId());
    case PAYMENT_FAILED   -> orders.cancel(saga.orderId());
    case STOCK_FAILED     -> paymentClient.refund(saga.orderId());   // then cancel
}
```

✅ Flow is in one place, easy to monitor. ❌ Orchestrator is more central. Tools: Temporal, AWS Step Functions, Camunda.

Saga rules: each step and each compensation is **idempotent**; compensations are business actions (refund), not "undo"; the user may see intermediate states (PENDING).

---

## 8. Resilience patterns (what to do when a dependency is slow or down)

### Timeouts — always

No timeout = threads wait forever = your service dies because someone else is slow.

```java
RestClient payments = RestClient.builder()
    .baseUrl("http://payment-service")
    .requestFactory(new JdkClientHttpRequestFactory(HttpClient.newBuilder()
        .connectTimeout(Duration.ofSeconds(1)).build()))
    .build();
// plus a read timeout per call (e.g., 2s) — set via the request factory
```

### Retries — carefully

Only for **idempotent** operations or with idempotency keys. Exponential backoff with jitter. Small limit (2–3). Retry at **one layer** only, or 3 layers × 3 retries = 27× traffic on a struggling service (**retry storm**).

### Circuit breaker

```text
CLOSED (normal) ──too many failures──► OPEN (fail fast, don't call)
     ▲                                    │ after wait time
     └──── success ◄── HALF-OPEN (let a few calls test) ◄┘
```

```java
@CircuitBreaker(name = "payments", fallbackMethod = "paymentUnavailable")
@Retry(name = "payments")
@TimeLimiter(name = "payments")
public CompletableFuture<ChargeResult> charge(ChargeRequest r) { ... }

private CompletableFuture<ChargeResult> paymentUnavailable(ChargeRequest r, Throwable t) {
    return CompletableFuture.completedFuture(ChargeResult.pendingRetryLater());
}
```

```yaml
resilience4j.circuitbreaker.instances.payments:
  sliding-window-size: 20
  failure-rate-threshold: 50
  wait-duration-in-open-state: 10s
  slow-call-duration-threshold: 2s
```

Quarkus: `@CircuitBreaker`, `@Retry`, `@Timeout`, `@Fallback` (MicroProfile Fault Tolerance).

### Bulkhead

Separate thread pools / connection pools per dependency, so a slow recommendations API cannot use all threads and take down checkout.

### Fallbacks and graceful degradation

Recommendations down → show bestsellers from cache. Search down → show categories. Payment down → accept the order as "pending payment" and retry.

### Rate limiting and load shedding

Protect yourself: reject excess with 429 / 503 quickly rather than slowing down for everyone.

---

## 9. Configuration, versioning and contracts

- Config from environment / config service, not hard-coded per environment.
- **Backward-compatible APIs:** add fields, do not remove or rename. Consumers ignore unknown fields (tolerant reader).
- Deploy order: provider first with the new field, consumers later.
- **Consumer-driven contract tests** (Pact) catch breaking changes in CI (guide 16).

---

## 10. Cross-cutting needs

Every service needs the same plumbing — put it in a shared library or platform, not copy-paste:

- Auth token validation, request ID / trace propagation, structured logging.
- Health endpoints (`/health/live`, `/health/ready`).
- Metrics, tracing (guide 17).
- Standard error format (Problem Details, guide 02).
- **Keep shared libraries thin.** A big shared "common" library with business logic recouples all services.

---

## 11. Architecture styles inside one service

**Layered:** controller → service → repository. Simple, good default.

**Hexagonal (ports and adapters):**

```text
          [REST adapter]   [Kafka adapter]        ← inbound adapters
                 \           /
             ┌─────────────────┐
             │  Domain + use   │   ports = interfaces the core defines
             │  cases (pure)   │   e.g. PaymentPort, OrderRepositoryPort
             └─────────────────┘
                 /           \
        [Postgres adapter]  [Payment HTTP adapter]   ← outbound adapters
```

The core does not import Spring, JPA or HTTP. Easy to unit-test, easy to swap adapters. **Clean architecture** / **onion** are the same idea. Enforce the rule with ArchUnit (guide 16).

---

## 12. Migrating a monolith: strangler fig

```text
1. Put a gateway / proxy in front of the monolith.
2. Build the new "orders" service.
3. Route /orders/* to the new service; everything else still goes to the monolith.
4. Sync data during the move (events or CDC).
5. Repeat per capability until the monolith is empty or small.
```

Never a big-bang rewrite.

---

## Common mistakes

| Mistake | Fix |
|---|---|
| Splitting before boundaries are clear | Modular monolith first |
| Shared database across services | DB per service + APIs/events |
| Long sync call chains | Async events, local copies |
| No timeouts | Timeouts on every remote call |
| Retries at every layer | One retry layer, backoff, budget |
| Distributed transaction with 2PC everywhere | Sagas with compensations |
| Fat shared library | Thin platform libs only |

---

## Spoken answer (50s)

> I start with a modular monolith and split along business capabilities when teams, scaling or release pace need it, because splitting early creates a distributed monolith. Each service owns its database; others use its API or keep a local copy built from its events. I prefer async events for reactions and keep synchronous chains short. Cross-service workflows are sagas — choreographed with events for simple flows, orchestrated with something like Temporal or Step Functions when the flow is complex — and every step and compensation is idempotent. Every remote call has a timeout, limited retries with backoff and jitter at one layer, a circuit breaker, bulkheads and a fallback, and I keep APIs backward compatible with contract tests.
