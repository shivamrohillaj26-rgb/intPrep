# Scenario 10 — Robust CI/CD for Frequent React Deployments

**Prompt:** A React application is deployed multiple times per day. Teams face broken deployments, rollback difficulties, and environment inconsistencies. How would you design a robust CI/CD pipeline?

---

## 1. Clarify pain

| Pain | Typical cause |
|---|---|
| Broken deployments | Weak gates, no smoke tests, “deploy from laptop” |
| Hard rollback | Overwrote artifacts, no versioning, DB coupling |
| Env inconsistencies | Snowflake servers, manual config, drift |

Goal: **high deploy frequency with low change failure rate** (DORA metrics).

---

## 2. Design principles

1. **Build once, promote many** — same artifact through staging → prod  
2. **Everything versioned** — app, config, infra  
3. **Automate gates** — humans approve policy, not “hope”  
4. **Rollback is a first-class feature** (< minutes)  
5. **Environments are cattle** — reproducible via IaC  

---

## 3. Target pipeline (whiteboard)

```
PR opened
  → CI: install (lockfile) → lint → typecheck → unit/integration → build
  → optional: visual/e2e smoke on preview URL
  → required checks green → merge

Main / release
  → CI builds immutable artifact (hashed bundle + container or CDN package)
  → Publish artifact keyed by git SHA / semver
  → Deploy to ephemeral preview / staging (same artifact)
  → Automated smoke + e2e against staging
  → Promote to prod (canary → 100%)
  → Monitor → auto-rollback on SLO burn
```

---

## 4. Fix “broken deployments” — quality gates

### PR-level (every change)

| Gate | Why |
|---|---|
| `npm ci` with **lockfile** | Reproducible deps |
| ESLint + `tsc --noEmit` | Catch classes of bugs early |
| Unit / RTL tests | Logic regressions |
| Bundle size budget | Prevent accidental 2MB imports |
| Dependency scan (optional) | Security |

### Pre-prod

| Gate | Why |
|---|---|
| Build production bundle | Catch build-only errors |
| E2E smoke (Playwright/Cypress) | Critical paths: login, checkout |
| Lighthouse CI thresholds | Perf regressions |
| Preview deploys per PR | Human QA on real URL |

### Prod entry

| Gate | Why |
|---|---|
| Change management / approval for risky | Compliance |
| Canary % rollout | Blast radius |
| Synthetic checks post-deploy | Catch bad prod config |

**Why not “only manual QA on Friday”:** Multiple deploys/day require **automated** confidence; manual becomes bottleneck and still misses things.

**Why Playwright smoke over “full 3-hour suite on every PR”:**  
Fast critical-path suite on PR; fuller suite nightly / on staging promote. Balance speed vs safety.

---

## 5. Fix “rollback difficulties”

### Immutable, addressable artifacts

```
cdn.example.com/app/sha-a1b2c3d4/...
cdn.example.com/app/sha-e5f6g7h8/...
```

Prod pointer (or release manifest):

```json
{ "version": "sha-a1b2c3d4", "builtAt": "..." }
```

**Rollback** = point pointer to previous SHA (seconds/minutes), not “rebuild old commit and pray.”

### Strategies

| Strategy | Use |
|---|---|
| **CDN atomic pointer / release.json** | SPAs static hosting |
| **Blue/green** | Two environments; switch traffic |
| **Canary** | 5% → 25% → 100% |
| **Feature flags** | Disable bad feature without redeploy |

**Why artifact promote over rebuilding for prod:**  
Rebuild can pull different transitive deps / non-determinism → “worked in staging” lies.

### Backend/API compatibility

Frontend rollback fails if API is forward-only breaking.

Rules:

- **Additive API changes** first  
- Version APIs or use tolerant readers  
- Expand/contract migrations  
- Coordinate flags for breaking UX  

**Why mention API in a React CI/CD answer:** Senior signal — frontend rollback is a **system** concern.

---

## 6. Fix “environment inconsistencies”

