# OneTrust — Resume grill + MFE conversion story

**Resume:** `Shivam_Rohilla_Resume.pdf` (Netradyne SSE, July 2025–Present + TCS)  
**What you actually built:** NUX host + kernel + 6 remotes (Native Federation) in Ternary — Phase 2 layout on testing S3.  
**What you say:** *We are converting IDMS NUX to micro-frontends. I own the architecture and lead 2–3 juniors.*  
**What you never say:** “POC”, “toy demo”, “dummy only”, “I just played with federation.”

**Honesty line (if they press “is this in prod?”):**

> Production traffic is still the Angular NUX monolith. The **conversion is underway**: shell, shared kernel, six domain remotes, manifest, and independent S3 deploys are **running on our testing environment**. We’re peeling real dashboard domains onto this contract — I’m leading that, two or three juniors own remote slices with me.

That is **migration in progress**, not a weekend experiment. Do not claim 500K devices already load remotes in prod.

---

## 0. Product journey (say this first if they ask “how did you get here?”)

Ternary reality (use **IDMS** names, not folder names):

| Era | Surface | How new work shipped |
|---|---|---|
| **Legacy** | AngularJS `/console` | Old IDMS UI |
| **Transitional app** | Angular **17→19** `/app` (`cloud-front-end-app`) — mostly **hand-written** | New pages built here, **shown inside legacy via iframe** (strangler) |
| **NUX 2.0** | Angular **21** `/dashboard` — **greenfield**, design system, standalone | New native pages in NUX; leftovers still iframe `/app` |
| **Now** | Same NUX + **MFE conversion** | Host + kernel + domain remotes; you + 2–3 juniors |

```text
Join
  → AngularJS console (legacy)
  → New Angular 17/19 app: every new page → iframe in legacy (one chrome, two codebases)
  → Tried to accelerate the handwritten /app with AI
       ✗ mixed styles, old patterns, no single convention → AI output didn’t stick
  → Greenfield NUX: same conventions + NDS/Storybook from day one
       ✓ AI-assisted speed actually worked (we still review / test / own architecture)
  → NUX grew into one big deploy again
  → Convert to MFE (this is the current chapter)
```

### 75s journey (memorize)

> When I joined IDMS, customers still lived on the **AngularJS console**. We already had a **newer Angular app** (started on 17, now 19) that we wrote **mostly by hand**. The strategy was strangler: **every new page went into that Angular app**, but users still opened **legacy** — we **embedded those pages in iframes** so they saw one product, not two URLs.  
>  
> That unblocked shipping, but the handwritten `/app` was inconsistent — different patterns, leftover AngularJS-era thinking. We tried to go **AI-assisted on that codebase** and it didn’t scale: the model kept fighting **existing manual code**, so reviews were slower, not faster.  
>  
> So we started a **greenfield NUX dashboard** — Angular 21, standalone, NDS/Storybook, one way to do routes, auth, tables. **That’s where velocity came back**: AI could generate against **clear conventions**, and we still own architecture and reviews. NUX became the shell; unfinished flows still iframe `/app`.  
>  
> NUX is now a **large monolith** again, so I’m **leading the conversion to micro-frontends** — host, shared kernel, domain remotes, independent deploy — with two or three juniors on remote slices.

### How to talk about AI (don’t sound sloppy)

| Don’t say | Do say |
|---|---|
| We let AI write the whole company | Greenfield + **conventions** so AI-assisted work is consistent |
| AI failed so we gave up | AI failed **on a messy handwritten app**; it worked **once we had a clean baseline** |
| 40% faster because Cursor | Faster because **one architecture** + assistants; I still review federation/kernel |
| Greenfield = throw away `/app` | `/app` still serves iframe leftovers; NUX is the **new home** |

**If they push “is NUX really all AI?”**  
> No. It’s **AI-assisted on a greenfield** we designed: design system, folder rules, auth/tenant already in the shell. Humans own HLD, guards, data, and MFE contracts.

---

## 0b. 90s MFE story (after the journey, or if they skip to “current work”)

