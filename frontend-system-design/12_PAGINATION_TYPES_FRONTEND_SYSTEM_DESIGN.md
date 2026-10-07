# Pagination Types & Frontend System Design — When to Choose Which

Deep interview guide: **API pagination styles** × **UI patterns** × **frontend architecture**.

---

## 1. Two layers people mix up (clarify first)

| Layer | Question | Examples |
|---|---|---|
| **API / data pagination** | How does the server slice the dataset? | Offset, page number, cursor/keyset |
| **UI pagination UX** | How does the user move through results? | Page buttons, Load more, Infinite scroll |

You can mix them:

```text
Cursor API  +  Infinite scroll UI   → social feed
Offset API  +  Page numbers UI     → admin table
Cursor API  +  Load more button    → mobile catalog
```

**Interview one-liner:**

> Pagination is both a backend contract and a UX choice. I pick the API style for correctness at scale, and the UI pattern for how users browse.

---

## 2. Quick decision matrix (start here in interviews)

| Product surface | Prefer API | Prefer UI | Why |
|---|---|---|---|
| Admin table, invoices, CRM | Offset **or** page | Numbered pages (+ jump to page) | Users need “page 7”, sorting, total count |
| Search results (Google-like) | Offset / page (with caveats) | Numbered pages | Shareable `?page=3`, SEO |
| Social / activity feed | **Cursor** | Infinite scroll or Load more | New inserts at top; offset drifts |
| E-commerce PLP (Licious-style) | Cursor or page | Load more **or** pages | Mobile → load more; desktop SEO → pages |
| Chat message history | **Cursor** (before/after) | Infinite scroll upward | Stable around a message id |
| Huge DOM (100k rows) | Server page/cursor | Virtualized window + pages/scroll | Never mount all rows |
| Real-time list changing often | **Cursor** | Load more / live prepend | Offset duplicates/skips |

---

## 3. Offset / Limit pagination

### Contract

```http
GET /products?offset=40&limit=20
```

```json
{
  "items": [ /* 20 products */ ],
  "total": 1340,
  "offset": 40,
  "limit": 20
}
```

SQL mental model:

```sql
SELECT * FROM products
ORDER BY created_at DESC
LIMIT 20 OFFSET 40;   -- skip 40, take 20
```

### Frontend design

```text
state = { offset, limit, items, total, status }
pageCount = ceil(total / limit)
currentPage = offset / limit + 1

onPageClick(n):
  offset = (n - 1) * limit
  fetch → replace items
  sync URL ?offset= or ?page=
```

**React Query example shape:**

```ts
useQuery({
  queryKey: ['products', { offset, limit, sort }],
  queryFn: () => api.getProducts({ offset, limit, sort }),
  keepPreviousData: true, // smoother page flips
});
```

### Pros

- Easy to implement and reason about  
- Natural **total count** → “Page 3 of 67”  
- Jump to arbitrary page  

### Cons (say these — senior signal)

1. **Expensive deep offsets** — `OFFSET 100000` still scans/skips many rows  
2. **Drifting results** when data inserts/deletes between requests  
   - User on page 1; new item inserted → page 2 may **duplicate** or **skip** rows  
3. Bad fit for infinite feeds that grow at the top  

### When to choose

- Stable-ish datasets (admin, reports)  
- Need total pages / jump  
- Dataset not huge or DB can afford it  
- SEO listing with page numbers  

### Example — Admin orders table

```text
UI: [1] [2] [3] … [67]   Sort: date ▼   Page size: 25
API: GET /orders?offset=50&limit=25&sort=-createdAt
FE:  URL /orders?page=3&sort=-createdAt
     Cache each page key; prefetch page+1 on idle
```

---

## 4. Page-number pagination

### Contract

```http
GET /products?page=3&pageSize=20
```

Same family as offset (`offset = (page - 1) * pageSize`). Slightly nicer UX naming.

### Frontend design

- Put **`page` in the URL** — shareable, back-button works  
- Show page size selector (20 / 50 / 100)  
- Disable next when `page * pageSize >= total`  
- Optional: skeleton while `isFetching` with `placeholderData`  

