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
| 10 | **Auth:** token storage, HttpOnly cookies, XSS/CSRF hardening | [10_FRONTEND_AUTH_SECURITY.md](./10_FRONTEND_AUTH_SECURITY.md) |
| 11 | Tree shaking under the hood (Mark-and-Sweep / DCE) | [11_TREE_SHAKING_MARK_AND_SWEEP.md](./11_TREE_SHAKING_MARK_AND_SWEEP.md) |
| 12 | Pagination types & which FE design to choose | [12_PAGINATION_TYPES_FRONTEND_SYSTEM_DESIGN.md](./12_PAGINATION_TYPES_FRONTEND_SYSTEM_DESIGN.md) |
| 13 | WebSockets — how they work (handshake, frames, FE design) | [13_WEBSOCKETS_HOW_THEY_WORK.md](./13_WEBSOCKETS_HOW_THEY_WORK.md) |
| 14 | Rendering: CSR / SSR / SSG / ISR / hydration | [14_SSR_CSR_SSG_HYDRATION.md](./14_SSR_CSR_SSG_HYDRATION.md) |
| 15 | Micro Frontends → **moved** | [../micro-frontends/INDEX.md](../micro-frontends/INDEX.md) |
| 16 | **Your** Netradyne IDMS project HLD (from `Desktop/Ternary`) | [16_NETRADYNE_IDMS_PROJECT_HLD.md](./16_NETRADYNE_IDMS_PROJECT_HLD.md) |
| 17 | **Cyberattacks** (XSS, CSRF, clickjacking, MITM…) + prevention | [17_CYBERATTACKS_FRONTEND_INTERVIEW.md](./17_CYBERATTACKS_FRONTEND_INTERVIEW.md) |
| 18 | **Your** Netradyne DevOps / Jenkins / S3 / envs (from `Desktop/Ternary`) | [18_NETRADYNE_DEVOPS_CI_CD.md](./18_NETRADYNE_DEVOPS_CI_CD.md) |
| 19 | **IndexedDB** (usage, vs localStorage / Cache API) | [19_INDEXEDDB.md](./19_INDEXEDDB.md) |
| 20 | **CDN** (edge cache, hashed assets, SPA deploy) | [20_CDN.md](./20_CDN.md) |
| 24 | **NUX notifications** — FCM push, not WS / not poll | [../onetrust/ONETRUST_NOTIFICATIONS_FCM.md](../onetrust/ONETRUST_NOTIFICATIONS_FCM.md) |

---

## Suggested Study Order

1. Critical Rendering Path  
2. HTTP/1.1 vs HTTP/2 + network optimizations  
3. Bundle optimization / code splitting / lazy loading  
4. Reflow vs repaint / rendering performance  
5. **CSR/SSR/SSG/hydration** ← [14](./14_SSR_CSR_SSG_HYDRATION.md)  
6. Web Workers (CPU off main thread)  
7. Service Workers (network cache / offline / PWA)  
8. **Micro frontends** ← [../micro-frontends/INDEX.md](../micro-frontends/INDEX.md)  
9. UI HLD drills (Pinterest grid + your project walkthrough)  

This order matches how a page loads: network → parse/render path → JS cost → runtime rendering smoothness → background capabilities → composition at org scale.

---

## Quick Interview Map

| If asked about... | Talk about... |
|---|---|
| Slow first paint | CRP, critical CSS, defer JS, LCP preload |
| Large JS app startup | code splitting, lazy routes, tree-shaking, compression |
| Janky scroll/animation | reflow/repaint, layout thrashing, transform/opacity |
| Many assets loading slowly | HTTP/2 multiplexing, caching, [CDN](./20_CDN.md), waterfalls |
| What is a CDN / how do you cache SPA assets? | [20 CDN](./20_CDN.md) — edge PoPs, hashed bundles, index.html TTL |
| UI freezes on heavy JS | Web Workers |
| Offline / repeat-visit speed / PWA | Service Workers + cache strategies |
| “What algorithm powers tree shaking?” | DCE + Module Dependency Graph + Mark-and-Sweep ([11](./11_TREE_SHAKING_MARK_AND_SWEEP.md)) |
| Offset vs cursor / infinite scroll | [12 Pagination](./12_PAGINATION_TYPES_FRONTEND_SYSTEM_DESIGN.md) — API vs UX layers |
| How WebSockets work / vs SSE | [13 WebSockets](./13_WEBSOCKETS_HOW_THEY_WORK.md) — Upgrade → 101 → full duplex |
| NUX bell / push notifications (FCM vs poll vs WS) | [onetrust FCM](../onetrust/ONETRUST_NOTIFICATIONS_FCM.md) |
| SSR vs CSR vs SSG / hydration | [14 Rendering strategies](./14_SSR_CSR_SSG_HYDRATION.md) |
| Micro frontends / Module Federation | **[micro-frontends/](../micro-frontends/INDEX.md)** (overview, NUX plan, story, 3-team scenario) |
| “Explain HLD of your project” (Netradyne) | [16 IDMS HLD](./16_NETRADYNE_IDMS_PROJECT_HLD.md) + generic script [08](./08_PROJECT_HLD_WALKTHROUGH.md) |
| JWT / cookies / where to store tokens | [10 Auth security](./10_FRONTEND_AUTH_SECURITY.md) |
| Cyberattacks / XSS / CSRF / OWASP-ish | [17 Cyberattacks](./17_CYBERATTACKS_FRONTEND_INTERVIEW.md) |
| “How do you deploy / Jenkins / DevOps?” (Netradyne) | [18 DevOps CI/CD](./18_NETRADYNE_DEVOPS_CI_CD.md) |
| IndexedDB / offline storage / vs localStorage | [19 IndexedDB](./19_INDEXEDDB.md) |

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

**CSR / SSR / SSG**  
CSR = JS builds UI in browser. SSR = HTML per request then hydrate. SSG = HTML at build on CDN. Marketing → SSG/ISR; app → CSR.

**Micro frontends**  
Independently deployed UIs composed at runtime (host + remotes); share framework as singleton; integrate via URL/API. → [../micro-frontends/INDEX.md](../micro-frontends/INDEX.md)

**Cyberattacks (FE)**  
XSS = attacker JS on your page. CSRF = foreign site + your cookies. Prevent with escape/CSP, SameSite/CSRF tokens, HTTPS, API authZ.

**IndexedDB**  
Async browser object DB for large/offline data; not sync strings like localStorage; not for secrets.

**CDN**  
Geo edge servers cache static assets near users; hash filenames for long TTL, keep `index.html` fresh.

---

## Related

| Folder | What |
|---|---|
| [`../scenario-based-questions/`](../scenario-based-questions/INDEX.md) | Scenario interviews + [Licious](../scenario-based-questions/LICIOUS_MANAGERIAL_FRONTEND.md) + [Provenir](../scenario-based-questions/PROVENIR_SOFTWARE_ENGINEER_INTERVIEW_PREP.md) |

---

## Coming Next (when you send more)

Possible additions:

- Web Vitals (LCP, INP, CLS) deep dive / monitoring  
- Caching strategies (browser/CDN/service worker)  
- Image optimization strategy  
- Scalability of large Angular apps  

Send the next topics anytime and they can be added as separate MD files in this same folder.
