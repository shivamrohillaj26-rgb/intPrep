# 16 — Testing the backend

**Goal:** be confident a BookNest change works before it reaches users, with tests that are fast and do not break for silly reasons.

---

## 1. The test pyramid

```text
            ▲  few      E2E / UI tests (whole system)          slow, brittle
           ███          Contract tests (between services)
          █████         Integration tests (real DB, real HTTP)
        █████████  many Unit tests (one class, no I/O)          fast, precise
```

| Type | Tests | Speed | Example |
|---|---|---|---|
| Unit | One class/function, fakes for dependencies | ms | `Order.markPaid()` rejects a cancelled order |
| Slice | One layer with the framework | 100s of ms | Controller returns 400 on bad JSON |
| Integration | Your code + real DB/broker in Docker | seconds | Repository query returns the right rows |
| Contract | Agreement between consumer and provider | seconds | Order service's expectations of the Payment API |
| E2E | Deployed system | minutes | Sign up → buy → email |

Rule: **test behavior, not implementation.** A test should break when the feature breaks, not when you rename a private method.

---

## 2. Unit tests with JUnit 5 + AssertJ

```java
class OrderTest {

    @Test
    void markPaid_movesPendingToPaid() {
        Order order = new Order(user());
        order.markPaid();
        assertThat(order.getStatus()).isEqualTo(OrderStatus.PAID);
    }

    @Test
    void markPaid_rejectsCancelledOrder() {
        Order order = new Order(user());
        order.cancel();
        assertThatThrownBy(order::markPaid)
            .isInstanceOf(IllegalStateException.class)
            .hasMessageContaining("CANCELLED");
    }

    @ParameterizedTest
    @CsvSource({ "1, 1299, 1299", "2, 1299, 2598", "3, 500, 1500" })
    void addItem_updatesTotal(int qty, int price, int expectedTotal) {
        Order order = new Order(user());
        order.addItem(book(price), qty);
        assertThat(order.getTotalCents()).isEqualTo(expectedTotal);
    }
}
```

Pattern: **Arrange, Act, Assert** (Given / When / Then). One behavior per test. Name says what should happen.

---

## 3. Mocks with Mockito

```java
@ExtendWith(MockitoExtension.class)
class OrderServiceTest {

    @Mock OrderRepository orders;
    @Mock PaymentClient payments;
    @Mock OrderEventsPublisher events;
    @InjectMocks OrderService service;

    @Test
    void place_chargesAndPublishes() {
        when(orders.save(any())).thenAnswer(inv -> withId(inv.getArgument(0), 501L));
        when(payments.charge(any())).thenReturn(ChargeResult.success("ch_1"));

        OrderResponse res = service.place(command(userId(7), book(42), qty(2)));

        assertThat(res.id()).isEqualTo(501L);
        verify(payments).charge(argThat(c -> c.amountCents() == 2598));
        verify(events).publish(any(OrderPlaced.class));
    }

    @Test
    void place_paymentFails_doesNotPublish() {
        when(orders.save(any())).thenAnswer(inv -> inv.getArgument(0));
        when(payments.charge(any())).thenThrow(new PaymentDeclinedException());

        assertThatThrownBy(() -> service.place(command(...))).isInstanceOf(PaymentDeclinedException.class);
        verifyNoInteractions(events);
    }
}
```

Mocking guidelines:

- Mock things **you own at the boundary** (your `PaymentClient` interface), not third-party internals.
- Do not mock value objects or the class under test.
- Too many mocks / too many `verify` = the test mirrors the implementation. Prefer checking outputs and state.
- Prefer a **fake** (simple in-memory implementation) for repositories in domain tests when it is easier than mocks.
- **Constructor injection** makes all of this easy (guide 05). Static calls and `new` inside methods make it hard — that is why old code needed **PowerMock**; modern code avoids needing it (Mockito can mock statics with `mockStatic` if you must).

Time: inject a `Clock` instead of calling `Instant.now()` so tests control time.

```java
Clock fixed = Clock.fixed(Instant.parse("2026-11-06T10:00:00Z"), ZoneOffset.UTC);
```

---

## 4. Spring slice tests

### Web layer only (`@WebMvcTest`)

