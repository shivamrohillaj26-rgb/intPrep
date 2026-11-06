# Micro Frontends — How They Work (Interview Guide)

Deep guide: what MFEs are, how **Module Federation / Native Federation** load remotes, sharing, communication, and when **not** to use them.

**Folder index:** [INDEX.md](./INDEX.md)

**Scenario deep-dive (3 teams):** [05_MODULE_FEDERATION_THREE_TEAMS_SCENARIO.md](./05_MODULE_FEDERATION_THREE_TEAMS_SCENARIO.md)

**Very deep + break NUX IDMS into MFEs:** [02_MICRO_FRONTENDS_DEEP_NUX_BREAKUP.md](./02_MICRO_FRONTENDS_DEEP_NUX_BREAKUP.md) · **MF split plan:** [04_NUX_MODULE_FEDERATION_SPLIT_PLAN.md](./04_NUX_MODULE_FEDERATION_SPLIT_PLAN.md)

---

## Interview answers (say these first)

### 60s — “What are micro frontends?”

> Micro frontends split a large UI into **separately built and deployed** pieces owned by different teams, composed into one product for the user. Like microservices for the frontend. A **host/shell** loads **remotes** at runtime — often via **Module Federation** (Webpack) or **Native Federation** (ESM + import maps, Angular-friendly with esbuild). Teams ship independently, but must share platform dependencies carefully (one React/Angular runtime), integrate via URL and APIs first, and isolate failures so one remote can’t blank the whole app.

### 30s — “How does Module Federation work?”

> At build time each remote **exposes** modules and emits a **remoteEntry** manifest. The host doesn’t bundle those modules; at runtime it loads the remote entry, then dynamic-imports the exposed module. **Shared** libs (React/Angular) are declared so the browser downloads them once as singletons.

---

## 1. Problem MFEs solve

| Monolith FE pain | MFE promise |
|---|---|
| One repo, one release train | Teams deploy on their own cadence |
| Huge bundle / slow CI | Smaller apps, parallel builds |
| Org scaling (many squads) | Clear ownership boundaries |
| Rewrite risk | Strangle legacy app piece by piece |

**Not a goal by itself:** “cool architecture.” Goal = **independent delivery** without destroying UX consistency.

---

## 2. Core vocabulary

| Term | Meaning |
|---|---|
| **Host / shell** | App that loads remotes (layout, router, auth chrome) |
| **Remote / MFE** | Separately deployed app exposing features |
| **Expose** | Module path remote publishes (`./CheckoutPage`) |
| **Remote entry** | Metadata JS/JSON telling host how to load remote |
| **Shared dependency** | Library loaded once (singleton) across host+remotes |
| **Composition** | How remotes appear in one UI (routes, slots, iframes…) |

```text
┌─────────────────────────────────────────┐
│  HOST (shell)                           │
│   header / auth / router                │
│   ┌─────────┐ ┌─────────┐ ┌──────────┐  │
│   │ product │ │checkout │ │  user    │  │  ← remotes loaded at runtime
│   │ remote  │ │ remote  │ │  remote  │  │
│   └─────────┘ └─────────┘ └──────────┘  │
└─────────────────────────────────────────┘
         ▲              ▲
         │ remoteEntry  │
    CDN/deploy of each remote (independent)
```

---

## 3. Composition approaches (not only Federation)

| Approach | How | Pros | Cons |
|---|---|---|---|
| **Build-time monolith / monorepo libs** | Nx libs, import at compile | Simple DX, type-safe | Coupled deploy unless you still ship one app |
| **Module Federation** | Runtime load remotes (Webpack/Rspack) | True independent deploy | Shared-dep complexity |
| **Native Federation** | Same mental model via **ESM + import maps** | Works with Angular **esbuild** application builder | Newer ops learning curve |
| **iframes** | Strong isolation | Easy sandbox | UX/perf/SEO pain, awkward routing |
| **Web Components** | Custom elements as borders | Framework-agnostic | Design-system + sizing discipline |
| **Edge / SSI / reverse proxy compose** | Server stitches HTML | Simple for pages | Less SPA cohesion |
| **Import maps only** | Browser maps bare specifiers | Standards-based | Need conventions + tooling |

**Interview clarity:**

