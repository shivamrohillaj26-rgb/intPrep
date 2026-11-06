# OneTrust — Webpack vs ES modules (build, interview depth)

**Prefer the short card:** [ONETRUST_ESM_IMPORT_MAPS.md](./ONETRUST_ESM_IMPORT_MAPS.md). This file is the long dump.

**Use this when they ask:** “What is Webpack?” · “What is an ES module?” · “Why Native Federation not Webpack MF?” · “How does Angular build?”

**Not the same as Nx.** Nx decides *which project* to compile. Webpack/esbuild pack *that project’s files*.  
**Not the same as Module Federation.** MF is *runtime load of remotes*. Webpack is one *engine* that can implement MF.

Federation wording stays in [ONETRUST_MFE_SENIOR_ROUND.md](./ONETRUST_MFE_SENIOR_ROUND.md) §2b.  
Stage-by-stage Angular CLI pipeline: [../angular-interview-prep/ANGULAR_BUILD_ESM_WEBPACK_ESBUILD.md](../angular-interview-prep/ANGULAR_BUILD_ESM_WEBPACK_ESBUILD.md).

---

## 0. 45s opener (say this first)

> An **ES module** is a JS file with static `import` / `export`. The browser and the bundler can see a **graph** of dependencies — that’s why we can **tree-shake** and **split** lazy routes. Browsers still shouldn’t download 2,000 tiny source files in production, so a **bundler** walks that graph and emits a few hashed chunks. **Webpack** is the bundler Angular used for years (`browser` builder): loaders, plugins, a **runtime** in `main.js`, and Webpack 5 **Module Federation**. Modern Angular uses the **application builder**: **esbuild** packs ESM, **Vite** serves in dev, **Ivy** still compiles templates. We write ESM either way. Native Federation shares remotes with **import maps** (browser ESM) instead of Webpack’s share scope.

---

## 1. What problem are we solving?

```text
You write:  hundreds of .ts files  (import A from './a')
Browser wants:  a few JS files it can cache  (main-abc.js, admin-def.js)
```

| Without a bundler (naive) | With a bundler |
|---|---|
| `<script>` per file, or hundreds of HTTP requests | Graph → **chunks** |
| No minify, no hash, no dead-code drop | Tree-shake, minify, `main.[hash].js` |
| `require()` / CJS messy in the browser | ESM in, browser-friendly files out |

**Spoken:** Webpack (or esbuild) is not Angular. **Ivy** understands `{{ title }}`. The bundler understands **modules and files**.

---

## 2. What is an ES module? (deep)

### Definition

**ESM** = the **official JS module system** (`import` / `export`), standardized in ES2015, native in modern browsers via `<script type="module">`.

```ts
// devices.api.ts
export function fetchDevices() { /* … */ }

// devices.page.ts
import { fetchDevices } from './devices.api';
```

Rules interviewers care about:

1. **Static** — imports are declarations, not runtime strings (except `import()`). Bundler can analyse **before** run.  
2. **File = module** — one evaluation, live bindings (`export let count`).  
3. **Strict mode** always.  
4. **Deferred by default** in the browser (`type="module"` waits for HTML parse, like `defer`).  
5. **CORS** for cross-origin modules.  
6. **Must use URLs** in the browser (`./foo.js` with extension historically; bundlers hide that).

### ESM vs CommonJS (they will mix these)

| | **ES module** | **CommonJS** |
|---|---|---|
| Syntax | `import` / `export` | `require` / `module.exports` |
| When resolved | **Load time** (static) | **Run time** (can `require` inside `if`) |
| Tree-shaking | Natural | Hard — bundler must guess |
| Where | Browser + modern Node | Node historically; some old libs |
| Angular app code | **This** | Don’t write this in the app |

```js
// CJS — bundler cannot always see what’s used
const lib = require(flag ? 'a' : 'b');
module.exports = lib.foo;
```

**Interop:** `esModuleInterop` / bundler shims when an npm package is still CJS. Prefer ESM packages for shakeability.

### Static `import` vs dynamic `import()`

```ts
import { AuthService } from '@idms/kernel';     // eager — in the chunk that imports it

const admin = () => import('./admin.routes');   // split point → extra file in dist/
```

**Spoken:** Dynamic `import()` is a **Promise** of a module namespace. The **router** uses it for lazy routes; the **bundler** emits a separate chunk. That’s lazy loading at the **build** layer, not only a Router API.

### Tree-shaking (why ESM matters)

