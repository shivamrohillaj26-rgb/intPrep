# 05 — Spring Boot (build a real API)

**Goal:** build BookNest's book API with Spring Boot 3: dependency injection, layers, config, validation, error handling, and database access.

Angular link: Spring DI is the same idea as Angular DI. `@Service` ≈ `@Injectable({ providedIn: 'root' })`. Constructor injection ≈ `inject()` / constructor params.

---

## 1. What Spring Boot gives you

- **Spring Framework:** dependency injection container, web, data, security.
- **Boot:** sensible defaults + an embedded server (Tomcat), so `java -jar app.jar` runs a web server.
- **Starters:** one dependency pulls a whole feature (`spring-boot-starter-web`, `-data-jpa`, `-security`, `-validation`, `-actuator`).

```xml
<!-- pom.xml -->
<parent>
  <groupId>org.springframework.boot</groupId>
  <artifactId>spring-boot-starter-parent</artifactId>
  <version>3.3.5</version>
</parent>
<dependencies>
  <dependency><groupId>org.springframework.boot</groupId><artifactId>spring-boot-starter-web</artifactId></dependency>
  <dependency><groupId>org.springframework.boot</groupId><artifactId>spring-boot-starter-validation</artifactId></dependency>
  <dependency><groupId>org.springframework.boot</groupId><artifactId>spring-boot-starter-data-jpa</artifactId></dependency>
  <dependency><groupId>org.springframework.boot</groupId><artifactId>spring-boot-starter-actuator</artifactId></dependency>
  <dependency><groupId>org.postgresql</groupId><artifactId>postgresql</artifactId></dependency>
  <dependency><groupId>org.flywaydb</groupId><artifactId>flyway-core</artifactId></dependency>
  <dependency><groupId>org.springframework.boot</groupId><artifactId>spring-boot-starter-test</artifactId><scope>test</scope></dependency>
</dependencies>
```

```java
@SpringBootApplication
public class BookNestApplication {
    public static void main(String[] args) {
        SpringApplication.run(BookNestApplication.class, args);
    }
}
```

`@SpringBootApplication` = configuration + auto-configuration + scan this package and below for components.

---

## 2. Dependency injection (DI) and beans

A **bean** is an object Spring creates and manages. You do not call `new BookService(...)`. Spring builds the graph.

```java
@Repository class BookRepository { ... }

@Service
class BookService {
    private final BookRepository repo;
    private final Clock clock;

    BookService(BookRepository repo, Clock clock) {   // constructor injection
        this.repo = repo;
        this.clock = clock;
    }
}
```

Stereotype annotations (all make a bean):

| Annotation | Use for |
|---|---|
| `@Component` | Generic bean |
| `@Service` | Business logic |
| `@Repository` | Data access (also translates DB exceptions) |
| `@RestController` | HTTP endpoints returning JSON |
| `@Configuration` + `@Bean` | Beans you build yourself (third-party classes) |

```java
@Configuration
class AppConfig {
    @Bean
    Clock clock() { return Clock.systemUTC(); }

    @Bean
    RestClient paymentClient(@Value("${payments.base-url}") String baseUrl) {
        return RestClient.builder().baseUrl(baseUrl).build();
    }
}
```

**Always use constructor injection.** Fields can be `final`, tests can pass fakes with `new`, and missing dependencies fail at startup. Avoid `@Autowired` on fields.

**Scopes:** default is **singleton** — one instance shared by every request and every thread. That is why services must not hold per-request mutable state (guide 04). Other scopes: `prototype`, `request`, `session`.

**Two implementations of one interface:** mark one `@Primary`, or pick with `@Qualifier("razorpay")`.

---

## 3. The layers, fully written

### Entity (database row) — guide 08 goes deep

```java
@Entity
@Table(name = "books")
public class Book {
    @Id @GeneratedValue(strategy = GenerationType.IDENTITY)
    private Long id;

    @Column(nullable = false)
    private String title;

    @Column(name = "price_cents", nullable = false)
    private int priceCents;

    private int stock;

    @Version
    private long version;          // optimistic locking

    protected Book() {}            // JPA needs it
    public Book(String title, int priceCents, int stock) { ... }
    // getters, and methods that change state with rules
}
```

### Repository

```java
public interface BookRepository extends JpaRepository<Book, Long> {
    List<Book> findByTitleContainingIgnoreCase(String q);   // query from the method name

    @Query("select b from Book b where b.priceCents between :min and :max")
    Page<Book> findInPriceRange(int min, int max, Pageable pageable);
}
```

You write the interface. Spring generates the implementation.

### DTOs with validation

