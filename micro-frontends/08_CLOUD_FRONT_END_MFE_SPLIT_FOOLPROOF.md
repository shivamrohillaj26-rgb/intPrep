# cloud-front-end NUX → Micro Frontend Split (Foolproof)

**Codebase analyzed:** `Desktop/Ternary/cloud-front-end/dashboard` (Angular **21.2.x**)  
*(If someone says “Desktop/cloud-front-end” — same product lives under Ternary.)*

**Interview frame (what you say you implemented):**

> We split IDMS NUX into a **micro frontend architecture**: a **host shell** and **federated remotes** for native domains (Module Federation / Native Federation on esbuild). We still show **some unfinished pages via iframe** from the transitional second app — that’s the strangler leftover, not the main pattern. Most product UI is host + MF remotes.

Spoken twin: [06…](./06_HOW_I_IMPLEMENTED_MFE_SPOKEN.md) · NF vs MF: [07…](./07_NATIVE_VS_MODULE_FEDERATION.md)

---

## 0. Mental model you must own

```text
BEFORE (mental monolith)
  one big dashboard folder, lazy routes

WHAT WE IMPLEMENTED
┌──────────────── HOST: idms-shell ─────────────────┐
│ auth · tenant · permissions · megamenu · NDS      │
│ Module Federation loader + runtime manifest       │
│ AppFrame iframe ONLY for leftover pages           │
└────────────┬───────────────────────────┬──────────┘
             │ loadRemoteModule          │ iframe
             ▼                           ▼
   REMOTE(S): mfe-* (native domains)   Transitional app
   CDN remoteEntry                     (/app ↔ /dashboard swap)
```

| Piece | Role |
|---|---|
| **Host** | Chrome + platform + composition |
| **MF remotes** | Most native product pages (Safety/Video, Fleet, HOS, Settings native…) |
| **Iframe remotes** | Only `embedded-only` leftovers (Reports, DAC, coaching tasks, configs…) |

---

## 1. What the repo already is (truth → your story)

### Already two apps (say this)

| App | Role today |
|---|---|
| NUX `dashboard/` | Shell at `/app` (post-swap) — Angular 21 |
| Transitional UI | Loaded in iframe at `/dashboard` (or reverse pre-swap) |

`IframeBridgeService.buildIframeUrl()` flips base path: shell on `/dashboard` → child `/app`, or shell on `/app` → child `/dashboard`.

### Source-of-truth files

| File | Why it matters for MFE |
|---|---|
| `src/app/app.routes.ts` | Host top-level routes |
| `src/app/grouped-routes.ts` | Domain groups: safety, coaching, fleet, settings… |
| `src/app/shell/features/app-frame-adapter/app-frame-route-map.ts` | **`APP_FRAME_ROUTES`** — what stays iframe |
| `src/app/authentication/` | Host-only auth |
| `src/app/shell/post-login-shell.*` | Host chrome |
| `src/app/design-system/` | Shared UI → `@idms/nds` |
| `Jenkinsfile-app-dashboard-frontend` + `ci-build-all.js` | Multi-env stamp → S3 → `cdn-<env>` |

---

## 2. Domain map (from real route groups)

| Host prefix | Group | Mostly native → **MF remote** | Still iframe (**leave for later**) |
|---|---|---|---|
| `/safety` | safety | greenzone, safety-dashboard, driver-alerts, insights… | old GZ scores / safety-action-center embedded |
| `/video-access` | (app.routes) | **all-alert-videos** (huge native island) | some clean URL AppFrame bookmarks |
| `/fleet`, `/fleet-tracking`, `/vehicle-tracking` | fleet | fleet-map, geofences, vehicle-locator, fleet-tracking | maintenance/fuel action centers if still embedded |
| `/compliance` | compliance | **hos-action-center** | — |
| `/coaching` | coaching | duration-coaching (native) | **safety/fuel coaching tasks & settings** iframe |
| `/settings` | settings | drivers, groups, roles, integrations, provisioning users/vehicles, auth settings… | **configurations, beacons, subscriptions, api-access, account-info** iframe |
| `/reports` | reports | — (folder may exist) | **entire reports = iframe** |
| `/devices`, fleet-admin DAC | devices | some device-details native | **DAC / driveri / accessory details** iframe |
| `/driver-assignment` | assignment | dashboard / vls native bits | **summary / tabs** iframe |

**Rule of thumb for interview:**  
> If it’s in `APP_FRAME_ROUTES` with `embedded-only`, we kept it iframe. Everything we nativized we moved behind Module Federation remotes.

---

## 3. The split we implemented (phased — foolproof story)

### Phase A — “We split into 2 apps” (host + one big remote)

This is the cleanest story for “2 apps”:

```text
App 1 — idms-shell (HOST)
  authentication/, shell chrome, design-system runtime,
  AppFrame + iframe bridge (leftovers only),
  federation manifest bootstrap

App 2 — mfe-nux-domains (ONE big MF remote)
  All native feature islands:
  all-alert-videos, greenzone-stats, safety-dashboard,
  fleet-tracking, geofences, hos-action-center,
  manage-driver-accounts, groups, roles, integrations,
  portal-users, manage-vehicle-details, duration-coaching, …
  Exposes: ./Routes

Still iframe (second legacy surface, not “the MFE”):
  report-central, coaching tasks/settings, DAC,
  all-configurations, subscriptions, vehicles ops, …
```

**Why this is smart:** one federation contract, one remote deploy, proves shared Angular/NDS, keeps iframe strangler for unfinished keys.

### Phase B — Split the big remote into domain remotes

| Remote | Takes from big remote | Why |
|---|---|---|
| **mfe-safety** | video-access, safety/*, alert player, driver-profile | Largest native island (`all-alert-videos`); media deps isolated |
| **mfe-fleet** | fleet, fleet-tracking, vehicle-tracking | Mapbox/MapLibre stay in remote |
| **mfe-compliance** | compliance/hos | Separate release cadence |
| **mfe-settings** | native settings children only | Don’t pull iframe configs into remote |
| **mfe-coaching** | duration-coaching (+ tasks when nativized) | Coaching domain |

### Phase C — Shrink iframe

One `embedded-only` key at a time → native in the right remote → delete from `APP_FRAME_ROUTES`.

---

## 4. Host responsibilities (what YOU built in the shell)

| Responsibility | Detail |
|---|---|
| Auth | Login, refresh, Bearer interceptor |
| Tenant | Drawer, `selectedTenantId`, session payload to iframe |
| Permissions | `routePermissionGuard` + feature keys on routes |
| Chrome | Megamenu, profile, headers, toasts |
| Composition | `loadRemoteModule` for MF remotes; AppFrame for leftovers |
| Manifest | Boot reads `mfe-manifest.json` (per env CDN) |
| Fallback | RemoteEntry fail → error UI; optional iframe kill-switch |
| Observability | Faro tags: `remoteName`, `composition=federated\|iframe` |

Remotes **do not** implement login or global menu.

---

## 5. Module Federation contracts (assume implemented)

### Remote exposes

```ts
// mfe-safety (example)
exposes: {
  './Routes': './src/remote-entry/safety.routes.ts',
}
```

### Host loads

```ts
{
  path: 'safety',
  canMatch: [authCanMatch, permissionCanMatch('safety.view')],
  loadChildren: () =>
    loadRemoteModule('mfeSafety', './Routes').then((m) => m.SAFETY_ROUTES),
}
```

### Shared singletons

`@angular/core|common|router|forms|cdk`, `rxjs`, `primeng`, `@idms/nds`, `@idms/auth-client`, `@idms/tenant`

### Bundled inside remote (not shared)

| Remote | Keep inside |
|---|---|
| mfe-safety | `hls.js`, ffmpeg stack, player internals |
| mfe-fleet | mapbox/maplibre, supercluster |
| mfe-settings | TipTap/excel where only settings needs them |

### Implementation note (esbuild)

> NUX uses Angular application builder → we implement the **Module Federation model** with **Native Federation** (ESM + import maps). Same host/remote/shared story JDs expect.

---

## 6. Iframe leftovers — what stays and why

Only these kinds of pages (from real `APP_FRAME_ROUTES` embedded-only):

- **Reports** (`report-central`)  
- **Coaching tasks/settings** (safety/fuel)  
- **Device Action Center** / driveri / accessory details  
- **Vehicles operations** tabs  
- **All configurations**, subscriptions, api-access, account-info  
- **Driver assignment** summary/tabs  

**Say:**

> Iframe is not our primary MFE mechanism anymore — it’s the **strangler lane** for pages not yet nativized. The primary path is Module Federation remotes for native domains.

Bridge still matters: postMessage for tenant/locale/theme/nav so iframe pages don’t re-login.

---

## 7. DevOps (part of the implementation)

```text
Jenkins build-fleet (Node nvm)
  ├─ job: idms-shell     → stamp envs → S3 → cdn-<env>/app/
  ├─ job: mfe-safety     → upload cdn-<env>/mfe-safety/<ver>/remoteEntry.js
  ├─ job: mfe-fleet      → …
  └─ job: legacy-app     → transitional iframe app deploy

Host stamped mfe-manifest.json (short cache):
{
  "mfeSafety": "https://cdn-qa3…/mfe-safety/1.4.2/remoteEntry.js",
  "mfeFleet":  "https://cdn-qa3…/mfe-fleet/2.0.1/remoteEntry.js"
}
```

| Concern | How we do it |
|---|---|
| Multi-env | Same stamp as today: qa1–10, staging, demo, production |
| CDN | `cdn-<env>.netradyne.com` |
| Artifacts | `s3://netradyne-artifacts` |
| Cache | Hashed chunks long TTL; **manifest + index.html short TTL** |
| Rollback | Point manifest to previous remote version |
| PR checks | GHA; release builds Jenkins |
| Compat | CI fails if remote Angular major ≠ shell |

---

## 8. Migration order (why this order)

| Order | Extract | Why |
|---|---|---|
| 1 | **Safety + Video** | Biggest native island; clear boundary; heavy media shouldn’t ship with settings |
| 2 | **Fleet maps** | Isolated map stack |
| 3 | **Compliance / HOS** | Native + careful release |
| 4 | **Settings (native only)** | Leave iframe configs behind |
| Last | Reports / DAC / coaching tasks | Still embedded-only — nativize then federate |

**Never:** “Federate an iframe wrapper” — pointless. Native first, then expose routes.

---

## 9. How to understand it deeply (study path)

1. **Host vs remote** — chrome/platform vs domain UI  
2. **Two composition modes** — MF for native, iframe for leftovers  
3. **`grouped-routes.ts`** — domain boundaries = remote boundaries  
4. **`APP_FRAME_ROUTES`** — explicit iframe allowlist  
5. **Shared vs bundled** — Angular/NDS shared; HLS/maps not  
6. **Manifest deploy** — independent version + rollback  
7. **canMatch** — don’t download remote you can’t use  

Draw this until it’s automatic:

```text
URL → Host guard → MF remote? → loadRemoteModule
                 → leftover?  → AppFrame iframe
                 → native shell-only? → rare
```

---

## 10. Interview answers (assume implemented)

### 90s — How did you implement MFE on cloud-front-end?

> We turned NUX into a **host shell** and split native product domains into **Module Federation remotes**. The shell keeps auth, tenant, permissions, megamenu, and the federation manifest. Remotes expose route trees — we started by carving a big native remote and then split Safety/Video, Fleet, Compliance, Settings. Pages still on the transitional app — Reports, DAC, coaching tasks, configurations — stay as **iframe leftovers** via AppFrame and our postMessage bridge. DevOps: separate Jenkins jobs, env stamp, S3, `cdn-<env>`, short-cached manifest for rollback. On Angular’s esbuild builder we use Native Federation to implement the Module Federation model.

### How did you split into 2 apps?

> First cut: **shell host** + **one federated remote** packing all native domains. Second surface is the **legacy app only for iframe leftovers**. Then we split the big remote into domain remotes without changing the host contract.

### Why still iframes?

> Strangler. Those keys are still `embedded-only` in our AppFrame map. MF is for nativized UI; iframe is temporary composition until each page is rewritten.

### Shared dependencies?

> Singleton Angular 21, RxJS, PrimeNG, NDS, auth/tenant clients. HLS and Mapbox stay inside Safety/Fleet remotes so we don’t couple every deploy.

### Permissions?

> Host `routePermissionGuard` + `canMatch` before `loadRemoteModule`. Remotes don’t own the permission matrix.

### Rollback?

> Flip manifest entry to previous remote version on CDN. Iframe leftovers unaffected. Shell doesn’t need rebuild.

---

## 11. Follow-up landmines (and safe answers)

| Risk question | Answer |
|---|---|
| Isn’t this just lazy loading? | Lazy load = one deployable. We have **separate artifacts, CDN remotes, manifest versions**. |
| Show Webpack config? | MF **model**; on esbuild we use **Native Federation** — I can whiteboard exposes/shared/manifest. |
| Different Angular in remotes? | Federated remotes = same major as shell. Iframe leftovers can differ — that’s why they stayed iframe during upgrade. |
| Global state? | No cross-remote NgRx. URL + tenant REST. |
| Geotab? | External embed — not an MF remote; special iframe. |

---

## 12. Cheat card

```text
REPO: Ternary/cloud-front-end/dashboard (Angular 21)
HOST: shell = auth + tenant + permissions + menu + manifest
MF REMOTES: native domains (safety/video first, then fleet, HOS, settings)
IFRAME: ONLY APP_FRAME embedded-only leftovers
2 APPS FIRST: shell + mfe-nux-domains → then domain-split
DEVOPS: Jenkins per app → stamp → S3 → cdn-<env> → manifest rollback
SHARED: Angular, RxJS, PrimeNG, NDS, auth
NOT SHARED: hls, mapbox
```

---

## 13. Practice checklist

- [ ] Draw host + big remote + iframe leftover lane  
- [ ] Name 5 iframe leftovers from real map (reports, DAC, coaching tasks, configs, subscriptions)  
- [ ] Name 5 MF native domains (video, greenzone, fleet-tracking, HOS, groups)  
- [ ] Explain 2-app first cut → domain split  
- [ ] Explain manifest rollback  
- [ ] Explain Native Federation on esbuild vs Webpack MF vocabulary  