```text
Mark: from main.ts, which exports are reachable?
Sweep: drop the rest (DCE)
```

ESM’s static graph is what Mark-and-Sweep needs. Deep: [../frontend-system-design/11_TREE_SHAKING_MARK_AND_SWEEP.md](../frontend-system-design/11_TREE_SHAKING_MARK_AND_SWEEP.md).

`sideEffects: false` in a library’s `package.json` tells the bundler unused files are safe to drop.

### Webpack **does** tree-shake (common wrong answer)

**Do not say:** “Tree-shaking doesn’t happen in Webpack.”  
**Do say:** “Webpack **does** tree-shake **ES modules**. It **cannot** reliably tree-shake **CommonJS**.”

| | Tree-shake? |
|---|---|
| Webpack + **ESM** (`import { foo }`) | **Yes** (Webpack 2+, much better in 4/5 + `usedExports` / Terser) |
| Webpack + **CJS** (`require`) | **Basically no** — `require` is dynamic |
| esbuild / Rollup / Vite prod + ESM | **Yes** |
| Browser native ESM, **no** bundler | Unused exports still **download** — no DCE unless you bundle or use a build step |

**How Webpack tree-shaking actually works:**

1. Parse ESM → mark which **exports are used** (`optimization.usedExports`).  
2. If a package says `"sideEffects": false`, drop **whole unused files**.  
3. **Terser** (minify) deletes dead `if (false)` / unused functions.  

Caveats (sound senior):

- Side-effectful modules (`polyfill.ts` that only patches `Array`) **must not** be shaken — that’s why `sideEffects` exists.  
- Old Webpack converted ESM → CJS internally and **lost** shake; Webpack 5 keeps ESM longer.  
- `import * as all from 'lib'` and `import moment from 'moment'` (CJS) often **keep the whole lib**.  
- Production mode (`mode: 'production'`) turns this on; `ng serve` may keep extra code for speed.

**Spoken 20s:**

> Tree-shaking is a property of **ESM + a bundler**, not “esbuild only.” Webpack has done it for years. If shaking fails, the library is usually CommonJS or has side effects, not because Webpack can’t shake.

---

## 2b. “Which is better — Webpack or ES modules?” (they will ask this)

**Trap:** treating them as two products you pick between.

> They’re **different layers**. ESM is **how modules are written**. Webpack is **a bundler that consumes modules**. Asking which is better is like asking “which is better, TypeScript or Jenkins?”

```text
YOU WRITE  →  ESM (or accidentally CJS)
THEN          Webpack / esbuild / Rollup  PACKS that graph
THEN          Browser runs chunks (often still ESM-shaped, type=module)
```

### Differences (table you can whiteboard)

| | **ES module** | **Webpack** |
|---|---|---|
| What it is | **Language / spec** (`import`/`export`) | **Build tool** (bundler) |
| When it runs | Browser or Node **loads** a module | **Build time** (and webpack-dev-server in dev) |
| Job | Declare dependencies statically | Graph → chunks, loaders, plugins, minify, hash, MF |
| Tree-shaking | **Enables** it (static graph) | **Performs** it on that graph |
| Can exist alone? | Yes — `<script type="module">` | Yes — can bundle CJS/AMD too |
| Replaced by? | Not replaced — still how we write Angular | Partly **esbuild** in modern Angular CLI |

### “Which is better?” — the answer they want

> **ESM is better than CommonJS** as a *module format* — static, shakeable, native in the browser.  
> **esbuild is often better than Webpack** as a *bundler for modern Angular* — faster, fits application builder.  
> **Webpack is better** when you need its **plugin ecosystem** (classic Module Federation, custom loaders) or you’re on a Webpack estate.  
> I don’t choose “Webpack vs ESM.” I **write ESM** and pick **Webpack or esbuild** as the packer.

### Why people confuse them

Interviewers lump “old stack = Webpack” vs “new stack = ESM.” Reality: **Angular has been ESM in source for a long time**, including the Webpack era. What changed is the **packer** (Webpack → esbuild) and **how remotes share** (Webpack share scope → import maps).

### If they force a winner

> For a **new** Angular app: **ESM source + esbuild application builder**. Webpack is legacy CLI. ESM isn’t optional — it’s how the app is authored. Native Federation is ESM-at-runtime sharing, which Webpack MF is not “better than” as a format — it’s a different runtime.

---

```html
<script type="module" src="/main.js"></script>
```

```js
// main.js
import { bootstrap } from './app.js';
```

