# HLD — Netradyne IDMS (from your `Desktop/Ternary` code)

**Use this in Provenir round 2** when they say: *“Walk me through the HLD of a project you built / own.”*

Local folders (name is “Ternary”; product is **Netradyne IDMS**):

| Path | What it is |
|---|---|
| `Ternary/cloud` | Java backends + legacy AngularJS `console` |
| `Ternary/cloud-front-end-app` | Shipped Angular **19** customer SPA at `/app` |
| `Ternary/cloud-front-end` | **NUX 2.0** monorepo — Angular **21** `dashboard/` at `/dashboard` |

**Do not say “Ternary product” in interview** — say **Netradyne IDMS / fleet safety console**.

Related generic script: [08_PROJECT_HLD_WALKTHROUGH.md](./08_PROJECT_HLD_WALKTHROUGH.md) · **DevOps / Jenkins / S3:** [18_NETRADYNE_DEVOPS_CI_CD.md](./18_NETRADYNE_DEVOPS_CI_CD.md) · Provenir Q bank: [PROVENIR_SOFTWARE_ENGINEER_INTERVIEW_PREP.md](../scenario-based-questions/PROVENIR_SOFTWARE_ENGINEER_INTERVIEW_PREP.md) · **Micro frontends / split NUX:** [../micro-frontends/INDEX.md](../micro-frontends/INDEX.md)

---

## 0. 60-second opener (memorize)

> I work on **Netradyne IDMS** — a multi-tenant fleet safety web console used by fleet managers for alerts/video, coaching, GreenZone scores, maps/tracking, HOS/compliance, devices, and reports.  
> We’re mid **strangler migration**: legacy AngularJS `/console` → Angular 19 `/app` → Angular 21 NUX 2.0 `/dashboard`.  
> My focus is the modern Angular shell: lazy feature routes, OAuth + permission guards, tenant-scoped REST, design system, and performance on large lists (virtual scroll).  
> Stack: Angular standalone, PrimeNG + our NDS design system, RxJS/signals (no NgRx on this product), Java `restserver`/`authserver` behind a Node hosting proxy, S3 static deploys.

---

## 1. System HLD (draw this)

```text
┌──────────────────────── Browser (hash routing) ─────────────────────────┐
│  /console (AngularJS legacy)                                            │
│  /app      (Angular 19 — cloud-front-end-app)                           │
│  /dashboard(Angular 21 NUX 2.0 — cloud-front-end/dashboard)             │
│       └── unfinished routes → AppFrameRouteHost iframe → /app           │
└───────────────────────────────┬─────────────────────────────────────────┘
                                │ OAuth Bearer + refresh (HTTP interceptor)
                                ▼
┌──────────────── Node FE hosting / proxy (multi-env) ────────────────────┐
│  Serves static SPAs; proxies /restserver, auth, maps, etc.              │
└───────────────────────────────┬─────────────────────────────────────────┘
                                ▼
┌──────────────┐  ┌─────────────────────┐  ┌──────────────────────────────┐
│ authserver   │  │ restserver          │  │ map / video / other services │
│ login/tokens │  │ /api/v1/tenants/{id}│  │                              │
└──────────────┘  └─────────────────────┘  └──────────────────────────────┘
                                │
                    Multi-tenant fleet data (tenantId scoped)
```

**Say:**

> Three FE surfaces share one backend platform. We don’t big-bang rewrite — NUX 2.0 dashboard owns the shell and migrates features natively; anything not ready yet is **embedded via iframe** (`AppFrameRouteHost`) so customers keep one product experience.

---

## 2. Frontend app HLD (NUX 2.0 — lead with this)

```text
dashboard/ (Angular 21, standalone)
├── authentication/     OAuth interceptor, authGuard, routePermissionGuard, tenant storage
├── shell/              megamenu, tenant drawer, post-login shell
│   └── features/       safety, greenzone, alerts/video, fleet map, DAC, HOS, coaching, …
├── design-system/      NDS components (+ Storybook lineage)
├── shared/             tenant API URL builders, pipes, icons
├── i18n/
└── config/             route grouping (safety / coaching / fleet / settings / reports)
```

**Control plane (interview gold):**

1. **Auth** — login → tokens → interceptor attaches Bearer; refresh on 401  
2. **Tenant** — user picks tenant; `selectedTenantId` scopes every API (`/tenants/{id}/…`)  
3. **Permission** — `routePermissionGuard` + feature keys gate menu and deep links (not just “is logged in”)  
4. **Lazy routes** — `loadComponent` per feature; custom route reuse where tabs matter  
5. **Hybrid** — native feature OR `AppFrameRouteHost` → `/app` for parity  

