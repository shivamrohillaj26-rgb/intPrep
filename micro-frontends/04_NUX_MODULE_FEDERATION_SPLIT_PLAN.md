# IDMS NUX → Module Federation Split Plan (Interview Deep Dive)

**How to frame in interview (1finity / Fujitsu-style JD):**

> This is the **Module Federation architecture we’re planning** to evolve IDMS NUX from today’s shell + lazy features (+ iframe strangler for unfinished `/app` pages) into **independently deployable remotes**. I’ll walk host/remote boundaries, shared deps, routing, auth, CI/CDN, and rollout phases.

**JD keywords this plan covers:** Angular 15+, TypeScript, Micro Frontend + **Module Federation**, reusable component library (NDS), RxJS, REST, CI/CD, cloud/CDN.  
*(IDMS today is RxJS/signals-heavy, not NgRx — say that honestly; NgRx would only be considered for a small shell-level facade if needed.)*

Companions: [INDEX](./INDEX.md) · [01 overview](./01_MICRO_FRONTENDS_OVERVIEW.md) · [02 deep](./02_MICRO_FRONTENDS_DEEP_NUX_BREAKUP.md) · [03 story](./03_MFE_INTERVIEW_STORY_NUX_IDMS.md) · [20 CDN](../frontend-system-design/20_CDN.md)

---

## 1. Goal of the plan

| Goal | Meaning for IDMS |
|---|---|
| Independent deploy | Safety/video squad ships without rebuilding Devices/HOS |
| One UX | Single shell: auth, tenant, megamenu, permissions |
| Safe strangler | Keep iframe `/app` until a domain is fully native+federated |
| Platform contract | One Angular + NDS version policy |
| Rollback | Point shell manifest at previous remote build |

**Non-goals (phase 1):** multi-framework remotes, SSR MFE, sharing every utility.

---

## 2. Target topology (draw this)

```text
                    ┌─────────────────────────────────────────┐
                    │         HOST: idms-shell (NUX)          │
                    │  auth · tenant · permissions · megamenu │
                    │  design-system runtime · Faro · router  │
                    └─────┬───────┬───────┬───────┬─────┬─────┘
                          │       │       │       │     │
              loadRemote  │       │       │       │     │
                          ▼       ▼       ▼       ▼     ▼
                   mfe-safety mfe-devices mfe-coaching mfe-fleet mfe-compliance
                   (+ mfe-reports, mfe-settings later)

Each remote → own CI → CDN:
  https://cdn-<env>.netradyne.com/mfe-safety/<version>/remoteEntry.js
```

**Shell owns forever:** login, token refresh, interceptor, tenant drawer, route permission map, global chrome, federation manifest bootstrap, iframe fallback route.

---

## 3. Domain → remote mapping (concrete)

| Remote name | Route prefix | Moves from today’s `shell/features` (examples) | Team-shaped reason |
|---|---|---|---|
| **mfe-safety** | `/safety/**`, video deep links | `all-alert-videos`, `alert-player-*`, `driver-alerts`, `safety-dashboard`, live-streaming | Heavy media; distinct cadence |
| **mfe-devices** | `/devices/**`, DAC | `device-action-center`, `driveri-*`, `accessory-*`, RMA portal surfaces | Devices/RMA ownership |
| **mfe-coaching** | `/coaching/**`, greenzone | `greenzone-stats`, coaching-*, driver-communications | Scoring/coaching domain |
| **mfe-fleet** | `/fleet/**`, maps | `fleet-map`, `fleet-tracking`, `vehicle-locator`, geofences, vehicle details | Maps stack isolation |
| **mfe-compliance** | `/compliance/**` | `hos-action-center`, compliance | Regulated release care |
| **mfe-reports** | `/reports/**` | report-central | Lower cadence |
| **mfe-settings** | `/settings/**` | roles, portal-users, configurations, notifications | Admin |

**Phase-1 cut (only 3 deployables + shell):**

1. `idms-shell` (host) — everything else still in shell monolith  
2. Extract **`mfe-safety`** first (or **`mfe-devices`** if that’s your ownership — pick one and stick to it)  
3. Extract second remote  
4. Rest stays in shell until proven  

---

## 4. Module Federation — how connection works (plan detail)

### 4.1 Build-time contracts

**Remote exposes**