Browsers resolve the graph **themselves**. That’s slow for a huge app (waterfall of files) unless you also use **import maps** and/or a bundler.

**Import map** (Native Federation uses this idea):

```json
{
  "imports": {
    "@angular/core": "/mfe/shared/@angular/core.js",
    "devices/Routes": "/mfe/devices/chunk.js"
  }
}
```

> The browser asks “where is `@angular/core`?” The map points at **one** shared ESM file so host and remotes don’t download Angular twice. Webpack MF did the same job inside **Webpack’s runtime**, not the browser’s module spec.

### `tsconfig` (10s)

> `module: "ES2022"` = emit ESM semantics. `target` = syntax (`async`, optional chaining). Angular stays **ESM in source**; the bundler may still concatenate into chunks.

---

## 3. What is Webpack? (deep)

### Definition (30s)

> **Webpack** is a **module bundler**. You give it an **entry** (`main.ts`). It builds a **dependency graph** (every `import`, plus files loaders invent). **Loaders** turn non-JS into JS (TS, SCSS, HTML). **Plugins** hook the compiler (minify, HTML inject, **ModuleFederationPlugin**). Output is **chunks** plus a small **Webpack runtime** that knows how to `require` those chunks in the browser — even if your source was ESM.

It is a **build-time** tool. It is not a framework. It can also **serve** in dev (`webpack-dev-server`).

### Mental model

```text
entry: src/main.ts
        │
        ▼
   MODULE GRAPH
   main → app → router → devices.page
              ↘ lazy import() → admin.routes  (separate chunk)
        │
        ▼
   LOADERS     .ts → JS    .scss → CSS    template → (Ivy already JS)
        │
        ▼
   PLUGINS     minify, hash, federation, DefinePlugin
        │
        ▼
   dist/
     runtime.js      ← Webpack’s module loader (share scope lives here for MF)
     main.js
     admin.[hash].js
     styles.css
```

### Core vocabulary (say these)

| Term | Meaning |
|---|---|
| **Entry** | Graph root(s). Angular: `main.ts` (+ polyfills historically) |
| **Output** | `dist/` filename pattern, `publicPath` (CDN prefix — **critical for remotes**) |
| **Loader** | Transform **one file** (`ts-loader`, `css-loader`, `file-loader`) |
| **Plugin** | Transform the **compilation** (whole graph). Federation is a **plugin** |
| **Chunk** | An output file. Main chunk vs async chunk |
| **Runtime** | Tiny JS Webpack injects: `__webpack_require__`, load extra chunks, **share scope** for MF |
| **publicPath** | URL prefix for lazy chunks. Wrong path = blank MFE after deploy |
| **Code splitting** | Split graph into chunks (`import()`, `SplitChunksPlugin`) |
| **HMR** | Dev: replace a module without full reload |

### Why Webpack got famous for Angular / MF

1. One tool that understood **mixed assets** (JS + CSS + images).  
2. **Code splitting** mature.  
3. Webpack 5 **Module Federation** — host/remote/shared **inside this runtime**.  
4. Angular CLI hid it: `browser` builder = Webpack under `angular.json`.

### Why it felt slow / why Angular moved

- Huge plugin/loader JS pipeline.  
- Cold `ng build` on a dashboard like NUX hurt CI.  
- **esbuild** (Go) does parse+bundle much faster.  
- Angular 17+ **application builder** = esbuild (+ Vite serve). Webpack `browser` builder is **deprecated**.

**Spoken:** “I still know Webpack because older apps and Webpack MF exist. I don’t insist on it for a greenfield Angular 19/21 app.”

### Webpack Module Federation (only the build angle)

```js
new ModuleFederationPlugin({
  name: 'devices',
  filename: 'remoteEntry.js',   // Webpack glue, not a JSON catalog
  exposes: { './Routes': './src/remote.routes.ts' },
  shared: { '@angular/core': { singleton: true } },
});
```

`remoteEntry.js` is **Webpack’s catalog + runtime**. Shared deps go through **share scope** in that runtime.  
Native Federation: **`remoteEntry.json` + ESM + import maps** — same *product* idea, no Webpack runtime required. → MFE §2b.

### Custom Webpack in Angular

`@angular-builders/custom-webpack` — tap `webpack.config`. With application builder, **most Webpack plugins do not apply**. Say: “I’d migrate to application builder first; I wouldn’t add custom Webpack to use MF.”

---

## 4. esbuild / Vite — same job, different engine

**Yes — esbuild is the comparable to Webpack.** Both are **bundlers**. ESM is not. Vite is mostly the **dev server** sitting next to esbuild.