> At Netradyne I work on **IDMS NUX** — the fleet/safety Angular dashboard. The product is still one large app today, which means any domain change can force a full UI build and deploy. I’m **leading the conversion to micro-frontends**: a **host shell** for login, nav, and composition; a **shared kernel** for auth, tenant, and cross-domain state; and **domain remotes** — devices, safety, video, fleet, provisioning, admin — loaded at runtime with **Native Federation** (same Module Federation model on Angular’s esbuild builder).  
>  
> Users still open **one URL**. Remotes are not separate websites. Kernel is a **singleton** so login and tenant stay when you switch domains. We hit a real static-hosting bug: remote **asset folders** collided with **route paths**, so refresh served the wrong files. We fixed it by putting remotes under `/mfe/<domain>/` and using **hash routes** so S3 always returns the host. I can deploy **admin only** without rebuilding devices.  
>  
> I have **two or three juniors** with me: they own remote routes and domain pages; I own federation config, kernel contract, manifest, deploy paths, and reviews. Next is mapping real NUX modules onto this shell instead of staying in the monolith.

---

## 1. How to convey “converting” (words that survive a senior)

| Don’t say | Do say |
|---|---|
| We did a POC | We’re **migrating** — contract is live on test/CDN |
| Dummy pages | **Domain remotes** with the **real split** (devices, safety…) |
| I tried Module Federation | **Native Federation** — MF mental model, Angular 21 / esbuild |
| Fully live MFE for all customers | **Monolith still serves prod**; **conversion running** in parallel |
| I work alone | I **lead** 2–3 juniors on remotes; I own kernel + host + CI/S3 |

**Team split (use this):**

| Person | Owns |
|---|---|
| You | Host, kernel (`AuthService`, `TenantStore`, `KernelStore`), `federation.manifest`, S3 layout, `loadRemoteModule`, reviews |
| Junior A | Devices + fleet remotes (`./Routes`, pages) |
| Junior B | Safety + video |
| Junior C (if 3) | Provisioning + admin + copy/docs |

You pair on “how a remote talks to kernel” (`publish` / `selectedDeviceId`).

---

## 2. Architecture you must draw (2 minutes)

```text
USER → one host URL
        HOST: login, nav, loadRemoteModule
              │
              │ Native Federation + federation.manifest.json
              ▼
     remotes: devices | safety | video | fleet | provisioning | admin
              │
              ▼
     KERNEL singleton (@nux-poc/kernel)
       AuthService · TenantStore · KernelStore
       (never remote→remote import)
```

**Five rules (say them):**

1. Only the host is a website.  
2. Kernel is shared **singleton** — one session.  
3. Remotes never import each other — only kernel + APIs.  
4. **Routes ≠ asset folders** (`#/devices` vs `/mfe/devices/remoteEntry.json`).  
5. Independent deploy = sync only that remote’s prefix.

---

## 3. What you implemented (facts — use these names)

| Piece | What exists |
|---|---|
| Stack | Angular + Native Federation (`@angular-architects/native-federation`) |
| Host routes | `loadRemoteModule('devices', './Routes')` → `DEVICES_ROUTES` (same for safety, video, fleet, provisioning, admin) |
| Kernel | `AuthService`, `authGuard`, `TenantStore`, `KernelStore`, status bar |
| Cross-remote | Devices **Share to kernel** → `selectedDeviceId` / `publish()` → Safety/Admin read same store |
| Manifest | name → `remoteEntry.json` URL (local ports vs S3 `/mfe/...`) |
| S3 | Host `index.html` + `mfe/<remote>/`; independent `deploy:s3:admin` |
| Hash | `withHashLocation()` so refresh always hits host on S3 |
| Phase 1 lesson | Assets at `/devices/` **clashed** with route → blank refresh |
| Phase 2 | `/mfe/devices/` + `#/devices` |
| Prod NUX | Still `cloud-front-end` monolith — **strangler**: peel domains one by one |
| Iframes | Real NUX still has leftover iframe pages — **not** the MFE remotes |

---

## 4. Senior interviewer — questions from YOUR resume + answers

### A. Opening

