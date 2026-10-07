# Scenario 4 — 100+ API Responses in NgRx (Store Bloat)

**Prompt:** A team stores responses from 100+ APIs inside NgRx (or a giant `BehaviorSubject` tree). The store keeps growing and the UI degrades. What would you change?

*(If they say Redux: same mistake — **server cache ≠ client store**. Answer Angular.)*

---

## 1. Clarify

- Nested blobs vs `createEntityAdapter`?  
- Every historical response kept?  
- Persist `localStorage` via `meta-reducers`?  
- Who selects — `select(s => s)` wide?

---

## 2. Diagnose

1. **Huge store** — DevTools serialize, `localStorage` quota, structural sharing on fat trees  
2. **Wide selectors** — `store.select(s => s)` or one `AppState` signal → mass CD  
3. **No TTL/GC** — visited pages stay forever  
4. **Duplication** — same `User` in `auth` + `users` + `orders` slices  
5. **NgRx used as HttpClient** without staleTime / tags  

> **Server state was modeled as eternal global client state.**

NgRx is excellent for **events + client workflows**. An HTTP cache needs stale time, GC, dedupe, retries — that’s **`HttpClient` + `resource` / RxJS cache**, not 100 `createReducer`s.

---

## 3. What I would change

### Split types

| Keep in NgRx / signal store | Move out |
|---|---|
| Wizard step, UI flags, feature toggles | Product lists, search hits |
| Optimistic overlay on cart | “Last GET /orders” blobs |
| Session **mirror** if needed | Paginated collections |

### Proper server cache

```ts
// before
this.store.dispatch(loadProductsSuccess({ products }));

// after
products = resource({
  params: () => ({ page: this.page() }),
  loader: ({ params }) => firstValueFrom(this.http.get('/api/products', { params })),
});
```

Or `HttpClient` + `shareReplay` + refresh on params. Optional: **TanStack Query Angular** / **NgRx Query-style** libs — mention, don’t require.

**Why not `createEntityAdapter` for all 100 APIs and keep them:** Normalization helps identity; **without GC you still retain the world**. Necessary, not sufficient.

### GC / caps

- Don’t persist catalogs — persist allowlisted keys only (prefs, not lists)  
- Paginate; never `concat` unbounded pages in a reducer  
- LRU / drop search cache on navigate  
- `takeUntilDestroyed` so unused HTTP isn’t written into store “just in case”

### Narrow subscriptions

```ts
// ❌
this.store.select((s) => s).subscribe((s) => (this.vm = s));

// ✅
total = this.store.selectSignal(selectCartTotal);
// or resource() — component only dirties when that data changes
```

OnPush + `selectSignal` on a **slice**.

### Dual-write then delete

Facade reads Query/resource; when UI is off the slice, **remove the reducer**. Done = slice gone, not “also HTTP.”

---

## 4. Picture

```
Before:  API → Effect → mega Store → Default CD everywhere
After:   API → HttpClient / resource (GC with the view)
         NgRx ← thin client state
         Components → selectSignal / async pipe, OnPush
```

---

## 5. Why this over that

| Option | Verdict |
|---|---|
| Keep NgRx, add more `createSelector` | Helps CD; **doesn’t** cap memory |
| Persist whole store | Usually **worse** |
| Entity adapter only | Partial |
| HttpClient / `resource` for APIs | **Correct** home |
| Move all to a root `BehaviorSubject` | Same bloat, worse DevTools |
| Context equivalent (provide giant object) | Same re-render story |

---

## 6. 60-second spoken answer

> A hundred API blobs in NgRx is an unbounded **network cache** with no TTL, so memory grows and wide selects retrigger **change detection** across the app. I’d treat that as **server state**: **HttpClient / `resource`**, keep NgRx for true **client** workflows, normalize only what must stay, `selectSignal` on thin slices, and stop persisting catalogs. Quick wins: paginate, delete dual-writes, ban `loadXSuccess` for throwaway lists.

---

## Related

- Scenario 1 — widget polling belongs in HTTP/RxJS  
- Scenario 2 — taxonomy  
- [ANGULAR_NGRX_DATA_FLOW.md](../angular-interview-prep/ANGULAR_NGRX_DATA_FLOW.md)
