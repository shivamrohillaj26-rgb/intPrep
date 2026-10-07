# Angular Build Pipeline — ESM, Webpack → esbuild/Vite

Interview guide: **how Angular turns TypeScript into browser bundles**, what changed by version, and what “current” means.

Pairs with [ANGULAR_ECOSYSTEM_FUNDAMENTALS.md](./ANGULAR_ECOSYSTEM_FUNDAMENTALS.md) (npm/tsconfig/AOT) and [ANGULAR_VERSION_FEATURES.md](./ANGULAR_VERSION_FEATURES.md) (feature timeline).

---

## 0. Spoken opener (30–45s)

> Angular source is TypeScript + templates written as **ES modules**. The CLI builds a dependency graph, **AOT-compiles** templates with the Ivy compiler, then a bundler emits hashed JS/CSS chunks into `dist/`. For years that bundler was **Webpack** (`browser` builder). From **v16** we got an **esbuild** preview; **v17** made the **application** builder (esbuild + Vite for `ng serve`) the default for new apps. Webpack’s `browser` builder is now **deprecated** — new apps use `@angular/build` / application builder. Same job: resolve imports, tree-shake, split lazy routes, minify for production.

**Deep stage-by-stage walkthrough (with example app):** → **§1b**

---

## 1. Mental model — layers of the build

```text
Your code
  app.config.ts, components, routes (import/export ESM)
        ↓
TypeScript compiler (tsconfig: target + module)
        ↓
Angular compiler (Ivy) — AOT templates → JS factories
        ↓
Bundler (Webpack OR esbuild) — graph → chunks
        ↓
Dev server (Webpack-dev-server OR Vite)  /  or production files
        ↓
Browser loads index.html → main-[hash].js + lazy chunks
```

| Layer | Job | Interview words |
|---|---|---|
| **ES Modules** | How *source* files import each other | static `import`/`export` → tree-shaking |
| **TypeScript** | Typecheck + emit JS dialect | `target` / `module` |
| **Ivy (ngc)** | Compile templates/components | AOT, partial compilation for libs |
| **Bundler** | Pack graph into files | Webpack vs esbuild |
| **Dev server** | Serve + HMR/rebuild | historically Webpack; now often **Vite** |
| **Optimizer** | Minify, hash, budgets | production config |

---

## 1b. Deep dive — each stage of the build (interview clarity)

Walk an interviewer through **`ng build`** (production) like a story. Same stages exist for `ng serve`, but serve skips heavy minify and uses Vite for on-demand transforms.

### Big picture (say this first — 20s)

> There are really **two compilers and one packer**. TypeScript/esbuild understand JS. **Ivy** understands Angular templates and DI. Then the **bundler** (esbuild today, Webpack historically) packs modules into browser files, optimizes them, and writes `dist/`. Vite is mainly the **dev server**, not the production packer.

```text
STAGE 0  Source you wrote
STAGE 1  Discovery / config
STAGE 2  TypeScript understanding + typecheck
STAGE 3  Ivy AOT (Angular-specific compile)
STAGE 4  Dependency graph + tree-shaking intent
STAGE 5  Bundling / code splitting (esbuild)
STAGE 6  Styles, assets, index.html wiring
STAGE 7  Production optimize (minify, hash, budgets)
STAGE 8  Output on disk → browser download at runtime
```

Use a tiny app as the running example:

```ts
// main.ts  (entry)
import { bootstrapApplication } from '@angular/platform-browser';
import { App } from './app/app';
import { appConfig } from './app/app.config';

bootstrapApplication(App, appConfig);

// app.ts
@Component({
  selector: 'app-root',
  standalone: true,
  imports: [RouterOutlet],
  template: `<h1>{{ title }}</h1><router-outlet />`,
})
export class App {
  title = 'Shop';
}

// app.routes.ts
export const routes = [
  { path: '', loadComponent: () => import('./home/home').then(m => m.Home) },
  { path: 'admin', loadChildren: () => import('./admin/routes').then(m => m.ADMIN_ROUTES) },
];
```

