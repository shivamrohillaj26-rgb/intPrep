# CDN (Content Delivery Network) — Interview Ready Deep Guide

What a CDN is, how browsers use it, caching with hashed Angular assets, and how to explain it with a concrete example (including Netradyne-style `cdn-<env>`).

Related: [04_HTTP1_VS_HTTP2…](./04_HTTP1_VS_HTTP2_NETWORK_OPTIMIZATIONS.md) · [02_BUNDLE…](./02_BUNDLE_OPTIMIZATION_CODE_SPLITTING_LAZY_LOADING.md) · [18_NETRADYNE_DEVOPS…](./18_NETRADYNE_DEVOPS_CI_CD.md) · [06_SERVICE_WORKERS.md](./06_SERVICE_WORKERS.md)

---

## 1. One-liner

> A **CDN** is a globally distributed set of **edge servers** that cache and serve static (and sometimes cached dynamic) content from a location **near the user**, so assets don’t always travel to one origin in one region.

---

## 2. The problem without a CDN

```text
User in Bengaluru
        │
        │  long RTT + congested path
        ▼
Origin server in US-East (only place hosting main.js, logo.png, …)
```

Every user worldwide hits **one** data center for JS/CSS/images:

- High **latency** (physics + hops)
- Origin overloaded on traffic spikes
- Single region outage = global pain for static files

---

## 3. What a CDN actually is

```text
                    ┌─ Edge PoP: Mumbai
User (Bengaluru) ───┤
                    └─ Edge PoP: Singapore / Frankfurt / Virginia …
                              │
                              │ cache MISS → fetch once from origin
                              ▼
                         Origin (S3 / app server / build bucket)
```

| Term | Meaning |
|---|---|
| **Origin** | Source of truth (your S3 bucket, nginx, Tomcat static, etc.) |
| **Edge / PoP** | Point of Presence — CDN server close to users |
| **Cache hit** | Edge already has the file → serve locally (fast) |
| **Cache miss** | Edge fetches from origin, stores, then serves |
| **TTL / Cache-Control** | How long the edge (and browser) may keep a copy |

Popular providers: CloudFront, Cloudflare, Akamai, Fastly, Azure CDN, etc. Interviewers care about **the idea**, not the brand.

---

## 4. End-to-end example (Angular SPA)

### Build output

```text
dist/
  index.html
  main.a1b2c3.js      ← content hash in filename
  styles.d4e5f6.css
  chunk-lazy.789abc.js
  assets/logo.svg
```

### Deploy pattern

```text
1) CI builds Angular app
2) Upload hashed files to object storage (S3) / origin
3) CDN in front: https://cdn.example.com/main.a1b2c3.js
4) index.html references CDN URLs (or same host with CDN in front)
```

### Browser load (user in India)

```text
GET https://idms.example.com/          → origin or CDN (HTML, short cache)
GET https://cdn.example.com/main.a1b2c3.js  → nearest edge (long cache)
GET https://cdn.example.com/styles….css     → edge HIT
GET https://api.example.com/v1/drivers      → NOT typically CDN (dynamic API)
```

**Why the hash matters**

| File | Cache strategy | Why |
|---|---|---|
| `main.a1b2c3.js` | `Cache-Control: public, max-age=31536000, immutable` | New deploy → **new filename** → no stale JS |
| `index.html` | short TTL or `no-cache` / must-revalidate | Always discover **latest** hashed script names |

Without hashing, long CDN cache = users stuck on old JS after deploy.

---

## 5. Concrete “before / after” story (say this)

**Before CDN**

> Our `main.js` was 2MB from one US origin. Users in APAC waited seconds just for the bundle TTFB. Peak hours hammered the origin.

**After CDN**

> We put hashed assets on a CDN. First user in Mumbai may miss and pull from origin; the edge caches it. The next thousand users in that region get **edge hits** — lower latency, origin barely involved for static files.

Numbers you can invent only if measured; prefer qualitative + “we use hashed assets + long TTL.”

---

## 6. How it’s used in frontend apps

### A) Static asset hosting (most common)

```html
<!-- index.html after build / stamp -->
<script src="https://cdn-production.example.com/main.a1b2c3.js"></script>
<link rel="stylesheet" href="https://cdn-production.example.com/styles.d4e5f6.css" />
```

Angular: `angular.json` / custom builder may set `deployUrl` / rewrite asset URLs at build/stamp time.

### B) Whole site behind CDN

```text
User → CDN → Origin (HTML + API sometimes)
```

CDN terminates TLS, may cache GET pages, WAF, DDoS absorption.

### C) Third-party CDN (libraries — less common now)

```html
<script src="https://cdn.jsdelivr.net/npm/lodash@4/..."></script>
```

Modern SPAs usually **bundle** deps; still know the pattern (shared cache across sites — privacy/version risks).

### D) Image / media CDN

Product images, video thumbnails via image CDN (resize, WebP, geo).

---

## 7. Netradyne / IDMS-shaped answer (your resume)

From your devops notes (`cdn-<env>.netradyne.com`):

> We stamp environment-specific CDN hosts. Hashed dashboard assets are served from `cdn-production.netradyne.com` (and qa/demo variants). Build rewrites index references to that CDN. Long cache on hashed files; `index.html` stays fresh so new deploys pick up new hashes. Origin/API hosts stay separate (`idms.*`, `auth.*`).

