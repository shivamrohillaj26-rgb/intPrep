# Provenir — Software Engineer Interview Prep (Resume-based)

**Candidate:** Shivam Rohilla · 5+ years Angular FE · Bengaluru  
**Company:** Provenir Inc (Decision Intelligence / risk decisioning fintech)  
**Role:** Software Engineer (Angular-focused enterprise FE)  
**Call context:** Hiring check-in / interview on **Microsoft Teams** (email Jul 29) — be ready on tech, JD fit, experience stories, and your questions.

**How to use this file:** Treat each **Q** as if *I* (interviewer) asked it after reading your resume. Memorize the **A** structure; adapt numbers honestly if asked for proof.

Related prep in this repo:  
[WHY_ANGULAR_VS_REACT_NEXT.md](../angular-interview-prep/WHY_ANGULAR_VS_REACT_NEXT.md) · [ANGULAR_CHANGE_DETECTION…](../angular-interview-prep/ANGULAR_CHANGE_DETECTION_ONPUSH_ZONELESS.md) · [ANGULAR_BUILD…](../angular-interview-prep/ANGULAR_BUILD_ESM_WEBPACK_ESBUILD.md) · [RXJS_INTERVIEW.md](../javascript-interview-prep/RXJS_INTERVIEW.md) · machine coding `prevonir-interview-practice/`

---

## 0. Before the call (from their email)

| Tip they gave | What you do |
|---|---|
| Technology check | Teams works, mic/cam, stable net, quiet space; have resume + this MD open |
| Job description / competencies | Map your bullets → Angular 16+, scalable UI, APIs, multi-tenant thinking, SDLC |
| Experience & achievements | Practice STAR stories below out loud (2–3 min each) |
| Ask questions | Use §12 — shows seriousness |

**60s opener (they say “tell me about yourself”):**

> I’m Shivam, a Senior Frontend Engineer with 5+ years building Angular apps. At TCS I owned broker, employee, and recruitment portals — reactive forms, RBAC, NgRx, and ~20% bundle cuts via lazy loading. At Netradyne I’m leading an AngularJS → Angular 19 migration for an IDMS dashboard used across 500K+ devices, and I’ve shipped performance wins like taking a 10k-row device list from ~8s to under 2s with virtual scroll and smarter fetching. I care about clean architecture, measurable performance, and reusable design-system components. I’m excited about Provenir because you’re building enterprise decisioning UIs where correctness, scale, and maintainability actually matter.

---

## 1. Resume map → what I’ll probe

| Resume signal | I’ll dig into… |
|---|---|
| AngularJS → Angular 19 migration | Strategy, coexistence, risk, zero downtime |
| 8s → &lt;2s + virtual scroll + 10k rows | Architecture of list, pagination vs virtual, trackBy |
| Feature flags + data transform layer | Why normalize APIs, rollout safety |
| RMA self-service portal | State machine UI, API design, impact |
| Subscription & Hardware Insights | Information architecture, modularization |
| Storybook design system | Reuse, API of components, governance |
| Broker portal + RBAC + auto-logout | Auth, security, forms complexity |
| NgRx + memoized selectors | When NgRx vs signals/services |
| Bundle −20%, Webpack analyzer | Tree-shaking, lazy routes, budgets |
| Mentoring / AI tools | Soft skills + judgment (not “AI wrote my code”) |
| Java / Spring / SQL on resume | Light full-stack awareness for Provenir JD |

**Provenir lens:** multi-tenant enterprise UI, Angular 16+, REST/webhooks/websockets, scalable components, collaborate with architecture, cloud/CI awareness.

---

## 2. Warm-up & motivation

### Q1. Why Provenir? Why this role?

**A:**

> Provenir sits in a high-stakes domain — risk and decisioning for financial institutions. That means the UI isn’t just pretty screens; it’s workflows where clarity, auditability, and performance matter. The role is Angular-heavy enterprise product work: reusable components, API integration, scalability and multi-tenancy with architecture partners. That matches what I already do at Netradyne — complex ops dashboards, migrations, design systems — and I want to apply that in a global fintech product processing huge decision volumes. I’m looking for ownership on hard FE problems, not CRUD-only tickets.

### Q2. Walk me through your career in 2 minutes.

