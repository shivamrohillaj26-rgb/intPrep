# Scenario 7 — Marketing SEO: Angular CSR vs SSR vs prerender (SSG) vs hybrid

**Prompt:** Marketing site has great content but poor SEO. Evaluate SSR, CSR, SSG, hybrid.

**Deep twin:** [../frontend-system-design/14_SSR_CSR_SSG_HYDRATION.md](../frontend-system-design/14_SSR_CSR_SSG_HYDRATION.md) · Angular: [ANGULAR_SSR.md](../angular-interview-prep/ANGULAR_SSR.md)

**Do not** pitch Next.js as the default if the stack is **Angular**. Name **`@angular/ssr`**, **prerender**, **hydration**, **TransferState**.

---

## 1. Clarify “poor SEO”

| Signal | Cause |
|---|---|
| View Source empty | **CSR-only** Angular `index.html` shell |
| Bad LCP | Huge `main.js`, no prerender |
| Missing OG | Meta not in first HTML (`Meta` service too late for Slack) |
| Duplicates | No canonical |

SEO ≠ only rendering. Still check title, sitemap, CWV.

---

## 2. Modes in **Angular** words

### CSR — `ng serve` / static `ng build` hosted on S3

```
index.html (app-root empty) → download main.js → bootstrap → HTTP → paint
```

Great for **IDMS / logged-in NUX**. Weak for **brochure SEO** and **OG crawlers** (often no JS).

### SSR — `@angular/ssr` (Angular Universal lineage)

```
Request → Node render Application → HTML with content → browser hydrates
```

Fresh per request; TTFB + Node cost. Use **TransferState** so the client doesn’t refetch the same HTTP.

### SSG / prerender — `outputMode` / `prerender` routes at **build**

```
ng build → /pricing/index.html already has H1 + copy → CDN
```

Fastest TTFB. Stale until rebuild (or rebuild on CMS webhook).

### Hybrid

| Route | Angular default |
|---|---|
| `/`, `/pricing`, `/blog/:slug` | **Prerender / SSG** |
| `/blog` listing that changes hourly | Prerender + rebuild, or SSR + CDN cache |
| `/app/**` dashboard | **CSR**, `noindex` |
| Personalized HTML | SSR |

Angular is not Next ISR-out-of-the-box — say **prerender + CI rebuild** or **SSR with Cache-Control**, don’t invent a Next API.

---

## 3. Evaluation

Marketing pages = **same HTML for everyone** → **prerender**.  
SSR when HTML **must** differ per request (geo legal).  
CSR for authenticated IDMS — **do not SSR the fleet dashboard**.

**Why not “Google runs JS”:** True-ish; CWV, crawl budget, **LinkedIn/Slack unfurl** still want real HTML.

---

## 4. Angular SEO checklist (must say)

1. Content in **first HTML** (prerender/SSR)  
2. `Title` + `Meta` at **server/prerender** time, not only `ngOnInit` in CSR  
3. `Router` + real `<a routerLink>` (crawlable)  
4. Canonical, sitemap, robots  
5. JSON-LD  
6. Hydration: avoid mismatch (dates, `random`, `window`) — [ANGULAR_SSR.md](../angular-interview-prep/ANGULAR_SSR.md)  
7. Don’t ship the **dashboard** bundle on the blog — separate project or lazy that never loads  

---

## 5. Why this over that

| Strategy | Choose | Avoid |
|---|---|---|
| CSR | NUX / admin | Marketing landing |
| SSR `@angular/ssr` | Per-request HTML | Static brochure at huge RPS without cache |
| Prerender (SSG) | Marketing, docs | Per-user HTML |
| Hybrid | **Typical company** | — |

**Choice for this prompt:**  
> **Prerender marketing routes, CSR for `/app`, meta/CWV/sitemap.** SSR only where HTML is personalized.

---

## 6. 60-second spoken answer

> I’d curl the HTML — if it’s an empty `<app-root>`, crawlers and OG bots see nothing. For a content site on Angular I’d **prerender** home, pricing, and blog at build and put them on a CDN. I’d reserve **`@angular/ssr`** for pages that must differ per request, and keep the **authenticated app CSR** with `noindex`. I’d set title/meta during prerender, fix canonicals and LCP, and avoid hydrating a giant dashboard on a marketing page. I wouldn’t pick Next.js unless the org is already React.

---

## Related

- Scenario 9 — public scale  
- Scenario 1 — CSR dashboard polling is fine **behind login**