```java
public record CreateBookRequest(
    @NotBlank @Size(max = 200) String title,
    @PositiveOrZero int priceCents,
    @PositiveOrZero int stock
) {}

public record BookResponse(long id, String title, int priceCents, int stock) {
    static BookResponse from(Book b) {
        return new BookResponse(b.getId(), b.getTitle(), b.getPriceCents(), b.getStock());
    }
}
```

### Service — business rules and transactions

```java
@Service
public class BookService {
    private final BookRepository repo;

    public BookService(BookRepository repo) { this.repo = repo; }

    @Transactional(readOnly = true)
    public BookResponse get(long id) {
        return repo.findById(id).map(BookResponse::from)
            .orElseThrow(() -> new NotFoundException("Book " + id + " not found"));
    }

    @Transactional
    public BookResponse create(CreateBookRequest req) {
        Book saved = repo.save(new Book(req.title(), req.priceCents(), req.stock()));
        return BookResponse.from(saved);
    }

    @Transactional(readOnly = true)
    public Page<BookResponse> list(Pageable pageable) {
        return repo.findAll(pageable).map(BookResponse::from);
    }
}
```

### Controller — HTTP only, no business logic

```java
@RestController
@RequestMapping("/v1/books")
public class BookController {
    private final BookService service;

    public BookController(BookService service) { this.service = service; }

    @GetMapping("/{id}")
    public BookResponse get(@PathVariable long id) {
        return service.get(id);
    }

    @GetMapping
    public Page<BookResponse> list(@PageableDefault(size = 20, sort = "id") Pageable pageable) {
        return service.list(pageable);
    }

    @PostMapping
    public ResponseEntity<BookResponse> create(@Valid @RequestBody CreateBookRequest req) {
        BookResponse created = service.create(req);
        return ResponseEntity.created(URI.create("/v1/books/" + created.id())).body(created);
    }
}
```

Annotations to know: `@PathVariable`, `@RequestParam`, `@RequestBody`, `@RequestHeader`, `@Valid`, `ResponseEntity` (when you need status / headers).

---

## 4. Global error handling (one place)

```java
@RestControllerAdvice
public class ApiExceptionHandler {
    private static final Logger log = LoggerFactory.getLogger(ApiExceptionHandler.class);

    @ExceptionHandler(NotFoundException.class)
    ProblemDetail notFound(NotFoundException e) {
        return ProblemDetail.forStatusAndDetail(HttpStatus.NOT_FOUND, e.getMessage());
    }

    @ExceptionHandler(MethodArgumentNotValidException.class)
    ProblemDetail invalid(MethodArgumentNotValidException e) {
        ProblemDetail pd = ProblemDetail.forStatus(HttpStatus.BAD_REQUEST);
        pd.setTitle("Validation failed");
        pd.setProperty("errors", e.getBindingResult().getFieldErrors().stream()
            .map(f -> Map.of("field", f.getField(), "message", f.getDefaultMessage()))
            .toList());
        return pd;
    }

    @ExceptionHandler(ObjectOptimisticLockingFailureException.class)
    ProblemDetail conflict() {
        return ProblemDetail.forStatusAndDetail(HttpStatus.CONFLICT, "Someone else changed this. Reload.");
    }

    @ExceptionHandler(Exception.class)
    ProblemDetail unexpected(Exception e) {
        log.error("Unhandled error", e);                 // full stack trace in logs
        return ProblemDetail.forStatusAndDetail(HttpStatus.INTERNAL_SERVER_ERROR, "Something went wrong");
    }                                                    // never leak e.getMessage() for 500s
}
```

---

## 5. Configuration and profiles

```yaml
# src/main/resources/application.yml
server:
  port: 8080
spring:
  datasource:
    url: jdbc:postgresql://localhost:5432/booknest
    username: booknest
    password: ${DB_PASSWORD}          # from an environment variable, never committed
    hikari:
      maximum-pool-size: 10
  jpa:
    hibernate:
      ddl-auto: validate              # NEVER "update" in production. Migrations own the schema.
    open-in-view: false               # see guide 08
payments:
  base-url: https://api.razorpay.com
  timeout: 3s
```

```yaml
# application-prod.yml  (active when SPRING_PROFILES_ACTIVE=prod)
spring:
  datasource:
    hikari:
      maximum-pool-size: 30
```

Typed config instead of scattered `@Value`:

```java
@ConfigurationProperties(prefix = "payments")
public record PaymentProperties(URI baseUrl, Duration timeout) {}

@SpringBootApplication
@ConfigurationPropertiesScan
public class BookNestApplication { ... }
```

Order of precedence (high wins): command-line args → environment variables (`PAYMENTS_TIMEOUT=5s`) → profile yml → `application.yml`.

---

## 6. Filters and interceptors (cross-cutting work)

