# Frontend System Design — Interview Prep Index

Deep guides for frontend performance and web system design interviews.

Folder: `frontend-system-design/`

> More topics will be added as you share them.

---

## Current Topics

| # | Topic | File |
|---|---|---|
| 1 | Critical Rendering Path | [01_CRITICAL_RENDERING_PATH.md](./01_CRITICAL_RENDERING_PATH.md) |
| 2 | Bundle Optimization, Code Splitting, Lazy Loading | [02_BUNDLE_OPTIMIZATION_CODE_SPLITTING_LAZY_LOADING.md](./02_BUNDLE_OPTIMIZATION_CODE_SPLITTING_LAZY_LOADING.md) |
| 3 | Reflow vs Repaint & Rendering Performance | [03_REFLOW_REPAINT_RENDERING_PERFORMANCE.md](./03_REFLOW_REPAINT_RENDERING_PERFORMANCE.md) |
| 4 | HTTP/1.1 vs HTTP/2 & Network Optimizations | [04_HTTP1_VS_HTTP2_NETWORK_OPTIMIZATIONS.md](./04_HTTP1_VS_HTTP2_NETWORK_OPTIMIZATIONS.md) |
| 5 | Web Workers | [05_WEB_WORKERS.md](./05_WEB_WORKERS.md) |
| 6 | Service Workers | [06_SERVICE_WORKERS.md](./06_SERVICE_WORKERS.md) |
| 7 | Pinterest-like Grid HLD | [07_PINTEREST_LIKE_GRID_HLD.md](./07_PINTEREST_LIKE_GRID_HLD.md) |
| 8 | Explain Your Project HLD | [08_PROJECT_HLD_WALKTHROUGH.md](./08_PROJECT_HLD_WALKTHROUGH.md) |
| 9 | CORS (Postman vs browser) | [09_CORS.md](./09_CORS.md) |
| 10 | Frontend Auth Security (XSS/CSRF/cookies) | [10_FRONTEND_AUTH_SECURITY.md](./10_FRONTEND_AUTH_SECURITY.md) |
| 11 | Tree shaking under the hood (Mark-and-Sweep / DCE) | [11_TREE_SHAKING_MARK_AND_SWEEP.md](./11_TREE_SHAKING_MARK_AND_SWEEP.md) |
| 12 | Pagination types & which FE design to choose | [12_PAGINATION_TYPES_FRONTEND_SYSTEM_DESIGN.md](./12_PAGINATION_TYPES_FRONTEND_SYSTEM_DESIGN.md) |
| 13 | WebSockets — how they work (handshake, frames, FE design) | [13_WEBSOCKETS_HOW_THEY_WORK.md](./13_WEBSOCKETS_HOW_THEY_WORK.md) |

---

## Suggested Study Order

1. Critical Rendering Path  
2. HTTP/1.1 vs HTTP/2 + network optimizations  
3. Bundle optimization / code splitting / lazy loading  
4. Reflow vs repaint / rendering performance  
5. Web Workers (CPU off main thread)  
6. Service Workers (network cache / offline / PWA)  
7. UI HLD drills (Pinterest grid + your project walkthrough)  

This order matches how a page loads: network → parse/render path → JS cost → runtime rendering smoothness → background capabilities.

---

## Quick Interview Map

| If asked about... | Talk about... |
|---|---|
| Slow first paint | CRP, critical CSS, defer JS, LCP preload |
| Large JS app startup | code splitting, lazy routes, tree-shaking, compression |
| Janky scroll/animation | reflow/repaint, layout thrashing, transform/opacity |
| Many assets loading slowly | HTTP/2 multiplexing, caching, CDN, waterfalls |
| UI freezes on heavy JS | Web Workers |
| Offline / repeat-visit speed / PWA | Service Workers + cache strategies |
| “What algorithm powers tree shaking?” | DCE + Module Dependency Graph + Mark-and-Sweep ([11](./11_TREE_SHAKING_MARK_AND_SWEEP.md)) |
| Offset vs cursor / infinite scroll | [12 Pagination](./12_PAGINATION_TYPES_FRONTEND_SYSTEM_DESIGN.md) — API vs UX layers |
| How WebSockets work / vs SSE | [13 WebSockets](./13_WEBSOCKETS_HOW_THEY_WORK.md) — Upgrade → 101 → full duplex |

---

## Core One-Liners

**Critical Rendering Path**  
HTML/CSS/JS → DOM/CSSOM → render tree → layout → paint → composite.

**Bundle optimization**  
Ship less JS now; split and lazy-load the rest.

**Reflow vs repaint**  
Reflow = geometry; repaint = pixels; animate transform/opacity.

**HTTP/2**  
Multiplex many requests on one connection; stop domain sharding.

**Web Worker**  
Background thread for CPU-heavy JS; no DOM; talks via `postMessage`.

**Service Worker**  
Background network proxy for caching/offline; intercepts `fetch`.

**Tree shaking (EM answer)**  
DCE on the module graph: mark reachable ESM exports from entry, sweep unmarked (Mark-and-Sweep).

**Pagination**  
API: offset/page vs cursor. UX: numbered pages vs load-more vs infinite scroll. Feeds → cursor; admin/SEO → pages.

**WebSocket**  
HTTP Upgrade → `101` → persistent full-duplex frames (`wss://`). Duplex chat/collab; server-only push → prefer SSE.

---

## Related

| Folder | What |
|---|---|
| [`../scenario-based-questions/`](../scenario-based-questions/INDEX.md) | Scenario interviews + [Licious managerial FE](../scenario-based-questions/LICIOUS_MANAGERIAL_FRONTEND.md) |

---

## Coming Next (when you send more)

Possible additions:

- Web Vitals (LCP, INP, CLS)
- Caching strategies (browser/CDN/service worker)
- SSR vs CSR vs hydration
- Image optimization strategy
- Scalability of large Angular apps
- Performance budgets & monitoring
- Web Vitals deep dive / monitoring tools

Send the next topics anytime and they can be added as separate MD files in this same folder.
