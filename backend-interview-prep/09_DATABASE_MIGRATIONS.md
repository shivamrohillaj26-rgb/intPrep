# 09 — Database migrations (changing a live database safely)

**Goal:** add, rename and remove columns in BookNest while the app keeps serving users.

---

## 1. What a migration is

A migration is a numbered SQL file that moves the schema from version N to N+1. A tool records which ones ran, in a table in the database.

```text
src/main/resources/db/migration/
  V1__create_users_and_books.sql
  V2__create_orders.sql
  V3__add_book_isbn.sql
```

On startup (or in a deploy step), the tool runs the ones that have not run yet, in order.

Why not let Hibernate create tables (`ddl-auto: update`)? It cannot rename, cannot backfill data, cannot be reviewed, and does different things on different machines.

---

## 2. Flyway

```sql
-- V3__add_book_isbn.sql
ALTER TABLE books ADD COLUMN isbn TEXT;
CREATE UNIQUE INDEX CONCURRENTLY idx_books_isbn ON books (isbn);
```

(`CREATE INDEX CONCURRENTLY` cannot run inside a transaction. In Flyway, put it in its own migration and mark that migration non-transactional for Postgres, for example with a `.conf` file or script config, depending on your Flyway version.)

Flyway keeps a table `flyway_schema_history`:

| version | description | checksum | success |
|---|---|---|---|
| 1 | create users and books | 1823… | true |
| 2 | create orders | -9921… | true |

Rules:

- **Never edit a migration that already ran** anywhere shared. The checksum changes and Flyway refuses to start. Write a new migration.
- Naming: `V<version>__<description>.sql` (two underscores).
- `R__name.sql` = repeatable migration (views, functions), re-runs when changed.
- Configure: `spring.flyway.enabled=true` or `quarkus.flyway.migrate-at-start=true`.

**Liquibase** does the same job with XML / YAML / SQL changelogs and has built-in rollback definitions. Pick one per service.

---

## 3. The core problem: old code and new code run at the same time

During a rolling deploy:

```text
time →
server A: v1 code ─────────────── v2 code
server B: v1 code ──────── v2 code
database:        migration runs here
```

For a few minutes, **v1 code talks to the new schema**. If the migration removed a column v1 still reads, v1 crashes. So every migration must be **backward compatible** with the code version before it.

---

## 4. Expand and contract (the pattern that solves it)

**Example: rename `books.title` to `books.name`.**

A single `ALTER TABLE books RENAME COLUMN title TO name;` breaks old servers immediately. Instead:

```text
Release 1  EXPAND
   V10: ALTER TABLE books ADD COLUMN name TEXT;
   code writes BOTH title and name, reads title

Release 2  BACKFILL
   V11: UPDATE books SET name = title WHERE name IS NULL;   (in batches for big tables)
   code still writes both, now reads name

Release 3  ENFORCE
   V12: ALTER TABLE books ALTER COLUMN name SET NOT NULL;
   code writes only name

Release 4  CONTRACT
   V13: ALTER TABLE books DROP COLUMN title;
```

Each step works with the code before and after it. More releases, zero downtime.

---

## 5. Safe vs dangerous changes (Postgres)

| Change | Safe on a big live table? | How to do it safely |
|---|---|---|
| Add nullable column | ✅ | Just do it |
| Add column with a constant default | ✅ (Postgres 11+) | Fine |
| Add `NOT NULL` column without default | ❌ fails if rows exist | Add nullable → backfill → set NOT NULL |
| Add index | ⚠️ locks writes | `CREATE INDEX CONCURRENTLY` |
| Add foreign key | ⚠️ scans and locks | `ADD CONSTRAINT ... NOT VALID`, then `VALIDATE CONSTRAINT` later |
| Add check constraint | ⚠️ | Same `NOT VALID` + `VALIDATE` trick |
| Change column type | ❌ rewrites table | New column + backfill + switch |
| Rename column / table | ❌ breaks old code | Expand / contract |
| Drop column | ⚠️ | Only after no code reads it, in a later release |
| Big `UPDATE` backfill | ⚠️ long locks, bloat | Batches of a few thousand rows, with pauses |

Also set a **lock timeout** so a migration waiting behind a long query does not block every other query:

```sql
SET lock_timeout = '5s';
ALTER TABLE books ADD COLUMN isbn TEXT;
```

---

## 6. Backfilling in batches

```sql
-- run repeatedly until 0 rows updated
UPDATE books SET name = title
WHERE id IN (
    SELECT id FROM books WHERE name IS NULL ORDER BY id LIMIT 5000
);
```

Do big backfills as a background job, not inside the startup migration, so deploys do not hang.

---

## 7. Where migrations run

| Option | Pros | Cons |
|---|---|---|
| App runs them on startup | Simple | 10 instances start at once (Flyway locks, others wait); app needs DDL rights |
| Separate deploy step / job before the app | Clear, one runner, app user can be read/write only | Extra pipeline step |

Larger teams run migrations as a **separate job** in CI/CD with a dedicated DB user.

---

## 8. Database per service and migrations

In a microservice setup each service owns its database and its own migration folder. Another team never edits your tables. A shared "common" schema that many services migrate is a coupling trap: one team's migration can break another's deploy.

---

## 9. Testing migrations

- Run all migrations from zero in CI on a real Postgres (Testcontainers, guide 16).
- Also test on a copy of production-sized data before risky ones (type changes, backfills).
- Keep a "down" plan in writing even if you never automate rollbacks. Most teams roll **forward** with a fix migration.

---

## Spoken answer (30s)

> Every schema change is a versioned Flyway migration in the repo, reviewed like code and never edited after it runs. Because old and new code overlap during a rolling deploy, each migration must be backward compatible, so I use expand and contract: add the new column, dual-write, backfill in batches, switch reads, then drop the old column in a later release. On large Postgres tables I build indexes concurrently, add constraints as NOT VALID then validate, set a lock timeout, and run migrations as a separate pipeline step.
