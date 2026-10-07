# Create your own MFE setup for IDMS — step by step

**Use this when you want to rebuild (or explain) the same thing we built in the demo, but for real IDMS NUX.**

**Hands-on reference:** [`../mfe-separate-repos/`](../mfe-separate-repos/)  
**IDMS split map:** [08_CLOUD_FRONT_END_MFE_SPLIT_FOOLPROOF.md](./08_CLOUD_FRONT_END_MFE_SPLIT_FOOLPROOF.md)

Format below: **What we did in the demo** → **What you do for IDMS** → **Why**.

---

## Big picture (one diagram)

```text
DEMO (local)                              IDMS (real)
─────────────                             ───────────
shared-auth/     ──npm──► every app       @idms/auth or @idms/platform  (private registry)
shell/           host :4200               idms-shell  (Jenkins → S3 → cdn-dev/stage/prod)
mfe-safety/      remote :4201             mfe-safety  (own pipeline → own remoteEntry)
mfe-fleet/       remote :4202             mfe-fleet   (own pipeline → own remoteEntry)
file:../dist/... local install            npm install @idms/auth@1.4.2 from Artifactory/npm
manifest → localhost URLs                 manifest → https://cdn-<env>/.../remoteEntry.json
```

---

## Step 0 — Decide repos (ownership)

| What we did | For IDMS |
|---|---|
| Made **4 folders**, each with its own `package.json` | Make **separate Git repos** (or keep monorepo — architecture is the same) |
| `shared-auth`, `shell`, `mfe-safety`, `mfe-fleet` | Start with: `@idms/platform` (auth/tenant), `idms-shell`, `mfe-safety` (or one big `mfe-nux-domains` first) |

**Why:** Teams can deploy Safety without rebuilding Fleet. Shell only composes.

---

## Step 1 — Shared auth / platform library

| What we did | For IDMS |
|---|---|
| Created `shared-auth` Angular **library** | Extract login helpers, `AuthService`, guards, interceptor, tenant context into `@idms/platform` (or keep NDS + auth as two packages) |
| Code: `AuthService`, `authGuard`, `authInterceptor`, session store | Real OAuth/OIDC client, token refresh, permission helpers, tenant switch |
| `npm run build` → `dist/shared-auth/` | CI builds + **publishes** package to private registry |

**Why:** Auth must be **one** implementation. Host logs in; remotes only *read* user/token.

**Demo files to copy the idea from:**
- `mfe-separate-repos/shared-auth/projects/shared-auth/src/lib/auth.service.ts`
- `auth.guard.ts`, `auth.interceptor.ts`, `auth.store.ts`

---

## Step 2 — How every repo gets `shared-auth` (local vs environment)

This is the part people confuse. There are **two different installs**:

### A) Local laptop (what the demo does)

```bash
# 1) Build the library (like “publish”)
cd shared-auth && npm i && npm run build

# 2) Install into EACH app from the built folder
cd ../shell && npm i ../shared-auth/dist/shared-auth
cd ../mfe-safety && npm i ../shared-auth/dist/shared-auth
cd ../mfe-fleet && npm i ../shared-auth/dist/shared-auth
```

In each app’s `package.json` you see:

```json
"shared-auth": "file:../shared-auth/dist/shared-auth"
```

`file:` = “use this folder on my disk.” Good for learning. **Not** how prod works.

### B) Real environments (dev / stage / prod) — how you actually do it

You do **not** copy `node_modules` between servers. Each app’s **CI pipeline** installs from a **private npm registry**.

```text
Developer merges shared-auth → tag v1.4.2
        │
        ▼
 Jenkins/GitHub Actions: npm run build && npm publish
        │
        ▼
 Private registry (GitHub Packages / Verdaccio / JFrog / AWS CodeArtifact)
        │
        ├── shell CI:     npm ci   → gets @idms/platform@1.4.2
        ├── safety CI:    npm ci   → gets @idms/platform@1.4.2
        └── fleet CI:     npm ci   → gets @idms/platform@1.4.2
```

In each app `package.json` (real):

```json
"dependencies": {
  "@idms/platform": "1.4.2"
}
```

Each app also has `.npmrc` (or CI injects it):

```ini
@idms:registry=https://npm.pkg.github.com
//npm.pkg.github.com/:_authToken=${NPM_TOKEN}
```

**On the build agent / environment:**

