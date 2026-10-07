# Licious Managerial Round — Frontend Engineer (Deep Prep)

Questions shared from a **managerial round** at Licious. Mix of deep tech, system design, project storytelling, and behavioral judgment.

**Answer in Angular** (HttpClient, RxJS, `loadChildren`, `@angular/ssr`, NgZone). If they say React, translate — don’t stay in React Query / Next.

Use this structure for every answer:

1. **One-liner definition**  
2. **How it works** (with a concrete example)  
3. **When / why choose X over Y**  
4. **What you’ve done / would do** (project voice)  
5. **Tradeoffs / pitfalls** (sounds senior)

Related deeper guides are linked at the end of each section.

---

## Quick map

| # | Topic | What they’re testing |
|---|---|---|
| 1 | SSE vs WebSockets | Real-time transport judgment |
| 2 | Bundle analysis & optimize | Perf ownership, tooling |
| 3 | gRPC vs JSON | Cross-stack awareness |
| 4 | Conflict with backend | Collaboration / leadership |
| 5 | Walk previous projects | Impact storytelling |
| 6 | SSR & SEO | Rendering strategy |
| 7 | Perf opts at company | Evidence, metrics |
| 8 | Tree-shaking “algorithm” | Bundler internals |
| 9 | BFF architecture | Frontend-adjacent system design |

---

## 1. SSE vs WebSockets — when would you choose one over the other?

### One-liner

> **SSE** = server → browser one-way text stream over HTTP.  
> **WebSocket** = full-duplex persistent binary/text channel after an HTTP upgrade.

### How they work

```text
SSE:
  Browser GET /events (Accept: text/event-stream)
  Server keeps connection open, sends:
    data: {"price": 120}\n\n
  Browser EventSource fires message events
  Auto-reconnect is built into EventSource

WebSocket:
  Browser GET with Upgrade: websocket
  Connection becomes ws://…
  Both sides send frames anytime
```

### Tiny examples

**SSE — order status / live notifications (Angular):**

```ts
readonly status = toSignal(
  new Observable<string>((sub) => {
    const es = new EventSource('/api/order-status?id=123');
    es.onmessage = (e) => sub.next(JSON.parse(e.data).status);
    return () => es.close();
  }).pipe(takeUntilDestroyed()),
);
```

**WebSocket — chat / driver location (pump outside Zone, see scenario 5):**

```ts
this.ngZone.runOutsideAngular(() => {
  const ws = new WebSocket('wss://api.example.com/live');
  ws.onmessage = (e) => {
    const patch = JSON.parse(e.data);
    this.ngZone.run(() => this.applyPatch(patch));
  };
});
```

### When to choose which

| Need | Choose | Why |
|---|---|---|
| Server pushes updates; client rarely talks | **SSE** | Simpler, HTTP-friendly, auto-reconnect, works with many proxies/CDNs better |
| Client and server both chatter continuously | **WebSocket** | True duplex |
| Binary frames, custom protocols, games | **WebSocket** | Binary + lower framing overhead |
| “Live feed” of notifications / stock / scores | **SSE** often enough | One direction matches the product |
| Behind strict corporate proxies | **SSE** sometimes easier | Looks like long-lived HTTP |
| Need request/response multiplexing on same socket | **WebSocket** (or gRPC streams) | More flexible |

### Why not always WebSocket?

- More ops: sticky sessions, reconnect logic, heartbeats, auth refresh mid-socket  
- Overkill if UI only **listens**  
- Harder to cache/debug than HTTP  

### Why not always SSE?

- **Browser → server** on the same channel is not the model (you use normal HTTP POST alongside)  
- Text/event-stream only (not arbitrary binary)  
- Connection limits per browser (older constraint; still mention)  
- Some intermediaries buffer/time out long HTTP  

### Spoken 30s

> If the product is mostly server push — order tracking, notification feed — I’d start with **SSE**: simpler, HTTP-native, EventSource reconnects for free. If we need bidirectional realtime — chat, multiplayer cursors, client sending high-frequency input — I’d use **WebSockets**. I’d also consider whether polling/batched HTTP is enough before either.

**Also see:**  
- How WS works (handshake/frames): [../frontend-system-design/13_WEBSOCKETS_HOW_THEY_WORK.md](../frontend-system-design/13_WEBSOCKETS_HOW_THEY_WORK.md)  
- High-frequency UI freezes: [05_WEBSOCKET_HIGH_FREQUENCY_UPDATES.md](./05_WEBSOCKET_HIGH_FREQUENCY_UPDATES.md)  
- Polling dashboards: [01_DASHBOARD_WIDGETS_POLLING.md](./01_DASHBOARD_WIDGETS_POLLING.md)

