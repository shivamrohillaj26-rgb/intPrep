# Senior round — “How are you implementing micro-frontends?”

**This is the file to grind.** If she only asks one thing, it will be this.

**Never say:** POC · NUX POC · `nux-poc` · dummy · toy · “I just experimented”

**If they follow “Native Federation = ESM + import maps” with “what is ESM / import map / Webpack?”** → [ONETRUST_ESM_IMPORT_MAPS.md](./ONETRUST_ESM_IMPORT_MAPS.md)

**Do say:** conversion · migration · testing environment · Phase 1 monorepo · Nx workspace · Native Federation

---

## 0. “What is a micro-frontend?” — one paragraph (say this)

> A **micro-frontend** is splitting a UI the way microservices split a backend: **independently built and deployed pieces**, composed **in the browser at runtime**. The user still opens **one URL**. A **host** (shell) owns chrome, login, and routing. **Remotes** (devices, safety, …) are separate JS apps that expose a route tree; the host **loads them when the user navigates**, from a CDN, without rebuilding the whole dashboard. Shared things like Angular and auth are **singletons** so you don’t get two logins. That is **not** “folders in one repo” and **not** an **iframe** leftover page — those are different composition models. We implement the **Module Federation** pattern with **Native Federation** on Angular’s esbuild pipeline.

**~15s if she only wants a definition:**

> One product, one tab, many independently deployed frontends. Host loads remotes at runtime. Teams ship devices without rebuilding safety.

Then go to §1 if she asks *how we do it*.

---

**Honesty if pressed “is it live for all customers?”**

> Production NUX is still **one Angular dashboard** under `/dashboard/`, one Jenkins zip. The **MFE conversion is running** on our **testing CDN**: host, kernel, six remotes, independent deploy. Next we peel real NUX domains onto that contract. I’m leading it with 2–3 juniors.

---

## 1. Open with this (90 seconds) — “How are you implementing MFE?”

> IDMS NUX is a large Angular dashboard — devices, safety, video, fleet, admin. Today **prod is still one app, one build, one deploy**. That blocks teams: a devices change rebuilds safety.  
>  
> **Approach: Phase 1 is a monorepo micro-frontend**, not many GitHub repos yet. One **Nx workspace**: `apps/host`, `apps/devices`, `apps/safety`, … and `libs/kernel`. Runtime is **Native Federation** (Module Federation model on Angular esbuild).  
>  
> **Host** owns login, nav, guards, and `loadRemoteModule('devices', './Routes')`. **Kernel** is a shared library — auth, tenant, cross-domain store — federated as a **singleton** so one session. **Remotes** expose route trees only; they never import each other.  
>  
> Users open **one URL**. Remotes are JS on CDN, not separate websites. We learned the hard way that **S3 path ≠ Angular route**: assets now live under `/mfe/devices/`, UI is `#/devices`, so refresh always loads the host. I can ship **admin-only** by syncing that prefix.  
>  
> **Current prod deploy** is still the monolith Jenkins job. **Target deploy** is company CD: build each app **once** as `devices:<sha>`, promote the same artifact QA → staging → prod, host **manifest** pins remote SHAs. Nx gives us **affected builds** so a devices PR doesn’t rebuild the world.

Stop. Let her ask. Don’t dump CI unless she asks.

---

## 2. Words: monorepo vs Nx vs MFE (don’t mix them)

| Term | Meaning | In your work |
|---|---|---|
| **Monorepo** | **One git repo**, many apps/libs | Phase 1: host + remotes + kernel **together** |
| **Polyrepo** | One repo per app | Later, only if a team needs isolated git/CI |
| **Nx** | Tooling **on top of** a monorepo | Dependency graph, `nx affected`, cache, one Angular version |
| **Micro-frontend** | **Runtime** split: host loads remotes | Native Federation + manifest — **not** “we have folders” |

**Spoken distinction:**