### Pros / cons

Same as offset. Prefer page numbers in APIs when the product language is “pages.”

### SEO note

```text
/search?q=milk&page=2
<link rel="canonical" …>
<link rel="next" href="...?page=3">
<link rel="prev" href="...?page=1">
```

Crawlers understand page links better than infinite scroll alone.

---

## 5. Cursor / keyset pagination (preferred for feeds)

### Contract

```http
GET /feed?limit=20&cursor=eyJpZCI6IjEyMyIsInQiOiIyMDI2LT…"}
```

```json
{
  "items": [ /* 20 */ ],
  "nextCursor": "abc...",   // null if end
  "prevCursor": "xyz..."    // optional
}
```

Server uses a **stable sort key** (e.g. `(created_at, id)`):

```sql
WHERE (created_at, id) < (:cursorCreatedAt, :cursorId)
ORDER BY created_at DESC, id DESC
LIMIT 20;
```

Cursor is usually an **opaque** encoded string (don’t make FE parse DB internals).

### Why it fixes offset drift

```text
Offset world:
  t0: fetch offset=0  → items A B C
  t1: NEW item Z inserted at top
  t2: fetch offset=3  → may skip or duplicate depending on timing

Cursor world:
  “Give me 20 items after item C”
  → stable relative to C, even if Z was inserted
```

### Frontend design

```text
state = {
  items: [],          // appended list
  nextCursor: string | null,
  hasMore: boolean,
}

loadInitial():
  res = GET ?limit=20
  items = res.items
  nextCursor = res.nextCursor

loadMore():
  if !nextCursor or loading return
  res = GET ?limit=20&cursor=nextCursor
  items = [...items, ...res.items]   // append; dedupe by id
  nextCursor = res.nextCursor
```

**Filter/sort change → reset:**

```text
onFilterChange:
  items = []
  nextCursor = null
  refetch from start
```

### Pros

- Stable under inserts/deletes  
- Fast at “deep” positions (no huge OFFSET)  
- Natural for infinite scroll  

### Cons

- Harder to jump to “page 50”  
- Total count often expensive / omitted (`hasMore` instead of “page 12 of 90”)  
- FE must treat cursor as opaque  
- Sorting must be deterministic (tie-break with `id`)  

### When to choose

- Feeds, notifications, chat, activity  
- Large tables where deep offset hurts  
- Mobile infinite lists  
- Realtime-ish data  

### Example — Order tracking / social feed

```text
UI: infinite scroll
API: GET /activities?cursor=&limit=30
FE: IntersectionObserver on sentinel → loadMore()
    queryKey: ['feed', filters]
    cache pages as infinite query (TanStack infiniteQuery)
```

```ts
useInfiniteQuery({
  queryKey: ['feed', filters],
  queryFn: ({ pageParam }) => api.feed({ cursor: pageParam, ...filters }),
  getNextPageParam: (last) => last.nextCursor ?? undefined,
  initialPageParam: undefined,
});
```

---

## 6. UI patterns (orthogonal to API)

### A) Numbered pagination

```text
«  1  2  3  …  20  »
```

| Good for | Bad for |
|---|---|
| Admin, search SEO, “go to page N” | Continuous browsing feeds |
| Showing total progress | Mobile thumb reach (many controls) |

**FE checklist:** URL sync, disable edges, announce page to a11y, keepPreviousData.

### B) Load more button

```text
[ items… ]
[ Load more ]
```

| Good for | Bad for |
|---|---|
| Mobile catalogs, intentional pacing | Power users who want page 40 |
| Accidental overscroll control | SEO of “page 2” as separate URL (unless you also expose pages) |

Works with **cursor or offset**. Simpler than infinite scroll (no scroll jank / dual fetch).

### C) Infinite scroll

```text
[ items… ]
(sentinel div → IntersectionObserver)
```