---

## 2. How do you analyze bundle size, and how do you optimize it?

### Analyze (tools + process)

1. **Production build** (never analyze `ng serve` / Vite dev — sizes lie)  
2. **Bundle analyzer**
   - Webpack: `webpack-bundle-analyzer`  
   - Vite/Rollup: `rollup-plugin-visualizer`  
   - Next: `@next/bundle-analyzer`  
   - Angular: `source-map-explorer` / budget in `angular.json`  
3. Look for:
   - Giant dependencies (moment, lodash full, chart libs)  
   - Duplicate packages (two `@angular/core`, two RxJS)  
   - Eager routes that should be lazy  
   - Unused exports pulled in (sideEffects / bad imports)  
4. Track **budgets** in CI — fail PR if main chunk grows > N KB  
5. RUM: correlate LCP/TTI with deploy that grew the bundle  

```bash
# mental workflow
npm run build
npx source-map-explorer dist/**/*.js
# or open stats.html from visualizer
```

### Optimize (ordered by ROI)

| Lever | Example |
|---|---|
| **Code split by route** | Angular `loadChildren` / `loadComponent` / `@defer` / dynamic `import()` |
| **Lazy heavy widgets** | Chart, editor, PDF only on open |
| **Tree-shake friendly imports** | `import debounce from 'lodash-es/debounce'` not full lodash |
| **Replace heavy libs** | `date-fns` / `dayjs` instead of `moment` |
| **Minify + compress** | Terser/esbuild + Brotli/gzip on CDN |
| **Kill dead code / feature flags** | Don’t ship unused admin tools to consumer app |
| **Shared vendor chunk carefully** | Avoid mega-vendor that changes every build |
| **Image/font out of JS** | Don’t base64 huge assets into bundles |

### Concrete “story” example

> Catalog page pulled in a full charting library for one sparkline on hover. Analyzer showed ~200KB. We lazy-loaded the chart on hover and cut initial JS; LCP improved on mobile.

### Spoken 30s

> I analyze **production** bundles with a visualizer, find the top offenders, then split by route, lazy-load heavy UI, switch to tree-shakeable imports, and set CI size budgets so regressions don’t sneak in. Optimization without measurement is guessing.

**Also see:** [../frontend-system-design/02_BUNDLE_OPTIMIZATION_CODE_SPLITTING_LAZY_LOADING.md](../frontend-system-design/02_BUNDLE_OPTIMIZATION_CODE_SPLITTING_LAZY_LOADING.md)

---

## 3. Explain gRPC — how does it improve data transmission compared to JSON?

### One-liner

> **gRPC** is an RPC framework over **HTTP/2** using **Protocol Buffers** (binary, schema-first) instead of ad-hoc JSON over HTTP/1-style REST.

### How it improves vs typical JSON/REST

| Dimension | JSON REST | gRPC + Protobuf |
|---|---|---|
| Payload | Text text (verbose keys) | Compact **binary** |
| Contract | OpenAPI/docs (optional) | `.proto` **required schema** |
| Transport | Often HTTP/1.1 + JSON | **HTTP/2** multiplexing, streams |
| Streaming | Awkward (SSE/WS separate) | Built-in unary + client/server/bidi streams |
| Codegen | Hand-written clients | Generated stubs (type-safe) |
| Browser | Native | Needs **gRPC-Web** or Envoy proxy |

### Example mental model

```protobuf
// order.proto
message OrderStatus {
  string order_id = 1;
  string status = 2;   // field numbers, not repeated key names
}
```

JSON might send:

```json
{"order_id":"A1","status":"OUT_FOR_DELIVERY"}
```

Protobuf sends a tight binary encoding of field `1` and `2` — smaller on the wire, faster to parse at scale (especially mobile + chatty microservices).

### Frontend angle (important for Licious-style apps)

Browsers don’t speak raw gRPC well. Common pattern:

```text
Web app → BFF / Envoy (gRPC-Web) → internal gRPC microservices
```

Or: browser still uses **JSON/REST or GraphQL**; **service-to-service** uses gRPC.

### When you’d still choose JSON

- Public browser APIs, easy debugging (`curl`, Network tab)  
- Heterogeneous clients, quick iteration  
- Caching at CDN for GETs  

### Spoken 30s

> gRPC uses Protobuf binary schemas over HTTP/2, so payloads are smaller and typed, with first-class streaming. Compared to chatty JSON REST, that helps internal service performance. On the web I’d usually put gRPC behind a **BFF or gRPC-Web proxy**, and keep the browser on HTTP/JSON or gRPC-Web — not raw gRPC.

