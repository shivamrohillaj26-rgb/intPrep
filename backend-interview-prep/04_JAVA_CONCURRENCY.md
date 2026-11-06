# 04 — Java concurrency (threads without fear)

**Goal:** understand why "two requests at the same time" breaks naive code, and how to fix it.

In JS you had one event loop, so two lines of your code never ran at the same moment. In Java, **200 requests can run your code at the same moment** on 200 threads. That changes everything.

---

## 1. Thread, process, pool

```text
Process (one JVM)
  ├── heap memory   ← shared by ALL threads
  ├── thread 1  (own stack)  → handling request A
  ├── thread 2  (own stack)  → handling request B
  └── thread 3  (own stack)  → handling request C
```

- **Process:** one running program. Has its own memory.
- **Thread:** a line of execution inside the process. Threads share the heap.
- **Thread pool:** a fixed group of threads reused for many tasks. Creating threads is expensive, so servers keep a pool.

## 2. The race condition (the bug you must be able to explain)

```java
@Service
class StockService {
    private int stock = 1;                // shared by every request!

    boolean buy() {
        if (stock > 0) {                  // thread A reads 1, thread B reads 1
            stock = stock - 1;            // both subtract
            return true;                  // both "bought" the last copy
        }
        return false;
    }
}
```

Two threads read `1` before either writes. Result: stock `-1`, two customers charged for one book.

`stock = stock - 1` is three steps: read, subtract, write. Another thread can jump in between.

## 3. Fixes, from simplest to strongest

### a) Do not share state (best)

Services should hold **no mutable fields**. State lives in the database. Then the race moves to the database, where you fix it with SQL (section 9).

### b) `synchronized`

```java
synchronized boolean buy() {          // only one thread at a time in this method
    if (stock > 0) { stock--; return true; }
    return false;
}
```

Correct, but only inside **one JVM**. With 3 servers behind a load balancer, each has its own `stock`. Useless for real data.

### c) Atomic classes

```java
private final AtomicInteger stock = new AtomicInteger(1);

boolean buy() {
    while (true) {
        int current = stock.get();
        if (current <= 0) return false;
        if (stock.compareAndSet(current, current - 1)) return true;   // retry if someone changed it
    }
}
```

`AtomicInteger`, `AtomicLong`, `LongAdder` (fast counters for metrics).

### d) Locks

```java
private final ReentrantLock lock = new ReentrantLock();

void update() {
    lock.lock();
    try {
        // critical section
    } finally {
        lock.unlock();                // ALWAYS in finally
    }
}
```

`ReadWriteLock`: many readers at once, one writer.

### e) Thread-safe collections

| Not safe | Safe version |
|---|---|
| `HashMap` | `ConcurrentHashMap` |
| `ArrayList` | `CopyOnWriteArrayList` (many reads, rare writes) |
| `LinkedList` as queue | `ArrayBlockingQueue`, `LinkedBlockingQueue` |

```java
ConcurrentHashMap<String, Integer> hits = new ConcurrentHashMap<>();
hits.merge("/books", 1, Integer::sum);    // atomic
```

## 4. Visibility and `volatile`

A thread may cache a variable and not see another thread's write.

```java
private volatile boolean running = true;   // every read sees the latest write

void stop() { running = false; }
void loop() { while (running) { /* work */ } }
```

`volatile` fixes **visibility**, not **atomicity**. `count++` on a volatile is still a race.

## 5. Deadlock

```text
Thread A holds lock 1, waits for lock 2
Thread B holds lock 2, waits for lock 1
→ both wait forever
```

Prevent it: always take locks in the **same order**, hold them briefly, use `tryLock(timeout)`. Databases have the same problem with row locks (guide 07).

## 6. ExecutorService — run work in the background

```java
ExecutorService pool = Executors.newFixedThreadPool(10);

Future<Report> future = pool.submit(() -> buildReport(userId));
Report report = future.get(5, TimeUnit.SECONDS);      // wait, with a timeout

pool.shutdown();
```

Size the pool on purpose:

- **CPU-bound** work (math, image resize): about the number of CPU cores.
- **IO-bound** work (HTTP, DB calls): more threads, because they mostly wait.

Never use an **unbounded** queue for a busy pool. It hides overload until the server runs out of memory.

## 7. CompletableFuture — like JS Promises

