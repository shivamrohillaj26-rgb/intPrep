# HTTP/1.1 vs HTTP/2 & Network Optimizations — Interview Guide

Deep guide with **real load examples** (including Angular), waterfalls, and when protocol choice actually changes what you ship.

---

## Interview answers (say these first)

### 60s — HTTP/1.1 vs HTTP/2

> In HTTP/1.1 each TCP connection effectively handles **one request at a time**, so browsers open ~6 connections per origin and still queue the rest. That made many small files painful — teams concatenated JS/CSS, used sprites, and domain-sharded CDNs. **HTTP/2 multiplexes many streams on one connection**, compresses headers, and prioritizes better, so an Angular app with `main.js` + lazy chunks + CSS + fonts can download in parallel without sharding. I still optimize bytes, caching, CDN, and waterfalls — protocol upgrade isn’t enough.

### 45s — Angular angle

> On **HTTP/2**, Angular’s natural model — **route-level code splitting** into many hashed chunks — works well: multiplexed downloads + fine-grained cache. On **HTTP/1.1**, too many tiny chunks can stall behind the 6-connection limit, so I’d merge more aggressively or accept slower multi-route apps. In practice almost all production CDNs are **h2/h3**; I verify in DevTools Protocol column. I don’t “choose HTTP/1” for new apps — I design **as if h2**, and only special-case ancient environments.

---

## 1. Why Frontend Engineers Care About HTTP Versions

Frontend performance is not only JS/CSS quality.

Network waterfalls dominate RUM:

- DNS lookup  
- TCP/TLS handshake  
- **request queueing** (this is where h1 vs h2 hurts)  
- download time  
- resource prioritization  

**Interview one-liner:**

> HTTP/1.1 vs HTTP/2 differs mainly in how multiple resources share connections; HTTP/2 multiplexing removes most HTTP/1.1 workarounds and makes parallel loading of Angular chunks practical.

---

## 2. Quick Networking Path For A Page

```text
Type URL
-> DNS resolve
-> TCP connect
-> TLS handshake (HTTPS)
-> HTTP request (HTML)
-> server response
-> browser parses → discovers CSS/JS/fonts/images
-> more HTTP requests (this is the storm)
-> parse / execute / paint
```

First HTML **discovers** the dependency tree. Angular apps discover even more after JS runs (lazy routes).

---

## 3. Concrete example — same Angular app, two protocols

Imagine a production Angular shop app after `ng build`:

```text
index.html
styles-ABC.css
main-DEF.js          ← ~300 KB
polyfills-GHI.js     ← if zone still present
runtime-JKL.js
chunk-home-MNO.js
chunk-catalog-PQR.js
chunk-vendor-STU.js  ← charts / Material bits
font.woff2
logo.svg
api/products         ← XHR after bootstrap
```

On first visit to `/` the browser may need **~8–15** downloads quickly (HTML + CSS + several JS + font + API).

### 3.1 Under HTTP/1.1 — what actually happens

```text
Origin: https://shop.example.com
Browser opens up to ~6 TCP+TLS connections to that origin.

Connection 1:  GET styles.css        [====slow====]
Connection 2:  GET main.js           [========]
Connection 3:  GET polyfills.js      [===]
Connection 4:  GET runtime.js        [==]
Connection 5:  GET font.woff2        [====]
Connection 6:  GET logo.svg          [==]

Queue waiting (no free connection yet):
  - chunk-home.js
  - chunk-vendor.js
  - /api/products   (often after JS runs anyway)
```

**Pain points:**

1. **Only ~6 in flight** to one origin — 7th request **waits**.  
2. Each new connection may pay **extra TLS** cost (less with keep-alive reuse, still heavier than one h2 conn).  
3. A **slow** CSS on conn 1 doesn’t block other conns, but anything **queued** on a busy conn waits (**HTTP HOL** on that connection).  
4. Teams historically **merged** files so “6 slots” were enough.

**Felt UX:** main bundle waits behind other assets; lazy chunk starts late; TTI climbs.

### 3.2 Under HTTP/2 — what actually happens

```text
One TLS connection to shop.example.com

Streams (multiplexed, interleaved frames):
  stream 1: GET index.html
  stream 3: GET styles.css
  stream 5: GET main.js
  stream 7: GET runtime.js
  stream 9: GET polyfills.js
  stream 11: GET font.woff2
  stream 13: GET logo.svg
  stream 15: GET chunk-home.js     ← no need to wait for a free “slot”
  ...
```

**Wins:**

1. **Many requests in parallel** on one connection.  
2. **HPACK** shrinks repeated headers (`cookie`, `user-agent`, `accept-language`…).  
3. Browser can **prioritize** CSS/main over logo.  
4. Angular’s **many hashed chunks** become viable.

