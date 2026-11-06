# Chat / session handoff — intPrep

**Purpose:** Carry forward the long Cursor chat context when this repo is cloned on another machine.  
**For humans + agents:** Read `AGENTS.md` first, then this file.

Last major handoff window: ~Sep 2026 (GOC FE Senior Specialist hub added; OneTrust remains separate).

---

## 1. User profile (how to help)

- Preparing for **frontend interviews** (often Angular + JS fundamentals + system design).
- Likes **deep guides** with examples, tradeoffs (“why A over B”), and short spoken answers.
- Practices Provenir/HackerRank-style Angular tasks in `prevonir-interview-practice/` (folder name is a typo of Provenir; keep as-is).
- Also preps managerial rounds (Licious-style: SSE/WS, bundles, gRPC, BFF, tree-shaking, conflict STAR).
- Parallel tracks: **OneTrust** (`onetrust/`) vs **Google Operations Center** FE Senior Specialist (`goc/`) — different chats; don’t mix.

---

## 2. What was built in the long chat (inventory)

### Guides — `javascript-interview-prep/`

Notable files (not exhaustive — see `INDEX.md`):

- Event loop, promises, async/await, promises vs observables  
- **Scopes** (lexical, var/let/const, TDZ, scope chain, closures)  
- **Full RxJS interview guide** (flattening ops, Subjects, combine*, shareReplay, tricky Qs)  
- Deep clone + **deep equal** (twin questions)  
- Debounce/throttle, polyfills, EventEmitter, LRU, DSA frontend JS  
- **Event bubbling / capturing / delegation** (upgraded: drills, passive, React/Angular, Q bank)  
- Custom sort by priority map (`easy → medium → hard`)  
- API timeout + retry (`Promise.race`, factory retry) + **Angular RxJS `timeout`/`retry`**  
- Tricky 10 frontend questions map  
- Easy–medium coding gaps filled: cancellable fetch, `once(fn)`, generate parentheses, running median, `set`/snake↔camel, infinite-scroll races; deepEqual order-insensitive primitives (§14)  
 

### Guides — `angular-interview-prep/`

- Lifecycle, DI, ng-content / ViewChild, ecosystem fundamentals  
- **Signals** (deep: computed, effect, linkedSignal, resource)  
- **Change detection: Default vs OnPush vs Zoneless** (two axes, v20.2/v21 defaults, showcase + interview Qs)  
- **Angular build pipeline** (ESM, Webpack → esbuild/Vite application builder)  
- **Angular version → features timeline** (9 Ivy … 17 landmark … 21 zoneless default)  
- Unit testing (Jest, Jasmine, Karma, TestBed)  
- React → Angular machine-coding map  
- **Why Angular vs React/Next** (batteries-included, DI, tradeoffs, spoken answers)  

### Guides — `micro-frontends/`

- All MFE / Module Federation docs moved here: `micro-frontends/INDEX.md`
- Overview, deep NUX breakup, interview story, MF split plan, 3-team scenario
- **Runnable demo (monorepo):** `mfe-angular-demo/` (shell :4200 + Safety :4201 + Fleet :4202 + `shared-auth`)
- **Runnable demo (polyrepo):** `mfe-separate-repos/` (4 independent packages; `file:` shared-auth)
- Walkthrough: `09` / file-by-file `10` / polyrepo `11`

### Guides — `backend-interview-prep/`

- Full backend course (frontend → full stack / backend switch), start at `backend-interview-prep/INDEX.md`
- 25 guides: request lifecycle, REST, Java, concurrency, Spring Boot, Quarkus, SQL, JPA, migrations, auth, caching, messaging, microservices, gRPC, OpenSearch, testing, observability, Docker/AWS, Node, system design, question bank (148 Qs + 2-week drill), plus reference guides 22 architecture patterns catalog, 23 SOLID/GoF/LLD, 24 AWS foundations (IAM/VPC/KMS), 25 AWS services and how they connect (invocation/retry models, connection map, end-to-end flows)
- One made-up example app throughout: **BookNest** (bookstore). **Deliberately generic:** no former-employer (Netradyne) code, schemas, service names or configs — same technologies only, because the repo is pushed to personal GitHub and the new offer forbids bringing confidential info

### Guides — `frontend-system-design/`

