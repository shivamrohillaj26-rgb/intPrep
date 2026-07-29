# Scenario 4 — 100+ API Responses Stored in Redux (Store Bloat)

**Prompt:** A team stores responses from 100+ APIs inside Redux. The store size keeps growing and performance is degrading. What would you change?

---

## 1. Clarify

- Is data normalized or giant nested blobs?  
- Do they keep *every* historical response?  
- Are lists paginated or “fetch all”?  
- Who reads this data — many connected components?  
- Persist to `localStorage`? (often makes it worse)

---

## 2. Diagnose

### Why performance dies

1. **Huge store serialization** — DevTools, persistence, cloning  
2. **Broad subscriptions** — `useSelector(s => s)` or poorly memoized selectors → mass re-renders  
3. **Immutable updates on large trees** — expensive structural sharing churn  
4. **Retained unused API data** — visited pages never GC’d  
5. **Duplication** — same entity in multiple slices  
6. **Redux used as a network cache** without TTL / invalidation semantics  

### Root conceptual mistake

> **Server state was modeled as eternal client global state.**

Redux is great for **client** state with clear update logic.  
A full HTTP cache needs: stale time, GC, dedupe, retries, tags — that’s **React Query / RTK Query**, not hand-fed slices for 100 endpoints.

---

## 3. What I would change (architecture)

### Step 1 — Split state types

| Keep in Redux (or Zustand) | Move out of Redux |
|---|---|
| Auth UI flags, wizard step | Product lists, search results |
| Feature toggles (client) | Order history pages |
| Truly cross-cutting client UX | Any “last API response” blobs |
| Optimistic UI overlays | Paginated collections |

### Step 2 — Introduce a proper server cache

**Preferred migrations:**

**A. RTK Query** (if already on Redux Toolkit)  
- Least cultural shock  
- Endpoints → `createApi`  
- Automatic caching, tags, `keepUnusedDataFor`  

**B. TanStack Query**  
- Excellent DX; Redux shrinks to true client state  

```ts
// before: dispatch(setProducts(await api.getProducts()))
// after:
const { data } = useGetProductsQuery({ page, q });
```

**Why RTK Query over inventing cache in slices:**  
You’d reimplement invalidation badly. RTK Query is the “Redux-native” correct cache.

**Why not “just normalize with entity adapter and keep all 100 APIs”:**  
Normalization helps, but without GC/staleness you still retain the world forever. Normalization is necessary but not sufficient.

### Step 3 — Normalize what remains

If some domain state must stay client-side:

```ts
{
  products: { byId: {}, allIds: [] },
  // not: products: [ {..., nested vendor: {...,} }, × 10_000 ]
}
```

Use `createEntityAdapter`. Selectors via **Reselect** / RTK listeners.

### Step 4 — Garbage collection policies

- `keepUnusedDataFor: 60` (seconds) on queries  
- Don’t persist entire store — persist **allowlisted** keys only (token prefs, not catalogs)  
- Paginate; never `concat` unbounded pages into one array  
- Cap caches (LRU) for search  

### Step 5 — Fix subscription surface

```ts
// ❌
const state = useSelector((s) => s);

// ✅
const total = useSelector((s) => s.cart.total);
// or RTK Query hook — component only re-renders when its data changes
```

### Step 6 — Delete aggressively

Migration definition of done: **slice removed**, not “also write to Query.”  
Dual-writing temporarily OK; long-term dual write is Scenario 2’s failure mode.

---

## 4. Target picture

```
Before:
  API → reducer → mega store → many components re-render

After:
  API → RTK Query / TanStack Query cache (TTL + GC)
  Redux ← thin client state only
  Components → hooks/selectors with narrow subscriptions
```

---

## 5. Why this over that

| Option | Verdict |
|---|---|
| Keep Redux, add Reselect everywhere | Helps renders; **doesn’t fix** unbounded growth |
| Persist store to localStorage | Often **worsens** memory + quota issues |
| Normalize only | Good partial step; still need TTL/GC |
| RTK Query / TanStack Query | **Correct** home for 100 API responses |
| Move all to Context | Worse re-render profile |
| “Use Immer more carefully” | Micro-opt; wrong layer |

**Chosen approach:**  
> Migrate API data to **RTK Query (or TanStack Query)**, shrink Redux to client state, normalize leftovers, narrow selectors, stop persisting server caches, add GC/TTL. Measure store size and React commit times before/after.

---

## 6. Rollout

1. Measure: store JSON size, action rate, React profiler  
2. Pick hottest 5 endpoints → RTK Query  
3. Facade hooks so UI doesn’t care  
4. Remove old reducers  
5. Ban pattern via lint: `createSlice` for `*Response` naming  
6. Revisit persistence whitelist  

---

## 7. 60-second spoken answer

> Storing 100+ API responses in Redux turns the store into an unbounded network cache without TTL or GC, so memory grows and wide selectors re-render half the app. I’d reclassify that as **server state** and move it to **RTK Query or TanStack Query**, keep Redux only for true client state, normalize any remaining entities, narrow subscriptions, and stop persisting catalogs. Quick wins are `keepUnusedDataFor`, pagination caps, and deleting dual-writes after migration.

---

## Related

- Scenario 1 — dashboard polling belongs in query layer  
- Scenario 2 — standardize state by type  
- Scenario 5 — high-freq ticks should NOT all land in Redux either