---

### STAGE 0 — Source (what exists before any tool)

**What is here**

| File kind | Example | Role |
|---|---|---|
| Entry | `main.ts` | Starts Angular |
| Config | `app.config.ts`, `angular.json`, `tsconfig.json` | How to build/run |
| Components | `.ts` + `template` / `templateUrl` + styles | UI units |
| Routes | `routes` with static or dynamic `import()` | Navigation + split points |
| Assets | `public/`, images, global `styles.css` | Static / global CSS |

**Clarity line:**

> Nothing has been “built” yet. The browser cannot run `.ts` or Angular templates directly in production — the pipeline must turn them into plain JS/CSS the browser understands.

---

### STAGE 1 — Discovery (CLI reads the project)

**Who:** Angular CLI / builder (`@angular/build:application` or legacy Webpack builder).

**What happens**

1. Read `angular.json` → which builder, entry (`browser`/`main`), `outputPath`, production flags  
2. Find entry file (`src/main.ts`)  
3. Collect global styles, assets, polyfills / zone (if any)  
4. Decide **dev vs production** configuration (budgets, optimization, file replacements)

```json
"build": {
  "builder": "@angular/build:application",
  "options": {
    "browser": "src/main.ts",
    "outputPath": "dist/shop",
    "styles": ["src/styles.css"]
  }
}
```

**Interview tip:** Point at `builder` first — that tells you Webpack era vs esbuild era.

**If this stage fails:** wrong path, missing `main.ts`, bad `angular.json`.

---

### STAGE 2 — TypeScript layer (types + JS shape)

**Who:** TypeScript compiler APIs / esbuild transpile (exact split is internal; conceptually “TS understanding”).

**What happens**

- Type-check your `.ts` (and, with Angular, template type-checking is tied into the Angular compiler — see Stage 3)  
- Know `target` / `module` from `tsconfig` (e.g. ES2022 + ESM)  
- Your `import` / `export` graph is the map for later bundling  

```ts
// You write
title = 'Shop';

// After TS emit ideas (simplified) — still NOT Ivy instructions yet
this.title = 'Shop';
```

**Clarity line:**

> TypeScript makes the code **valid JS-shaped modules**. It does **not** turn `<h1>{{ title }}</h1>` into DOM update instructions — that’s Ivy.

**What interviewers confuse:** “esbuild compiles Angular.”  
**Correct:** esbuild is great at **TS→JS and bundling**. **Ivy** compiles **templates / Angular semantics**.

---

### STAGE 3 — Ivy AOT compilation (the Angular brain)

**Who:** Angular compiler (`ngtsc` / `@angular/compiler-cli`) — **Ivy**.

**What “AOT” means here**

**Ahead-of-Time** = compile templates **at build time**, not in the user’s browser at runtime (old JIT style).

**What Ivy does with our example**

Input (conceptual):

```html
<h1>{{ title }}</h1>
<router-outlet />
```

Output (conceptual — not exact generated code):

```js
// Ivy emits instruction-style code on the component, roughly like:
ɵɵelementStart(0, 'h1');
ɵɵtext(1);
ɵɵtextInterpolate(ctx.title);  // binds title
ɵɵelementEnd();
ɵɵelement(2, 'router-outlet');
```

Also:

- Validates template vs class (`{{ titlee }}` → **build error**)  
- Wires `@Component` metadata, `imports: [RouterOutlet]`, DI factories  
- Enables **tree-shaking** of unused Angular features (locality)  

| | JIT (historical mental model) | AOT (production / modern default) |
|---|---|---|
| When templates compile | In the browser | At `ng build` |
| Startup | Slower (compile on device) | Faster |
| Errors | Often runtime | Often **build-time** |
| Ship compiler to browser? | Needed | **No** |

**Clarity line (memorize):**

> **Ivy** = Angular’s compiler + runtime model. It turns templates and decorators into efficient **instructions**. **esbuild/Webpack/Vite do not understand `{{ title }}`.**

