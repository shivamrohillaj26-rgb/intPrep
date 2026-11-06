# Angular SSR (Server-Side Rendering)

**Scope:** How SSR works **in Angular** (`@angular/ssr`, hydration, TransferState, pitfalls).  
**General CSR/SSR/SSG theory:** [../frontend-system-design/14_SSR_CSR_SSG_HYDRATION.md](../frontend-system-design/14_SSR_CSR_SSG_HYDRATION.md)

---

## 0. Spoken answers

### 45s — “How does SSR work in Angular?”

> Angular SSR runs the app on **Node** for each request (or at build for prerender), renders templates to HTML, and sends that HTML to the browser so content appears before/without waiting for the full client bootstrap. Then the browser downloads the Angular bundles and **hydrates** — attaches listeners and change detection to the existing DOM instead of wiping and re-creating it. We use `provideClientHydration()`, keep browser-only APIs out of the first server render, and often use **TransferState** so the client doesn’t refetch the same API the server already called. For an authenticated dashboard like IDMS I’d usually stay **CSR**; I’d use SSR/prerender for public marketing or SEO pages.

### 20s — “SSR vs CSR in Angular?”

> CSR = empty shell + JS builds UI in the browser. SSR = server returns real HTML first, then hydrate. Same Angular components; different first paint path.

---

## 1. What Angular SSR is

Older name: **Angular Universal**. Today: **`@angular/ssr`** + Angular CLI application builder.

| Piece | Role |
|---|---|
| **Browser build** | Normal client bundles (`main.js`, lazy chunks) |
| **Server build** | App compiled to run in Node (`server.ts` / Express) |
| **HTML response** | Server executes components → string of HTML |
| **Hydration** | Client reuses that DOM and becomes interactive |

```text
Request  →  Node (Angular server app)
              │  resolve route, run components, call APIs
              ▼
         HTML with content
              │
              ▼
Browser paints HTML  →  downloads JS  →  hydrate  →  SPA navigation after that
```

---

## 2. Enable it (what you’d do)

```bash
ng add @angular/ssr
```

Typical outcomes:

- `src/server.ts` (or similar) — Express/Node entry that renders the Angular app
- `app.config.server.ts` — server providers
- Client config gets hydration providers
- `angular.json` — SSR / prerender targets

Dev:

```bash
ng serve          # often SSR-aware in modern CLI
# or
npm run serve:ssr
```

Prod idea: Node process (or serverless adapter) serves SSR; static assets on CDN.

---

## 3. Request lifecycle (interview detail)

1. User hits `/products/42`.
2. Node receives request → Angular **server** platform boots for that request.
3. Router activates the route; components render; `HttpClient` may run on server.
4. Angular serializes the view to HTML (+ inline transfer state if configured).
5. Response: full HTML document.
6. Browser shows content (good for LCP / SEO / crawlers).
7. Browser loads JS → `bootstrapApplication` + **`provideClientHydration()`**.
8. Hydration matches DOM; event replay / listeners attach; app becomes a normal SPA for further navigations (unless you SSR every navigation — usually you don’t need to).

**After first load:** client-side routing often continues as CSR (faster). SSR mainly helps the **first** document (and hard refresh).

---

## 4. Hydration in Angular

### Why hydration

Without it: server HTML → client bootstraps → **destroys and rebuilds** DOM → flicker, wasted work.  
With it: client **reuses** server DOM.

### Enable (modern)

```ts
import { provideClientHydration } from '@angular/platform-browser';

export const appConfig: ApplicationConfig = {
  providers: [
    provideRouter(routes),
    provideClientHydration(), // core for SSR apps
  ],
};
```

Related ideas (versions evolve — see [ANGULAR_VERSION_FEATURES.md](./ANGULAR_VERSION_FEATURES.md)):

| Concept | Meaning |
|---|---|
| **Non-destructive hydration** | Don’t wipe server DOM |
| **Event replay** | Clicks during load aren’t lost |
| **Incremental hydration** | Hydrate parts of the page later (less JS before interactive) |

---

## 5. TransferState — don’t double-fetch

Server already called `/api/product/42`. Client shouldn’t call it again blindly.

**Idea:** server puts response into **TransferState** → HTML embeds it → client reads and skips refetch (or uses as initial data).

```ts
// Conceptual pattern
import { TransferState, makeStateKey, inject, PLATFORM_ID } from '@angular/core';
import { isPlatformServer } from '@angular/common';

const PRODUCT_KEY = makeStateKey<Product>('product-42');

// On server: after HTTP, transferState.set(PRODUCT_KEY, data)
// On browser: const cached = transferState.get(PRODUCT_KEY, null)
```

With `HttpClient` + hydration, Angular can **auto-transfer** many HTTP responses when hydration is on — know the concept even if you don’t memorize every API.

**Spoken:** “TransferState avoids the client repeating the same API the server used to render HTML.”

---

## 6. Browser-only code (biggest SSR footgun)

On the **server** there is **no** `window`, `document`, `localStorage`, `navigator` (as you expect).

### Bad

```ts
ngOnInit() {
  const w = window.innerWidth; // 💥 crashes SSR
}
```

### Good patterns

```ts
import { afterNextRender, inject, PLATFORM_ID } from '@angular/core';
import { isPlatformBrowser } from '@angular/common';

export class ChartComponent {
  private readonly platformId = inject(PLATFORM_ID);

  constructor() {
    afterNextRender(() => {
      // runs only in the browser, after render
      this.initChart(window.innerWidth);
    });
  }

  // or:
  loadPrefs() {
    if (isPlatformBrowser(this.platformId)) {
      return localStorage.getItem('theme');
    }
    return null;
  }
}
```

