# Scenario 9 — Scale an Angular monolith from 50k to 5M users

**Prompt:** Company grows 50k → 5M users. Current app is one Angular monolith. What architecture changes?

*(If they say React monolith: same waves; **name Angular** — lazy routes, Nx, Native Federation, `@angular/ssr` hybrid.)*

---

## 1. Clarify — 5M is not “split Angular and it scales”

| Layer | Pressure |
|---|---|
| CDN / hashed `main.*.js` | Bandwidth, cache |
| BFF / APIs | RPS |
| Realtime | WS connections |
| Client | Low-end devices, CD, lists |
| Org | Many teams, one `ng build` zip |

**Users don’t care about your repo.** Traffic is **edge + API**. Frontend changes: **CWV, team velocity, blast radius**.

---

## 2. Waves (don’t MFE on day one)

```
Wave 0  RUM / SLOs (LCP, INP, API p95)
Wave 1  CDN, budgets, loadChildren, OnPush, virtual scroll
Wave 2  BFF, pagination, cache, multi-region APIs
Wave 3  Modular monolith (Nx boundaries) → MFE when teams block
Wave 4  Geo, lite mode, SW careful
```

**Why not Native Federation for “5M users”:** MFE is **org + independent deploy**. Premature ops cost. Modular monolith + perf first. (IDMS: convert when domains/teams hurt, not because of user count.)

---

## 3. Wave 1 — Angular client

- CDN, hashed files, Brotli, HTTP/2  
- **`loadComponent` / `loadChildren`**, `@defer`  
- Tree-shake / lean imports / `angular.json` **budgets**  
- `NgOptimizedImage`  
- Public marketing: **prerender** (Scenario 7); dashboard **CSR**  
- CDK virtualize (Scenario 8); don’t NgRx 100 APIs (Scenario 4)  
- Feature flags  

**Why this before rewrite:** Often 10× feel at 1% of MFE cost.

---

## 4. Wave 2 — You must talk backend

BFF (fewer chatty `HttpClient` calls), CDN cache public GETs, cursors, auth rate limits, multi-region, async export jobs.

**Why BFF:** Mobile + 15 microservices from the browser = latency × CORS × CD from every response.

---

## 5. Wave 3 — Modularize

**A — Nx / folders first**

```
apps/web/
  features/devices/
  features/safety/
libs/kernel/
```

Lint: remotes/features must not deep-import each other (`@nx/enforce-module-boundaries`).

**B — Extract Native Federation** when:

- Teams block on one Jenkins zip weekly  
- Unrelated domains in `main.js`  
- Need Devices deploy ≠ Safety JS (Scenario 3)

**Nx = CI graph. Federation = runtime. CDN = delivery.** Don’t mix.

---

## 6. Whiteboard

```
Users
  → CDN (hashed Angular + prerender HTML)
  → Host SPA / optional remotes
  → BFF (auth, aggregate)
  → Services + cache + workers
```

---

## 7. Why this over that

| Option | Role |
|---|---|
| K8s the SPA | ❌ Static files; doesn’t shrink JS |
| MFE immediately | Org tool, not traffic tool |
| Modular Angular + CDN + BFF | ✅ First shift |
| SSR the whole IDMS | ❌ Auth dashboard |
| One mega NgRx | ❌ Scenario 4 |

---

## 8. 60-second spoken answer

> Five million users is **platform** scale. I’d start with RUM, then make the **Angular monolith** cacheable and split: CDN, **lazy routes**, budgets, virtualized lists. With backend: **BFF**, pagination, multi-region APIs. In code, an **Nx modular monolith** so teams don’t import across domains; I’d add **Native Federation** only when **release coupling** hurts — that’s how we’re peeling NUX, not because of user count. Flags and canaries on the way.

---

## Related

- Scenario 3 · 7 · 10  
- [ONETRUST_ANGULAR_OPTIMIZATION.md](../onetrust/ONETRUST_ANGULAR_OPTIMIZATION.md)  
- [ONETRUST_CICD_NX_MFE.md](../onetrust/ONETRUST_CICD_NX_MFE.md)