> Monorepo is **how we store code**. Nx is **how we build only what changed**. Micro-frontend is **how the browser loads independently deployed JS**. You can have a monorepo that is still one SPA. We have a monorepo **and** federation.

### What is a monorepo? (if she asks like you’re junior)

> One repository containing multiple deployable apps and shared libraries. One PR can change kernel + devices with a single review. Everyone is on the **same Angular version**. The cost is a bigger repo; the win is **contract changes stay atomic**.

**Full Nx explainer (purpose, build, why we need it, Jenkins/`affected`/import-rule snapshots):** [ONETRUST_NX_MONOREPO.md](./ONETRUST_NX_MONOREPO.md) §5b

### What is Nx? How does it work?

Nx is a **monorepo build system** (Nrwl). It does **not** load remotes in the browser.

```text
nx.json + project.json per app
        │
        ▼
Nx builds a PROJECT GRAPH
  host  → depends on kernel
  devices → depends on kernel
  safety → depends on kernel
  devices does NOT depend on safety
        │
        ▼
nx affected -t build
  git diff → only rebuild projects that changed (and dependents)
        │
        ▼
Computation cache (local / remote): same inputs → skip rebuild
```

| Command (say these) | What it does |
|---|---|
| `nx graph` | Show app/lib dependencies |
| `nx affected -t test,build` | CI: only what the PR touched |
| `nx build devices` | Build one remote |
| `nx run-many -t build -p host,devices` | Explicit list |

**Advantages you’ll name:**

1. **Affected CI** — devices PR ≠ 20-minute full dashboard.  
2. **One version** of Angular/RxJS/NDS — federation singletons stay sane.  
3. **Libs** (`kernel`) with a public API — juniors import `@idms/kernel`, not random relative paths.  
4. **Cache** — repeat builds skip.  
5. **Boundaries** — enforce “remotes must not import remotes” (Nx tags / module boundaries).

**What you’re doing in the application:**

> Conversion workspace is already **multi-app** (host + remotes + kernel lib). We’re **standardizing on Nx** so Jenkins can run `nx affected` and so juniors have a clear `apps/` + `libs/` layout when we peel real NUX into `cloud-front-end`. Nx does **not** replace Federation — it feeds **independent artifacts** into S3/CDN.

If she asks “is Nx in prod NUX today?”  
> Prod dashboard is still a **classic Angular app** in `cloud-front-end`. Nx is the **conversion / target workspace** so we don’t scale six `ng serve` scripts by hand.

---

## 2b. What is Module Federation vs Native Federation? (if she asks this first)

**Grind this.** She may never say “walk me through your split” — she may only say **“What is Module Federation?”** and **“What is Native Module Federation?”**

**Do not mix with Nx.** Nx compiles. Federation **loads JS in the browser**.

```text
Nx                  →  BUILD TIME   (what to compile, affected CI)
Module Federation   →  THE IDEA     (host + remotes at runtime)
Native Federation   →  HOW we do that idea on Angular esbuild
```

### One-liner (10s)

> **Module Federation** is the **pattern**: a host loads separately built remotes at runtime and **shares** Angular as a singleton. **Native Federation** is that **same pattern** on **ESM + import maps**, so it works with Angular’s **esbuild application builder** instead of Webpack.

**Do not say:** “Native Federation is a different architecture.”  
**Do say:** “Same architecture, different engine.”

---

### What is Module Federation? (45–60s)

> Module Federation is a **runtime composition** model for micro-frontends. The **host** does **not** webpack-bundle Devices into its own `main.js`. At runtime it fetches a **catalog** from the Devices **remote** — classically Webpack’s `remoteEntry.js` — then loads an **exposed** module, usually a **route tree** (`./Routes`). Shared libraries like `@angular/core` and `rxjs` are declared **singleton** so one tab has **one** Angular, **one** injector tree, **one** login. That is how you get **independent deploy**: ship Devices JS without rebuilding Safety. Webpack 5 made this famous with `ModuleFederationPlugin`. When a JD says “Module Federation,” they usually mean **host / remote / expose / shared / remoteEntry**, not “we must use Webpack forever.”