Tie to [18_NETRADYNE_DEVOPS_CI_CD.md](./18_NETRADYNE_DEVOPS_CI_CD.md) §10.

---

## 8. CDN vs related concepts

| Thing | vs CDN |
|---|---|
| **Origin server** | Source; CDN is the distributed cache in front |
| **Browser cache** | On the user’s machine; CDN is shared at the edge for many users |
| **Service Worker** | App-controlled cache in the browser; CDN is network edge ([06](./06_SERVICE_WORKERS.md)) |
| **Load balancer** | Spreads traffic across origin instances; CDN also caches + geo-routes |
| **HTTP/2/3** | Protocol on the connection; CDN usually speaks h2/h3 to clients ([04](./04_HTTP1_VS_HTTP2_NETWORK_OPTIMIZATIONS.md)) |
| **DNS** | Resolves `cdn.example.com` to a nearby PoP (anycast / geo DNS) |

**Stack you can draw:**

```text
Browser cache → Service Worker (optional) → CDN edge → Origin → DB/API
```

---

## 9. What should / shouldn’t go on a CDN

| Good on CDN | Usually not (or carefully) |
|---|---|
| JS / CSS / fonts / images / WASM | Personalized HTML with private data |
| Hashed SPA chunks | Auth APIs returning user-specific JSON (unless private cache rules — rare on shared CDN) |
| Public marketing assets | Secrets, admin-only files without signed URLs |

CDN can cache **API GET** responses in some architectures — only with correct `Cache-Control` and no private data leakage.

---

## 10. Cache invalidation (classic follow-up)

| Strategy | How |
|---|---|
| **Hash filenames** (best for SPAs) | Deploy new `main.NEW.js`; old URL unused → no purge needed |
| **Purge / invalidate** | Tell CDN to drop a path (CloudFront invalidation) — slower/costly |
| **Short TTL** | Simpler but more origin hits |

**Say:** Prefer content-hashed assets + long TTL; invalidate only when you must (e.g. emergency HTML).

---

## 11. Benefits & tradeoffs

**Benefits**

- Lower latency (geo)
- Offload origin
- Absorb spikes / some DDoS
- Often TLS + compression + h2 at edge
- Global reach without multi-region app deploy for static files

**Tradeoffs / gotchas**

- Cache inconsistency if TTL/hash wrong  
- Extra domain → CORS for fonts/API if misconfigured  
- Debugging “which edge / which version?”  
- Cost at very high egress  
- Cold PoP cold-start (first miss)

---

## 12. Mini architecture for whiteboard

```text
                  ┌─────────────────┐
   Users ────────►│  CDN (edges)    │── cache HIT ──► asset bytes
                  └────────┬────────┘
                           │ MISS
                           ▼
                  ┌─────────────────┐
                  │ Origin (S3/SPA) │  hashed JS/CSS
                  └─────────────────┘

   Users ────────► API gateway / app servers  (dynamic JSON — usually bypass CDN cache)
```

Angular deploy flow:

```text
ng build → hashed bundles → upload origin → CDN serves → index.html points to CDN URLs
```

---

## 13. Spoken answers

### 20s

> A CDN is a network of edge servers that cache static content close to users. Instead of everyone downloading `main.js` from one origin, they hit a nearby PoP, which cuts latency and protects the origin.

### 45s

> For an Angular app we upload content-hashed bundles to storage behind a CDN and set long cache headers. `index.html` is short-cached so it always references the latest hashes. First request in a region may miss and fill the edge; later users get hits. APIs stay on the origin. At Netradyne-style setups we stamp `cdn-<env>` hosts per environment and rewrite asset URLs at build time.

### 60s — with caching detail

> The important design is cache key + invalidation. We never rely on “overwrite main.js with long TTL.” We embed a content hash in the filename so each deploy is a new URL and can be immutable at the edge. HTML stays revalidatable. That combo gives CDN speed without serving stale application code. Browser cache and service workers are additional layers; the CDN is the shared geo layer between users and origin.

---

## 14. Q&A

**Q: Is a CDN only for images?**  
A: No — JS, CSS, fonts, whole static sites, sometimes cached GETs.

**Q: Does CDN replace the server?**  
A: No — origin still holds the source; CDN caches and delivers.

**Q: Why hashed filenames?**  
A: Safe long-term caching + instant “invalidate” by changing the URL on deploy.

**Q: CDN vs reverse proxy?**  
A: Overlap (nginx can cache). CDN emphasizes **many geo edges** as a product.

**Q: Can CDN make APIs faster?**  
A: Sometimes for public cacheable GETs; authenticated personalized data usually goes to origin.

**Q: How do you know it’s working?**  
A: DevTools: asset host, `x-cache: Hit/Miss` (provider-specific), TTFB drop for static files, CDN analytics.

---

## 15. Practice checklist

- [ ] Define CDN in one sentence  
- [ ] Draw user → edge → origin  
- [ ] Explain hashed assets + long TTL vs short-cache HTML  
- [ ] Contrast CDN vs browser cache vs service worker  
- [ ] Give SPA deploy example  
- [ ] Optional: Netradyne `cdn-<env>` talking point  

---

## Cheat card

```text
CDN = geo edge cache for (mostly) static content
HIT  = serve from nearby PoP
MISS = pull origin, then cache
SPA  = hash JS/CSS → long cache; index.html → short cache
Not  = replacement for auth API / private dynamic data
You  = stamp CDN host, rewrite asset URLs, protect origin
```