**Vite vs Ivy (quick):**

| | Ivy | Vite |
|---|---|---|
| Layer | Framework compiler/runtime | Dev server / tooling |
| Understands templates? | Yes | No |
| Used in `ng build` prod? | Yes | Mainly **serve** (esbuild bundles prod) |

---

### STAGE 4 — Module graph + tree-shaking intent

**Who:** Bundler graph analysis (esbuild / Webpack), helped by ESM + Ivy’s shakeable output.

**What happens**

From `main.ts`, follow every static `import`:

```text
main.ts
  → app.ts
  → app.config.ts
  → app.routes.ts
  → @angular/core, router, …
```

Dynamic imports are **split points** (not forced into the main chunk):

```ts
() => import('./admin/routes')  // ← creates a separate chunk later
```

**Tree-shaking (Mark-and-Sweep idea):**

```text
Mark: starting from main.ts, which exports are reachable?
Sweep: drop unreachable exports / unused Angular bits
```

Example mental model:

```ts
// utils.ts
export function used() { return 1; }
export function neverImported() { return 2; }
// neverImported can be dropped from the bundle if nothing imports it
```

**Clarity line:**

> Because we use **ES modules**, the bundler can see a static dependency graph and delete dead code. That’s why “ESM matters for Angular builds.”

Deep algorithm: [11_TREE_SHAKING_MARK_AND_SWEEP.md](../frontend-system-design/11_TREE_SHAKING_MARK_AND_SWEEP.md).

---

### STAGE 5 — Bundling & code splitting (esbuild today)

**Who:** **esbuild** (application builder) or **Webpack** (legacy `browser` builder).

**What happens**

1. Merge many modules into fewer **chunks**  
2. Keep **initial** route code in something like `main-[hash].js`  
3. Emit **lazy** chunks for `import()` / `@defer`  
4. May create shared chunks for code used by multiple lazy routes  

For our routes example:

```text
Browser will eventually download:

  index.html
  main-ABC.js          ← bootstrap + App shell + router
  styles-XYZ.css
  home-DEF.js          ← when user hits ''
  admin-GHI.js         ← when user hits /admin
```

**Why split?**

> Initial load should be small. Admin code shouldn’t download on the home page.

**Clarity line:**

> Bundling = packing the graph into files the browser can download. Code splitting = deciding **which** files load **when**.

---

### STAGE 6 — Styles, assets, `index.html`

**Who:** Builder pipeline (CSS processors + asset copy).

**What happens**

| Input | Output idea |
|---|---|
| Global `styles.css` / component styles | Extracted or bundled CSS (`styles-[hash].css`) |
| `public/favicon.ico`, images | Copied to output |
| `src/index.html` | Rewritten to `<script src="main-….js">` with **hashed** names |

```html
<!-- After build, roughly -->
<!doctype html>
<html>
  <head>
    <link rel="stylesheet" href="styles-XYZ.css" />
  </head>
  <body>
    <app-root></app-root>
    <script src="main-ABC.js" type="module"></script>
  </body>
</html>
```

**Clarity line:**

> The HTML is the **boot document**. Hashed script names make cache-busting work: new build → new hash → browser fetches fresh JS.

---

### STAGE 7 — Production optimization (mostly `ng build` prod)

**Who:** Minifiers (often Terser or equivalent), CLI budget checks, hashing.

| Step | Why |
|---|---|
| **Minify / mangle** | Smaller download (`title` → short names in local scopes) |
| **Compress-friendly output** | Better gzip/brotli on server |
| **Hash filenames** | Long-term caching + bust on change |
| **Budgets** | Fail CI if `main` JS > e.g. 500kB |
| **Source maps** (optional) | Debug prod without shipping pretty code publicly |
| **Dead code elimination** | Final pass with tree-shaking |

Dev (`ng serve`) usually **skips** aggressive minify so rebuilds stay fast.

**Clarity line:**

> Production optimizes for **bytes and caching**. Development optimizes for **feedback speed**.

