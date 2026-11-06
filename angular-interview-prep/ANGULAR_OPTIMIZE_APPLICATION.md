# How Will You Optimize an Angular Application? — Interview Guide

Prompt:

> How will you optimize an Angular application?

This is a **senior-shaped** question. They are not asking for a dump of buzzwords. They want: **measure first**, **split load vs runtime vs memory**, **Angular-specific levers**, **what you’d do first in a real app**.

**OneTrust R3 architecture card (NUX + MFE + Nx spoken):** [../onetrust/ONETRUST_ANGULAR_OPTIMIZATION.md](../onetrust/ONETRUST_ANGULAR_OPTIMIZATION.md)

**Deep dives (don’t repeat them here):**  
[Change detection / OnPush / zoneless](./ANGULAR_CHANGE_DETECTION_ONPUSH_ZONELESS.md) · [No functions in templates](./ANGULAR_TEMPLATE_FUNCTIONS_CD.md) · [Signals](./ANGULAR_SIGNALS.md) · [Memory leaks](./ANGULAR_MEMORY_LEAKS.md) · [SSR](./ANGULAR_SSR.md) · [Build pipeline](./ANGULAR_BUILD_ESM_WEBPACK_ESBUILD.md) · [Bundles / splitting](../frontend-system-design/02_BUNDLE_OPTIMIZATION_CODE_SPLITTING_LAZY_LOADING.md)

---

## 0. How to answer in the room (structure)

Open with a **framework**, then pick 4–5 Angular levers. If you start with “I’ll use OnPush and lazy loading” with no measurement, you sound junior.

```text
1. Define the pain     — slow first load? jank on click? memory after navigation?
2. Measure             — Lighthouse / Web Vitals, Angular source maps, Profiler, Network
3. Biggest win first   — usually JS download + CD + lists, not micro-tweaks
4. Angular tools       — lazy routes, OnPush/signals, trackBy, defer, virtual scroll
5. Prove it            — budgets, before/after metrics
```

**Spoken 45s (memorize this opener)**

> I’d split the problem: **startup** (how much JS and when), **runtime** (change detection and lists), and **memory**. I measure first — Lighthouse, bundle analyzer, Angular DevTools profiler — because the fix for a 2MB main bundle is not the same as the fix for a table that re-renders on every keystroke. Then I cut the initial bundle with lazy routes and `defer`, make CD cheaper with OnPush or signals and no work in templates, and for large lists I use `trackBy` or CDK virtual scroll. I also kill leaks with `takeUntilDestroyed`. I wouldn’t turn on SSR just to “optimize” an authenticated dashboard.

---

## 1. Three buckets (say this so you don’t ramble)

| Bucket | User feels | Angular knobs |
|---|---|---|
| **Load / startup** | Blank screen, poor LCP/TTI | Lazy routes, `defer`, treeshake, budgets, SSR/prerender (public pages) |
| **Runtime** | Typing lag, scroll jank, CD storms | OnPush / signals / zoneless, `trackBy`, no template functions, pipes, `async`/`resource` |
| **Memory / long session** | Tab dies after using the app | Unsubscribe, DestroyRef, don’t grow caches, detach huge views |

Interviewers often only wanted **one** bucket. Ask: *“Is this first-load, interaction jank, or a specific screen?”* If they say “in general,” walk all three in that order.

---

## 2. Measure — what you name in an interview

| Tool | What you prove |
|---|---|
| **Lighthouse / Web Vitals** (LCP, INP, CLS) | User-facing startup and interactivity |
| **Network + Coverage** | Huge `main.js`, unused JS |
| **`ng build` + source-map explorer / esbuild metafile** | Which libraries sit in the initial chunk |
| **Angular DevTools — Profiler** | Which components CD on a click |
| **Chrome Performance / Memory** | Long tasks, leaks after route changes |
| **`angular.json` budgets** | CI fails if main bundle grows |

**Line:**  
> I don’t optimize blind. Profiler tells me if it’s CD; Network tells me if it’s download; Memory tells me if we leak.

---

## 3. Load-time — ship less JS, later

Browser cannot paint until it **downloads + parses + executes** JS on the critical path. Cutting **initial** JS is usually the biggest LCP/TTI win for a dashboard.