```js
// conceptual — Webpack Module Federation (JD vocabulary)
new ModuleFederationPlugin({
  name: 'mfeSafety',
  filename: 'remoteEntry.js',
  exposes: {
    './Routes': './src/app/remote-entry/safety.routes.ts',
    // optional widget for shell deep-link
    './AlertPlayer': './src/app/alert-player/alert-player.component.ts',
  },
  shared: {
    '@angular/core': { singleton: true, strictVersion: true, requiredVersion: '^21.0.0' },
    '@angular/common': { singleton: true, strictVersion: true, requiredVersion: '^21.0.0' },
    '@angular/router': { singleton: true, strictVersion: true, requiredVersion: '^21.0.0' },
    '@angular/forms': { singleton: true, strictVersion: true, requiredVersion: '^21.0.0' },
    rxjs: { singleton: true, strictVersion: true, requiredVersion: '~7.8.0' },
    '@angular/cdk': { singleton: true, requiredVersion: '^21.0.0' },
    primeng: { singleton: true, requiredVersion: '^21.0.0' },
    '@idms/nds': { singleton: true, requiredVersion: '^1.0.0' },
    '@idms/auth-client': { singleton: true, requiredVersion: '^1.0.0' },
  },
});
```

**Host remotes**

```js
new ModuleFederationPlugin({
  name: 'idmsShell',
  remotes: {
    // prefer RUNTIME manifest over hardcoding in prod
    // mfeSafety: 'mfeSafety@https://cdn.../remoteEntry.js',
  },
  shared: { /* same singleton contract as remotes */ },
});
```

**Runtime manifest (planned)**

```json
{
  "mfeSafety": "https://cdn-qa3.netradyne.com/mfe-safety/1.4.2/remoteEntry.js",
  "mfeDevices": "https://cdn-qa3.netradyne.com/mfe-devices/2.1.0/remoteEntry.js"
}
```

Shell boots → fetch manifest (short cache) → register remotes → navigate.

### 4.2 Angular 21 / esbuild note (say this — looks senior)

> NUX already uses Angular’s **application builder (esbuild)**. Classic Webpack `ModuleFederationPlugin` implies a Webpack build. In the plan we keep the **Module Federation mental model** (host, remote, expose, shared, remoteEntry). Implementation options: (A) Native Federation on esbuild — same API family via `@angular-architects/native-federation`, or (B) Webpack MF if the platform standardizes on Webpack. For a Fujitsu JD saying “Module Federation,” I describe the **MF contracts**; I’d choose Native Federation on our current builder unless the org mandates Webpack.

Host route (same either way):

```ts
{
  path: 'safety',
  canMatch: [authCanMatch, permissionCanMatch('safety.view')],
  loadChildren: () =>
    loadRemoteModule({
      type: 'manifest',
      remoteName: 'mfeSafety',
      exposedModule: './Routes',
    }).then((m) => m.SAFETY_ROUTES),
}
```

### 4.3 Runtime sequence (memorize)

```text
1. User hits shell → shell JS + shared Angular load
2. Auth + tenant + permissions resolve
3. User opens #/safety/alerts
4. canMatch passes → loadRemoteModule('mfeSafety', './Routes')
5. Fetch remoteEntry from CDN (manifest URL)
6. Federation runtime reuses host Angular singleton
7. SAFETY_ROUTES register → component in shell <router-outlet>
8. Remote HttpClient uses shared auth interceptor / auth-client
```

---

## 5. Platform packages (extract BEFORE first remote)

| Package | Contents | Why first |
|---|---|---|
| `@idms/nds` | Design system (from `design-system/` + Storybook) | Visual contract |
| `@idms/auth-client` | token access, refresh helpers, interceptor factory | No duplicate login |
| `@idms/tenant` | selectedTenantId, URL builders `/tenants/{id}` | Every API |
| `@idms/permissions` | permission keys, guard helpers | Menu + CanMatch |
| `@idms/i18n-core` | locale plumbing | Shell + remotes |
| `@idms/telemetry` | Faro wrappers | Consistent RUM |

**Rule:** Remotes depend on these as **singletons**; they do not copy-paste auth.

---

## 6. Auth / tenant / permissions in the federated world

```text
Shell EnvironmentInjector
  ├── AuthService + HTTP interceptor (Bearer)
  ├── TenantContext
  └── PermissionsService
          ▲
          │ shared singleton modules
Remotes inject same instances — one session, one tenant
```