---

### STAGE 8 — Output + runtime (what the browser does)

**Modern output shape (application builder):**

```text
dist/shop/
  browser/
    index.html
    main-XXXX.js
    styles-YYYY.css
    home-ZZZZ.js          ← lazy
    admin-WWWW.js         ← lazy
    media/…
  server/                 ← only if SSR enabled
```

**Runtime sequence (CSR):**

```text
1. Browser requests index.html
2. Parses HTML → requests main-XXXX.js (+ styles)
3. main runs → bootstrapApplication(App)
4. Angular creates App, runs Ivy instructions → DOM under <app-root>
5. User navigates to /admin
6. Router triggers import() → downloads admin-WWWW.js
7. Admin UI renders
```

**SSR note (if asked):** `application` builder can also emit **server** bundles that render HTML on the server; browser then hydrates. Same compile story; extra server output.

---

### `ng serve` — same stages, different emphasis

| Stage | `ng build` (prod) | `ng serve` (dev) |
|---|---|---|
| Ivy | Yes | Yes (incremental) |
| Full bundle all chunks | Yes | Often **on-demand** / lighter |
| Minify / budgets | Aggressive | Relaxed |
| Dev server | No (static files) | **Vite** — watch, HMR, fast refresh |
| Goal | Ship | Iterate |

**Vite’s job in one sentence:**

> During development, Vite serves the app and updates the browser quickly when files change; it does **not** replace Ivy.

---

### One example end-to-end (tie it together)

You change:

```html
<h1>{{ title }} — Sale!</h1>
```

1. **Discovery** — already running (`ng serve`) watches the file  
2. **TS** — class still fine  
3. **Ivy** — recompiles template → new interpolate instruction for `" — Sale!"`  
4. **Graph** — same imports  
5. **Bundler/Vite** — transforms that module  
6. **HMR** — browser updates without full reload when possible  
7. You see new text under `<app-root>`

Production: same Ivy compile, then esbuild emits new `main-[newhash].js`, `index.html` points to it, budgets checked, deploy `dist/`.

---

### 60–75s spoken walkthrough (use in interviews)

> When I run a production build, the CLI first reads `angular.json` and finds the entry `main.ts`. TypeScript gives us typed ESM modules, then the **Ivy** compiler AOT-compiles every template into efficient render instructions and catches template errors at build time. From the entry, the bundler — **esbuild** in modern Angular — walks the import graph, tree-shakes dead code, and splits dynamic `import()` routes into separate chunks. Styles and assets are emitted, `index.html` is rewritten to reference hashed filenames, code is minified, and budgets are enforced. The browser then loads `index.html` + `main.js`, bootstraps Angular, and downloads lazy chunks only when the router needs them. In dev, the same compile story runs, but **Vite** serves and HMR’s for speed. Webpack used to be that bundler; it doesn’t change what Ivy does.

### Trap answers (sound senior by avoiding these)

| Trap | Better |
|---|---|
| “Vite compiles Angular templates” | Ivy compiles templates; Vite serves in dev |
| “esbuild replaces Angular compiler” | esbuild bundles; Ivy still required |
| “AOT means esbuild” | AOT = Angular template compile at build time |
| “Lazy loading is only a router feature” | Router API + **build split** into chunks |
| “dist is just one big JS file” | main + styles + lazy chunks (+ server if SSR) |

---

## 2. Why ES Modules matter for Angular

### Source style (what you write)

```ts
// ESM — static, analyzable
import { Component } from '@angular/core';
export class App {}
```

vs older Node style:

```js
// CommonJS — runtime require (harder to tree-shake)
const x = require('x');
module.exports = { … };
```

| | ESM | CommonJS |
|---|---|---|
| Syntax | `import` / `export` | `require` / `module.exports` |
| Analysis | Static → **tree shaking** | Dynamic → harder DCE |
| Angular apps | **Yes — standard** | Rare in app code; some Node tools |

**Interview link to tree-shaking:**