```text
SAME JOB     Webpack  ≈  esbuild     (pack the ESM graph → chunks)
NOT SAME JOB Webpack  ≠  ESM         (tool vs language)
NOT SAME JOB esbuild  ≠  Ivy         (packer vs template compiler)
DEV ONLY     Vite     ≈  webpack-dev-server
```

**Spoken 25s:**

> Webpack and esbuild do the same job: follow `import`s, tree-shake ESM, split lazy chunks, emit hashed JS. esbuild is written in Go so it’s much faster; Webpack is more plugin-heavy (loaders, ModuleFederationPlugin). Angular 17+ production builds use **esbuild** (application builder). `ng serve` uses **Vite**. I still write **ESM** in both eras.

| | **Webpack** | **esbuild** | **Vite** |
|---|---|---|---|
| Job | Bundle (+ historic MF) | Bundle / transpile **fast** | **Dev server** (and ESM unbundled serve) |
| Speed | Slower on huge graphs | Very fast | Fast refresh in `ng serve` |
| Tree-shake ESM? | Yes | Yes | Delegates to esbuild/Rollup in prod setups |
| Plugin universe | Huge (MF, custom loaders) | Smaller, on purpose | Vite plugins (dev) |
| Understands `{{title}}`? | No | No | No |
| Angular 17+ `ng build` | Legacy | **Yes** (application builder) | Not the prod packer |
| Angular 17+ `ng serve` | Old | Used in pipeline | **Yes** |
| MFE | `ModuleFederationPlugin` | Native Federation (ESM + import maps) | — |

**When Webpack still wins:** existing Webpack MF remotes, one-off loaders/plugins the CLI doesn’t replace.  
**When esbuild wins:** new Angular, CI time, no need for Webpack runtime. That’s why we use **Native Federation**, not Webpack MF.

**Trap:** “esbuild replaced Ivy.” **No.** Ivy = templates/DI. esbuild = files.

---

## 5. How this maps to NUX / OneTrust story

```text
Source          TypeScript ESM  (import/export)
Angular brain   Ivy AOT
Packer          Webpack (old NUX era)  OR  esbuild (conversion / modern CLI)
MFE runtime     Webpack MF  OR  Native Federation (ESM + import maps)
Monorepo CI     Nx affected  (not a bundler)
```

**What you say about IDMS:**

> Prod dashboard is still **one** Angular production build (Jenkins zip) — historically the **Webpack-era CLI path**, moving with Angular upgrades toward **application builder**. The **conversion** remotes are **Native Federation on esbuild** so we don’t implement Module Federation with a bundler we’re leaving. Shared Angular is **ESM singletons** via import maps, not `ModuleFederationPlugin`.

---

## 6. `angular.json` — where is the builder? (open this in the interview)

Path:

```text
angular.json
  → projects
    → <app name>
      → architect
        → build     ← ng build  (THIS is Webpack vs esbuild)
        → serve     ← ng serve
        → test
```

In this repo, practice app:

```42:43:prevonir-interview-practice/angular.json
        "build": {
          "builder": "@angular/build:application",
```

**`@angular/build:application` = esbuild** (current). That is the packer for `ng build`.

Serve is a **different** builder (Vite under the hood with the new pipeline):

```81:82:prevonir-interview-practice/angular.json
        "serve": {
          "builder": "@angular/build:dev-server",
```

| `builder` string you see | Engine | Command |
|---|---|---|
| `@angular/build:application` | **esbuild** | `ng build` |
| `@angular/build:dev-server` | **Vite** + application build | `ng serve` |
| `@angular-devkit/build-angular:browser` | **Webpack** (legacy) | old `ng build` |
| `@angular-devkit/build-angular:dev-server` | webpack-dev-server | old `ng serve` |
| `@angular-architects/native-federation-v4:build` | NF wrapper, then application/esbuild | MFE host/remote |

**Spoken:**

> I’d open `angular.json` → `projects.<name>.architect.build.builder`. If it says **`application`**, we’re on **esbuild**. If it says **`browser`** (old package), we’re on **Webpack**. `serve.builder` is the dev server, not the production packer.

Nx workspaces: same key, sometimes in `project.json` per app instead of one giant `angular.json` — still `architect.build.builder`.

---

## 7. Question bank (out loud)

**Q: What is Webpack?**  
> A module bundler: entry → graph → loaders/plugins → chunks + a runtime. Angular used it via the `browser` builder. Webpack 5 added Module Federation as a plugin.