**Why it exists (20s):** lazy `loadChildren` in **one** app is still **one artifact, one Jenkins zip**. Federation remotes are **their own build outputs** on CDN. Teams ship on different cadences.

**Four words she wants to hear:** host · remote · expose · shared (singleton).

**How Webpack MF loads (if she asks internals):**

```text
Host Webpack runtime
  → fetch remoteEntry.js   (glue + which exposes exist)
  → share scope            (one Angular for host + remotes)
  → get './Routes'
  → Angular router renders inside host outlet
```

Sketch she may recognize:

```js
new ModuleFederationPlugin({
  name: 'devices',
  filename: 'remoteEntry.js',
  exposes: { './Routes': './src/devices.routes.ts' },
  shared: {
    '@angular/core': { singleton: true, strictVersion: true },
    rxjs: { singleton: true },
  },
});
```

---

### What is Native Federation? (45–60s) — “native module federation”

> **Native Federation** (people also say **Native Module Federation**) is Module Federation’s **mental model** implemented with **browser-native ESM** and **import maps**, not the Webpack federation runtime. Remotes still **expose** `./Routes`. The host still has a **manifest**: name → URL of `remoteEntry.json`. Shared packages are still **singletons** (`shareAll({ singleton: true })`). The host still does `loadRemoteModule('devices', './Routes')`. We use it because **NUX / modern Angular is on the esbuild application builder**. Forcing Webpack Module Federation would mean fighting the CLI — custom Webpack, slower builds, a Webpack runtime in the shell we don’t otherwise need.

**“Native” means:** the **browser’s module graph** (ESM + import maps), not “React Native,” not “native mobile.”

**How Native Federation loads:**

```text
Host boots Native Federation runtime
  → federation.manifest.json   ( 'devices' → CDN URL )
  → import maps                (where shared ESM Angular lives)
  → import() the exposed module
  → same router-outlet as Webpack MF
```

Same config *shape* on purpose:

```ts
export default withNativeFederation({
  name: 'devices',
  exposes: { './Routes': './src/devices.routes.ts' },
  shared: {
    ...shareAll({ singleton: true, strictVersion: true, requiredVersion: 'auto' }),
  },
});
```

Host (either engine):

```ts
loadChildren: () =>
  loadRemoteModule('devices', './Routes').then((m) => m.DEVICES_ROUTES)
```

---

### Side-by-side (memorize)

| | **Module Federation (Webpack)** | **Native Federation (what we use)** |
|---|---|---|
| Idea | Host loads remotes at runtime | **Same** |
| Vocabulary | host, remote, expose, shared, remoteEntry | **Same** |
| Independent deploy | Yes | **Yes** |
| Bundler | Webpack / Rspack + `ModuleFederationPlugin` | Angular **application builder / esbuild** |
| Catalog file | `remoteEntry.js` (Webpack glue) | `remoteEntry.json` + ESM chunks |
| How shares work | Webpack **share scope** | **Import maps** + prepared shared ESM |
| Shell cost | Webpack federation runtime | Usually **smaller** — no full Webpack runtime |
| Fits | Older Webpack Angular, mixed Webpack estate | Angular **17+** default esbuild path |
| Our NUX conversion | Would fight the CLI | **This is the implementation** |

**Same (don’t redo architecture if you switch engine):** domain split, singleton kernel/auth, manifest + SHA folders, remotes don’t import remotes.  
**Different:** how `remoteEntry` is produced and how Angular is shared on the wire.

---

### In *your* app (tie it back — 30s)

> Host boots, `initFederation` reads `federation.manifest.json`, maps `'devices'` to `/mfe/devices/<sha>/remoteEntry.json`. User hits `#/devices` → `loadRemoteModule('devices', './Routes')` → chunks from CDN → UI in the **host** outlet. Kernel auth is a **shared singleton**. Devices is **not** a second website. If she asks “are you doing Module Federation?” → **Yes — the MF architecture, implemented with Native Federation.**