---

### 3.1 Lazy-load routes

**What:** `loadComponent` / `loadChildren` + dynamic `import()`. That file is a **separate chunk**. It is **not** in `main.js`.

```ts
{ path: 'admin', loadChildren: () => import('./admin/admin.routes').then((m) => m.ADMIN_ROUTES) }
```

**How it helps:** First visit downloads **shell + home only**. Admin charts, NgRx feature, Mapbox stay on disk until `/admin`. Smaller parse time → faster first paint and less main-thread block. `CanMatch` can skip downloading a chunk the user cannot open.

**When:** Feature pages you don’t need on login (alerts, reports, admin).  
**Not:** the first screen after login — that still sits on the critical path unless you defer widgets on it (§3.2).

---

### 3.2 `@defer` (inside a page already open)

**What:** A **template** lazy block. Angular loads that component’s chunk when `on viewport` / `on idle` / `on interaction`.

```html
@defer (on viewport) {
  <app-heavy-chart [id]="id" />
} @placeholder {
  <div class="chart-skeleton"></div>
}
```

**How it helps:** The **route** can be light. Chart.js / a map is not parsed until the user scrolls to it. Placeholder keeps layout (less CLS). Different from a lazy **route**: you are already on the page.

**When:** below-fold chart, comments, optional panel.  
**Not:** the primary table the user came to see — deferring that delays the actual job.

---

### 3.3 Tree-shaking + skinny imports

**What:** Bundler **drops unused ESM exports**. Production AOT + minify + hashes. CDN **gzip/brotli** shrinks transfer.

**How it helps:** Dead services (`providedIn: 'root'` never imported) never hit `main.js`. `import { Button } from 'huge-lib'` can keep the whole lib if the package is not shakeable — **named / secondary entry** imports keep the graph small. `@if`/`@for` avoid pulling old `CommonModule` helpers in new apps.

**When:** after a bundle analyzer shows “who is in the first chunk.”  
**Watch:** `appConfig.providers` **hard-imports** (DI Step 4) — those classes **cannot** shake. Barrel `import *` kills shaking.

---

### 3.4 Budgets

```json
"budgets": [{ "type": "initial", "maximumWarning": "500kb", "maximumError": "1mb" }]
```

**How it helps:** Does **not** make the app faster today. It **fails CI** when someone adds a fat lib to `main`. Optimization without a budget returns next quarter.

---

### 3.5 Images (`NgOptimizedImage`)

**What:** `ngSrc`, `priority` on the LCP image, width/height, `ngSrcset`.

**How it helps:** LCP is often an **image**, not Angular. Correct size + `priority` fetch + dimensions (less CLS). A 4MB PNG next to a perfect lazy chunk still fails Lighthouse.

---

### 3.6 SSR / prerender

**What:** Server (or build) emits HTML; browser hydrates.

**How it helps:** First **pixels** and SEO without waiting for `main.js`.  
**When:** public marketing.  
**Not** a logged-in IDMS dashboard (auth, personal data) — CSR + lazy is the right lever. [ANGULAR_SSR.md](./ANGULAR_SSR.md).

---

## 4. Runtime — fewer checks, less DOM

Default: Zone sees a click/`setTimeout` → **walks a large component tree** → re-runs template bindings. Jank = too many **checks** × too much **work per check** × too many **DOM nodes**.

---

### 4.1 `OnPush`

**What:** Angular **skips** this component (and often the subtree) unless an `@Input` **reference** changes, an event fires in that tree, `async`/`markForCheck`/a signal dirties it.

**How it helps:** A keystroke in the header does **not** re-check 500 table rows. Profiler shows fewer bars. Main thread free for typing.

**When:** list **rows**, cards, anything with many siblings.  
**Fails if:** parent does `[user]="{ ... }"` or `getRows()` returning a **new array** every CD — OnPush thinks inputs changed every time. Immutable updates or signals.

---

### 4.2 Signals + `computed`

**What:** Template/`computed` **records** which signals were read. A `set` dirties **those** consumers, not “the whole app.”

**How it helps:** Fine-grained updates. Pairs with **zoneless** (no Zone monkey-patch scheduling). Less “walk the world.”

