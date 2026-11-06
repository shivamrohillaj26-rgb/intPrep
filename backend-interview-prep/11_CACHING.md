# 11 — Caching (Caffeine and Redis)

**Goal:** make BookNest's book pages fast without serving wrong data.

---

## 1. What a cache is

A cache is a faster, smaller copy of data that is slow or expensive to get.

```text
Without cache:  request → DB query (20 ms) → response
With cache:     request → cache hit (0.1 ms in memory, ~1 ms Redis) → response
                          cache miss → DB → store in cache → response
```

The hard part is not storing. It is **knowing when the copy is wrong** (invalidation).

Where caches live, from the user outward:

| Layer | Example | Good for |
|---|---|---|
| Browser | `Cache-Control`, ETag | Static files, rarely changing GETs |
| CDN | CloudFront | Images, public pages |
| API gateway / reverse proxy | Nginx cache | Public GET responses |
| **In-process (app memory)** | Caffeine | Config, hot lookups, tiny data, per instance |
| **Distributed** | Redis, Memcached | Shared across all instances: sessions, rate limits, hot objects |
| Database | Buffer pool, materialized views | Automatic / precomputed |

---

## 2. In-process cache with Caffeine

```java
LoadingCache<Long, Book> books = Caffeine.newBuilder()
    .maximumSize(10_000)                          // evict least-used beyond this
    .expireAfterWrite(Duration.ofMinutes(5))      // TTL
    .recordStats()
    .build(id -> bookRepo.findById(id).orElse(null));

Book b = books.get(42L);      // loads once, others wait for the same load (no stampede in-process)
books.invalidate(42L);
```

With Spring:

```java
@EnableCaching
@Configuration
class CacheConfig {
    @Bean
    CacheManager cacheManager() {
        var m = new CaffeineCacheManager("books");
        m.setCaffeine(Caffeine.newBuilder().maximumSize(10_000).expireAfterWrite(Duration.ofMinutes(5)));
        return m;
    }
}

@Service
class BookService {
    @Cacheable(cacheNames = "books", key = "#id")
    public BookResponse get(long id) { ... }

    @CacheEvict(cacheNames = "books", key = "#id")
    public void update(long id, UpdateBookRequest req) { ... }
}
```

Quarkus: `@CacheResult(cacheName = "books")`, `@CacheInvalidate`.

**Problem:** with 5 instances, each has its own copy. An update on instance A evicts only A's copy. B serves stale data until TTL. Fine for config, risky for prices. Fix: short TTL, a broadcast invalidation (Redis pub/sub), or use Redis.

`@Cacheable` is a proxy, so the same "self-call does not work" trap as `@Transactional` applies (guide 05).

---

## 3. Redis — a shared in-memory data store

Redis is a single server (or cluster) holding keys in memory. All app instances share it.

Data types and BookNest uses:

| Type | Commands | Use |
|---|---|---|
| String | `SET book:42 "{json}" EX 300`, `GET`, `INCR` | Cached object, counters |
| Hash | `HSET cart:7 book:42 2` | Shopping cart |
| List | `LPUSH`, `RPOP` | Simple queues, recent items |
| Set | `SADD online-users 7` | Unique members |
| Sorted set | `ZINCRBY bestsellers 1 book:42`, `ZREVRANGE bestsellers 0 9` | Leaderboards, rankings |
| Stream | `XADD`, `XREADGROUP` | Lightweight event stream |
| Pub/Sub | `PUBLISH`, `SUBSCRIBE` | Broadcast (fire and forget) |

```java
@Service
class BookCache {
    private final StringRedisTemplate redis;
    private final ObjectMapper json;

    Optional<BookResponse> get(long id) throws IOException {
        String v = redis.opsForValue().get("book:" + id);
        return v == null ? Optional.empty() : Optional.of(json.readValue(v, BookResponse.class));
    }

    void put(BookResponse b) throws IOException {
        redis.opsForValue().set("book:" + b.id(), json.writeValueAsString(b), Duration.ofMinutes(5));
    }

    void evict(long id) { redis.delete("book:" + id); }
}
```

Key naming: `service:entity:id[:version]`, for example `catalog:book:42:v2`. A version in the key lets you change the cached shape without clearing everything.

Persistence: Redis can save to disk (RDB snapshots, AOF log), but treat a cache as **losable**. The DB is the truth.

---

## 4. Cache patterns

### Cache-aside (lazy loading) — the default

```java
BookResponse get(long id) {
    return cache.get(id).orElseGet(() -> {
        BookResponse b = BookResponse.from(repo.findById(id).orElseThrow());
        cache.put(b);
        return b;
    });
}

@Transactional
void update(long id, UpdateBookRequest req) {
    ... update DB ...
    // evict AFTER commit, not before
}
```

**Update then delete the cache key** (not "update the cache value"). Deleting is safe against two writers racing.

Evict after the transaction commits, otherwise a reader can re-fill the cache with the old value before the commit:

