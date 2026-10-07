# Angular Upgrade Playbook — Interview Ready Guide

Prompts (Optum-style):

> Describe upgrading Angular version to version. What approach? Official resources? Hardest issue?

Tie to your story: AngularJS → Angular 19 / NUX migration (strangler) + `ng update` majors.

---

## 1. One-liner

> I upgrade **one major at a time** with the official **update.angular.io** guide + `ng update`, fix breaking changes / peer deps, run tests and a smoke checklist, then promote environments. For AngularJS → modern Angular I use a **strangler** (hybrid shell), not a big-bang rewrite.

---

## 2. Official resources (name these)

| Resource | Why |
|---|---|
| **https://update.angular.io** | Interactive “from → to” checklist (most important) |
| `ng update` / `ng update @angular/core@X @angular/rest` | Applies migrations/schematics |
| Angular changelog / blog for that major | Features + breaking changes |
| `ng update` report / migrations | Automated code fixes where possible |

Say:

> I always start at update.angular.io for the exact from/to path, then run the CLI migrations rather than hand-editing peer versions.

---

## 3. Approach (step checklist)

```text
1. Read update.angular.io for from→to (one major at a time if multi-major)
2. Clean git branch; green CI on current version
3. ng update @angular/core @angular/cli (and related)
4. Fix compile errors, peerDependency conflicts
5. Run unit + e2e / critical manual smoke
6. Check deprecated APIs (HttpModule, ViewEngine leftovers, etc.)
7. Deploy to QA → soak → prod
8. Repeat for next major if needed
```

**AngularJS → Angular (your Netradyne story):**

```text
New Angular shell → migrate feature-by-feature
Hybrid iframe / dual router bookmarks
Shared auth → feature flags → retire legacy
```

Not “`ng update` from 1.x” — different problem (rewrite/strangler).

---

## 4. Challenging issues (have 1–2 stories)

| Challenge | Direction of answer |
|---|---|
| Peer dependency hell | Align Angular package versions; update nested libs |
| Third-party not ready | Temporary pin / replace / wrap; don’t block forever |
| Build shift Webpack → application builder (esbuild/Vite) | Follow schematic `use-application-builder`; fix custom Webpack |
| Template / strictness errors after upgrade | Fix one module at a time; enable stricter flags gradually |
| Zone → zoneless / signals migration | Incremental; tests for CD timing |
| Legacy AngularJS coexistence | Strangler + shared session; parity tests |

**Sample spoken challenge:**

> The hardest part of major upgrades is usually **ecosystem lag** — a charting or auth library pinned to an old Angular peer. I either upgrade that library, replace it, or isolate behind a facade so the rest of the app can move. For our AngularJS→19 path, the hard part was parity of edge workflows while hybrid — solved with feature flags and staged cutovers, not a flip switch.

---

## 5. Spoken (45s)

> For version-to-version I follow update.angular.io and `ng update` one major at a time, fix breakages, and verify with automated plus smoke tests before promoting. For our platform migration from AngularJS I didn’t rely on a single `ng update` — we used a strangler: modern Angular shell, migrate modules behind flags, keep users online. Official docs plus CLI migrations beat manual version bumps.

---

## 6. Q&A

**Q: Skip multiple majors?**  
A: Discouraged. update.angular.io can show multi-step; safer is sequential majors.

**Q: `ng update` vs hand-edit package.json?**  
A: Prefer `ng update` — runs schematics that rewrite code.

**Q: How know you’re done?**  
A: App builds, tests green, no unexpected deprecations in critical paths, QA sign-off.

---

## 7. Practice checklist

- [ ] Name update.angular.io  
- [ ] Steps: branch → ng update → fix → test → promote  
- [ ] One hard issue story ready  
- [ ] Contrast ng update vs AngularJS strangler  