---

### Rapid follow-ups

**Q: Why not Webpack Module Federation?**  
> NUX is on esbuild. Webpack MF is the right choice if the org is already a Webpack MF estate. We’re not.

**Q: Why not only lazy routes?**  
> One deployable. A devices bugfix would still rebuild/ship the whole dashboard.

**Q: Does Nx do Module Federation?**  
> No. Nx **builds** `apps/devices`. Native Federation **publishes and loads** that output. Plugins can *generate* `federation.config`; Nx is still not the loader in the browser.

**Q: Duplicate Angular?**  
> `shareAll({ singleton: true })`. Two Angulares = two injectors = broken session. Contract break.

**Q: Iframe vs this?**  
> Iframe = separate document, easy isolation, leftover `/app`. Federation = one document, shared Angular, real router. Conversion uses **federation for native domains**; iframe until nativized.

**Q: Have you used Module Federation?**  
> Yes — host, remotes, shared platform deps, independent CDN deploys. On this Angular version the implementation is **Native Federation**. Same vocabulary.

Deeper table / load diagrams: [../micro-frontends/07_NATIVE_VS_MODULE_FEDERATION.md](../micro-frontends/07_NATIVE_VS_MODULE_FEDERATION.md). Nx-only wording also in [ONETRUST_NX_MONOREPO.md](./ONETRUST_NX_MONOREPO.md) §8.

---

## 3. How we implement MFE (architecture she can grill)

```text
Browser → HOST (only website)
            login · megamenu · authGuard
            initFederation(manifest)
            loadRemoteModule(name, './Routes')
                    │
                    ▼
         remoteEntry.json + chunks   (CDN /mfe/<domain>/<sha>/)
                    │
                    ▼
         Devices / Safety / Video / Fleet / Provisioning / Admin
                    │
                    ▼
         KERNEL singleton  (Auth · Tenant · KernelStore)
```

**Five rules (memorize):**

1. Only the host is a website.  
2. Kernel is a **singleton** — one login, one tenant.  
3. Remotes **never import each other** — only kernel + APIs.  
4. **Route ≠ asset folder** (`#/devices` vs `/mfe/devices/remoteEntry.json`).  
5. Deploy is **prefix-scoped** — admin upload does not overwrite devices.

**Runtime steps (click Devices):**

1. Host `index.html` already loaded.  
2. `initFederation` read `federation.manifest.json`.  
3. Router `#/devices` → `loadRemoteModule('devices', './Routes')` → `DEVICES_ROUTES`.  
4. Fetch `/mfe/devices/<sha>/remoteEntry.json` + JS.  
5. UI renders **inside** host shell. Kernel status (user/tenant/selected device) is the **same instance**.

**Cross-remote data:** Devices “share device” → `KernelStore.selectedDeviceId` → Safety/Admin read it. Not iframe `postMessage` for these remotes. Not props.

**Native Federation vs Module Federation:** → **§2b**. Same host/remote/shared-singleton idea; we use NF because NUX is on the **esbuild application builder**.

**Iframes:** leftover NUX pages still iframe `/app`. Conversion: **federation for native domains**; iframe until nativized. Don’t call iframe “the MFE we’re building.” Full protocol + shared auth: [ONETRUST_IFRAME_BRIDGE.md](./ONETRUST_IFRAME_BRIDGE.md).

---

## 4. Current deploy vs conversion deploy

### Today (production NUX) — she will ask this

```text
PR → GitHub Actions (lint / quality)
Merge → Jenkins (build-fleet, Node 22)
  → one Angular production build
  → STAMP each env (qa1–qa10, staging, prod) into window.EnvironmentData
  → ZIP → s3://netradyne-artifacts
  → serve /dashboard/ on cdn-<env>
```

> **One artifact for the whole UI.** API URLs are **runtime stamp**, not `fileReplacements`. GHA does not ship prod; **Jenkins does**.

