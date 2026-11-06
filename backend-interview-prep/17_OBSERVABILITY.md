# 17 — Observability (logs, metrics, traces, alerts)

**Goal:** when a BookNest user says "checkout was slow at 10:15", find out why in minutes.

---

## 1. Monitoring vs observability

- **Monitoring:** watching known things ("is CPU above 80%?").
- **Observability:** being able to answer **new** questions from the outside ("why are only Android users in India failing checkout?").

Three pillars:

| Pillar | Answers | Example |
|---|---|---|
| **Logs** | What exactly happened in this one event? | `payment declined orderId=501 reason=insufficient_funds` |
| **Metrics** | How much / how often, over time? | `http_requests_total`, p99 latency, error rate |
| **Traces** | Where did the time go across services? | Checkout 2.1 s = 40 ms order + 1.9 s payment |

Plus **error tracking** (Sentry) and **profiling** (where CPU/memory goes).

---

## 2. Logs done right

### Structured (JSON), not free text

```json
{"ts":"2026-11-06T10:15:02.114Z","level":"WARN","service":"order-service","env":"prod",
 "traceId":"4bf92f3577b34da6","spanId":"00f067aa0ba902b7","requestId":"req-81f2",
 "userId":7,"orderId":501,"event":"payment_declined","reason":"insufficient_funds","durationMs":184}
```

Machines can filter `event=payment_declined AND service=order-service` instantly. Free text needs regex.

### SLF4J + MDC (context on every line)

```java
private static final Logger log = LoggerFactory.getLogger(OrderService.class);

public OrderResponse place(PlaceOrderCommand cmd) {
    MDC.put("userId", String.valueOf(cmd.userId()));
    try {
        log.info("placing order items={}", cmd.items().size());     // {} placeholders, not string +
        ...
        log.info("order placed orderId={} totalCents={}", order.getId(), order.getTotalCents());
    } catch (PaymentDeclinedException e) {
        log.warn("payment declined orderId={} reason={}", order.getId(), e.reason());
        throw e;
    } finally {
        MDC.remove("userId");
    }
}
```

A servlet filter puts `requestId` / `traceId` into MDC at the start of each request and clears it at the end. With a JSON encoder (logstash-logback-encoder, Quarkus `quarkus-logging-json`), MDC fields appear on every line.

Careful: MDC is ThreadLocal. When you hand work to another thread pool (or `CompletableFuture`), copy the context over (Micrometer context propagation does this).

### Levels

| Level | Use |
|---|---|
| ERROR | Something failed and needs attention (not every 404!) |
| WARN | Unexpected but handled (retry happened, fallback used) |
| INFO | Business events and lifecycle (order placed, app started) |
| DEBUG | Detail for developers, off in prod by default |
| TRACE | Very verbose |

### Never log

Passwords, tokens, session IDs, full card numbers, secrets, and avoid raw personal data. Mask (`a***@b.com`).

Also: log the exception object as the last argument so the stack trace is kept: `log.error("charge failed orderId={}", id, e);`.

**Log4j/Logback/SLF4J:** SLF4J is the API you code against; Logback or Log4j2 is the engine. (Log4Shell, 2021, was a remote code execution bug in Log4j2 lookups — a reason to keep logging libs patched.)

---

## 3. Metrics

### Four types

| Type | Example | Notes |
|---|---|---|
| Counter | `orders_placed_total` | Only goes up; graph its **rate** |
| Gauge | `db_pool_active_connections` | Current value, up and down |
| Histogram / timer | `http_server_requests_seconds` | Distribution → p50, p95, p99 |
| Summary | Client-side percentiles | Cannot be aggregated across instances; prefer histograms |

### Micrometer (Spring and Quarkus)

