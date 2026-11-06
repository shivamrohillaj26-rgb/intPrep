# Understand the MFE demo we built

**This guide explains the demo project itself** — what each piece is, how they talk, and what you should notice while clicking around.

| Demo | Path | Style |
|---|---|---|
| **Polyrepo (main for learning ownership)** | [`../mfe-separate-repos/`](../mfe-separate-repos/) | 4 independent packages |
| Monorepo twin | [`../mfe-angular-demo/`](../mfe-angular-demo/) | Same idea, one Angular workspace |

Architecture is the **same** in both. Polyrepo just makes “separate teams / separate installs” obvious.  
Paths below use **`mfe-separate-repos/`**.

**Run:** `cd mfe-separate-repos && ./scripts/start-all.sh` → http://localhost:4200  
**Login:** `admin` / `admin` or `viewer` / `viewer`

**Related:** file order [10](./10_MFE_DEMO_FILE_BY_FILE.md) · create for IDMS [12](./12_IDMS_MFE_CREATE_YOUR_OWN.md)

---

## 1. What you built (in one sentence)

A tiny **IDMS-like** system: one **shell (host)** that logs you in and loads **Safety** and **Fleet** feature apps at runtime (Native Federation), while **auth + region filter** come from a shared library every app installs.

```text
┌──────────────────────────────────────────────────────────────┐
│  BROWSER TAB                                                 │
│                                                              │
│  SHELL :4200                                                 │
│  ┌──────── header: nav · region · user · logout ──────────┐  │
│  │                                                        │  │
│  │  <router-outlet>                                       │  │
│  │     /login, /home     → code inside shell              │  │
│  │     /safety           → JS from mfe-safety :4201       │  │
│  │     /fleet            → JS from mfe-fleet  :4202       │  │
│  └────────────────────────────────────────────────────────┘  │
│                                                              │
│  shared-auth (npm package) → user, token, region             │
│  Angular shared as singleton (one copy for the whole tab)    │
└──────────────────────────────────────────────────────────────┘
```

---

## 2. The four packages (what each is for)

| Folder | Role | Has UI login? | Serves remoteEntry? |
|---|---|---|---|
| `shared-auth/` | Library: auth + session + guards | No | No — only `npm run build` → `dist/` |
| `shell/` | **Host** — chrome, routing, composition | **Yes** | Host also has federation runtime |
| `mfe-safety/` | **Remote** — Safety domain pages | No | **Yes** :4201 |
| `mfe-fleet/` | **Remote** — Fleet domain pages | No | **Yes** :4202 |

**Remember:**  
- **Library** = installed at **build** time (`npm`).  
- **Remote UI** = loaded at **runtime** (`remoteEntry` URL).  
Those are two different wires.

---

## 3. Story of one click: open Safety

Read this top to bottom once; then open the files.

### 3.1 Shell boots

**File:** `shell/src/main.ts`

1. `initFederation('federation.manifest.json')` runs **before** Angular.
2. Manifest is loaded from `shell/public/federation.manifest.json`.
3. Then `bootstrap.ts` starts the Angular app.

**Why before Angular?** Remotes must be registered before the router asks for them.

### 3.2 Manifest = phone book

**File:** `shell/public/federation.manifest.json`

```json
{
  "mfe-safety": "http://localhost:4201/remoteEntry.json",
  "mfe-fleet": "http://localhost:4202/remoteEntry.json"
}
```

| Key | Meaning |
|---|---|
| `"mfe-safety"` | Logical name (must match remote’s `name` in federation config) |
| URL | Where that remote’s catalog lives right now |

In prod this would be a CDN URL. Locally it’s another `ng serve`.

### 3.3 You are logged in (shell only)

**Files:**  
- `shell/src/app/pages/login.page.ts` — form  
- `shared-auth/.../auth.service.ts` — `login()` writes user + token  
- `shared-auth/.../auth.store.ts` — one store on `globalThis` for the tab  

