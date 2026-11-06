# What is Nx? What does an Nx monorepo do?

**Use this if she asks:** “What is Nx?” · “Why Nx?” · “What is Module Federation?” · “What is Native Federation?”

**Webpack / ESM / esbuild** (separate file): [ONETRUST_WEBPACK_ESM.md](./ONETRUST_WEBPACK_ESM.md)

Nx is **not** micro-frontends. Nx is **not** what loads remotes in the browser.

| | Nx | Micro-frontend (Native Federation) |
|---|---|---|
| **When** | **Build / CI / repo** | **Runtime in the browser** |
| **Job** | Know the project graph; build **only what changed** | Host loads `remoteEntry` |
| **If you skip it** | Every PR rebuilds the whole dashboard | You still have one giant SPA |

**One line:**  
> Nx is a **monorepo build tool**. We use it so host, remotes, and kernel can live in **one repo** but **build and test independently**. Federation is how those built remotes are **loaded at runtime**.

---

## 1. What is a monorepo? (say this first)

A **monorepo** = **one Git repository** that holds **many projects**.

```text
idms-nux/                    ← one git clone
  apps/
    host/                    ← shell (deployable)
    devices/                 ← remote (deployable)
    safety/
    admin/
  libs/
    kernel/                  ← shared library (not a website)
```

**Not a monorepo:** `cloud-front-end` today is basically **one dashboard app** — one `ng build`, one zip.

**Polyrepo:** each app is its own GitHub repo. We are **not** starting there.

**Spoken:**

> Monorepo means one repo, many apps. Juniors clone once. A kernel change and a devices fix can be **one PR**. Everyone stays on the same Angular version.

---

## 2. What is Nx? (exact purpose)

**Nx** (by Nrwl) is tooling **on top of** that monorepo.

Plain Angular CLI can already have `projects/host`, `projects/devices`. That works for a demo. **Nx’s purpose** is:

> When you have **many apps + libs**, CI must not run `ng build` on **everything** every time. Nx **knows who depends on whom**, so it **builds only the affected graph**, **caches** repeats, and can **block illegal imports**.

Without Nx (or equivalent):

- PR changes one line in devices → Jenkins still builds host + safety + video + …  
- Juniors import `safety` from `devices` by accident → you find out in prod  
- No standard `apps/` / `libs/` / tags

**Nx does not:**

- deploy to S3  
- create `remoteEntry.json` (Native Federation / the Angular builder does)  
- replace Jenkins  
- replace Angular

---

## 3. How Nx works (so you can draw it)

```text
1. Each project has project.json (targets: build, test, lint, serve)

2. Nx reads imports + config → PROJECT GRAPH

     kernel (lib)
        ▲    ▲
        │    │
     host   devices   safety     (apps)
              ✗ safety must NOT import devices

3. You change files in apps/devices/**

4. nx affected -t build
      git diff vs main
      → "devices changed"
      → rebuild devices
      → rebuild host ONLY if host depends on that change
      → skip safety, video, admin

5. CACHE
      same source + same deps + same flags → reuse last build output
      (local cache, or remote cache on CI)
```

**Commands to name:**

| Command | Meaning |
|---|---|
| `nx graph` | Visual dependency graph |
| `nx build devices` | Build **one** remote |
| `nx affected -t test,build,lint` | CI: only what this PR touched (+ dependents) |
| `nx run-many -t build -p host,devices` | Build an explicit list |
| `nx serve host` | Run the shell (loads remotes) |

---

## 4. How Nx helps the **build** (this is why we need it)

### Problem we have today (prod NUX)

One Angular app → **one** `ng build` → **one** zip.  
A devices-only change still **recompiles the entire dashboard**. Slow CI. Safety team waits.

### After MFE, without Nx

You have 7 Angular apps. Naive CI:

```text
ng build host && ng build devices && ng build safety && …
```

Every PR = **full farm**. You gained independent **runtime** deploys but **lost** CI time.

### With Nx

```text
devices PR  →  nx affected -t build  →  only devices (and anything that imports it)
kernel PR   →  rebuild kernel + host + every remote that uses kernel
safety PR   →  only safety
```

Then Jenkins uploads **only those artifacts** to `mfe/devices/<sha>/`.

