# Angular Micro Frontend demo (Native Federation)

Runnable **host + 2 remotes + shared auth** so you can *see* Module Federation concepts that interviews ask about.

> This uses **Native Federation** (`@angular-architects/native-federation-v4`) on Angular 21 / esbuild.  
> Interview wording: **“Module Federation”** (same host/remote/`remoteEntry`/shared-singleton mental model).  
> See [../micro-frontends/07_NATIVE_VS_MODULE_FEDERATION.md](../micro-frontends/07_NATIVE_VS_MODULE_FEDERATION.md).

---

**Study files in order:** [../micro-frontends/10_MFE_DEMO_FILE_BY_FILE.md](../micro-frontends/10_MFE_DEMO_FILE_BY_FILE.md)

## Run it

```bash
cd mfe-angular-demo
npm install
npm run start:all
```

Open **http://localhost:4200**

| App | Port | Role |
|---|---|---|
| `shell` | 4200 | **Host** — login, nav, region filter, loads remotes |
| `mfe-safety` | 4201 | **Remote** — Safety domain |
| `mfe-fleet` | 4202 | **Remote** — Fleet domain (+ admin route) |

Or three terminals: `npm run start:shell` / `start:safety` / `start:fleet`.

**Login:** `admin` / `admin` or `viewer` / `viewer`

### What to click (learning path)

1. Login as **admin** → header shows user.
2. Change **Region** in the shell header.
3. Open **Safety** → same user + filtered alerts (remote :4201).
4. Open **Fleet** → same user + filtered vehicles (remote :4202).
5. Logout → login as **viewer** → **Fleet admin** redirects home (`adminGuard`).

---

## Architecture (draw this in interviews)

```text
Browser tab
┌─────────────────────────────────────────────────────────────┐
│ SHELL (host :4200)                                          │
│  • OAuth/login UI                                           │
│  • Router + authGuard                                       │
│  • Megamenu / region filter                                 │
│  • Reads federation.manifest.json                           │
│         │                                                   │
│         ├─ loadRemoteModule('mfe-safety','./Routes') ──────►│ Safety remote :4201
│         └─ loadRemoteModule('mfe-fleet','./Routes') ───────►│ Fleet remote  :4202
│                                                             │
│ shared-auth (session store) ◄── user, token, region ────────┤
│ Angular / RxJS shared as singletons (one copy in the tab)   │
└─────────────────────────────────────────────────────────────┘
```

---

## How each piece works

### 1. Host (shell)

- Owns **auth**, **layout**, **top-level routes**.
- Does **not** contain Safety/Fleet feature code — it **loads** them at runtime.
- Manifest: `projects/shell/public/federation.manifest.json`

```json
{
  "mfe-safety": "http://localhost:4201/remoteEntry.json",
  "mfe-fleet": "http://localhost:4202/remoteEntry.json"
}
```

In prod you’d point these to CDN URLs and swap the manifest per env (no host rebuild for remote version bumps).

### 2. Remotes

Each remote **exposes** a route tree (not a full second browser app inside the shell):

```js
// federation.config.mjs
exposes: {
  './Routes': './projects/mfe-safety/src/app/remote.routes.ts',
}
```

Shell composes them:

```ts
{
  path: 'safety',
  canActivate: [authGuard],
  loadChildren: () =>
    loadRemoteModule('mfe-safety', './Routes').then((m) => m.routes),
}
```

**Spoken:** “Remotes expose `./Routes`; the host lazy-loads them like a local feature module, but the JS is downloaded from another deployable.”

### 3. Shared dependencies (framework)

`shareAll({ singleton: true })` in each `federation.config.mjs` means **one** Angular / RxJS in the tab.  
Without that you’d get duplicate frameworks → broken DI, huge bundles, weird bugs.

### 4. Shared business data (auth + region)

Library: `projects/shared-auth`

| Export | Job |
|---|---|
| `AuthService` | login / logout / user / token |
| `authGuard` / `adminGuard` | route protection |
| `authInterceptor` | attach `Authorization: Bearer …` |
| `SessionContextService` | cross-MFE UI state (region filter) |
| `getSharedSession()` | one in-memory store on `globalThis` for the tab |

**How remotes “know” who is logged in**

1. User logs in on the **shell** → token + user written to shared session.
2. Remote components call `hydrateFromSharedStore()` / read `AuthService` signals.
3. Same region filter updates Safety alerts and Fleet vehicles.

**Interview levels of sharing (say this):**

1. **Platform auth** — cookie/token at browser; host login; interceptor adds Bearer.
2. **Shared library singleton** — `shared-auth` as one package (ideal federation share).
3. **URL** — tenant/id in route for deep links / refresh.
4. **API** — each remote fetches its own domain data with the shared token.
5. **Not** prop-drilling through iframe `postMessage` for native MF pages.

This demo uses (1)+(2)+a tiny shared session store so you can *see* one user across remotes even if local bundling duplicates a service class.

### 5. Authorization boundary

- Shell: `authGuard` on `/safety` and `/fleet` (must be logged in).
- Fleet remote: `adminGuard` on `/fleet/admin`.
- Viewer hits admin → redirected to `/home`.

**Spoken:** “Host owns the composition and coarse auth; fine-grained admin routes can still use the shared guard inside the remote.”

---

## Folder map

```text
mfe-angular-demo/
  projects/
    shell/                 ← host
    mfe-safety/            ← remote
    mfe-fleet/             ← remote
    shared-auth/           ← shared library
```

Key files to read before an interview:

| File | Why |
|---|---|
| `shell/src/app/app.routes.ts` | `loadRemoteModule` |
| `shell/public/federation.manifest.json` | remote discovery |
| `*/federation.config.mjs` | name / exposes / shared |
| `shared-auth/src/lib/auth.service.ts` | login + session |
| `mfe-*/src/app/remote.routes.ts` | what remotes expose |

---

## 60-second spoken answer (after you run this)

> I built a small Angular Native Federation setup that mirrors Module Federation. The shell is the host on 4200 — login, nav, guards, and a federation manifest. Safety and Fleet are separate apps on 4201/4202 that expose route trees. The shell lazy-loads them with `loadRemoteModule`. Angular is shared as a singleton. Auth and a region filter live in a shared-auth library backed by one session store for the tab, so remotes show the same user without their own login. Admin routes use a shared role guard. In production each app has its own pipeline and the host points at CDN remoteEntry URLs via the manifest.

---

## Common interview Q&A from this demo

**Q: What is the shell?**  
A: The host SPA — auth, chrome, routing composition, loads remotes.

**Q: How does the host find remotes?**  
A: Manifest maps name → `remoteEntry.json` URL; runtime fetches that, then the exposed module.

**Q: Independent deploy?**  
A: Yes — ship a new Safety remote, update manifest (or versioned URL), shell unchanged.

**Q: How do you share data?**  
A: Shared singleton libs + token/API + URL; not copying user objects through custom events for every page.

**Q: Iframe vs federation?**  
A: Iframe = strong isolation / legacy strangler. Federation = same document, shared framework, real Angular router integration. This demo is federation-only.

**Q: Native vs Webpack Module Federation?**  
A: Same architectural idea; Native Federation is the esbuild/Vite-era implementation for modern Angular.

---

## Troubleshooting

- Blank Safety/Fleet: ensure **all three** serves are running; check browser Network for `remoteEntry.json` 200.
- Port clash: stop other `ng serve` / change ports in `angular.json` + manifest.
- Node engine warning from orchestrator: demo still runs on Node 22 here; if init fails, use Node ≥ 24.16.
