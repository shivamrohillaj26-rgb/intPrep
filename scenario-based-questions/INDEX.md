# Frontend Scenario-Based Interview Questions

Deep, interview-ready answers with **architecture redesigns**, **tradeoffs**, and explicit **why this over that** reasoning.

Folder: `scenario-based-questions/`

---

## Scenarios

| # | Scenario | File |
|---|---|---|
| 1 | 50+ dashboard widgets polling every 5s — lag & memory | [01_DASHBOARD_WIDGETS_POLLING.md](./01_DASHBOARD_WIDGETS_POLLING.md) |
| 2 | Context + Redux + Zustand mixed — standardize state | [02_STANDARDIZE_STATE_MANAGEMENT.md](./02_STANDARDIZE_STATE_MANAGEMENT.md) |
| 3 | Module Federation (Product / Checkout / User) | [03_MODULE_FEDERATION_MICRO_FRONTENDS.md](./03_MODULE_FEDERATION_MICRO_FRONTENDS.md) |
| 4 | 100+ API responses dumped into Redux — store bloat | [04_REDUX_STORE_BLOAT.md](./04_REDUX_STORE_BLOAT.md) |
| 5 | WebSocket stock ticks freeze the UI | [05_WEBSOCKET_HIGH_FREQUENCY_UPDATES.md](./05_WEBSOCKET_HIGH_FREQUENCY_UPDATES.md) |
| 6 | Gradual JS → TypeScript migration (200 files) | [06_GRADUAL_TYPESCRIPT_MIGRATION.md](./06_GRADUAL_TYPESCRIPT_MIGRATION.md) |
| 7 | Marketing site SEO — SSR / CSR / SSG / hybrid | [07_SEO_RENDERING_STRATEGIES.md](./07_SEO_RENDERING_STRATEGIES.md) |
| 8 | Admin table with 100,000 rows | [08_LARGE_TABLE_100K_ROWS.md](./08_LARGE_TABLE_100K_ROWS.md) |
| 9 | Scale React monolith 50k → 5M users | [09_SCALE_MONOLITH_TO_MILLIONS.md](./09_SCALE_MONOLITH_TO_MILLIONS.md) |
| 10 | Robust CI/CD for frequent React deploys | [10_ROBUST_CICD_PIPELINE.md](./10_ROBUST_CICD_PIPELINE.md) |

---

## Company / managerial rounds

| Round | File |
|---|---|
| Licious FE managerial (SSE/WS, bundles, gRPC, BFF, SSR, tree-shaking, conflict, projects) | [LICIOUS_MANAGERIAL_FRONTEND.md](./LICIOUS_MANAGERIAL_FRONTEND.md) |

---

## Quick revision

| File | What |
|---|---|
| [CHEATSHEET.md](./CHEATSHEET.md) | All “choose this over that” + 60s pitches |
| [LICIOUS_MANAGERIAL_FRONTEND.md](./LICIOUS_MANAGERIAL_FRONTEND.md) | Managerial Qs with spoken answers |

---

## How to use in interviews

For each scenario, structure your answer as:

1. **Clarify** — constraints, metrics, what’s broken  
2. **Diagnose** — root causes (not just symptoms)  
3. **Redesign** — target architecture in layers  
4. **Tradeoffs** — why A over B  
5. **Rollout** — incremental path (never “rewrite everything Monday”)  
6. **Success metrics** — FPS, TTI, bundle, error rate, deploy MTTR  

---

## Related prep

| Folder | Topics |
|---|---|
| `../frontend-system-design/` | CRP, bundles, reflow, HTTP, workers, auth |
| `../javascript-interview-prep/` | Event loop, debounce, async |
| `../angular-interview-prep/` | Signals, DI (Angular-flavored equivalents) |

---

## Suggested study order

1 → 5 → 8 (performance / rendering)  
4 → 2 (state architecture)  
3 → 9 (platform scale)  
7 (rendering modes / SEO)  
6 (migration process)  
10 (delivery / CI/CD)
