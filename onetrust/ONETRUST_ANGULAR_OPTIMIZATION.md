# Angular optimization — R3 architecture card

**Use this if they ask:** “How would you optimize this Angular app?” · “Bundle is huge, what do you do?” · “Dashboard feels slow.” · “How does MFE / Nx help performance?”

**Do not say:** laptop folder names · that SSR is how we speed NUX · that Nx makes the **browser** faster.

**Deep dives:** [ANGULAR_OPTIMIZE_APPLICATION.md](../angular-interview-prep/ANGULAR_OPTIMIZE_APPLICATION.md) · [CD / OnPush](../angular-interview-prep/ANGULAR_CHANGE_DETECTION_ONPUSH_ZONELESS.md) · [virtual scroll (NUX)](./ONETRUST_INFINITE_VIRTUAL_SCROLL.md) · [bundles](../frontend-system-design/02_BUNDLE_OPTIMIZATION_CODE_SPLITTING_LAZY_LOADING.md) · [MFE](./ONETRUST_MFE_SENIOR_ROUND.md)

---

## 0. Open like an architect (~45s)

> I don’t start with OnPush. I split **load** (how much JS, when), **runtime** (change detection + DOM), **data**, and **memory**. I measure — Lighthouse / Web Vitals, Network + coverage, source-map explorer, Angular DevTools profiler — because a 2MB `main.js` is not the same bug as a 10k-row table. On IDMS NUX the first-load problem is the **monolith dashboard**: every domain’s JS is in one zip. Conversion is lazy **routes** today and **Native Federation remotes** next so Safety JS is not even downloaded until that route. Runtime we already virtual-scroll heavy lists. I would not add SSR to an authenticated fleet dashboard.

```text
1. What hurts?   blank screen / typing jank / tab dies after 1h
2. Measure
3. Biggest lever first   (usually initial JS, then lists, then CD)
4. Prove               budgets + before/after
```

---

## 1. Master list — problem → lever → how