**That’s the purpose:** MFE splits **runtime**; Nx splits **compile/CI**. You need **both**.

| Need | Who does it |
|---|---|
| Don’t start all remotes in the browser at once | Federation + manifest |
| Don’t compile all remotes on every PR | **Nx affected** |
| Don’t rebuild the same commit twice | **Nx cache** |
| Don’t let remotes import remotes | **Nx module boundaries / tags** |
| One Angular version | **Monorepo** (Nx helps enforce it) |

---

## 5. Why we need Nx in **this** application (IDMS conversion)

> We’re splitting NUX into host + six remotes + kernel. That’s 7+ build targets. I’m leading 2–3 juniors. Without Nx, every merge is a full rebuild and people will import the wrong project. Nx gives us **affected CI**, **a kernel library with a public API**, and **rules** that remotes only depend on kernel. The **browser** still uses Native Federation; Nx just makes the **pipeline** match that independence.

**Concrete help:**

1. **Speed** — devices PR minutes, not “build the world.”  
2. **Correctness** — kernel API change **automatically** rebuilds remotes that depend on it (`affected` includes dependents).  
3. **Safety** — `type:remote` cannot import `type:remote`.  
4. **Onboarding** — `apps/devices`, `libs/kernel`; juniors don’t hunt a 2000-file SPA.  
5. **Cache** — CI agents reuse outputs.

**If she asks “can’t you just use Angular workspace without Nx?”**  
> Yes for a small demo. At six remotes + kernel + Jenkins, you end up writing path-filters by hand. Nx **is** that graph + affected + cache. That’s why we chose it for the conversion workspace.

### Can we do MFE **without** Nx? Alternatives?

**Yes.** Nx is **not required** for micro-frontends. Native Federation still loads remotes if you `ng build` each app by hand. Nx is **CI/repo** convenience, not the browser.

| Goal | Without Nx | With Nx |
|---|---|---|
| Host loads remotes | Federation + manifest | Same |
| Independent **deploy** | Jenkins path / job per app | `nx affected` → only those `dist/` folders |
| Know **what changed** | `git diff --name-only` + path filters (`apps/devices/**`) | Graph: devices **and** anything that **depends** on a changed lib |
| Kernel API change | Easy to **forget** to rebuild host + remotes | `affected` includes **dependents** |
| Don’t import remote→remote | Code review / ESLint | Nx **tags / module boundaries** |
| Don’t rebuild twice | Empty `node_modules` cache | Computation cache |

**Handmade “what to deploy” (perfectly legal):**

```text
git diff origin/main --name-only
  apps/devices/**     →  build + deploy devices SHA, bump manifest key
  apps/safety/**      →  safety only
  libs/kernel/**      →  rebuild ALL remotes that import kernel (easy to get wrong)
```

That’s what Nx `affected` **automates**, including the kernel fan-out.

**Spoken ~25s:**

> We don’t *need* Nx for federation — that’s runtime. We need something that says “this PR only ships devices.” You can do that with Git path filters and seven `ng build` jobs. At our size I’d rather Nx: it knows kernel dependents, caches, and blocks illegal imports. Without it, MFE CI is either ‘build everything’ or a fragile bash script.

**Alternatives she’d accept (same family: graph + cache + affected):**

| Tool | When people pick it |
|---|---|
| **Nx** | Angular / TS monorepos — **our choice** (Angular plugin, `project.json`) |
| **Turborepo** | JS/Next shops; pipelines + remote cache; weaker Angular-first DX |
| **Lage** | Microsoft-style JS monorepos |
| **Bazel** | Huge polyglot orgs; steep; overkill for NUX |
| **Lerna** | Old JS publish tool; **not** a full affected-graph today (Nx acquired the name) |
| **Polyrepo** | No Nx at all — each remote is its own Jenkins. You “know what changed” because it’s a **different repo**. Cost: kernel versioning, many Angular versions |

**Do not say:** “MFE is impossible without Nx.”  
**Do say:** “MFE without Nx is fine; **build-time** independence without a graph tool is painful.”

---

**If she asks “is Nx in production today?”**  
> Prod NUX is still **one** Angular app and **one** Jenkins zip. Nx is how we **run the conversion monorepo** so we can peel domains without exploding CI.

---

