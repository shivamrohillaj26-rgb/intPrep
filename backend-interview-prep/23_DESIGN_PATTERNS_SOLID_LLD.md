# 23 — SOLID, design patterns and low-level design (LLD)

**Goal:** write backend classes that are easy to change and test, and pass the "low-level design" / "machine coding" round (design a parking lot, rate limiter, cart…).

Architecture patterns (guide 22) are about **systems**. This guide is about **classes and objects inside one service**.

---

## 1. SOLID — five rules, each with a before/after

### S — Single Responsibility
A class should have **one reason to change**.

```java
// ❌ One class: calculates price, saves to DB, sends email
class OrderManager {
    void checkout(Cart c) { /* pricing + SQL + SMTP */ }
}

// ✅ Each changes for its own reason
class PricingService   { Money total(Cart c) { ... } }
class OrderRepository  { Order save(Order o) { ... } }
class OrderNotifier    { void confirmed(Order o) { ... } }
class CheckoutService  {                       // orchestrates
    Order checkout(Cart c) {
        Order o = repo.save(Order.from(c, pricing.total(c)));
        notifier.confirmed(o);
        return o;
    }
}
```

### O — Open/Closed
Open for extension, closed for modification: add behavior by **adding classes**, not editing a growing `if/else`.

```java
// ❌ every new discount edits this method
int discount(Order o) {
    if (o.code().equals("STUDENT")) return ...;
    else if (o.code().equals("FESTIVE")) return ...;
}

// ✅ new discount = new class
interface DiscountRule { boolean applies(Order o); int discountCents(Order o); }

@Component class StudentDiscount implements DiscountRule { ... }
@Component class FestiveDiscount implements DiscountRule { ... }

@Service
class DiscountService {
    private final List<DiscountRule> rules;           // Spring injects all implementations
    int best(Order o) {
        return rules.stream().filter(r -> r.applies(o))
                    .mapToInt(r -> r.discountCents(o)).max().orElse(0);
    }
}
```

### L — Liskov Substitution
A subclass must work anywhere its parent is expected, **without surprises**.

```java
// ❌ ReadOnlyRepository extends Repository but throws on save() → callers break
// ✅ split interfaces: ReadRepository { find }, WriteRepository { save }
```

Classic example: `Square extends Rectangle` breaks `setWidth` expectations. Symptom: `instanceof` checks or "not supported" exceptions in subclasses.

### I — Interface Segregation
Many small interfaces beat one fat one. Clients should not depend on methods they do not use.

```java
// ❌ interface PaymentGateway { charge(); refund(); payout(); kycVerify(); }
// ✅ interface Charger { charge(); }   interface Refunder { refund(); }
```

### D — Dependency Inversion
High-level code depends on **abstractions**, not concrete details. DI frameworks make this natural.

```java
// ❌ class CheckoutService { private StripeClient stripe = new StripeClient(); }
// ✅
interface PaymentPort { ChargeResult charge(ChargeRequest r); }
class CheckoutService {
    private final PaymentPort payments;            // Stripe, Razorpay or a fake in tests
    CheckoutService(PaymentPort payments) { this.payments = payments; }
}
```

