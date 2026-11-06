# 08 — JPA and Hibernate (talking to the database from Java)

**Goal:** map BookNest's tables to Java objects without the classic performance and correctness traps.

---

## 1. What these words mean

- **JDBC:** the low-level Java API. You write SQL strings and read rows by hand.
- **JPA (Jakarta Persistence):** a standard API to map classes to tables (an ORM spec).
- **Hibernate:** the most common JPA implementation. Spring Data JPA and Quarkus Panache sit on top of it.
- **ORM:** Object-Relational Mapping. You work with objects, it writes the SQL.

ORMs save time on CRUD. They also hide SQL, which is where the bugs come from. You must still know what SQL runs.

---

## 2. Entity mapping

```java
@Entity
@Table(name = "orders")
public class Order {

    @Id
    @GeneratedValue(strategy = GenerationType.IDENTITY)
    private Long id;

    @ManyToOne(fetch = FetchType.LAZY, optional = false)
    @JoinColumn(name = "user_id")
    private User user;

    @Enumerated(EnumType.STRING)                 // store "PAID", never the number 1
    @Column(nullable = false)
    private OrderStatus status;

    @Column(name = "total_cents", nullable = false)
    private int totalCents;

    @OneToMany(mappedBy = "order", cascade = CascadeType.ALL, orphanRemoval = true)
    private List<OrderItem> items = new ArrayList<>();

    @Column(name = "created_at", nullable = false, updatable = false)
    private Instant createdAt = Instant.now();

    @Version
    private long version;

    protected Order() {}

    public Order(User user) {
        this.user = user;
        this.status = OrderStatus.PENDING_PAYMENT;
    }

    public void addItem(Book book, int quantity) {
        OrderItem item = new OrderItem(this, book, quantity, book.getPriceCents());
        items.add(item);
        totalCents += item.getPriceCents() * quantity;
    }

    public void markPaid() {
        if (status != OrderStatus.PENDING_PAYMENT) {
            throw new IllegalStateException("cannot pay a " + status + " order");
        }
        status = OrderStatus.PAID;
    }
}

@Entity
@Table(name = "order_items")
public class OrderItem {
    @Id @GeneratedValue(strategy = GenerationType.IDENTITY)
    private Long id;

    @ManyToOne(fetch = FetchType.LAZY, optional = false)
    @JoinColumn(name = "order_id")
    private Order order;

    @ManyToOne(fetch = FetchType.LAZY, optional = false)
    @JoinColumn(name = "book_id")
    private Book book;

    private int quantity;

    @Column(name = "price_cents")
    private int priceCents;

    protected OrderItem() {}
    OrderItem(Order order, Book book, int quantity, int priceCents) { ... }
}
```

Rules shown here:

- `@Enumerated(EnumType.STRING)` — storing ordinals breaks when someone reorders the enum.
- `mappedBy` marks the side that does **not** own the FK. The owning side is the one with `@JoinColumn`.
- Business rules (`markPaid`) live on the entity or service, not in setters for every field.

### ID strategies

| Strategy | Notes |
|---|---|
| `IDENTITY` | DB auto-increment. Simple. Disables JDBC batch inserts in Hibernate |
| `SEQUENCE` | DB sequence. Allows batching. Good default on Postgres |
| `UUID` | Generate in the app. Good for distributed systems and public IDs |

---

## 3. Relationship annotations

| Annotation | Example | Default fetch |
|---|---|---|
| `@ManyToOne` | item → order | **EAGER** (change it to LAZY!) |
| `@OneToMany` | order → items | LAZY |
| `@OneToOne` | user → profile | EAGER (change it) |
| `@ManyToMany` | book ↔ category | LAZY (often better as an explicit join entity) |

**Make every relationship LAZY**, then fetch what each query needs on purpose.

---

## 4. The persistence context (why entities "save themselves")

Inside a transaction, Hibernate keeps a **persistence context** (first-level cache): every entity it loaded, plus a snapshot.

```java
@Transactional
public void rename(long id, String newTitle) {
    Book book = repo.findById(id).orElseThrow();
    book.setTitle(newTitle);
    // no save() call needed
}   // at commit Hibernate compares to the snapshot ("dirty checking") and runs UPDATE
```

Entity states:

```text
new Book()                → transient  (Hibernate doesn't know it)
repo.save(book) / persist → managed    (tracked; changes flushed at commit)
transaction ends          → detached   (changes no longer tracked)
repo.delete(book)         → removed
```

**Flush** = Hibernate sends pending SQL. It happens at commit, before a query that needs the data, or when you call `flush()`.

Consequence: changing a managed entity by accident (in a "read" method) still writes to the DB. Mark reads `@Transactional(readOnly = true)`.

---

## 5. N+1 — how it appears and four fixes

```java
List<Order> orders = orderRepo.findByUserId(7L);          // 1 query
for (Order o : orders) {
    o.getItems().size();                                    // +1 query per order
}
```

Turn on SQL logging in dev and you see 51 queries.

**Fix 1 — fetch join**

```java
@Query("select distinct o from Order o join fetch o.items where o.user.id = :userId")
List<Order> findWithItems(long userId);
```

**Fix 2 — entity graph**

