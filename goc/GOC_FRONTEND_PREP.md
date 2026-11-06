# GOC — Frontend Senior Specialist prep hub

**Use this tonight.** Don’t reread the whole repo. OneTrust is a different interview — leave `onetrust/` unless you need MFE *mechanics*.

---

## 0. What company is this (10 seconds)

**Google Operations Center** partners with Google to support users and Google products. You work **on Google-related UIs**, you are **not** a Google Inc L4 SWE by default.

Culture they advertise: improve continuously, collaborate, **STAR + hypotheticals**, role-related knowledge. Official: [How we hire](https://googleoperationscenter.com/how-we-hire/).

This JD is **Angular + performance + reusable UI + CMS**. That’s closer to a **strong product FE + content sites** mix than IDMS-only — sell **transferable** skills (components, perf, reviews) and be honest on CMS.

---

## 1. 90s intro (say this, then stop)

> I’m a frontend engineer, mainly **Angular and TypeScript**. At **Netradyne** I work on **IDMS** — a large authenticated fleet and safety dashboard: OAuth, permission-gated routes, heavy tables, maps, RxJS, and we’re moving a monolith UI toward **micro-frontends** so domains can ship independently. I care about **reusable components, change detection, and load/interaction performance**, not just making screens look right. This GOC role is building **responsive, scalable UI to Google quality**, working with designers, and keeping pages fast — that’s the work I already do, and I want to apply it on Google-facing properties, including **CMS-driven pages** where I’m solid on the front-end contract even if my day-to-day CMS is not Brightspot.

If they ask “why GOC / why not stay”: scale of Google-quality UI, design collaboration, still writing production Angular — not “I want the Google logo.”

---

## 2. Night-before plan (interview tomorrow)

| Block | Do | Skip |
|---|---|---|
| 45 min | Code [GOC_JS_TASK_SORT.md](./GOC_JS_TASK_SORT.md) from memory + write `debounce` | New DSA patterns |
| 25 min | Speak [GOC_CMS_HEADLESS.md](./GOC_CMS_HEADLESS.md) once (coupled vs headless) | Memorizing Brightspot APIs |
| 25 min | Three STAR stories in [GOC_BEHAVIORAL.md](./GOC_BEHAVIORAL.md) | Writing more stories |
| 20 min | Listing-page perf: load vs filter ([ANGULAR_OPTIMIZE_APPLICATION.md](../angular-interview-prep/ANGULAR_OPTIMIZE_APPLICATION.md) headings only) | Full CRP chapter |
| 15 min | Webpack vs Vite one-liner from [ANGULAR_BUILD_ESM_WEBPACK_ESBUILD.md](../angular-interview-prep/ANGULAR_BUILD_ESM_WEBPACK_ESBUILD.md) | Build internals rabbit hole |
| 20 min | [GOC_CSS.md](./GOC_CSS.md) — `:focus-visible`, `::before`, nth-child vs of-type, flex vs grid | Reading every file in `css-interview-prep/` |
| Morning | Re-read JD table in [GOC_JD.md](./GOC_JD.md); 90s intro twice out loud | Opening OneTrust DI doc |

---

## 3. What they test vs what you already have

| JD / GOC L1 theme | You already prepped | Open if they go deep |
|---|---|---|
| Reusable components | `/q6`, content projection | [ANGULAR_CONTENT_TEMPLATES_QUERIES.md](../angular-interview-prep/ANGULAR_CONTENT_TEMPLATES_QUERIES.md) |
| Performance | Optimize Angular + CRP + bundles | [01_CRITICAL_RENDERING_PATH.md](../frontend-system-design/01_CRITICAL_RENDERING_PATH.md) |
| State | NgRx + signals | NgRx + [ANGULAR_SIGNALS.md](../angular-interview-prep/ANGULAR_SIGNALS.md) |
| Build tools | Webpack → esbuild/Vite | Build guide |
| JS utils | Debounce, event loop, DSA FE | [DEBOUNCE_THROTTLE.md](../javascript-interview-prep/DEBOUNCE_THROTTLE.md) |
| MFE (if L1-like) | Federation demos + story | `micro-frontends/INDEX.md` |
| HTML5 / CSS3 (JD) | Box/flex/grid + **pseudos** | [GOC_CSS.md](./GOC_CSS.md) |
| CMS | **New for this role** | [GOC_CMS_HEADLESS.md](./GOC_CMS_HEADLESS.md) |
| Behavioral | Licious/Netradyne STAR | [GOC_BEHAVIORAL.md](./GOC_BEHAVIORAL.md) |
| Code reviews / tests | Unit testing guide | [UNIT_TESTING.md](../angular-interview-prep/UNIT_TESTING.md) |

---

## 4. If they live-code UI

Prefer **interview-simple** from `prevonir-interview-practice/`:

| They say | Route |
|---|---|
| Responsive form / layout | `/q1` |
| Typeahead + debounce | `/q4` |
| Virtual list (scale) | `/q7` |
| File tree | `/q8` (local `isOpen` — don’t “upgrade”) |
| Reactive form | `/q11` |
| Guard / roles | `/q9` |

Talk: assumptions → HTML structure → CSS → TS → edge cases.

---

## 5. Webpack vs Vite (30s)

> Historically Angular used **Webpack** via the CLI. From Angular 17 the **application builder** uses **esbuild** (and Vite-style dev). Webpack still shows up in Module Federation / older apps. I pick the bundler the repo already standardized; I care about **split chunks, lazy routes, and cacheable hashed assets**, not the brand name.

---

## 6. Listing-page perf (the GOC L1 question, Angular)

**Initial load:** reduce JS (lazy routes, defer below-fold), images (`ngOptimizedImage` / srcset), fonts, HTTP/2, don’t block LCP on a huge Angular bundle.

**Filter/sort:** don’t re-render 10k DOM nodes — filter in memory with `computed` / `track`, debounce search, virtual scroll, OnPush. Network: don’t refetch the catalog on every keypress.

Spoken 40s is enough unless they want numbers.

---

## 7. Questions for the end

See [GOC_JD.md](./GOC_JD.md) § questions. Add: “How does this team work with Google design / brand guidelines?”