```java
@Component
public class RequestIdFilter extends OncePerRequestFilter {
    @Override
    protected void doFilterInternal(HttpServletRequest req, HttpServletResponse res, FilterChain chain)
            throws ServletException, IOException {
        String id = Optional.ofNullable(req.getHeader("X-Request-Id"))
            .orElse(UUID.randomUUID().toString());
        MDC.put("requestId", id);               // every log line now includes it
        res.setHeader("X-Request-Id", id);
        try {
            chain.doFilter(req, res);
        } finally {
            MDC.clear();                         // thread is reused
        }
    }
}
```

Filter = servlet level, before Spring MVC. `HandlerInterceptor` = around controller methods. Security (guide 10) is a chain of filters.

---

## 7. How `@Transactional` really works (interview favorite)

Spring wraps your bean in a **proxy**. Calling a `@Transactional` method goes through the proxy, which opens a transaction, calls your method, then commits — or rolls back on an exception.

```text
Controller → [proxy: begin tx] → BookService.create() → [proxy: commit]
```

Three traps:

1. **Self-invocation:** `this.otherMethod()` inside the same class skips the proxy, so `@Transactional` on `otherMethod` does nothing.
2. **Checked exceptions do not roll back by default.** Use `@Transactional(rollbackFor = Exception.class)` or unchecked exceptions.
3. **Only public methods** on beans Spring created are proxied.

Propagation: `REQUIRED` (default, join or start), `REQUIRES_NEW` (separate transaction, e.g. write an audit row even if the main one fails).

Do not call slow HTTP services inside a transaction. The DB connection stays held the whole time.

---

## 8. Calling other services

```java
@Component
class PaymentClient {
    private final RestClient client;

    PaymentClient(RestClient.Builder builder, PaymentProperties props) {
        var factory = new SimpleClientHttpRequestFactory();
        factory.setConnectTimeout((int) Duration.ofSeconds(1).toMillis());
        factory.setReadTimeout((int) props.timeout().toMillis());
        this.client = builder.baseUrl(props.baseUrl().toString()).requestFactory(factory).build();
    }

    ChargeResponse charge(ChargeRequest req, String idempotencyKey) {
        return client.post().uri("/charges")
            .header("Idempotency-Key", idempotencyKey)
            .body(req)
            .retrieve()
            .body(ChargeResponse.class);
    }
}
```

`RestClient` (sync, new), `WebClient` (reactive), OpenFeign (interface-based). Always set timeouts. Add retries and circuit breakers with Resilience4j (guide 13).

---

## 9. Actuator (health and metrics)

```yaml
management:
  endpoints:
    web:
      exposure:
        include: health,info,prometheus
  endpoint:
    health:
      probes:
        enabled: true     # /actuator/health/liveness and /readiness for Kubernetes
```

Do not expose `env`, `heapdump` or `beans` publicly. They leak secrets.

---

## 10. Spring Boot startup, in order

```text
main() → SpringApplication.run
  → read config (yml, env, args)
  → auto-configuration: "Postgres driver on classpath + datasource url → create DataSource"
  → component scan → create beans in dependency order
  → Flyway runs migrations
  → JPA validates entities against the schema
  → Tomcat starts on 8080
  → "Started BookNestApplication in 3.2 seconds"
```

If a bean cannot be created (missing config, circular dependency), the app fails at startup. That is good: fail fast.

---

## 11. Reactive (WebFlux) — know it exists

Spring WebFlux uses `Mono<T>` (0–1 value) and `Flux<T>` (many), like RxJS Observables, on a small number of event-loop threads. Use it for very high concurrency streaming. With virtual threads (guide 04), most teams stay on simple Spring MVC.

---

## Common mistakes

| Mistake | Fix |
|---|---|
| Business logic in controllers | Controller → service → repository |
| Returning `@Entity` from APIs | Records / DTOs |
| `ddl-auto: update` in prod | Flyway migrations + `validate` |
| Field injection `@Autowired` | Constructor injection |
| Calling `@Transactional` method from the same class | Move it to another bean |
| Secrets in `application.yml` | Environment variables / secrets manager |
| HTTP calls without timeouts | Always configure timeouts |

---

## Spoken answer (45s)

> Spring Boot gives me a DI container plus auto-configured web, data and security with an embedded server. I structure each feature as a thin controller, a service that owns rules and transactions, and a Spring Data repository, using records as DTOs with Bean Validation. Errors go through one RestControllerAdvice returning Problem Details. Beans are singletons with constructor injection, so services are stateless. Config is typed with ConfigurationProperties and overridden per environment by env variables, schema changes go through Flyway with ddl-auto set to validate, and I know @Transactional is proxy-based, so self-invocation and checked exceptions are the classic traps.
