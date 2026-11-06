# Angular Interview Fundamentals — Ecosystem, npm, TypeScript & Build

Interviewers often start here — not with Signals or NgRx.

These questions check whether you understand the **toolchain** you use every day.

For each topic you’ll get:

1. Short spoken answer (say this first)
2. Deep explanation
3. Tiny example / mental model
4. Follow-up they may ask

---

## Spoken opener (if they say “tell me about your Angular setup”)

> Day to day I work with Angular CLI, npm, TypeScript, and the app build pipeline. I’m comfortable with semantic versioning, lockfiles, tsconfig, module systems, AOT vs JIT, lazy loading, and what production builds do — not only writing components.

---

# PART A — npm & package.json

## 1. Semantic Versioning (SemVer)

### Say this

> SemVer is `MAJOR.MINOR.PATCH`. Patch = bug fixes, minor = backward-compatible features, major = breaking changes.

### Deep

Format: **`MAJOR.MINOR.PATCH`** (example: `18.2.1`)

| Part | When it increases | Meaning |
|---|---|---|
| **MAJOR** | Breaking API changes | Old code may break |
| **MINOR** | New features, backward compatible | Safe to upgrade carefully |
| **PATCH** | Bug fixes, no API break | Safest bumps |

Examples:

- `1.0.0` → `1.0.1` → patch  
- `1.0.1` → `1.1.0` → minor  
- `1.1.0` → `2.0.0` → major (breaking)

Pre-release tags also exist: `1.0.0-beta.1`, `2.0.0-rc.0`.

### Follow-up

**Q:** Why care in Angular apps?  
**A:** Angular major versions can have breaking changes (API removals). Pinning / ranges control when those land.

---

## 2. `^` vs `~` in package.json

### Say this

> `^` allows minor and patch updates within the same major. `~` allows only patch updates within the same minor. Exact version allows none.

### Deep

Given dependency `"rxjs": "^7.8.0"`:

| Range | Allows | Example updates |
|---|---|---|
| `"7.8.0"` | Exact only | only 7.8.0 |
| `"~7.8.0"` | Patch | 7.8.0 → 7.8.x (not 7.9) |
| `"^7.8.0"` | Minor + patch | 7.8.0 → 7.x.x (not 8.0) |
| `"*"` / `"latest"` | Almost anything | risky |

Mental model:

```text
^1.2.3  →  >=1.2.3 <2.0.0
~1.2.3  →  >=1.2.3 <1.3.0
```

For `0.x` versions, caret rules are stricter (many treat `^0.2.3` as only patch within 0.2) — mention if asked.

### Follow-up

**Q:** Which is safer?  
**A:** `~` is tighter/safer for stability. `^` is npm’s common default for more updates. Teams often rely on **lockfile** for reproducibility either way.

---

**`app.config.ts` vs `angular.json` (runtime vs CLI):** [ANGULAR_APP_CONFIG_AND_ANGULAR_JSON.md](./ANGULAR_APP_CONFIG_AND_ANGULAR_JSON.md)

## 2b. `package.json` vs `package-lock.json` vs `angular.json`

Interview favorite — three different jobs:

| File | Owner | Job |
|---|---|---|
| **`package.json`** | npm / Node | Project **dependencies + scripts** (`dependencies`, `devDependencies`, `"start": "ng serve"`). Versions often as **ranges** (`^19.0.0`). |
| **`package-lock.json`** | npm (auto) | **Exact tree** that was installed — every package + nested dep + integrity hash. Makes `npm ci` reproducible. **Don’t hand-edit.** |
| **`angular.json`** | Angular CLI | **Workspace / build config** — apps/libs, `sourceRoot`, build/serve/test targets, budgets, styles, assets, file replacements. Not about npm versions. |

```text
package.json        → WHAT libraries you depend on (+ npm scripts)
package-lock.json   → WHICH exact versions got installed
angular.json        → HOW Angular CLI builds/serves YOUR app
```

**Spoken (30s):**

