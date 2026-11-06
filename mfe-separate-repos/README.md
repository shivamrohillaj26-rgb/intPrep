# MFE polyrepo hands-on (separate folders = separate repos)

This is the **separate-repos** version of the federation demo.

Each folder is an **independent npm project** (own `package.json`, own `node_modules`, own build).  
In real life each folder would be its **own GitHub repo**. Here they sit side-by-side only so you can run them locally.

| Folder | Real-world meaning | Port |
|---|---|---|
| `shared-auth/` | Private npm package repo (build → publish) | — |
| `shell/` | Host / shell app repo | 4200 |
| `mfe-safety/` | Safety remote repo | 4201 |
| `mfe-fleet/` | Fleet remote repo | 4202 |

Compare with the **monorepo** demo: [`../mfe-angular-demo/`](../mfe-angular-demo/) (one workspace, many `projects/`).

**Understand this demo deeply:**  
[../micro-frontends/13_MFE_DEMO_UNDERSTANDING.md](../micro-frontends/13_MFE_DEMO_UNDERSTANDING.md)

**Create the same for IDMS (incl. how auth is installed in real envs):**  
[../micro-frontends/12_IDMS_MFE_CREATE_YOUR_OWN.md](../micro-frontends/12_IDMS_MFE_CREATE_YOUR_OWN.md)

---

## Mental model

```text
GitHub (imagine 4 remotes)
┌─────────────────┐   npm install shared-auth@x.y.z
│ shared-auth     │──────────────────────────────────┐
└─────────────────┘                                  │
                                                     ▼
┌─────────────────┐     loadRemoteModule      ┌─────────────┐
│ shell           │◄──── remoteEntry.json ────│ mfe-safety  │
│ (host)          │◄──── remoteEntry.json ────│ mfe-fleet   │
└─────────────────┘                            └─────────────┘
        ▲
        │ federation.manifest.json points to CDN/localhost URLs
        │ (NOT to other git repos — runtime only cares about URLs)
```

**Interview line:**  
“Federation couples apps at **runtime via remoteEntry URLs**. Shared libraries couple them at **build time via npm**. Repos can be fully separate.”

---

## Run (hands-on)

```bash
cd mfe-separate-repos

# 1) Build the shared package (like CI publishing to Artifactory/npm)
cd shared-auth && npm i && npm run build && cd ..

# 2) Install that built package into each app (local file: = private registry)
cd shell && npm i ../shared-auth/dist/shared-auth && cd ..
cd mfe-safety && npm i ../shared-auth/dist/shared-auth && cd ..
cd mfe-fleet && npm i ../shared-auth/dist/shared-auth && cd ..

# 3) Three terminals (or use scripts/start-all.sh)
cd mfe-safety && npx ng serve --port 4201
cd mfe-fleet  && npx ng serve --port 4202
cd shell      && npx ng serve --port 4200
```

Or: `chmod +x scripts/start-all.sh && ./scripts/start-all.sh`

Open **http://localhost:4200** — login `admin` / `admin`.

---

## What makes them “separate”

Check each app’s `package.json`:

```json
"shared-auth": "file:../shared-auth/dist/shared-auth"
```

That `file:` is **only for local learning**. In production you’d see:

```json
"shared-auth": "1.4.2"
```

from a private registry, or:

```json
"shared-auth": "git+ssh://git@github.com/org/shared-auth.git#v1.4.2"
```

Each app also has its **own** `@angular/*` versions in its lockfile — in real polyrepos you pin majors carefully (or use Renovate).

Runtime glue is still:

`shell/public/federation.manifest.json` → `http://localhost:4201|4202/remoteEntry.json`

---

## Practice exercises (do these)

1. **Stop Safety** (`Ctrl+C` on 4201). Open `/safety` in shell → see load failure. Start Safety again → works.  
   → Proves remotes are independent processes.

2. **Change Safety UI** in `mfe-safety/` only, restart only Safety, refresh shell.  
   → Host code unchanged = independent deploy story.

3. **Bump shared-auth** — change a string in `AuthService`, rebuild shared-auth, re-`npm i` in shell + remotes, restart.  
   → How shared libs version across repos.

4. **Imagine CDN** — change manifest URLs to `https://cdn.example.com/mfe-safety/remoteEntry.json`.  
   → Same code path as prod.

---

## File map (per repo)

### `shared-auth/` (library repo)
- `projects/shared-auth/src/lib/*` — AuthService, guards, session
- `npm run build` → `dist/shared-auth/` (publish this)

### `shell/` (host repo)
- `public/federation.manifest.json` — remote URLs
- `src/app/app.routes.ts` — `loadRemoteModule`
- `federation.config.mjs` — host + shared Angular

### `mfe-safety/` / `mfe-fleet/` (remote repos)
- `federation.config.mjs` — `exposes: { './Routes': ... }`
- `src/app/remote.routes.ts` — what host loads
- `src/app/pages/*` — domain UI

---

## Monorepo vs polyrepo (say in interview)

| | Monorepo (`mfe-angular-demo`) | Polyrepo (this folder) |
|---|---|---|
| Git | One repo | One repo per app/lib |
| Shared lib | Path alias / workspace | npm package (`file:` / private registry) |
| Versioning | Same lockfile easy | Explicit package versions |
| CI | Often one pipeline matrix | One pipeline per repo |
| Federation | Same | Same (remoteEntry URLs) |

Both are valid. Polyrepo = stronger team ownership; monorepo = easier refactors.

---

## Optional: make them real git repos

```bash
cd mfe-separate-repos/shell && git init && git add . && git commit -m "shell host"
# repeat for mfe-safety, mfe-fleet, shared-auth
# push each to its own GitHub remote
```

You do **not** need that for federation to work — only for simulating org structure.
