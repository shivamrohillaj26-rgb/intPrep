# Scenario 7 — Marketing Site SEO: SSR vs CSR vs SSG vs Hybrid

**Prompt:** A marketing website has excellent content but poor SEO performance. How would you evaluate SSR, CSR, SSG, and hybrid rendering strategies?

---

## 1. Clarify what “poor SEO” means

SEO is not one metric. Diagnose:

| Signal | Possible cause |
|---|---|
| Low impressions | Not indexed / thin content / bad IA |
| Indexed but low rank | Content/E-E-A-T, backlinks, Core Web Vitals |
| Soft 404 / blank in “View Source” | **CSR-only** — crawlers see empty shell |
| Slow LCP | Huge JS, no SSR/SSG HTML, images |
| Duplicate URLs | Trailing slash, query params, no canonical |
| Missing meta | No per-route title/description/OG |

**Interview move:** Separate **rendering strategy** from **on-page SEO basics**. Don’t propose Next.js before checking canonical tags and crawlability.

---

## 2. Rendering modes — precise definitions

### CSR — Client-Side Rendering

```
Request → tiny HTML shell → download JS → fetch data → render content
```

| Pros | Cons |
|---|---|
| Simple hosting (CDN static) | First HTML often empty of content |
| Great for app-like UIs | Weaker SEO/social previews if not pre-rendered |
| | Slower First Contentful Paint for content sites |

**Why CSR hurts marketing SEO:** Crawlers and link unfurlers want meaningful HTML early. Google *can* render JS, but it’s slower, costlier, and flakier than shipping HTML. OG scrapers (LinkedIn/Twitter/Slack) often **don’t** run your JS.

### SSR — Server-Side Rendering

```
Request → server runs React → HTML with content → hydrate on client
```

| Pros | Cons |
|---|---|
| Full content in first response | Server cost / TTFB |
| Fresh data per request | Caching complexity |
| Good personalized pages | Harder ops than static |

### SSG — Static Site Generation

```
Build time → pre-render HTML files → CDN
```

| Pros | Cons |
|---|---|
| Fastest TTFB (CDN edge) | Content stale until rebuild |
| Cheap, very SEO-friendly | Many pages → long builds (mitigate with ISR) |
| Excellent Core Web Vitals potential | Not for per-user private HTML |

### Hybrid / modern meta-frameworks

Mix per-route:

| Technique | Idea |
|---|---|
| **ISR / incremental static** | Static + revalidate on a timer or on-demand |
| **SSR + CDN cache** | Cache anonymous marketing pages at edge |
| **Streaming SSR** | Send HTML shell early, stream rest |
| **Partial hydration / islands** | Ship less JS; interactive islands only |
| **Prerender + CSR app** | Marketing pages static; `/app` CSR |

---

## 3. Evaluation framework (how I’d choose)

Score each route type:

```
Content freshness need × Personalization × Interactivity × SEO value
```

| Page type | Freshness | Personalization | Best default |
|---|---|---|---|
| Home, pricing, features | Low–medium | None | **SSG** (+ ISR if campaigns change often) |
| Blog / docs | Medium | None | **SSG** or ISR on publish webhook |
| Landing pages A/B | Medium | Experiment bucketing | SSG variants or edge middleware + ISR |
| Logged-in dashboard | High | High | **CSR** or SSR behind auth (**noindex**) |
| Search results | High | Query-dependent | SSR with cache keys / CSR if SEO unimportant |
| Product marketing PDP | Medium | None–light | SSG/ISR |

**For a marketing website with excellent content:**  
Default recommendation is **SSG/ISR (hybrid)**, not full CSR, not full SSR for every request.

---

## 4. Why SSG/ISR over pure SSR for marketing

| | SSG/ISR | SSR every request |
|---|---|---|
| TTFB | Usually better (CDN) | Depends on origin |
| Cost at traffic spikes | Excellent | Scales with RPS |
| SEO | Excellent | Excellent |
| Content updates | Rebuild or revalidate | Instant |

Marketing pages are mostly **identical for all users** → static wins.  
Use SSR when HTML **must** differ per request (geo pricing legal text, auth).

**Why not CSR + “Google executes JS now”:**  
True but incomplete — Core Web Vitals, social previews, and crawl budget still prefer real HTML. Senior answer acknowledges Google’s renderer *and* still recommends pre-render for marketing.

---

## 5. Concrete hybrid architecture (recommended)

```
www.example.com
  /                 SSG
  /pricing          SSG
  /blog/[slug]      SSG + on-demand revalidation on CMS publish
  /docs/*           SSG
  /app/*            CSR SPA (noindex) OR authenticated SSR
  /api/*            Backend
```

Stack examples (mention 1–2, don’t holy-war):

- **Next.js** (App Router): SSG/SSR/ISR per route  
- **Astro** + islands: outstanding for content-heavy marketing (less JS)  
- **Remix/Nuxt/Analog** depending on ecosystem  

**Why Astro often shines for pure marketing:** Ships minimal JS by default; SEO + performance.  
**Why Next if already React app shop:** One framework for marketing + app; team skills reuse.

---

## 6. SEO checklist beyond rendering (must mention)

Rendering fix alone won’t rank a site if basics fail:

1. **Meaningful HTML** — H1, semantic structure  
2. **Meta** — unique title/description per page  
3. **Open Graph / Twitter cards** — static in HTML  
4. **Canonical URLs**  
5. **sitemap.xml + robots.txt**  
6. **Core Web Vitals** — LCP image priority, fonts, less JS  
7. **Structured data** (JSON-LD Article/Organization/Product)  
8. **Internal linking** / crawlable `<a href>` (not click-only divs)  
9. **Hydration cost** — don’t ship the whole app on the blog  

---

## 7. How I’d evaluate (process)

1. **Fetch as Google / curl HTML** — is content present without JS?  
2. **Lighthouse SEO + Performance**  
3. **Search Console** — coverage, CWV, query data  
4. **Social debugger** — OG tags  
5. Prototype one high-value page as SSG; A/B LCP & indexation  
6. Roll out hybrid by template  

---

## 8. Why this over that (summary table)

| Strategy | Choose when | Avoid when |
|---|---|---|
| CSR | Admin apps, post-login | Marketing SEO pages |
| SSR | Per-request HTML, auth content | Pure static brochure at huge scale (cost) |
| SSG | Marketing, blog, docs | Highly personalized HTML |
| Hybrid ISR | Marketing + occasional updates | N/A — usually best default |

**My choice for this prompt:**  
> **Hybrid: SSG/ISR for marketing content, CSR for app sections**, fix meta/CWV/structured data, verify with “View Source” and Search Console.

---

## 9. 60-second spoken answer

> Poor SEO on a content-rich marketing site is often a **CSR shell** problem plus basics like meta and CWV. I’d verify whether crawlers see content in raw HTML. For marketing routes I’d pick **SSG with ISR/on-demand revalidation** for speed and crawlability; reserve **SSR** for truly per-request HTML; keep **CSR** for authenticated app areas with `noindex`. I’d also fix canonicals, sitemaps, OG tags, and LCP. Pure CSR relying on Google’s JS renderer is the strategy I’d argue against for primary marketing pages.

---

## Related

- `../frontend-system-design/01_CRITICAL_RENDERING_PATH.md`  
- `../frontend-system-design/02_BUNDLE_OPTIMIZATION_CODE_SPLITTING_LAZY_LOADING.md`  
- Scenario 9 — rendering choices at scale