- CRP, bundles/split/lazy, reflow/repaint, HTTP/1 vs 2  
- Web workers, service workers, CORS, auth security (`10_FRONTEND_AUTH_SECURITY.md` — storage, HttpOnly, XSS/CSRF)
- Cyberattacks interview guide: `frontend-system-design/17_CYBERATTACKS_FRONTEND_INTERVIEW.md`
- LinkedIn Q coverage (NTT/Persistent/Optum): `scenario-based-questions/INTERVIEW_QUESTION_COVERAGE_MAP.md` + new guides (pipe/compose, template fns, router.navigate, NgRx, memory leaks, upgrade, shared lib)  
- Pinterest HLD, project HLD walkthrough  
- **Tree shaking Mark-and-Sweep / DCE** (EM “how not what”)  
- **Pagination types** (offset vs cursor × UI patterns)  
- **WebSockets how they work** (Upgrade → 101 → frames)  
- **CSR / SSR / SSG / hydration** (deep + decision matrix)  
- **Micro frontends** (Federation / Native Federation, when not to)  

### Guides — `scenario-based-questions/`

- Scenarios 01–10 **Angular-specific** (HttpClient, NgRx vs resource, Native Federation, Zone/WS, CDK virtual, `@angular/ssr`, Nx CI) + `CHEATSHEET.md`  
- `LICIOUS_MANAGERIAL_FRONTEND.md` (Angular-first spoken)  
- **`PROVENIR_SOFTWARE_ENGINEER_INTERVIEW_PREP.md`** (resume-based mock interviewer Q&A for Provenir Angular SE)
- **OneTrust hub:** `onetrust/` (`INDEX.md`, Angular prep, resume + MFE + CI/CD story). **HM 30 min (post-R3):** `ONETRUST_HM_ROUND.md`. Env/API: `ONETRUST_ENVIRONMENT_STORY.md`. Iframe leftover `/app` + postMessage: `ONETRUST_IFRAME_BRIDGE.md`. **Iframe auth snapshots (study first):** `ONETRUST_IFRAME_AUTH.md`. Auth deep dump: `ONETRUST_AUTH_FLOW.md`. **Auth revision diagrams + Q&A:** `ONETRUST_AUTH_REVISION.md`. **OAuth 1/2 vs JWT vs why session:** `ONETRUST_OAUTH_JWT_SESSION.md`. **HttpOnly cookies + MFE kernel auth plan:** `ONETRUST_HTTPONLY_MFE_AUTH.md`. **MFE auth mental model (POC vs HttpOnly next):** `ONETRUST_MFE_AUTH.md`. **CI/CD one picture (study first):** `ONETRUST_CICD.md`. **Current CI/CD vs Nx+MFE spoken card:** `ONETRUST_CICD_NX_MFE.md`. **R3 Angular optimize / bundle / CD:** `ONETRUST_ANGULAR_OPTIMIZATION.md`. **Jenkins build vs deploy env diagrams:** `ONETRUST_JENKINS_ENV_DEPLOY.md`.
- **GOC hub:** `goc/` (JD, previous questions, CMS, behavioral, task-sort coding) — Angular + perf + headless CMS; not Google Inc SWE
- **`frontend-system-design/16_NETRADYNE_IDMS_PROJECT_HLD.md`** — round-2 project HLD from local `Desktop/Ternary` (Netradyne IDMS; not Ternary FinOps)
- **`frontend-system-design/18_NETRADYNE_DEVOPS_CI_CD.md`** — Jenkins, multi-env stamp, S3 artifacts, GHA vs Jenkins, PM2 host, BE pipeline (from Ternary)  
- `CHEATSHEET.md`  

### Practice app — `prevonir-interview-practice/`

| Route | Feature | Notes |
|---|---|---|
| `/q1` | Responsive form | CSS Grid 6-col |
| `/q2` | Simple auth | ngModel + guard |
| `/q3` | Meal scheduler | ViewChild, Input/Output |
| `/q4` | Typeahead | 4 approaches; `toObservable` vs `of()` trap documented |
| `/q5` | Expand list | Accordion |
| `/q6` | UI Button | variants/sizes |
| `/q7` | Virtual list | 10k rows, signals + computed |
| `/q8` | File explorer | **Simplified:** local `isOpen` per node; parent owns tree + immutable add/delete; deep `README.md` |
| `/q9` | JWT + RBAC | guards, interceptor; demo users john/John@123, admin/Admin@123 |
| `/q10` | Pipe + directive | `TruncatePipe` args + `HighlightDirective` inputs/`HostBinding` |
| `/q11` | Reactive forms | `FormBuilder`, validators, **FormArray** phones, submit errors |
| Guide | Reactive forms deep | `angular-interview-prep/ANGULAR_REACTIVE_FORMS.md` |
| `/q12` | Basic calculator | one-component: digits, 4 ops, `=`, `C`, no `eval` (~20 min) |
| `/q13` | Structural `*appFor` | TemplateRef + ViewContainerRef |
| `/q14` | DI scopes | Five labeled steps: Login (root), two desks (component), notepad (route), BootStamp (appConfig), FORGOTTEN — `onetrust/ONETRUST_ANGULAR_DI_PROVIDERS.md` §2b |