### Also know
- **DRY** (don't repeat knowledge — not "never repeat two lines"), **KISS**, **YAGNI** (do not build for imagined futures).
- **Composition over inheritance:** build behavior by combining objects; inheritance couples tightly.
- **Law of Demeter:** talk to friends, not strangers (`order.getUser().getAddress().getCity()` → `order.shippingCity()`).
- **Tell, don't ask:** `order.markPaid()` instead of `if (order.getStatus()==PENDING) order.setStatus(PAID)`.
- **Cohesion high, coupling low.**

---

## 2. Design patterns that actually show up in backend code

### Creational

**Builder** — many optional parameters, readable construction, immutable result.

```java
EmailMessage msg = EmailMessage.builder()
    .to("a@b.com").subject("Order confirmed").template("order-confirmed")
    .param("orderId", 501).build();
```
Seen in: protobuf messages, `HttpRequest.newBuilder()`, Lombok `@Builder`, AWS SDK v2 requests.

**Factory / factory method** — choose the implementation at runtime.

```java
class PaymentGatewayFactory {
    private final Map<String, PaymentPort> byName;          // Spring: inject Map<String, PaymentPort>
    PaymentPort forCountry(String country) {
        return byName.getOrDefault(country.equals("IN") ? "razorpay" : "stripe", byName.get("stripe"));
    }
}
```

**Singleton** — one instance. In Spring/Quarkus every bean is a singleton by default; do not hand-roll `getInstance()` with static state (hard to test). If you must: enum singleton or holder idiom.

**Prototype** — copy an existing object (rare in Java backend; `record` + `with`-style copies instead).

### Structural

**Adapter** — make an incompatible API fit your interface (the anti-corruption layer at class level).

```java
class RazorpayAdapter implements PaymentPort {
    private final RazorpayClient client;
    public ChargeResult charge(ChargeRequest r) {
        var resp = client.payments().create(Map.of("amount", r.amountCents(), "currency", "INR"));
        return new ChargeResult(resp.get("id"), mapStatus(resp.get("status")));
    }
}
```

**Decorator** — add behavior around an object with the same interface (logging, caching, retries, metrics).

```java
class CachingBookRepository implements BookReader {
    private final BookReader delegate;
    private final Cache<Long, Book> cache;
    public Book find(long id) { return cache.get(id, delegate::find); }
}
```
Spring AOP (`@Transactional`, `@Cacheable`) is decorators generated as proxies. Java I/O streams are decorators.

**Proxy** — stand-in controlling access (lazy loading Hibernate proxies, Spring's transactional proxies, remote stubs in gRPC).

**Facade** — one simple API over a complex subsystem (`CheckoutService.checkout()` hides pricing, stock, payment, notifications).

**Composite** — tree of objects treated uniformly (category tree, a bundle containing products and other bundles, permission groups).

### Behavioral

**Strategy** — interchangeable algorithms behind one interface (pricing, discount rules, shipping cost, rate-limit algorithm). The `DiscountRule` example above.

**Template method** — fixed skeleton, steps overridden by subclasses.

```java
abstract class ImportJob {
    public final void run() { var rows = read(); var valid = validate(rows); write(valid); report(); }
    protected abstract List<Row> read();
    protected abstract void write(List<Row> rows);
    protected List<Row> validate(List<Row> rows) { return rows; }
    private void report() { ... }
}
```
Spring's `JdbcTemplate`, `RestTemplate` follow this idea with callbacks.

**Observer / publish-subscribe (in-process)** — notify listeners of events.

```java
publisher.publishEvent(new OrderPlacedEvent(order.getId()));

@TransactionalEventListener(phase = TransactionPhase.AFTER_COMMIT)
void on(OrderPlacedEvent e) { cache.evict(e.orderId()); }
```

**Chain of responsibility** — pass a request through handlers until one handles it or all have run: servlet filters, Spring Security filter chain, middleware, validation pipelines.

**Command** — wrap a request as an object (queue it, log it, retry it, undo it). Job queue messages, CQRS commands (`PlaceOrderCommand`).

**State** — object behavior depends on its state; each state is a class or an enum with transitions.

```java
enum OrderStatus {
    PENDING_PAYMENT { Set<OrderStatus> next() { return EnumSet.of(PAID, CANCELLED); } },
    PAID            { Set<OrderStatus> next() { return EnumSet.of(SHIPPED, REFUNDED); } },
    SHIPPED         { Set<OrderStatus> next() { return EnumSet.of(DELIVERED); } },
    DELIVERED       { Set<OrderStatus> next() { return EnumSet.noneOf(OrderStatus.class); } },
    CANCELLED       { Set<OrderStatus> next() { return EnumSet.noneOf(OrderStatus.class); } },
    REFUNDED        { Set<OrderStatus> next() { return EnumSet.noneOf(OrderStatus.class); } };

    abstract Set<OrderStatus> next();

    OrderStatus to(OrderStatus target) {
        if (!next().contains(target)) throw new IllegalStateException(this + " → " + target);
        return target;
    }
}
```
State machines are everywhere in backends: orders, payments, devices, workflows.

**Iterator**, **Visitor** (walk an AST/tree with operations), **Mediator** (central coordinator), **Memento** (snapshots — event sourcing snapshots) — know the names.

### Enterprise / persistence patterns

| Pattern | Where you see it |
|---|---|
| Repository | Spring Data, Panache |
| Unit of Work | Hibernate persistence context (tracks changes, flushes at commit) |
| Identity Map | First-level cache: one object per row per session |
| Data Mapper vs Active Record | JPA entities + repository (mapper) vs Panache `PanacheEntity` (active record) |
| DTO | Request/response records |
| Value Object | `Money`, `Email`, `Isbn` — immutable, equality by value, validated on creation |
| Specification | Composable query criteria (`Specification<Book>` in Spring Data) |
| Service Layer | Application services orchestrating use cases |

```java
public record Money(long cents, Currency currency) {
    public Money {
        if (cents < 0) throw new IllegalArgumentException("negative money");
        Objects.requireNonNull(currency);
    }
    public Money plus(Money o) {
        if (!currency.equals(o.currency)) throw new IllegalArgumentException("currency mismatch");
        return new Money(cents + o.cents, currency);
    }
}
```

---

## 3. Low-level design round — the method

```text
1. Clarify requirements (scope, scale, concurrency, persistence?)       3–5 min
2. Identify entities (nouns) and behaviors (verbs)                         5 min
3. Class diagram: classes, fields, relationships, interfaces              10 min
4. Key flows as method calls (sequence)                                    5 min
5. Code the core classes with patterns where they fit                     15–20 min
6. Extensibility, concurrency, edge cases, tests                           5 min
```

### Worked example: rate limiter library (very common)

Requirements: per-key limits, pluggable algorithms, thread-safe, in-memory now, Redis later.

```java
public interface RateLimiter {
    boolean tryAcquire(String key);
}

public final class TokenBucketLimiter implements RateLimiter {
    private final long capacity;
    private final double refillPerNano;
    private final Clock clock;
    private final ConcurrentHashMap<String, Bucket> buckets = new ConcurrentHashMap<>();

    public TokenBucketLimiter(long capacity, long refillPerSecond, Clock clock) {
        this.capacity = capacity;
        this.refillPerNano = refillPerSecond / 1_000_000_000.0;
        this.clock = clock;
    }

    @Override
    public boolean tryAcquire(String key) {
        long now = clock.nanos();
        Bucket b = buckets.computeIfAbsent(key, k -> new Bucket(capacity, now));
        synchronized (b) {                                   // lock per key, not global
            double tokens = Math.min(capacity, b.tokens + (now - b.lastNanos) * refillPerNano);
            b.lastNanos = now;
            if (tokens >= 1) { b.tokens = tokens - 1; return true; }
            b.tokens = tokens;
            return false;
        }
    }

    private static final class Bucket {
        double tokens; long lastNanos;
        Bucket(double tokens, long lastNanos) { this.tokens = tokens; this.lastNanos = lastNanos; }
    }

    public interface Clock { long nanos(); }               // injectable for tests
}

public final class RateLimiterFactory {
    public static RateLimiter create(Policy p, TokenBucketLimiter.Clock clock) {
        return switch (p.algorithm()) {
            case TOKEN_BUCKET   -> new TokenBucketLimiter(p.capacity(), p.perSecond(), clock);
            case SLIDING_WINDOW -> new SlidingWindowLimiter(p.capacity(), p.window(), clock);
        };
    }
}
```

Patterns used: **Strategy** (algorithms), **Factory** (creation), **DIP** (interface + injectable clock). Talking points: memory growth (evict idle buckets), distributed version (Redis + Lua, guide 20), fairness, tests with a fake clock.

### Other LLD classics and the key idea

| Problem | Core entities / patterns |
|---|---|
| Parking lot | `ParkingLot`, `Level`, `Spot` (by size), `Ticket`, `PricingStrategy`; concurrency on spot assignment |
| Shopping cart + checkout | `Cart`, `CartItem`, `Money`, `DiscountRule` (strategy), `Order` state machine |
| Elevator | `Elevator` state (moving/idle/doors), `Request`, scheduling strategy (SCAN/nearest) |
| LRU cache | `HashMap` + doubly linked list (or `LinkedHashMap` access order), O(1) get/put, thread safety |
| Logger | Levels, appenders (strategy), formatter, chain of handlers, async buffer |
| Notification service | `Channel` interface (email/SMS/push), templates, retry policy, user preferences |
| Splitwise | `User`, `Expense`, `Split` (equal/exact/percent strategy), balance sheet, simplify debts |
| Library / booking system | Inventory, reservations with holds + expiry, concurrency (double booking) |
| Job scheduler | `Job`, `Trigger` (cron/once), worker pool, priority queue, retries |
| Vending machine | State pattern (idle, has money, dispensing), inventory, change calculation |

Concurrency points interviewers probe: double booking (lock per resource or DB constraint), atomic counters, thread-safe maps, avoiding a single global lock.

---

## 4. Code smells → refactor

| Smell | Refactor to |
|---|---|
| Long `if/else` on a type code | Strategy / polymorphism / enum methods |
| God class (2,000 lines) | Split by responsibility |
| Long parameter list | Parameter object / builder |
| Primitive obsession (`String email`, `long cents`) | Value objects |
| Feature envy (method uses another class's data more than its own) | Move the method |
| Shotgun surgery (one change touches 12 files) | Group what changes together |
| Setters everywhere | Behavior methods + invariants |
| Static helpers with hidden I/O | Injected dependencies |

---

## Spoken answer (35s)

> I keep classes small with one reason to change, extend behavior by adding strategy implementations rather than growing if-else chains, and depend on interfaces so infrastructure can be swapped and faked in tests. The patterns I use most in backend code are builder, factory, adapter for third-party APIs, decorator for caching and retries, strategy for pricing and rules, chain of responsibility for filters, and state machines for order and payment lifecycles — plus value objects like Money. In an LLD round I clarify requirements, model entities and interfaces, code the core with those patterns, and then discuss concurrency and extensibility.
