# 03 — Java for backend (coming from JavaScript / TypeScript)

**Goal:** read and write the Java that backend services actually use. You already know TypeScript, so every section compares to it.

---

## 0. The big differences from JS

| | JavaScript / TS | Java |
|---|---|---|
| Runs on | Node / browser | JVM (Java Virtual Machine) |
| Types | Optional (TS), erased at runtime | Required, checked at compile time **and** exist at runtime |
| Code lives in | Functions anywhere | Everything is inside a **class** |
| Compile | TS → JS | `.java` → bytecode `.class` → JVM runs it |
| Concurrency | One event loop | Many real threads (guide 04) |
| `null` | `null` and `undefined` | Only `null` (and `NullPointerException` when you use it) |
| Build tool | npm / pnpm | Maven (`pom.xml`) or Gradle |

---

## 1. Classes, fields, constructors

```java
public class Book {
    private final long id;          // final = cannot change after constructor
    private String title;
    private int priceCents;

    public Book(long id, String title, int priceCents) {
        this.id = id;
        this.title = title;
        this.priceCents = priceCents;
    }

    public long getId() { return id; }
    public String getTitle() { return title; }
    public int getPriceCents() { return priceCents; }

    public void applyDiscount(int percent) {
        if (percent < 0 || percent > 90) {
            throw new IllegalArgumentException("bad discount " + percent);
        }
        this.priceCents = priceCents * (100 - percent) / 100;
    }
}
```

Access modifiers:

| Modifier | Who can see it |
|---|---|
| `public` | Everyone |
| `private` | Only this class |
| `protected` | This class, subclasses, same package |
| (none) | Same package only |

Rule of thumb: fields `private`, expose behavior through methods.

## 2. Records — the Java version of a TS type for data

For DTOs (request / response objects), use a **record**. It auto-creates the constructor, getters, `equals`, `hashCode` and `toString`, and fields are immutable.

```java
public record BookResponse(long id, String title, int priceCents) {}

var r = new BookResponse(42, "Clean Code", 3999);
r.title();        // "Clean Code"   (no "get" prefix)
```

You can validate inside:

```java
public record CreateBookRequest(String title, int priceCents) {
    public CreateBookRequest {
        if (title == null || title.isBlank()) throw new IllegalArgumentException("title required");
        if (priceCents < 0) throw new IllegalArgumentException("price must be >= 0");
    }
}
```

TS equivalent: `type BookResponse = { readonly id: number; readonly title: string; readonly priceCents: number }`.

## 3. Interfaces and implementations

```java
public interface PaymentGateway {
    PaymentResult charge(long orderId, int amountCents);
}

public class RazorpayGateway implements PaymentGateway {
    @Override
    public PaymentResult charge(long orderId, int amountCents) {
        // call Razorpay HTTP API
        return PaymentResult.success("pay_123");
    }
}

public class FakeGateway implements PaymentGateway {        // for tests
    @Override
    public PaymentResult charge(long orderId, int amountCents) {
        return PaymentResult.success("fake");
    }
}
```

Your service depends on the **interface**, so tests can pass the fake. This is the whole reason dependency injection exists (guide 05).

## 4. Inheritance vs composition

```java
abstract class Notification {
    abstract void send(String to, String message);
}
class EmailNotification extends Notification {
    void send(String to, String message) { /* SMTP */ }
}
```

Use inheritance sparingly. Prefer **composition**: a class that *has* a `Notifier`, not a class that *is* one. Deep `extends` chains are hard to change.

## 5. Enums (much stronger than TS enums)

```java
public enum OrderStatus {
    PENDING_PAYMENT, PAID, SHIPPED, DELIVERED, CANCELLED;

    public boolean canCancel() {
        return this == PENDING_PAYMENT || this == PAID;
    }
}

if (!order.getStatus().canCancel()) {
    throw new ConflictException("cannot cancel a " + order.getStatus() + " order");
}
```

