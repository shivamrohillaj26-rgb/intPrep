# NUX IDMS Micro Frontend — Interview Story Playbook (Deep)

**Purpose:** Walk an interviewer through IDMS “micro frontend” work in rich detail **without inventing a Webpack Module Federation production system that isn’t in the repo.**

| Reality in `Ternary` | Resume risk |
|---|---|
| NUX = **one Angular SPA** + **iframe composition** of transitional `/app` + typed **postMessage** bridge | Bullet says **“Webpack Module Federation”** — deep digs will ask for `remoteEntry`, shared config, independent CDN remotes. If you never shipped that, **change the resume**. |

Related: [INDEX.md](./INDEX.md) · deep design [02](./02_MICRO_FRONTENDS_DEEP_NUX_BREAKUP.md) · MF plan [04](./04_NUX_MODULE_FEDERATION_SPLIT_PLAN.md)

---

## 0. Critical advice (read before any interview)

### Do this

1. **Own what you built:** host/shell, route ownership, iframe remotes, context protocol, independent deploy of `/dashboard` vs `/app`, design-system reuse, strangler migration.  
2. Call that **micro frontend patterns / runtime composition / soft MFE** — accurate.  
3. If asked “Webpack Module Federation?” →  
   > Production composition today is **iframe-based remotes** with a shell host. Federation (Module Federation mental model / Native Federation on esbuild) is the **next hardening step** I designed for when more squads need in-DOM remotes. On Angular’s application builder I’d use **Native Federation**, not force Webpack-only MF.

### Don’t do this

- Don’t invent `ModuleFederationPlugin` configs you never merged.  
- Don’t claim independent `remoteEntry.js` per domain on CDN if that isn’t live.  
- Don’t say “we share Angular as a federation singleton” for iframe (iframes have **separate** JS heaps — that’s the point).

**Senior signal:** knowing *why* iframe vs federation, and having a migration path, beats a fake MF story that collapses on the third follow-up.

---

## 1. Resume wording (fix the bullet)

**Risky (current style):**  
> Implemented micro frontend patterns using Webpack Module Federation…

**Safer & still strong:**  
> Implemented **micro frontend composition** for the IDMS NUX dashboard: Angular **shell host** owns auth, tenant, permissions, and navigation; transitional feature surfaces load as **independently deployed remotes** via **iframe + typed postMessage bridge**, enabling **zero-downtime strangler migration** from AngularJS/`/app` while teams ship shell and legacy app on **separate release trains**. Designed the path to **Native Federation** for in-DOM remotes as domains fully migrate.

Skills line: prefer **Micro frontends, Module Federation (concepts), Native Federation (planned/Angular esbuild), Nx/monorepo tooling** — don’t list Webpack MF as a shipped tool unless true.

---

## 2. The story frame (STAR) — memorize this spine

### Situation

> IDMS is a multi-tenant fleet console for 500K+ devices. We were mid-migration: AngularJS console → Angular `/app` → NUX `/dashboard`. A big-bang rewrite would risk downtime. Multiple domains (safety/video, devices/RMA, greenzone, HOS) couldn’t all wait on one monolithic NUX completion.

### Task

> Give customers **one product shell** (NUX) while unfinished pages stay on the older app; allow **independent deploys**; keep auth/tenant/theme/locale consistent; don’t freeze UI when a remote page is heavy.

### Action (what you “implemented” — real patterns)

1. **Shell / host** — NUX post-login shell, megamenu, tenant drawer, permission-gated routes.  
2. **Remote surfaces** — transitional pages as `/app` (and sometimes console framing) loaded in **AppFrame**.  
3. **Composition contract** — iframe bridge protocol (tenant, auth session context, locale, theme, navigation sync).  
4. **Strangler routing** — shell owns URL; maps feature → native component **or** iframe remote.  
5. **Performance on native lists** — virtual scroll / trackBy on heavy device & filter lists (8s→&lt;2s story — separate but same platform).  
6. **Design system** — NDS/Storybook so shell and future remotes share UI language.  
7. **Architecture next step** — domain split + Native Federation design for when remotes should share one Angular runtime.

### Result

