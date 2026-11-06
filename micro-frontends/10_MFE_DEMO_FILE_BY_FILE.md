# MFE demo — file-by-file study path

**Goal:** Open these files **in order** while the app runs, so host / remote / shared auth click in your head.

**Demo folder:** [`../mfe-angular-demo/`](../mfe-angular-demo/)  
**Run first:** `cd mfe-angular-demo && npm i && npm run start:all` → http://localhost:4200  
**Login:** `admin` / `admin` (also try `viewer` / `viewer`)

Paths below are relative to `mfe-angular-demo/`.

---

## Before any file (2 min in the browser)

1. Login as admin.
2. Change **Region** in the header.
3. Open **Safety**, then **Fleet** — notice same user + same region.
4. Logout → login as viewer → open **Fleet admin** → blocked.

Keep DevTools → **Network** open; filter `remoteEntry` when you click Safety/Fleet.

---

## Step 1 — Who is the host?

| # | Open this file | What to understand |
|---|---|---|
| 1 | `projects/shell/src/main.ts` | Host boots federation **first**, then Angular (`initFederation` → `bootstrap`). |
| 2 | `projects/shell/public/federation.manifest.json` | Name → remote URL map (`mfe-safety` → `:4201`, `mfe-fleet` → `:4202`). |
| 3 | `projects/shell/federation.config.mjs` | This app is the **host** (no `exposes`). `shared` = singleton Angular. |
| 4 | `projects/shell/src/app/app.html` | Shell chrome: nav, region, user, logout. Remotes render in `<router-outlet>`. |
| 5 | `projects/shell/src/app/app.ts` | Shell calls `AuthService` + `SessionContextService` (sets region). |

**Checkpoint:** “Shell owns UI chrome + discovers remotes via manifest.”

---

## Step 2 — How does the host load remotes?

| # | Open this file | What to understand |
|---|---|---|
| 6 | `projects/shell/src/app/app.routes.ts` | **Most important host file.** `loadRemoteModule('mfe-safety', './Routes')` + `authGuard`. |
| 7 | `projects/shell/src/app/pages/login.page.ts` | Login lives **only** in the shell. |
| 8 | `projects/shell/src/app/pages/home.page.ts` | Local host page (not a remote) — explains the map. |
| 9 | `projects/shell/src/app/app.config.ts` | Host registers router + `authInterceptor`. |

**Checkpoint:** “Composition = Angular routes + `loadRemoteModule`, not iframes.”

**In browser:** click Safety → Network should show request to `http://localhost:4201/remoteEntry.json`.

---

## Step 3 — What does a remote expose?

Do Safety first, then skim Fleet (same pattern).

| # | Open this file | What to understand |
|---|---|---|
| 10 | `projects/mfe-safety/federation.config.mjs` | `name: 'mfe-safety'` + `exposes: { './Routes': ... }`. |
| 11 | `projects/mfe-safety/src/app/remote.routes.ts` | Route tree the **host** actually imports. |
| 12 | `projects/mfe-safety/src/app/pages/safety-home.ts` | Remote UI — reads shared user + region; no login form. |
| 13 | `projects/mfe-safety/src/main.ts` | Remote also inits federation (serves its own `remoteEntry`). |
| 14 | `projects/mfe-fleet/federation.config.mjs` | Same idea, name `mfe-fleet`, port 4202. |
| 15 | `projects/mfe-fleet/src/app/remote.routes.ts` | Includes `admin` child + `adminGuard`. |
| 16 | `projects/mfe-fleet/src/app/pages/fleet-home.ts` | Second remote; same shared session. |
| 17 | `projects/mfe-fleet/src/app/pages/fleet-admin.ts` | Admin-only page (guarded). |

**Checkpoint:** “Remote exposes `./Routes`; host mounts them under `/safety` or `/fleet`.”

Optional: open `http://localhost:4201` alone — remote can run standalone for debugging; normally you use it **inside** the shell.

---

## Step 4 — How is auth / data shared?

| # | Open this file | What to understand |
|---|---|---|
| 18 | `projects/shared-auth/src/public-api.ts` | Public exports of the shared lib. |
| 19 | `projects/shared-auth/src/lib/auth.store.ts` | One tab-wide store on `globalThis` (user, token, region). |
| 20 | `projects/shared-auth/src/lib/auth.service.ts` | Login/logout; writes the shared store; signals for UI. |
| 21 | `projects/shared-auth/src/lib/session-context.service.ts` | Region filter — shell sets, remotes read. |
| 22 | `projects/shared-auth/src/lib/session-bus.ts` | `CustomEvent` so shell + remotes stay in sync live. |
| 23 | `projects/shared-auth/src/lib/auth.guard.ts` | `authGuard` / `adminGuard` — platform auth gates. |
| 24 | `projects/shared-auth/src/lib/auth.interceptor.ts` | Adds `Bearer` token (host HttpClient). |
| 25 | `tsconfig.json` (root of demo) | Path alias: `"shared-auth"` → library source. |

**Checkpoint:** “Shell logs in once; remotes import `shared-auth` and read the same session.”

---

## Step 5 — Glue / scripts (quick skim)

| # | Open this file | What to understand |
|---|---|---|
| 26 | `package.json` | `start:all` runs shell + both remotes. |
| 27 | `angular.json` | Three apps + ports (4200 / 4201 / 4202). |
| 28 | `README.md` | Architecture diagram + spoken answer. |

---

## One picture after the files

```text
main.ts (shell)
  → federation.manifest.json
  → app.routes.ts ──loadRemoteModule──► mfe-*/remoteEntry.json
                                            │
                                            ▼
                                      remote.routes.ts
                                            │
                                            ▼
                                      safety-home / fleet-home
                                            │
                     shared-auth (user + token + region) ◄──┘
```

---

## “Explain from files” (60s)

> Host `main.ts` loads the federation manifest. `app.routes.ts` lazy-loads Safety and Fleet with `loadRemoteModule`. Each remote’s `federation.config.mjs` exposes `./Routes`. Login and nav stay in the shell; `shared-auth` holds user and region so both remotes show the same session. That’s Native Federation — same Module Federation host/remote model.

---

## Suggested time

| Block | Time |
|---|---|
| Browser click-through | 5 min |
| Steps 1–2 (host) | 15 min |
| Step 3 (remotes) | 15 min |
| Step 4 (shared-auth) | 15 min |
| Re-explain out loud | 5 min |

If short on time: **only** files **2, 6, 10, 11, 19, 20**.