> `package.json` declares dependencies and scripts with version ranges. `package-lock.json` freezes the exact install tree so CI matches my laptop. `angular.json` is Angular CLI workspace config — projects, build options, assets, budgets — it doesn’t replace the lockfile or list npm packages.

**Quick traps**

| Trap | Truth |
|---|---|
| “angular.json is like package.json” | No — CLI project config vs npm metadata |
| Delete lockfile casually | Breaks reproducible installs |
| Put API URLs only in angular.json | Often env/`fileReplacements` / runtime config instead |

---

## 3. Why do we need `package-lock.json`?

### Say this

> `package.json` allows version ranges. `package-lock.json` pins the exact resolved versions of every package (and nested deps) so installs are reproducible across machines and CI.

### Deep

Without a lockfile:

```text
Dev A installs today → lodash 4.17.21
Dev B installs next month → lodash 4.17.22
→ “works on my machine” bugs
```

With lockfile:

- Exact versions
- Exact integrity hashes
- Nested dependency tree frozen

**Rule:** commit `package-lock.json` (or `yarn.lock` / `pnpm-lock.yaml`). Don’t ignore it.

### Follow-up

**Q:** Should I edit lockfile by hand?  
**A:** No. Let `npm install` update it.

---

## 4. `npm install` vs `npm ci`

### Say this

> `npm install` resolves ranges and may update the lockfile. `npm ci` does a clean install strictly from the lockfile — faster and deterministic, preferred in CI.

### Deep

| | `npm install` | `npm ci` |
|---|---|---|
| Needs lockfile? | No (creates/updates) | **Yes** (must exist) |
| Updates lockfile? | Often yes | **No** — fails if mismatch |
| `node_modules` | Mutates existing | Deletes & reinstalls clean |
| Use case | Local development | CI/CD, production builds |
| Speed | Slower when resolving | Usually faster/cleaner |

Interview line:

> Locally I use `npm install`. In pipelines I use `npm ci` for reproducible builds.

---

## 5. dependencies vs devDependencies vs peerDependencies

### Say this

> `dependencies` are needed at runtime. `devDependencies` are only for develop/build/test. `peerDependencies` are expected to be provided by the host app — common in Angular libraries.

### Deep

### `dependencies`

Runtime packages your app imports in production code:

- `@angular/core`, `rxjs`, `zone.js` (older apps), etc.

### `devDependencies`

Tools not shipped as app runtime:

- `@angular/cli`, `typescript`, `karma`, `jasmine`, `eslint`, etc.

### `peerDependencies`

“I need this package, but **you** (the consumer) must install a compatible version.”

Classic Angular library case:

```json
{
  "peerDependencies": {
    "@angular/core": "^19.0.0",
    "@angular/common": "^19.0.0"
  }
}
```

Why? So the library doesn’t bundle its own second copy of Angular (duplicate Angular = broken DI/change detection).

### Quick table

| Type | Installed for app? | Shipped to prod bundle? | Who provides it? |
|---|---|---|---|
| dependencies | yes | usually yes (if imported) | your app |
| devDependencies | yes (dev) | no | your app |
| peerDependencies | must be present | via host app | consumer/host |

### Follow-up

**Q:** Does `npm install` install peerDeps?  
**A:** Modern npm often installs them automatically, but peer conflicts still need resolving. Conceptually peers are “provided by host”.

---

## 6. Why don’t we commit `node_modules` to Git?

### Say this

> `node_modules` is huge, OS/CPU specific sometimes, and fully reproducible from `package.json` + lockfile. Committing it bloats the repo and causes merge/platform hell.

### Deep

Reasons:

1. **Size** — tens/hundreds of thousands of files  
2. **Reproducible** via lockfile  
3. **Platform binaries** (native addons) differ by OS  
4. **Merge conflicts** are nightmare-level  

What we commit instead:

- `package.json`
- `package-lock.json`
- (not `node_modules`)

CI/devs run `npm ci` / `npm install`.

---

## 7. What happens when you run `npm install`?