| # | Problem the user feels | Lever | How it helps | NUX / IDMS |
|---|---|---|---|---|
| 1 | Long blank screen, bad LCP/TTI | **Lazy routes** (`loadComponent` / `loadChildren`) | Admin/maps/charts **not** in `main.js`. Less download + parse on first paint. | Feature pages after login; **not** the first shell |
| 2 | Route is light but a widget is huge | **`@defer (on viewport / idle)`** | Chart.js / map chunk loads when visible. Placeholder → less CLS. | Below-fold widgets, not the primary table |
| 3 | `main.js` includes unused lib code | **Tree-shaking** (ESM + production AOT) | Dead exports never marked → swept from the graph. Named imports, no `import *` barrels. | esbuild application builder already minifies |
| 4 | Someone added a fat lib to the shell | **`angular.json` budgets** | CI **fails** when initial bundle grows. Does not speed today; **stops regression**. | Put on host **and** each remote later |
| 5 | Whole dashboard recompiles / re-ships for a Devices fix | **MFE remotes** (Native Federation) | Browser **never downloads** Safety JS on a Devices visit. Independent SHA on CDN. | Conversion target; prod is still one SPA |
| 6 | Two copies of Angular in the tab | **Shared singleton** (import map / MF share) | One `@angular/core`, one injector. Smaller + CD/DI not broken. | Kernel + Angular shared from host |
| 7 | Every PR rebuilds 7 apps (CI, not browser) | **Nx `affected`** | Faster **pipeline**, not smaller `main.js`. | GHA + Jenkins BUILD — [CI/CD card](./ONETRUST_CICD_NX_MFE.md) |
| 8 | LCP is an image, not JS | **`NgOptimizedImage`** (`ngSrc`, `priority`, sizes) | Right bytes, early fetch, reserved space (CLS). | Logos / map tiles if they dominate LCP |
| 9 | Same JS re-downloaded every visit | **Hashed filenames + CDN cache** | `main.abc12.js` → `Cache-Control: immutable`. HTML `no-cache`. | Jenkins already hashes; CDN per env |
| 10 | HTTP/1 queueing many chunks | **HTTP/2 / HTTP/3** | Multiplex on one connection. Lazy chunks don’t block as badly. | CDN; not an Angular API |
| 11 | Typing in header re-checks 500 rows | **`OnPush`** on rows/cards | Skip subtree unless input ref / event / signal. | Pair with immutable inputs |
| 12 | OnPush “did nothing” | **Stable input refs** / signals | `[user]="{...}"` or `getRows()` new array every CD → OnPush always dirty. | Classic trap |
| 13 | Zone timers walk the whole app | **Signals + zoneless** | Dirty **consumers**, not every `setTimeout`. | Migrate OnPush first on legacy |
| 14 | `{{ format(row) }}` on 1k rows | **No functions in templates** | Runs **every CD**. Move to `computed` / pure pipe / precompute. | [template CD](../angular-interview-prep/ANGULAR_TEMPLATE_FUNCTIONS_CD.md) |
| 15 | Filter/sort rebuilds all `<tr>` | **`@for (row of rows; track row.id)`** | Reuse DOM nodes by id. OnPush skips **checks**; `track` skips **recreate**. | Use **both** on hot lists |
| 16 | 10k rows, tab crawls | **CDK virtual scroll** | ~20–30 DOM nodes. Layout/paint/memory drop. | **NUX: CDK** on greenzone / pickers; PrimeNG `[virtualScroll]` on big dropdowns |
| 17 | Infinite API vs huge DOM | Don’t mix them | Infinite = **fetch next page**. Virtual = **window DOM**. Can combine. | All-alerts: IntersectionObserver load-more |
| 18 | Search fires 20 HTTP calls | **`debounceTime` + `switchMap`** | Wait for pause; **cancel** stale request. | Typeahead / alert filters |
| 19 | Same API from 5 widgets | **`shareReplay({bufferSize:1, refCount:true})`** / store | One network + one `JSON.parse`. | Session, tenant, lookups |
| 20 | 2MB JSON table | **Paginate / column select / gzip** | Less transfer + less main-thread parse. | Devices / alerts APIs |
| 21 | Polling melts battery / QA | **Push (FCM)** or backoff + `takeUntilDestroyed` | Bell is **FCM**, not `interval` WebSocket. | [notifications](./ONETRUST_NOTIFICATIONS_FCM.md) |
| 22 | Tab dies after an hour | **Unsubscribe / DestroyRef** | Leaked subs + `setInterval` + open WS keep destroyed pages in heap → GC jank. | `takeUntilDestroyed` |
| 23 | CPU-heavy CSV / huge `JSON.parse` | **Web Worker** | Main thread stays free for CD/input. | Rare; never in `ngDoCheck` |
| 24 | Public marketing first paint | **SSR / prerender** | HTML before JS. | **Not** logged-in IDMS. CSR + lazy. |
| 25 | Fonts / CSS block paint | **`font-display: swap`**, critical CSS, no unused global CSS | Faster first text; less unused CSS. | Component styles already scoped |
| 26 | Third-party map in `app.config` | **Don’t provide fat libs at root** | `providedIn` unused can still shake; **eager `providers: []` cannot**. | Keep kernel skinny |
| 27 | Duplicate polyfills / old browsers | **Modern `browserslist`** | Drop IE polyfills if you don’t support them. | Node 22 / modern Chrome fleet |
| 28 | i18n ships every locale | **Load locale you need** | Don’t put 12 JSON packs on the critical path. | NUX i18n pipeline exists — [glossary](./ONETRUST_NUX_I18N_GLOSSARY.md) |
| 29 | Leftover `/app` iframe double-load | **Nativize / Federation** | Two SPAs = two bundles. Conversion removes that tax over time. | Don’t call iframe “optimization” |
| 30 | Preconnect delay to API/CDN | **`<link rel="preconnect">`** | TCP/TLS earlier. Tiny win after JS size. | CDN + auth host |

---

## 2. Decreasing the **bundle** (they will ask this)

Draw this:

```text
  source  →  tree-shake  →  split  →  minify/hash  →  compress (br/gzip)  →  CDN cache
                │              │
                │              ├─ lazy route chunks
                │              ├─ @defer chunks
                │              └─ MFE remoteEntry (not in host main)
                │
                └─ ESM static import graph (Mark-and-Sweep DCE)
```

**Order to say:**

1. **See who is in `main`** — source-map explorer / esbuild metafile.  
2. **Stop putting features in the shell** — lazy routes, then `@defer`.  
3. **Shake** — named ESM imports; kill barrel `index.ts` that re-exports the world; don’t `providers: [HugeSdk]` in `app.config`.  
4. **Production build** — AOT + minify (CLI already does this; don’t say “I’ll turn on AOT” as a trick).  
5. **Budgets** in CI.  
6. **Architecture** — MFE: host `main` is login + shell + kernel; Devices is another artifact. **Nx does not shrink the user’s JS**; it shrinks **what CI compiles**.  
7. **Transfer** — brotli on CDN; hashed JS `immutable`; don’t ship source maps to users.  
8. **HTTP/2** so many small chunks are OK.

**Spoken (~20s):**

> First I look at what’s in the initial chunk. I lazy-load routes and defer heavy widgets, tree-shake with named ESM imports, and fail CI on budgets. Production minify is already on. Next step for NUX is remotes so Safety isn’t in the host bundle at all. Nx is for affected builds, not a smaller `main.js`.

---

## 2b. “Lean import” — `from 'lib'` vs `from 'lib/a'`

**What people mean:** don’t import from the **root barrel** of a fat package. Import from a **secondary entry** (the hyphen/slash path): only that file is in the module graph.

```ts
// FAT — one door into the whole house
import { MatButton } from '@angular/material';
import { debounce } from 'lodash';           // often CommonJS → whole lib
import { A } from 'some-module';             // if index.ts re-exports A,B,C,D…

// LEAN — you only walked into room A
import { MatButton } from '@angular/material/button';
import debounce from 'lodash-es/debounce';
import { A } from 'some-module/a';           // or 'some-module-a' if that’s the package
```

**Yes — `import A from 'module-a'` (or `'some-module/a'`) helps** when the root `'some-module'` is a barrel or a non-shakeable bundle. The bundler **never sees** B, C, D. Smaller `main.js`.

**How tree-shaking actually works (one sentence):** production build walks **static** `import` from your entry, **marks** reachable ESM exports, **sweeps** the rest. Needs ESM + `sideEffects: false` (or accurate `sideEffects` list).

| Import | Helps? | Why |
|---|---|---|
| `{ A } from 'lib/a'` or `'lib-a'` | **Yes, most reliable** | Graph starts at A’s file. B never imported. |
| `{ A } from 'lib'` (ESM, `sideEffects: false`, no side-effect barrel) | **Can help** | Shaker **may** drop B, C if nothing references them. |
| `{ A } from 'lib'` (CJS like old `lodash`, or barrel with `import './polyfill'`) | **Often no** | Whole module is one blob / side effects keep everything. |
| `import * as lib from 'lib'` | **No** | You asked for the namespace. |
| `from '@idms/kernel'` | **Keep** | That’s **our** public API. Make the barrel **small**; remotes must not deep-import `kernel/src/lib/...`. |

**Angular-shaped examples to name:**

```ts
// Material (classic interview example)
import { MatButtonModule } from '@angular/material/button';  // lean
// not: from '@angular/material'

// CDK
import { ScrollingModule } from '@angular/cdk/scrolling';

// Angular itself already does this
import { HttpClient } from '@angular/common/http';  // not all of @angular/common
```

**When it will NOT help:** A’s file `import`s B internally (`a.ts` → `b.ts`). Lean path still ships B. Secondary entry only skips **siblings you never touched**.

**Spoken (~20s):**

> Lean import means I don’t come in through a package’s root `index` that re-exports the world. I import Button from `@angular/material/button`, debounce from `lodash-es/debounce`. The bundler’s graph never includes Datepicker or `merge`. If the lib is real ESM with `sideEffects: false`, a named import from the root *can* shake — but a secondary path is the guarantee. Our kernel barrel is the opposite: one small public API on purpose.