**When:** local UI state, derived labels, filters. HTTP can stay RxJS → `toSignal` / `resource`.

---

### 4.3 Zoneless

**What:** CD is **not** scheduled by every `addEventListener` / `setTimeout`. You (or signals / `markForCheck`) notify Angular.

**How it helps:** Random third-party timers don’t retrigger a full app check. Less hidden CD. [CD guide](./ANGULAR_CHANGE_DETECTION_ONPUSH_ZONELESS.md).

**When:** new apps (v21+ default). Legacy: migrate OnPush first, then zoneless.

---

### 4.4 No `{{ fn() }}` in templates

**What:** `{{ total() }}` or `{{ format(row) }}` runs **every time that view is checked**.

**How it helps:** Moving work to `computed` / a **pure pipe** / precomputed field means work runs **when data changes**, not on every Zone tick. A filter of 1k rows in the template on each CD is a classic freeze. [template guide](./ANGULAR_TEMPLATE_FUNCTIONS_CD.md).

---

### 4.5 Pure pipes

**What:** Angular caches the last input **reference** + result.

**How it helps:** `{{ amount | currency }}` does not reformat if `amount` is the same number/ref. Cheap bindings stay cheap.

**Watch:** impure pipes (`json` style) run every CD — same cost as a template function.

---

### 4.6 `@for` + `track` (DOM identity)

```html
@for (row of rows(); track row.id) { <app-row [row]="row" /> }
```

**How it helps:** Without `track`, a new array = **destroy all rows, create all rows** (DOM + child components). With `track row.id`, Angular **reuses** the row whose id stayed, **patches** text, **moves** nodes. Cheaper than OnPush alone: OnPush skips **checks**; `track` skips **DOM recreate**.

Use **both** on a hot list.

---

### 4.7 Virtual scroll / pagination

**What:** Only **visible** rows exist as DOM (CDK virtual scroll), or the **API** returns one page.

**How it helps:** 10k `<tr>` = 10k components + listeners even with OnPush. 30 visible rows = 30. Layout/paint/memory drop. Pagination is even better — less JSON too.

**When:** large tables (alerts, devices). Don’t “fix CD” instead of this.

---

### 4.8 Web Worker

**What:** Heavy CPU (`JSON.parse` of a huge file, CSV) on another thread. `postMessage` back.

**How it helps:** Main thread stays free for CD and input. Angular will **not** do this for you. Never put that parse in `ngDoCheck`.

---

## 5. Data / RxJS — fewer or cheaper network trips

The UI is fast and you still wait 800ms — that’s **data**, not CD.

| Smell | Fix | How it helps |
|---|---|---|
| Same HTTP from 5 components | `shareReplay({ bufferSize: 1, refCount: true })` or `resource` / store | **One** request; others reuse. Less server + less JSON parse |
| Typeahead every key | `debounceTime` + `switchMap` | Wait until typing pauses; **cancel** the old request so a slow “a” doesn’t overwrite “al” |
| Nested `.subscribe` | `switchMap` / `exhaustMap` | No inner-sub leaks; flatten the graph |
| 2MB table payload | Paginate, select columns, gzip, HTTP/2 | Less download + less `JSON.parse` on the main thread |
| Poll forever | `interval` + `takeUntilDestroyed` + backoff | Stops when you leave; doesn’t hammer QA |

`async` / `toSignal` / `resource()`: subscribe **and** unsubscribe with the view — less leak + cancel in-flight.

---

## 6. Memory — the tab after an hour

**How leaks hurt “performance”:** destroyed pages stay in the heap → GC pauses, more RAM, eventually a dead tab. Feels like “the app got slow,” not a 2s LCP.

**How prevention helps:** `takeUntilDestroyed` drops the callback so the component can GC. `clearInterval` / `ws.close()` / `chart.destroy()` drop native + DOM. Root services hold **data**, not `AlertsPage`. Full list: [ANGULAR_MEMORY_LEAKS.md](./ANGULAR_MEMORY_LEAKS.md).

---

## 7. Images (if they said LCP)