| Good for | Bad for |
|---|---|
| Feeds, discovery | Footer links never reached |
| Immersive browsing | Hard to resume exact position without care |
| | Accessibility / “find item 500” |

**FE system design must include:**

1. Sentinel + `rootMargin` prefetch  
2. Dedupe in-flight `loadMore`  
3. Scroll restoration (sessionStorage position or cursor)  
4. “Back to top”  
5. Don’t rely on infinite scroll alone for SEO landing pages  

### D) Virtualization (render strategy — not pagination)

Virtualization = only **mount ~20–50 DOM rows**.  
Pagination = only **fetch a slice of data**.

```text
Best admin combo:
  Server: page/cursor of 50–100 rows
  Client: virtualize if the page itself is still heavy
  Never: fetch 100k + render 100k
```

See scenario [08_LARGE_TABLE_100K_ROWS](../scenario-based-questions/08_LARGE_TABLE_100K_ROWS.md).

---

## 7. Hybrid patterns (what real products do)

### E-commerce PLP

```text
Desktop SEO:  /c/dairy?page=2          → page API + numbered UI
Mobile app:   cursor + Load more / infinite
Same backend can support both:
  ?page=2&pageSize=24
  or ?cursor=…&limit=24
```

### “Load more” that still updates URL (shareable progress)

```text
After 3 loads of 20:
  URL ?page=3  or  ?offset=60
  Soft: still one long list in DOM (or windowed)
```

### Bidirectional cursor (chat)

```text
GET /messages?conversationId=1&cursor=X&direction=before
GET /messages?conversationId=1&cursor=X&direction=after
```

FE keeps a window around the viewport; prepend older, append newer.

---

## 8. Frontend system design checklist (any type)

### State

| Concern | Approach |
|---|---|
| Server cache | TanStack Query / RTK Query — key includes page/cursor + filters |
| List identity | Stable `id`; dedupe on append |
| Reset | Filters/sort change clears pages |
| Optimistic UI | Rare for pagination; more for mutations inside a page |

### URL

| UX | URL |
|---|---|
| Numbered pages | `?page=` / `?offset=` **required** |
| Infinite / load more | Optional cursor in URL or session restore |
| Filters | Always in URL (`?q=&sort=`) |

### Performance

- Prefetch next page on hover/idle  
- `keepPreviousData` / placeholder to avoid blank flash  
- Cancel stale requests on filter change (`AbortController` / query lib)  
- Bound memory: don’t keep 200 infinite pages forever — GC old pages or cap  

### A11y

- Page buttons as links or proper `aria-label`  
- Announce “Loading more” / “Page 3 of 20”  
- Focus management when page content replaces  

### Errors

- Retry failed page without wiping existing items (infinite)  
- Replace mode on numbered page failure → error state + retry  

---

## 9. Deep comparison table

| | Offset / Page | Cursor / Keyset |
|---|---|---|
| Jump to page N | ✅ Easy | ❌ Hard |
| Total count | ✅ Natural | ⚠️ Optional/expensive |
| Stable under inserts | ❌ Drift | ✅ Stable |
| Deep pages performance | ❌ Degrades | ✅ Stable |
| Infinite scroll fit | OK early pages | ✅ Best |
| Implementation complexity | Low | Medium |
| SEO page links | ✅ | Needs extra page API |
| Chat / realtime feeds | Weak | ✅ |

---

## 10. Worked examples

### Example A — Licious-style product listing

**Choose:** Cursor API + Load more on mobile; numbered pages on SEO web.

```text
GET /v1/catalog?category=dairy&cursor=&limit=24&sort=popular

FE mobile:
  pages[] appended
  button "Load more" → nextCursor

FE SEO web:
  GET /v1/catalog?category=dairy&page=2&pageSize=24
  render page controls + SSR HTML for crawlers
```

**Why not offset-only infinite scroll?**  
Catalog updates often (stock, ranking). Cursor avoids dupes; SEO site still needs pages.

### Example B — Admin “100k orders”

**Choose:** Server page (offset or keyset on `id`) + page size 50 + **virtualization optional**.