> Monorepo ≠ micro frontends. You can have Nx monorepo **without** runtime federation. MFEs specifically mean **runtime composition of independently deployed frontends**.

---

## 4. How Module Federation works (step by step)

### Build time (remote)

1. Remote app builds as usual  
2. Federation plugin marks **exposes** (e.g. `./Routes`, `./Widget`)  
3. Emits **`remoteEntry.js`** (or equivalent) describing those exposes + shared deps  

### Build time (host)

1. Host declares remotes (URL or name → entry) — static or runtime manifest  
2. Host code uses dynamic import / `loadRemoteModule` instead of static import of remote source  
3. Host **does not** compile remote feature code into its main bundle  

### Runtime

```text
1. User opens host
2. Host boots (auth, shell)
3. User navigates to /checkout
4. Host fetches remoteEntry from checkout CDN
5. Federation runtime resolves shared singletons (react/angular already present?)
6. Host imports exposed ./CheckoutPage
7. Component renders inside shell router outlet
```

**Key insight:**

> Remotes are **lazy-loaded deployments**, not npm packages installed into the host (though you can mix patterns).

### Conceptual config (Webpack-style)

```js
// remote
new ModuleFederationPlugin({
  name: 'checkout',
  filename: 'remoteEntry.js',
  exposes: {
    './Checkout': './src/app/checkout/checkout.routes.ts',
  },
  shared: {
    react: { singleton: true, requiredVersion: '^18.2.0' },
    'react-dom': { singleton: true, requiredVersion: '^18.2.0' },
  },
});

// host
new ModuleFederationPlugin({
  name: 'shell',
  remotes: {
    checkout: 'checkout@https://cdn.example.com/checkout/remoteEntry.js',
  },
  shared: { /* same singletons */ },
});
```

### Angular today — Native Federation

Webpack MF still exists historically. With **application builder / esbuild**, teams often use **Native Federation** (`@angular-architects/native-federation`):

- Same host/remote/shared mental model  
- Uses **import maps** + ESM  
- Integrates with Angular’s modern builder; SSR/hydration support improving  

```ts
// host route — conceptual
{
  path: 'flights',
  loadComponent: () =>
    loadRemoteModule('mfe1', './Component').then((m) => m.AppComponent),
}
```

**Say in interview:**

> On modern Angular I’d reach for Native Federation rather than forcing Webpack-only Module Federation, unless the estate is already Webpack MF.

**Deep comparison:** [07_NATIVE_VS_MODULE_FEDERATION.md](./07_NATIVE_VS_MODULE_FEDERATION.md)

---

## 5. Shared dependencies — the make-or-break design

### Why sharing exists

If every remote bundles its own Angular/React:

- Duplicate framework → huge bytes  
- Two Reacts → **invalid hook call** / broken DI assumptions  

### Tiers

| Tier | Examples | Rule |
|---|---|---|
| Singleton required | `react`, `react-dom`, `@angular/core` | One copy; version contract |
| Singleton preferred | design system, auth SDK, router | Host-owned |
| Bundle into remote | niche chart lib | Don’t force global share |
| Never “share everything” | random utilities | Over-coupling |

**Governance:** version catalog, CI fails on illegal major drift, design system semver.

---

## 6. Communication between MFEs

**Preference order (senior answer):**

1. **URL / router state** — bookmarkable, refresh-safe  
2. **Backend / BFF** — cart, user, decisions live on server  
3. **Host props / typed contract** — shell passes inputs/outputs  
4. **CustomEvent bus** — UI toasts/badges only  
5. **Shared global Redux across remotes** — avoid (distributed monolith)

```text
Product --POST /cart--> API --GET /cart--> Checkout
         (not Product.eventBus.emit('add'))
```

Deep patterns: [05 three-team scenario](./05_MODULE_FEDERATION_THREE_TEAMS_SCENARIO.md).

---

## 7. Auth, routing, CSS, failures

| Concern | Approach |
|---|---|
| **Auth** | Host owns login/session; remotes read token via shared auth lib / HttpInterceptor; never N logins |
| **Routing** | Host owns top-level paths; remotes own child routes |
| **CSS** | Design tokens + namespacing; avoid global CSS wars; Shadow DOM only if WC |
| **Failure isolation** | `loadRemote` error → fallback UI; Checkout down ≠ kill Product |
| **Observability** | Per-remote version in logs; mark errors with `remote=checkout@1.4.2` |
| **Rollback** | Point host manifest to previous remoteEntry URL |

