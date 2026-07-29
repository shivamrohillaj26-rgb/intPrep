# Scenario 9 — Scale React Monolith from 50k to 5M Users

**Prompt:** Your company plans to expand from 50,000 users to 5 million users. The current React application is a monolith. What architectural changes would you make to support scalability?

---

## 1. Clarify — frontend scale ≠ only “split the React app”

5M users stresses:

| Layer | Pressure |
|---|---|
| CDN / static assets | Bandwidth, cache hit ratio |
| Origin / BFF / APIs | RPS, DB, fan-out |
| Realtime | Connections, fan-out |
| Client perf | Low-end devices, slower networks globally |
| Org delivery | Many teams shipping one bundle |

**Interview point:** Scaling to 5M is **mostly platform + backend + edge**. Frontend architecture changes support **perf, team velocity, and failure isolation** — not magic user capacity by itself.

Ask: DAU vs MAU, peak RPS, geo distribution, SPA vs multi-surface (web/mobile).

---

## 2. What stays / what changes

### Keep (initially)

- One product UX if it still fits  
- Shared design system  
- Strong CI/CD (Scenario 10)  

### Change in waves

```
Wave 0  Measure & SLOs
Wave 1  Client performance & delivery (CDN, split, CWV)
Wave 2  Edge + BFF + API scalability (with backend)
Wave 3  Modularize frontend (package boundaries → optional MFEs)
Wave 4  Multi-region, resilience, offline/poor-network UX
```

**Why not “Module Federation on day one”:**  
MFEs solve **org scaling** more than **user traffic**. Premature MFE adds ops cost. Start with modular monolith + perf.

---

## 3. Wave 0 — Measure

- RUM: Web Vitals (LCP, INP, CLS) by geo/device  
- Error tracking (Sentry), traffic (CDN, API)  
- Bundle size budgets  
- Define SLOs: e.g. LCP p75 < 2.5s on 4G; API availability 99.9%  

Without baselines, “architecture” is vibes.

---

## 4. Wave 1 — Make the monolith scale *as a client*

### Delivery

- **CDN** for all static assets, long-cache hashed filenames  
- **HTTP/2/3**, Brotli/gzip  
- **Code splitting** — route-based + heavy libs (`React.lazy`)  
- **Tree shaking**, kill moment.js-style bombs  
- **Image/CDN** (responsive, modern formats)  
- Prefer **SSG/SSR hybrid** for public pages (Scenario 7)  

### Runtime

- Virtualize big lists (Scenario 8)  
- TanStack Query cache — fewer duplicate calls  
- Avoid giant Redux dumps (Scenario 4)  
- Feature flags for progressive rollout  

**Why CDN + split before rewriting architecture:**  
Often 10× perceived improvement at 1% of MFE cost.

---

## 5. Wave 2 — Backend / edge (you must own this narrative)

Frontend at 5M users dies if APIs die.

Collaborate on:

- **BFF** aggregation — fewer chattery calls from browsers  
- **Caching** — CDN/edge for public GETs; Redis for reads  
- **Pagination/cursors** everywhere  
- **Auth** — scalable session (opaque token + server), rate limits  
- **Rate limiting / bot** protection at edge  
- **Multi-region** API + failover  
- **Async jobs** for heavy exports/reports  

**Why BFF over “SPA calls 15 microservices”:**  
Browsers on mobile + CORS + fan-out amplify latency; BFF collapses round trips.

---

## 6. Wave 3 — Modularize the frontend (org + blast radius)

### Stage A — Modular monolith (recommended first)

```
apps/web/
  features/product/
  features/checkout/
  features/user/
  shared/ui/
  shared/api/
```

Enforce:

- No deep imports across features (lint boundaries / Nx)  
- Each feature owns data hooks + routes  
- Shared UI via package  

**Why modular monolith first:**  
Keeps one deploy while forcing boundaries you’ll need later.

### Stage B — Extract when justified

Extract to separate apps / Module Federation when:

- Teams block each other weekly on releases  
- Bundle contains huge unrelated surfaces  
- Need independent failure domains (Checkout isolation)  

See Scenario 3 for Federation details.

**Why not micro-frontends purely for “5M users”:**  
Users don’t care about your repo graph. Extract for **team autonomy & blast radius**, after modular monolith proves boundaries.

---

## 7. Multi-surface & progressive enhancement

At global 5M scale:

- **Responsive + low-end device budgets** (JS ≤ budget KB)  
- Consider **lite** mode / reduced motion / fewer live widgets  
- **Service worker** for static shell + offline read of key pages (careful with cache)  
- **i18n** and locale-aware CDN if expanding geos  

---

## 8. Resilience & rollout

- Feature flags (LaunchDarkly/Unleash)  
- Canary & percentage rollouts  
- Error boundaries around heavy features  
- Graceful degradation if a service is down  
- Client-side retry/backoff with jitter on idempotent GETs  

---

## 9. What I’d draw on the whiteboard

```
Users (global)
   ↓
CDN / Edge (static + cached HTML + WAF)
   ↓
Web app(s): modular React (→ optional MFEs later)
   ↓
BFF / API Gateway (auth, aggregate, rate limit)
   ↓
Services + caches + async workers + multi-region data
```

---

## 10. Why this over that

| Option | Role |
|---|---|
| “Just add Kubernetes to the SPA” | ❌ SPA is static; K8s doesn’t shrink JS |
| Split to MFEs immediately | Premature unless org pain is proven |
| Modular monolith + CDN + BFF | ✅ Best first architecture shift |
| SSR everything | Costly; hybrid by route |
| One giant Redux for all users’ data | ❌ Scales poorly (Scenario 4) |

**Chosen path:**  
> Scale **delivery & APIs** first; enforce **feature modules** in one React app; adopt **edge/BFF/caching** with backend; extract **MFEs only when team/deploy coupling demands it**. Measure CWV and API capacity the whole way.

---

## 11. 60-second spoken answer

> Five million users is primarily a **platform scaling** problem. I’d start with RUM/SLOs, then make the monolith fast and cacheable: CDN, aggressive code splitting, hybrid rendering for public pages, and sane data fetching. In parallel with backend I’d push a **BFF**, caching, pagination, and multi-region APIs—because the browser will expose every slow round trip. On the code side I’d move to a **modular monolith** with enforced boundaries so teams can ship safely; I’d only split into **Module Federation** when release coupling justifies the ops cost. Feature flags and canaries protect the rollout.

---

## Related

- Scenario 3 — MFE details  
- Scenario 7 — rendering for public scale  
- Scenario 10 — CI/CD for frequent safe deploys  
- `../frontend-system-design/02_BUNDLE_OPTIMIZATION_CODE_SPLITTING_LAZY_LOADING.md`
