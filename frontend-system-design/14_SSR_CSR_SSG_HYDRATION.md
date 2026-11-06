# Rendering Strategies — CSR, SSR, SSG, ISR, Hydration

Interview-deep guide to **how HTML gets to the browser** and when to choose which mode.

**Already have a scenario angle:** [../scenario-based-questions/07_SEO_RENDERING_STRATEGIES.md](../scenario-based-questions/07_SEO_RENDERING_STRATEGIES.md)  
This file is the **system-design foundation** (definitions, hydration, tradeoffs, Angular/Next).

---

## Interview answers (say these first)

### 45–60s — “Explain SSR vs CSR vs SSG”

> **CSR** ships a thin HTML shell; the browser downloads JS, fetches data, then paints content — great for authenticated apps, weaker for SEO and first paint on content sites. **SSR** runs the app on the server per request and returns HTML with content already in it, then the client **hydrates** to attach interactivity — good for personalized or frequently changing public pages. **SSG** pre-renders HTML at **build time** and serves from a CDN — fastest and cheapest for marketing pages that don’t change per user. Modern apps are **hybrid**: SSG/ISR for marketing, CSR or authenticated SSR for `/app`.

### 20s — “What is hydration?”

> Hydration is when client JS attaches event handlers and framework state to **server- or build-generated HTML** so the page becomes interactive without throwing away the first paint.

---

## 1. Why rendering mode matters

| Concern | Why mode matters |
|---|---|
| **SEO / social previews** | Crawlers & OG bots want real HTML early |
| **LCP / FCP** | Content in first byte vs waiting for JS |
| **Personalization** | Per-user HTML needs SSR or client fetch |
| **Cost / scale** | SSG on CDN vs SSR compute per request |
| **Security** | Don’t SSR private data onto shared caches blindly |

**Don’t confuse:**

| Topic | File |
|---|---|
| Browser paint pipeline (DOM → pixels) | [01_CRITICAL_RENDERING_PATH.md](./01_CRITICAL_RENDERING_PATH.md) |
| Reflow/repaint jank | [03_REFLOW_REPAINT_RENDERING_PERFORMANCE.md](./03_REFLOW_REPAINT_RENDERING_PERFORMANCE.md) |
| **This file** | *Where* HTML is generated (server / build / client) |

---

## 2. CSR — Client-Side Rendering

```text
Browser                    CDN / static host              API
   |                              |                        |
   |-- GET / ------------------>  |                        |
   |<-- index.html (empty app root)                        |
   |-- GET main.js ------------>  |                        |
   |-- run Angular/React                                   |
   |-- GET /api/data ------------------------------------> |
   |<-- JSON ---------------------------------------------|
   |-- render UI into DOM                                  |
```

| Pros | Cons |
|---|---|
| Simple deploy (static) | Blank/sparse first HTML |
| Perfect for SPAs behind login | SEO / OG previews weak unless prerender |
| Rich interactivity | Extra round-trips before content |

**Use when:** dashboards, admin, authenticated product UI (`noindex` OK).

**Angular default mental model** for many internal apps = CSR SPA.

---

## 3. SSR — Server-Side Rendering

```text
Browser                         Node/Java SSR                    API
   |                                |                             |
   |-- GET /product/1 ------------> |                             |
   |                                |-- fetch data -------------->|
   |                                |<-- JSON --------------------|
   |                                |-- render HTML string        |
   |<-- full HTML + content --------|                             |
   |-- GET JS bundles                                             |
   |-- HYDRATE (attach listeners)                                 |
```

| Pros | Cons |
|---|---|
| Content in first response | Server CPU / TTFB |
| Good SEO + fresh data | Cache design harder |
| Personalized HTML possible | Ops complexity vs static |

**Use when:** public pages need **per-request** data (geo, auth-aware marketing, search results you want indexed).

**Angular:** Angular Universal / `@angular/ssr` + hydration (improving across v16–v20+).

---

## 4. SSG — Static Site Generation

```text
Build CI
  for each route → render HTML → write /dist/pricing/index.html
CDN
  serve HTML from edge (no app server per click)
Browser
  hydrate if JS islands / framework runtime needed
```

| Pros | Cons |
|---|---|
| Best TTFB (CDN) | Stale until rebuild / revalidate |
| Cheap at huge traffic | Huge site → long builds (mitigate ISR) |
| Excellent SEO | Bad for private per-user HTML |

**Use when:** home, pricing, docs, blogs — same HTML for everyone.

---

## 5. ISR / on-demand revalidation (hybrid static)

**Idea:** SSG + refresh without full site rebuild.

| Flavor | Behavior |
|---|---|
| Time-based | Revalidate every N seconds |
| On-demand | CMS publish webhook → regenerate that path |

**Say:**

> ISR gives static-speed serving with fresher content — sweet spot for marketing/CMS.

(Next.js popularized the name; other stacks have equivalents.)

---

## 6. Hydration (the confusing part — nail this)

### Without hydration

Server HTML is a **screenshot in HTML**. Buttons don’t work until JS runs and… if you **re-render from scratch**, you may flash or waste work.

### With hydration

1. User already sees HTML (fast paint)  
2. JS loads  
3. Framework **matches** virtual tree to existing DOM  
4. Attaches events / resumes state  

| Problem | Meaning |
|---|---|
| **Hydration mismatch** | Server HTML ≠ client first render → warnings / re-render |
| **Full hydration cost** | Big apps ship lots of JS before interactive (TTI) |
| **Progressive / incremental hydration** | Hydrate islands or defer non-critical parts |
| **Resumability** (other frameworks) | Different approach — attach with less replay |

**Angular angle:** non-destructive hydration, incremental hydration (recent majors) — mention as “ship less work before interactive.”