> Bundlers build a **module dependency graph** from ESM entry points, mark reachable exports, and sweep unused code (Mark-and-Sweep / DCE). That’s why ESM + side-effect-free packages matter. Deep dive: [frontend-system-design/11_TREE_SHAKING_MARK_AND_SWEEP.md](../frontend-system-design/11_TREE_SHAKING_MARK_AND_SWEEP.md).

### `tsconfig` (quick)

```json
{
  "compilerOptions": {
    "target": "ES2022",   // language level of emit
    "module": "ES2022",   // module format semantics
    "moduleResolution": "bundler" // modern Angular/CLI style
  }
}
```

> `target` = JS syntax level. `module` = how imports are organized. Modern Angular stays **ESM end-to-end**; the bundler may still emit browser-friendly chunks.

---

## 3. What the CLI “builder” is

In `angular.json`:

```json
"architect": {
  "build": {
    "builder": "@angular/build:application",
    "options": { "browser": "src/main.ts", "outputPath": "dist/app" }
  },
  "serve": {
    "builder": "@angular/build:dev-server"
  }
}
```

| Builder (concept) | Engine | Era |
|---|---|---|
| `@angular-devkit/build-angular:browser` | **Webpack** | Classic (pre–v17 default) |
| `…:browser-esbuild` | **esbuild** (browser-only drop-in) | Migration step |
| `…:application` / `@angular/build:application` | **esbuild** (+ SSR capable) | **Current default** for new apps |
| Dev server with application builder | **Vite** under the hood for serve | v17+ new apps |

**Don’t say:** “Angular *is* Webpack.”  
**Do say:** “CLI uses a **builder**; historically Webpack, now esbuild/Vite by default.”

---

## 4. Version timeline — build tooling

| Version | Build story |
|---|---|
| **≤15** | Webpack `browser` builder is the normal path |
| **16** | **esbuild-based builder** in developer preview (`ng build` / `ng serve` experiments) |
| **17** | **application builder stable + default** for `ng new` (esbuild; Vite for dev server). Webpack still supported |
| **18** | Migrations / guides to move hybrid SSR apps onto new pipeline; polish |
| **19–21** | New apps on application builder; Webpack path increasingly legacy |
| **Now** | Official: Webpack `browser` builder **deprecated** — prefer `@angular/build` (esbuild + Vite). Migrate: `ng update` → `use-application-builder` schematic |

```text
Webpack era          Preview              Default new apps         Webpack deprecated
─────────────        ────────             ────────────────         ──────────────────
… → v15              v16 esbuild DP       v17+ application         migrate to @angular/build
```

---

## 5. Webpack era — what to still know

Interviewers with older codebases still ask this.

### What Webpack did for Angular

1. Start at `main.ts` / `polyfills`  
2. Follow `import` graph  
3. Run loaders (TS, HTML templates, SCSS, assets)  
4. Angular compiler plugin (Ivy)  
5. Emit `main.js`, `runtime.js`, `polyfills.js`, lazy `chunk-*.js`, `styles.css`  
6. Dev: webpack-dev-server + rebuilds  

### Classic mental `dist/` (simplified)

```text
dist/my-app/
  index.html
  main.[hash].js          ← app bootstrap + eager code
  polyfills.[hash].js     ← zone.js etc. (historically)
  runtime.[hash].js       ← webpack runtime
  styles.[hash].css
  chunk-[name].[hash].js  ← lazy routes
```

### Why Webpack felt slow

- Heavy JS bundler, complex plugin graph  
- Cold builds and large apps hurt CI  
- esbuild is native/faster for many transform+bundle steps  

---

## 6. Current era — esbuild + Vite (application builder)

### Roles

| Tool | Role in modern Angular CLI |
|---|---|
| **esbuild** | Fast transpile/bundle of app (and related pipeline pieces) |
| **Angular compiler** | Still compiles templates (Ivy) — not replaced by esbuild |
| **Vite** | Dev server / fast serve experience with the new builder |
| **`@angular/build`** | Newer, leaner package hosting application/dev-server builders |

