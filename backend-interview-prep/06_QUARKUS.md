# 06 — Quarkus (the same API, built differently)

**Goal:** read and write Quarkus services, and explain when a team picks Quarkus over Spring Boot.

If you understand guide 05, Quarkus is 80% the same ideas with different annotations.

---

## 1. What Quarkus is

A Java framework built for **containers and fast startup**.

| | Spring Boot | Quarkus |
|---|---|---|
| When it does the wiring | Mostly at **startup** (reflection, classpath scanning) | Mostly at **build time** |
| Startup time (JVM) | ~2–5 s | ~0.5–1 s |
| Native image | Possible (GraalVM), less common | First-class: starts in ~50 ms, low memory |
| Standards | Spring APIs | Jakarta EE / MicroProfile APIs (`@Path`, `@Inject`) |
| Dev loop | DevTools restart | `quarkus dev` live reload, Dev Services start a DB for you |
| Ecosystem | Huge | Smaller, growing, strong on cloud (AWS, Kafka, gRPC) |

**Why teams pick Quarkus:** many small services, serverless / Lambda, autoscaling where cold start matters, tight memory per pod.

**Why teams stay on Spring:** bigger ecosystem, more people know it, years of existing code.

---

## 2. Project and dependencies

```xml
<dependencyManagement>
  <dependencies>
    <dependency>
      <groupId>io.quarkus.platform</groupId>
      <artifactId>quarkus-bom</artifactId>
      <version>${quarkus.platform.version}</version>
      <type>pom</type><scope>import</scope>
    </dependency>
  </dependencies>
</dependencyManagement>
<dependencies>
  <dependency><groupId>io.quarkus</groupId><artifactId>quarkus-rest-jackson</artifactId></dependency>
  <dependency><groupId>io.quarkus</groupId><artifactId>quarkus-hibernate-orm-panache</artifactId></dependency>
  <dependency><groupId>io.quarkus</groupId><artifactId>quarkus-jdbc-postgresql</artifactId></dependency>
  <dependency><groupId>io.quarkus</groupId><artifactId>quarkus-hibernate-validator</artifactId></dependency>
  <dependency><groupId>io.quarkus</groupId><artifactId>quarkus-flyway</artifactId></dependency>
  <dependency><groupId>io.quarkus</groupId><artifactId>quarkus-smallrye-health</artifactId></dependency>
</dependencies>
```

A **BOM** (bill of materials) pins compatible versions of every library, so you do not write versions on each dependency.

```bash
./mvnw quarkus:dev          # live reload + Dev UI at /q/dev-ui
./mvnw package              # JVM jar
./mvnw package -Dnative     # native executable (needs GraalVM or a container build)
```

---

## 3. Dependency injection (CDI)

| Spring | Quarkus (CDI) |
|---|---|
| `@Service` / `@Component` | `@ApplicationScoped` |
| `@Autowired` / constructor | `@Inject` or constructor |
| `@Bean` in `@Configuration` | `@Produces` method |
| `@Primary` / `@Qualifier` | `@Default` / custom qualifier |
| request scope | `@RequestScoped` |

```java
@ApplicationScoped
public class BookService {
    private final BookRepository repo;

    BookService(BookRepository repo) {      // constructor injection works
        this.repo = repo;
    }
}
```

`@ApplicationScoped` beans are created lazily, on first use, through a client proxy. `@Singleton` is created without a proxy.

---

## 4. REST endpoints (Jakarta REST)

```java
@Path("/v1/books")
@Produces(MediaType.APPLICATION_JSON)
@Consumes(MediaType.APPLICATION_JSON)
public class BookResource {
    private final BookService service;

    BookResource(BookService service) { this.service = service; }

    @GET
    @Path("/{id}")
    public BookResponse get(@PathParam("id") long id) {
        return service.get(id);
    }

    @GET
    public List<BookResponse> list(@QueryParam("page") @DefaultValue("0") int page,
                                   @QueryParam("size") @DefaultValue("20") int size) {
        return service.list(page, size);
    }

    @POST
    public Response create(@Valid CreateBookRequest req) {
        BookResponse created = service.create(req);
        return Response.created(URI.create("/v1/books/" + created.id())).entity(created).build();
    }
}
```

| Spring | Quarkus |
|---|---|
| `@RestController` + `@RequestMapping` | `@Path` on a class |
| `@GetMapping` | `@GET` (+ `@Path`) |
| `@PathVariable` | `@PathParam` |
| `@RequestParam` | `@QueryParam` |
| `@RequestHeader` | `@HeaderParam` |
| `ResponseEntity` | `Response` / `RestResponse<T>` |

---

## 5. Data with Panache

Panache removes repository boilerplate. Two styles:

**Repository style** (familiar if you know Spring Data):

```java
@ApplicationScoped
public class BookRepository implements PanacheRepository<Book> {
    public List<Book> search(String q) {
        return find("lower(title) like ?1", "%" + q.toLowerCase() + "%").list();
    }
}
```

**Active record style** (entity has the methods):