## 5b. Snapshots — graph, `nx affected` in Jenkins, import rules

**Honesty (say this if she asks “show me the repo”):**  
Conversion workspace is already **host + six remotes + kernel** in one Angular CLI workspace (`projects/`). Independent deploy today is **you name the target**: `ng build devices`. **Nx is not wired yet.** These snapshots are **what we put on Jenkins** so CI, not a human, picks the target — same folders, same remotes.

Interview names: **host / devices / safety / kernel** · `@idms/kernel`. Do not say POC folder names.

### 0. What exists today (no Nx) — you pick the remote by hand

`package.json` already has one script per app. Deploy script loops only the **named** target:

```json
{
  "build:devices": "ng build devices --configuration=production",
  "build:safety": "ng build safety --configuration=production",
  "build:remotes": "npm run build:devices && npm run build:safety && …"
}
```

```bash
# scripts/deploy-to-s3.sh — TODAY
projects_to_build() {
  case "$TARGET" in
    all)  echo "host devices safety video fleet provisioning admin" ;;
    host) echo "host" ;;
    *)    echo "$TARGET" ;;   # e.g. devices
  esac
}

npx ng build devices --configuration=production
# then aws s3 sync dist/devices/browser → …/mfe/devices/
```

**Gap:** a devices PR still needs a person (or a path-filter) to pass `devices`. A **kernel** change has no automatic “rebuild every consumer.” That’s the hole Nx fills.

Legal import already in Devices (only kernel, never Safety):

```ts
import { KernelStatusBar, KernelStore } from '@idms/kernel';
```

Kernel public API (library barrel — remotes import this, not deep files):

```ts
export { AuthService } from './lib/auth/auth.service';
export { authGuard } from './lib/auth/auth.guard';
export { KernelStore } from './lib/state/kernel.store';
export { provideKernel } from './lib/provide-kernel';
```

---

### 1. How the **affected graph** is built (not magic)

Nx does **not** guess folders. It reads **imports** + `project.json` tags.

```text
tsconfig paths:
  "@idms/kernel" → projects/kernel/src/public-api.ts

devices/device-list.ts
  import { KernelStore } from '@idms/kernel'   ← edge: devices → kernel

safety/coaching-list.ts
  import { KernelStore } from '@idms/kernel'   ← edge: safety → kernel

devices does NOT import safety
safety does NOT import devices
```

Graph Nx stores (same as `nx graph`):

```text
              kernel (lib)     tags: type:lib, scope:shared
             ↗        ↖
          host         devices   safety   video   admin
          type:host    type:remote …
                       scope:devices
```

**`nx affected` algorithm (say the three steps):**

```text
1. git diff origin/main --name-only
   → which files changed
2. map files → projects
   projects/devices/src/…     → devices
   projects/kernel/src/…      → kernel
3. walk the graph UP (dependents)
   changed project ∪ everything that imports it
```

| PR touches | Affected (build these) | Skip |
|---|---|---|
| `projects/devices/**` only | **devices** | safety, video, admin, host* |
| `projects/kernel/**` | **kernel + host + every remote** (all import kernel) | none of the remotes |
| `projects/safety/**` | **safety** | devices |

\*Host rebuilds only if it also imports the changed code (it does for kernel, usually not for a devices-only page).

```bash
npx nx affected -t build --base=origin/main --head=HEAD
# prints e.g.  devices

npx nx show projects --affected --base=origin/main
# devices

npx nx graph   # open the picture in a browser
```

**Spoken while drawing:**  
> Affected is git diff, then map to projects, then walk dependents. Devices-only PR = build devices. Kernel PR = fan-out because every remote imports `@idms/kernel`. That’s why path filters on `projects/devices/**` are weaker — they miss the kernel case.

---

### 2. How you **define** the import rules (tags + ESLint)

Two files. Tags live on the project; the rule lives in ESLint.

**`projects/devices/project.json`** (Nx metadata next to the app):

```json
{
  "name": "devices",
  "sourceRoot": "projects/devices/src",
  "projectType": "application",
  "tags": ["type:remote", "scope:devices"]
}
```

Same idea for others:

```text
host     tags: ["type:host",   "scope:shell"]
kernel   tags: ["type:lib",    "scope:shared"]
safety   tags: ["type:remote", "scope:safety"]
```