### Say this

> npm reads `package.json`, resolves versions (using lockfile if present), downloads packages into `node_modules`, updates the lockfile if needed, and runs lifecycle scripts like `postinstall`.

### Step-by-step mental model

```text
1. Read package.json (+ package-lock.json if exists)
2. Build dependency tree (resolve ^/~ ranges)
3. Fetch tarballs from registry (or cache)
4. Extract into node_modules/
5. Update package-lock.json (if install mode allows)
6. Run install lifecycle scripts (preinstall/postinstall)
7. Deduplicate / hoist where possible
```

If lockfile exists and is in sync → closer to deterministic.  
If not → npm picks latest allowed versions in ranges.

---

## 7b. What is an npm registry? (Optum-style)

### Say this

> An **npm registry** is a server that hosts package tarballs and metadata. The default public one is `https://registry.npmjs.org`. Companies often run a **private registry** (Verdaccio, GitHub Packages, Azure Artifacts, JFrog Artifactory) for internal libraries.

### Config

```ini
# .npmrc
registry=https://registry.npmjs.org/
@org:registry=https://npm.mycompany.com/
//npm.mycompany.com/:_authToken=${NPM_TOKEN}
```

Scoped packages (`@org/logging`) can point at a different registry than the default.

### Package not on the public registry — options

| Method | When |
|---|---|
| Private registry (`npm publish` + `.npmrc`) | **Best** for internal shared libs |
| `npm install git+https://…` | Quick / source-based |
| `npm install ../path` or `"file:../lib"` | Local / monorepo hacking |
| Verdaccio / Artifactory proxy | Cache public + host private |
| Vendor tarball `npm install ./pkg.tgz` | Air-gapped / rare |

Interview line:

> I’d publish `@org/logging` to our private registry and configure `.npmrc` so installs resolve `@org/*` there. For a one-off, `file:` or git URL works, but a registry scales better.

---

## 8. npm vs npx vs ng

### Say this

> `npm` manages packages. `npx` runs a package binary (local or temporary) without global install. `ng` is the Angular CLI command — usually from local `node_modules/.bin/ng` via npm scripts or npx.

### Deep

| Command | Role |
|---|---|
| `npm` | install/publish/scripts (`npm install`, `npm run build`) |
| `npx` | execute a CLI (`npx ng new app`, `npx eslint .`) |
| `ng` | Angular CLI itself (`ng serve`, `ng generate`, `ng build`) |

Common patterns:

```bash
npm install                 # install deps
npm start                   # runs script → often ng serve
npx ng generate component x # run local CLI
ng serve                    # if CLI is on PATH / npm bin linked
```

`package.json` scripts automatically put `node_modules/.bin` on PATH, so:

```json
{ "scripts": { "start": "ng serve" } }
```

works without global Angular CLI.

---

# PART B — TypeScript config

## 9. Purpose of `tsconfig.json`

### Say this

> `tsconfig.json` tells the TypeScript compiler how to compile the project — target JS version, module system, strictness, path aliases, which files to include.

### Deep (fields you’ll be asked about)

| Option | Meaning |
|---|---|
| `target` | Emit JS for which ECMAScript version (`ES2022`, `ES5`…) |
| `module` | Module format of emitted/bundled code context (`ES2022`, `commonjs`…) |
| `strict` | Enables strong type-checking suite |
| `baseUrl` / `paths` | Import aliases |
| `experimentalDecorators` | Needed historically for Angular decorators |
| `useDefineForClassFields` | Class field emit semantics (Angular cares) |
| `angularCompilerOptions` | Angular template type-checking etc. |

Angular apps usually have:

- `tsconfig.json` (base)
- `tsconfig.app.json` (app build)
- `tsconfig.spec.json` (tests)

---

## 10. `target` vs `module` in TypeScript

### Say this

> `target` is the **language level** of emitted JavaScript (syntax). `module` is the **module system** used for imports/exports organization.

### Deep

### `target`

Controls syntax downleveling:

- `target: ES5` → transpile classes/arrow functions to older JS  
- `target: ES2022` → keep modern syntax  

Affects **what JS features** appear in output (before bundler may transform further).

### `module`

Controls module format semantics:

- `commonjs` → `require` / `module.exports`  
- `es2020` / `esnext` / `ES2022` → `import` / `export`  

In modern Angular (esbuild/Vite-style tooling), you typically stay on **ES modules** end-to-end.

### Tiny analogy

```text
target  = which JavaScript dialect (ES5 vs ES2022)
module  = how files import each other (CJS vs ESM)
```

---

## 11. What does `esModuleInterop` do?

### Say this

> It makes TypeScript’s interop with CommonJS defaults smoother, so you can write `import x from 'pkg'` even when the package was authored as CommonJS `module.exports = ...`.

### Deep

Without interop, CJS default exports often need:

```ts
import * as fs from 'fs';
// or
import fs = require('fs');
```

With `"esModuleInterop": true` (and usually `allowSyntheticDefaultImports`):

```ts
import express from 'express';
```

works more naturally.

Angular/TS presets usually enable this. You rarely turn it off.

---

# PART C — Modules, polyfills, source maps

## 12. CommonJS vs ES Modules

### Say this

> CommonJS is Node’s older `require/module.exports`, loaded synchronously. ES Modules are standard `import/export`, support static analysis, and enable better tree shaking in browsers/bundlers.

### Deep

| | CommonJS (CJS) | ES Modules (ESM) |
|---|---|---|
| Syntax | `require` / `module.exports` | `import` / `export` |
| Where classic | older Node | browsers + modern Node/Angular |
| Loading | runtime dynamic | static structure (mostly) |
| Tree shaking | hard | good (static imports) |
| File hints | `.cjs`, `"type": "commonjs"` | `.mjs`, `"type": "module"` |

Angular application code is **ESM-oriented**. Some Node tools still mix both — hence `esModuleInterop`.

---

## 13. What is `polyfills.ts`, and why is it needed?

### Say this

> Polyfills add missing modern browser APIs to older browsers so your app can run there. In older Angular apps, `polyfills.ts` was the entry that loaded those shims (and often Zone.js).

### Deep

Example idea:

- Old browser lacks `Promise` / `Array.from` / certain APIs  
- Polyfill implements them before app code runs  

Historically Angular `src/polyfills.ts` imported:

- browser polyfills (if supporting IE/old browsers)
- `zone.js` (change detection monkey-patching)

Modern Angular notes:

- IE support dropped → fewer polyfills needed  
- Zone.js setup moved around across versions  
- Concept remains: **fill gaps so runtime APIs exist**

Interview line:

> Polyfills make newer JS/web APIs work on older environments. Angular used `polyfills.ts` as that bootstrap file; today the need is smaller, but Zone.js was a key related runtime piece.

---

## 14. What are source maps, and why are they useful?

### Say this

> Source maps map minified/bundled/compiled code back to original TypeScript/HTML sources so DevTools stack traces and breakpoints make sense.

### Deep

Production JS looks like:

```js
function a(b,c){return b+c}
```

Source map says: “line 1 column 12 corresponds to `app.component.ts` line 42”.

Useful for:

- debugging production issues  
- readable error stacks  
- setting breakpoints on `.ts` files  

Tradeoff: maps can expose source structure — teams often upload them to error trackers privately, not always publicly.

---

# PART D — Angular CLI & build pipeline

## 15. Purpose of the Angular CLI

### Say this

> Angular CLI (`ng`) scaffolds projects, generates code, serves locally, runs tests, and builds optimized bundles with the recommended project structure and tooling defaults.

### Deep — common commands

| Command | Purpose |
|---|---|
| `ng new` | create app |
| `ng serve` | dev server + HMR/rebuild |
| `ng generate c/s/g/...` | schematics codegen |
| `ng build` | production/dev bundles |
| `ng test` / `ng e2e` | testing |
| `ng update` | framework migrations |

