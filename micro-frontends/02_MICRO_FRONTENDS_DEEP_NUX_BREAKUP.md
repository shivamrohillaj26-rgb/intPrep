# Micro Frontends — Deep Interview Guide + Breaking NUX IDMS Dashboard

**Use when:** “Explain micro frontends”, “How are remotes connected?”, “How would you split your dashboard into MFEs?”

**Product truth first:** Today Netradyne **NUX 2.0** (`Ternary/cloud-front-end/dashboard`) is a **single Angular 21 SPA**, not Module Federation. Coexistence with legacy `/app` is **iframe + postMessage strangler**. This guide teaches real MFE mechanics **and** a credible plan for *if* you were asked to break NUX into MFEs.

| Companion | Role |
|---|---|
| [INDEX.md](./INDEX.md) | Folder index |
| [01 overview](./01_MICRO_FRONTENDS_OVERVIEW.md) | Shorter overview |
| [05 three-team scenario](./05_MODULE_FEDERATION_THREE_TEAMS_SCENARIO.md) | Generic 3-team scenario |
| [03 interview story](./03_MFE_INTERVIEW_STORY_NUX_IDMS.md) | Spoken story + resume wording |
| [04 MF split plan](./04_NUX_MODULE_FEDERATION_SPLIT_PLAN.md) | Module Federation plan for NUX |
| [16 IDMS HLD](../frontend-system-design/16_NETRADYNE_IDMS_PROJECT_HLD.md) | Current IDMS HLD |
| [18 DevOps](../frontend-system-design/18_NETRADYNE_DEVOPS_CI_CD.md) | Deploy / CDN / envs |

**Say Netradyne IDMS / NUX dashboard — not “Ternary product.”**

---

## 0. Openers (memorize)

### 45s — What are micro frontends?

> Micro frontends split a large UI into **independently built and deployed** applications owned by different teams, composed at runtime into one product. A **host/shell** owns chrome, auth, and routing; **remotes** expose features (routes/widgets) that the shell lazy-loads — historically Webpack **Module Federation**, on modern Angular often **Native Federation** (ESM + import maps). Independence is about **release trains**, not about duplicating Angular twice. Platform deps are a shared contract; features talk through URL and APIs first.

### 30s — How is the host connected to a remote?

> At build time the remote **exposes** modules and publishes a **remote entry / manifest**. The host does not compile that feature code. At runtime, when the user hits a route, the host fetches the remote’s entry from its CDN URL, resolves **shared singletons** (one Angular), then dynamic-imports the exposed routes/component into the shell’s router outlet.

### 20s — What do we have today at IDMS?

> NUX is still one Angular 21 dashboard. Unfinished pages stay in the older `/app` Angular app and load inside an **iframe** with a typed postMessage bridge. That’s a strangler pattern — soft MFE isolation — not federation yet.

---

## 1. Current NUX architecture (baseline — be honest)

```text
Browser (hash routing)
├── /console     AngularJS legacy
├── /app         Angular 19 cloud-front-end-app (transitional)
└── /dashboard   Angular 21 NUX shell (cloud-front-end/dashboard)
       ├── authentication/   OAuth, guards, permissions, tenant
       ├── shell/            megamenu, tenant drawer, outlet
       │     └── features/*  greenzone, alerts, DAC, HOS, fleet-map, …
       ├── design-system/    NDS
       └── shared/           APIs, pipes, map helpers
              │
              └── AppFrameRouteHost → iframe → /app (parity pages)
```

| What exists | What does **not** |
|---|---|
| Lazy `loadComponent` features inside one repo | Webpack Module Federation remotes |
| Iframe bridge for legacy pages | Separate deployable MFE zips per feature team |
| Shared NDS + PrimeNG in one `package.json` | Per-remote `remoteEntry` on CDN |

**Interview integrity:** If they ask “do you use Module Federation today?” → **No. We use iframe strangler + lazy features in one SPA. Here’s how I’d evolve to federation if org scale required it.**

---

## 2. Why split NUX into MFEs (only if these are true)

MFEs are justified when **org + delivery** hurt more than **platform complexity**.

| Signal to split | IDMS-shaped example |
|---|---|
| Multiple squads blocked on one release train | Safety/video vs HOS/compliance vs Devices/DAC ship on different cadences |
| CI of whole dashboard is too slow | 70+ feature folders; one broken test blocks all |
| Need independent rollback | Video player regresses shouldn’t rollback Greenzone |
| Different criticality / on-call | Live streaming / HLS vs static reports |
| Strangler of huge remaining `/app` surface | Extract one domain remote at a time |

