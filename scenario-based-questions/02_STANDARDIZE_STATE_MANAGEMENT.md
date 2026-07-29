# Scenario 2 — Context + Redux Toolkit + Zustand Across Modules

**Prompt:** An e-commerce application uses Context API, Redux Toolkit, and Zustand across different modules. How would you standardize state management and avoid duplication?

---

## 1. Clarify

- Which state is **server** (products, cart from API) vs **client** (UI toggles, wizard step)?  
- Who owns cart today — three copies?  
- Cross-module needs (Product page adds to cart used by Checkout header)?  
- Team size / appetite for migration vs big-bang rewrite?

---

## 2. Diagnose — why this happened

This is usually **organic growth**, not malice:

| Module | Chose | Why teams pick it |
|---|---|---|
| Legacy catalog | Context | “No deps”, simple theme/auth |
| Checkout | Redux Toolkit | Complex flows, time-travel, middleware |
| New search UI | Zustand | Fast, less boilerplate |

**Real problems:**

1. **Duplicated sources of truth** — cart in Redux *and* Zustand  
2. **Inconsistent patterns** — hard onboarding, bugs in sync layers  
3. **Prop/context drilling + global stores** mixed → unpredictable renders  
4. **Overusing Context for high-frequency state** → broad re-renders  
5. **No taxonomy** — nobody agrees what belongs where  

---

## 3. Standardization principle (the answer’s spine)

> **Standardize by state type, not by forcing one library for everything.**

### State taxonomy (draw this)

```
1. Server state      → cache of remote data (products, orders, user profile)
2. Global client state → cross-cutting session UX (auth session mirror, feature flags, cart draft?)
3. Feature/local state → one feature’s UI (modal open, selected tab, filters)
4. URL state         → shareable filters, pagination, product id
5. Form state        → ephemeral field values (checkout address form)
```

| Kind | Standard tool | Why |
|---|---|---|
| Server state | **TanStack Query** or **RTK Query** | Cache, dedupe, invalidation |
| Complex cross-app client workflows | **One** global store: **Redux Toolkit *or* Zustand** (pick one) | Single pattern |
| High-freq local UI | Component `useState` / Zustand **feature store** | Avoid global noise |
| Truly rare global (theme, locale) | Context **or** tiny store | Context OK if low frequency |
| Shareable UI state | **URL** (search params) | Back/forward, share links |
| Forms | React Hook Form (or Formik) | Don’t dump field keystrokes into Redux |

---

## 4. Decision: Redux Toolkit vs Zustand as the *one* client store

You must pick **one primary** client library for shared client state.

| | Redux Toolkit | Zustand |
|---|---|---|
| Boilerplate | Higher (slices, but RTK is fine) | Lowest |
| DevTools / traceability | Excellent | Good (less structured) |
| Middleware / side-effect ecosystem | Mature (listeners, saga if needed) | Simple; DIY more |
| Large teams / enterprise audits | Often preferred | Great for product speed |
| Bundle / learning curve | Heavier | Lighter |

**My recommendation for a messy e-commerce with Checkout complexity:**

> Pick **Redux Toolkit + RTK Query** as the platform standard if checkout/order flows are complex and many mid-level engineers need guardrails.  
> Pick **Zustand + TanStack Query** if the team values speed and most “global” state is thin.

**Why not keep both Redux and Zustand long-term:**  
Two global stores = two mental models + sync bugs (“cart updated in Zustand, header reads Redux”). Standardization’s point is **one write path**.

**Why not Context for cart:**  
Cart updates frequently and is read in header, product, checkout → Context value changes re-render large trees unless carefully split. Store + selectors scale better.

---

## 5. Target architecture