Why interviewers care: CLI encodes Angular best practices and hides complex webpack/esbuild config until you need it.

---

## 16. Role of Webpack (or the build tool)

### Say this

> The build tool bundles TypeScript/HTML/CSS/assets into browser-ready files, applies optimizations (minify, tree-shake, split chunks), and serves them in dev. Older Angular used Webpack; newer CLI builds often use esbuild/Vite-based pipelines — same job, different engine.

### Deep — what the bundler does

```text
.ts / .html / .css / images
        ↓
   compile + transform
        ↓
   dependency graph
        ↓
   chunks (main, lazy, styles, polyfills)
        ↓
   optimized output in dist/
```

Responsibilities:

- resolve `import` graph  
- transpile TS → JS  
- process templates/styles  
- code splitting  
- minification / hashing filenames  
- dev server  

Don’t say “Angular is Webpack” in 2026 blindly — say **build tool / bundler**, and that CLI abstracts it.

**Deep dive (ESM + Webpack → esbuild/Vite timeline):**  
[ANGULAR_BUILD_ESM_WEBPACK_ESBUILD.md](./ANGULAR_BUILD_ESM_WEBPACK_ESBUILD.md)  
**Feature-by-version sheet:** [ANGULAR_VERSION_FEATURES.md](./ANGULAR_VERSION_FEATURES.md)

---

## 17. What happens during `ng build --configuration production`?

### Say this

> Production configuration builds an optimized deployable `dist/` output: AOT compilation, minification, tree shaking, file hashing, budgets checks, and environment file replacements — not the verbose debug build from `ng serve`.

### Deep — typical production effects

1. **AOT compile** templates/components  
2. **Tree-shake** unused code  
3. **Minify / uglify** JS/CSS  
4. **Hash filenames** (`main.abc123.js`) for cache busting  
5. **Build optimizer** / dead code elimination (version-dependent naming)  
6. **Environment swap** (`environment.prod.ts` style replacements)  
7. **Budgets** fail build if bundle too big  
8. Output to `dist/<project>/`  

Dev build (`ng serve` / development config):

- faster rebuilds  
- source maps friendlier  
- less aggressive minify  
- bigger bundles OK  

---

## 18. AOT vs JIT compilation

### Say this

> AOT compiles Angular templates and components at **build time**. JIT compiles in the **browser at runtime**. Production uses AOT for faster startup and earlier template-error detection; older/dev workflows sometimes used JIT.

### Deep

| | AOT (Ahead-of-Time) | JIT (Just-in-Time) |
|---|---|---|
| When compiles | build time | runtime in browser |
| Startup | faster (less browser compile) | slower |
| Template errors | caught in build | often at runtime |
| Bundle | compiler not needed in browser | needs compiler runtime |
| Production default | yes | no (legacy/dev historically) |

Modern Angular production builds are AOT.

Spoken bonus:

> AOT means the browser downloads already-compiled factory code instead of compiling templates on the user’s device.

---

## 19. Why is lazy loading beneficial?

### Say this

> Lazy loading loads feature modules/routes only when needed, so initial bundle is smaller, first contentful paint is faster, and users download code for pages they actually visit.

### Deep

```text
Eager:  download EVERY feature at start
Lazy:   download core now + admin chunk when /admin visited
```

Angular route example idea:

```ts
{
  path: 'admin',
  loadChildren: () => import('./admin/admin.routes'),
}
```

Benefits:

- smaller initial JS  
- faster startup  
- better caching of feature chunks  
- clearer feature boundaries  

Costs:

- slight delay on first navigation to that feature  
- need to design route boundaries well  

---

## 20. How does tree shaking reduce bundle size?

### Say this (what + how — EM style)

> Tree shaking is **Dead Code Elimination** on a **Module Dependency Graph**: from the entry the bundler **marks** reachable ESM exports (DFS/BFS) and **sweeps** unmarked ones — Mark-and-Sweep at build time. That’s why unused library functions don’t ship.