**Do NOT split because:** “MFE is trendy”, “we want more folders”, or “bundle is large” alone (lazy routes + CDN already help).

**Say:**

> I’d only introduce federation when independent deploy is a business requirement. Until then, domain libraries in a monorepo plus our iframe strangler give most benefits with less runtime risk.

---

## 3. How connection works (deep)

### 3.1 Mental model

```text
┌──────────────── HOST (NUX Shell) ─────────────────┐
│  Auth · Tenant · Permissions · Megamenu · Router  │
│                                                   │
│   /safety/*     → load remote "mfe-safety"        │
│   /compliance/* → load remote "mfe-hos"           │
│   /devices/*    → load remote "mfe-devices"       │
│   /reports/*    → load remote "mfe-reports"       │
└───────────────────────────┬───────────────────────┘
                            │ HTTPS fetch remoteEntry / import map
                            ▼
              CDN: cdn-*/mfe-safety/remoteEntry.*
              CDN: cdn-*/mfe-hos/...
```

### 3.2 Module Federation (classic Webpack story)

**Remote build**

1. App builds feature code  
2. Federation plugin marks **exposes** e.g. `./Routes`  
3. Emits **`remoteEntry.js`** — catalog of exposes + shared dependency metadata  

**Host build**

1. Declares remotes: name → URL (or runtime manifest)  
2. Routes use dynamic import / `loadRemoteModule` — **no static import** of remote source  
3. Host bundle does **not** contain remote feature JS  

**Runtime sequence (say this slowly)**

```text
1. User opens shell → shell JS + shared Angular load
2. Auth completes; tenant selected; permissions resolved
3. User navigates to #/safety/alerts
4. Shell matches route → triggers loadRemoteModule('mfe-safety', './Routes')
5. Browser fetches https://cdn…/mfe-safety/remoteEntry.js
6. Federation runtime:
     - registers exposed modules
     - ensures shared @angular/core is singleton (reuse host’s)
7. Shell gets Routes config / component
8. Router activates remote component in <router-outlet>
9. Remote’s HttpClient uses host-provided interceptors (if shared platform) OR own + shared auth token accessor
```

### 3.3 Native Federation (what you’d pick for Angular 21 + esbuild)

NUX already uses **`@angular/build:application`** (esbuild). Webpack-only MF fights that.

**Native Federation** (`@angular-architects/native-federation` pattern):

- Same **host / remote / shared / expose** vocabulary  
- Uses **ESM + import maps** instead of webpack runtime glue  
- Remotes publish a **manifest**; host maps bare imports  

```ts
// Host route — conceptual (Angular)
{
  path: 'safety',
  canActivate: [authGuard, routePermissionGuard],
  loadChildren: () =>
    loadRemoteModule('mfe-safety', './Routes').then((m) => m.SAFETY_ROUTES),
  data: { permissions: ['safety.view'] },
}
```

**Say:**

> For IDMS on Angular 21 application builder, I’d use Native Federation, not force a Webpack-only Module Federation setup — same architecture story in the interview.

### 3.4 “Connected” layers (interview gold)

Remotes are connected on **four layers**:

| Layer | Mechanism |
|---|---|
| **1. Load** | remoteEntry / import map URL on CDN |
| **2. Framework** | shared singleton Angular / RxJS / router |
| **3. Platform** | auth token, tenant id, permissions, design system |
| **4. Product** | URL + REST APIs (+ rare typed events) |

If you only explain (1), you sound junior. Cover all four.

---

## 4. Proposed breakup of NUX into MFEs

Split by **domain + team ownership**, aligned to existing `grouped-routes` / feature folders — not by random components.

### 4.1 Recommended topology

```text
┌──────────────────── mfe-shell (HOST) ────────────────────┐
│ authentication, post-login shell, megamenu, tenant drawer │
│ route permission map, global error UI, Faro bootstrap     │
│ design-system runtime (NDS + PrimeNG theme) as shared     │
└───────┬──────────┬──────────┬──────────┬──────────┬───────┘
        │          │          │          │          │
   mfe-safety  mfe-coaching  mfe-fleet  mfe-devices mfe-compliance
   alerts/video greenzone    map/geo    DAC/driveri HOS/logs
   player       coaching     vehicles   accessories reports?*
        │
   mfe-settings / mfe-reports / mfe-admin (smaller remotes or shell-owned)
```