> Migrated 20+ views with **zero downtime**; customers stay on one chrome; shell and `/app` can deploy independently; unfinished domains don’t block NUX rollout; we have a clear federation end-state once domains are native.

---

## 3. 2–3 minute spoken narrative (practice aloud)

> At Netradyne IDMS we don’t treat the dashboard as one forever-monolith. The NUX Angular shell is the **host**: it owns OAuth, Bearer interceptor, tenant selection, permission guards, and the megamenu. Feature domains that are fully on NUX load as lazy routes inside that shell — Greenzone, alert filters, device flows I’ve worked on with virtual scroll for 10k-row performance.  
>  
> Domains still on the transitional Angular app are composed as **remotes** using an **iframe micro frontend pattern**. The shell’s AppFrame loads `/app` (or the sibling path after URL swap) and we sync context over a **typed postMessage protocol** — tenant changes, locale, theme, and navigation — so the child doesn’t re-login and we don’t full-reload the iframe on every parent context tweak. Parent URL stays the source of truth for deep links; the child mirrors route changes carefully so we don’t re-bootstrap loops.  
>  
> That gave us **independent deployment**: NUX shell and the transitional app ship on different trains, which is the core MFE win, while iframe isolation let Angular versions differ during migration — important when shell moved toward Angular 21 and `/app` was on 19.  
>  
> For the long term I designed breaking native NUX by **domain remotes** — Safety/video, Devices/DAC, Coaching, Fleet maps, Compliance/HOS — with the shell still owning platform concerns. On the application builder that means **Native Federation** (ESM + import maps), same Module Federation mental model, shared Angular/RxJS/NDS singletons, remotes on CDN with a short-cached manifest. We’d extract platform packages first, federate one vertical like Safety, keep iframe as fallback, then retire `/app` for that domain.  
>  
> So when I say micro frontends on IDMS, I mean a **real host/remote composition system in production via shell + iframe remotes**, plus a concrete federation plan for in-DOM remotes — not a single SPA pretend-split.

---

## 4. Deep dive — every aspect (how to answer follow-ups)

### 4.1 Host responsibilities (shell)

| Concern | What you say you own |
|---|---|
| Auth | Login, token storage strategy, refresh, HTTP interceptor |
| Tenant | `selectedTenantId`, drawer, scopes all `/tenants/{id}/…` calls |
| AuthZ | `routePermissionGuard` + menu filtering (FE UX; API still enforces) |
| Layout | Megamenu, profile, feature header, router outlet / AppFrame outlet |
| Routing strategy | Hash routing; shell owns top-level feature prefixes |
| Observability | Faro/RUM on shell; tag feature + iframe vs native |
| Fallback | Feature fallback host if remote fails |

### 4.2 Remote responsibilities (`/app` today → domain MFE later)

| Today (iframe remote) | Later (federated remote) |
|---|---|
| Full Angular app boot inside iframe | Exposes `./Routes` only |
| Own router under shell-mapped path | Child routes under host prefix |
| Separate Angular runtime | Shared singleton Angular |
| Talk via postMessage | Inject shared Auth/Tenant services |
| CSS isolated by iframe | Need NDS + prefix discipline |

### 4.3 How they are “connected” (draw this)

**Production today**

```text
┌──────────── NUX SHELL (host) ────────────┐
│  Auth · Tenant · Permissions · Menu      │
│  Router: /devices/rma → AppFrame         │
│         /greenzone    → native lazy      │
│                                          │
│   ┌──── iframe remote (/app) ────┐       │
│   │  Transitional Angular app    │       │
│   │  ← postMessage context →     │       │
│   └──────────────────────────────┘       │
└──────────────────────────────────────────┘
         │                         │
    deploy shell zip          deploy /app zip
         └──── CDN / env stamp ────┘
```

**Connection layers you must name**

1. **Load** — iframe `src` built by bridge (`/app` vs `/dashboard` base swap)  
2. **Context** — postMessage protocol (tenant, locale, theme, session hints)  
3. **Navigation** — parent URL ↔ child route sync (avoid reload loops)  
4. **Platform APIs** — both call same `restserver` / `authserver` with tenant scope  
5. **UX chrome** — only shell shows megamenu (child shouldn’t duplicate)

### 4.4 Iframe bridge — talk like you built it