```java
@Service
class OrderMetrics {
    private final Counter placed;
    private final Timer chargeTimer;

    OrderMetrics(MeterRegistry registry) {
        this.placed = Counter.builder("orders.placed").register(registry);
        this.chargeTimer = Timer.builder("payment.charge.duration")
            .publishPercentileHistogram()
            .register(registry);
    }

    void orderPlaced() { placed.increment(); }

    <T> T timeCharge(Supplier<T> call) { return chargeTimer.record(call); }
}
```

Exposed at `/actuator/prometheus` (or `/q/metrics` in Quarkus). Prometheus scrapes it; Grafana graphs it. Or push to CloudWatch / Datadog.

### Cardinality — the classic metrics outage

Each unique combination of labels is a separate time series.

```text
✅ tags: method=POST, route=/v1/orders, status=201       → a few hundred series
❌ tags: userId=7, orderId=501                           → millions of series, the metrics system falls over
```

IDs go in **logs and traces**, never metric labels. Use the route template (`/v1/orders/{id}`), not the raw path.

### What to measure: RED and USE

- **RED** for services: **R**ate (requests/s), **E**rrors (failed/s or %), **D**uration (p50/p95/p99).
- **USE** for resources: **U**tilization, **S**aturation (queue length, waiting threads), **E**rrors.
- Plus business metrics: orders/minute, payment success rate, signups. These catch bugs technical metrics miss.
- Plus the specials: DB pool waiting threads, consumer lag (guide 12), cache hit rate, JVM heap/GC pauses.

**Why percentiles, not averages:** average 100 ms can hide 5% of users waiting 3 s. p99 shows the tail.

---

## 4. Distributed tracing

```text
Trace 4bf92f… (one user request, 2.1 s)
├─ api-gateway           POST /v1/orders            2100 ms
│  └─ order-service      OrderService.place         2080 ms
│     ├─ postgres        INSERT orders                 12 ms
│     ├─ payment-service POST /v1/charges            1900 ms   ← here
│     │  └─ bank-api     authorize                   1880 ms
│     └─ kafka           publish OrderPlaced             5 ms
```

- **Trace** = the whole request. **Span** = one operation with start/end, attributes, status.
- The trace ID travels in a header: W3C **`traceparent`** (`00-<traceId>-<spanId>-01`). Every service reads it and passes it on — including into Kafka message headers so async consumers continue the same trace.
- **OpenTelemetry (OTel)** is the standard: SDK/agent in each service → OTel Collector → backend (Jaeger, Tempo, AWS X-Ray, Datadog, Honeycomb).
- Java: the OTel Java agent auto-instruments HTTP, JDBC, Kafka, gRPC with zero code. Spring Boot uses Micrometer Tracing; Quarkus has `quarkus-opentelemetry`.
- **Sampling:** keep maybe 1–10% of normal traces, but 100% of errors and slow ones (tail-based sampling in the collector).

Custom span:

```java
Span span = tracer.spanBuilder("pricing.applyDiscounts").startSpan();
try (Scope s = span.makeCurrent()) {
    span.setAttribute("order.items", items.size());
    return discounts.apply(items);
} catch (Exception e) {
    span.recordException(e);
    span.setStatus(StatusCode.ERROR);
    throw e;
} finally {
    span.end();
}
```

**Correlation:** put `traceId` in every log line. Then: alert → metric spike → exemplar trace → logs for that trace ID. That chain is what "good observability" means in practice.

---

## 5. Error tracking (Sentry)

Captures exceptions with stack trace, request data, release version, user (ID only), breadcrumbs. Groups identical errors, shows "new in release 1.42", alerts on spikes.

- Set `release` and `environment` so you can see which deploy introduced an error.
- Scrub PII before sending (`beforeSend`).
- Do not send expected 4xx validation errors — noise hides real bugs.

---

## 6. Health checks

```text
/health/live   → "is the process alive?"   fails → orchestrator RESTARTS the container
/health/ready  → "can I take traffic?"      fails → load balancer STOPS sending traffic (no restart)
/health/started→ "has startup finished?"    protects slow starters from being killed
```