**Felt UX:** assets overlap in the Network waterfall (parallel bars), less artificial queueing.

### 3.3 Side-by-side waterfall (sketch)

```text
HTTP/1.1                          HTTP/2
| CSS  ========|                  | CSS  ========|
| main ========|                  | main ========|
| poly ======|                    | poly ======|
| run  ====|                      | run  ====|
| font =====|                     | font =====|
| logo ==|                        | logo ==|
|      [WAIT] home chunk          | home =====|   ← starts earlier
|      [WAIT] vendor              | vendor =======|
```

**This is the “actual difference” interviewers want:** not that h2 downloads bytes magically faster every time, but that **queueing/parallelism/header overhead** change — which matters most when you have **many** requests (Angular lazy apps).

---

## 4. HTTP/1.1 — How It Works (Frontend View)

### Characteristics

- Text-based headers  
- **One request/response at a time per connection**  
- Browsers open **multiple** connections per origin (~6 classic limit)  
- Head-of-line blocking **at HTTP layer** on each connection  

### Practical consequence

Many small files ⇒ connection pool saturates ⇒ artificial delay even on a fast network.

---

## 5. HTTP/1.1 Workarounds Frontend Teams Used

| Workaround | Why on h1 | On h2? |
|---|---|---|
| **Concatenate JS/CSS** | Fewer requests fit in 6 slots | Less necessary; hurts granular cache |
| **Image sprites** | One image vs 20 icons | Often CSS icons / SVG; sprites optional |
| **Domain sharding** (`static1`, `static2`) | Fake more than 6 connections | **Usually harmful** (extra TLS + hurts prioritization) |
| **Inline tiny CSS** | Save a request | Still OK for critical CSS; don’t inline huge JS |

**Interview line:**

> Those weren’t eternal best practices — they were **patches for HTTP/1.1**.

---

## 6. HTTP/2 — How It Improves Things

| Feature | Meaning | FE impact |
|---|---|---|
| **Binary framing** | Efficient framing vs text | Lower overhead |
| **Multiplexing** | Many streams, one connection | Parallel Angular chunks |
| **HPACK headers** | Compress repeated headers | Big when cookies/auth headers repeat |
| **Prioritization** | Critical CSS/JS first | Better LCP/TTI potential |
| **Server push** | Server pushes guessed assets | Mostly **abandoned**; don’t sell it |

### Multiplexing diagram

```text
HTTP/1.1 (one connection):
req1 ------>
<------ res1
req2 ------>
<------ res2

HTTP/2 (one connection):
req1 ------>
req2 ------>
req3 ------>
<-- interleaved frames for all --
```

---

## 7. HTTP/1.1 vs HTTP/2 Comparison Table

| Topic | HTTP/1.1 | HTTP/2 |
|---|---|---|
| Parallelism / connection | One at a time | Many streams |
| Connections / origin | ~6 | Usually 1 (or few) |
| Header cost | Verbose, repeated | Compressed |
| Small files | Painful | Much better |
| Domain sharding | Sometimes helped | Usually hurts |
| Angular lazy chunks | Risk of queueing | Natural fit |
| Concatenation | Often good | Use for logic/cache units, not “fit in 6 slots” |

---

## 8. Angular — how we “choose” and design for h1 vs h2

You rarely configure “use HTTP/2” in `angular.json`. **The server/CDN speaks h2.**  
What you choose is **asset strategy** that matches the protocol reality.

### 8.1 What Angular ships by default (modern)

```text
ng build (application builder / esbuild era)
  → index.html
  → styles-*.css
  → main-*.js
  → lazy route chunks (admin-*.js, checkout-*.js, …)
  → hashed filenames for long cache
```

That design assumes **multiplexing is OK** ⇒ **HTTP/2/3 world**.

### 8.2 If your users are truly on HTTP/1.1 only (rare)

Examples: ancient corporate proxy, weird embedded WebView, misconfigured origin.

**Then I’d:**

| Lever | Action |
|---|---|
| Fewer requests | Wider initial bundles; less micro-chunking |
| Critical path | Inline critical CSS; defer non-critical |
| Avoid sharding | Don’t add `cdn1`/`cdn2` unless measured |
| Measure | DevTools → Protocol shows `http/1.1` |

**I would not** rewrite the app to AngularJS-era concatenation blindly without measuring.

### 8.3 Modern Angular on HTTP/2 (default recommendation)