### Deep

```ts
// lodash-es style
import { debounce } from 'lodash-es';
// only debounce path kept; unused sibling functions shaken out
```

Works best with:

- ES Modules (`import`/`export`) — static graph  
- side-effect-free modules (`"sideEffects": false` in package.json)  
- production builds  

Doesn’t work well with:

- fully dynamic `require` patterns (CommonJS)  
- side-effect-heavy barrel files that import everything  

Interview connection:

> This is one reason ESM + production builds matter for Angular performance.

**Full mark/sweep walkthrough:** [`../frontend-system-design/11_TREE_SHAKING_MARK_AND_SWEEP.md`](../frontend-system-design/11_TREE_SHAKING_MARK_AND_SWEEP.md)

---

# PART E — Quick-fire answer sheet (revise night before)

| Question | One-liner |
|---|---|
| SemVer | `MAJOR.MINOR.PATCH` = breaking / feature / fix |
| `^` vs `~` | `^` minor+patch; `~` patch only |
| lockfile | pins exact tree for reproducibility |
| `npm ci` | clean, lockfile-strict install for CI |
| deps types | runtime / dev-only / host-provided peers |
| no commit `node_modules` | regenerate from lockfile; too large |
| `npm install` | resolve → download → `node_modules` (+ maybe lock update) |
| npm/npx/ng | package mgr / run binary / Angular CLI |
| `tsconfig` | TS compiler project settings |
| target vs module | JS language level vs module format |
| `esModuleInterop` | smoother CJS default import interop |
| CJS vs ESM | require vs import; ESM tree-shakes better |
| polyfills | shim missing browser APIs (+ historical Zone entry) |
| source maps | map minified code → original TS |
| CLI | scaffold/serve/generate/build/test |
| bundler | graph + transform + optimize to `dist` |
| prod build | AOT + minify + shake + hash + budgets |
| AOT vs JIT | build-time vs runtime template compile |
| lazy load | download features on demand |
| tree shaking | drop unused ESM exports |

---

# PART F — Mini scenarios (interview style)

### Scenario 1

> “Build works on your machine but CI installs different RxJS and fails.”

**Answer direction:** missing/out-of-sync lockfile; CI should use `npm ci`; commit `package-lock.json`.

### Scenario 2

> “Initial load is slow; admin screens rarely used.”

**Answer direction:** lazy-load admin routes; check bundle with build stats; tree-shake; production config.

### Scenario 3

> “Library X bundles Angular twice and DI breaks.”

**Answer direction:** Angular should be `peerDependency` of the library, not bundled into it.

### Scenario 4

> “Production error stack is unreadable.”

**Answer direction:** enable/upload source maps to monitoring; map minified frames to TS.

---

# PART G — 60-second closing speech

> Fundamentals matter because Angular apps are not just components — they’re an ecosystem of package management, TypeScript compilation, and a production build pipeline. I understand SemVer and lockfiles for reproducible installs, tsconfig module/target settings, ESM vs CommonJS, and how production builds use AOT, tree shaking, hashing, and lazy loading to ship smaller faster apps.

---

## Practice checklist

- [ ] Explain `^` vs `~` with an example version  
- [ ] Explain why lockfile + `npm ci` belong in CI  
- [ ] Differentiate dependencies / dev / peer  
- [ ] Explain target vs module in one sentence each  
- [ ] AOT vs JIT in two sentences  
- [ ] Lazy loading + tree shaking benefit chain  
- [ ] What production `ng build` changes vs dev serve  

---

## Related guides in this folder

- Dependency Injection → `ANGULAR_DEPENDENCY_INJECTION.md`  
- Lifecycle → `ANGULAR_LIFECYCLE.md`  
- ng-content / ViewChild → `ANGULAR_CONTENT_TEMPLATES_QUERIES.md`  
- Script async/defer (browser loading) → `../javascript-interview-prep/ASYNC_DEFER.md`  
- Bundle / CRP / network → `../frontend-system-design/`  