**Q: Walk me through your current role.**  
> Use **§0 journey** then one product win (device list / RMA). Close with MFE + juniors. Don’t start at remotes.

**Q: Why a second Angular app if you already had `/app`?**  
> `/app` was the handwritten strangler (iframe into AngularJS). AI and new patterns kept hitting old code. NUX was a **clean baseline** — same product, better velocity — leftovers still iframe `/app`.

**Q: Angular 19 on the resume, but federation on 21?**  
> Product NUX is the live Angular upgrade path (resume: 19). The conversion workspace is on the **current Angular + Native Federation** stack so we don’t build MF on Webpack we’re leaving. When we peel a real module, it targets the same major as NUX. I won’t pretend prod is already 21 remotes.

**Q: 500K devices — is that frontend users?**  
> That’s **fleet devices in the platform**, not 500K concurrent SPA users. The FE constraint is **admins opening huge device lists** (I optimized a 10k+ row view). Don’t inflate “500K DAU.”

---

### B. Product bullets (they will pick 2–3)

**Q: 8s → 2s on device listing — how?**  
> Virtual scroll (CDK) so we don’t paint 10k rows. On-demand / paginated fetch instead of one giant payload. `trackBy` / `@for track` so row identity is stable. OnPush on the list. Measured before/after in the heavy view — not a Lighthouse homepage score.

**Follow-up: Why not just pagination?**  
> We have both: server page for network, virtual window for DOM. Pagination alone still hurts if the page size is huge.

**Q: Immutable notification preferences + feature flags?**  
> Two API shapes (legacy vs flagged). I built a **normalization layer** so the UI has one model. Flag on → new mapper; off → old. No forked templates. Rollout per customer without UI rewrite.

**Q: RMA self-service — what was hard?**  
> State machine: Initiated → Label sent → Shipped → Received. Real-time status (poll or existing IDMS APIs — say **status polling + clear empty/error**). Replaced on-call/manual. Success = fewer support calls.

**Q: Subscriptions & hardware insights?**  
> Unified scattered pages into one module: subscriptions, accessories, devices. Navigation + one mental model for fleet managers. Customer praise = they stopped hopping three menus.

**Q: Design system + Storybook?**  
> Reusable NDS-style components, documented in Storybook so juniors don’t copy-paste markup. Ties to MFE: **kernel/UI primitives stay shared**; remotes don’t invent buttons.

**Q: 40% velocity with Cursor/Claude — isn’t that fluff?**  
> I use it for boilerplate and refactors; **I still own architecture, reviews, and federation contracts**. I don’t let juniors merge AI output I haven’t reviewed. Cut that bullet if they smirk — lead with MFE + device list.

---

### C. TCS (keep short)

**Q: Three portals — what did you actually own?**  
> Broker: Angular 17, reactive forms, RBAC, auto-logout, Jest 90%+. Employee: rebrand + NgRx selectors. Recruitment: calendar APIs, 3 regions. Cross-cutting: lazy load + tree-shake, ~20% bundle. Mentored 3 juniors (same muscle as now).

**Q: NgRx vs signals in NUX?**  
> TCS employee portal used NgRx for many distant writers. NUX/MFE: **kernel signals** for session/tenant/selected device; RxJS at HTTP. I won’t put 100 list payloads in a global store.

---

### D. Micro-frontends (this is the deep round)

**Q: Why MFE at all?**  
> One dashboard, many domains, one deploy. Device team blocked on safety release. We need **independent build/deploy**, one login, one UX. Not because MFE is trendy.

**Q: Native vs Module Federation?**  
> Same host/remote/`remoteEntry`/shared singleton idea. We use **Native Federation** because NUX is on the **esbuild application builder**. Webpack `ModuleFederationPlugin` would fight that. Interviewers who say “Module Federation” — I map the words.

**Q: How does the host find remotes?**  
> `initFederation('federation.manifest.json')`. Manifest maps `'devices'` → `remoteEntry.json` URL. Router `loadRemoteModule('devices', './Routes')`. Env swap = new manifest, not a host rewrite.

