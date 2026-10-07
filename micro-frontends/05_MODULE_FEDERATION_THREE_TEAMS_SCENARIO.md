# Scenario 3 — Module Federation: Product, Checkout, User Teams

**Prompt:** Three independent teams develop Product, Checkout, and User applications using Module Federation. How would you handle shared dependencies, communication, and deployments?

**Folder index:** [INDEX.md](./INDEX.md) · **Overview:** [01_MICRO_FRONTENDS_OVERVIEW.md](./01_MICRO_FRONTENDS_OVERVIEW.md)

---

## 1. Clarify

- One shell (host) or three separately routable apps?  
- Same domain? SSO?  
- Shared design system?  
- Independent release cadence required?  
- SSR needed or SPA only?

**Assume classic pattern:** Host shell + remote MFEs (`product`, `checkout`, `user`) on Webpack/Rspack/Vite Module Federation.

---

## 2. Goals of a good MFE platform

1. Teams ship **independently**  
2. Users see **one coherent app**  
3. No “dependency hell” duplicate React / broken hooks  
4. Failures are **isolated** (Checkout down ≠ blank Product)  
5. Observability & rollback per remote  

---

## 3. Shared dependencies — the critical design

### Problem

If each remote bundles its own `react` / `react-dom`:

- Multiple Reacts → **invalid hook call**, giant bundles  
- Duplicate routers / query clients → broken context  

### Strategy: dependency tiers

| Tier | Examples | Federation treatment |
|---|---|---|
| **Singleton, required** | `react`, `react-dom`, `react-router-dom` | `shared: { react: { singleton: true, requiredVersion } }` |
| **Singleton preferred** | `@company/ui`, query client, i18n, auth SDK | singleton + strict version policy |
| **Isolated OK** | Feature-only libs (chart lib used only in Product) | bundle into that remote |
| **Never share casually** | Momentarily different major versions of everything | causes runtime chaos |

```js
// conceptual ModuleFederationPlugin share config
shared: {
  react: { singleton: true, requiredVersion: '^18.2.0', eager: false },
  'react-dom': { singleton: true, requiredVersion: '^18.2.0' },
  'react-router-dom': { singleton: true, requiredVersion: '^6.22.0' },
  '@company/ui': { singleton: true, requiredVersion: '^2.0.0' },
}
```

### Version governance (why process matters as much as config)

- **Single source of truth:** root `package.json` versions or a **versions package** / Nx/Turborepo catalog  
- **Compatible range CI:** fail PRs that drift React majors  
- **Design system versioning:** semver; remotes declare supported range  
- **Host owns singletons:** host provides React; remotes consume  

**Why singleton React over “each team free to upgrade”:**  
Independence ≠ incompatible runtimes. Freedom is at *feature* layer; platform deps are a **contract**.

**Why not share everything:**  
Over-sharing couples release trains (Checkout blocked on Product’s lodash bump). Share platform; isolate feature deps.

### Shared packages approach

Prefer an internal npm package (or Nx lib):

- `@org/ui` — buttons, dialogs  
- `@org/auth-client` — token helpers, session API  
- `@org/telemetry` — logging  
- `@org/contracts` — TypeScript types for cross-app events/APIs  

**Why contracts package over importing remote types directly:**  
Avoids circular federation coupling; types version independently.

---

## 4. Communication between MFEs

### Rule

> **Prefer URL + backend as the source of truth. Use custom events / shared bus sparingly.**

### Patterns (best → use carefully)

#### A. URL / router (best default)

```
/product/123 → add to cart → navigate /checkout
/checkout?cartId=...
```

Deep links, refresh-safe, shareable. Host owns top-level router; remotes register route fragments.

**Why over global event bus:** Debuggable, bookmarkable, survives refresh.

#### B. Backend / BFF as integration

Cart lives on server. Product calls `POST /cart`; Checkout reads `GET /cart`.  
No need for Product to “tell” Checkout in-memory.

**Why this is usually correct for e-commerce:** Cart/user are domain data, not UI whispers.

#### C. Host-mediated props / slot API

Host loads remote and passes props:

```ts
<CheckoutRemote cartId={id} onComplete={navigateToThanks} />
```

Clear contract, typed. Good for tightly composed views.

#### D. CustomEvent / tiny event bus

```ts
window.dispatchEvent(new CustomEvent('cart:updated', { detail: { cartId } }));
```

Use for **UI notifications** (badge bounce), not core business state.

