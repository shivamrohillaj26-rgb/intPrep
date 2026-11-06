# 07 — Databases and SQL (PostgreSQL)

**Goal:** design BookNest's tables, write the queries, make them fast, and keep data correct when many users act at once.

This is the most important backend guide. Most production problems are database problems.

---

## 1. Relational database in one picture

```text
users                       orders                         order_items
┌────┬────────────┐        ┌────┬─────────┬──────────┐    ┌────┬──────────┬─────────┬─────┐
│ id │ email      │        │ id │ user_id │ status   │    │ id │ order_id │ book_id │ qty │
├────┼────────────┤        ├────┼─────────┼──────────┤    ├────┼──────────┼─────────┼─────┤
│ 7  │ a@b.com    │◄───────│981 │ 7       │ PAID     │◄───│ 1  │ 981      │ 42      │ 1   │
└────┴────────────┘        └────┴─────────┴──────────┘    └────┴──────────┴─────────┴─────┘
                                                                              │
                                                     books  ┌────┬────────────┬───────┐
                                                            │ 42 │ Clean Code │ 3999  │◄┘
                                                            └────┴────────────┴───────┘
```

- **Table** = one kind of thing. **Row** = one thing. **Column** = one fact.
- **Primary key (PK):** unique ID of a row.
- **Foreign key (FK):** a column pointing to another table's PK. The DB refuses an order for a user that does not exist.

---

## 2. Create the schema

```sql
CREATE TABLE users (
    id            BIGSERIAL PRIMARY KEY,
    email         TEXT        NOT NULL UNIQUE,
    password_hash TEXT        NOT NULL,
    created_at    TIMESTAMPTZ NOT NULL DEFAULT now()
);

CREATE TABLE books (
    id          BIGSERIAL PRIMARY KEY,
    title       TEXT    NOT NULL,
    author      TEXT    NOT NULL,
    price_cents INTEGER NOT NULL CHECK (price_cents >= 0),
    stock       INTEGER NOT NULL DEFAULT 0 CHECK (stock >= 0),
    version     BIGINT  NOT NULL DEFAULT 0
);

CREATE TABLE orders (
    id          BIGSERIAL PRIMARY KEY,
    user_id     BIGINT      NOT NULL REFERENCES users(id),
    status      TEXT        NOT NULL CHECK (status IN ('PENDING_PAYMENT','PAID','SHIPPED','CANCELLED')),
    total_cents INTEGER     NOT NULL,
    created_at  TIMESTAMPTZ NOT NULL DEFAULT now()
);

CREATE TABLE order_items (
    id          BIGSERIAL PRIMARY KEY,
    order_id    BIGINT  NOT NULL REFERENCES orders(id) ON DELETE CASCADE,
    book_id     BIGINT  NOT NULL REFERENCES books(id),
    quantity    INTEGER NOT NULL CHECK (quantity > 0),
    price_cents INTEGER NOT NULL          -- price AT TIME OF ORDER, copied on purpose
);
```

Notes:

- `CHECK (stock >= 0)` means even buggy code cannot sell below zero. **Constraints are your last line of defense.**
- `TIMESTAMPTZ` stores a moment in UTC. Use it, not `TIMESTAMP`.
- `order_items.price_cents` is copied. If the book price changes tomorrow, old orders must not change.

### Data types worth knowing (Postgres)

| Type | Use |
|---|---|
| `BIGINT` / `BIGSERIAL` | IDs (use 64-bit, 32-bit runs out) |
| `UUID` | Public IDs, IDs generated in many places |
| `TEXT` / `VARCHAR(n)` | Strings (`TEXT` is fine in Postgres) |
| `INTEGER` / `BIGINT` | Money in cents, counts |
| `NUMERIC(12,2)` | Exact decimals |
| `BOOLEAN` | Flags |
| `TIMESTAMPTZ`, `DATE` | Time |
| `JSONB` | Flexible extra data you still query sometimes |

---

## 3. Relationships

| Kind | Example | How |
|---|---|---|
| One-to-many | user → orders | FK on the "many" side (`orders.user_id`) |
| Many-to-many | books ↔ categories | Join table `book_categories(book_id, category_id)` |
| One-to-one | user → profile | FK + `UNIQUE` |