```java
TransactionSynchronizationManager.registerSynchronization(new TransactionSynchronization() {
    @Override public void afterCommit() { cache.evict(id); }
});
// or publish an event and handle it with @TransactionalEventListener(phase = AFTER_COMMIT)
```

### Read-through

The cache itself loads from the DB on a miss (Caffeine `LoadingCache`). Same idea, cleaner code.

### Write-through

Every write goes to cache and DB together. Cache is always warm; writes are slower.

### Write-behind (write-back)

Write to cache, flush to DB later in batches. Fast, but data is lost if the cache dies. Use only for things like view counters.

### Refresh-ahead

Refresh popular keys before they expire (Caffeine `refreshAfterWrite`), so users never wait on a miss.

---

## 5. Invalidation strategies

| Strategy | How | Trade-off |
|---|---|---|
| TTL only | Expire after N seconds | Simple; stale for up to N seconds |
| Explicit evict on write | Delete key after commit | Fresh; you must find every write path |
| Event-driven | Consume `BookUpdated` events → evict | Works across services |
| Versioned keys | `book:42:v17`, bump version on change | Old keys just expire |

Use **TTL as a safety net always**, even with explicit eviction. A missed eviction then fixes itself.

---

## 6. Three classic failure modes

### Cache stampede (thundering herd)

A hot key expires. 1,000 requests miss at once and all hit the DB.

Fixes:

- **Single flight / locking:** only one request reloads, others wait or get the old value.

```java
// Redis lock: SET lock:book:42 <token> NX EX 10
Boolean got = redis.opsForValue().setIfAbsent("lock:book:42", token, Duration.ofSeconds(10));
if (Boolean.TRUE.equals(got)) { reload(); } else { sleepBrieflyThenRetryCache(); }
```

- **TTL jitter:** `300s + random(0..60s)` so keys do not expire together.
- **Refresh-ahead** for known-hot keys.
- **Stale-while-revalidate:** serve the old value while one worker refreshes.

### Cache penetration

Requests for IDs that **do not exist** (`/books/99999999`) always miss and hit the DB (often a bot).

Fixes: cache the "not found" result with a short TTL, validate IDs, or a **Bloom filter** of existing IDs.

### Cache avalanche

Redis goes down (or a mass expiry) and **all** traffic hits the DB.

Fixes: Redis replicas / cluster, jitter, a small in-process cache in front of Redis (two-level cache), circuit breaker + rate limit on DB fallbacks.

---

## 7. Eviction policies

When the cache is full, what goes?

- **LRU** — least recently used. Common default.
- **LFU** — least frequently used. Better for skewed popularity.
- **TTL** — expiry by time.
- Caffeine uses **W-TinyLFU** (frequency + recency), very good hit rates.
- Redis: `maxmemory-policy allkeys-lru` (or `allkeys-lfu`, `volatile-ttl`, ...). Set `maxmemory`, or Redis just grows.

---

## 8. Other Redis uses that are not "cache"

```text
Sessions            SET session:abc {...} EX 1800
Rate limiting       INCR rate:user:7:202611061230 + EXPIRE 60
Distributed lock    SET lock:job NX EX 30   (simple lock; release only if the token matches)
Idempotency keys    SET idem:<key> <response> NX EX 86400
Leaderboards        sorted sets
Job queues          lists / streams (or a real queue, guide 12)
```

Distributed locks in Redis are "best effort". If correctness really matters (money), rely on DB constraints or row locks, and use a **fencing token** pattern.

---

## 9. HTTP caching from the backend

```http
GET /v1/books/42
200 OK
Cache-Control: public, max-age=60, stale-while-revalidate=30
ETag: "v17"
```

Next time the client sends `If-None-Match: "v17"` → server returns `304 Not Modified` with no body. User-specific data: `Cache-Control: private` or `no-store`.

---

## 10. What NOT to cache

- Data that must be exact right now: stock count at checkout, account balance. Read from the DB with locking.
- Per-user secrets in a shared cache without the user ID in the key (one user sees another's data!).
- Things that are already fast (a primary-key lookup on a small table may not need it).

Measure **hit rate**. Below ~80% for a hot cache, the key or TTL design is probably wrong.

---

## Common mistakes

| Mistake | Fix |
|---|---|
| Evicting before commit | Evict after commit |
| Updating the cache value on write | Delete the key, let the next read load it |
| No TTL | Always set one, with jitter |
| Same key for different users | Include user / tenant in the key |
| Caching everything | Cache hot, slow, read-heavy data only |
| In-process cache with many instances for changing data | Redis or broadcast invalidation |

---

## Spoken answer (40s)

> I default to cache-aside: read the cache, on a miss load from the database and store with a TTL; on writes I update the database and delete the key after commit. In-process Caffeine is for small hot data per instance; Redis is the shared cache for data that changes, plus sessions, rate limits and idempotency keys. I always set a TTL with jitter as a safety net. For hot keys I prevent stampedes with single-flight locking or stale-while-revalidate, I cache not-found results against penetration, and I plan for Redis being down so the database isn't flattened. I never cache data that must be exact at that moment, like stock at checkout.