| Lever | Why |
|---|---|
| **Route-level lazy loading** | Parallel fetch of chunks on h2; smaller initial JS |
| **`@defer`** | Late chunks when visible — more requests, OK on h2 |
| **Hashed filenames + immutable cache** | Repeat visits download almost nothing |
| **Budgets in `angular.json`** | Keep `main` lean even if parallelism exists |
| **Preload LCP image / critical font** | Priority still matters on h2 |
| **One CDN origin** | Don’t shard; let h2 multiplex |

### 8.4 Example — Catalog page with 4 lazy libs

```ts
// routes
{ path: 'catalog', loadComponent: () => import('./catalog/catalog') }
// catalog also dynamic-imports chart + pdf libs
```

**HTTP/1.1 story:**  
User opens catalog → needs `catalog.js` + `charts.js` + `pdf.js` + API.  
If 6 slots already busy with shell assets, catalog chunks **queue** → spinner longer.

**HTTP/2 story:**  
Same files start as new streams immediately (subject to browser priority/bandwidth) → less artificial waiting.

**Design choice on h2:** keep lazy splits.  
**Design choice if stuck on h1:** consider merging chart+pdf into one “catalog-vendor” chunk to cut request count.

### 8.5 Domain sharding anti-example (Angular + CDN)

```text
Bad on HTTP/2:
  app.example.com      → index.html, main.js
  static1.example.com  → chunk-a.js
  static2.example.com  → chunk-b.js
```

Each host ⇒ separate connection + TLS. You **break** single-connection multiplexing and prioritization.

**Prefer:**

```text
cdn.example.com/app/main-xxx.js
cdn.example.com/app/catalog-yyy.js
```

### 8.6 “Do I choose HTTP/1 or HTTP/2 in Angular?”

| Question | Answer |
|---|---|
| App code setting? | No — hosting/CDN |
| What do I choose? | Chunking, caching, CDN layout, preloads |
| Default target? | **HTTP/2 or HTTP/3** |
| When mention h1? | Legacy constraints, or explaining old concat/sharding |

**Spoken:**

> I don’t pick HTTP/1 for Angular. I verify the CDN serves h2/h3, design lazy chunks for multiplexing, and only coarsen bundles if I’m forced onto HTTP/1.1 or I see request explosion in the waterfall.

---

## 9. Another actual example — API + assets together

After bootstrap:

```text
GET /api/user
GET /api/notifications
GET /api/dashboard/widgets   × 12 widgets (anti-pattern)
```

Plus remaining JS chunks.

**HTTP/1.1:** widget API fan-out competes with asset slots → terrible.  
**HTTP/2:** multiplexing helps, but **12 APIs** still mean 12 server handlers — fix with **BFF / batch / GraphQL / single dashboard DTO**, not only h2.

**Senior point:**

> HTTP/2 fixes transport queueing. It does **not** fix chatty API design.

---

## 10. TCP HOL caveat → HTTP/3

HTTP/2 removes **HTTP** HOL blocking, but one lost TCP packet can stall **all** streams on that connection.

**HTTP/3 (QUIC/UDP):** better behavior on lossy mobile nets.

Interview: “h2 is the big FE leap from h1; h3 is the next step under packet loss.”

---

## 11. Network optimizations that still matter (with or without h2)

### A) Reduce bytes

- minify + Brotli/Gzip  
- WebP/AVIF, `srcset`  
- font subsetting  
- tree-shake Angular + budgets  

### B) Reduce waterfalls

- preload LCP image / critical font  
- don’t hide CSS behind JS discovery if avoidable  
- avoid `HTML → big JS → then discover CSS`  

### C) Latency

- CDN near users  
- fewer critical cross-origins (each needs DNS+TLS)  
- `preconnect` to API/CDN hosts you **will** use  

### D) Caching

```text
Hashed JS/CSS:  Cache-Control: public, max-age=31536000, immutable
index.html:     no-cache or short revalidate
```

Angular’s content hashes make this easy.

### E) Lazy non-critical

- `loading="lazy"` images  
- route chunks + `@defer`  
- third-party scripts on interaction/idle  

---

## 12. Resource hints

```html
<link rel="preconnect" href="https://cdn.example.com" />
<link rel="dns-prefetch" href="https://cdn.example.com" />
<link rel="preload" href="/font.woff2" as="font" crossorigin />
<link rel="prefetch" href="/catalog-chunk.js" as="script" />
```

| Hint | Use |
|---|---|
| `dns-prefetch` | DNS only |
| `preconnect` | DNS+TCP+TLS (costlier) |
| `preload` | Needed for **this** page now |
| `prefetch` | Likely **next** navigation |

---

## 13. How to verify in DevTools (do this in interviews if screen-share)