---

## 4. Normalization (avoid duplicated facts)

Store each fact once. If `orders` stored `user_email`, changing an email means updating thousands of rows — and missing some.

- **1NF:** no lists in a cell (`tags = "a,b,c"` → use a separate table).
- **2NF / 3NF:** every column depends on the key, the whole key, and nothing but the key.

**Denormalize on purpose** when reads are hot and you accept the cost (the copied `price_cents` above, a cached `order_count` on users). Write down why.

---

## 5. Queries you must write without thinking

```sql
-- filter + sort + page
SELECT id, title, price_cents
FROM books
WHERE author = 'Robert Martin' AND price_cents < 50000
ORDER BY price_cents DESC
LIMIT 20 OFFSET 0;

-- INNER JOIN: orders with the user's email
SELECT o.id, o.status, u.email
FROM orders o
JOIN users u ON u.id = o.user_id
WHERE o.created_at >= now() - interval '7 days';

-- LEFT JOIN: users with zero orders too
SELECT u.id, u.email, count(o.id) AS orders
FROM users u
LEFT JOIN orders o ON o.user_id = u.id
GROUP BY u.id, u.email;

-- GROUP BY + HAVING: best sellers
SELECT b.id, b.title, sum(oi.quantity) AS sold
FROM order_items oi
JOIN books b ON b.id = oi.book_id
JOIN orders o ON o.id = oi.order_id AND o.status = 'PAID'
GROUP BY b.id, b.title
HAVING sum(oi.quantity) > 10
ORDER BY sold DESC
LIMIT 10;

-- subquery: users who never ordered
SELECT * FROM users u
WHERE NOT EXISTS (SELECT 1 FROM orders o WHERE o.user_id = u.id);

-- upsert
INSERT INTO cart_items (user_id, book_id, quantity) VALUES (7, 42, 1)
ON CONFLICT (user_id, book_id) DO UPDATE SET quantity = cart_items.quantity + 1;

-- window function: latest order per user
SELECT * FROM (
    SELECT o.*, row_number() OVER (PARTITION BY user_id ORDER BY created_at DESC) AS rn
    FROM orders o
) t WHERE rn = 1;

-- CTE (named subquery, readable)
WITH paid AS (
    SELECT user_id, sum(total_cents) AS spent FROM orders WHERE status = 'PAID' GROUP BY user_id
)
SELECT u.email, p.spent FROM paid p JOIN users u ON u.id = p.user_id ORDER BY p.spent DESC;
```

Join types in one line each:

- `INNER JOIN` — only rows that match on both sides.
- `LEFT JOIN` — all left rows, NULLs where the right side is missing.
- `RIGHT JOIN` — mirror of left (rarely used).
- `FULL JOIN` — everything from both sides.

Order SQL actually runs in: `FROM/JOIN → WHERE → GROUP BY → HAVING → SELECT → ORDER BY → LIMIT`. That is why you cannot use a `SELECT` alias in `WHERE`.

---

## 6. Indexes — why queries are fast or slow

Without an index, `WHERE email = 'a@b.com'` reads **every row** (a sequential scan). An index is like a book's index: a sorted structure (B-tree) pointing to rows.

```sql
CREATE INDEX idx_orders_user_created ON orders (user_id, created_at DESC);
CREATE UNIQUE INDEX idx_users_email ON users (lower(email));       -- expression index
CREATE INDEX idx_orders_pending ON orders (created_at) WHERE status = 'PENDING_PAYMENT';  -- partial
CREATE INDEX CONCURRENTLY idx_books_author ON books (author);      -- no table lock in production
```

**Composite index order matters (leftmost prefix rule).** `(user_id, created_at)` helps:

- `WHERE user_id = 7` ✅
- `WHERE user_id = 7 AND created_at > ...` ✅
- `WHERE user_id = 7 ORDER BY created_at DESC` ✅
- `WHERE created_at > ...` alone ❌

Put the equality column first, then the range / sort column.

**Indexes are not free:** every insert and update must also update every index, and they use disk. Index what you query, not everything.

Things that stop an index from being used:

- a function on the column: `WHERE lower(email) = ...` (unless you index `lower(email)`),
- `LIKE '%code%'` (leading wildcard — use full-text search, guide 15),
- implicit type casts, or querying a low-selectivity column (half the rows match, so a scan is cheaper).

Index types: **B-tree** (default, equality and range), **GIN** (JSONB, arrays, full text), **BRIN** (huge append-only tables ordered by time), **Hash** (equality only).

---

## 7. Reading `EXPLAIN ANALYZE`

```sql
EXPLAIN ANALYZE
SELECT * FROM orders WHERE user_id = 7 ORDER BY created_at DESC LIMIT 20;
```

```text
Limit  (actual time=0.031..0.045 rows=20)
  ->  Index Scan using idx_orders_user_created on orders  (actual rows=20)
        Index Cond: (user_id = 7)
Planning Time: 0.1 ms
Execution Time: 0.06 ms
```

What to look for:

- `Seq Scan` on a big table in a hot query → probably a missing index.
- `rows=` estimated vs actual very different → stale statistics, run `ANALYZE`.
- `Sort` with `external merge Disk` → sort did not fit in memory.
- `Nested Loop` over many rows → maybe the join needs an index on the join column.

Turn on the slow query log (`log_min_duration_statement = 500ms`) or use `pg_stat_statements` to find the worst queries.

---

## 8. Transactions and ACID

A **transaction** groups statements: all succeed, or none do.

```sql
BEGIN;
UPDATE books  SET stock = stock - 1 WHERE id = 42 AND stock > 0;
INSERT INTO orders (user_id, status, total_cents) VALUES (7, 'PENDING_PAYMENT', 3999);
COMMIT;     -- or ROLLBACK; if anything failed
```

| Letter | Meaning (simple) |
|---|---|
| **A**tomic | All or nothing |
| **C**onsistent | Constraints always hold after commit |
| **I**solated | Concurrent transactions do not see each other's half-done work (to a level) |
| **D**urable | After commit it survives a crash (written to the WAL log on disk) |

---

## 9. Isolation levels and the anomalies they prevent

| Anomaly | What happens |
|---|---|
| **Dirty read** | You read another transaction's uncommitted change |
| **Non-repeatable read** | You read a row twice and get different values |
| **Phantom read** | You run the same `WHERE` twice and get new rows |
| **Lost update** | Two transactions read, both write, one write disappears |
| **Write skew** | Two transactions each check a rule, each update different rows, rule breaks |

| Level | Prevents | Postgres default? |
|---|---|---|
| Read uncommitted | (Postgres treats it as read committed) | |
| **Read committed** | dirty reads | ✅ default |
| Repeatable read | + non-repeatable, phantoms (in PG) | |
| Serializable | everything; may abort with "could not serialize" → you retry | |

Read committed is the default and fine for most work. It does **not** stop lost updates by itself. You stop those with the techniques below.

---

## 10. Concurrency control — the four tools

**a) Atomic conditional update (first choice, simplest)**

```sql
UPDATE books SET stock = stock - 1 WHERE id = 42 AND stock > 0;   -- check rows affected
```

**b) Pessimistic lock — `SELECT ... FOR UPDATE`**

```sql
BEGIN;
SELECT stock FROM books WHERE id = 42 FOR UPDATE;   -- other writers wait here
-- application decides
UPDATE books SET stock = stock - 1 WHERE id = 42;
COMMIT;
```

Use when you must read, decide in code, then write. Keep the transaction short. `FOR UPDATE SKIP LOCKED` is perfect for job queues: many workers each grab a different row.

**c) Optimistic lock — version column**

```sql
UPDATE books SET price_cents = 3499, version = version + 1
WHERE id = 42 AND version = 5;
-- 0 rows → someone else changed it → tell the user "reload" (HTTP 409)
```

No waiting. Best when conflicts are rare (admin edits). JPA does this with `@Version` (guide 08).

**d) Constraints**

`UNIQUE (email)` stops two sign-ups with the same email even if both pass the "is it taken?" check at the same moment. Catch the error and return 409.

### Deadlocks

Two transactions lock rows in opposite order and wait forever. Postgres detects it and kills one (`deadlock detected`). Prevent by locking rows in a consistent order (for example, sort book IDs before updating stock) and keeping transactions short. Retry the victim.

