# Bundle Optimization, Code Splitting & Lazy Loading — Interview Guide

---

## 1. Why This Topic Matters

Modern frontend apps (Angular/React/Vue) ship JavaScript bundles.

If the initial bundle is huge:

- slower download
- longer parse/compile on main thread
- delayed first paint and interactivity

Interview one-liner:

> Bundle optimization reduces how much JS/CSS the browser must download and execute for the first screen, while code splitting and lazy loading defer non-critical code until it is needed.

---

## 2. What Is A Bundle?

A **bundle** is packaged output from a bundler (Webpack, Vite/Rollup, esbuild, Angular CLI).

Example mental model:

```text
many source files
-> bundler tree-shakes + packs
-> main.js / main.*.js
-> browser downloads + executes
```

Types of output often seen:

- `main` / `runtime` bundle
- vendor/polyfill chunks
- route/feature lazy chunks
- CSS bundles/chunks
- assets (images/fonts)

---

## 3. What Makes Bundles Large?

- shipping entire libraries when only a small part is used
- no tree-shaking
- duplicate dependencies
- large polyfills
- putting all routes into one main bundle
- heavy third-party widgets on initial load
- source maps in production (should not ship to users)
- uncompressed assets

---

## 4. Bundle Optimization Techniques

### 4.1 Minification

Removes whitespace/comments, shortens names.

```text
function add(a, b) { return a + b; }
-> function add(a,b){return a+b}
```

Done by Terser/esbuild in production builds.

### 4.2 Tree-shaking

**What:** drop unused exports from the bundle.  
**How (EM answer):** **DCE** on a **Module Dependency Graph** via **Mark-and-Sweep** reachability from the entry (DFS/BFS mark → sweep unmarked). Needs **ESM** (static imports); CommonJS usually can’t.

```js
// utils.js
export function used() {}
export function unused() {}

// app.js
import { used } from './utils';
```

Bundler can drop `unused` if:

- ESM static imports/exports
- side-effect free modules (or marked correctly)

Common fail: importing from non-tree-shakeable libraries (or using CJS patterns).

**Deep dive:** [11_TREE_SHAKING_MARK_AND_SWEEP.md](./11_TREE_SHAKING_MARK_AND_SWEEP.md)

### 4.3 Compression

Network level:

- Gzip
- Brotli (usually better)

Server/CDN should send `Content-Encoding: br` / `gzip`.

### 4.4 Dependency hygiene

- prefer smaller libs
- avoid moment.js style heavy date libs when luxon/dayjs suffices
- import only needed icons/functions
- check bundle analyzer regularly

### 4.5 Deduplicate / control versions

Multiple versions of same package inflate bundles. Keep dependency graph clean.

### 4.6 Production mode builds

Ensure `NODE_ENV=production` / Angular prod build so debug code paths are stripped.

---

## 5. Code Splitting — Core Idea

Instead of one giant `main.js`, split into multiple chunks:

```text
Before:
main.js (2.5MB)

After:
main.js (200KB)
route-dashboard.js (150KB)
route-settings.js (120KB)
vendor-charts.js (180KB)
```

Browser loads only what current page needs.

Interview line:

> Code splitting divides the app into chunks that can be loaded on demand, reducing initial load cost.

---

## 6. Types Of Code Splitting

### A) Route-based splitting (most important)

Load feature code when user navigates to that route.

Angular example:

```ts
const routes = [
  {
    path: 'admin',
    loadChildren: () =>
      import('./admin/admin.module').then((m) => m.AdminModule)
  }
];
```

Or standalone:

```ts
{
  path: 'admin',
  loadComponent: () =>
    import('./admin/admin.component').then((m) => m.AdminComponent)
}
```

React example:

```js
const Admin = React.lazy(() => import('./Admin'));
```

### B) Component-based splitting

Lazy load heavy widgets (charts, editors, modals):

```ts
// Angular-ish dynamic import pattern
const { ChartComponent } = await import('./chart.component');
```

```js
// React
const Chart = React.lazy(() => import('./Chart'));
```

### C) Vendor splitting

Separate rarely-changing third-party libs for better caching:

```text
vendor.js (cached long term)
app.js (changes often)
```

### D) On interaction splitting

Load code when user opens a modal/tab, not at startup.

---

## 7. Lazy Loading — What It Means

**Lazy loading** = defer loading a resource until needed.

Applies to:

- JS route/component chunks
- images (`loading="lazy"`)
- iframes
- below-the-fold data/modules

For JS interviews, lazy loading usually means dynamic `import()` chunks.

```js
button.addEventListener('click', async () => {
  const module = await import('./heavy-tool.js');
  module.openTool();
});
```

---

## 8. Eager vs Lazy Loading Trade-offs

| Approach | Pros | Cons |
|---|---|---|
| Eager (all upfront) | simple, no later delay | slow initial load |
| Lazy | fast first load | slight delay on first navigation/interaction |
| Prefetch/preload hybrid | balance | more caching/strategy complexity |

Best practice:

- eager: critical path for first screen
- lazy: secondary routes/heavy features
- prefetch: likely next routes when idle/bandwidth allows

---

## 9. Preload vs Prefetch (Often Asked Together)

```html
<link rel="preload" href="critical.js" as="script" />
<link rel="prefetch" href="next-route.js" as="script" />
```

| Hint | Meaning |
|---|---|
| `preload` | need soon for current navigation (high priority) |
| `prefetch` | may need for future navigation (low priority) |

Angular/React routers and bundlers can emit prefetch hints for lazy chunks.

---

## 10. How Dynamic Import Works

```js
import('./admin.js');
```

Bundler creates a separate chunk and a runtime fetch.

Rough sequence:

1. User navigates to `/admin`
2. app requests `admin.<hash>.js`
3. browser downloads/parses/executes
4. route renders

This is why lazy routes can have a brief loading state.

---

## 11. Measuring Bundle Health

Tools:

- webpack-bundle-analyzer / source-map-explorer / Vite visualizer
- Angular `source-map-explorer` / build stats
- Lighthouse (unused JS)
- Chrome Coverage tab

What to look for:

- initial JS size (compressed + uncompressed)
- largest dependencies
- duplicate packages
- unused exported code
- main-thread parse time

Useful metrics:

- Initial JS KB (gzip/br)
- JS execution time
- TTI / TBT
- LCP impact from delayed rendering

---

## 12. Concrete Optimization Checklist (Interview Gold)

1. Production build + minify + treeshake
2. Enable Brotli/Gzip
3. Route-level code splitting
4. Lazy load heavy components (charts/editor)
5. Analyze and remove large deps
6. Prefer ESM tree-shakeable imports
7. Cache long-term hashed filenames
8. Avoid unnecessary polyfills for modern browsers
9. Defer non-critical third-party scripts
10. Prefetch next likely route

---

## 13. Angular-Focused Notes

- Use lazy routes (`loadChildren` / `loadComponent`)
- Keep `AppModule`/bootstrap lean
- Check budgets in `angular.json`
- Beware importing a lazy service into eager modules (pulls code into main)
- Shared libraries should be carefully designed to avoid eager coupling
- `providedIn: 'root'` services are fine, but feature code still needs lazy boundaries

Anti-pattern:

```ts
// eagerly importing lazy feature symbols into app.module
import { AdminService } from './admin/admin.service';
```

This can destroy splitting benefits.

---

## 14. Caching Strategy With Split Bundles

Hashed filenames:

```text
main.3f2a.js
admin.9bc1.js
```

Benefits:

- long cache lifetime (`Cache-Control: max-age=31536000, immutable`)
- only changed chunks invalidate

Runtime/bootstrap file may change more often; feature chunks can remain cached.

---

## 15. Loading UX Considerations

When lazy loading routes:

- show skeleton/spinner
- handle import failures (retry/offline)
- avoid layout jump
- optionally prefetch on hover/idle

```ts
// conceptual
router.navigate(['/admin']); // triggers chunk fetch if not loaded
```

---

## 16. Common Interview Questions

**Q: What is code splitting?**  
A: Breaking app JS into multiple chunks loaded on demand instead of one large initial bundle.

**Q: Difference between code splitting and lazy loading?**  
A: Code splitting creates chunks; lazy loading is the strategy/timing of loading those chunks when needed.

**Q: How does tree-shaking work? / What algorithm powers it?**  
A: Dead Code Elimination on the Module Dependency Graph — mark reachable exports from the entry (DFS/BFS), sweep unmarked (Mark-and-Sweep). Requires static ESM; see [11_TREE_SHAKING_MARK_AND_SWEEP.md](./11_TREE_SHAKING_MARK_AND_SWEEP.md).

**Q: When not to lazy load?**  
A: Critical first-screen code, tiny modules where split overhead is not worth it, SEO-critical above-the-fold if no SSR and content depends on that JS.

**Q: How do you find what bloated the bundle?**  
A: Bundle analyzer + coverage/unused JS audits + dependency review.

---

## 17. Spoken Answer (60–90 sec)

> Large JS bundles delay download and main-thread execution, so I optimize with production minification, tree-shaking, and compression. Then I use code splitting, usually by route, so users download only what the current page needs. Heavy widgets can be lazy-loaded on interaction. I verify results with a bundle analyzer and keep the eager bootstrap path lean. Prefetch can warm likely next routes without hurting the initial critical path.

---

## 18. Cheat Sheet

```text
Optimize bytes: minify, treeshake, compress, smaller deps
Split code: route/component/vendor chunks
Lazy load: import() when needed
preload = need now, prefetch = need soon
Measure with analyzer + Lighthouse
Keep initial route lean
```

---

## 19. Practice Checklist

- [ ] Explain bundle → parse → execute cost
- [ ] Define code splitting vs lazy loading
- [ ] Give Angular route lazy-loading example
- [ ] List top 5 optimizations
- [ ] Explain preload vs prefetch
- [ ] Mention bundle analyzer workflow