```java
@WebMvcTest(BookController.class)
class BookControllerTest {
    @Autowired MockMvc mvc;
    @MockitoBean BookService books;              // older Spring Boot: @MockBean

    @Test
    void create_invalidBody_returns400() throws Exception {
        mvc.perform(post("/v1/books")
                .contentType(MediaType.APPLICATION_JSON)
                .content("{\"title\":\"\",\"priceCents\":-5}"))
           .andExpect(status().isBadRequest())
           .andExpect(jsonPath("$.errors[*].field").value(containsInAnyOrder("title", "priceCents")));
    }

    @Test
    void get_missing_returns404() throws Exception {
        when(books.get(99L)).thenThrow(new NotFoundException("book", 99L));
        mvc.perform(get("/v1/books/99")).andExpect(status().isNotFound());
    }
}
```

### JPA layer only (`@DataJpaTest`)

Loads repositories + Hibernate with a test DB. Combine with Testcontainers (below) instead of H2.

### Full app (`@SpringBootTest`)

Starts everything. Use sparingly, share the context between tests (Spring caches it if configuration is identical).

Quarkus: `@QuarkusTest` + RestAssured, `@InjectMock` for CDI beans, `@QuarkusIntegrationTest` against the built artifact, and **Dev Services** automatically start Postgres/Kafka containers in tests.

---

## 5. Integration tests with Testcontainers (real Postgres)

Why not H2? H2 is not Postgres: different SQL, no `JSONB`, no `SKIP LOCKED`, different locking. Tests pass, production breaks.

```java
@SpringBootTest
@Testcontainers
class OrderRepositoryIT {

    @Container
    @ServiceConnection                        // Spring Boot 3.1+: wires the datasource automatically
    static PostgreSQLContainer<?> pg = new PostgreSQLContainer<>("postgres:16-alpine");

    @Autowired OrderRepository orders;
    @Autowired JdbcTemplate jdbc;

    @BeforeEach
    void clean() { jdbc.execute("TRUNCATE orders, order_items RESTART IDENTITY CASCADE"); }

    @Test
    void findWithItems_loadsItemsInOneQuery() {
        // arrange data, call the repo, assert
    }
}
```

- Flyway runs the real migrations against it, so migrations are tested too.
- Same idea for Kafka (`KafkaContainer`), Redis, OpenSearch, LocalStack (AWS S3/SQS/Kinesis fakes).
- Reuse one container per test class or per JVM to keep it fast.

---

## 6. Faking external HTTP APIs with WireMock

```java
@WireMockTest(httpPort = 8089)
class PaymentClientIT {

    static final String CHARGE_OK = "{\"id\":\"ch_1\",\"status\":\"succeeded\"}";

    PaymentClient client = new PaymentClient(RestClient.create("http://localhost:8089"));

    @Test
    void charge_success() {
        stubFor(post("/v1/charges")
            .withHeader("Idempotency-Key", matching(".+"))
            .willReturn(okJson(CHARGE_OK)));

        assertThat(client.charge(req(2598)).status()).isEqualTo("succeeded");
    }

    @Test
    void charge_timeout_isRaisedAsUnavailable() {
        stubFor(post("/v1/charges").willReturn(ok().withFixedDelay(5_000)));
        assertThatThrownBy(() -> client.charge(req(2598))).isInstanceOf(PaymentUnavailableException.class);
    }

    @Test
    void charge_503_thenSuccess_retries() {
        stubFor(post("/v1/charges").inScenario("retry").whenScenarioStateIs(STARTED)
            .willReturn(serviceUnavailable()).willSetStateTo("second"));
        stubFor(post("/v1/charges").inScenario("retry").whenScenarioStateIs("second")
            .willReturn(okJson(CHARGE_OK)));

        assertThat(client.charge(req(2598)).id()).isEqualTo("ch_1");
        verify(2, postRequestedFor(urlEqualTo("/v1/charges")));
    }
}
```

WireMock tests the things mocks cannot: real HTTP, JSON mapping, headers, timeouts, retries.

---

## 7. Contract tests (between services)

Problem: Order service mocks Payment's API. Payment team renames a field. Both test suites pass. Production breaks.