---

## 3. One feature deep-dive (pick ONE in interview)

### Option A — Large list / virtual scroll (ties to resume 8s→&lt;2s)

**What Ternary / IDMS dashboard actually uses:**

| Piece | Detail |
|---|---|
| Library | Angular **CDK** `@angular/cdk/scrolling` |
| APIs | `cdk-virtual-scroll-viewport`, `*cdkVirtualFor`, fixed `itemSize` |
| Also | PrimeNG `[virtualScroll]` + `virtualScrollItemSize` on large selects (often when options &gt; 50) |
| Surfaces | Greenzone driver panel; All-alerts filter dialog (drivers/vehicles); transfer-vehicles picker; DAC report-issue pickers |
| Row height | Fixed px synced with CSS (filters ~`32`, greenzone/transfer ~`56`) |
| Identity | `trackBy` on entity **id** so recycled DOM doesn’t show wrong row/checkbox |
| Real bug | CDK reuses checkbox DOM — native click can desync from Angular checked state; we `preventDefault` and drive selection from the model |

```text
FeaturePage (container)
  Filters (signals / form state)
  Virtualized list (CDK / PrimeNG virtual scroll)
  Row → detail drawer / route
FeatureApiService  →  GET /restserver/api/v1/tenants/{id}/...
```

**Talking points (60s):**

> In IDMS, fleets have thousands of drivers and vehicles. On Greenzone and the All-alerts filters we don’t put the full list in the DOM. We use Angular CDK virtual scroll — viewport + fixed itemSize + `*cdkVirtualFor` — so only the visible window and a small buffer are real nodes. We trackBy entity id because rows are reused, and we hit a real checkbox-reuse bug where native toggle fought Angular state. For PrimeNG dropdowns with big option lists we enable their virtualScroll past ~50 items. That pattern, plus not rendering everything up front, is how heavy list paths went from multi-second freezes to feeling interactive under ~2s.

**Short:**

> Ops users scan thousands of drivers/devices/alerts. Rendering 10k DOM nodes kills TTI. We virtualize with CDK (and PrimeNG on selects), fixed row height, trackBy id, and careful selection when DOM is reused — that’s the 8s→&lt;2s story.

### Option B — Alert / video workflow

```text
All Alert Videos / Alert Player
  Filters dialog (virtualized driver/vehicle pickers)
  Results grid
  Player (HLS) + async download jobs
```

**Talking points:**

> Heavy media UX — don’t block the main thread; async request/download status; filter lists themselves are virtualized because fleets have thousands of vehicles.

### Option C — Multi-tenant switch

```text
Tenant drawer → select tenant
  → update auth storage context
  → invalidate/re-scope in-flight feature state
  → redirect detail pages that don’t belong to new tenant
  → all subsequent HTTP uses new tenantId in URL/header
```

**Talking points (Provenir cares about multi-tenant):**

> Tenant id is first-class. FE resets scoped state on switch so Tenant A data never paints under Tenant B. Security still enforced on API — UI hiding is not enough.

---

## 4. API & contracts

- **Style:** REST (not GraphQL)  
- **Shape (typical):** `{ data, success, message? }`  
- **Scoping:** almost all domain calls under `/restserver/api/v1/tenants/{tenantId}/…`  
- **FE seam:** typed **tenant API URL builders** + per-feature `*-api.ts` services  
- **Mapping:** normalize backend DTOs → view-models in the service layer (especially during migration when shapes drift)

Example verbal contract:

```http
GET /restserver/api/v1/tenants/{tenantId}/devices?cursor=…&limit=50
→ { success: true, data: { items: Device[], nextCursor: "…" } }
```

Auth:

```http
Authorization: Bearer <access_token>
```

---

## 5. State management (why no NgRx here)

| Kind | Where |
|---|---|
| Auth / tenant / permissions | root auth services + storage |
| Feature server state | injectable `*-api` services (RxJS streams / signals) |
| Local UI | component signals (filters, drawers, selection) |

**Say:**

> On IDMS we keep **domain-isolated feature services** + signals — no global NgRx. Cross-cutting piece is auth/tenant/permissions. At TCS Employee Portal I *did* use NgRx because many modules shared payroll/timesheet workflows. Rule: store when many features share complex client workflows; otherwise thinner services.

---

## 6. Migration HLD (expect follow-up)