### Conversion environment (already working)

> Host + remotes on the **testing bucket**, isolated from live `/dashboard/` and `/app/`.  
> Host `index.html` + `federation.manifest.json`.  
> Remotes under **`/mfe/<name>/`**.  
> Hash routes so S3 refresh works.  
> `deploy admin` syncs **only** `mfe/admin/`.

Don’t name the testing prefix if you can avoid it. Say **“testing CDN, separate from production dashboard.”**

### Target (company CI/CD + MFE)

```text
main (Nx monorepo)
  path filter / nx affected
       ├─ host:<sha>     → CDN shell/ + manifest
       ├─ devices:<sha>  → CDN mfe/devices/<sha>/
       ├─ safety:<sha>   → CDN mfe/safety/<sha>/
       └─ kernel@x.y.z   → private npm (not a website)

QA: deploy digest → smoke (login + remoteEntry 200)
Staging: PROMOTE same files (no rebuild)
Prod: approval + immutable tag
Rollback: manifest → previous SHA (one remote)
```

**Company rules you name:** build once, promote **same** artifact, feature flags, N/N-1 (new devices works with old host), tags never moved.

**Config:** still `EnvironmentData` / hostname — remotes don’t rebuild per QA.

---

## 5. Phase 1 vs Phase 2 (say “conversion phases,” not folder names)

| Phase | What it means | What you say |
|---|---|---|
| **Today / prod** | One dashboard zip | “Customers still on monolith.” |
| **Phase 1** | Prove host + kernel + remotes + independent deploy **in one monorepo** | “We’re here: Nx/multi-app + Federation working on test.” |
| **Phase 2** | Same MFE, **safe static layout** (`/mfe/` + hash or CloudFront rewrite) | “We fixed refresh: routes ≠ asset folders.” |
| **Later** | Polyrepo + kernel npm | “Only if a domain team needs its own git. Not first.” |

**Why monorepo first?** Same Angular, kernel as a workspace lib, juniors in one PR, Nx `affected`. Polyrepo later = more versioning pain.

---

## 6. Senior question bank (answer these out loud)

### Implementation

**Q: Walk me through implementing MFE in the current app.**  
→ §1. Then: peel one real domain (devices) behind a flag.

**Q: Why not start with 6 GitHub repos?**  
> Contracts aren’t stable. Monorepo + Nx first. Polyrepo when ownership requires it.

**Q: What is Module Federation? What is Native Federation?**  
→ **§2b** (definition, table, how NUX loads). Don’t mix with Nx.

**Q: What is Webpack? What is an ES module?**  
→ **[ONETRUST_WEBPACK_ESM.md](./ONETRUST_WEBPACK_ESM.md)** — ESM is the format; Webpack is a bundler. Don’t mix with Nx or NF.

**Q: Why Native Federation?**  
> Angular application builder is esbuild. Webpack MF fights that. Mental model is still MF. Full answer §2b.

**Q: Same AuthService in remotes?**  
> Kernel shared **singleton**. That’s the goal. Version mismatch without singleton = two sessions — we treat as a contract break.

**Q: How do remotes share state?**  
> Kernel store + APIs. No remote→remote imports.

**Q: What’s in `./Routes`?**  
> The remote’s route table. Host already has layout. We don’t expose a second `App` shell.

**Q: What if devices remote is down?**  
> Host lives. That route fallback/retry. Other remotes fine.

**Q: Shared Angular twice?**  
> `shareAll({ singleton: true })`. Duplicate Angular = broken DI.

**Q: SSR?**  
> Authenticated dashboard — CSR. SSR + remotes is a different program.

**Q: Iframe vs federation?**  
> Iframe = isolation + leftover `/app`. Federation = one document, shared Angular, real router. We’re converting **native** domains to federation.

### Monorepo / Nx

**Q: What is a monorepo?**  
→ §2.

**Q: What does Nx do that `ng build` doesn’t?**  
> Graph + **affected** + cache + lib boundaries. `ng build` is one project.