## 6. Sealed interfaces + pattern matching (Java 21)

Like a TS discriminated union.

```java
public sealed interface PaymentResult permits Success, Declined, Failed {}
public record Success(String paymentId) implements PaymentResult {}
public record Declined(String reason) implements PaymentResult {}
public record Failed(Exception cause) implements PaymentResult {}

String message = switch (result) {
    case Success s  -> "paid: " + s.paymentId();
    case Declined d -> "card declined: " + d.reason();
    case Failed f   -> "try again later";
};   // compiler errors if you forget a case
```

## 7. Collections — the ones you use daily

| Need | Interface | Usual class | JS equivalent |
|---|---|---|---|
| Ordered list | `List<T>` | `ArrayList` | `Array` |
| Unique items | `Set<T>` | `HashSet` / `LinkedHashSet` (keeps order) | `Set` |
| Key → value | `Map<K,V>` | `HashMap` / `LinkedHashMap` | `Map` / object |
| Sorted map | `SortedMap` | `TreeMap` | — |
| Queue | `Queue<T>` / `Deque<T>` | `ArrayDeque` | array push/shift |

```java
List<String> titles = new ArrayList<>();
titles.add("Clean Code");

Map<Long, Integer> stockByBook = new HashMap<>();
stockByBook.put(42L, 5);
int stock = stockByBook.getOrDefault(99L, 0);
stockByBook.merge(42L, -1, Integer::sum);        // decrement

List<String> fixed = List.of("a", "b");          // immutable, add() throws
```

Generics `<T>` are the same idea as TS generics. Primitives (`int`, `long`) cannot go in collections, so Java boxes them into `Integer`, `Long`. Compare boxed numbers with `.equals()`, not `==`.

## 8. Streams — `map` / `filter` / `reduce` in Java

```java
List<Book> books = repo.findAll();

List<String> cheapTitles = books.stream()
    .filter(b -> b.getPriceCents() < 50000)
    .map(Book::getTitle)
    .sorted()
    .toList();

int totalCents = order.getItems().stream()
    .mapToInt(i -> i.getPriceCents() * i.getQuantity())
    .sum();

Map<String, List<Book>> byAuthor = books.stream()
    .collect(Collectors.groupingBy(Book::getAuthor));

Map<Long, Book> byId = books.stream()
    .collect(Collectors.toMap(Book::getId, b -> b));
```

Streams are **lazy** and single-use. Do not use a stream to replace a simple loop that has side effects.

## 9. `null` and `Optional`

The famous crash: `NullPointerException` (NPE).

```java
Optional<Book> maybe = repo.findById(42L);

Book book = maybe.orElseThrow(() -> new NotFoundException("book 42"));
String title = maybe.map(Book::getTitle).orElse("Unknown");
```

Rules:

- Return `Optional` from methods that may find nothing.
- Do not use `Optional` for fields or method parameters.
- Never call `optional.get()` without checking. Use `orElseThrow`.

## 10. Exceptions

```java
try {
    gateway.charge(orderId, amount);
} catch (PaymentDeclinedException e) {
    order.markDeclined(e.getReason());
} catch (IOException e) {
    throw new UpstreamUnavailableException("payment provider down", e);   // keep the cause
} finally {
    metrics.increment("payment.attempt");
}
```

| Kind | Example | Must you catch / declare? |
|---|---|---|
| **Checked** | `IOException`, `SQLException` | Yes (`throws` or `try`) |
| **Unchecked** (extends `RuntimeException`) | `IllegalArgumentException`, `NullPointerException` | No |

Modern backend code mostly uses **unchecked** custom exceptions and maps them to HTTP status codes in one place (guide 05):

```java
public class NotFoundException extends RuntimeException {
    public NotFoundException(String message) { super(message); }
}
```

**try-with-resources** closes things for you:

```java
try (var in = Files.newInputStream(path)) {
    return in.readAllBytes();
}   // closed even if an exception is thrown
```