| Remote | Owns (from today’s features) | Why a boundary |
|---|---|---|
| **mfe-shell** | `authentication/`, `shell/` chrome, nav, tenant drawer, AppFrame fallback | Platform; deploys rarely |
| **mfe-safety** | `all-alert-videos`, `alert-player-*`, `driver-alerts`, `safety-dashboard`, live-streaming pieces | Heavy media; distinct squad often |
| **mfe-coaching** | greenzone-stats, coaching-*, duration-coaching, driver-communications | Scoring / coaching domain |
| **mfe-fleet** | fleet-map, fleet-tracking, vehicle-locator, geofences, manage-vehicle-details | Maps + fleet ops |
| **mfe-devices** | device-action-center, driveri-*, accessory-*, beacons | Device ops / DAC |
| **mfe-compliance** | hos-action-center, compliance routes | Regulated; careful release |
| **mfe-reports** | report-central, report surfaces | Often lower cadence |
| **mfe-settings** | roles, portal-users, configurations, notifications | Admin; smaller |

Start with **2–3 remotes**, not 12. Example first cut:

1. Shell + everything else still monolith  
2. Extract **mfe-safety** (biggest independent value)  
3. Extract **mfe-compliance** or **mfe-devices** next  

### 4.2 What stays in the shell forever

- OAuth login / refresh / interceptor contract  
- `selectedTenantId` + tenant switcher  
- `routePermissionGuard` + menu filtering  
- Global layout, megamenu, profile menu  
- Cross-cutting telemetry bootstrap  
- **Fallback:** `AppFrameRouteHost` iframe to legacy until remote exists  

### 4.3 What each remote exposes

```text
mfe-safety exposes:
  ./Routes          → Routes[] for /safety/**
  ./AlertPlayer     → optional widget for deep-link shell route

mfe-devices exposes:
  ./Routes          → /devices/** , DAC routes
```

Host only knows **contracts**, not internal folders.

---

## 5. Shared dependencies (IDMS-specific tiers)

Today single `package.json` (Angular **21.x**, PrimeNG **21**, RxJS **7.8**, CDK, Mapbox/Highcharts, etc.).

| Tier | Packages | Federation rule |
|---|---|---|
| **Singleton required** | `@angular/core`, `common`, `router`, `platform-browser`, `forms`, `rxjs` | One copy or DI/hooks break |
| **Singleton preferred** | `@angular/cdk`, `primeng`, `@primeuix/themes`, NDS design-system package | Visual + a11y consistency |
| **Platform shared lib** | `@idms/auth-client`, `@idms/tenant-api`, `@idms/permissions`, `@idms/i18n` | Extract from `authentication/` + `shared/` |
| **Bundle into remote** | `hls.js` (safety), heavy map stacks if only fleet uses them, niche chart libs | Avoid forcing every remote to download |
| **Never casually share** | Different Angular majors across remotes | Hard no |

**Governance**

- Version catalog (Nx/pnpm catalog or platform `package.json`)  
- CI: fail if remote declares incompatible `@angular/core` major  
- NDS semver: remotes declare supported range; shell pins  

**Say:**

> Independence is at the feature layer. Angular and NDS are a platform contract — like a company-wide JDK version.

---

## 6. Auth, tenant, permissions across remotes

IDMS control plane today: Bearer interceptor, tenant-scoped REST `/tenants/{id}/…`, permission guards.

### Pattern A — Shell-owned platform (preferred)

```text
Shell
  AuthService (tokens) + interceptor provided in root EnvironmentInjector
  TenantContext signal/store
  PermissionsService
        │
        ▼ shared via singleton packages / shared federation modules
Remotes inject AuthService / TenantContext — same instances
```

Remote never implements its own login. Remote calls APIs with existing interceptor.

### Pattern B — Token handoff (weaker)

Shell passes access token into remote via init API — duplicates HttpClient stacks; easy to desync on refresh.

### Permissions

```ts
// host route still gates before download (CanMatch) when possible
{
  path: 'devices',
  canMatch: [permissionCanMatch('devices.view')],
  loadChildren: () => loadRemoteModule('mfe-devices', './Routes'),
}
```

**CanMatch before load** → don’t download a remote the user can’t use (see [ANGULAR_ROUTE_GUARDS.md](../angular-interview-prep/ANGULAR_ROUTE_GUARDS.md)).

Menu: shell builds megamenu from permission keys; remotes don’t own global nav.

---

## 7. Communication patterns (deep)

**Order of preference for IDMS:**

| Rank | Pattern | Example |
|---|---|---|
| 1 | **URL** | `#/safety/alerts?driverId=…` — refresh/shareable |
| 2 | **Tenant-scoped REST** | Coaching reads same driver as Safety via API |
| 3 | **Shell facade** | `ShellApi.openAlertPlayer(alertId)` contract |
| 4 | **Typed CustomEvent / tiny bus** | “show toast”, “badge count” only |
| 5 | **Shared global store across remotes** | Avoid — distributed monolith |

