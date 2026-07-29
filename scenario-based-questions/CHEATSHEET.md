# Scenario Questions — Interview Cheat Sheet

One-screen revision. Full depth lives in `01`–`10` files.

---

## Answer skeleton (use every time)

1. Clarify constraints & metrics  
2. Diagnose root causes  
3. Propose layered redesign  
4. Say **why A over B**  
5. Incremental rollout  
6. Success metrics  

---

## Chosen approaches (one line each)

| # | Choose this | Over that |
|---|---|---|
| 1 | Visibility-aware query cache + BFF/batch (+ optional SSE) | 50 independent `setInterval`s / dump all into Redux |
| 2 | State-by-type standards + **one** global client store + Query for server | Keep Context+Redux+Zustand forever with sync effects |
| 3 | Singleton shared platform deps; URL+API integration; runtime remote map | Shared mega-Redux; duplicate React; hardcoded remotes |
| 4 | RTK Query / TanStack Query + thin Redux | Eternal Redux slices for 100 APIs |
| 5 | Coalesce (rAF) + per-symbol store + virtualize + worker parse | setState/Redux every tick for full book |
| 6 | `allowJs` strangler + new code TS-only + ratchet `strict` | Big-bang rewrite or `strict` day one |
| 7 | SSG/ISR for marketing; CSR for app; fix meta/CWV | CSR-only “Google runs JS” for brochure site |
| 8 | Server query + pagination/cursor + virtualization | Mount 100k DOM rows + memo hope |
| 9 | CDN/split/BFF + modular monolith; MFE when org needs | MFE on day one “for 5M users” |
| 10 | Build once / promote SHA artifact + canary + 1-click rollback | Laptop deploys; rebuild per env |

---

## 60-second pitches

**1 — Dashboard widgets**  
Centralize server state (React Query), refresh only visible + tab-active widgets, batch via BFF/SSE, memoize slice subscriptions, bound caches/timers.

**2 — Mixed state libs**  
Standardize by state type: Query = server; one of RTK/Zustand = global client; Context = low-churn; URL = shareable; facades during strangler migration.

**3 — Module Federation**  
Singleton React/UI; integrate via URL + backend; runtime versioned `remoteEntry` map; error boundaries; independent CDN deploys with contract tests.

**4 — Redux bloat**  
API data ≠ Redux forever → RTK Query/TanStack Query with TTL/GC; Redux keeps client state; narrow selectors; stop persisting catalogs.

**5 — Stock WebSocket**  
Subscribe to needed symbols; worker parse; rAF coalesce; per-symbol store; virtualized rows; imperative charts; pause when hidden.

**6 — TS migration**  
allowJs side-by-side; TS for all new code; type API boundaries first; small rename PRs; ratchet strictness; no freeze-the-world rewrite.

**7 — Marketing SEO**  
Verify raw HTML has content; SSG/ISR for marketing routes; SSR when per-request; CSR for authenticated app; meta/canonical/sitemap/CWV.

**8 — 100k rows**  
Users need access, not 100k nodes; server filter/sort/page; virtualize window; real grid if Excel-like; server bulk/export.

**9 — 50k → 5M**  
Scale CDN/API/BFF and client perf first; modular monolith; extract MFEs for team autonomy later; flags/canaries; measure CWV + RPS.

**10 — CI/CD**  
CI gates on PR; immutable SHA artifacts; build once promote many; staging smoke; canary prod; runtime config + IaC; pointer rollback + flags.

---

## Tradeoff phrases that sound senior

- “That’s an org-scaling tool, not a traffic-scaling tool.” (MFEs)  
- “Server state vs client state.” (Redux vs Query)  
- “Build once, promote many.” (CI/CD)  
- “Profile before offloading to a worker.” (perf)  
- “Strangler fig, not big bang.” (migrations)  
- “Google *can* render JS; marketing still wants HTML.” (SEO)

---

## Licious managerial punchlines

Full guide: [LICIOUS_MANAGERIAL_FRONTEND.md](./LICIOUS_MANAGERIAL_FRONTEND.md)

| Topic | Say |
|---|---|
| SSE vs WS | Push-only → SSE; bidirectional → WebSocket (how: HTTP Upgrade → 101 → frames) |
| Bundles | Prod analyzer → route split / lazy / replace fat libs → CI budgets |
| gRPC | Protobuf + HTTP/2; browser via BFF/gRPC-Web |
| BE conflict | Evidence → user-first options → versioned contract + retro |
| SSR SEO | Content in first HTML; hybrid by route; meta still required |
| Tree-shaking | **DCE** on Module Dependency Graph via **Mark-and-Sweep** (ESM only; not just “removes unused code”) |
| BFF | Per-client aggregate/adapt/auth layer over domain services |