### Config model

```
Artifact (identical) + Environment config (injected) = running app
```

- Use `VITE_` / build-time only for **public** non-secret config carefully  
- Prefer **runtime config** (`config.js` generated at deploy, or edge env) for env-specific API URLs  
- Secrets in vault / OIDC — never in git  

### Infrastructure as Code

- Terraform/CDK for CDN, buckets, DNS, cloud functions  
- Same topology: `dev` ≈ `staging` ≈ `prod` (size differs, shape matches)  

### Parity checklist

| Concern | Approach |
|---|---|
| Node version | `.nvmrc` / Volta / mise + CI matrix |
| Package manager | Corepack + lockfile |
| Feature flags | Same system all envs |
| Third-party keys | Env-specific, documented |
| Data | Seeded staging; never copy prod secrets carelessly |

**Why runtime config over baking API URL at build for each env:**  
Enables **build once, promote many**. Four env-specific builds = four ways to diverge.

---

## 7. Reference architecture (React SPA)

```
GitHub/GitLab
  → CI runners
      → test + build → artifact store (S3)
  → Deploy job
      → sync to CDN path /sha-...
      → update release pointer (staging|prod)
  → Post-deploy synthetics
  → Observability (Sentry, RUM) keyed by release SHA
```

For SSR (Next.js): similar but artifact may be **container image** tagged by SHA; K8s/ECS deploy with canary; same promote/rollback ideas.

---

## 8. Operational practices

- **Trunk-based development** + short-lived PRs (fits many deploys/day)  
- **Release = git SHA** visible in UI footer / Sentry `release`  
- **On-call runbook:** “Rollback = redeploy previous pointer”  
- **ChatOps:** deploy notifications with SHA + author + pipeline link  
- **Separate destroyous jobs** — prod deploy needs protection rules  

### DORA targets to mention

| Metric | Healthy direction |
|---|---|
| Deployment frequency | Multiple / day (already have) |
| Change failure rate | ↓ via gates + canary |
| MTTR | ↓ via 1-click rollback |
| Lead time | ↓ via CI speed + trunk-based |

---

## 9. Why this over that

| Approach | Verdict |
|---|---|
| Deploy from developer laptop | ❌ Irreproducible |
| Rebuild per environment | ❌ Drift risk |
| Build once, promote | ✅ |
| All-or-nothing prod cutover only | Risky; add canary |
| Flags instead of ever shipping | Flags complement, don’t replace CI |
| Huge manual approval theater every deploy | Slows frequency; automate + risk-based approve |

**Chosen design:**  
> Lockfile CI gates → immutable SHA artifacts → preview/staging promote → canary prod → runtime config + IaC parity → one-click rollback + feature flags → release-aware monitoring.

---

## 10. Minimal “day 1” vs “mature”

**Day 1 (stop the bleeding):**

1. CI on PR: lint, test, build  
2. Deploy only from CI  
3. Versioned CDN folders + previous version kept  
4. Staging with smoke tests  

**Mature:**

5. Preview apps  
6. Canary + auto-rollback  
7. IaC parity  
8. Bundle budgets + Lighthouse CI  
9. Contract tests with APIs  

---

## 11. 60-second spoken answer

> Multiple deploys per day require a pipeline optimized for **safety and rollback**, not just speed. I’d CI every PR with lockfile installs, lint, types, tests, and a production build; deploy **only from CI** using an **immutable artifact tagged by git SHA**. That same artifact promotes staging → prod with smoke/e2e gates, ideally behind a **canary**. Config is injected per environment so we don’t rebuild four times; infra is IaC for parity. Rollback is switching the CDN/release pointer to the previous SHA in minutes, with feature flags for finer kill switches, and Sentry/RUM tagged by release to know when to flip back.

---

## Related

- Scenario 3 — per-remote deploy maps for MFEs  
- Scenario 6 — `tsc` as a CI gate during TS migration  
- Scenario 9 — canary/flags at user scale