**A (structure):** TCS (breadth: 3 portals, NgRx, perf, mentoring) → Netradyne (depth: migration lead, virtualization, design system, customer-facing modules) → now seeking Provenir-scale product engineering.

---

## 3. Architecture & “why this over that” (highest weight)

### Q3. Explain HLD of your current Netradyne IDMS work.

**Full script (diagrams, auth/tenant, migration, 8-min talk track):**  
→ [16_NETRADYNE_IDMS_PROJECT_HLD.md](../frontend-system-design/16_NETRADYNE_IDMS_PROJECT_HLD.md)  
**DevOps / Jenkins / deploy:**  
→ [18_NETRADYNE_DEVOPS_CI_CD.md](../frontend-system-design/18_NETRADYNE_DEVOPS_CI_CD.md)  
(Grounded in your local `Desktop/Ternary` repos — say **Netradyne IDMS**, not “Ternary”.)

**A (draw verbally — short version):**

```text
Browser
  /console (AngularJS legacy)
  /app (Angular 19)  ←── iframe hybrid ──┐
  /dashboard (Angular 21 NUX 2.0 shell) ─┘ AppFrameRouteHost for unfinished features
    Auth: OAuth interceptor + authGuard + routePermissionGuard
    Tenant context → all REST under /tenants/{id}/…
    Lazy features: safety, greenzone, alerts/video, fleet map, DAC, HOS, reports…
    Design system (NDS) + feature *-api services (signals/RxJS, no NgRx)
Node FE proxy → authserver + restserver (+ maps/video services)
```

> Multi-tenant fleet safety console. We’re strangling legacy → `/app` → NUX 2.0 `/dashboard` without big-bang: native lazy features where ready, iframe `/app` for the rest. Hot path lists use virtual scroll + on-demand fetch (8s→&lt;2s story). Tenant + permission is a first-class control plane — Provenir-style enterprise concerns.

### Q4. Why Angular over React / Next for your apps?

**A:** Use [WHY_ANGULAR_VS_REACT_NEXT.md](../angular-interview-prep/WHY_ANGULAR_VS_REACT_NEXT.md) — keep it balanced:

> Enterprise dashboards with large teams benefit from Angular’s opinionated stack — DI, router, forms, HttpClient, CLI migrations. React is great for flexibility and hiring; Next wins SEO/content. Our products are authenticated SPA workflows, not marketing sites — Angular was the right platform. I’d still pick Next for a public SEO site.

### Q5. NgRx vs plain services vs Signals — what did you choose where?

**A:**

> At TCS Employee Portal, cross-cutting state (timesheets/payroll/reimbursement) with many consumers → **NgRx + memoized selectors** to avoid duplicate fetches and random prop drilling.  
> For local UI (open/closed panels, table selection) → **component state / signals**.  
> For server cache of one resource → often **service + `shareReplay` / signals**, not dumping every HTTP response into the store.  
> Rule: **server state ≠ global client store**. NgRx when many features share complex client workflows; otherwise keep it thinner. (See scenario Redux-bloat thinking.)

### Q6. How did you cut the device list from 8s to &lt;2s?

**A (architecture, not buzzwords):**

> Root cause wasn’t “Angular is slow” — we were over-rendering and over-fetching.  
> **1)** Stopped rendering 10k DOM rows → **virtual scrolling** (window only).  
> **2)** **On-demand fetching** — don’t pull the universe up front; page/cursor as user scrolls.  
> **3)** **`trackBy` / identity** so CD doesn’t rebuild rows needlessly.  
> **4)** OnPush / pure pipes where it helped.  
> Result: perceived load under ~2s and smooth scroll. Tradeoff: more complex scroll + fetch coordination vs naive `*ngFor` of everything — worth it at this scale.

### Q7. Virtual scroll vs pagination — why that choice?

**A:**

> Pagination is better for SEO/admin “jump to page 50.” Device listing is an **ops scan** UX — users scroll continuously → **virtual scroll + incremental fetch**. Pagination would feel choppy for 10k devices. If Provenir has audit tables needing deep links to page N, I’d use offset/page UI; for feeds/queues, cursor + virtual/infinite.

### Q8. AngularJS → Angular 19 with zero downtime — how?