```java
@EntityGraph(attributePaths = {"items", "items.book"})
List<Order> findByUserId(long userId);
```

**Fix 3 — batch fetching** (loads lazy collections for many parents with `IN (...)`)

```yaml
spring.jpa.properties.hibernate.default_batch_fetch_size: 50
```

**Fix 4 — DTO projection** (read only what the screen needs, no entities)

```java
public record OrderSummary(long id, String status, int totalCents, long itemCount) {}

@Query("""
    select new com.booknest.order.OrderSummary(o.id, cast(o.status as string), o.totalCents, count(i))
    from Order o left join o.items i
    where o.user.id = :userId
    group by o.id, o.status, o.totalCents
    """)
List<OrderSummary> summaries(long userId);
```

Warning: `join fetch` on a collection **plus** pagination makes Hibernate page in memory (it logs `HHH90003004`). For paged lists, page the IDs first, then fetch details for those IDs, or use a DTO query.

---

## 6. `LazyInitializationException` and open-in-view

```text
Controller gets an Order (transaction already closed)
→ Jackson serializes order.items
→ Hibernate tries to load lazily, no session → LazyInitializationException
```

Spring Boot "fixes" this by default with **open-in-view** (keeps the session open during the whole web request). That hides N+1 queries in JSON serialization and holds a DB connection during rendering.

Do this instead:

```yaml
spring.jpa.open-in-view: false
```

…and build DTOs **inside** the service transaction, fetching exactly what you need.

---

## 7. Optimistic locking with `@Version`

```java
@Version
private long version;
```

Hibernate adds `WHERE version = ?` to every update and increments it. If another transaction already changed the row, it throws `OptimisticLockException` → map to **409 Conflict**.

For APIs, send the version to the client (or an `ETag`) and check it on update so a stale edit is rejected.

## 8. Pessimistic locking

```java
@Lock(LockModeType.PESSIMISTIC_WRITE)                   // SELECT ... FOR UPDATE
@Query("select b from Book b where b.id = :id")
Optional<Book> findForUpdate(long id);
```

Use inside a short `@Transactional` method.

---

## 9. Writing many rows fast

```yaml
spring.jpa.properties.hibernate.jdbc.batch_size: 50
spring.jpa.properties.hibernate.order_inserts: true
spring.jpa.properties.hibernate.order_updates: true
```

- Use `SEQUENCE` IDs (IDENTITY disables insert batching).
- For huge imports, use plain JDBC batch or Postgres `COPY`, not entity-by-entity saves.
- Clear the persistence context every N rows (`entityManager.flush(); entityManager.clear();`) so memory does not grow.

Bulk update without loading entities:

```java
@Modifying
@Query("update Order o set o.status = 'CANCELLED' where o.status = 'PENDING_PAYMENT' and o.createdAt < :cutoff")
int cancelStale(Instant cutoff);
```

Bulk updates skip the persistence context. Entities already loaded in that transaction are now stale.

---

## 10. When to skip the ORM

Use plain SQL (`JdbcTemplate`, `JdbcClient`, jOOQ) for reports, complex joins, window functions, and bulk work.

```java
List<BestSeller> top = jdbcClient.sql("""
        SELECT b.id, b.title, sum(oi.quantity) AS sold
        FROM order_items oi JOIN books b ON b.id = oi.book_id
        GROUP BY b.id, b.title ORDER BY sold DESC LIMIT :n
        """)
    .param("n", 10)
    .query(BestSeller.class)
    .list();
```

Mixing JPA for CRUD and SQL for reads is normal and healthy.

---

## 11. MapStruct (entity ↔ DTO without hand-written copying)

```java
@Mapper(componentModel = "spring")          // "cdi" for Quarkus
public interface BookMapper {
    BookResponse toResponse(Book book);
    List<BookResponse> toResponses(List<Book> books);
}
```

It generates the copy code at compile time, so it is fast and type-checked.

---

## 12. `equals` / `hashCode` for entities

Do not use Lombok `@Data` on entities. It generates `equals` over every field, including lazy collections (loads them, may loop forever). Base equality on the ID with care, or leave the defaults.

---

## Common mistakes

| Mistake | Fix |
|---|---|
| EAGER `@ManyToOne` everywhere | LAZY + fetch per query |
| open-in-view left on | Turn it off, build DTOs in the service |
| `findAll()` on a big table | Paginate or stream |
| N+1 in loops | Fetch join, entity graph, batch size, DTO query |
| `EnumType.ORDINAL` | `EnumType.STRING` |
| Saving 100k entities one by one | Batching, JDBC batch, `COPY` |
| Returning entities as JSON | DTOs (records / MapStruct) |

---

## Spoken answer (40s)

> JPA maps classes to tables and Hibernate implements it. Inside a transaction Hibernate tracks managed entities and dirty-checks them at commit, so I mark reads readOnly. I make every association lazy and fetch per use case with fetch joins, entity graphs, batch fetching or DTO projections, which is how I prevent N+1. I turn off open-in-view and build DTOs inside the service transaction. For concurrency I use @Version for optimistic locking mapped to 409, and PESSIMISTIC_WRITE when I need a row lock. For reports and bulk work I drop to plain SQL.
