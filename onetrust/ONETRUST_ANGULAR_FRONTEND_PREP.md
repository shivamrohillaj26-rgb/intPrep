# OneTrust — Angular Frontend Interview Prep

**Use this as the study hub.** Do not reread every guide from scratch — follow the day plan and speak from the linked files.

OneTrust builds **privacy / consent / data-governance** SaaS (cookie consent, DSAR, vendor risk, preferences). UI is **enterprise, data-heavy, form-heavy, permission-heavy** — closer to IDMS NUX than a marketing site.

---

## 0. Reset (read once, then work)

Previous rounds not converting is common. OneTrust is a **new interviewer, new stack emphasis**. What usually fails at this stage is not “you don’t know Angular” — it is:

- answers stay at *what*, not *why / tradeoff / how I’d debug*
- JS fundamentals (scope, closures, event loop, promises) wobble under follow-ups
- project story is features, not **scale / perf / auth / data**
- live coding without talking

Fix those four and this round is winnable.

---

## 1. What they actually test (from public FE/SE reports + JDs)

| Bucket | They care because | Your depth target |
|---|---|---|
| **JavaScript** | Language of the role | Scope, closures, event loop, promises, memory |
| **Angular** | Product is Angular-heavy | Lifecycle, DI, CD/OnPush, RxJS, forms, routing, signals |
| **Data-heavy UI** | Consent/governance tables, filters, huge lists | Virtual scroll, pagination, OnPush, debounce search |
| **Forms + validation** | Preference centers, DSAR, policy configs | Reactive forms, async validators, FormArray |
| **Perf** | Low-latency rendering of lots of records | Lazy load, trackBy/@for track, CD, bundle split |
| **a11y + i18n** | Compliance product; WCAG shows up on JDs | Keyboard, ARIA, `aria-live`, ngx-translate / locale |
| **Testing** | Enterprise bar | TestBed, HttpClientTesting, guard tests |
| **Architecture + resume** | Later rounds | IDMS HLD, state, auth, “why this over that” |

SSR is **low priority** for their logged-in platform (same as IDMS). Don’t lead with it unless they ask.

---

## 2. Typical process (pace yourself)

Public FE reports: screening → **JS/coding** → **Angular / frontend design** → **architecture + project** → behavioral.

| Round | What to practice | Time |
|---|---|---|
| Recruiter / HM | 90s “tell me about yourself” + why OneTrust | 1 page below |
| **Hiring Manager (after R3)** | Fit, ownership, STAR — **not** another Angular grill | **[ONETRUST_HM_ROUND.md](./ONETRUST_HM_ROUND.md)** |
| JS + coding | Event loop, closures, debounce, map/filter, maybe small DSA | Day 1–2 |
| Angular deep dive | Lifecycle, DI, RxJS flattening, forms, CD | Day 2–4 |
| Machine coding | Table + search + pagination **or** multi-step form | `/q11`, `/q8`, table scenario |
| Design / architecture | Dashboard of widgets, large table, auth+roles | Scenarios 01, 08, guards |
| Behavioral | Conflict, production bug, mentoring, tradeoffs | STAR from Netradyne |

Talk out loud. Ask clarifying questions. State assumptions.

---

## 3. 90s intro (say this, then stop)

> I’m a frontend engineer, mainly **Angular + TypeScript**, most recently on **Netradyne IDMS** — a large authenticated fleet/safety dashboard: OAuth, permission-gated routes, heavy tables and maps, RxJS streams, and a mix of native Angular pages plus leftover iframe modules. I care about **change detection, lazy loading, and not melting APIs** when we fan out requests. OneTrust’s product is similar in shape — **data-heavy enterprise UI, forms, roles, compliance** — so I want to apply the same discipline: accessible components, predictable state, and performance under large datasets.

If they ask “why OneTrust”: privacy/governance is **high-stakes UI** (consent must be correct, auditable, multi-locale) — that’s more interesting than a generic CRUD app.

---

## 4. Study map (open these, don’t reinvent)

### Must-speak JS (early rounds)

| Topic | File | Speak 30s on |
|---|---|---|
| `var` / `let` / `const`, TDZ | [SCOPES.md](../javascript-interview-prep/SCOPES.md) | Function vs block scope |
| Closures | same | Debounce, private counters |
| Event loop | [EVENT_LOOP.md](../javascript-interview-prep/EVENT_LOOP.md) | Macrotask vs microtask |
| Promises / async | [PROMISES.md](../javascript-interview-prep/PROMISES.md) | Fail-fast vs allSettled |
| Debounce / throttle | [DEBOUNCE_THROTTLE.md](../javascript-interview-prep/DEBOUNCE_THROTTLE.md) | Search box vs scroll |
| Concurrency cap | [MAP_ASYNC_LIMIT.md](../javascript-interview-prep/MAP_ASYNC_LIMIT.md) | Don’t `Promise.all` 200 APIs |

### Must-speak Angular