### Anti-pattern

```text
mfe-safety.eventBus.emit('ADD_TO_COACHING', driver)
mfe-coaching listens and mutates local state
```

Fragile, racey, invisible to backend. Prefer POST coaching API.

### Iframe bridge → federation migration lesson

Today iframe uses **postMessage protocol** (auth/tenant context into `/app`). That protocol is a preview of MFE contracts:

| Iframe today | Federation tomorrow |
|---|---|
| postMessage `TENANT_CHANGED` | shared `TenantContext` signal |
| postMessage navigate | shell router.navigate |
| Dual URL `/app`↔`/dashboard` | remote CDN URL per MFE |

**Say:** Our iframe bridge already taught us to pass **context, not duplicate login**. Federation would replace postMessage with shared platform injectables.

---

## 8. Routing & deep links

NUX uses **hash location** (`withHashLocation`) — keep one strategy across host+remotes.

```text
Host owns top-level path prefixes:
  /safety/**      → mfe-safety
  /coaching/**    → mfe-coaching
  /fleet/**       → mfe-fleet
  …

Remotes own child routes only:
  '' → AlertsList
  'player/:id' → AlertPlayer
```

**Rules**

- Remotes must not fight for `/`  
- Cross-remote navigation → `Router` from shared Angular (singleton), absolute commands  
- Deep links from emails → host boots → auth → load remote → child route  

---

## 9. Styling & design system

| Approach | For IDMS |
|---|---|
| Shared NDS package + PrimeNG theme singleton | **Required** |
| CSS Modules / unique prefixes per remote (`gz-`, `dac-`) | Reduce clashes |
| Avoid remotes shipping conflicting global CSS | Yes |
| iframe CSS isolation | Current benefit of iframe — lose this with in-DOM federation → need discipline |

---

## 10. Deployment & CDN

Mirror current stamp/CDN thinking ([20_CDN.md](../frontend-system-design/20_CDN.md), [18…](../frontend-system-design/18_NETRADYNE_DEVOPS_CI_CD.md)):

```text
CI per remote:
  build mfe-safety → upload
    s3://…/mfe-safety/<buildId>/
    + update manifest pointer latest → buildId
  CDN: cdn-<env>.netradyne.com/mfe-safety/remoteEntry.*

Shell deploy independent:
  shell reads runtime manifest:
  {
    "mfe-safety": "https://cdn-…/mfe-safety/3.4.1/remoteEntry.json",
    "mfe-devices": "https://cdn-…/mfe-devices/1.9.0/remoteEntry.json"
  }
```

| Concern | Answer |
|---|---|
| Rollback | Point manifest back to previous remote buildId |
| Compatibility | Remotes declare `compatibleShell` / shared peer ranges |
| Env stamp | Same multi-env story: qa3 vs production CDN hosts |
| Cache | Hashed remote chunks long-cache; manifest short-cache |

---

## 11. Failure isolation & observability

```text
loadRemoteModule fails
  → shell shows FeatureFallbackHost (you already have feature-fallback patterns)
  → optional iframe fallback to /app parity page
  → Faro/RUM tags remoteName + version
```

- One remote 500 on its CDN ≠ white-screen whole IDMS  
- Timeouts on remote load  
- Version in error reports  

---

## 12. Migration roadmap (credible STAR story)

```text
Phase 0 (today)
  Monolith NUX + iframe strangler to /app

Phase 1 — Platform packages
  Extract @idms/auth, @idms/nds, @idms/tenant-api as versioned libs
  (still one app)

Phase 2 — Shell/remote build split (still same deploy)
  Native Federation in monorepo; remotes built separately but co-released
  Prove shared Angular singleton

Phase 3 — Independent deploy
  mfe-safety ships on its own pipeline to CDN
  Shell manifest updated

Phase 4 — Shrink iframe surface
  Each parity page moved native into its remote; remove AppFrame routes

Phase 5 — Retire /app for that domain
```

**Say:**

> We wouldn’t big-bang federation. We’d extract platform contracts first, federate one vertical like Safety, keep iframe as fallback, then expand. That’s the same strangler mindset we already use between `/dashboard` and `/app`.

---

## 13. When NOT to use MFEs (say this — senior)

1. One team owns the whole dashboard  
2. Every feature must release lockstep  
3. No appetite for shared-dep governance  
4. You’re still stabilizing Angular upgrade / zoneless — don’t add federation complexity yet  
5. “We only wanted code splitting” → use `loadComponent`, not MFE  

---

## 14. Comparison table (interview)