**`nx.json`** (workspace defaults):

```json
{
  "namedInputs": {
    "default": ["{projectRoot}/**/*", "sharedGlobals"],
    "production": ["default", "!{projectRoot}/**/*.spec.ts"]
  },
  "targetDefaults": {
    "build": { "dependsOn": ["^build"], "cache": true },
    "lint": { "cache": true }
  }
}
```

`dependsOn: ["^build"]` = build **dependencies first** (kernel before devices). Cache = same inputs skip.

**ESLint rule that actually blocks illegal imports** (`eslint.config.mjs` or `.eslintrc.json`):

```js
{
  rules: {
    '@nx/enforce-module-boundaries': [
      'error',
      {
        enforceBuildableLibDependency: true,
        allow: [],
        depConstraints: [
          // remotes may only import shared libs (kernel)
          { sourceTag: 'type:remote', onlyDependOnProjectsWithTags: ['type:lib'] },
          // host may import kernel, not another remote’s source
          { sourceTag: 'type:host', onlyDependOnProjectsWithTags: ['type:lib'] },
          // kernel imports nobody in this workspace
          { sourceTag: 'type:lib', onlyDependOnProjectsWithTags: [] }
        ]
      }
    ]
  }
}
```

**Legal (already how Devices is written):**

```ts
// projects/devices/src/app/pages/device-list.ts
import { KernelStore } from '@idms/kernel'; // type:remote → type:lib  ✓
```

**Illegal — CI fails on `nx affected -t lint`:**

```ts
// junior writes this inside devices
import { CoachingList } from '../safety/src/app/pages/coaching-list';
// or: import { CoachingList } from '@idms/safety';

// ESLint:
// error  A project tagged "type:remote" can only depend on "type:lib"
```

That is the **rule definition**. Not a Jenkins secret. Lint on the PR. Nx only **supplies the graph + tags**; ESLint **fails the build**.

Without Nx you can still do:

```js
// ESLint no-restricted-imports — same idea, you maintain the list
'no-restricted-imports': ['error', {
  patterns: ['**/projects/safety/**', '@idms/safety']
}]
```

---

### 3. Jenkins snapshot — `nx affected` then upload only those `dist/` folders

Today’s prod job is still **one** `ng build` (`ci-build-all.js` → `app-<env>.zip`). Conversion job would **replace that inner build**, not throw Jenkins away.

```groovy
stage('Affected build') {
  steps {
    nvm(version: 'v22.14.0') {
      sh '''
        set -e
        npm ci

        # vs the branch Jenkins checked out against (main)
        npx nx affected -t lint,test,build \
          --base=origin/main --head=HEAD \
          --parallel=3

        # which apps actually produced dist/?
        AFFECTED=$(npx nx show projects --affected --base=origin/main --head=HEAD)
        echo "Affected: $AFFECTED"

        mkdir -p "$WORKSPACE/WebContent"
        for p in $AFFECTED; do
          if [ -f "dist/$p/browser/remoteEntry.json" ]; then
            # remote → SHA folder on artifacts bucket
            tar -czf "$WORKSPACE/WebContent/mfe-$p-$GIT_COMMIT.tgz" -C "dist/$p/browser" .
          elif [ -f "dist/$p/browser/index.html" ]; then
            tar -czf "$WORKSPACE/WebContent/host-$GIT_COMMIT.tgz" -C "dist/$p/browser" .
          fi
        done
      '''
    }
  }
}
```

Then the **existing** DEPLOY job (ops, not in dashboard git) syncs those tarballs:

```text
devices tarball → s3://…/mfe/devices/<sha>/
host tarball    → update federation.manifest.json
                    "devices": "https://cdn…/mfe/devices/<sha>/remoteEntry.json"
safety          → not in this PR → manifest URL unchanged
```

**If affected is empty** (docs-only PR): skip upload. Jenkins still green.

**If kernel is affected:** loop uploads **host + all remotes** — correct, because they all compiled against the new kernel.

**Spoken ~20s:**

> Same Jenkins agent and Node 22. Instead of `ng build` the whole dashboard, we run `nx affected -t build` against `origin/main`. That list is what we zip to S3. Devices PR uploads only `mfe/devices/<sha>/` and patches that one key in the manifest. Kernel PR is the expensive one — and that’s intended.