| Topic | File | OneTrust hook |
|---|---|---|
| Lifecycle | [ANGULAR_LIFECYCLE.md](../angular-interview-prep/ANGULAR_LIFECYCLE.md) | Subscribe in init, teardown with `takeUntilDestroyed` |
| DI | [ANGULAR_DEPENDENCY_INJECTION.md](../angular-interview-prep/ANGULAR_DEPENDENCY_INJECTION.md) | `providedIn`, tokens, tree-shake |
| CD / OnPush / zoneless | [ANGULAR_CHANGE_DETECTION_ONPUSH_ZONELESS.md](../angular-interview-prep/ANGULAR_CHANGE_DETECTION_ONPUSH_ZONELESS.md) | Tables + streams |
| Template fns | [ANGULAR_TEMPLATE_FUNCTIONS_CD.md](../angular-interview-prep/ANGULAR_TEMPLATE_FUNCTIONS_CD.md) | Don’t call heavy fns in template |
| Signals | [ANGULAR_SIGNALS.md](../angular-interview-prep/ANGULAR_SIGNALS.md) | Filters as signals; RxJS at HTTP edge |
| RxJS | [RXJS_INTERVIEW.md](../javascript-interview-prep/RXJS_INTERVIEW.md) | `switchMap` search, `exhaustMap` save |
| Forms | [ANGULAR_REACTIVE_FORMS.md](../angular-interview-prep/ANGULAR_REACTIVE_FORMS.md) | Preference / DSAR wizards |
| Guards | [ANGULAR_ROUTE_GUARDS.md](../angular-interview-prep/ANGULAR_ROUTE_GUARDS.md) | Role: privacy officer vs viewer |
| Memory leaks | [ANGULAR_MEMORY_LEAKS.md](../angular-interview-prep/ANGULAR_MEMORY_LEAKS.md) | Long-lived admin sessions |
| Tests | [UNIT_TESTING.md](../angular-interview-prep/UNIT_TESTING.md) | Service + component + guard |
| Shared lib | [ANGULAR_SHARED_LIBRARY.md](../angular-interview-prep/ANGULAR_SHARED_LIBRARY.md) | Design-system / NDS story |

### Architecture (later rounds)

| Topic | File |
|---|---|
| Your project HLD | [16_NETRADYNE_IDMS_PROJECT_HLD.md](../frontend-system-design/16_NETRADYNE_IDMS_PROJECT_HLD.md) |
| 100k table | [08_LARGE_TABLE_100K_ROWS.md](../scenario-based-questions/08_LARGE_TABLE_100K_ROWS.md) |
| Widget polling | [01_DASHBOARD_WIDGETS_POLLING.md](../scenario-based-questions/01_DASHBOARD_WIDGETS_POLLING.md) |
| Auth / XSS / CSRF | [10_FRONTEND_AUTH_SECURITY.md](../frontend-system-design/10_FRONTEND_AUTH_SECURITY.md) |
| Pagination | [INDEX.md](../frontend-system-design/INDEX.md) (pagination guide) |
| MFE only if asked | [micro-frontends/06](../micro-frontends/06_HOW_I_IMPLEMENTED_MFE_SPOKEN.md) — don’t force it |

---

## 5. OneTrust-flavored questions + spoken answers

Use these as **their domain + your Angular**. Interviewers love this.

### “Design a consent / preference center”

> Host is the shell: auth, tenant, locale. Preference page is a **reactive form** — FormArrays for purposes/vendors, validators for required legal bases. Save is `exhaustMap` so double-click doesn’t double-POST. Read path is cached with `shareReplay(1)` per tenant. Large vendor list is **virtual scroll + OnPush**. Changes are auditable so I keep a dirty flag and maybe a confirm-on-deactivate guard. a11y: labels, error `aria-live`, keyboard through the list.

### “How do you render a huge DSAR / vendor table?”

> Don’t dump 100k DOM nodes. Server **cursor/offset pagination** + CDK virtual scroll for the window. `track` / `trackBy` on id. OnPush + immutable row updates. Filters **debounce** 300ms then `switchMap` so stale responses drop. Sort/filter state in the URL for shareable admin links.

### “How do you handle API errors and streams in a component?”

> HttpClient + RxJS: `catchError` → user-visible message, never empty swallow. Search: `debounceTime` + `distinctUntilChanged` + `switchMap`. Cancel in-flight with `takeUntilDestroyed`. Global 401 in an interceptor → logout / refresh. Partial failure on a dashboard: `forkJoin`/`allSettled` pattern so one widget doesn’t blank the page.

### “Lazy loading — why?”

> Consent module and cookie-scanner UI shouldn’t be in the first paint of the login shell. `loadChildren` per domain. Shared Angular is one copy; feature chunks load on navigation. Measure with initial bundle + LCP, not vibes.

### “Template-driven vs reactive forms?”

> Template-driven is fine for 3 fields. Preference centers and policy configs are **reactive**: typed controls, FormArray, async uniqueness validators, unit-testable without the DOM. That’s what I’d use at OneTrust.

### “State across nested components?”

> Inputs/outputs for dumb children. Feature service (`providedIn` or route-level) for the page. Signals for local UI (open filters). NgRx only if many distant writers and time-travel/debug need — most preference pages don’t. Don’t copy 100 API payloads into a global store.

### “Accessibility + i18n?”