Remotes never show a login screen. They only **read** that store.

### 3.4 Router hits `/safety`

**File:** `shell/src/app/app.routes.ts`

```ts
{
  path: 'safety',
  canActivate: [authGuard],
  loadChildren: () =>
    loadRemoteModule('mfe-safety', './Routes').then((m) => m.routes),
}
```

| Piece | Job |
|---|---|
| `authGuard` | Must be logged in (from `shared-auth`) |
| `loadRemoteModule('mfe-safety', './Routes')` | Fetch remote’s exposed routes |
| `m.routes` | Plug those routes under `/safety` |

### 3.5 What the remote published

**File:** `mfe-safety/federation.config.mjs`

```js
name: 'mfe-safety',
exposes: {
  './Routes': './src/app/remote.routes.ts',
},
```

**File:** `mfe-safety/src/app/remote.routes.ts` — the actual route table.  
**File:** `mfe-safety/src/app/pages/safety-home.ts` — UI that shows shared user + filtered alerts.

Browser Network tab: request to `http://localhost:4201/remoteEntry.json`, then JS chunks.  
The page still sits **inside the shell** layout (same header). **Not an iframe.**

---

## 4. How data is shared (the important part)

### 4.1 What is shared

| Data | Where set | Where read |
|---|---|---|
| User + token | Shell login → `AuthService` | Safety + Fleet pages |
| Region filter | Shell header dropdown → `SessionContextService` | Both remotes filter lists |
| Fake alerts / vehicles | Only inside each remote | Domain-owned data |

### 4.2 How the demo keeps one session

1. **Ideal MF way:** share `shared-auth` as a federation/npm singleton so one `AuthService` class exists.  
2. **Demo also uses:** `globalThis.__MFE_DEMO_SESSION__` + a small `session-bus` `CustomEvent` so even if two bundles load the service, they still see the **same** user/region live.

**Interview wording:**  
“Platform auth lives in a shared library; the host performs login; remotes consume the session. We don’t pass the user through iframe postMessage for federated pages.”

### 4.3 Prove it yourself

1. Login as admin.  
2. Open Safety — see “Alex Admin”.  
3. Change **Region** to `west`.  
4. Open Fleet — vehicles filtered to west.  
5. Logout → login as **viewer** → **Fleet admin** → blocked (`adminGuard`).

---

## 5. Auth pieces map

| File under `shared-auth/.../lib/` | Does |
|---|---|
| `auth.models.ts` | `AuthUser`, roles |
| `auth.store.ts` | Tab-wide session object |
| `auth.service.ts` | login / logout / signals |
| `session-context.service.ts` | region filter |
| `session-bus.ts` | sync event across bundles |
| `auth.guard.ts` | `authGuard`, `adminGuard` |
| `auth.interceptor.ts` | adds `Authorization: Bearer …` on shell HttpClient |

**Shell registers** the interceptor in `shell/src/app/app.config.ts`.  
That’s “platform HTTP auth in the host.”

---

## 6. Shell UI map

| File | Role |
|---|---|
| `shell/src/app/app.html` | Header nav, region select, user, logout + `<router-outlet>` |
| `shell/src/app/app.ts` | Wires auth + region change |
| `shell/src/app/pages/home.page.ts` | Local host page (not a remote) — learning map |
| `shell/src/app/pages/login.page.ts` | Only place you sign in |
| `shell/federation.config.mjs` | Host config — **no** `exposes`, has `shared` |

---

## 7. Remote UI map

| File | Role |
|---|---|
| `*/federation.config.mjs` | `name` + `exposes './Routes'` + shared Angular |
| `*/src/app/remote.routes.ts` | What the host imports |
| `mfe-safety/.../safety-home.ts` | Shows user + region-filtered alerts |
| `mfe-fleet/.../fleet-home.ts` | Shows user + region-filtered vehicles |
| `mfe-fleet/.../fleet-admin.ts` | Admin-only; guarded in remote routes |
| `*/src/main.ts` | Remote inits federation so it can **serve** `remoteEntry` |