**Why not Redux shared across remotes as default:**  
Shared runtime store couples deployments and versions; becomes a distributed monolith. If needed, share a thin **auth/session** store only, versioned carefully.

#### E. `postMessage` / iframe

Only for strong isolation / 3rd party. Heavier UX.

### Auth communication

- **Host acquires session** (cookie / BFF)  
- Remotes use shared `@org/auth-client` reading **httpOnly cookie** or injected token provider  
- Avoid each remote implementing login differently  

**Why cookie/BFF over stuffing JWT in `localStorage` shared bus:** XSS blast radius; see auth security guides.

---

## 5. Deployment strategy

### Independent deployability

```
Host     → CDN: shell.[hash].js + remoteEntry URLs config
Product  → CDN: product/remoteEntry.js + assets
Checkout → CDN: checkout/remoteEntry.js
User     → CDN: user/remoteEntry.js
```

Host config (runtime):

```json
{
  "product": "https://cdn.example.com/product/1.8.2/remoteEntry.js",
  "checkout": "https://cdn.example.com/checkout/2.1.0/remoteEntry.js"
}
```

**Runtime remote URLs** (not compile-time only) enable:

- Per-environment targeting  
- Gradual rollout / pin versions  
- Instant rollback by pointing config to previous remoteEntry  

### Versioning & compatibility

- Remotes expose **semver**  
- Host declares **compatibility matrix** (Checkout ≥ 2.x needs User ≥ 3.x for address book API)  
- Contract tests between remotes (Pact-like or e2e smoke)  

### Resilience

- **Lazy load remotes** with error boundaries  
- Fallback UI if Checkout remote fails to load  
- Health check `remoteEntry` in deploy pipeline  

```tsx
<ErrorBoundary fallback={<CheckoutUnavailable />}>
  <Suspense fallback={<Spinner />}>
    <CheckoutRemote />
  </Suspense>
</ErrorBoundary>
```

**Why error boundaries matter more in MFEs:** Network/CDN failure of one team shouldn’t white-screen the mall.

### CI/CD per team

| Pipeline | Owns |
|---|---|
| Product CI | build, unit, visual, publish CDN artifact + version |
| Host CI | integration smoke with **pinned** remotes + canary config |
| Contract CI | nightly: host + latest remotes e2e |

**Deploy order:** Remotes can deploy anytime if backward compatible; **breaking contract** → version bump + host config update coordinated.

**Why not one mono pipeline that always deploys all:** Kills team autonomy — the reason you adopted Federation.

---

## 6. Local development

- Host runs with remotes pointing to `localhost:3001` etc.  
- Or **dev stubs** / mocks for other remotes  
- Shared deps via `pnpm` workspace / Nx to avoid “works in prod federation only”  

---

## 7. Why this over that

| Choice | Why |
|---|---|
| Module Federation vs iframes | Better UX/integration; iframes if hostile isolation needed |
| Singleton React vs duplicate | Hooks/context correctness |
| URL+API vs shared Redux | Independence + reliability |
| Runtime remote map vs hardcoded | Rollback & canary |
| Design system package vs copy-paste CSS | Consistency without coupling app business logic |
| Eager share all deps | ❌ Slower startup, tighter coupling — share platform only |

---

## 8. Whiteboard architecture

```
                    ┌──────── Host Shell ────────┐
                    │ Router, layout, auth,      │
                    │ remote registry, telemetry │
                    └───────┬─────┬─────┬────────┘
                            │     │     │
                     federated modules (lazy)
                            │     │     │
                      Product Checkout User
                            │     │     │
                            ▼     ▼     ▼
                         Shared: React, UI kit, auth-client
                         Integration: HTTPS APIs + URL
                         Notify: optional CustomEvents
```

---

## 9. 60-second spoken answer

> I’d treat Module Federation as a **platform**: React, ReactDOM, router, and the design system are **singleton shared deps** with version governance so we don’t get dual-React bugs. Business communication prefers **URL and backend APIs** — cart/user live on the server — with host props for composition and light `CustomEvent`s only for UI chrome. Each team **deploys its remote to CDN** independently; the host loads remotes via a **runtime version map** for canary and rollback, wrapped in **Suspense + error boundaries**. We publish shared contracts as packages and run contract/e2e smoke so independence doesn’t become production roulette.

---

## Related

- Scenario 9 — org-scale architecture (MFEs as one option)  
- Scenario 10 — CI/CD details for frequent deploys  
- Scenario 2 — state: avoid a shared mega-Redux across remotes