```
┌──────────────────────────────────────────────┐
│ UI Features (Product, Checkout, Account)     │
│  local useState / feature Zustand slice      │
├──────────────────────────────────────────────┤
│ URL (nuqs / router search params)            │
│  filters, sort, page, deep links             │
├──────────────────────────────────────────────┤
│ Server state: RTK Query / TanStack Query     │
│  products, inventory, orders, profile        │
├──────────────────────────────────────────────┤
│ Client global store: RTK *or* Zustand (ONE)  │
│  auth UI session, cart optimistic UI,        │
│  feature flags, checkout wizard step         │
├──────────────────────────────────────────────┤
│ Context (narrow): Theme, I18n — low churn    │
└──────────────────────────────────────────────┘
```

### Ownership rules (write them as an ADR)

1. **No API response lists as permanent Redux forever** — query cache owns server data  
2. **Cart:** one owner  
   - Prefer server-backed cart (user id) via query + mutations  
   - Guest cart: one store slice or `localStorage` synced module  
3. **Never mirror the same entity in Context + Redux + Zustand**  
4. **Cross-module read** only through public selectors / hooks (`useCart()`, `useAuth()`)  
5. **New code** must use the standard; legacy gets strangler migration  

---

## 6. Avoiding duplication — practical tactics

### A. Facade hooks (anti-corruption layer during migration)

```ts
// app/state/cart.ts — ONLY public API
export function useCart() {
  // today may read Zustand; tomorrow RTK — callers unchanged
  return useCartStore();
}

export function useAddToCart() {
  return useCartStore((s) => s.add);
}
```

Modules import **facades**, not raw `useContext` / `useSelector` / `useStore` everywhere.

### B. Entity IDs, not deep clones

```ts
// bad: product copied into cart AND catalog caches as full fat objects
// good: cart lines = { productId, qty }; product details from query cache
```

### C. Kill sync effects

```ts
// ❌
useEffect(() => {
  zustandSetCart(reduxCart);
}, [reduxCart]);
```

If you need this, you still have two sources of truth. Migrate readers, then delete one.

### D. Lint / architecture tests

- ESLint `no-restricted-imports` — ban new `zustand` imports outside `features/*` if RTK is standard (or reverse)  
- CI check: only one store package for global state  

---

## 7. Migration strategy (strangler)

**Do not** “rewrite state management in one sprint.”

1. **Inventory** — spreadsheet: state key → library → owners → duplicates  
2. **Pick standards** — publish short ADR (1–2 pages)  
3. **Facades** — wrap existing access  
4. **Deduplicate hot paths first** — cart, auth, price  
5. **Freeze legacy** — no new Context for server data  
6. **Migrate module by module** — Product → Checkout → User  
7. **Delete** old store when zero imports (prove with grep/CI)  

**Why strangler over big bang:** Production risk; e-commerce checkout bugs = lost revenue. Incremental keeps rollback.

---

## 8. Why this over that

| Approach | Why I’d avoid / choose |
|---|---|
| “Everything in Redux” | Overkill for local UI; store bloat (Scenario 4) |
| “Everything in Context” | Re-render & scaling pain for cart/search |
| “Keep all three forever with docs” | Docs don’t stop duplication; CI + facades do |
| TanStack Query + one client store | Best balance for e-commerce |
| Event bus between stores | Hides dual ownership; last resort only in MFEs |

---

## 9. 60-second spoken answer

> I’d standardize by **state category**, not by religiously forcing one library onto every line of UI state. Server data moves to **RTK Query or TanStack Query**. We pick **one** global client store — for a complex checkout I’d usually choose **Redux Toolkit**; for a leaner stack **Zustand** — and ban a second global store. Context stays only for low-frequency concerns like theme/i18n. URL owns shareable filters. During migration I expose **facade hooks** (`useCart`) so modules don’t couple to implementations, inventory duplicates, migrate cart/auth first, and enforce with lint. The goal is one write path per entity — no Redux↔Zustand sync effects.

---

## Related

- Scenario 4 — Redux used as a dumping ground for API data  
- Scenario 3 — Module Federation makes “one store” harder (cross-app contracts)