| API | Use when |
|---|---|
| `isPlatformBrowser` / `isPlatformServer` | Branch logic |
| `afterNextRender` / `afterRender` | DOM / browser APIs after paint |
| Lazy dynamic `import()` of chart libs | Keep heavy browser libs off server bundle when possible |

---

## 7. Hydration mismatch

Server HTML must match the client’s **first** render.

| Cause | Example |
|---|---|
| Non-deterministic values | `Date.now()`, `Math.random()` in template |
| Timezone / locale differences | Formatting dates differently on Node vs browser |
| `window` branching that changes DOM | Server renders A, client renders B |
| Auth-only UI on server without cookie | Server shows logged-out, client shows logged-in |

**Debug:** View Page Source (server HTML) vs Elements after load; watch console for hydration errors.

**Fix:** Same data on both sides (TransferState / cookies forwarded to server), defer browser-only UI with `afterNextRender`, avoid random IDs in first paint.

---

## 8. SSR vs prerender (SSG) in Angular CLI

| Mode | When HTML is built | Good for |
|---|---|---|
| **SSR** | **Per request** on Node | Personalized public pages, frequently changing SEO content |
| **Prerender** | **At build time** (crawl routes) | Marketing, docs, blog — CDN static files |

```text
Prerender ≈ SSG for Angular routes you list/discover
SSR      ≈ Node renders on each HTTP request
```

Many “SSR” Angular setups are **hybrid**: prerender marketing routes, CSR or SSR for app routes.

---

## 9. When to use SSR in Angular (decision)

| App type | Recommendation |
|---|---|
| **IDMS / authenticated dashboard** | Usually **CSR** — SEO irrelevant, auth/session heavy, MF/shell already complex |
| Public marketing / docs | **Prerender / SSR** |
| Product page needing OG + SEO | **SSR or prerender** |
| Micro frontends | SSR is **harder** (host + remotes must agree on server render) — often CSR host |

**Spoken for Netradyne/IDMS:**  
“Our main product is an authenticated SPA — CSR is the right default. If we needed public SEO pages, I’d prerender or SSR those routes separately, not force the whole IDMS shell through SSR.”

---

## 10. SSR + Module Federation (awareness)

- Host SSR must know how to load remotes on the **server** (or only SSR host shell and CSR remotes).
- Shared auth / `window` assumptions break easily.
- Many teams: **CSR federation** for the app; **SSR/prerender** only for a separate marketing site.

Don’t claim “we SSR every MFE” unless you’ve designed it.

---

## 11. Performance checklist

| Lever | Why |
|---|---|
| Cache HTML / CDN at edge (careful with private data) | Cut Node load |
| TransferState / HTTP transfer cache | No double fetch |
| Incremental / deferred hydration | Faster TTI |
| Don’t SSR private dashboards into shared caches | Security |
| Fast APIs on server path | SSR TTFB = your backend |
| Lazy routes still help after hydrate | Smaller client JS |

---

## 12. Mini code map (mental)

```text
Browser                          Server (Node)
───────                          ─────────────
app.config.ts                    app.config.server.ts
  provideClientHydration()         provideServerRendering() …
main.ts → bootstrap              server.ts → express → render
                                 angular.json ssr/prerender targets
```

---

## 13. Interview Q bank

**Q: Is Angular SSR the same as Universal?**  
> Universal was the old brand; today it’s `@angular/ssr` in the CLI — same job.

**Q: Does SSR replace the need for JS?**  
> No. SSR sends HTML for first paint; hydration still needs JS for interactivity.

**Q: Why is my SSR page blank of data?**  
> API failed on server, or you used `window` and crashed render, or auth cookie not forwarded to Node.

**Q: CSR after SSR?**  
> Yes — first document SSR, then client navigations often CSR.

**Q: TransferState vs localStorage?**  
> TransferState is **one-time** server→client handoff in the HTML payload, not persistent browser storage.

**Q: IDMS need SSR?**  
> Typically no for the logged-in app; yes/prerender for public marketing if any.

---

## 14. Cheat sheet

```text
@angular/ssr     = run Angular on Node → HTML
Hydration        = reuse that HTML in the browser
TransferState    = pass server-fetched data to client
afterNextRender  = browser-only work
Prerender        = SSG at build
Dashboard/IDMS   = usually CSR
Marketing/SEO    = prerender or SSR
```

---

## Related

| Topic | File |
|---|---|
| CSR / SSR / SSG overview | [../frontend-system-design/14_SSR_CSR_SSG_HYDRATION.md](../frontend-system-design/14_SSR_CSR_SSG_HYDRATION.md) |
| SEO scenario | [../scenario-based-questions/07_SEO_RENDERING_STRATEGIES.md](../scenario-based-questions/07_SEO_RENDERING_STRATEGIES.md) |
| Version timeline (hydration) | [ANGULAR_VERSION_FEATURES.md](./ANGULAR_VERSION_FEATURES.md) |
| `afterNextRender` / lifecycle | [ANGULAR_LIFECYCLE.md](./ANGULAR_LIFECYCLE.md) |
| Angular vs Next | [WHY_ANGULAR_VS_REACT_NEXT.md](./WHY_ANGULAR_VS_REACT_NEXT.md) |