**Q: Nx vs Module Federation?**  
> Nx = build. Federation = runtime load. We use **both**.

**Q: How do juniors work in Nx?**  
> They live in `apps/devices`. They don’t change `federation.config` or kernel public API without my review. `nx serve devices` for standalone; host for integration.

**Q: Module boundaries?**  
> Tag `type:remote` cannot import another remote. Only `type:kernel` / `scope:shared`.

### Deployment

**Q: How do you deploy today?**  
→ §4 “Today.” Jenkins, stamp, zip, artifacts S3, `/dashboard/`.

**Q: How will MFE deploy?**  
→ §4 “Target.” Per-app SHA, manifest, promote same digest.

**Q: Independent deploy — prove it.**  
> Change admin → build admin only → sync `mfe/admin/<sha>/` → update manifest key `admin`. Host and devices files untouched.

**Q: Rollback.**  
> Manifest previous SHA. Don’t rebuild old source.

**Q: Hotfix.**  
> Branch from prod tag, new SHA, new tag, promote, merge to `main`.

**Q: Why hash routes?**  
> S3/testing without SPA fallback. Prod CloudFront can rewrite `/*` → `index.html`. Hash was the **correct static fix**.

**Q: Env-specific JS?**  
> No. Stamp `EnvironmentData`. Manifest URLs differ per env (`cdn-qa3` vs `cdn-production`).

**Q: Kernel deploy?**  
> Library: publish version → consumers bump → **their** artifacts rebuild. Kernel is not an S3 site.

### Process / you

**Q: Is this in production?**  
> Conversion on test; prod still monolith. Don’t lie.

**Q: Your role vs juniors?**  
> I: host, kernel, manifest, Nx/CI, S3 layout, reviews. They: remote pages and `./Routes`.

**Q: What’s next week?**  
> Map real devices routes/APIs onto the devices remote; feature-flag vs monolith.

**Q: Why should OneTrust care?**  
> Same shape: big Angular platform, many domains, i18n, independent teams. I already ran host/remote/kernel and the deploy contract.

---

## 7. Forbidden / safer names

| In code / folders (don’t say) | In interview |
|---|---|
| `nux-poc`, `nux-poc-prod` | testing environment / conversion CDN |
| `@nux-poc/kernel` | **shared kernel** / `@idms/kernel` |
| POC Phase 1 folder | **Phase 1 of the conversion — monorepo MFE** |
| Dummy screens | Domain remotes with the **real split**; pages being replaced with NUX features |

---

## 8. Whiteboard (30 seconds)

```text
NOW PROD          CONVERSION              TARGET
dashboard.zip     host + 6 remotes        Nx affected
one Jenkins       test CDN /mfe/          sha folders
                  hash + kernel           promote digest
                  juniors on remotes      manifest pin
```

---

## 9. If you go blank — 4 sentences

1. Prod is still one NUX deploy; we are **converting**.  
2. **Monorepo + Nx** for code/CI; **Native Federation** for runtime.  
3. Host + **singleton kernel** + remotes that expose `./Routes`.  
4. Deploy **SHA folders** + **manifest**; rollback is previous SHA; company rule is **build once, promote same artifact**.

---

## Related

| File | When |
|---|---|
| [ONETRUST_WEBPACK_ESM.md](./ONETRUST_WEBPACK_ESM.md) | **Webpack vs ESM / esbuild** (why NF isn’t Webpack MF) |
| [ONETRUST_RESUME_MFE_STORY.md](./ONETRUST_RESUME_MFE_STORY.md) | Journey, resume bullets, CI/CD §8 |
| [ONETRUST_NUX_I18N_GLOSSARY.md](./ONETRUST_NUX_I18N_GLOSSARY.md) | If she goes i18n |
| [../frontend-system-design/18_NETRADYNE_DEVOPS_CI_CD.md](../frontend-system-design/18_NETRADYNE_DEVOPS_CI_CD.md) | Jenkins detail |