| Concern | Plan |
|---|---|
| Login UI | Shell only |
| 401 refresh | Shell interceptor; remotes don’t implement parallel refresh |
| Permission | `canMatch` on host route **before** downloading remote |
| Tenant switch | Shell updates TenantContext → remotes react (signals/observables); optional soft reset of remote outlet |
| Deep link email | Shell boots → auth → load remote → child route |

---

## 7. Communication plan

| Priority | Mechanism | Example |
|---|---|---|
| 1 | URL | `#/safety/player/123?tenant=…` |
| 2 | REST | Coaching reads driver from API, not Safety memory |
| 3 | Shell facade | `ShellCommands.openAlertPlayer(id)` |
| 4 | Tiny event bus | toast / nav badge only |
| ❌ | Shared global NgRx across remotes | Distributed monolith — avoid |

**NgRx (JD asks):**  
> Our IDMS NUX path is RxJS + signals, not a global NgRx store. In an MFE plan I’d keep feature state **local to the remote**. If the shell needs a tiny facade, a shell-only store is enough — I wouldn’t put one NgRx store across all remotes.

---

## 8. Routing plan

- Shell: hash location (current NUX), owns prefixes `/safety`, `/devices`, …  
- Remote: only child routes  
- Cross-remote nav: `Router.navigate` on shared Angular  
- Legacy: `path: 'legacy/:feature'` → AppFrame iframe until federated  

```text
#/safety/alerts        → mfe-safety
#/devices/dac          → mfe-devices
#/compliance/hos       → mfe-compliance OR iframe /app until ready
```

---

## 9. Shared vs bundled deps (decision table)

| Dependency | Strategy |
|---|---|
| `@angular/*`, `rxjs` | **shared singleton** |
| `primeng`, CDK, `@idms/nds` | **shared singleton** |
| `@idms/auth-client`, tenant, permissions | **shared singleton** |
| `hls.js`, player internals | **bundle in mfe-safety** |
| Mapbox/MapLibre heavy stack | **bundle in mfe-fleet** (or shared if 2+ remotes need it) |
| Highcharts | share only if multiple remotes; else bundle |

---

## 10. CI / CDN / rollback plan

```text
Pipeline mfe-safety:
  lint → test → build (federation) → upload
  s3://…/mfe-safety/<gitSha>/
  update manifest key mfeSafety → that URL (per env)

Pipeline shell:
  build shell → upload
  shell reads manifest at runtime (or bake env-specific manifest)

Rollback:
  revert manifest pointer to previous gitSha (no shell rebuild required)
```

Cache: hashed chunks long TTL; **manifest short TTL** / no-cache ([20_CDN.md](../frontend-system-design/20_CDN.md)).

Envs: `cdn-qa3`, `cdn-production`, … same stamp story as today.

---

## 11. Failure isolation plan

| Failure | UX |
|---|---|
| remoteEntry 404 / timeout | Shell `FeatureFallbackHost` + retry; rest of app works |
| Remote runtime error | Error boundary around outlet; report remoteName+version |
| Permission denied | Never download remote (`canMatch`) |
| Partial outage | Optional temporary iframe fallback to `/app` parity page |

---

## 12. Rollout phases (timeline story)

### Phase 0 — Today (baseline)

- Monolith NUX lazy features  
- Iframe strangler for unfinished `/app`  
- Independent shell vs `/app` deploy already exists  

### Phase 1 — Platform (2–4 sprints)

- Extract `@idms/nds`, `@idms/auth-client`, `@idms/tenant`, `@idms/permissions`  
- Version catalog + CI peer checks  
- No user-facing behavior change  

### Phase 2 — Federation spike (1–2 sprints)

- Shell + **one** dummy remote “Hello MFE” on Native Federation or Webpack MF  
- Prove singleton Angular, manifest load, CanMatch, fallback  
- Perf budget: shell TTI not regressed  

### Phase 3 — First real remote

- Extract **mfe-safety** *or* **mfe-devices**  
- Shell `loadChildren` → remote  
- Keep iframe route as kill-switch for 1–2 releases  

### Phase 4 — Second remote + playbook

- Codify “how to add a remote” doc for other squads  
- Shared NDS semver policy  

### Phase 5 — Shrink iframe

- Each migrated page removes AppFrame map entry  
- Retire `/app` for that domain  

### Phase 6 — Optimize

- Prefetch remotes on menu hover (optional)  
- Bundle analyzer per remote  
- Contract tests on `./Routes` exports  

---

## 13. Reusable component library (JD: “component libraries”)

