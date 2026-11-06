# Scenario 3 — Module Federation with Three Angular Teams

**Prompt:** Product, Checkout, and User are developed by three teams. How would you implement micro-frontends with Module Federation in **Angular**, and handle shared dependencies, routing, and versioning?

**Full MFE / Native Federation depth:** [../micro-frontends/INDEX.md](../micro-frontends/INDEX.md) · IDMS story: [../onetrust/ONETRUST_MFE_SENIOR_ROUND.md](../onetrust/ONETRUST_MFE_SENIOR_ROUND.md)

This file is the **Angular-specific** interview answer. Do not answer with React `React.lazy` remotes.

---

## 1. Clarify

- One URL (shell) vs three websites?  
- Same Angular major?  
- Shared login / cart?  
- Webpack vs **esbuild application builder** → **Native Federation** (same MF idea)

---

## 2. Angular implementation (what you actually ship)

| Piece | Angular |
|---|---|
| Pattern | **Module Federation**: host loads remotes at **runtime** |
| On Angular 17+ esbuild | **Native Federation** — ESM + import maps, `remoteEntry.json` |
| On old Webpack CLI | `ModuleFederationPlugin` — `remoteEntry.js` |
| Host | Shell: layout, router, login |
| Remotes | `expose: { './Routes': './...remote.routes.ts' }` |
| Load | `loadRemoteModule('checkout', './Routes')` in `loadChildren` |

```ts
// host app.routes.ts
{
  path: 'checkout',
  loadChildren: () =>
    loadRemoteModule('checkout', './Routes').then((m) => m.CHECKOUT_ROUTES),
}
```

**Do not say:** “Native Federation is a different architecture.”  
**Do say:** Same host/remote/expose/shared; different engine.

---

## 3. Shared dependencies (the singleton problem)

Two `@angular/core` in one tab → **broken DI**, double Zone, fat page.

```text
shared: {
  '@angular/core': { singleton: true, strictVersion: true },
  '@angular/common': { singleton: true },
  'rxjs': { singleton: true },
  '@org/kernel': { singleton: true }   // auth/session
}
```

Native Federation: **import map** remaps `@angular/core` to **one** URL.

**Why singleton Angular over “each remote bundles Angular”:** One injector tree, one router, one login. Version skew is a **contract break**, not a feature.

**Nx / monorepo:** one Angular version in the repo so remotes can’t drift. Nx does **not** load remotes; it **builds** them.

---

## 4. Routing

- **Only the host is a website.** Users don’t open `checkout.company.com` as the product (unless you chose that).  
- Host `Router`: `/product`, `/checkout`, `/user` → remote **route trees**.  
- Remotes use **`providedIn: 'root'` carefully** — prefer **kernel** for auth.  
- `withHashLocation` if static S3 (reload must hit host `index.html`).  
- Deep link `/checkout/review` → host loads checkout remote, then child route.

**Why URL integration over a shared mega-NgRx:** Teams ship independently; URL + APIs + kernel session are the contract. A global store across remotes = coupling (Scenario 2/4).

---

## 5. Versioning & deploy

```text
CDN
  host/<sha>/
  mfe/product/<sha>/remoteEntry.json
  mfe/checkout/<sha>/
  federation.manifest.json
    checkout → …/mfe/checkout/<sha>/remoteEntry.json
```

- Independent deploy: Checkout Friday **without** rebuilding Product  
- Manifest is the **runtime** version map (not npm of remotes into host)  
- **Kernel** is a lib (npm or path) **shared singleton** — bump = rebuild consumers (`nx affected`)  
- Contract tests: host + remote types for kernel API  
- Host error boundary: remote fail → fallback route, not white screen  

**Nx:** `affected` so a Product PR doesn’t compile Checkout. Deploy job **s3 sync** only that prefix (Scenario 10 + MFE CI card).

---

## 6. Why this over that

| Approach | Verdict |
|---|---|
| Three Angular versions, no singleton | ❌ Broken DI |
| iframe three apps | Isolation; **not** MF; extra memory (NUX leftover `/app`) |
| One NgRx store for all remotes | ❌ Release coupling |
| Nx without federation | Monorepo only — still one SPA unless you federate |
| Polyrepo + MF | OK later; kernel versioning is the cost |

**Chosen:**  
> Angular **Native Federation**, host router + exposed `./Routes`, **singleton Angular/RxJS/kernel**, manifest of SHA URLs, Nx for affected CI. Integrate via **URL + backend + kernel**, not a shared mega-store.

---

## 7. 60-second spoken answer

> Three teams on one Angular product: a **host** shell and **remotes** that expose route trees. At runtime the host `loadRemoteModule`s Checkout — that’s Module Federation; we use **Native Federation** because NUX is on the **esbuild** builder. **Angular, RxJS, and the auth kernel are singletons** so we don’t get two injectors. Routing stays on the host; remotes don’t import each other. Each remote deploys its own `remoteEntry` SHA and we patch one key in the manifest. Nx only decides **what to compile**. Shared state is **session in the kernel**, not a cross-remote NgRx dump.

---

## Related

- [../micro-frontends/05_MODULE_FEDERATION_THREE_TEAMS_SCENARIO.md](../micro-frontends/05_MODULE_FEDERATION_THREE_TEAMS_SCENARIO.md)  
- [../onetrust/ONETRUST_CICD_NX_MFE.md](../onetrust/ONETRUST_CICD_NX_MFE.md)