Use real concepts from IDMS docs (names OK at high level):

| Topic | Detail to say |
|---|---|
| Why postMessage | Cross-document; can’t share Angular DI across iframe |
| Typed protocol | Versioned message kinds; not ad-hoc `window.parent` strings |
| Tenant change | Push to child **without** full iframe remount when possible |
| Locale / theme | Push so translations/theme don’t drift |
| Nav sync | Child route → parent URL update; guard against parent re-activating and resetting `src` |
| Cold vs warm | Remount when settings must refresh (e.g. setup wizard complete → permissions refresh) |
| Security | `targetOrigin` checks; only our origins; no `*` |

**Hard bug (credibility):**  
> Nested navigation used to re-bootstrap the iframe and re-ask session/settings. We fixed by separating **context push** from **src reload**, and being careful when mirroring child routes into the parent hash.

### 4.5 Independent deployment (MFE win)

| App | Pipeline story |
|---|---|
| NUX shell | Jenkins/CI → env stamp → `app-<env>.zip` / CDN |
| Transitional `/app` | Separate WAR/zip pipeline historically |
| Result | Ship shell UX without waiting for every legacy page rewrite |

### 4.6 Why iframe first (not federation on day one)

| Iframe advantage during migration | Cost |
|---|---|
| Different Angular majors (19 vs 21) | Heavier memory; two runtimes |
| Strong style/JS isolation | Harder seamless scroll/a11y |
| Fast strangler | postMessage complexity |
| Matches “zero downtime” | Dual URL swap complexity |

**Say:**  
> Federation needs one Angular singleton — painful mid-upgrade. Iframe let us migrate page-by-page safely.

### 4.7 Domain breakup plan (your “I designed the MFE system”)

Present as **architecture you own**, phases you can defend:

```text
Phase A — Platform packages
  @idms/auth-client, @idms/tenant, @idms/permissions, @idms/nds
  (still monolith or iframe)

Phase B — Shell is host; remotes by domain
  mfe-safety (alerts, player, streaming)
  mfe-devices (DAC, RMA, driveri, accessories)
  mfe-coaching (greenzone, coaching tasks)
  mfe-fleet (map, geofence, vehicles)
  mfe-compliance (HOS)
  mfe-reports / mfe-settings

Phase C — Native Federation
  Each remote exposes ./Routes
  federation.manifest.json → CDN URLs per env
  shared: Angular, RxJS, CDK, PrimeNG, NDS (singleton)
  bundle into remote: hls.js, heavy maps if exclusive

Phase D — Retire iframe per domain
  When remote is native + federated, remove AppFrame map entry
```

**First remote to extract:** Safety/video **or** Devices (RMA) — pick one you personally touched and say why (release cadence / blast radius).

### 4.8 Shared dependencies story (federation phase)

> Host provides Angular 21 + RxJS + PrimeNG + NDS as singletons. Remotes declare peer ranges; CI fails on major drift. Feature-only libs stay inside the remote so we don’t couple release trains. That’s the Module Federation **shared** mental model — on esbuild we’d implement it with **Native Federation** import maps.

### 4.9 Communication rules (sound senior)

1. URL for cross-feature intent  
2. Tenant-scoped REST for data  
3. Shell facade for “open alert player”  
4. postMessage / events only for chrome (toast, badge)  
5. No shared global NgRx across remotes (IDMS isn’t NgRx-heavy anyway)

### 4.10 Auth across remotes

**Iframe:** shell pushes session/tenant context; child uses it; don’t duplicate login UX.  
**Federation:** shared `AuthService` + interceptor in environment injector; remotes inject.  
**Always:** API enforces authZ; guards are UX.

### 4.11 Failure isolation

> If iframe remote fails to load, shell shows fallback host / error state; rest of megamenu works. Same idea later for `loadRemoteModule` failure — don’t white-screen IDMS.

### 4.12 Performance angle (tie resume)

> Virtual scroll + on-demand fetch on native NUX lists (device listing 8s→&lt;2s). Remotes that are iframes get isolation so a heavy legacy page doesn’t block shell chrome paint the same way a sync import would.

### 4.13 Design system

> NDS on Storybook is the visual contract. Shell already uses it; federated remotes must consume the same package version range so IDMS doesn’t look like five products.

