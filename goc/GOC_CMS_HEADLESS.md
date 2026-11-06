# CMS for this GOC JD (coupled vs headless)

Preferred quals name **Brightspot, AEM, Contentful, or Drupal**. You may have **zero** production Brightspot — that’s OK. Don’t invent it. Speak **architecture** + how you’d onboard in a week.

---

## 1. Why this JD cares

Google-facing **marketing / help / brand** sites are often **content-heavy**: pages change without a FE deploy. The FE job is: **map CMS fields → components**, keep **preview** honest, keep **cache/CDN** correct, stay **on-brand**.

IDMS is **app-like** (auth, tables). Same craft: reusable components, perf, a11y — different **source of truth** (CMS vs APIs).

---

## 2. Coupled (traditional) vs headless — 45s spoken

**Coupled / traditional:** CMS owns content **and** presentation (templates in Drupal/AEM/Brightspot). Editors pick a template; server renders HTML (often + some JS). One system to login to. **Pro:** editors see something close to the site. **Con:** FE is stuck in CMS templating, slower iteration, harder to reuse a design system across apps.

**Headless:** CMS is **content API** (JSON/GraphQL). Angular (or any) is the **presentation**. Editors use CMS; site is a separate deploy. **Pro:** modern Angular, design system, multiple channels (web + app). **Con:** preview is harder; you must build **preview** (draft API + `?preview=`), and **cache invalidation** when content publishes.

**Hybrid / “headless-ish”:** AEM/Brightspot can expose APIs **and** still render some pages — say “I ask which mode this property uses.”

---

## 3. Table (memorize)

| | Coupled | Headless |
|---|---|---|
| Render | CMS templates (HTL, Twig, Brightspot views) | Angular/React |
| Editor preview | Usually built-in | You build it (or CMS preview SDK) |
| Deploy | Often CMS + FE together | FE on CDN; CMS separate |
| Best for | Brochure, frequent copy, non-devs | App-like UI, many surfaces |
| Risk | Divergent “design system” in templates | Stale CDN after publish |

---

## 4. FE contract (what you’d actually build)

1. **Content model:** types (Hero, Card grid, FAQ) → Angular components with typed inputs.  
2. **API:** REST or GraphQL; **never** bind raw CMS HTML into `[innerHTML]` without a sanitizer (XSS).  
3. **Routing:** CMS slug → Angular route; 404 from CMS.  
4. **Preview:** draft token, `noindex`, skip CDN cache.  
5. **Publish:** webhook / ISR / cache purge (CDN) — [20_CDN.md](../frontend-system-design/20_CDN.md).  
6. **i18n:** locale in CMS, not hardcoded strings.  
7. **Personalization:** later; don’t lead with it.

**SSR/SSG:** marketing pages often **SSG/ISR** for LCP; app shells stay CSR. [14_SSR_CSR_SSG_HYDRATION.md](../frontend-system-design/14_SSR_CSR_SSG_HYDRATION.md).

---

## 5. Name-drop without lying

| Product | One true sentence |
|---|---|
| **Contentful** | Headless, content types + CDN API, common with modern FE. |
| **Brightspot** | Enterprise CMS used on large brand sites; can be coupled or API; JD lists it — “I haven’t shipped Brightspot; I know the coupled/headless split and component mapping.” |
| **AEM** | Adobe; authors in author instance, publish farm; components + clientlibs; also Headless GraphQL. |
| **Drupal** | Coupled classic; can be headless JSON:API. |

If they say “have you used X?”: **No. Here’s how I’d learn the content model on day 1 and map it to our design system.** That’s senior. Fake years is not.

---

## 6. Transfer from IDMS

| IDMS | CMS site |
|---|---|
| REST DTOs → table columns | CMS fields → components |
| Permission-gated routes | Preview vs public |
| Lazy modules | Lazy below-fold sections |
| Don’t trust API HTML | Don’t trust CMS rich text |
| Perf on large lists | Perf on media-heavy home |

---

## 7. Likely questions + short answers

**Q: How do you keep FE and CMS in sync?**  
Version the content model; feature-flag new components; default unknown type to a safe fallback so publish doesn’t white-screen.

**Q: Page is stale after publish.**  
CDN TTL + purge on webhook; hashed assets for JS/CSS; HTML shorter TTL or ISR revalidate.

**Q: Editor says preview ≠ prod.**  
Preview hits draft API; prod hits published; same component code; env flags only for cache/auth.

**Q: SEO?**  
SSR/SSG for public pages; meta from CMS; canonical URLs; don’t ship the SPA-only empty shell for a marketing homepage.