### Why it’s better (say in interviews)

- Much **faster** rebuilds / CI  
- Simpler mental model for many apps  
- **SSR / prerender** integrated into `application` builder (less separate Universal wiring)  
- Aligns with ESM-first ecosystem  

### What did *not* change

- You still write Angular + TypeScript ESM  
- **AOT + Ivy** still compile templates  
- Lazy routes still create **separate chunks**  
- Production still minifies, hashes, tree-shakes, checks **budgets**  

---

## 7. End-to-end: `ng serve` vs `ng build`

### Development (`ng serve`)

```text
Watch files → recompile changed modules → update browser (HMR / live reload)
Source maps friendly, less minify, faster iteration
```

### Production (`ng build --configuration production`)

```text
1. AOT compile all templates
2. Tree-shake unused exports (ESM graph)
3. Split: main + lazy route chunks + styles
4. Minify / optimize
5. Hash filenames for cache busting
6. Enforce budgets (fail if too big)
7. Write dist/
```

**Spoken:**

> Dev optimizes for feedback loop. Prod optimizes for download size, caching, and catching template errors at build time via AOT.

---

## 8. Lazy loading ↔ chunks (build structure)

```ts
// app.routes.ts
{
  path: 'admin',
  loadChildren: () => import('./admin/admin.routes').then(m => m.ADMIN_ROUTES),
}
```

```text
Build output idea:
  main.js          — shell + router
  admin-[hash].js  — only downloaded when user hits /admin
```

| Concept | Build meaning |
|---|---|
| Eager import | In main (or shared) chunk |
| Dynamic `import()` | Separate async chunk |
| `shared` vendor code | May land in common chunk (bundler decides) |

This is why “lazy loading improves initial load” is a **build + runtime** answer.

---

## 9. Ivy’s place in the pipeline

| Engine | Status |
|---|---|
| **View Engine** | Old compiler/runtime — removed (gone since Angular 13) |
| **Ivy** | Current — default since Angular 9 |

Ivy enables:

- Smaller bundles / better tree-shaking  
- Incremental compilation  
- Features like standalone, fine-grained instructions  

**Interview:** Build tool (Webpack/esbuild) ≠ template compiler (Ivy). Both run in the pipeline.

---

## 10. Polyfills & Zone.js in the build

Historically `polyfills.ts` / polyfills bundle loaded:

- Browser API shims (IE era — mostly gone)  
- **`zone.js`** for change detection  

Modern notes:

- Fewer browser polyfills  
- **Zoneless** apps (v21+ new apps often default) may **omit** `zone.js` from the build entirely → smaller payload  
- See [ANGULAR_CHANGE_DETECTION_ONPUSH_ZONELESS.md](./ANGULAR_CHANGE_DETECTION_ONPUSH_ZONELESS.md)

---

**vs `app.config.ts`:** [ANGULAR_APP_CONFIG_AND_ANGULAR_JSON.md](./ANGULAR_APP_CONFIG_AND_ANGULAR_JSON.md)

## 11. How to read `angular.json` in an interview

Point at:

1. **`builder`** — Webpack vs application/esbuild  
2. **`browser` / `main`** — entry  
3. **`styles` / `assets`**  
4. **`configurations.production`** — budgets, optimization, file replacements  
5. **`outputPath` / `outputHashing`**  

```text
If builder contains "browser" and not "application"
  → likely older Webpack-based app (or not yet migrated)

If "@angular/build:application" or "application"
  → modern default pipeline
```

Migration hint (official idea):

```bash
ng update @angular/cli --name use-application-builder
```

---

## 12. Custom Webpack? (senior follow-up)

Older apps sometimes used `@angular-builders/custom-webpack` to tap Webpack config.

With esbuild/application builder:

- Many Webpack plugins **don’t** apply  
- Prefer CLI options, esbuild-compatible tooling, or rare custom builders  
- Say: “I’d avoid custom Webpack unless forced; migrate to application builder first.”