```java
CompletableFuture<Book> bookF  = CompletableFuture.supplyAsync(() -> bookClient.get(42), ioPool);
CompletableFuture<Stock> stockF = CompletableFuture.supplyAsync(() -> stockClient.get(42), ioPool);

BookPage page = bookF
    .thenCombine(stockF, (book, stock) -> new BookPage(book, stock))   // like Promise.all for two
    .orTimeout(2, TimeUnit.SECONDS)
    .exceptionally(ex -> BookPage.unavailable())                       // like .catch
    .join();
```

| JS | Java |
|---|---|
| `promise.then(f)` | `thenApply(f)` |
| `then` returning a promise | `thenCompose(f)` |
| `Promise.all` | `CompletableFuture.allOf(...)` |
| `.catch` | `exceptionally` / `handle` |

Pass your **own executor**. The default common pool is small and shared by everything.

## 8. Virtual threads (Java 21) — the new default for IO

Old problem: 1 request = 1 OS thread, and OS threads are heavy (about 1 MB stack). 10,000 waiting requests = trouble.

Virtual threads are cheap threads managed by the JVM. Millions are fine. When one waits on IO, the JVM parks it and reuses the real thread.

```java
try (var executor = Executors.newVirtualThreadPerTaskExecutor()) {
    for (long id : orderIds) {
        executor.submit(() -> emailService.sendReceipt(id));
    }
}
```

Spring Boot 3.2+:

```yaml
spring:
  threads:
    virtual:
      enabled: true
```

You keep writing simple blocking code and get the scale of async code.

Cautions: they do not make CPU work faster. Long `synchronized` blocks around IO can "pin" the carrier thread (improved in newer JDKs). A virtual thread per request still needs a **database connection** — the pool size is still your real limit.

## 9. The real-world race: two servers, one database

The fix for "two people buy the last book" is in the **database**, not in Java.

```sql
-- Atomic conditional update. Only succeeds if stock is still positive.
UPDATE books SET stock = stock - 1
WHERE id = 42 AND stock > 0;
-- rows affected = 1 → you got it; 0 → sold out
```

```java
int updated = jdbc.update(
    "UPDATE books SET stock = stock - 1 WHERE id = ? AND stock > 0", bookId);
if (updated == 0) throw new OutOfStockException(bookId);
```

Other tools: `SELECT ... FOR UPDATE` (pessimistic lock), a `version` column (optimistic lock), unique constraints, and distributed locks in Redis for rare cases. Guide 07 explains each.

## 10. ThreadLocal (and why it bites)

```java
private static final ThreadLocal<String> REQUEST_ID = new ThreadLocal<>();
```

Each thread gets its own value. Frameworks use it for the current user, transaction and request ID. Pool threads are reused, so **always clear it** at the end of a request, or the next request sees the old user. With virtual threads and async hops, values do not follow automatically — newer code uses `ScopedValue` or passes context explicitly.

## 11. Scheduled jobs

```java
@Scheduled(cron = "0 0 2 * * *")      // 02:00 every day (Spring)
void cleanupExpiredCarts() { ... }
```

With 3 servers, this runs **3 times**. Use a lock (e.g. ShedLock with a DB table) so only one instance runs it, or run jobs in one dedicated worker.

---

## Common mistakes

| Mistake | Fix |
|---|---|
| Mutable fields in a `@Service` | Make services stateless |
| `synchronized` to protect database data | Use DB atomic updates / locks |
| `HashMap` shared across threads | `ConcurrentHashMap` |
| `future.get()` with no timeout | Always pass a timeout |
| `parallelStream()` for HTTP calls | Use an executor you sized |
| Forgetting `unlock()` | `try { } finally { unlock(); }` |
| `@Scheduled` on many servers | ShedLock / single worker |

---

## Spoken answer (40s)

> A Java server runs many requests on many threads that share the heap, so any shared mutable state can race — two threads read stock 1 and both sell the last copy. I keep services stateless and push correctness into the database with atomic conditional updates, row locks or optimistic version checks, because in-JVM locks don't work across instances. Inside one JVM I use concurrent collections and atomics, size thread pools by workload with bounded queues, always use timeouts, and for IO-heavy code I use virtual threads so simple blocking code scales — while remembering the DB connection pool is still the real limit.