**A (strangler fig):**

> We didn’t big-bang rewrite.  
> **1)** New Angular 19 shell / routing.  
> **2)** Migrate module-by-module (20+ views done) behind feature flags.  
> **3)** Shared auth/session so users don’t notice hybrid.  
> **4)** Adapter layer for legacy APIs.  
> **5)** Parallel run + monitoring; rollback = flag off.  
> Why not rewrite all at once? Risk to production fleets and unknown edge cases. Strangler keeps value shipping while architecture modernizes.

### Q9. Feature flags + data transformation layer — why?

**A:**

> Legacy and new APIs returned different shapes while we rolled preferences immutably. UI shouldn’t fork forever. I built a **normalization layer** that maps both into one view-model. Feature flags choose backend path / UI variant; the component always binds one structure. That gave **zero UI regression** and gradual customer rollout. Alternative was dual components — doubles QA and drift. Transform layer is the seam.

### Q10. Bundle −20% — what exactly did you do?

**A:**

> Measured with Webpack bundle analyzer (know today’s apps may be esbuild — same ideas).  
> Lazy routes per feature, remove unused Material/PrimeNG weight, tree-shakeable imports, defer heavy charts. Budgets in CI so we don’t regress. Tradeoff: more route boundaries to design thoughtfully.

### Q11. Multi-tenancy / scale (Provenir will care) — how would you approach FE?

**A:**

> Tenant context in auth token / header interceptor; never trust client-only tenant id for security. Theme/config per tenant from API. Isolate feature flags per tenant. Avoid global mutable singletons that leak tenant A data into tenant B (reset stores on tenant switch). Lazy load tenant-specific modules if payloads differ wildly.

### Q12. REST vs WebSockets vs webhooks — when?

**A (JD alignment):**

> **REST** — CRUD, lists, forms (most of my portals).  
> **WebSockets** — live status (RMA tracking updates, device telemetry-style feeds) when duplex/low-latency push needed.  
> **Webhooks** — server-to-server; FE usually sees results via polling/WS/notification API, not receiving webhooks directly.  
> High-frequency WS: buffer/throttle to UI (see your WS scenario guide) so the table doesn’t freeze.

---

## 4. Deep Angular / JS (expect these at 5+ years)

Prepare short crisp answers; point to your guides if practicing.

| Topic | Punchline |
|---|---|
| OnPush vs Default vs zoneless | Two axes: strategy vs scheduler — [CD guide](../angular-interview-prep/ANGULAR_CHANGE_DETECTION_ONPUSH_ZONELESS.md) |
| switchMap vs exhaustMap | Search vs submit button |
| Signals vs RxJS | Sync UI state vs async streams |
| Ivy vs esbuild vs Vite | Compiler vs bundler vs dev server — [build guide](../angular-interview-prep/ANGULAR_BUILD_ESM_WEBPACK_ESBUILD.md) |
| Memory leaks | Unsubscribe / `takeUntilDestroyed` / async pipe |
| Security | XSS, interceptors, HttpOnly cookies, RBAC guards — broker portal |

### Q13. How do you structure a reusable component library (Storybook)?

**A:**

> Presentational components with clear `input()`/`output()`, no hidden global state, documented in Storybook with states (loading/empty/error). Design tokens for spacing/color. Semantic versioning if published. At Netradyne this cut inconsistency and sped feature work — same goal Provenir lists: reusable modules/libraries.

### Q14. Complex reactive forms (Broker portal) — architecture?

**A:**

> FormGroup hierarchy matching domain steps; validators sync + async; valueChanges debounced for side effects; dirty/guard for unload; RBAC hides controls and **also** enforces on API. Auto-logout via idle timer + token expiry interceptor. Why reactive over template-driven? Dynamic fields, cross-field validation, testability — onboarding flows need that.

---

## 5. Behavioral / impact (STAR — exaggerate slightly, stay defensible)

### Q15. Tell me about a time you owned a high-impact feature.

**STAR — Subscription & Hardware Insights**

> **S:** Fleet managers jumped across pages for subscriptions, accessories, devices.  
> **T:** Unify into one module without breaking existing flows.  
> **A:** Mapped journeys, designed cohesive IA, Angular feature module, shared components, incremental migration of entry points.  
> **R:** Customer praise; managers complete workflows in one place; less support confusion.