You can open `http://localhost:4201` alone for debugging. Normal use is **through the shell**.

---

## 8. Two kinds of “sharing” (don’t mix them up)

```text
BUILD TIME                          RUNTIME
──────────                          ───────
npm install shared-auth             loadRemoteModule(...)
  ↓                                   ↓
TypeScript imports                  Download remote JS
AuthService, guards                 Safety / Fleet pages

federation shareAll(Angular)  →  one Angular runtime in the tab
```

| If you… | You get… |
|---|---|
| Forget to run Safety (`:4201`) | `/safety` fails — remote process missing |
| Forget `npm i` shared-auth after rebuild | Apps may use old auth package |
| Don’t share Angular as singleton | Duplicate frameworks / broken DI (classic MF bug) |

---

## 9. Polyrepo install flow (what `start-all.sh` does)

```text
1) cd shared-auth && npm run build
      → dist/shared-auth/   (fake “publish”)

2) each app: npm i ../shared-auth/dist/shared-auth
      → package.json: "shared-auth": "file:../..."

3) start 3 servers: 4201, 4202, 4200
```

So the demo teaches **both**:

- how apps depend on a **shared npm package**, and  
- how the host loads **remote UIs by URL**.

---

## 10. Native Federation vs “Module Federation” (for this demo)

We used **`@angular-architects/native-federation-v4`** (Angular 21 / esbuild).

Same ideas interviewers call Module Federation:

| Word | In this demo |
|---|---|
| Host | `shell` |
| Remote | `mfe-safety`, `mfe-fleet` |
| remoteEntry | `http://localhost:420x/remoteEntry.json` |
| exposes | `./Routes` |
| shared | Angular singleton via `shareAll` |

Details: [07_NATIVE_VS_MODULE_FEDERATION.md](./07_NATIVE_VS_MODULE_FEDERATION.md)

---

## 11. Monorepo vs this polyrepo demo

| | `mfe-angular-demo` | `mfe-separate-repos` |
|---|---|---|
| Git feel | One repo, `projects/*` | Four packages (like four repos) |
| shared-auth | Path alias in workspace | Built package + `file:` install |
| Federation | Same | Same |
| Best for | Fast coding | Understanding real team ownership |

If you already understand polyrepo, monorepo is just “same apps, flatter tooling.”

---

## 12. Mini glossary (demo words)

| Term | Meaning here |
|---|---|
| Host / shell | App that owns URL bar, login, layout |
| Remote | Independently served feature app |
| Manifest | JSON name → remoteEntry URL |
| Expose | Module remote publishes (`./Routes`) |
| `loadRemoteModule` | Host API to import that expose |
| Singleton shared | One copy of a package in the tab |
| `file:` dependency | Local stand-in for private npm |

---

## 13. 60-second explain-the-demo (memorize)

> I built a small Angular Native Federation demo with four packages: shared-auth, a shell host, and Safety and Fleet remotes. The shell logs you in and reads a federation manifest that points at each remote’s remoteEntry on another port. Remotes expose route trees; the shell lazy-loads them with loadRemoteModule. User and region live in shared-auth so both remotes show the same session without their own login. Locally shared-auth is installed with a file: dependency to simulate a private registry. That’s the same host/remote model we’d use to split IDMS.

---

## 14. Learning checklist

- [ ] Can draw host + 2 remotes + shared-auth  
- [ ] Know which file is the manifest  
- [ ] Can point to `loadRemoteModule` in shell routes  
- [ ] Can point to `exposes` in a remote config  
- [ ] Can explain npm share vs federation load  
- [ ] Can demo region filter updating both remotes  
- [ ] Can explain viewer blocked on Fleet admin  

When that’s easy, read [12](./12_IDMS_MFE_CREATE_YOUR_OWN.md) to map the same design onto real IDMS envs.