---

## 4. Scenario — conflict with the backend team

Managers care about **process and outcomes**, not “I was right.”

### STAR framework (use this)

| | |
|---|---|
| **S**ituation | What broke (API contract, timeline, ownership) |
| **T**ask | Your responsibility (ship feature X by date) |
| **A**ction | How you de-escalated + aligned |
| **R**esult | Shipped / metrics / relationship improved |

### Example answer (customize with your real story)

**Situation:** Backend changed a cart API response shape without versioning; checkout broke in staging two days before release.

**Task:** Unblock release without blame games; protect users.

**Action:**

1. **Reproduce + share evidence** — failing network payload, expected contract, error rates (not opinions)  
2. **Short sync** — FE + BE (+ PM if scope) — agree on user impact  
3. **Propose options with tradeoffs**
   - Hotfix BE to restore old shape (fastest for users)  
   - FE adapter layer temporarily (if BE can’t deploy)  
   - Versioned endpoint `/v2` going forward  
4. **Write down the contract** — OpenAPI / shared types / Pact test so it doesn’t recur  
5. **Retro** — “How do we review API changes?” not “Who messed up?”

**Result:** Shipped with adapter + BE fix next day; added contract test in CI; weekly API review for checkout domain.

### Phrases that land well

- “I optimized for the **customer** and the **date**, then for the clean architecture.”  
- “I separated **urgent hotfix** from **long-term contract ownership**.”  
- “I assumed good intent; we disagreed on approach, not goals.”  

### What not to say

- “Backend is always careless.”  
- “I just waited for them to fix it.”  
- “I silently patched and never told anyone.”  

### Decision framework when stuck

```text
User impact high? → stabilize production first
Contract unclear? → document + version
Repeated conflict? → process (API review, ownership, SLA)
```

---

## 5. Walk through your previous projects

Managers want **impact**, not a tech laundry list.

### Template (2–3 minutes per project)

```text
1. Context — product, users, your role
2. Problem — what hurt (biz or UX metric)
3. What you built — architecture in 3 bullets
4. Your decisions — why this stack/pattern
5. Impact — numbers if possible
6. What you’d improve now — humility + growth
```

### Example skeleton (e-commerce / delivery style)

> At [Company], I owned the **checkout / catalog** web experience for [N] users.  
> **Problem:** mobile conversion lagged; product list LCP was ~4s on 4G.  
> **What I did:** route-level code splitting, image CDN, TanStack Query for catalog cache, BFF aggregation for PDP.  
> **Impact:** LCP p75 down to ~2.3s; checkout error rate down X%.  
> **Tradeoff:** We deferred micro-frontends; modular monolith was enough for team size.  
> **Next:** I’d add stronger contract tests with the cart service.

### Prepare 2 projects

| Project | Have ready |
|---|---|
| Strongest ownership | Deep architecture + conflict + metric |
| Different skill | Perf **or** design system **or** auth |

### Tips

- Draw a quick box diagram verbally: `CDN → Web → BFF → services`  
- Mention **one failure** and what you learned  
- Tie to Licious domains if relevant: catalog, cart, orders, realtime tracking, SEO for landing pages  

**Also see:** [../frontend-system-design/08_PROJECT_HLD_WALKTHROUGH.md](../frontend-system-design/08_PROJECT_HLD_WALKTHROUGH.md)

---

## 6. Server-Side Rendering and its SEO benefits

### One-liner

> **SSR** renders HTML on the server per request so the **first response already contains content** crawlers and users can read — then the browser hydrates for interactivity.

### CSR vs SSR (SEO angle)

```text
CSR:
  HTML ≈ empty shell → JS → fetch → paint content
  Crawlers / OG scrapers may see little content

SSR:
  HTML already has title, H1, product text, links
  Faster first contentful paint for content pages
  Hydration attaches Angular event handlers (`@angular/ssr`)
```

### SEO benefits (be precise)

1. **Content in raw HTML** — better for indexing & social previews (OG tags present without running JS)  
2. **Faster meaningful first paint** — helps Core Web Vitals → indirect ranking signal  
3. **Crawl efficiency** — less dependence on Google’s JS renderer  
4. **Shareable links** — meta/description correct when Slack/WhatsApp unfurl  

### Licious-relevant example

- Marketing / category / product SEO pages → **SSR or SSG/ISR**  
- Logged-in account dashboard → CSR is fine (`noindex` if needed)  