| Step | What runs |
|---|---|
| 1 | Checkout **that app’s** repo only |
| 2 | `npm ci` (uses lockfile + private registry token) |
| 3 | `ng build` / federation build |
| 4 | Upload `dist/` (and `remoteEntry.json`) to S3 / CDN for that env |

So: **every repo installs auth itself** during `npm ci` — same as the demo installs `file:` — but the source of the package is the **registry**, not a sibling folder.

### C) Env-specific note (dev vs stage vs prod)

| Concern | How it works |
|---|---|
| **Package version** | Usually **same** `@idms/platform@1.4.2` across envs until you bump it. Env doesn’t change the npm version. |
| **API / OAuth URLs** | Come from **build-time stamp** or runtime config (`environment.dev.json`), not from the auth package version. |
| **Which remote JS loads** | Shell’s **federation manifest** per env (see Step 6). |

Spoken:

> Locally we used `file:` to simulate a private package. In CI each app runs `npm ci` against our private registry and pins `@idms/platform` in package.json. Environments differ by stamped config and CDN manifest URLs, not by copying auth source into each server.

---

## Step 3 — Create the shell (host) repo

| What we did | For IDMS |
|---|---|
| `ng new shell` + Native Federation **dynamic-host** | Carve current NUX `dashboard` into **host-only**: auth UI, megamenu, layout, AppFrame leftovers |
| Port 4200 | Deployed as main IDMS URL |
| `federation.manifest.json` lists remotes | Per-env manifest on CDN (short cache) |
| Login page only in shell | Keep real OAuth in shell |
| `loadRemoteModule('mfe-safety', './Routes')` | Same for Safety / Fleet / HOS remotes |
| `authGuard` on remote routes | `canMatch` + permissions like today |

**Demo files:**
- `shell/src/main.ts` — `initFederation('federation.manifest.json')`
- `shell/public/federation.manifest.json`
- `shell/src/app/app.routes.ts`
- `shell/federation.config.mjs` — host, `shareAll` Angular singleton

**IDMS mapping:** today’s `authentication/`, `post-login-shell`, `grouped-routes` composition stay in host; feature islands move out.

---

## Step 4 — Create each remote repo

| What we did | For IDMS |
|---|---|
| `ng new mfe-safety` / `mfe-fleet` + NF **remote** | New repos (or extract folders) per domain |
| `exposes: { './Routes': './src/app/remote.routes.ts' }` | Expose route tree, not a second full shell |
| Ports 4201 / 4202 locally | Each has own `ng serve` in dev; own CDN path in prod |
| Pages read `AuthService` — **no login form** | Same — remotes trust host session + shared package |
| Fleet `adminGuard` example | Real permission guards / feature flags |

**Demo files:**
- `mfe-safety/federation.config.mjs` — `name` + `exposes`
- `mfe-safety/src/app/remote.routes.ts`
- `mfe-safety/src/app/pages/safety-home.ts`

**IDMS first remote to extract:** Safety + Video (biggest native island) — see guide `08`.

---

## Step 5 — Wire host → remotes (runtime, not npm)

Remotes are **not** npm-dependencies of the shell for their UI.

| What we did | For IDMS |
|---|---|
| Manifest points to `http://localhost:4201/remoteEntry.json` | Manifest points to `https://cdn-dev.../mfe-safety/<sha>/remoteEntry.json` |
| Shell `loadRemoteModule('mfe-safety', './Routes')` | Same API; name must match remote `federation.config` `name` |
| Shared Angular via federation `shareAll({ singleton: true })` | Same — one Angular in the browser tab |

**Why two mechanisms?**

| Mechanism | Couples | Example |
|---|---|---|
| **npm** (`@idms/platform`) | Build time — TypeScript/DI code | AuthService |
| **Federation** (`remoteEntry`) | Runtime — feature UI chunks | Safety pages |

---

## Step 6 — Environments (dev / stage / prod)

### What changes per environment

| Artifact | Local demo | Real IDMS |
|---|---|---|
| `shared-auth` install | `file:../dist/...` | `npm ci` → private registry |
| Shell HTML/JS | localhost:4200 | `cdn-<env>/shell/<sha>/` |
| Remote JS | :4201 / :4202 | `cdn-<env>/mfe-safety/<sha>/` |
| Manifest | `public/federation.manifest.json` in shell | **Env-specific** file, short TTL, e.g. `cdn-dev/.../federation.manifest.json` |
| API base URL | hardcoded / none | stamped at build or fetched config |
| OAuth client id / redirect | demo fake login | env-specific IdP config |

