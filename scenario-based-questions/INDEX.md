# Frontend Scenario-Based Interview Questions (**Angular**)

Deep answers: architecture, tradeoffs, **Angular APIs** (HttpClient, RxJS, signals, NgRx, CDK, `@angular/ssr`, Nx, Native Federation).

If the interviewer says Redux/React Query/`React.lazy`, **translate** — don’t stay in React.

Folder: `scenario-based-questions/`

---

## Scenarios

| # | Scenario | File |
|---|---|---|
| 1 | 50+ dashboard widgets polling every 5s | [01_DASHBOARD_WIDGETS_POLLING.md](./01_DASHBOARD_WIDGETS_POLLING.md) |
| 2 | Mixed state (NgRx + services + signals) | [02_STANDARDIZE_STATE_MANAGEMENT.md](./02_STANDARDIZE_STATE_MANAGEMENT.md) |
| 3 | Module Federation — 3 Angular teams | [03_MODULE_FEDERATION_MICRO_FRONTENDS.md](./03_MODULE_FEDERATION_MICRO_FRONTENDS.md) |
| 4 | 100+ APIs dumped into NgRx | [04_REDUX_STORE_BLOAT.md](./04_REDUX_STORE_BLOAT.md) |
| 5 | WebSocket ticks freeze the UI | [05_WEBSOCKET_HIGH_FREQUENCY_UPDATES.md](./05_WEBSOCKET_HIGH_FREQUENCY_UPDATES.md) |
| 6 | Gradual TS / `strictTemplates` / standalone | [06_GRADUAL_TYPESCRIPT_MIGRATION.md](./06_GRADUAL_TYPESCRIPT_MIGRATION.md) |
| 7 | Marketing SEO — CSR / SSR / prerender | [07_SEO_RENDERING_STRATEGIES.md](./07_SEO_RENDERING_STRATEGIES.md) |
| 8 | Admin table 100,000 rows | [08_LARGE_TABLE_100K_ROWS.md](./08_LARGE_TABLE_100K_ROWS.md) |
| 9 | Scale Angular monolith 50k → 5M | [09_SCALE_MONOLITH_TO_MILLIONS.md](./09_SCALE_MONOLITH_TO_MILLIONS.md) |
| 10 | CI/CD for frequent Angular deploys | [10_ROBUST_CICD_PIPELINE.md](./10_ROBUST_CICD_PIPELINE.md) |

---

## Company / managerial

| Round | File |
|---|---|
| Licious FE managerial | [LICIOUS_MANAGERIAL_FRONTEND.md](./LICIOUS_MANAGERIAL_FRONTEND.md) |
| **Provenir** (already Angular) | [PROVENIR_SOFTWARE_ENGINEER_INTERVIEW_PREP.md](./PROVENIR_SOFTWARE_ENGINEER_INTERVIEW_PREP.md) |
| **OneTrust** | **[../onetrust/](../onetrust/INDEX.md)** |
| Coverage map | [INTERVIEW_QUESTION_COVERAGE_MAP.md](./INTERVIEW_QUESTION_COVERAGE_MAP.md) |
| IDMS project HLD | [16_NETRADYNE_IDMS_PROJECT_HLD.md](../frontend-system-design/16_NETRADYNE_IDMS_PROJECT_HLD.md) |

---

## Quick revision

| File | What |
|---|---|
| [CHEATSHEET.md](./CHEATSHEET.md) | Angular “choose this” + 60s pitches |

---

## How to use

1. Clarify  
2. Diagnose (Zone, CD, HttpClient, store)  
3. Redesign  
4. Tradeoffs  
5. Strangler rollout  
6. Metrics  

---

## Related prep

| Folder | Topics |
|---|---|
| `../angular-interview-prep/` | CD, signals, SSR, optimize |
| `../onetrust/` | NUX MFE, CI/CD, virtual scroll |
| `../micro-frontends/` | Federation deep |
| `../frontend-system-design/` | CRP, bundles, WS |

---

## Study order

1 → 5 → 8 (perf / CD / lists)  
4 → 2 (state)  
3 → 9 (MFE / scale)  
7 (SEO / SSR)  
6 (strict / standalone)  
10 (CI/CD)