**Q: What’s in the kernel?**  
> Auth (login/guard), tenant, `KernelStore` (ping, `selectedDeviceId`, `publish`). Shared as Federation singleton so remotes inject the **same** services.

**Q: Same AuthService instance?**  
> That’s the goal: share `@nux-poc/kernel` as **singleton**. One injector story in the tab. If versions diverge and it isn’t singleton, you get two sessions — we treat that as a contract break.

**Q: How do remotes share data?**  
> Not props, not iframe postMessage for these pages. **Kernel store**. Devices share a device id; Safety/Admin read it. Domain lists still come from **each remote’s APIs**.

**Q: Why not remotes import each other?**  
> Cycle + coupling. Devices would break if Safety shipped a bad export. Kernel is the bus.

**Q: Independent deploy — prove it.**  
> Change admin copy → pipeline builds **only admin** → sync `…/mfe/admin/`. Host + devices files unchanged. Hard refresh: admin new, others same. Manifest still points at that prefix.

**Q: Refresh broke — what did you do?**  
> Phase 1 put assets at `/devices/`. Reload hit S3 folder, not host. **Fix:** assets under `/mfe/devices/`, UI at `#/devices` (`withHashLocation`). Server only sees `/nux-poc-prod/` → host `index.html`. Hash stays in the browser.

**Q: Why hash? That’s ugly.**  
> Right for **S3 without SPA fallback**. Prod CloudFront can use **History + error/rewrite to index.html**. I’d move off hash when infra does that. Hash was the **correct static-hosting fix**, not a fashion choice.

**Q: Monorepo or polyrepo?**  
> **Monorepo first** — one Angular version, kernel as workspace lib, juniors in one PR. Polyrepo + kernel **npm** when a domain team needs isolated git/CI. We already know that shape; we don’t start there.

**Q: What about existing iframes?**  
> NUX still has **legacy iframe pages**. Conversion plan: **MF remotes for native domains**; iframe only for leftovers until nativized. Iframe is strangler, not the target.

**Q: SSR?**  
> Authenticated dashboard — **CSR**. SSR + remotes is a different problem; we didn’t take it.

**Q: How do you version remotes?**  
> Manifest points at a **SHA prefix** on CDN. Rollback = point manifest at previous SHA. Kernel version is a **shared contract** — bump carefully, juniors don’t change kernel without me.

**Q: Failure if a remote is down?**  
> Host still loads. That route shows fallback / retry. Other remotes work. That’s the point of isolation.

**Q: Shared Angular duplicate?**  
> `shareAll({ singleton: true })` — one Angular/RxJS in the tab. Duplicate framework = broken DI.

**Q: Security?**  
> Login stays in host/kernel. Remotes don’t re-auth. Token via kernel/interceptor. Don’t put secrets in manifest. Testing bucket is isolated from live `/dashboard/`.

**Q: What’s next week for the conversion?**  
> Map **one real NUX domain** (devices is the candidate — we already have list perf work) onto the remote contract: real routes, real API, feature flag to serve remote vs monolith. Juniors take page slices; I take the cutover.

**Q: Why should I believe you lead juniors?**  
> I split work: they don’t edit `federation.config` or kernel public API without review. I give them a remote checklist: expose `./Routes`, no login page, inject kernel, no cross-remote import. Same as TCS mentoring, tighter contract.

---

## 5. Trap questions (don’t die here)

| They ask | Trap | Your line |
|---|---|---|
| Is MFE in production for all users? | Yes | **No.** Conversion running; prod still monolith. |
| Did you write Native Federation? | I invented it | I **configured and shipped** host/remotes/kernel/deploy. |
| 6 remotes in prod? | Yes | **Six remotes on the conversion environment**; prod modules still in the monolith until peeled. |
| You use Webpack MF? | Yes | **Native Federation** = same model. |
| AngularJS still? | Confused | Resume: **migrating AngularJS → modern Angular**; MFE is the **next modularization** of that NUX. |
| 40% AI | You don’t code | AI is a tool; **I own reviews and architecture.** |

---

## 6. OneTrust mapping (one sentence each)