### Example manifests

**Local (demo):**
```json
{
  "mfe-safety": "http://localhost:4201/remoteEntry.json",
  "mfe-fleet": "http://localhost:4202/remoteEntry.json"
}
```

**dev:**
```json
{
  "mfe-safety": "https://cdn-dev.example.com/mfe-safety/a1b2c3d/remoteEntry.json",
  "mfe-fleet": "https://cdn-dev.example.com/mfe-fleet/e4f5g6h/remoteEntry.json"
}
```

**prod:** same shape, `cdn-prod` + production SHAs.

Shell build can embed which manifest URL to load, or fetch `/config/federation.manifest.json` from the env’s CDN.

### Pipeline sketch (one remote)

```text
mfe-safety repo PR merge
  → npm ci                    # installs @idms/platform from registry
  → npm run build             # federation build → remoteEntry.json + chunks
  → upload to s3://…/mfe-safety/$GIT_SHA/
  → update dev manifest entry for mfe-safety → that SHA
  → (promote) stage/prod manifests later
```

Shell pipeline is separate; it only needs a new manifest when remote versions change (or you use a floating `latest` pointer carefully).

**Rollback:** point manifest back to previous SHA — no need to rebuild shell.

---

## Step 7 — Keep iframe leftovers (IDMS-specific)

| What we did in demo | For IDMS |
|---|---|
| Demo is **federation only** (no iframe) | Keep **AppFrame** for `embedded-only` routes (Reports, DAC, coaching tasks, configs…) until nativized |
| — | Host still owns iframe bridge; don’t put those in MF remotes yet |

See `08` for the exact leftover list.

---

## Step 8 — Order to implement for IDMS (practical)

Do this sequence (same spirit as the demo):

1. **Publish** `@idms/platform` (auth/tenant/guards) — like our `shared-auth` build.  
2. **Host** = current shell minus extracted domains; add federation init + manifest.  
3. **First remote** = Safety/Video routes exposed as `./Routes`.  
4. Wire manifest (local ports → then CDN).  
5. Extract Fleet / HOS / Settings remotes.  
6. Leave iframe keys until last.  
7. Per-env manifests + Jenkins per deployable.

---

## Cheat card — “I did X for Y”

| # | Demo action | IDMS equivalent |
|---|---|---|
| 1 | Separate folders with own `package.json` | Separate git repos / deployables |
| 2 | Built `shared-auth` to `dist/` | Publish `@idms/platform` to private npm |
| 3 | `npm i file:../dist/shared-auth` in every app | `npm ci` in every app CI with registry token |
| 4 | Shell = dynamic-host + login | IDMS shell keeps OAuth + megamenu |
| 5 | Remotes expose `./Routes` | Domain teams expose route trees |
| 6 | Manifest → localhost remoteEntry | Manifest → `cdn-<env>/…/remoteEntry.json` |
| 7 | `shareAll` Angular singleton | Same — one framework in the tab |
| 8 | Region filter in shared session | Tenant/permissions/context in platform lib |
| 9 | `adminGuard` in fleet remote | Real permission / canMatch gates |
| 10 | No iframe in demo | IDMS: iframe only for unfinished pages |

---

## 45s spoken (create-your-own)

> For IDMS I’d mirror our polyrepo demo: a platform package for auth published to a private registry so every app installs it with npm ci in CI. The shell is the federation host with the login and manifest. Safety and Fleet are separate repos that expose route trees and deploy their own remoteEntry to the env CDN. Locally we used file: links to simulate that registry. Environments differ by stamped config and which SHA the federation manifest points at — not by installing auth differently on each server.

---

## Related

| Doc | When |
|---|---|
| [11_MFE_POLYREPO_HANDSON.md](./11_MFE_POLYREPO_HANDSON.md) | Run the separate-repos demo |
| [08_…](./08_CLOUD_FRONT_END_MFE_SPLIT_FOOLPROOF.md) | Which IDMS routes go MF vs iframe |
| [../frontend-system-design/20_CDN.md](../frontend-system-design/20_CDN.md) | CDN + remoteEntry |
| [../frontend-system-design/18_NETRADYNE_DEVOPS_CI_CD.md](../frontend-system-design/18_NETRADYNE_DEVOPS_CI_CD.md) | Jenkins / env stamp |