> Compliance UIs get audited. Semantic HTML, focus management in dialogs, contrast, don’t rely on color alone for consent status. Strings through i18n (not hardcoded English). Dates/numbers via locale. RTL if they have those markets.  
> On IDMS NUX we use a **phrase glossary** (English → per-locale map) plus typed keys — see [ONETRUST_NUX_I18N_GLOSSARY.md](./ONETRUST_NUX_I18N_GLOSSARY.md).

### “Optimize low-latency data rendering?”

> OnPush, trackBy, virtualize, debounce, `switchMap`, pagination, Web Worker only if CPU-heavy transform. Avoid functions in templates. Interceptor + cache for reference data (purposes list).

---

## 6. Live coding — what to build if they say “frontend design + code”

Default OneTrust-shaped task:

**Vendor / cookie list**

- search input (debounce)
- status filter (active / expired)
- paginated table (client mock is OK)
- row click → detail or slide-over
- loading / empty / error

Angular shape (interview-simple):

```text
signal/search → debounce → switchMap(api)
OnPush list + @for (v of page(); track v.id)
reactive filter form OR signals
```

Practice in `prevonir-interview-practice/`: **q11 forms**, file explorer **q8** (tree + local state), calculator **q12** if they want pure logic.

If they want JS-only: debounce, flatten object, deep clone/equal, event loop output, `mapAsyncLimit` for bulk “export 50 vendors”.

---

## 7. Resume / project — 5 follow-ups you must crush

From IDMS (keep it honest):

1. **What was your role?** Feature ownership on NUX Angular — routes, tables, auth-aware UI, not “I invented Module Federation in prod.”
2. **Hardest bug?** Race on search/filter or iframe/session — `switchMap` / cancel / generation token.
3. **Perf?** Virtual scroll, OnPush, lazy routes, don’t poll 50 widgets at 5s (scenario 01).
4. **Auth?** Host login, Bearer interceptor, route `canMatch` / guards, never put tokens in `localStorage` if you can use HttpOnly (discuss tradeoff).
5. **Iframe vs native?** Strangler: leftover pages iframe; native Angular for the rest. Federation is the *next* split — only if they ask MFE.

Do **not** oversell “we fully implemented MF in production” unless you want a 20-min grill. Safer: “we have a host/iframe split today; I designed / prototyped federation for domain remotes.”

---

## 8. 5-day plan (or compress to 3)

**Day 1 — JS**  
Scopes + event loop + promises. 4 output questions out loud. Debounce on paper.

**Day 2 — Angular core**  
Lifecycle + DI + CD/OnPush + “why not fn in template.” 10 flash Qs from those files.

**Day 3 — RxJS + forms + guards**  
`switchMap` vs `mergeMap` vs `exhaustMap`. Build a 6-field reactive form. Auth + role guard story.

**Day 4 — Data UI + coding**  
Read 08 large table. Code a search+table in the practice app. Run `map-async-limit.demo.js` once.

**Day 5 — Project + mock**  
IDMS HLD 8 minutes. Intro 90s. 10 OneTrust-flavored Qs in §5. One STAR: production incident.

Night before: cheat cards only — CD, RxJS flattening, forms, IDMS diagram. Sleep.

---

## 9. Behavioral (they will ask)

**R3 cleared → 30-min HM:** use **[ONETRUST_HM_ROUND.md](./ONETRUST_HM_ROUND.md)** (clock, tenure trap, spoken STAR). This table is the short seed.

| Prompt | STAR seed |
|---|---|
| Conflict with UX / PM | Scope vs a11y or perf — you proposed MVP + follow-up |
| Tight deadline | Cut iframe leftover, ship native path, flag risk |
| Production issue | Race / 429 / memory — what you measured, what you changed |
| Mentoring | Review: OnPush + unsubscribe + trackBy |

Tone: calm, specific, no blame.

---

## 10. Questions to ask them (pick 2)

- How is the Angular app split — modules vs standalone vs multiple apps?
- What’s the hardest frontend problem on the consent / DSAR surface right now — perf, i18n, or form complexity?
- How do you test WCAG on the design system?
- What’s the balance between feature velocity and platform/component-library work?

---

## 11. Day-of checklist

- [ ] 90s intro once, timed
- [ ] Draw IDMS: shell / auth / tables / iframe leftover
- [ ] Recite: `switchMap` search, `exhaustMap` save, OnPush + track, Transfer not needed for dashboard SSR
- [ ] If stuck in coding: write types + empty states first, then happy path
- [ ] Never silent more than 20s — narrate

---

## Related

| File | Why |
|---|---|
| [angular-interview-prep/INDEX.md](../angular-interview-prep/INDEX.md) | Full Angular list |
| [PROVENIR_SOFTWARE_ENGINEER_INTERVIEW_PREP.md](../scenario-based-questions/PROVENIR_SOFTWARE_ENGINEER_INTERVIEW_PREP.md) | Same “resume grill” style |
| [16_NETRADYNE_IDMS_PROJECT_HLD.md](../frontend-system-design/16_NETRADYNE_IDMS_PROJECT_HLD.md) | Project round |