| Layer | Plan |
|---|---|
| **NDS** | Already Storybook-based; publish as `@idms/nds` consumed by shell + all remotes |
| **Rules** | Remotes must not fork buttons/tables; contribute to NDS |
| **Versioning** | Semver; remotes declare supported range; shell pins |
| **PrimeNG** | Themed once in shell; remotes use NDS wrappers over PrimeNG where possible |

---

## 14. Testing plan

| Test | Owner |
|---|---|
| Unit | Per remote |
| Contract | `exposes ./Routes` shape + permission keys |
| Shell integration | Mock remoteEntry in CI |
| E2E smoke | Shell + one real remote per env |
| Visual | NDS Storybook |
| Compatibility job | Matrix: shell N vs remote N-1 (supported) |

---

## 15. Risks & mitigations

| Risk | Mitigation |
|---|---|
| Shared dep hell | Catalog + CI + few singletons |
| Version skew Angular | One major only; iframe until upgrade done |
| Larger operational surface | Start with 1 remote |
| UX seams | NDS + shell chrome only |
| Security | Remotes only from our CDN; CSP; no third-party remoteEntry |
| Perf | Don’t share niche libs; prefetch carefully |

---

## 16. What we keep from today’s iframe (bridge lessons)

The plan **reuses** lessons already learned:

| Iframe today | Federation tomorrow |
|---|---|
| postMessage tenant/locale/theme | shared TenantContext / i18n / theme tokens |
| URL ownership in shell | same |
| Dual deploy shell vs `/app` | shell vs each remote |
| Isolation of Angular majors | temporary; federation needs one major |

---

## 17. Spoken answers for this JD

### 60s — “How would you implement MFE with Module Federation for your dashboard?”

> I’d keep NUX as the **host**: auth, tenant, permissions, megamenu. I’d split remotes by domain — Safety, Devices, Coaching, Fleet, Compliance — starting with one vertical. Each remote **exposes routes** via Module Federation’s remoteEntry, published to our env CDN; the shell loads them with `loadRemoteModule` behind `canMatch` so we don’t download unauthorized code. Angular, RxJS, PrimeNG, and our NDS library are **shared singletons**; player and map stacks stay inside their remotes. Feature communication is URL + tenant-scoped REST, not a global store. We’d extract platform packages first, spike federation, ship one remote with iframe kill-switch, then expand. On Angular’s esbuild builder I’d implement the MF model with Native Federation unless the org standardizes on Webpack.

### 30s — “How are host and remote connected?”

> Build-time: remote exposes modules and emits remoteEntry; host doesn’t compile that code. Runtime: shell fetches remoteEntry from CDN using a manifest, federation shares one Angular runtime, host mounts exposed routes in its router outlet. Auth/tenant come from shared platform packages provided by the shell.

### 20s — “Why not split everything at once?”

> Operational risk. One remote proves shared deps, CI, rollback, and UX. Big-bang federation is how teams get stuck for months.

---

## 18. Whiteboard checklist (interview)

- [ ] Shell + 3 remotes + CDN remoteEntry  
- [ ] Shared: Angular / RxJS / NDS  
- [ ] Bundled: hls / maps  
- [ ] Manifest + rollback  
- [ ] canMatch before load  
- [ ] Phases 0→5  
- [ ] Iframe as interim kill-switch  
- [ ] NDS as component library  

---

## 19. Cheat card

```text
PLAN: Module Federation (mental model) on IDMS NUX
HOST: shell = auth + tenant + permissions + menu
REMOTE: safety | devices | coaching | fleet | compliance
EXPOSE: ./Routes (+ optional widgets)
SHARED: Angular, RxJS, PrimeNG, @idms/nds, auth/tenant
CDN: remoteEntry per env; manifest short-cache
START: platform packages → spike → 1 remote → expand
BRIDGE: iframe remains until domain fully migrated
JD: say MF contracts; Native Federation if esbuild
```

---

## Related

| Doc | Use |
|---|---|
| [02…](./02_MICRO_FRONTENDS_DEEP_NUX_BREAKUP.md) | Broader deep theory |
| [03…](./03_MFE_INTERVIEW_STORY_NUX_IDMS.md) | How to speak about current iframe + plan |
| [01…](./01_MICRO_FRONTENDS_OVERVIEW.md) | Short MFE overview |
| [05 three-team scenario](./05_MODULE_FEDERATION_THREE_TEAMS_SCENARIO.md) | Shared deps / 3-team Q |
