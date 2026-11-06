# Running MFE demo walkthrough (interview)

**Code:** [`../mfe-angular-demo/`](../mfe-angular-demo/) — Angular 21 + Native Federation (Module Federation model).

Run: `cd mfe-angular-demo && npm i && npm run start:all` → http://localhost:4200  
Login: `admin/admin` or `viewer/viewer`

---

## Mental model (memorize)

| Term | In this demo |
|---|---|
| **Host / shell** | `shell` :4200 |
| **Remote** | `mfe-safety` :4201, `mfe-fleet` :4202 |
| **remoteEntry** | JSON catalog each remote serves |
| **Manifest** | Host map of name → remoteEntry URL |
| **exposes** | What remotes publish (`./Routes`) |
| **shared** | Singleton Angular (+ shared session for auth) |
| **Composition** | Host `loadRemoteModule` in router |

---

## Flow when you open /safety

1. Shell already bootstrapped; `initFederation` read `federation.manifest.json`.
2. Router hits `/safety` → `authGuard` checks shared session.
3. `loadRemoteModule('mfe-safety', './Routes')` fetches `http://localhost:4201/remoteEntry.json`.
4. Runtime downloads the exposed routes chunk (+ reuses shared Angular).
5. `SafetyHome` renders **inside** shell’s `<router-outlet>` — same page, same tab, no iframe.
6. Component reads `AuthService` / `SessionContextService` → same user + region as header.

---

## How data is shared (say in levels)

1. **Auth token** — created in shell login; interceptor would send Bearer on HTTP.
2. **Shared session store** — `globalThis.__MFE_DEMO_SESSION__` + `shared-auth` services.
3. **Shell chrome state** — region dropdown updates both remotes’ filtered lists.
4. **Domain data** — each remote owns its fake alerts/vehicles (in real apps: own APIs).

**Do not say:** “We pass props from shell into remotes like React children.”  
**Do say:** “Shell owns platform concerns; remotes import shared libs and call APIs with the shared token.”

---

## Auth story (real-app parallel)

| Real NUX / IDMS | This demo |
|---|---|
| OAuth in shell | Fake login form |
| Bearer interceptor | `authInterceptor` registered on host |
| Permission / canMatch | `authGuard` + `adminGuard` |
| Tenant context | `user.tenantId` on shared user |
| Iframe leftovers | *Not in this demo* — federation only |

---

## 45s spoken (after hands-on)

> I have a local Angular federation demo: shell host plus Safety and Fleet remotes. The host authenticates, holds the nav and a region filter, and lazy-loads remote route trees from their remoteEntry URLs via a manifest. Shared Angular is a singleton. User and region live in a shared-auth session so both remotes show the same login without their own auth UI. That’s the same Module Federation host/remote pattern we’d use to split a large dashboard.

---

## Drill questions

1. Why expose `./Routes` instead of the whole `App` component?  
   → Host already has layout/router; remote contributes **feature routes** only.

2. Why singleton shared Angular?  
   → One injector/runtime; avoid duplicate framework and broken DI.

3. Can remotes deploy alone?  
   → Yes; update manifest/CDN URL; host may stay unchanged.

4. Where does logout live?  
   → Shell clears shared session; next remote navigation sees logged-out state.

5. Viewer vs admin?  
   → Same login path; `adminGuard` blocks `/fleet/admin` for viewer.