**Islands / partial hydration (Astro-style):** mostly static HTML; only interactive widgets get JS.

### Hydration mismatch — what it is & how to debug

**What:** Server-rendered HTML does not match what the client framework expects on first render → console warnings, DOM rip/replace, flicker, or broken event binding.

**Common causes**

| Cause | Example |
|---|---|
| Non-deterministic UI | `Date.now()`, `Math.random()`, `new Date().toLocaleString()` differ server vs client |
| Browser-only APIs during render | `window`, `localStorage`, `document` in first paint path |
| Locale / timezone formatting | Server UTC vs user browser |
| Auth/user-only branches | Server renders guest; client instantly renders logged-in |
| Invalid HTML nesting | Browser “fixes” DOM; virtual tree differs |
| Extensions mutating DOM | Less common; possible in debug |

**How to debug**

```text
1. Reproduce with SSR on; open browser console — look for hydration / mismatch warnings
2. Diff: View Page Source (server HTML) vs Elements after load
3. Binary-search the component tree — comment out suspects (dates, user menus)
4. Ensure first client render uses the same data the server used
5. Move browser-only code to afterNextRender / useEffect / browser checks
6. Prefer stable IDs from server data, not client-generated UUIDs on first paint
```

**Fixes**

- Render a stable placeholder on server + client, then enhance in `afterNextRender`  
- Pass serialized state from server to client (transfer state)  
- Avoid locale-sensitive formatting until hydrated (or use same locale on both)  
- Suppress only as last resort — fix root cause  

**Spoken (20s):**

> A hydration mismatch means server HTML and the client’s first render disagree. I hunt non-deterministic values and `window` usage during SSR, compare View Source to the live DOM, and defer browser-only UI until after hydrate.

---

## 7. Streaming SSR

```text
Server starts sending <head> + shell HTML early
  → browser paints sooner
  → rest of HTML streams as data resolves
```

Helps TTFB/LCP on slow backends. Mentions: React streaming / modern meta-frameworks; Angular evolving SSR story.

---

## 8. Decision matrix (memorize)

| Page type | Prefer | Why |
|---|---|---|
| Marketing home/pricing | **SSG** (+ ISR) | Same for all users, SEO |
| Blog/docs | **SSG**/ISR | Publish-driven freshness |
| Public search / personalized SEO page | **SSR** (+ cache carefully) | Per-request HTML |
| Logged-in dashboard | **CSR** (or auth SSR, noindex) | App UX, not crawl |
| Social share cards | Need HTML meta in first response | SSG/SSR, not pure CSR |

```text
Freshness need × Personalization × SEO value
  low × none × high     → SSG
  medium × none × high  → ISR
  high × yes × high     → SSR
  high × yes × low      → CSR
```

---

## 9. Hybrid architecture (senior default)

```text
www.example.com
  /                 SSG
  /pricing          SSG
  /blog/[slug]      SSG + on-demand revalidate
  /app/*            CSR Angular/React SPA (auth)
  /api/*            Backend
```

| Stack example | Fit |
|---|---|
| **Next.js** | React shop, mixed marketing + app |
| **Angular SSR + SPA** | Angular enterprise + some public pages |
| **Astro** | Content-heavy marketing, minimal JS |

---

## 10. CSR + prerender (middle ground)

Build-time crawl of routes → emit static HTML for bots, still CSR after. Useful for SPAs that need *some* SEO without full SSR ops. Tradeoff: not as flexible as real SSR for dynamic per-request HTML.

---

## 11. Interview Q bank

**Q: Does Google need SSR?**  
> Google can run JS, but HTML-first still wins for CWV, crawl efficiency, and non-Google scrapers (OG).

**Q: SSR vs SSG?**  
> SSR = per request. SSG = at build. Pick SSG when HTML is shared; SSR when it must differ per request.

**Q: What breaks hydration?**  
> `Date.now()`, random IDs, `window` access during SSR, browser-only APIs in first render.

**Q: Why is my SSR app still slow?**  
> Huge JS hydration, slow APIs on server, no streaming, blocking data waterfalls.

**Q: Angular app — do I need SSR?**  
> Internal IDMS/dashboard → usually CSR. Public marketing / SEO → yes or separate site.

---

## 12. Spoken — Provenir / enterprise angle

> For authenticated decisioning UIs I’d default to a high-quality **CSR Angular SPA** with lazy routes and strong CWV. If Provenir has public docs/marketing, those routes should be **SSG/ISR**, not forced through the same CSR shell.

---

## 13. Cheat sheet

```text
CSR  = JS in browser builds UI
SSR  = server HTML per request → hydrate
SSG  = HTML at build → CDN
ISR  = static + revalidate
Hydration = JS attaches to existing HTML

Marketing → SSG/ISR
Personalized public → SSR
App behind login → CSR
```

---

## Related

| Topic | File |
|---|---|
| SEO scenario | [../scenario-based-questions/07_SEO_RENDERING_STRATEGIES.md](../scenario-based-questions/07_SEO_RENDERING_STRATEGIES.md) |
| CRP | [01_CRITICAL_RENDERING_PATH.md](./01_CRITICAL_RENDERING_PATH.md) |
| Why Next vs Angular | [../angular-interview-prep/WHY_ANGULAR_VS_REACT_NEXT.md](../angular-interview-prep/WHY_ANGULAR_VS_REACT_NEXT.md) |
| **Angular SSR deep dive** | [../angular-interview-prep/ANGULAR_SSR.md](../angular-interview-prep/ANGULAR_SSR.md) |
| Angular SSR notes in versions | [../angular-interview-prep/ANGULAR_VERSION_FEATURES.md](../angular-interview-prep/ANGULAR_VERSION_FEATURES.md) |