Run: `cd prevonir-interview-practice && npm i && npm start`

### Other apps

- `angular-interview-app/`, `practice-angular/` (cart, chat-bot), `practice/` JS scripts, `prevonir/` source material, `css-interview-prep/`

---

## 3. Important technical decisions (don’t undo casually)

| Topic | Decision |
|---|---|
| q8 expand state | **Local `isOpen` signal** on `TreeNode` (interview-simple). Lifted `Set` is the “senior follow-up” answer, not the default code. |
| q8 add/delete | Parent `tree` signal + immutable `insertChild` / `removeNode`; buttons use `stopPropagation`. |
| Server vs client state | Prefer TanStack/RTK Query for API cache; don’t dump 100 APIs into Redux. |
| Feeds vs admin lists | Cursor + infinite/load-more for feeds; page/offset for admin/SEO. |
| Tree-shaking EM answer | DCE on Module Dependency Graph via Mark-and-Sweep — not just “removes unused code”. |
| WS vs SSE | Duplex → WebSocket; server-push-only → SSE. |
| API timeout challenge | `Promise.race` + timer; retry must take `() => api()` factory. |
| CD Default / OnPush / zoneless | Two axes: strategy (which views) vs scheduler (Zone vs zoneless). v20.2 zoneless API stable; v21+ zoneless default for new apps. OnPush still set per component. |
| RxJS flattening | Search → `switchMap`; button spam → `exhaustMap`; ordered writes → `concatMap`; parallel → `mergeMap`. `shareReplay({ bufferSize: 1, refCount: true })`. |
| Angular build | Source ESM → Ivy AOT → bundler. Webpack historically; esbuild **application builder default since v17**; Webpack deprecated → `@angular/build`. |

---

## 4. Teaching points already covered (don’t re-derive from zero)

- House Robber vs Kadane confusion (called out in older chat)  
- Arrow `this` in EventEmitter `off`  
- Grid `1fr`, equal columns vs fixed 6-col spans  
- `viewChild` ElementRef vs HTMLInputElement  
- `computed` cannot replace RxJS debounce/switchMap  
- File explorer: recursion + event re-emit for add/remove only (after simplify)  
- Typeahead: `toObservable(signal)` live stream vs `of(signal())` one-shot  

---

## 5. Git / multi-machine notes

- Repo intended for GitHub: **`Shivamr-nd/intprep`** (`git@github.com:Shivamr-nd/intprep.git`)  
- Other account `shivamrohillaj26-rgb/intPrep` may exist empty; SSH key is tied to **Shivamr-nd** (“key already in use” on the other account).  
- Local commits may already exist before push — check `git remote -v` and `git log`.  
- `node_modules` gitignored — after clone: `npm install` inside each Angular app.  
- Helper script: `PUSH_TO_YOUR_GITHUB.sh` (optional).  

### After clone on a new laptop

```bash
git clone git@github.com:Shivamr-nd/intprep.git
cd intprep   # or folder name as cloned
# Open in Cursor
# New chat: "Read AGENTS.md and CHAT_CONTEXT.md — continue interview prep from prior sessions."
cd prevonir-interview-practice && npm install && npm start
```

---

## 6. Preferred answer style for this user

1. Clarify assumptions briefly  
2. Deep explanation + concrete code  
3. Tradeoff table when architecture  
4. 20–60s spoken answer  
5. Link/update existing INDEX rather than orphan files  
6. Keep practice code minimal and narratable in interviews  

---

## 7. Suggested next topics (if user asks “what’s next”)

- Playwright E2E + Angular Testing Library  
- More machine-coding: autocomplete advanced, kanban, calendar  
- Web Vitals monitoring deep dive  
- Forms deep dive (template + reactive under zoneless)  
- RxJS practice: redraw flattening timelines from memory ([RXJS_INTERVIEW.md](./javascript-interview-prep/RXJS_INTERVIEW.md))  

---

## 8. Cursor wiring

| File | Role |
|---|---|
| `AGENTS.md` | Short always-on agent entry |
| `CHAT_CONTEXT.md` | This handoff (long memory) |
| `.cursor/rules/intprep-handoff.mdc` | Auto-applied rule pointing agents here |
| `README.md` | Human overview |

When starting a **new** chat after clone, user (or agent bootstrap) should say:

> Read `AGENTS.md` and `CHAT_CONTEXT.md` first, then continue.

---

*Update this file when major new guides/apps or decisions land so the next machine stays current.*