| Approach | Independent deploy? | Isolation | Complexity | IDMS fit |
|---|---|---|---|---|
| Monolith + lazy routes | No | Low | Low | **Current NUX** |
| Monorepo libs | Optional | Low | Medium | Good interim |
| **Iframe strangler** | Yes (two apps) | High | Medium | **/app bridge today** |
| Web Components | Yes | Medium | Medium | Cross-framework later |
| **Native Federation** | Yes | Medium | High | Target if multi-squad |
| Webpack MF | Yes | Medium | High | Legacy estates |

---

## 15. Deep Q&A

**Q: How are two micro frontends connected?**  
> Load connection via remote entry URL; runtime connection via shared singleton framework; product connection via shell router and backend APIs; platform connection via shared auth/tenant services.

**Q: What if Angular versions diverge?**  
> They mostly can’t for in-DOM federation. Platform pins one major; remotes must comply. Iframe allows divergent versions — that’s why our strangler uses iframe today.

**Q: Shared state?**  
> Tenant + auth in shell. Feature state local to remote. Cross-domain data from API. No global NgRx across remotes (IDMS doesn’t use NgRx anyway).

**Q: SEO?**  
> IDMS is authenticated ops console — SPA federation is fine; SSR MFE is a different beast.

**Q: Testing?**  
> Contract tests for exposed `./Routes`; shell integration tests with mocked remotes; visual tests on NDS; per-remote unit/e2e in isolation.

**Q: Duplicate PrimeNG themes?**  
> Singleton theme + NDS; remotes don’t ship second theme.

**Q: How is this different from lazy loading?**  
> Lazy loading = split of **one** deployable. MFE = **multiple** deployables composed at runtime.

**Q: Security?**  
> Remotes from our CDN only; CSP; still API authZ; don’t load arbitrary third-party remotes without sandbox.

---

## 16. Full spoken walkthrough (2–3 min) — “Break NUX into MFEs”

> Today IDMS NUX is one Angular 21 shell with lazy feature folders and an iframe bridge into the older Angular app for unfinished pages. That’s already a strangler. If we needed true micro frontends, I’d keep the shell as host owning auth, tenant, permissions, and megamenu. I’d carve remotes by domain — Safety/video, Coaching/Greenzone, Fleet/maps, Devices/DAC, Compliance/HOS — starting with one vertical like Safety.  
>  
> On Angular’s application builder I’d use Native Federation: each remote exposes routes, publishes a remote entry to our env CDN, and the shell loadChildren’s it behind permission CanMatch so we don’t download what you can’t use. Angular, RxJS, PrimeNG, and NDS would be singleton shared deps under a version catalog; HLS and map stacks stay inside the remotes that need them.  
>  
> Remotes wouldn’t talk through a global event bus — they’d navigate via the shell router and share data through tenant-scoped REST, same as today. The iframe postMessage protocol we already have for tenant/auth context becomes shared injectables. Deployments would be independent per remote with a short-cached manifest; rollback is pointing the shell at the previous remote build. I’d only do this if multiple teams needed independent release trains — otherwise lazy routes plus the iframe strangler remain the simpler correct architecture.

---

## 17. Whiteboard checklist

- [ ] Draw shell + 3 remotes + CDN remoteEntry  
- [ ] Label shared Angular singleton  
- [ ] Show auth/tenant in shell  
- [ ] Show one route → loadRemoteModule  
- [ ] Contrast with **current** iframe `/app`  
- [ ] Say phased migration (don’t big-bang)  
- [ ] Say when you would **not** MFE  

---

## 18. Cheat card

```text
TODAY:  NUX monolith + iframe strangler (/app)
MFE:    host + remotes + remoteEntry + shared singletons
Angular 21: prefer Native Federation (esbuild)
Connect: CDN load | shared Angular | auth/tenant platform | URL+API
Split:  safety | coaching | fleet | devices | compliance
Start:  extract platform libs → one remote → shrink iframe
Avoid:  global store bus, multi Angular majors, MFE for vanity
```

---

## Related

| Doc | Use |
|---|---|
| [01 overview](./01_MICRO_FRONTENDS_OVERVIEW.md) | Shorter MFE overview |
| [05 three-team scenario](./05_MODULE_FEDERATION_THREE_TEAMS_SCENARIO.md) | Shared deps / deploy scenario |
| [16_NETRADYNE_IDMS…](../frontend-system-design/16_NETRADYNE_IDMS_PROJECT_HLD.md) | Current system HLD |
| [ANGULAR_ROUTE_GUARDS.md](../angular-interview-prep/ANGULAR_ROUTE_GUARDS.md) | CanMatch before remote load |
| [20_CDN.md](../frontend-system-design/20_CDN.md) | Hosting remoteEntry |