---

### 3b. GitHub PR checks — GitHub does **not** run Nx by itself

**Three boxes (do not mix):**

```text
GitHub PR UI     →  billboard (green / red checks, merge blocked)
GitHub Actions   →  runner  (.github/workflows/*.yml you committed)
Nx               →  command that YAML executes  (npx nx affected …)
```

Nx is **not** a GitHub app that magically appears. You **wire it** like today’s guardrails.

**Today (prod dashboard):** PR → `on: pull_request` → jobs you already know (`quality/lint`, dashboard build, security). GitHub just **displays** those job results on the PR. Branch protection = “these check names must be green to merge.”

**With Nx (conversion):** **same trigger**, swap the inner command:

```yaml
# .github/workflows/ci-guardrails.yml  (shape — not live Nx today)
name: CI Guardrails
on:
  pull_request:
    types: [opened, synchronize, reopened]

jobs:
  affected:
    name: quality/nx-affected
    runs-on: ubuntu-latest
    steps:
      - uses: actions/checkout@v4
        with:
          fetch-depth: 0          # need full git history for diff vs base
      - uses: actions/setup-node@v4
        with:
          node-version: '22'
      - run: npm ci
      - run: |
          npx nx affected -t lint,test,build \
            --base=origin/${{ github.base_ref }} \
            --head=HEAD
```

`fetch-depth: 0` matters: `affected` needs `git diff` against the PR **base** (`main`), not a shallow clone.

**What you see on the PR:** a check named `quality/nx-affected` (or split jobs: lint / test / build). Red = don’t merge. Green = this PR’s **affected graph** passed — Devices-only PR did not compile Safety.

**Jenkins vs GitHub:** Actions = **PR quality gate** (automatic). Jenkins BUILD = **artifacts after merge** (human starts it). Nx can run in **both**; the PR checks are Actions. Jenkins does not have to be the thing in the Checks tab.

**Spoken ~25s:**

> GitHub doesn’t run Nx. We already have Actions on every PR. We add a job that checks out with full git history and runs `nx affected` against the PR base. That job shows up as a required check. Devices PR goes green after Devices lint/test/build. Merge still doesn’t deploy — Jenkins is the zip.

---

### 4. One picture to memorize

```text
TODAY (conversion workspace)
  human/script:  ng build devices     →  s3 …/mfe/devices/

WITH NX (same apps)
  git diff → graph walk → [devices]
       │
       ├─ nx affected -t lint   ← tags block remote→remote
       ├─ nx affected -t test
       └─ nx affected -t build  ← Jenkins zips only those dist/
```

---

## 6. 30s / 60s answers (memorize)

**“What is Nx?”**

> Nx is a monorepo build system. It understands the dependency graph of apps and libraries, builds only affected projects, caches results, and can enforce import boundaries. It does not load micro-frontends in the browser.

**“What does an Nx monorepo do?”**

> It keeps host, remotes, and kernel in one repo, but treats them as separate projects. `nx affected` means a devices change doesn’t rebuild safety. Kernel stays a versioned lib with a public API.

**“Why do you need Nx? What’s the purpose?”**

> Purpose is **scalable CI and clear ownership** once we have many deployables. Federation solves **runtime** independence. Nx solves **build-time** independence. Without it, MFE CI becomes slower than the old monolith build.

**“How does Nx help the build?”**

> It computes who changed, rebuilds that project and its dependents, skips the rest, and reuses cache. Jenkins then publishes only those SHA artifacts and updates the federation manifest.

---

## 7. Mini Q&A

**Q: Nx vs Lerna / Turborepo?**  
> Same family: graph + cache + affected. We use Nx because it’s the usual fit for **Angular** (first-class Angular plugin, `project.json` targets).

**Q: Does Nx deploy remotes?**  
> No. Nx **produces** `dist/`. Jenkins / S3 **publishes**. Manifest points at the new SHA.

**Q: Does every developer need Nx?**  
> They run `nx serve host` or `nx serve devices`. Same as `ng serve`, with the graph behind it.

**Q: What if someone changes a shared SCSS in kernel?**  
> Graph says remotes depend on kernel → `affected` rebuilds those remotes. That’s **wanted**.