---

## 13. Interview Q&A

**Q: Is Angular built with Webpack?**  
> Historically yes via the `browser` builder. New apps use the **application** builder with **esbuild** (and Vite for serve). Webpack path is deprecated.

**Q: What are ES modules and why does Angular use them?**  
> Standard `import`/`export`. Static structure enables tree-shaking and clear lazy `import()` chunks.

**Q: Webpack vs esbuild?**  
> Same goal (bundle). esbuild is much faster for many steps; Angular still runs its own Ivy compiler. Vite helps the modern `ng serve` DX.

**Q: When did the switch happen?**  
> esbuild preview in **v16**, default application builder in **v17**, Webpack deprecated as teams move to `@angular/build`.

**Q: What is AOT in the build?**  
> Templates compiled at build time into efficient JS — faster startup, earlier errors. Production always AOT.

**Q: What’s in `dist/`?**  
> `index.html` + hashed JS/CSS chunks (main, lazy routes, styles). Exact filenames vary by builder version.

**Q: How does lazy loading affect the build?**  
> Dynamic `import()` creates separate chunks loaded on navigation — smaller initial bundle.

**Q: Does esbuild replace Ivy?**  
> No. esbuild bundles/transforms; Ivy compiles Angular templates/components.

**Q: CommonJS in an Angular app?**  
> App code should stay ESM. Some dependencies may be CJS; bundler interops (`esModuleInterop`). Prefer ESM packages for shakeability.

**Q: Why was Webpack deprecated?**  
> Speed, simpler SSR integration, ecosystem direction. Official recommendation: migrate to application builder.

---

## 14. Cheat sheet

```text
Source     = TypeScript + ESM import/export
Compiler   = Ivy AOT (templates → JS)
Old bundle = Webpack (browser builder)
New bundle = esbuild application builder (+ Vite serve)
Default    = application builder since Angular 17 ng new
Now        = Webpack deprecated → @angular/build

ESM → static graph → tree-shake + lazy chunks
ng serve  → fast rebuild DX
ng build  → minify, hash, budgets, dist/
```

---

## 15. Practice checklist

- [ ] Walk **all 8 stages** in §1b out loud with the Shop example  
- [ ] Draw the layer diagram (ESM → tsc/Ivy → bundler → dist)  
- [ ] Name Webpack vs application builder + versions (16 preview / 17 default)  
- [ ] Explain why ESM helps tree-shaking  
- [ ] Explain lazy `import()` → chunk  
- [ ] Say “esbuild ≠ Ivy” and “Vite ≠ Ivy”  
- [ ] Contrast `ng serve` vs `ng build` per stage  
- [ ] Read an `angular.json` builder string and identify the era  
- [ ] Deliver the 60–75s spoken walkthrough from §1b without notes  

---

## Related

| Topic | File |
|---|---|
| npm / tsconfig / AOT basics | [ANGULAR_ECOSYSTEM_FUNDAMENTALS.md](./ANGULAR_ECOSYSTEM_FUNDAMENTALS.md) |
| Feature-by-version timeline | [ANGULAR_VERSION_FEATURES.md](./ANGULAR_VERSION_FEATURES.md) |
| Tree shaking algorithm | [../frontend-system-design/11_TREE_SHAKING_MARK_AND_SWEEP.md](../frontend-system-design/11_TREE_SHAKING_MARK_AND_SWEEP.md) |
| Bundles / code splitting | [../frontend-system-design/02_BUNDLE_OPTIMIZATION_CODE_SPLITTING_LAZY_LOADING.md](../frontend-system-design/02_BUNDLE_OPTIMIZATION_CODE_SPLITTING_LAZY_LOADING.md) |
| Zoneless / polyfills | [ANGULAR_CHANGE_DETECTION_ONPUSH_ZONELESS.md](./ANGULAR_CHANGE_DETECTION_ONPUSH_ZONELESS.md) |

Official: [angular.dev — build system migration](https://angular.dev/tools/cli/build-system-migration)