```java
@Entity
public class Book extends PanacheEntity {     // gives you a Long id
    public String title;
    public int priceCents;

    public static List<Book> cheap() {
        return list("priceCents < ?1", 50000);
    }
}
```

Transactions:

```java
@Transactional
public BookResponse create(CreateBookRequest req) {
    Book b = new Book(req.title(), req.priceCents(), req.stock());
    repo.persist(b);
    return BookResponse.from(b);
}
```

Panache also has a **reactive** flavor (Hibernate Reactive, `Uni<T>`). Pick one style per service and stay with it.

---

## 6. Errors

```java
@Provider
public class NotFoundMapper implements ExceptionMapper<NotFoundException> {
    @Override
    public Response toResponse(NotFoundException e) {
        return Response.status(404)
            .entity(Map.of("title", "Not found", "status", 404, "detail", e.getMessage()))
            .build();
    }
}
```

Or the newer RESTEasy Reactive style:

```java
@ServerExceptionMapper
public RestResponse<ProblemBody> map(NotFoundException e) {
    return RestResponse.status(Response.Status.NOT_FOUND, new ProblemBody("Not found", 404, e.getMessage()));
}
```

---

## 7. Configuration

```properties
# src/main/resources/application.properties
quarkus.http.port=8080
quarkus.datasource.db-kind=postgresql
quarkus.datasource.jdbc.url=jdbc:postgresql://localhost:5432/booknest
quarkus.datasource.username=booknest
quarkus.datasource.password=${DB_PASSWORD}
quarkus.hibernate-orm.database.generation=none
quarkus.flyway.migrate-at-start=true

payments.base-url=https://api.razorpay.com
payments.timeout=3s

# profile overrides
%dev.quarkus.log.level=DEBUG
%prod.quarkus.datasource.jdbc.max-size=30
```

Typed config:

```java
@ConfigMapping(prefix = "payments")
public interface PaymentConfig {
    URI baseUrl();
    Duration timeout();
}
```

**Dev Services:** in `quarkus:dev` or tests, if no DB URL is set, Quarkus starts a PostgreSQL container for you. Very handy.

---

## 8. Calling other services (REST client)

```java
@RegisterRestClient(configKey = "payments")
@Path("/charges")
public interface PaymentApi {
    @POST
    ChargeResponse charge(@HeaderParam("Idempotency-Key") String key, ChargeRequest req);
}

@ApplicationScoped
class PaymentService {
    @RestClient PaymentApi api;

    @Retry(maxRetries = 2, delay = 200)                   // MicroProfile Fault Tolerance
    @Timeout(3000)
    @CircuitBreaker(requestVolumeThreshold = 10, failureRatio = 0.5)
    @Fallback(fallbackMethod = "paymentUnavailable")
    ChargeResponse charge(String key, ChargeRequest req) {
        return api.charge(key, req);
    }

    ChargeResponse paymentUnavailable(String key, ChargeRequest req) {
        throw new UpstreamUnavailableException("payments down");
    }
}
```

```properties
quarkus.rest-client.payments.url=https://api.razorpay.com
```

Only retry calls that are safe to repeat (idempotent, or with an idempotency key).

---

## 9. Health, metrics, AWS, messaging

- Health: `/q/health/live`, `/q/health/ready`. Write a custom check with `@Readiness`.
- Metrics: `quarkus-micrometer-registry-prometheus` → `/q/metrics`.
- AWS: `quarkus-amazon-s3`, `-sqs`, `-dynamodb`, `-lambda` extensions.
- Kafka: `quarkus-messaging-kafka`, using `@Incoming` / `@Outgoing` (guide 12).
- gRPC: `quarkus-grpc` generates code from `.proto` (guide 14).

---

## 10. Native image — what changes

`-Dnative` compiles the app ahead of time to a native binary.

- Starts in milliseconds, uses far less memory. Great for Lambda and scale-to-zero.
- Build is slow (minutes) and needs lots of RAM.
- **Reflection** must be known at build time. Quarkus handles its own extensions. For your own reflective classes you add `@RegisterForReflection`.
- Peak throughput can be a little lower than a warmed-up JVM.

---

## 11. Testing

```java
@QuarkusTest
class BookResourceTest {
    @Test
    void createsBook() {
        given().contentType("application/json")
            .body("{\"title\":\"Clean Code\",\"priceCents\":3999,\"stock\":5}")
            .when().post("/v1/books")
            .then().statusCode(201)
            .body("title", equalTo("Clean Code"));
    }
}
```

`@QuarkusTest` starts the app once for the test class (with Dev Services DB). `@InjectMock` replaces a bean with a Mockito mock.

---

## Spoken answer (30s)

> Quarkus does most of its wiring at build time instead of at startup, so services start in under a second on the JVM and in milliseconds as native images, with a small memory footprint — that is why it suits many small containerized services and Lambda. The programming model is CDI and Jakarta REST: @ApplicationScoped beans, @Path resources, Panache for data, @ConfigMapping for typed config, MicroProfile REST client and fault tolerance for calls. Spring has the bigger ecosystem, so I'd pick Quarkus when cold start and memory per instance matter.
