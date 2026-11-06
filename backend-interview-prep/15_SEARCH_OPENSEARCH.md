# 15 — Search with OpenSearch (and Elasticsearch)

**Goal:** let BookNest users type "harry poter" and find *Harry Potter*, filter by price and format, and see counts per category — fast.

OpenSearch is the open-source fork of Elasticsearch. Concepts and query JSON are almost the same.

---

## 1. Why not just SQL `LIKE`?

```sql
SELECT * FROM books WHERE title ILIKE '%potter%';
```

- Cannot use a normal B-tree index (leading `%`) → full table scan.
- No typo tolerance, no "running" matches "run", no relevance ranking.
- Facets ("Fantasy (120), Kids (45)") need extra GROUP BY queries.

Postgres full-text search (`tsvector`, `GIN` index) is fine for small/medium needs. Go to OpenSearch when search is a core feature, data is big, or you need relevance tuning, fuzzy matching, aggregations, or logs/analytics.

---

## 2. The inverted index (how search engines are fast)

Documents:

```text
1: "Harry Potter and the Stone"
2: "The Hobbit"
3: "Potter's Wheel Pottery"
```

After **analysis** (lowercase, split into words, remove stop words, stem):

```text
term      → document ids
harry     → [1]
potter    → [1, 3]
stone     → [1]
hobbit    → [2]
wheel     → [3]
potteri   → [3]      (stemmed "pottery")
```

A search for "potter" looks up one term and gets the list instantly — like the index at the back of a book. Scoring (**BM25**) ranks documents: rarer terms and terms appearing in short fields count more.

---

## 3. Vocabulary

| OpenSearch | Roughly in SQL |
|---|---|
| Index | Table |
| Document (JSON) | Row |
| Field | Column |
| Mapping | Schema |
| Shard | A slice of the index (horizontal partition) |
| Replica | A copy of a shard (availability + read throughput) |
| Node / cluster | Server / group of servers |

Number of primary shards is fixed at index creation. Aim for shards of roughly 10–50 GB; too many small shards waste memory.

---

## 4. Mapping (define it — do not let OpenSearch guess)

```json
PUT /books-v1
{
  "settings": {
    "number_of_shards": 3,
    "number_of_replicas": 1,
    "analysis": {
      "analyzer": {
        "title_autocomplete": {
          "type": "custom",
          "tokenizer": "standard",
          "filter": ["lowercase", "edge_ngram_2_15"]
        }
      },
      "filter": {
        "edge_ngram_2_15": { "type": "edge_ngram", "min_gram": 2, "max_gram": 15 }
      }
    }
  },
  "mappings": {
    "dynamic": "strict",
    "properties": {
      "id":          { "type": "long" },
      "title":       { "type": "text", "analyzer": "english",
                       "fields": {
                         "raw":  { "type": "keyword" },
                         "auto": { "type": "text", "analyzer": "title_autocomplete", "search_analyzer": "standard" }
                       } },
      "author":      { "type": "text", "fields": { "raw": { "type": "keyword" } } },
      "category":    { "type": "keyword" },
      "format":      { "type": "keyword" },
      "price_cents": { "type": "integer" },
      "in_stock":    { "type": "boolean" },
      "published_at":{ "type": "date" },
      "rating":      { "type": "float" }
    }
  }
}
```

The most important distinction:

| Type | Analyzed? | Use for |
|---|---|---|
| `text` | Yes (split into terms) | Full-text search ("harry potter") |
| `keyword` | No (exact value) | Filters, sorting, aggregations, IDs, enums |

A field can be both via **multi-fields** (`title` + `title.raw`).

`"dynamic": "strict"` rejects unknown fields so a typo does not silently create a new mapping (**mapping explosion** is a classic outage).

---

## 5. Queries

### Full text + filters + sort + paging

```json
GET /books/_search
{
  "query": {
    "bool": {
      "must": [
        { "multi_match": {
            "query": "harry poter",
            "fields": ["title^3", "author"],
            "fuzziness": "AUTO"
        } }
      ],
      "filter": [
        { "term":  { "format": "PAPERBACK" } },
        { "range": { "price_cents": { "lte": 2000 } } },
        { "term":  { "in_stock": true } }
      ]
    }
  },
  "sort": ["_score", { "published_at": "desc" }],
  "size": 20,
  "from": 0,
  "highlight": { "fields": { "title": {} } }
}
```

- `must` → affects score. `filter` → yes/no only, **cached and faster**. Put every exact condition in `filter`.
- `should` → "nice to have" (boosts score). `must_not` → exclude.
- `term` is for keyword fields. `match` analyzes the input and is for text fields. Using `term` on a `text` field is the classic "why no results?" bug.
- `title^3` boosts title matches.
- `fuzziness: AUTO` tolerates typos ("poter").

