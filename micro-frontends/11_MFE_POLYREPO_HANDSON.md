# Polyrepo MFE hands-on (separate repos)

**Code:** [`../mfe-separate-repos/`](../mfe-separate-repos/)  
**Full README:** [`../mfe-separate-repos/README.md`](../mfe-separate-repos/README.md)

This is the answer to: *“Why was the first demo one Angular workspace?”*  
→ Convenience. **This** folder is how separate teams/repos feel.

---

## Layout

```text
mfe-separate-repos/
  shared-auth/     ← library “repo” (build → dist → npm)
  shell/           ← host “repo” :4200
  mfe-safety/      ← remote “repo” :4201
  mfe-fleet/       ← remote “repo” :4202
```

Each has its **own** `package.json` + `node_modules`.

---

## Study order (files)

1. `shared-auth/projects/shared-auth/src/lib/auth.service.ts` — build this package first  
2. `shell/package.json` — look for `"shared-auth": "file:../shared-auth/dist/shared-auth"`  
3. `shell/public/federation.manifest.json` — runtime URLs to other repos’ servers  
4. `shell/src/app/app.routes.ts` — `loadRemoteModule`  
5. `mfe-safety/federation.config.mjs` — `exposes './Routes'`  
6. `mfe-fleet/package.json` — same `file:` dep pattern  

---

## Run

```bash
cd mfe-separate-repos
chmod +x scripts/start-all.sh && ./scripts/start-all.sh
```

Or follow step-by-step in the folder README.

---

## Spoken difference (20s)

> The monorepo demo puts host and remotes in one Angular workspace. The polyrepo demo is four independent packages — shared-auth is built and installed like a private npm library; shell and remotes only meet at runtime through remoteEntry URLs in the federation manifest. Same Module Federation architecture, different git/ownership model.