---

## 8. Deployment topology

```text
shell.example.com     → shell assets + federation.manifest.json
cdn/.../product/      → product remoteEntry + chunks
cdn/.../checkout/     → checkout remoteEntry + chunks
```

**Runtime manifest** (dynamic host) lets you change remote URLs without rebuilding shell — powerful for progressive rollout.

---

## 9. When to use MFEs vs when not

### Use when

- Multiple teams need **independent release**  
- Clear domain boundaries (Product / Checkout / Admin)  
- Org already feels monolith FE pain  
- You can invest in **platform team** (sharing, CI, design system)

### Avoid when

- Small team / one squad  
- Early product still finding shape  
- You only wanted “smaller bundles” → try **lazy routes** first  
- No appetite for version governance  

**Spoken:**

> Micro frontends are an **org scaling** tool. For a single team I’d start with a modular Angular monolith and lazy loading. I’d introduce federation when release coupling becomes the bottleneck.

---

## 10. MFEs vs related ideas

| Idea | Difference |
|---|---|
| **Microservices** | Backend deploy units; MFE is UI deploy units |
| **Lazy loaded routes** | Same deployable; split download only |
| **npm design system** | Shared library, still one app deploy |
| **iframes** | Process isolation, weak integration |
| **Module Federation** | Technology to implement MFE runtime compose |

---

## 11. Interview Q bank

**Q: Monorepo or polyrepo for MFEs?**  
> Either. Monorepo helps shared libs/CI; polyrepo maximizes team autonomy. Federation works with both.

**Q: Can remotes use different Angular majors?**  
> Painful. Prefer aligned majors; multi-version needs careful isolation (often Web Components bridge). Don’t sell as easy.

**Q: How do you share state?**  
> Don’t share a giant store. URL + server. Thin shared session at most.

**Q: SEO with MFEs?**  
> Harder. Public marketing often separate SSG site; federated SPAs for app shell. SSR + federation is advanced (Native Federation improving SSR support).

**Q: Biggest MFE failure mode?**  
> Dependency hell + chatty cross-remote events + no fallback when remoteEntry 404s.

**Q: Angular path?**  
> Native Federation + application builder; or classic Webpack MF if legacy.

---

## 12. Mini architecture sketch (say + draw)

```text
Shell (auth, layout, manifest)
  /products/*   → product remote
  /checkout/*   → checkout remote
  /user/*       → user remote
Shared: @angular/core (singleton), @acme/ui, @acme/auth
Integrate: REST/BFF + router; events only for toasts
Deploy: independent CDN paths; manifest pins versions
```

---

## 13. Cheat sheet

```text
MFE = independently deployed UI + runtime compose
Host loads remotes via remoteEntry
Share frameworks as singletons
Integrate via URL + API first
Isolate failures + version in telemetry
Use when teams/releases demand it — not for vanity
Angular modern → Native Federation (ESM/import maps)
```

---

## 14. Practice checklist

- [ ] Define host/remote/shared in 20s  
- [ ] Explain runtime load sequence  
- [ ] Name 4 composition styles + when iframe is OK  
- [ ] Dependency tier table from memory  
- [ ] Communication preference order  
- [ ] “When I would *not* use MFEs”  

---

## Related

| Topic | File |
|---|---|
| Product/Checkout/User scenario | [05_MODULE_FEDERATION_THREE_TEAMS_SCENARIO.md](./05_MODULE_FEDERATION_THREE_TEAMS_SCENARIO.md) |
| Scale monolith | [../scenario-based-questions/09_SCALE_MONOLITH_TO_MILLIONS.md](../scenario-based-questions/09_SCALE_MONOLITH_TO_MILLIONS.md) |
| Bundles / lazy | [../frontend-system-design/02_BUNDLE_OPTIMIZATION_CODE_SPLITTING_LAZY_LOADING.md](../frontend-system-design/02_BUNDLE_OPTIMIZATION_CODE_SPLITTING_LAZY_LOADING.md) |
| Rendering modes | [../frontend-system-design/14_SSR_CSR_SSG_HYDRATION.md](../frontend-system-design/14_SSR_CSR_SSG_HYDRATION.md) |