| They care | You say |
|---|---|
| Design system | Storybook + shared kernel/UI; remotes consume, don’t fork |
| Data-heavy | Device list 10k + virtual scroll — same as their vendor/DSAR tables |
| Forms / flags | Notification prefs normalization + flags |
| a11y | Call out as next bar on remotes + NDS (don’t fake WCAG audits) |
| Independent teams | Host/kernel vs domain remotes + juniors |

---

## 7. Cheat card (night before)

```text
CONVERTING (not POC): host + kernel + 6 remotes on test CDN
PROD: still NUX monolith · strangler peel next
ME: kernel, host, manifest, S3, reviews
JUNIORS: remote pages / Routes
NF = MF model on esbuild
singleton kernel = one login
#/devices vs /mfe/devices/ = refresh fix
deploy admin prefix only = independent release
iframe leftovers stay until native
```

---

## 8. CI/CD plan (if they ask “how will you ship this?”)

**Grounded in:** current Netradyne Jenkins FE (`18_NETRADYNE_DEVOPS_CI_CD.md`) + company SDLC (build once / promote same artifact) + MFE Phase 2 prefixes.  
**Env / which API:** [ONETRUST_ENVIRONMENT_STORY.md](./ONETRUST_ENVIRONMENT_STORY.md)

### 60s spoken

> Today NUX ships as **one Jenkins job**: Node on `build-fleet`, Angular production build, **stamp each env** (`qa1–qa10`, staging, prod) into `window.EnvironmentData`, zip, upload `s3://netradyne-artifacts`. GitHub Actions is PR lint/build — **Jenkins owns release artifacts**.  
>  
> For the MFE conversion we keep that **company CD model**, but we stop treating the whole dashboard as one zip. **Host, each remote, and the kernel** become **independently deployable artifacts**, named by git SHA. Merge to `main` → **build once** → deploy that digest to QA → automated smoke (host loads `remoteEntry`) → **promote the same bits** to staging → **prod approval**. We do **not** rebuild JS per environment for API URLs — stamp/runtime config stays.  
>  
> Host pipeline updates `federation.manifest.json` to pin remote SHAs. A bad devices release rolls back **only** `mfe/devices/` by pointing the manifest at the previous digest. Juniors don’t deploy from laptops; I own the Jenkins path filters and manifest contract.

### Today vs conversion (draw this)

```text
TODAY (monolith NUX)
  PR → GHA guardrails
  Jenkins: one Angular build → stamp qa*/staging/prod → ZIP → netradyne-artifacts
  Ops/promote → cdn-<env>

CONVERSION (same SDLC, more artifacts)
  PR (path filter) → lint/unit/build affected package
  Merge main
       ├─ host:<sha>      → …/shell/ + federation.manifest
       ├─ devices:<sha>   → …/mfe/devices/
       ├─ safety:<sha>    → …/mfe/safety/
       └─ kernel@x.y.z    → npm/Artifactory (not a website)

  QA: deploy digest → smoke login + open remotes
  Staging: PROMOTE same digest (no rebuild)
  Prod: approval + immutable tag  → rollback = previous digest
```

### Company rules you must name

| Rule | What you say |
|---|---|
| One `main` | Short-lived feature branches; no env branches that rebuild different bits |
| Build once | `devices:<git-sha>` is immutable |
| Promote artifact | QA → staging → prod is the **same files**, not a restamp rebuild |
| Config vs build | API hosts via **EnvironmentData / hostname** (existing NUX), not `fileReplacements` |
| Feature flags | Remote nav can be dark; `main` stays releasable |
| N/N-1 | New devices remote must work with current host/kernel |
| Prod gate | Manual approval; tags never moved; hotfix = new tag from prod baseline |
| Independent services | One remote can ship without rebuilding all remotes |

### Jenkins shape (concrete)

| Job | Trigger | Output | Lands |
|---|---|---|---|
| `nux-host` | `apps/shell/**` or manifest | host static + manifest | CDN `shell/` or env prefix |
| `nux-devices` | `apps/devices/**` | `remoteEntry` + chunks | `mfe/devices/<sha>/` |
| `nux-safety` | … | same | `mfe/safety/<sha>/` |
| `nux-kernel` | `libs/kernel/**` | npm package | registry; remotes/host bump dep |

