# Scenario 2 — Mixed Angular State (Services, NgRx, Signals, Component Fields)

**Prompt:** An e-commerce Angular app uses `BehaviorSubject` services, NgRx, component fields, and maybe Akita/NGXS across modules. How would you standardize state and avoid duplication?

*(If they say “Context + Redux + Zustand” — same taxonomy; answer in **Angular**.)*

---

## 1. Clarify

- **Server** (products, cart from API) vs **client** (modal, wizard step)?  
- Is cart in NgRx **and** a `CartService` subject?  
- Cross-feature: Product page add-to-cart vs header badge?  
- Team size / strangler vs rewrite?

---

## 2. Diagnose — why this happened

| Module | Chose | Why |
|---|---|---|
| Legacy catalog | `providedIn` service + `BehaviorSubject` | “No NgRx boilerplate” |
| Checkout | NgRx | Complex flows, DevTools, effects |
| New search | Component signals / `signal()` in a service | Fast, Angular 16+ |

**Real problems:**

1. Two sources of truth — cart in store **and** service  
2. Inconsistent patterns — juniors don’t know where to write  
3. Root service with a giant object → **every** injection site sees new refs  
4. Default CD + mutating a subject of the whole app  
5. No taxonomy  

---

## 3. Spine of the answer

> **Standardize by state type, not “NgRx everywhere” or “signals everywhere.”**

```
1. Server state      → HttpClient cache / resource() / RTK-Query-like (optional TanStack)
2. Global client     → ONE pattern: NgRx *or* signal stores (pick one)
3. Feature/local     → component signals / fields
4. URL               → Router query params (shareable filters, page)
5. Form              → Reactive forms / signal forms — not NgRx per keystroke
```

| Kind | Angular standard | Why |
|---|---|---|
| Server lists / detail | **`HttpClient` + `resource` / `shareReplay`** | TTL via refetch; GC on destroy; not eternal store |
| Complex cross-app workflows | **NgRx** (or **NgRx SignalStore**) | Effects, DevTools, guards around checkout |
| Thin global (flags, session mirror) | **`providedIn: 'root'` signal service** | Less boilerplate than a slice |
| High-freq local UI | Component `signal` / `model()` | Don’t globalize |
| Theme / locale | DI token or small service (low churn) | Fine |
| Shareable UI | **Router** `queryParams` | Back/share |
| Forms | **ReactiveFormsModule** / signal forms | Don’t dispatch `SET_EMAIL` on each char |

---

## 4. Pick **one** global client library

| | NgRx + Effects | Signal store / root signal service |
|---|---|---|
| Checkout / order machine | **Better** | Gets messy |
| Team guardrails | Slices + lint | Easy to sprawl services |
| Bundle / learning | Heavier | Lighter |
| DevTools | Excellent | Good enough |

**Messy e-commerce with real checkout:**  
> **NgRx (or SignalStore) for client workflows + `resource`/HttpClient for server data.** Ban a second global store (no CartService subject **and** `cart` reducer).

**Why not “everything in NgRx”:** Scenario 4 — 100 APIs in the store.

**Why not component-only cart:** Header, product, checkout all need one write path → service or store, **one**.

---

## 5. Target architecture

```
┌──────────────────────────────────────────────┐
│ Features (Product, Checkout)                 │
│  component signals, @if, OnPush              │
├──────────────────────────────────────────────┤
│ Router queryParams  filters, page, sort      │
├──────────────────────────────────────────────┤
│ Server: HttpClient / resource()              │
│  products, inventory, orders                 │
├──────────────────────────────────────────────┤
│ Client global: NgRx XOR CartStore service    │
│  wizard step, flags, optimistic cart UI      │
├──────────────────────────────────────────────┤
│ Forms: FormGroup / signal forms              │
└──────────────────────────────────────────────┘
```

### ADR rules

1. API lists are **not** `createReducer` forever  
2. **Cart:** one owner (server cart via mutations + cache, or one `CartStore`)  
3. Never mirror the same entity in NgRx + `BehaviorSubject`  
4. Cross-module: `inject(CartFacade)` only — not `Store` internals in 40 files  
5. New code follows the standard; legacy strangler  

---

## 6. Avoid duplication

### Facade (anti-corruption)

```ts
@Injectable({ providedIn: 'root' })
export class CartFacade {
  readonly lines = this.store.selectSignal(selectCartLines); // or cartStore.lines
  add(sku: string) { this.store.dispatch(addLine({ sku })); }
}
```

Features `inject(CartFacade)` — swap NgRx → signal store without rewriting Product.

### IDs, not clones

Cart lines `{ productId, qty }`; product body from `resource` / HTTP cache.

### Kill sync effects

```ts
// ❌
effect(() => this.cartSubject.next(this.store.selectSignal(selectCart)()));
```

Still two sources. Migrate readers, delete one.

### ESLint

`no-restricted-imports`: no new `@ngrx/store` in `features/search` if search is HTTP-only; or ban raw `BehaviorSubject` cart.

---

## 7. Migration (strangler)

1. Inventory: key → NgRx vs service vs component  
2. ADR 1–2 pages  
3. Facades  
4. Deduplicate **cart + auth** first  
5. Freeze: no new `BehaviorSubject` for server lists  
6. Feature folders one by one  
7. Delete old store when grep is clean  

---

## 8. 60-second spoken answer

> I’d standardize by **state type**, not NgRx-for-everything. Server data lives in **HttpClient / `resource`**, not 50 reducers. We pick **one** global client store — for checkout I’d keep **NgRx** or SignalStore — and ban a parallel `CartService` subject. Local UI is **component signals**. Shareable filters go on the **router**. Forms stay **reactive**. During migration, **facade** services so Product doesn’t import store internals, then delete dual-writes. One write path per entity.

---

## Related

- Scenario 4 — NgRx as HTTP dump  
- Scenario 3 — MFE: kernel/session singleton, not three carts  
- [ANGULAR_NGRX_DATA_FLOW.md](../angular-interview-prep/ANGULAR_NGRX_DATA_FLOW.md) · [ANGULAR_SIGNALS.md](../angular-interview-prep/ANGULAR_SIGNALS.md)