### Caveats (sounds senior)

- SSR ≠ automatic page-1 ranking (content, links, CWV, intent still matter)  
- Hydration cost can hurt INP if you ship huge JS  
- TTFB/server cost — cache HTML at CDN when pages aren’t personalized  

### Spoken 30s

> SSR sends fully formed HTML so crawlers and users see content immediately, which helps indexability and social previews versus a CSR shell. For marketing and PDP-like pages I’d use SSR or static generation with revalidation; for authenticated app shells CSR is fine. SEO still needs good meta, canonicals, and performance — rendering is necessary but not sufficient.

**Also see:** [07_SEO_RENDERING_STRATEGIES.md](./07_SEO_RENDERING_STRATEGIES.md)

---

## 7. What performance optimizations have you implemented?

Answer with **metric → action → result**. Prepare 3 real bullets from your career; below are strong templates.

### Template bullets

1. **Bundle / startup**  
   > Route-based splitting + removed moment (~200KB). Main JS −35%; TTI improved on mid Android.

2. **Runtime rendering**  
   > Virtualized long order/history lists; DOM nodes from 10k → ~30 visible. Scroll INP stable.

3. **Network / data**  
   > `shareReplay` / `resource()` so product GETs on PLP dedupe. Requests/page −40%.

4. **Images**  
   > Responsive `srcset` + WebP via CDN; LCP image preload. LCP p75 3.8s → 2.4s.

5. **Third parties**  
   > Deferred analytics until idle; removed sync tag in `<head>`.

6. **API shape**  
   > BFF aggregated PDP (3 calls → 1). Mobile PDP interactive sooner.

### How to speak it

```text
Before: <metric + device>
Action: <what you changed>
After: <metric>
How we knew: Lighthouse / Web Vitals RUM / analyzer
```

### If they dig deeper

- How you prevented regression → **performance budgets in CI**  
- How you prioritized → RUM by page + business funnel (PLP → PDP → cart)  

**Also see:** [../frontend-system-design/03_REFLOW_REPAINT_RENDERING_PERFORMANCE.md](../frontend-system-design/03_REFLOW_REPAINT_RENDERING_PERFORMANCE.md), scenario [08](./08_LARGE_TABLE_100K_ROWS.md)

---

## 8. What algorithm is used for tree-shaking? What happens behind the scenes?

### Don’t stop at the “what”

| Level | Answer |
|---|---|
| ❌ Junior | “It removes unused code.” |
| ✅ Senior | Names the **how**: DCE on a **Module Dependency Graph** via **Mark-and-Sweep** reachability |

### Senior one-liner

> Tree shaking is **Dead Code Elimination (DCE)** on a **Module Dependency Graph**, traversed with a reachability walk (**DFS/BFS**) rooted in **Mark-and-Sweep** — GC logic applied at build time to modules/exports.

### Exactly how it works

**Step 1 — Build the Module Graph**  
Webpack/Rollup parse static `import`/`export` → directed graph:  
`node = module`, `edge = depends on`.

This needs **ESM**. `require()` is dynamic → graph can’t be fully known → tree shaking fails or stays conservative.

**Step 2 — Mark phase (reachability)**  
From entry (`index.js` / `main.ts`), walk the graph (DFS/BFS).  
**Mark** every export that live code actually references.  
Unreferenced exports → never marked.

**Step 3 — Sweep phase**  
Never-marked code is dead → eliminated from the final bundle.

```text
entry → mark reachable imports/exports → sweep unmarked (DCE)
Same family as Mark-and-Sweep GC, at module/AST level
```

```js
// utils.js
export function used() { return 1; }
export function unused() { return 2; } // never marked → swept

// app.js
import { used } from './utils';
used();
```

### Caveats to add (sounds complete)

| Issue | Effect |
|---|---|
| Side effects / missing `sideEffects: false` | Bundler keeps more code |
| CommonJS | Weak/no shaking |
| Dynamic `import(variable)` | Edge unresolved |
| Minifier | Extra DCE *inside* kept files (separate from tree shake) |

### Spoken 30s (EM-ready)

> Most people say tree shaking removes unused code — that’s the *what*. The *how* is dead-code elimination on the module dependency graph: bundlers build a directed graph from static ESM imports, **mark** everything reachable from the entry with a graph walk, and **sweep** unmarked exports out of the bundle — Mark-and-Sweep at build time. That’s why ESM shakes and CommonJS usually doesn’t.

**Deep dive:** [../frontend-system-design/11_TREE_SHAKING_MARK_AND_SWEEP.md](../frontend-system-design/11_TREE_SHAKING_MARK_AND_SWEEP.md)