### 4.14 Testing

| Layer | What you say |
|---|---|
| Bridge contract tests | Message schema / origin checks |
| Shell e2e | Native feature + one iframe feature smoke |
| Remote e2e | `/app` or future remote standalone |
| Visual | NDS Storybook / Percy-style |
| CI | Independent pipelines; shell contract job against manifest |

### 4.15 Observability

> Tag: `composition=iframe|native|federated`, `remote=mfe-devices`, `shellBuild`, `tenantId` (careful PII). Bridge errors counted separately from API 500s.

### 4.16 Security

> Strict `postMessage` origins; CSP; remotes only from our CDN; no loading third-party remoteEntry; tokens not in query strings into iframe src.

---

## 5. Whiteboard sequence (practice drawing)

```text
1) Three surfaces: console / app / dashboard
2) NUX shell box = HOST
3) AppFrame iframe = REMOTE (today)
4) Arrows: postMessage context, URL sync, REST APIs
5) Side note: virtual scroll inside native features
6) Future: replace iframe with Native Federation remotes on CDN
7) Shared: Angular/NDS; not shared: HLS/maps
```

---

## 6. Killer Q&A (with safe answers)

**Q: Show me your Module Federation config.**  
> Production composition is iframe remotes. I can draw the federation config we’d use with Native Federation for the next phase — exposes, shared singletons, manifest. We didn’t keep the whole estate on Webpack MF because NUX is on the Angular application builder / esbuild.

**Q: How do you share Angular across remotes today?**  
> We don’t — iframe means separate runtimes, which was intentional during the Angular 19→21 migration. Sharing Angular as a singleton is exactly what federation buys us once domains are native.

**Q: How do independent teams deploy?**  
> Shell zip and transitional app zip are separate artifacts; env stamp + CDN. A devices fix on `/app` doesn’t require rebuilding every NUX native feature.

**Q: Biggest bug you hit?**  
> Iframe nav sync causing full remounts / session re-fetch loops; fixed by protocol design (context push vs src reload). Checkbox reuse under CDK virtual scroll on native lists (separate hard bug).

**Q: Why not single-spa?**  
> We’re Angular-centered; shell already is Angular. Federation or iframe fits better than introducing another meta-router unless we go multi-framework.

**Q: Nx?**  
> Monorepo / workspace tooling for shared libs and consistent versions; MFE is about **runtime deploy boundaries**, not folders alone.

---

## 7. Cheat card — “I implemented MFE on IDMS”

```text
HOST  = NUX shell (auth, tenant, permissions, menu, router)
REMOTE= transitional /app in AppFrame (iframe) + future domain MFEs
CONNECT= postMessage protocol + URL sync + shared REST
DEPLOY = independent shell vs /app artifacts, CDN per env
PERF   = virtual scroll on native heavy lists
UI     = NDS Storybook contract
NEXT   = Native Federation domain remotes, retire iframe
DON'T  = invent Webpack remoteEntry production details
```

---

## 8. One-page “detail dump” if they say go deeper

Spend 60s each:

1. Host vs remote ownership table  
2. Bridge message categories (tenant / locale / theme / nav)  
3. URL swap (`/dashboard` shell ↔ `/app` child)  
4. Permission-gated menu + CanActivate  
5. Domain map for federation  
6. Shared vs bundled deps  
7. Manifest + rollback  
8. Failure fallback  
9. Migration phases  
10. What you’d do differently (start extracting `@idms/auth` earlier)

That’s enough depth to look like the owner of the architecture — **because for shell + bridge + strangler, you can be**.

---

## Related

- [02 deep NUX breakup](./02_MICRO_FRONTENDS_DEEP_NUX_BREAKUP.md) — federation topology  
- [04 MF split plan](./04_NUX_MODULE_FEDERATION_SPLIT_PLAN.md) — Module Federation plan  
- [01 overview](./01_MICRO_FRONTENDS_OVERVIEW.md) — short MFE theory  
- [16 IDMS HLD](../frontend-system-design/16_NETRADYNE_IDMS_PROJECT_HLD.md) — system HLD  
- [20 CDN](../frontend-system-design/20_CDN.md) — where remotes would live  