**Q: Does GitHub run Nx automatically?**  
> No. GitHub only shows check status. **GitHub Actions** YAML we commit runs `nx affected`. Same pattern as today’s `ci-guardrails`. Required check on the PR; Jenkins still builds the release zip.

---

## 8. “What is Module Federation?” / “What is Native Federation?”

She may say **Module Federation**, **Native Federation**, or mix them with Nx.  
Answer like a senior: **definition → why it exists → how it works in your app → Nx is separate.**

### What is Module Federation itself? (45s — she wants this tone)

> **Module Federation** is a **runtime** way to compose separately built frontends. A **host** app does not bundle Devices into its own JS. At runtime it fetches a catalog file — historically `remoteEntry.js` — from the Devices **remote**, then loads an **exposed** module, usually a route tree. Dependencies like Angular can be **shared as singletons** so you don’t get two copies of the framework in one tab. That’s how you get **independent deploy**: ship Devices JS without rebuilding Safety. Webpack 5 made this famous with `ModuleFederationPlugin`. When a JD says “Module Federation,” they mean **this host/remote/expose/shared model**.

**Why interviewers like that answer:** you said *runtime*, *host/remote*, *expose*, *shared singleton*, *independent deploy* — not “it’s a Webpack plugin” only.

### What is Native Federation? (45s)

> **Native Federation** is the **same Module Federation idea** for **modern Angular** — esbuild / application builder — instead of Webpack. Remotes still expose `./Routes`. The host still has a **manifest** of name → `remoteEntry.json` URL. Shared packages are still singletons. The plumbing is **ESM + import maps**, not the Webpack runtime. We use it because NUX is on the esbuild builder; forcing Webpack MF would fight the CLI. If she says “are you doing Module Federation?” I say: **yes — the MF architecture, implemented with Native Federation.**

### Side-by-side (if she follows up)

| | Module Federation (Webpack) | Native Federation (what we use) |
|---|---|---|
| Idea | Host loads remotes at runtime | **Same** |
| Words | host, remote, expose, shared, remoteEntry | **Same** |
| Engine | Webpack plugin | ESM + import maps + `federation.config` |
| Catalog | `remoteEntry.js` | `remoteEntry.json` |
| Fits | Old Webpack Angular | Angular 17+ **esbuild** |

**Do not say:** “Native Federation is a different architecture.”  
**Do say:** “Same architecture, different bundler runtime.”

### How it works in *your* app (she wants to hear IDMS)

> Host boots, reads `federation.manifest.json`, maps `'devices'` to a CDN `remoteEntry.json`. User opens Devices → `loadRemoteModule('devices', './Routes')` → browser downloads that remote’s chunks → routes render in the **host** `<router-outlet>`. Kernel/auth is **shared singleton**. I don’t open `devices.netradyne.com` as a second website.

### Three boxes so you never mix them (draw this)

```text
Nx                 →  BUILD TIME   (what to compile)
Module Federation  →  IDEA         (host + remotes at runtime)
Native Federation  →  HOW we do that idea on Angular esbuild
```

**If she asks “does Nx do Module Federation?”**  
> No. Nx builds `apps/devices`. Native Federation **publishes and loads** that output. Some Nx plugins can *generate* federation configs — Nx still isn’t the loader in the browser.

### Extra 20s lines

**“Why not just lazy routes in one app?”**  
> Lazy routes are one deployable. Federation remotes are **their own build artifacts** — devices can ship Friday without a safety rebuild.

**“What’s remoteEntry?”**  
> The remote’s **catalog**: name, what’s exposed (`./Routes`), which shared libs. Host reads it, then fetches the real JS.

**“What’s shared / singleton?”**  
> Angular, RxJS, kernel — **one copy** in the tab. Two Angulars = broken DI and a fat page.

---

## Cheat card

```text
Monorepo  = one git, many apps
Nx        = build graph + affected + cache + boundaries
MF        = runtime idea: host loads remotes, shared deps
NF        = MF idea on esbuild (what we use)
remoteEntry = catalog the host fetches

Why Nx:  6 remotes must not full-rebuild every PR
Purpose: build-time independence to match runtime independence
Without Nx: path filters / Turbo / polyrepo — MFE still works
Not Nx:  remoteEntry, S3, Jenkins, auth
```