```text
GET /admin/orders?page=1&pageSize=50&status=PENDING
UI: classic pager + filters in URL
Export: async job — not “load all pages in browser”
```

**Why not infinite scroll?**  
Ops users jump, sort, and need totals. Infinite scroll fights that UX.

### Example C — Notification bell

**Choose:** Cursor + infinite scroll inside dropdown.

```text
GET /notifications?cursor=&limit=15
Mark read mutations update item in cache by id
New notification via SSE → prepend + optional invalidate
```

**Why cursor?** Consistent with realtime inserts at top.

### Example D — Search “page 2” must be shareable

**Choose:** Page API + numbered UI + SSR/SSG for public search.

```text
/search?q=chicken&page=2
rel=next/prev
```

Infinite scroll alone loses shareable “page 2” and hurts SEO.

---

## 11. Common interview traps

| Trap | Better |
|---|---|
| “Always use infinite scroll — it’s modern” | Match UX to task; admin ≠ Instagram |
| “Offset is fine for everything” | Mentions drift + deep OFFSET cost |
| Fetch all then paginate in FE | Only for tiny lists (&lt; few hundred) |
| Cursor but expose DB id as cursor without encoding | Prefer opaque cursor |
| Infinite scroll + no dedupe | Duplicate keys / React warnings |
| Keep every loaded page forever | Memory leak on long sessions |
| Virtualize without server pagination | Still download megabytes of JSON |

---

## 12. Spoken answers

### 45s — “What pagination would you use?”

> I’d split API vs UX. For feeds and anything insert-heavy I’d use **cursor pagination** with infinite scroll or load-more — stable and cheap at depth. For admin tables and SEO search I’d use **page/offset** with numbered controls and `page` in the URL so users can jump and share links. I’d never load 100k rows into the client; the server pages, and if a page is still heavy I virtualize the DOM.

### 20s — Offset vs cursor

> Offset is simple and gives totals/jumps but drifts when data changes and gets slow for deep pages. Cursor is opaque “continue after this item,” stable and fast — best for infinite feeds.

### Why load more over infinite scroll sometimes

> Load more gives the user control, avoids trapping the footer, and reduces accidental duplicate fetches — I default to it on mobile commerce unless the product is a pure discovery feed.

---

## 13. Implementation cheat sheet

```ts
// Offset
GET /items?offset=40&limit=20
→ replace list, know total

// Page
GET /items?page=3&pageSize=20
→ same family; sync URL

// Cursor
GET /items?cursor=OPAQUE&limit=20
→ append list; nextCursor; no random jump

// FE infinite (cursor)
useInfiniteQuery + getNextPageParam: last => last.nextCursor

// FE pages (offset)
useQuery({ queryKey: ['items', page], ... })
+ <Pagination page={page} onChange=setPage />
```

---

## 14. Practice checklist

- [ ] Explain offset drift with a 3-item insert example  
- [ ] Draw cursor `WHERE (created_at, id) < …` mentally  
- [ ] Pick pagination for: admin table, feed, chat, SEO search  
- [ ] Wire URL sync for page-based UI  
- [ ] Sketch TanStack `useInfiniteQuery` vs `useQuery`  
- [ ] Say when virtualization ≠ pagination  

---

## Related

| Topic | File |
|---|---|
| Pinterest feed HLD (cursor + infinite) | [07_PINTEREST_LIKE_GRID_HLD.md](./07_PINTEREST_LIKE_GRID_HLD.md) |
| 100k rows admin | [../scenario-based-questions/08_LARGE_TABLE_100K_ROWS.md](../scenario-based-questions/08_LARGE_TABLE_100K_ROWS.md) |
| Dashboard polling | [../scenario-based-questions/01_DASHBOARD_WIDGETS_POLLING.md](../scenario-based-questions/01_DASHBOARD_WIDGETS_POLLING.md) |
| SEO rendering | [../scenario-based-questions/07_SEO_RENDERING_STRATEGIES.md](../scenario-based-questions/07_SEO_RENDERING_STRATEGIES.md) |