---

## 11. Connection pools

Opening a DB connection costs a TCP handshake, TLS and authentication. Apps keep a **pool** (HikariCP in Spring and Quarkus).

```text
App instance (pool size 10) × 6 instances = 60 connections
Postgres max_connections = 100 → OK
Scale to 15 instances → 150 → "too many connections" outage
```

- Bigger pools are often **slower** (the DB thrashes). Start around 10 per instance and measure.
- For many instances or Lambda, put **PgBouncer** or **RDS Proxy** in front.
- Never hold a connection while calling another HTTP service.

---

## 12. The N+1 query problem

```text
1 query:  SELECT * FROM orders WHERE user_id = 7        → 50 orders
50 queries: SELECT * FROM order_items WHERE order_id = ?  (one per order)
```

51 queries instead of 2. Fix with a join, `WHERE order_id IN (...)`, or the ORM's fetch join (guide 08). Spot it in logs: the same query repeated with different IDs.

---

## 13. Scaling a database

| Step | What | Trade-off |
|---|---|---|
| 1 | Indexes, better queries | Free-ish, do this first |
| 2 | Bigger machine (vertical) | Easy, has a ceiling |
| 3 | Cache hot reads (guide 11) | Stale data risk |
| 4 | **Read replicas** | Reads scale; replicas lag behind (read-your-own-write issues) |
| 5 | **Partitioning** (one table split by month) | Old data is cheap to drop, queries must include the key |
| 6 | **Sharding** (data split across many DBs by `user_id`) | Cross-shard joins and transactions become hard |

Replica lag example: a user places an order and the next page reads from a replica that has not caught up — "my order disappeared." Fix: read your own writes from the primary for a few seconds, or read from the primary for that user's critical pages.

---

## 14. SQL vs NoSQL (choose on purpose)

| Store | Good for | Example |
|---|---|---|
| **PostgreSQL / MySQL** | Relations, transactions, ad-hoc queries | Orders, payments, users |
| **DynamoDB / Cassandra** | Huge scale, known access patterns, key lookups | Sessions, device events, carts |
| **MongoDB** | Document-shaped data with flexible fields | Product catalogs, CMS content |
| **Redis** | In-memory cache, counters, queues, locks | Cache, rate limits (guide 11) |
| **OpenSearch** | Full-text search, log analytics | Book search (guide 15) |
| **Time-series (Timescale, InfluxDB)** | Metrics over time | Sensor readings |

Default to Postgres. Move a part of the data elsewhere only when you can name the access pattern that Postgres handles badly.

DynamoDB in one paragraph: you design tables around **queries** you will run. Each item has a partition key (decides which machine) and optional sort key. Queries must give the partition key. No joins. Very fast at any scale if the key design is right; painful to change later.

---

## Common mistakes

| Mistake | Fix |
|---|---|
| No index on foreign keys you filter by | Index `orders.user_id` |
| `SELECT *` everywhere | Select the columns you need |
| Money as `FLOAT` | Integer cents / `NUMERIC` |
| Check-then-insert for uniqueness | `UNIQUE` constraint + handle the error |
| Read-modify-write without locking | Atomic update, `FOR UPDATE` or version |
| Long transactions holding locks | Short transactions, no HTTP inside |
| `OFFSET 100000` | Keyset pagination |
| `CREATE INDEX` on a big live table | `CREATE INDEX CONCURRENTLY` |

---

## Spoken answer (50s)

> I model data relationally with primary and foreign keys and push invariants into constraints — NOT NULL, CHECK stock >= 0, UNIQUE email — because constraints hold even when code is wrong. For speed I index what I filter and sort by, with composite indexes ordered equality-first, and I confirm with EXPLAIN ANALYZE and pg_stat_statements. For correctness under concurrency I prefer an atomic conditional UPDATE, use SELECT FOR UPDATE when I must read-decide-write, and optimistic version columns when conflicts are rare; Postgres runs read committed by default, which doesn't prevent lost updates on its own. I keep transactions short, size the connection pool deliberately, watch for N+1 queries, and scale with caching and read replicas before sharding.