**Q: What is an ES module?**  
> A file with static `import`/`export`. Native in the browser with `type="module"`. Enables tree-shaking and `import()` split points. Angular source is ESM.

**Q: Webpack vs ESM?**  
> ESM is the **language/module format**. Webpack is a **tool** that consumes modules (often ESM) and emits bundles. You can run ESM **without** Webpack (native + import maps). You can use Webpack **on** ESM. Full answer §2b.

**Q: Which is better, Webpack or ES modules?**  
> Different layers — not a vs. **ESM > CJS** as a format. **esbuild > Webpack** as the packer for new Angular. Webpack still wins on plugin/MF estates. I write ESM either way.

**Q: Does Webpack tree-shake?**  
> **Yes**, on ESM. Not reliably on CommonJS. Needs production mode + `usedExports` + Terser; libraries need correct `sideEffects`. Failure is usually CJS/side-effects, not “Webpack can’t shake.”

**Q: Why bundle if browsers support ESM?**  
> Latency: too many files. Also minify, hash, CSS pipeline, legacy CJS deps. Native Federation still **emits** ESM chunks — it doesn’t ship raw `src/`.

**Q: What is a loader vs plugin?**  
> Loader = per-file transform. Plugin = whole compilation (federation, HTML, minify).

**Q: What is Webpack runtime?**  
> Glue in the bundle that loads chunks and, for MF, holds **share scope**. Native Federation avoids needing that glue.

**Q: Tree-shaking without ESM?**  
> Painful. CJS `require` is dynamic. Senior answer: ESM + `sideEffects`.

**Q: Lazy loading vs MFE?**  
> Lazy `import()` = **one app**, extra chunk, **same deploy**. Federation remote = **another build artifact**, other team’s pipeline.

**Q: Why Native Federation then?**  
> We want MF **semantics** on an **ESM/esbuild** pipeline. Webpack MF would pin us to Webpack.

**Q: Vite vs Webpack vs esbuild?**  
> Vite = modern **dev server** (ESM in dev). esbuild = **prod packer** for current Angular. Webpack = old packer + MF plugin ecosystem.

**Q: Does `import` in the browser hit `node_modules`?**  
> No. Bare specifiers (`@angular/core`) need a **bundler** or an **import map**. That’s why NF prepares shared ESM.

**Q: `type="module"` vs classic script?**  
> Module: deferred, strict, CORS, `import`. Classic: blocking unless `async`/`defer`, no `import`.

---

## 8. Cheat card

```text
ESM        = import/export, static graph, tree-shake, import() chunks, type=module
Webpack    = bundler: graph + loaders + plugins + runtime (+ MF plugin)
esbuild    = faster bundler; Angular application builder
Vite       = ng serve DX, not Ivy
Ivy        = templates — not a bundler
Nx         = which project to build
MF         = runtime remotes
NF         = MF idea on ESM + import maps (no Webpack share scope)

Webpack ≠ ESM. ESM is the format. Webpack is one packer.
Tree-shake = ESM graph + bundler (Webpack YES, CJS NO)
“Which is better?” = ESM vs CJS, and esbuild vs Webpack — not ESM vs Webpack
```

---

## 9. Practice

- [ ] 45s opener without notes  
- [ ] Draw entry → graph → chunks  
- [ ] Explain import maps in one sentence  
- [ ] Contrast lazy chunk vs federated remote  
- [ ] Name `browser` vs `application` builder  
- [ ] “Webpack does tree-shake ESM; not CJS”  
- [ ] 30s “which is better Webpack vs ESM” without picking a fake winner  

---

## Related

| File | When |
|---|---|
| [ONETRUST_MFE_SENIOR_ROUND.md](./ONETRUST_MFE_SENIOR_ROUND.md) §2b | MF vs Native Federation |
| [ONETRUST_NX_MONOREPO.md](./ONETRUST_NX_MONOREPO.md) | Nx is not the bundler |
| [../angular-interview-prep/ANGULAR_BUILD_ESM_WEBPACK_ESBUILD.md](../angular-interview-prep/ANGULAR_BUILD_ESM_WEBPACK_ESBUILD.md) | 8-stage `ng build` walkthrough |
| [../frontend-system-design/02_BUNDLE_OPTIMIZATION_CODE_SPLITTING_LAZY_LOADING.md](../frontend-system-design/02_BUNDLE_OPTIMIZATION_CODE_SPLITTING_LAZY_LOADING.md) | Chunks / budgets |
