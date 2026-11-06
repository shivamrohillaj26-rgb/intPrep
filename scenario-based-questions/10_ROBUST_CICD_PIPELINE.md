# Scenario 10 — Robust CI/CD for frequent Angular deploys

**Prompt:** Angular app deploys many times per day. Broken releases, hard rollback, env drift. Design the pipeline.

**NUX today vs MFE:** [../onetrust/ONETRUST_CICD.md](../onetrust/ONETRUST_CICD.md) · [ONETRUST_CICD_NX_MFE.md](../onetrust/ONETRUST_CICD_NX_MFE.md)

---

## 1. Clarify pain

| Pain | Typical cause |
|---|---|
| Broken deploys | No PR gates, `ng serve` quality only, laptop `ng build` |
| Hard rollback | Overwrote `dist/`, no SHA on CDN |
| Env drift | `fileReplacements` per env rebuild; snowflake servers |

Goal: DORA — high frequency, low failure, fast MTTR.

Honesty if they ask IDMS: **CI = GitHub Actions**; **CD auto-to-QA = not yet**; Jenkins BUILD + DEPLOY are **human**. This scenario is the **target robust design**.

---

## 2. Principles

1. **Build once, promote many** (same hashed JS; env via **runtime** `index.html` script / `window` config — NUX `#nd-env-config`)  
2. Version **git SHA**  
3. Automate gates  
4. Rollback = previous SHA pointer, not rebuild  
5. IaC environments  

---

## 3. Pipeline

```
PR
  → npm ci (lockfile)
  → lint, ng test / Vitest, ng build (or nx affected)
  → budgets in angular.json
  → Playwright smoke on preview (optional)
  → required checks

Main
  → immutable artifact: dist hashed files (+ env stamps if you must)
  → staging smoke
  → promote prod (canary)
  → Sentry/RUM release = SHA
```

**Angular gates**

| Gate | Why |
|---|---|
| `npm ci` + lockfile | Reproducible |
| `ng build` production | AOT, templates |
| `budgets` | Fat Material barrel / moment |
| Unit tests | Logic |
| E2E smoke Playwright | Login + one critical path |
| `nx affected` (monorepo/MFE) | Don’t compile Safety on a Devices PR |

---

## 4. Rollback

```
cdn/app/<sha>/main.xxx.js
release.json → { "sha": "a1b2" }
```

Rollback = point `index.html` / pointer at **previous SHA**. MFE: previous `remoteEntry` URL in **manifest**.

**Why not rebuild prod from old commit:** non-determinism, different `node_modules`.

API: additive first or FE rollback breaks.

---

## 5. Env consistency (Angular)

```
Same dist JS + runtime config = env
```

- Prefer **runtime** API hosts (hostname / `nd-env-config`) over 13 full recompiles **for logic**  
- NUX still **stamps HTML** per env (CDN `<script src>`) from **one** `ng build` — that’s “stamp, not 13 compiles”  
- Secrets never in `environment.ts` committed  
- `.nvmrc` Node 22 in CI and Jenkins  

**MFE:** host carries env script; remotes inject API base from kernel. Deploy **prefix** `mfe/devices/<sha>/` only.

Nx **does not** run on the dumb S3 sync job — only Actions + BUILD / orchestrator.

---

## 6. Why this over that

| Approach | Verdict |
|---|---|
| Deploy from laptop | ❌ |
| `ng build` per env from scratch | Drift; NUX stamps instead |
| Build once, promote / stamp HTML | ✅ |
| Nx on deploy job | ❌ (compile on farm) |
| Manual Friday QA only | Won’t support many deploys/day |

---

## 7. 60-second spoken answer

> Frequent Angular deploys need **CI gates** and **SHA artifacts**, not hope. Every PR: lockfile, lint, tests, **`ng build` + budgets** — with **Nx affected** once we have remotes. We **build once**, stamp or inject **runtime env**, promote staging → prod. Rollback is the **previous hashed folder / federation manifest**, not a new compile. Config isn’t four divergent `environment.prod.ts` rebuilds if we can avoid it. On NUX today Actions is the PR CI and Jenkins is still a **click** for artifacts — the design I’d drive toward is this promote/rollback loop.

---

## Related

- Scenario 3 — per-remote SHA  
- Scenario 6 — `strictTemplates` as a gate later  
- Scenario 9 — canary at scale