### Facets with aggregations

```json
"aggs": {
  "by_category": { "terms": { "field": "category", "size": 10 } },
  "price_ranges": { "range": { "field": "price_cents",
      "ranges": [{ "to": 1000 }, { "from": 1000, "to": 2000 }, { "from": 2000 }] } },
  "avg_rating": { "avg": { "field": "rating" } }
}
```

### Autocomplete

Query `title.auto` with a `match` (edge n-grams), or use a `completion` suggester / `search_as_you_type` field.

---

## 6. Deep pagination

`from + size` gets slow and is capped (10,000 by default) because every shard must collect `from + size` results.

- **`search_after`** — cursor-based: pass the sort values of the last hit. Best for "load more".
- **Point in time (PIT)** + `search_after` — consistent pages while data changes.
- **Scroll** — for exporting everything (batch jobs), not user paging.

Same idea as keyset pagination in SQL (guide 02).

---

## 7. Keeping the index in sync with the database

Postgres is the **source of truth**. The search index is a **read model** — it can always be rebuilt.

```text
Option A — dual write in the service:      save to DB, then index      ❌ can drift (dual-write problem)
Option B — events:                         outbox → BookUpdated event → indexer consumer → OpenSearch  ✅
Option C — CDC:                            Postgres WAL → Debezium → Kafka → indexer  ✅
Option D — periodic batch reindex:         nightly full rebuild (small data / backup)
```

Indexer consumer, idempotent and version-safe:

```java
void on(BookUpdated e) {
    client.index(i -> i
        .index("books")
        .id(String.valueOf(e.bookId()))
        .document(toDoc(e))
        .versionType(VersionType.External)       // ignore older events arriving late
        .version(e.version()));
}
```

Indexing by ID is naturally idempotent (same doc ID overwrites).

- **Near real-time:** documents become searchable after a **refresh** (default 1 s). Do not expect read-your-write instantly.
- **Bulk API** for many documents: batches of a few MB, not one HTTP call per doc.

---

## 8. Zero-downtime reindex with aliases

Changing a mapping (e.g., a field from `text` to `keyword`) needs a new index. Apps always use an **alias**.

```text
alias "books" → books-v1

1. Create books-v2 with the new mapping
2. Reindex / backfill from the DB (or _reindex API) into books-v2
3. Dual-feed new events to both during the backfill
4. Atomically switch: POST /_aliases { remove books-v1, add books-v2 }
5. Delete books-v1 later
```

---

## 9. Cluster health and performance basics

- Health: **green** (all shards OK), **yellow** (replicas missing), **red** (primary missing — some data unavailable).
- JVM heap about 50% of RAM, max ~31 GB; the rest is OS file cache, which search relies on.
- Watch: search latency, indexing rate, rejected thread-pool tasks, heap, disk watermarks (at ~85–90% disk, shards stop allocating / index goes read-only).
- Time-series data (logs, events): one index per day/month + **index lifecycle** (hot → warm → delete), so old data is dropped by deleting whole indices.

---

## 10. Java client (Spring or plain)

```java
SearchResponse<BookDoc> res = client.search(s -> s
    .index("books")
    .query(q -> q.bool(b -> b
        .must(m -> m.multiMatch(mm -> mm.query(text).fields("title^3", "author").fuzziness("AUTO")))
        .filter(f -> f.term(t -> t.field("format").value(format)))))
    .size(20),
    BookDoc.class);

List<BookDoc> books = res.hits().hits().stream().map(Hit::source).toList();
```

---

## Common mistakes

| Mistake | Fix |
|---|---|
| Relying on dynamic mapping | Explicit mapping, `dynamic: strict` |
| `term` on `text` fields | `match` for text, `term` for keyword |
| Exact conditions in `must` | Put them in `filter` |
| Treating the index as the source of truth | DB is the truth; index is rebuildable |
| Deep `from` paging | `search_after` + PIT |
| Too many tiny shards | Size shards 10–50 GB |
| Changing mappings in place | New index + alias swap |

---

## Spoken answer (40s)

> OpenSearch builds an inverted index — analyzed terms pointing to documents — so full-text search with typo tolerance, relevance scoring and facets is fast where SQL LIKE scans. I define explicit mappings: text for searching, keyword for filters, sorts and aggregations, often both as multi-fields. Queries use bool with full-text in must and exact conditions in filter for caching. Postgres stays the source of truth, and I keep the index in sync through outbox events or CDC into an idempotent, version-checked indexer using the bulk API. Mapping changes go to a new index behind an alias with an atomic swap, and deep paging uses search_after with a point in time.