```text
Wave N:
  1. Implement native feature under shell/features/*
  2. Wire permission + menu featureKey
  3. Keep AppFrame fallback until parity (visual/API — Leica/Playwright)
  4. Flip route to native; iframe path retired
  5. Rollback = route back to iframe / flag — not a full redeploy rewrite
```

**Say:**

> Zero-downtime means customers never lose a workflow. Hybrid iframe is intentional technical debt with a burn-down plan — not permanent architecture.

---

## 7. Perf / security / quality (name 3+ each)

**Perf**

1. Lazy `loadComponent` routes  
2. CDK/PrimeNG virtual scroll on big lists  
3. `trackBy` / identity for rows  
4. On-demand / paged APIs (don’t pull universe)  
5. Defer heavy charts/maps/video until route opens  

**Security**

1. OAuth interceptor + refresh  
2. Route + permission guards  
3. Tenant-scoped APIs (server enforces)  
4. Don’t trust UI-only role hiding  

**Quality / delivery**

1. Multi-env builds (qa1–qa10 / staging / prod) → S3  
2. Runtime env via injected config (not hard-coded origins)  
3. Parity tooling (Playwright / Leica-style visual+API) during migration  
4. Observability (RUM/analytics — Faro/Mixpanel in stack)

---

## 8. Tradeoffs (always give one)

> **Hybrid iframe vs rewrite:** iframe keeps ship velocity and bookmark parity, but costs double navigation/auth edge cases and UX seams. We accept that temporarily because big-bang rewrite of reports/coaching would freeze product for months.  
> **No NgRx:** faster feature isolation; risk is god-services in huge domains (e.g. alert videos) — we split when files become ownership bottlenecks.  
> **Hash routing:** historical hosting/OAuth callback constraints; works with our proxy model, slightly uglier URLs.

---

## 9. Provenir mapping (why this HLD fits their JD)

| Provenir cares about | Your IDMS answer |
|---|---|
| Enterprise Angular | Angular 19→21, standalone, design system |
| Multi-tenant | Tenant drawer + tenant-scoped REST + reset on switch |
| Scalable UI | Virtual scroll, lazy features, NDS |
| API integration | REST + interceptors + URL builders |
| Architecture partnership | Strangler migration, permission control plane |
| Cloud/CI awareness | Jenkins multi-env, S3, GitHub Actions guardrails |

---

## 10. Spoken 8-minute script (practice out loud)

1. **Product** — IDMS fleet safety, who uses it (30s)  
2. **Boxes** — browser surfaces → proxy → auth/rest → tenant data (90s)  
3. **FE control plane** — auth → tenant → permissions → lazy features (90s)  
4. **Deep dive** — one list or video feature + virtual scroll (2 min)  
5. **Migration** — strangler + iframe hybrid (60s)  
6. **Perf + security + tradeoff** (90s)  
7. **What I’d improve next** — finish burning iframe debt / split god services / stronger tenant-switch store reset tests (30s)

---

## 11. Likely follow-ups (short answers)

| Question | Direction |
|---|---|
| Why not micro-frontends? | Same org/stack; hybrid iframe is enough during migration; federation cost not justified yet |
| How does tenant switch avoid data leaks? | Clear scoped caches/subjects; re-fetch; redirect orphan detail routes; API still authorizes |
| Graphs/maps heavy? | Lazy route + load Mapbox/Highcharts only in that feature chunk |
| Testing? | Unit on API mappers; Playwright critical paths; visual parity during migrate |
| Biggest bug? | Prepare one: race on search/filter, or virtual scroll checkbox reuse, or OAuth hash callback — pick a real one you own |

---

## 12. Optional 2-min TCS contrast (if they ask “another project”)

> At TCS I owned broker / employee / recruitment portals — Angular + reactive forms + **RBAC** + **NgRx** for shared HR workflows, bundle cuts via lazy routes (~20%). Different shape: classic enterprise portals vs Netradyne’s ops/video/maps scale. Same principles: shell, lazy features, auth guards, measure perf.

---

## Cheat card (print / glance before call)

```text
IDMS = multi-tenant fleet safety SPA
Surfaces: AJS console → Angular /app → Angular /dashboard (NUX 2.0)
Control: OAuth + tenant + permission guards
Data: REST tenant-scoped, feature *-api services, signals (no NgRx)
Perf: virtual scroll + lazy routes + on-demand fetch
Migrate: strangler + AppFrame iframe hybrid
Tradeoff: iframe debt vs rewrite risk
Provenir: same enterprise multi-tenant Angular DNA
```