- Liveness should **not** check the database. If the DB is down, restarting every app instance makes things worse.
- Readiness can check critical dependencies (DB pool usable) and is set to "not ready" during graceful shutdown.

Spring: `management.endpoint.health.probes.enabled=true` → `/actuator/health/liveness`, `/readiness`. Quarkus: SmallRye Health `/q/health/live`, `/q/health/ready`.

---

## 7. SLI, SLO, SLA and error budgets

| Term | Meaning | Example |
|---|---|---|
| **SLI** (indicator) | A measured number | % of checkout requests that succeed in < 1 s |
| **SLO** (objective) | Internal target for the SLI | 99.9% over 30 days |
| **SLA** (agreement) | Promise to customers, with penalties | 99.5% or credits |
| **Error budget** | 100% − SLO | 0.1% ≈ 43 minutes / 30 days of "bad" |

Budget left → ship features faster. Budget burned → freeze risky launches, fix reliability.

---

## 8. Alerting that people do not ignore

- Alert on **symptoms users feel** (error rate, latency SLO burn, checkout failing), not on causes like "CPU 85%".
- **Burn-rate alerts:** page when the error budget is burning fast (e.g., 14× normal over 1 h); ticket when burning slowly.
- Every page has a **runbook** link: what it means, dashboards, first steps.
- Pages must be actionable. If you snooze it every week, delete or fix it.
- Separate severity: page (wake someone up) vs ticket (fix this week).

---

## 9. Debugging a slow endpoint — a real flow

```text
1. Dashboard: p99 of POST /v1/orders went 300 ms → 2.5 s at 10:10. Error rate flat.
2. Did anything change? Deploy markers / feature flags / config at 10:08 → release 1.42.
3. Open a slow exemplar trace → 1.9 s in payment-service → bank-api.
4. Payment-service metrics: connection pool to bank-api saturated, waiting threads climbing.
5. Logs by traceId: "retrying charge attempt=3".
6. Cause: 1.42 raised retries from 1 to 3 without a budget, bank API slow → retry storm.
7. Mitigate first (roll back / feature flag), then fix, then a blameless postmortem.
```

JVM-specific tools for the "inside the process" part: thread dumps (`jstack`, look for BLOCKED threads), heap dumps (memory leaks), **async-profiler** / JFR (Java Flight Recorder) for CPU and allocations, GC logs.

---

## 10. Incident basics

1. **Detect** (alert) → 2. **Triage** (impact, severity, incident commander) → 3. **Mitigate** (rollback, flag off, scale up — restore first, find root cause later) → 4. **Resolve** → 5. **Postmortem**: timeline, root cause, contributing factors, action items. **Blameless** — fix systems, not people.

---

## Common mistakes

| Mistake | Fix |
|---|---|
| Free-text logs | Structured JSON + MDC |
| Logging secrets / tokens | Mask, review, scrub |
| IDs as metric labels | IDs in logs/traces only |
| Averages only | p95/p99 histograms |
| No trace context through Kafka | Propagate `traceparent` in message headers |
| Liveness checks the DB | Liveness = process only; readiness = dependencies |
| Alert on every cause | Alert on user symptoms / SLO burn, with runbooks |

---

## Spoken answer (45s)

> I treat logs, metrics and traces as one system. Logs are structured JSON through SLF4J with MDC, so every line carries the trace and request ID, and they never contain secrets. Metrics use Micrometer with RED for services and USE for resources, as histograms for p99, with low-cardinality labels and business metrics like payment success rate. Traces use OpenTelemetry with W3C traceparent propagated over HTTP, gRPC and Kafka headers, sampling all errors and slow requests. Errors go to Sentry tagged with the release. Liveness only checks the process, readiness checks dependencies. I define SLOs, alert on symptoms and burn rate with runbooks, and during incidents I mitigate first and write a blameless postmortem.
