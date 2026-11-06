# Previous questions — GOC frontend & similar roles

**Honesty:** GOC does not publish a public question bank for this exact “Senior Specialist — Front End” title. Below is **sourced** public data + **JD-inferred** questions. Treat “likely” as likely, not guaranteed.

---

## 0. How GOC says they interview (official)

Source: [How We Hire — Google Operations Center](https://googleoperationscenter.com/how-we-hire/)

| They say | What it means for you |
|---|---|
| Recruiter → several interviews with teammates | 2–3 rounds is common on AmbitionBox for GOC overall |
| **Behavioral** (“tell me about a time”) + **hypothetical** (“imagine that…”) | STAR is expected; they *tell you* to use it |
| Role-related knowledge, problem-solving, collaboration, working style | Not only coding |
| Open-ended; **thought process + data** > one “right” answer | Talk while coding |
| **No AI / external resources** in interview | Close extra tabs |
| Panel reviews feedback; they warn process can take **6–8 weeks** | Don’t panic if tomorrow isn’t the last round |
| Virtual: Google Meet, log in 5 min early | Have phone as backup |

AmbitionBox (company-wide, mostly ops/analyst): typically **2–3 rounds** (technical, one-on-one, resume). Software-developer threads are thin; **don’t overfit ops-role questions**.

---

## 1. Real GOC frontend L1 (React-leaning team) — highest signal

Source: [Navaneeth Kaila — GOC L1, LinkedIn](https://www.linkedin.com/posts/navaneeth-kaila_goc-frontendengineering-reactjs-activity-7356732542684729345-9Nd_) (~Jul 2025)

This is the **only detailed GOC FE technical round** found. Their stack was React; **your JD is Angular** — same *shape*, translate.

| # | Question they asked | Your Angular / JS version |
|---|---|---|
| 1 | What is **Reconciliation** in React? When does it matter at enterprise scale? | Ivy incremental DOM / CD: what dirty-checks, OnPush, signals skip subtrees. [ANGULAR_CHANGE_DETECTION_ONPUSH_ZONELESS.md](../angular-interview-prep/ANGULAR_CHANGE_DETECTION_ONPUSH_ZONELESS.md) |
| 2 | **Redux Toolkit** in a large SPA: slices, selectors, anti-patterns | NgRx: actions → effects → reducers → selectors; don’t dump 100 APIs into the store. [ANGULAR_NGRX_DATA_FLOW.md](../angular-interview-prep/ANGULAR_NGRX_DATA_FLOW.md) |
| 3 | **E-commerce listing** slow: diagnose **initial load** vs **filter/sort** | LCP vs INP; virtual scroll, debounce, memoize filter, pagination. [ANGULAR_OPTIMIZE_APPLICATION.md](../angular-interview-prep/ANGULAR_OPTIMIZE_APPLICATION.md) |
| 4 | **MFE communication** + isolation | Event bus vs shared lib vs URL vs custom events; you have NUX Federation story. [ONETRUST_MFE_SENIOR_ROUND.md](../onetrust/ONETRUST_MFE_SENIOR_ROUND.md) is OneTrust-shaped but the **tech** is the same — tell it as IDMS, not OneTrust. |
| 5 | **CSS + JS conflicts** across MFEs | Shadow DOM, prefix, Angular emulated encapsulation, shared design tokens, don’t load two Angular runtimes. |
| 6 | **JS:** sort tasks with `dependsOn` + `priority` | Full write-up: [GOC_JS_TASK_SORT.md](./GOC_JS_TASK_SORT.md) |
| 7 | Write **`debounce()`** + explain **closure** | [DEBOUNCE_THROTTLE.md](../javascript-interview-prep/DEBOUNCE_THROTTLE.md) |

---

## 1b. GOC coding (your round, Sep 2026) — **3Sum**

They asked **triplets that sum to 0** (“threesome”).

| You did | They wanted |
|---|---|
| Fix one index + **Map/Set** Two Sum | Same O(n²) **time**, **no hash** |
| O(n²) time, **O(n) extra space** | O(n²) time, **O(1) extra space** |

**Answer:** sort + two pointers. Drill [DSA_FRONTEND_JS.md](../javascript-interview-prep/DSA_FRONTEND_JS.md) **§1b** until you can write it from memory (duplicate skips).

Same family if they keep going: Two Sum on sorted array, move zeros, container with most water — all **O(1) extra**.

**Spoken 20s if they used React terms:** “Same idea in Angular: we avoid re-rendering work we don’t need. React diffs a virtual tree; Angular marks views dirty and checks bindings — OnPush and signals shrink that work.”

---

## 2. GOC behavioral / hypothetical (ops + specialist culture)

Sources: GOC How We Hire; [Medium — GOC interview](https://medium.com/@fcuadillera/what-its-like-to-be-interviewed-by-google-fcca8f1bf198) (not FE-specific, but **GOC process**).

They literally coach candidates with:

- Tell me about a time you **failed** / missed a **deadline**. What did you miss? What did you learn?
- Tell me about a time you **led** a team.
- Tell me about a time you **communicated** effectively.
- Why are you looking **outside** your current company?
- Hypothetical: teammate skipped a step that could **delay operations** — what do you do?

Plus their sample hypothetical (ads/customer ops) — for **you**, rewrite as: “Imagine a CMS publish tomorrow and Lighthouse LCP is 6s on the homepage…”

Prep answers: [GOC_BEHAVIORAL.md](./GOC_BEHAVIORAL.md).

---

## 3. Similar *title* — GOC Developer Specialist (Application Engineering)

Public JDs for **Developer Specialist — Application Engineering** at GOC (Bangalore etc.) ask for:

- Feature delivery on **internal + external** apps
- Scale without breaking SLOs
- Docs in sync with implementation
- Production bugs, high user satisfaction
- Angular **or** React; HTML/CSS/JS/TS; sometimes Java/Spring on the same posting

Expect: **debug a prod UI bug**, **how you test**, **how you don’t break SLAs** when traffic grows.

---

## 4. Do **not** confuse with Google Inc Staff FE

[Frontend Junction — Google Staff Frontend](https://www.frontend-junction.com/interview-experience/google-staff-frontend-engineer-interview-experience) is **Google**, not GOC: typeahead + debounce, custom form hook, CSR vs SSR, Google Doc coding, leadership.

Useful **practice**, overkill as the default GOC loop. If tomorrow feels “Google-y,” those problems still help.

Google’s old **Front End SWE prep** (public PDF via Frontend Interview Handbook) still lists: XSS/XSRF, prototypes, DOM, CSS, events, XHR/headers, closures, latency. Your repo already covers most of this.

---

## 5. JD-shaped question bank (practice these out loud)

**UI / CSS** — full speak list: [GOC_CSS.md](./GOC_CSS.md)

- Pseudo-**class** vs pseudo-**element**; `:focus-visible`; `::before` + `content`; `nth-child` vs `nth-of-type`; `:has` / `:where`.
- Responsive layout: Flex vs Grid, mobile-first, container queries if you know them.
- How you match Figma spacing/type (CSS variables) without pixel-pushing forever.
- Cross-browser: what you actually test.
- MFE: how `.btn:hover` doesn’t leak (GOC L1).

**JS / TS**

- Debounce vs throttle (they asked debounce in L1).
- Event delegation.
- Closures / event loop output (one question).
- Flatten / group / sort API data for a listing.
- **3Sum** (unique triplets → 0) — Map is OK then they may demand **sort + two pointers, O(1) extra**. [DSA_FRONTEND_JS.md](../javascript-interview-prep/DSA_FRONTEND_JS.md) §1b.

**Angular (this JD)**

- Component communication; `OnPush` + `async` pipe.
- Why not call methods in templates.
- Lazy routes + `CanMatch` / guards if the app is authenticated.
- Signals vs RxJS — when each.
- Webpack vs Vite / Angular application builder.

**Performance (literal JD)**

- Walk a slow page: network waterfall → JS parse → render → interaction.
- Images, fonts, hydration if SSR, `trackBy` / `@for track`.
- How you’d measure (Lighthouse, Performance panel, Web Vitals).

**CMS (literal JD)**

- Coupled vs headless. Preview. Cache. Content model vs Angular components. [GOC_CMS_HEADLESS.md](./GOC_CMS_HEADLESS.md)

**Quality**

- What you look for in a PR.
- How you unit-test a presentational component.

**Design collab**

- Designer wants an animation that tanks INP — what do you do?

---

## 6. What I could **not** find

- No Glassdoor dump of “Senior Specialist Front End GOC Gurgaon” with a full transcript.
- No official Brightspot-on-GOC interview sheet (Brightspot *is* named on **this** JD’s preferred list; some Google *marketing* sites historically used Brightspot — treat as **possible team stack**, not confirmed).

If the recruiter named a team (Ads, Help Center, marketing, internal tools), tell me and we tighten this.