**Consumer-driven contracts (Pact):**

```text
1. Order service (consumer) test says: "I call POST /v1/charges with {amountCents} and need {id, status}"
2. That generates a contract file (pact) → published to a Pact Broker
3. Payment service (provider) CI replays the contract against its real API
4. If Payment breaks the contract, Payment's build fails — before deploy
```

Spring Cloud Contract is the provider-driven alternative. For gRPC/Protobuf, `buf breaking` covers schema compatibility.

---

## 8. Architecture tests with ArchUnit

Keep layers and module boundaries from rotting:

```java
@AnalyzeClasses(packages = "com.booknest")
class ArchitectureTest {

    @ArchTest
    static final ArchRule layers = layeredArchitecture().consideringAllDependencies()
        .layer("Web").definedBy("..web..")
        .layer("Service").definedBy("..service..")
        .layer("Persistence").definedBy("..persistence..")
        .whereLayer("Web").mayNotBeAccessedByAnyLayer()
        .whereLayer("Service").mayOnlyBeAccessedByLayers("Web")
        .whereLayer("Persistence").mayOnlyBeAccessedByLayers("Service");

    @ArchTest
    static final ArchRule domainIsPure = noClasses().that().resideInAPackage("..domain..")
        .should().dependOnClassesThat().resideInAnyPackage("org.springframework..", "jakarta.persistence..");

    @ArchTest
    static final ArchRule noFieldInjection = noFields().should().beAnnotatedWith(Autowired.class);
}
```

---

## 9. Testing async and messaging code

- Unit-test the handler method directly (`listener.on(event)`).
- Integration: Testcontainers Kafka, publish, then wait with **Awaitility** (never `Thread.sleep`):

```java
await().atMost(Duration.ofSeconds(10))
       .untilAsserted(() -> assertThat(emailsSentTo("a@b.com")).hasSize(1));
```

- Always test **duplicates**: deliver the same event twice, assert one effect.
- Test the poison-message path: a bad payload ends up in the DLQ.

---

## 10. Other test kinds worth knowing

| Kind | What | Tool |
|---|---|---|
| Load / performance | Throughput, p95/p99 under load | k6, Gatling, JMeter |
| Mutation testing | Changes your code; do tests notice? | PIT |
| Property-based | Random inputs check invariants | jqwik |
| Security scanning | Dependencies, code, containers | Dependabot/Snyk, SonarQube, Trivy |
| Chaos | Kill pods, add latency in staging | Chaos Mesh, AWS FIS |
| Smoke tests | A few critical calls right after deploy | Simple scripted checks |

**Coverage** is a hint, not a goal. 80% coverage of getters is worth less than 50% that covers money, auth and state transitions.

---

## 11. Making tests reliable

- **Flaky tests** come from: time (`now()`), randomness, shared DB state, ordering between tests, real network, sleeps. Fix the cause; do not add retries.
- Each test sets up its own data. Truncate or use unique IDs.
- Test data builders (`aBook().withPrice(500).build()`) instead of 30-line setups.
- Run unit tests on every save/commit, integration tests in CI on every PR.

---

## Common mistakes

| Mistake | Fix |
|---|---|
| H2 instead of the real DB | Testcontainers |
| Mocking everything | Mock boundaries, check outputs |
| `Thread.sleep` in async tests | Awaitility |
| Testing private methods | Test through the public behavior |
| No tests for error paths | Timeouts, 4xx, 5xx, duplicates, DLQ |
| Chasing coverage % | Cover risky logic first |
| Mocked consumer + mocked provider, never checked together | Contract tests |

---

## Spoken answer (40s)

> I follow the test pyramid: many fast unit tests for domain logic with JUnit and AssertJ, Mockito only at boundaries I own, and an injected Clock for time. Then slice tests like WebMvcTest for validation and error mapping, and integration tests against real Postgres, Kafka or Redis with Testcontainers instead of H2, which also runs the real migrations. External HTTP is faked with WireMock so I can test timeouts and retries. Between services I use consumer-driven contracts with Pact, ArchUnit keeps layering rules enforced, async tests use Awaitility and always include duplicate messages, and I fix flaky tests at the cause rather than retrying them.