### Q16. Conflict / hard feedback?

**A (template):** Disagreed on shipping virtual scroll vs “just paginate.” Brought flame charts + user pain (8s load), proposed spike, measured 8s→&lt;2s, aligned. Lesson: data over opinions.

### Q17. Mentoring?

**A:** At TCS cut ramp 4→2 weeks via reviews, pairing, Angular playbook. Mentorship = standards + psychological safety, not gatekeeping.

### Q18. AI tools 40% velocity — aren’t you replacing engineers?

**A:**

> AI accelerates boilerplate and refactors; I still own architecture, edge cases, security, and reviews. Net effect: more time on hard problems (migration seams, performance). I wouldn’t merge AI output I can’t explain.

### Q19. Biggest failure?

**A (honest template):** Early list without trackBy caused jank after API shape change; fixed with identity + OnPush; added checklist item for list PRs. Shows learning.

---

## 6. Full-stack / Provenir JD extras (light but ready)

### Q20. You listed Java/Spring — how deep?

**A:**

> I’m strongest on Angular FE, but I’ve integrated Spring REST APIs, understand pagination contracts, auth headers, and can read service code to unblock FE. Happy to dive deeper on APIs; I won’t pretend to be a staff Java engineer.

### Q21. CI/CD experience?

**A:** Azure DevOps / GitHub, Jest in pipeline, quality gates. Familiar with container/cloud concepts; production FE ownership includes knowing how builds ship and how to roll back.

### Q22. How do you test?

**A:** Jest unit tests for pipes/services/components (Broker ~90%+ coverage claim — be ready with *what* you tested: validators, reducers/selectors, pure transforms). Integration for critical flows; E2E selective. Prefer testing behavior over implementation details.

---

## 7. Machine-coding style (if they switch)

They may give a small Angular task (forms, auth, list). You’ve practiced in `prevonir-interview-practice` (q1–q9).

**Narrate while coding:**

> I’ll keep it interview-simple: signals or ngModel as appropriate, OnPush if time, trackBy on lists, stopPropagation where needed, no over-engineering.

---

## 8. Questions YOU ask them (§ email tip)

Pick 4–5:

1. How is the Angular app structured today — monorepo (Nx?), design system, module boundaries?  
2. Biggest FE pain: performance, multi-tenancy UX, legacy migration, or decisioning workflow complexity?  
3. How do FE engineers work with architecture / decisioning engine teams?  
4. Angular version and roadmap (signals, zoneless, SSR)?  
5. What does success look like in the first 6 months in this role?  
6. Testing and release expectations for UI in a regulated fintech context?

---

## 9. Red flags to avoid

| Don’t | Do |
|---|---|
| “I only do UI, not architecture” | Talk seams, flags, migration, perf budgets |
| Trash React | Tradeoffs |
| Fake Kafka expertise | “Familiar with event-driven conceptually; hands-on is FE + REST/WS” |
| Memorize jargon without story | Tie every claim to Netradyne/TCS bullet |

---

## 10. Day-of cheat sheet (print mentally)

```text
OPEN: 5+ yrs Angular → TCS portals → Netradyne migration + perf + design system → Provenir fit

BIG WINS:
  8s → <2s virtual scroll / 10k rows
  AngularJS → Angular 19 strangler / 500K+ devices
  Feature-flag + normalize API layer
  RMA self-service state machine
  Bundle -20% lazy/tree-shake
  Broker RBAC forms + 90%+ Jest

WHY ANGULAR: enterprise DI/CLI/forms; Next for SEO sites

ASK: architecture pairing, tenancy, Angular version, 6-month success
```

---

## 11. Practice checklist (tonight)

- [ ] Say 60s intro twice out loud  
- [ ] Draw Netradyne HLD on paper in 3 minutes  
- [ ] Rehearse 8s→2s and migration STAR  
- [ ] 5 “why this over that” answers (NgRx, virtual scroll, strangler, Angular, transform layer)  
- [ ] 4 questions for them  
- [ ] Teams dry run  

---

*Update after the interview with what they actually asked — keeps the next round sharper.*