---

## 3. Runtime (jank after it’s loaded)

Cost = **checks × work per check × DOM nodes**.

```text
Default CD + Zone event  →  walk a fat tree  →  re-run bindings
OnPush / signals         →  skip or dirty less
@for track               →  don’t recreate rows
virtual scroll           →  don’t create 10k components
no {{ fn() }}            →  don’t redo work every tick
```

**NUX list story (use this):**  
> Alerts / driver pickers: we **virtual-scroll** (CDK / PrimeNG). That’s DOM. All-alerts “view all” **infinite-loads** with IntersectionObserver — that’s data. Typing filters: debounce + cancel in-flight. OnPush on the row + `track` by id.

---

## 4. Architecture layer (R3 — they expect this)

```text
Browser speed          CI speed              Team blast radius
─────────────          ────────              ─────────────────
lazy + defer + MFE     Nx affected           MFE prefixes on S3
OnPush / virtual       cache                 Devices deploy ≠ Safety JS
CDN + HTTP/2           budgets               kernel = shared cost
```

| They say | You say |
|---|---|
| “Does Nx optimize the app?” | **CI / compile graph.** User still downloads whatever host + that remote ship. |
| “Does MFE optimize the app?” | **Yes for load:** don’t download other domains. **Plus** independent deploy. Host still must stay skinny. |
| “CDN?” | Hashed assets cached; `index.html` + `remoteEntry.json` short cache so new SHA is seen. |
| “SSR?” | Public sites. **Auth dashboard = CSR.** Hydration complexity not worth it. |

---

## 5. What a weak vs strong R3 answer sounds like

| Weak | Strong |
|---|---|
| “OnPush and lazy loading” | Measure; buckets; then those two **in the right place** |
| “AOT” as a secret | “Prod CLI is AOT; the win is **what** we put in `main`” |
| “SSR the dashboard” | CSR + lazy + MFE; SSR for marketing |
| “Nx will make it faster for drivers” | Nx = pipeline; MFE/lazy = driver JS |
| Every trick at once | **JS size → lists → CD → memory → budgets** |

---

## 6. Mini follow-ups

**trackBy vs OnPush?** DOM reuse vs skip checks. Both on a hot row.

**Signals vs OnPush?** Signals dirty consumers; OnPush skips a subtree. Modern: both. Zoneless needs signals/`markForCheck`.

**Lazy route vs `@defer` vs MFE?** Route = another **chunk of this app**. Defer = widget inside a page. MFE = **another deployable** + runtime `loadRemoteModule`.

**Worker vs virtual scroll?** Worker = CPU off main thread. Virtual = fewer DOM nodes. Different problems.

**How do you keep it?** Budgets + Lighthouse on CI; bundle diff on PR; don’t provide maps in `app.config`.

---

## 7. Cheat card

```text
MEASURE    Lighthouse, Network, analyzer, Angular profiler
LOAD       lazy routes, @defer, tree-shake, budgets, hashed CDN, HTTP/2
           MFE remotes = don’t download other domains
RUNTIME    OnPush/signals, no fn in templates, @for track, virtual scroll
DATA       debounce+switchMap, shareReplay, paginate, FCM not poll
MEMORY     takeUntilDestroyed
ARCH       Nx = CI; MFE = runtime split; SSR ≠ NUX
ORDER      measure → initial JS → lists → CD → memory → CI budget
```

**60s if they only want one speech:**

> I’d treat it as load, runtime, data, memory. Measure first. Cut initial JS with lazy routes, defer, tree-shaking, and budgets; NUX’s next cut is remotes so a Devices visit doesn’t download Safety. Hashed files on CDN, HTTP/2. Runtime: profiler, then OnPush or signals, no work in templates, `track` on lists, CDK virtual scroll — we already do that on the big pickers. Data: debounce/switchMap, don’t poll the bell. Memory: takeUntilDestroyed. Nx keeps CI from rebuilding the world; it isn’t a substitute for a smaller host bundle.