---

## 9. Explain the architecture of a BFF (Backend-for-Frontend) layer

### One-liner

> A **BFF** is an API layer **shaped for one client experience** (web, iOS, Android) that sits between the UI and many downstream services — aggregation, auth, and response tailoring live here.

### Why it exists

Without BFF:

```text
Browser
  → Product service
  → Price service
  → Inventory service
  → Recommendations service
(many round trips, over-fetch, CORS, token fan-out)
```

With BFF:

```text
Browser → Web BFF → internal services (often gRPC)
             ↓
        one PDP JSON shaped for the web UI
```

### Responsibilities (typical)

| Concern | In BFF? |
|---|---|
| Aggregate multiple backends into one UI payload | ✅ |
| Trim fields the web doesn’t need | ✅ |
| Session/cookie auth for browser; service auth downstream | ✅ |
| Orchestrate checkout steps | ✅ often |
| Own core domain DB as source of truth | ❌ usually not — domain services do |
| Business rules duplicated forever | ⚠️ keep thin; don’t become a monolith dump |

### Architecture sketch

```text
┌────────────┐
│  Web app   │
└─────┬──────┘
      │ HTTPS JSON (or GraphQL)
┌─────▼──────┐
│  Web BFF   │  auth, aggregate, cache, map DTO → UI model
└─────┬──────┘
      │ gRPC / internal HTTP
 ┌────┼────┬─────────┐
 ▼    ▼    ▼         ▼
Product Price Inventory Recommendations
```

Mobile may have a **separate Mobile BFF** if payloads/UX differ — that’s the “for Frontend” part.

### Example — Product detail page

**UI needs:** title, price, ETA, 3 images, “add to cart” eligibility.

BFF:

1. Parallel calls to product + price + inventory  
2. Merges into `{ title, price, eta, images, canAdd }`  
3. Returns one response → fewer mobile round trips  

### Tradeoffs

| Pros | Cons |
|---|---|
| Fewer client round trips | Extra hop / ownership boundary |
| Hide internal APIs | Can become “god service” if overloaded |
| Browser-friendly auth | Must version carefully with UI |
| Team autonomy (web vs mobile) | Duplication across BFFs if not shared carefully |

### Spoken 30s

> A BFF is a backend tuned to a specific client. The web app talks to one Web BFF that aggregates product, price, inventory — often over gRPC internally — and returns a UI-shaped DTO. That cuts chattiness and keeps tokens/CORS simpler. I’d keep domain logic in domain services and keep the BFF focused on orchestration and adaptation.

**Also see:** scenarios [01](./01_DASHBOARD_WIDGETS_POLLING.md), [09](./09_SCALE_MONOLITH_TO_MILLIONS.md)

---

## End-to-end “manager vibe” checklist

Before the round, prepare:

- [ ] SSE vs WS decision table (one product example each)  
- [ ] Bundle analyzer screenshot story + one size win  
- [ ] gRPC: binary + HTTP/2 + “browser via BFF”  
- [ ] One conflict STAR story with a happy process ending  
- [ ] Two projects with metrics  
- [ ] SSR vs SSG vs CSR for SEO pages  
- [ ] Three perf wins with before/after  
- [ ] Tree-shaking = ESM graph + DCE + sideEffects caveat  
- [ ] BFF box diagram you can draw from memory  

---

## 60-second cheatsheet answers

| Q | Punchline |
|---|---|
| SSE vs WS | Push-only → SSE; duplex → WebSocket |
| Bundle | Prod build → analyzer → split/lazy/replace libs → CI budgets |
| gRPC | Protobuf + HTTP/2; smaller/faster internal RPC; browser via proxy/BFF |
| Conflict | Evidence → options → user-first hotfix → contract/process |
| Projects | Problem → your decisions → metric → lesson |
| SSR SEO | HTML has content for crawlers/OG; hybrid by route |
| Perf | Metric-driven: split, images, virtualize, query cache, BFF |
| Tree-shake | DCE + module graph + Mark-and-Sweep (not just “removes unused code”) |
| BFF | Per-client API: aggregate/adapt/auth; not the domain DB |

---

## Related folders

| Folder | Use for |
|---|---|
| [`../frontend-system-design/`](../frontend-system-design/INDEX.md) | Bundles, CRP, workers, auth |
| [`./INDEX.md`](./INDEX.md) | Broader scenario redesigns |
| [`../javascript-interview-prep/`](../javascript-interview-prep/INDEX.md) | Coding depth if they pivot |