**Path filters** in the monorepo: juniors change devices → only devices job. You review kernel/host PRs.

**Manifest (host, short cache):**

```json
{
  "devices": "https://cdn-qa3.netradyne.com/mfe/devices/a1b2c3d/remoteEntry.json",
  "safety": "https://cdn-qa3.netradyne.com/mfe/safety/e4f5g6h/remoteEntry.json"
}
```

Promote devices to staging = copy **same** `a1b2c3d` folder to staging CDN + update staging manifest. Do not `ng build` again.

### Quality gates (MFE-flavored)

| Gate | Meaning |
|---|---|
| Health | Host `index.html` 200 |
| Smoke | Login (kernel) → `#/devices` → `remoteEntry` 200 → no fatal |
| Integration | Switch remotes; tenant/session still there (singleton) |
| E2E | One critical flow per domain (device list you already optimized) |
| Contract | Kernel public API / `./Routes` expose didn’t break N/N-1 |

### Rollback / hotfix

- Devices bad in prod → manifest back to previous SHA; **don’t** rebuild old source.  
- Host bad → roll host prefix only.  
- Hotfix: branch from **prod tag**, new SHA, new tag (`v4.18.1`), promote QA→staging→prod, merge back to `main`.  
- Matches company: tags immutable.

### What we already proved vs what Jenkins must do

| Already running (conversion env) | Production CD |
|---|---|
| `deploy:s3:admin` only syncs `mfe/admin/` | Same prefix rule inside Jenkins `deployArtifact` |
| Manifest points at `/mfe/<name>/remoteEntry.json` | Manifest points at **SHA** URLs per env |
| Testing bucket isolated from `/dashboard/` | Real `cdn-<env>` + artifact bucket |
| Manual browser check | Automated smoke after deploy |

> Laptop S3 sync proved **independent remote deploy**. Company SDLC says that must become **Jenkins: buildArtifact → deployArtifact → validate → promote**.

### If they ask “does today’s NUX already do promote-same-artifact?”

Be honest:

> Classic dashboard job still **stamps multiple env zips from one Angular compile** and stores them on `netradyne-artifacts`. Company SDLC is pushing **one digest promoted through QA→staging→prod**. MFE makes that cleaner because a remote is already a **static SHA folder** — we don’t need six different JS builds for six QAs, only different **manifest + EnvironmentData**.

### Questions they’ll ask + one-liners

**Q: Separate pipeline per remote — won’t that be chaos?**  
> Path-filtered jobs in one monorepo. Kernel/host are gated. Juniors don’t touch manifest.

**Q: How do remotes get API URLs?**  
> Same as today: runtime `EnvironmentData` / host detection — not a rebuild per QA.

**Q: Kernel bump?**  
> Publish version → host/remotes bump → **their** artifacts rebuild once → promote. Don’t hot-patch kernel on S3.

**Q: Feature not ready but merged?**  
> Flag off / hide nav. `main` stays green.

**Q: CloudFront vs hash?**  
> Test/S3 used hash so refresh hits host. Prod CloudFront can rewrite to `index.html`; artifacts still SHA folders under `mfe/`.

---

## Related

| File | Use |
|---|---|
| [ONETRUST_HM_ROUND.md](./ONETRUST_HM_ROUND.md) | **30-min hiring manager** (after R3) |
| [ONETRUST_ANGULAR_FRONTEND_PREP.md](./ONETRUST_ANGULAR_FRONTEND_PREP.md) | Round structure / Angular study |
| [../micro-frontends/13_MFE_DEMO_UNDERSTANDING.md](../micro-frontends/13_MFE_DEMO_UNDERSTANDING.md) | Same words on the small demo |
| [../micro-frontends/06_HOW_I_IMPLEMENTED_MFE_SPOKEN.md](../micro-frontends/06_HOW_I_IMPLEMENTED_MFE_SPOKEN.md) | 90s spoken (align with §0 here) |