1. Network panel → enable **Protocol** column  
2. Look for `h2`, `h3`, or `http/1.1`  
3. Watch waterfall: parallel bars (h2) vs stepped queue (h1)  
4. Click a chunk → headers, priority, size, time-to-first-byte  

```text
If Angular app shows http/1.1 on production CDN → talk to infra.
If h2 but TTI still bad → problem is bytes/CPU/API chatty-ness, not protocol.
```

---

## 14. Bundle strategy by protocol (Angular)

| | HTTP/1.1-ish world | HTTP/2/3 world |
|---|---|---|
| Initial JS | Prefer fewer larger files | Lean `main` + lazy routes |
| Lazy routes | Limit explosion of micro-chunks | Encouraged |
| `@defer` | Use carefully (more requests) | Great fit |
| Caching | Concat can help | Fine-grained hashed chunks shine |
| CDN hosts | Sharding sometimes used | **Single** multiplexed origin |

Balanced modern approach (almost always):

> Split by **route/feature**, keep **critical path** small, avoid **hundreds** of 1KB files, run on **h2/h3 CDN**.

---

## 15. CDN And Edge Delivery

- Lower latency, cache hashed Angular assets  
- Enable **HTTP/2 and HTTP/3** on the CDN  
- Compression + correct cache headers  

---

## 16. Third-party scripts

Analytics/chat still cost DNS/TLS/CPU.  
`async`/`defer`, load on idle, facades — protocol doesn’t save you from third-party weight.

---

## 17. Common Interview Questions

**Q: Key difference h1 vs h2?**  
> Multiplexing many streams on one connection vs one-at-a-time per connection + ~6 connections.

**Q: Actual example?**  
> Angular app with 10 chunks: on h1 the 7th waits for a free connection; on h2 it starts as another stream immediately.

**Q: Does Angular choose HTTP/2?**  
> Hosting does. Angular’s lazy chunks **assume** modern multiplexing.

**Q: Domain sharding on h2?**  
> Usually no — extra connections hurt.

**Q: Should we still concatenate?**  
> For logical/cache units maybe; not as an h1 workaround.

**Q: HTTP/2 fixed my slow API?**  
> Not if you fire 50 APIs — fix aggregation.

**Q: HTTP/3?**  
> QUIC — better under packet loss; mention as evolution.

---

## 18. Spoken answers

### Angular-focused 60s

> For Angular I check that production is on HTTP/2 or 3 via DevTools. Then I lean into route-level code splitting and hashed caching — multiplexing makes many chunks practical. I avoid domain sharding. If I ever saw pure HTTP/1.1 at scale, I’d reduce concurrent request pressure by coarsening chunks and critical-path assets. Either way I still cut bytes, fix API chatty-ness, preload LCP assets, and lazy-load below-the-fold work — because protocol is only one layer of the waterfall.

### Classic 60s

> HTTP/1.1 needs multiple connections and inspired concat/sharding. HTTP/2 multiplexes and compresses headers so parallel asset loading is efficient. Optimize bytes, CDN, cache, preload, and waterfalls regardless.

---

## 19. Cheat sheet

```text
HTTP/1.1: 1 req/conn, ~6 conns, queue extras → concat/sprites/sharding era
HTTP/2:   multiplex + HPACK + priority → many Angular chunks OK
HTTP/3:   QUIC, better on loss

Angular:  CDN speaks h2; you design chunks/caching
Example:  10th file waits on h1; streams on h2
Don’t:    domain shard on h2; blame h2 for 20 chatty APIs
Do:       budgets, lazy routes, immutable hashed assets, preload LCP
```

---

## 20. Practice checklist

- [ ] Draw h1 vs h2 waterfall for an Angular first load  
- [ ] Explain why lazy chunks love h2  
- [ ] Explain why sharding is outdated  
- [ ] Say what you’d change if Protocol = `http/1.1`  
- [ ] Separate “protocol” vs “chatty API” problems  
- [ ] List preload / preconnect / prefetch  
- [ ] Mention HTTP/3 in one sentence  

---

## Related

| Topic | File |
|---|---|
| Bundles / lazy routes | [02_BUNDLE_OPTIMIZATION_CODE_SPLITTING_LAZY_LOADING.md](./02_BUNDLE_OPTIMIZATION_CODE_SPLITTING_LAZY_LOADING.md) |
| CRP | [01_CRITICAL_RENDERING_PATH.md](./01_CRITICAL_RENDERING_PATH.md) |
| Angular build chunks | [../angular-interview-prep/ANGULAR_BUILD_ESM_WEBPACK_ESBUILD.md](../angular-interview-prep/ANGULAR_BUILD_ESM_WEBPACK_ESBUILD.md) |