Covered in [§3.5](#35-images-ngoptimizedimage). Same idea: right bytes, early fetch for the hero, reserved space.

---

## 8. What a strong vs weak answer sounds like

| Weak | Strong |
|---|---|
| “I’ll use OnPush everywhere” | “Profiler first; OnPush on hot lists; immutable inputs or signals so OnPush actually skips” |
| “Lazy loading” only | “Lazy **routes** for features, `@defer` for below-fold, budgets so main doesn’t grow” |
| “AOT” as if it’s a trick | “Production CLI is AOT already; the win is **what** we ship, not switching AOT on by hand” |
| “SSR for everything” | “SSR for public LCP/SEO; CSR dashboard; hydrate carefully” |
| Random micro-optimizations | Order: **measure → JS size → CD → lists → memory** |

---

## 9. One “real app” story (use yours)

Adapt to NUX / IDMS / whatever you shipped:

> Dashboard first load was heavy because analytics charts were in the main bundle. I lazy-loaded the analytics route and `@defer`’d the chart on viewport. On the events table, rows were Default CD and `*ngFor` without trackBy — typing in a filter felt laggy. OnPush on the row + `track` by id + debounce on the filter HTTP. We set an initial-bundle budget in CI so it didn’t regress.

That story beats ten disconnected tips.

---

## 10. Follow-ups (have one sentence each)

**“OnPush didn’t help.”**  
Inputs are new object literals from the parent every CD (`[user]="{...}"` or a method returning a new array). Fix references; don’t blame OnPush.

**“trackBy vs OnPush?”**  
trackBy = **DOM reuse** for list identity. OnPush = **skip checking** that component. You often want **both** on a row.

**“Signals vs OnPush?”**  
Signals dirty **what they need**; OnPush is a subtree skip strategy. Modern apps use both. Zoneless needs a dirty-notification story (signals are that story).

**“How do you stop regressions?”**  
Lighthouse CI or budgets on `initial` / any-script; optional bundle diff on PR.

**“Third-party library is huge.”**  
Lazy-load the route that uses it; or dynamic `import()` inside `@defer`; replace barrel imports; consider a lighter lib.

**“Forms are slow.”**  
Don’t run validators that walk a huge `FormArray` on every keystroke at the root if you can isolate; OnPush on rows; consider signal forms for fine-grained updates — [reactive](./ANGULAR_REACTIVE_FORMS.md) / [signal forms](./ANGULAR_SIGNAL_FORMS.md).

---

## 11. Cheat sheet (glance before the round)

```text
MEASURE     Lighthouse, Network, ng build analyze, Angular profiler
LOAD        lazy routes, @defer, tree-shake, budgets, NgOptimizedImage
            SSR only if first paint / SEO
RUNTIME     OnPush or signals, no fn() in templates, @for track
            virtual scroll if many DOM nodes
DATA        debounce + switchMap, shareReplay, paginate API
MEMORY      takeUntilDestroyed
KEEP        budgets in CI
```

---

## 12. Spoken variants

### 20s (if they want short)

> Measure load vs jank. Cut initial JS with lazy routes and defer. Make CD cheap with OnPush or signals, track list rows, don’t call functions in templates. Virtual-scroll huge lists. Unsubscribe on destroy. Budgets so it stays small.

### 60s (full)

> I treat optimization as three problems. Startup: ship less JS up front — lazy feature routes, `@defer` for heavy widgets, tree-shaking, image `ngSrc`, and a bundle budget. I only add SSR if we’re optimizing public first paint. Runtime: Angular’s cost is change detection and DOM. Profiler, then OnPush or signals on hot paths, `@for` with `track`, no methods in templates, CDK virtual scroll for large lists, debounce/switchMap for search. Memory: `takeUntilDestroyed` so route changes don’t leak. I’d pick the biggest metric first instead of applying every trick.

---

## 13. Practice checklist

- [ ] Open with **measure + three buckets**, not a laundry list  
- [ ] Lazy **route** vs `@defer` vs virtual scroll — three different problems  
- [ ] OnPush **and** why it fails with new object refs  
- [ ] `track` / trackBy vs OnPush (DOM vs CD)  
- [ ] Template functions cost  
- [ ] When you would **not** use SSR  
- [ ] One story from a real screen (table / chart / dashboard)  
- [ ] Budgets / CI so it doesn’t regress