Never swallow: `catch (Exception e) {}`. At least log it with the stack trace.

## 11. `equals` and `hashCode`

`==` compares **references** (same object in memory) for objects. `.equals()` compares **values**.

```java
String a = new String("x");
a == "x"        // false (maybe)
a.equals("x")   // true
```

If you override `equals`, override `hashCode` too, or `HashMap` / `HashSet` break. Records do both for you.

## 12. Strings, numbers, money, time

```java
String msg = "Order %d total %s".formatted(981, "₹119.97");
String block = """
    {"id": 981}
    """;                                      // text block

BigDecimal price = new BigDecimal("39.99");   // exact decimals (money if you must use decimals)
long cents = 3999L;                           // simplest: integer cents

Instant now = Instant.now();                  // a moment in UTC — store this
LocalDate day = LocalDate.of(2026, 11, 6);    // a date without time zone
ZonedDateTime ist = now.atZone(ZoneId.of("Asia/Kolkata"));
Duration timeout = Duration.ofSeconds(5);
```

Store `Instant` / UTC in databases. Never `java.util.Date` in new code.

## 13. `var`, lambdas, method references

```java
var books = new ArrayList<Book>();            // type inferred, still static
Runnable task = () -> System.out.println("hi");
Function<Book, String> getTitle = Book::getTitle;
Comparator<Book> byPrice = Comparator.comparingInt(Book::getPriceCents).reversed();
```

## 14. Packages and project layout (Maven)

```text
booknest/
  pom.xml                         dependencies + build (like package.json)
  src/main/java/com/booknest/
      BookNestApplication.java
      book/                       package by feature, not by layer
          BookController.java
          BookService.java
          BookRepository.java
          Book.java
      order/ ...
  src/main/resources/
      application.yml             config
      db/migration/V1__init.sql   migrations
  src/test/java/...               tests
```

```bash
mvn clean package        # compile, test, build target/booknest.jar
mvn test                 # tests only
java -jar target/booknest.jar
```

**Package by feature** (`book/`, `order/`) scales better than by layer (`controllers/`, `services/`).

## 15. Memory and garbage collection (enough to talk about it)

- Objects live on the **heap**. Local variables and call frames live on the **stack** (one per thread).
- The **garbage collector** frees objects nothing points to. You do not `free()`.
- You can still leak: a `static Map` cache that only grows, listeners never removed, unbounded queues.
- `OutOfMemoryError` → find what keeps growing. Heap dump + a tool like Eclipse MAT.
- Tune with `-Xmx` (max heap). In containers, the JVM reads the container memory limit; leave room for non-heap memory.

## 16. Lombok (you will see it)

Many codebases use Lombok annotations to skip boilerplate:

```java
@Getter @Setter @NoArgsConstructor @AllArgsConstructor
public class Book { private long id; private String title; }

@RequiredArgsConstructor          // constructor for all final fields
@Slf4j                            // gives you `log`
public class BookService { private final BookRepository repo; }
```

Records replace most Lombok use for DTOs.

---

## Common mistakes coming from JS

| Mistake | Fix |
|---|---|
| `if (str == "x")` | `"x".equals(str)` (also null-safe) |
| Using `double` for money | integer cents or `BigDecimal` |
| `optional.get()` | `orElseThrow` |
| Mutable shared fields in a service | Services are shared by all threads — keep them stateless |
| `catch (Exception e) {}` | Log, rethrow, or map to an error |
| Returning entities from controllers | Return records (DTOs) |

---

## Spoken answer (30s)

> For backend Java I keep data as records, behavior in small services that depend on interfaces, and errors as unchecked domain exceptions mapped to HTTP codes in one place. I use streams for transforms, Optional for "may not exist" returns, Instant for time and integer cents for money. Services are singletons shared across threads, so they hold no mutable state. Code is packaged by feature and built with Maven.
