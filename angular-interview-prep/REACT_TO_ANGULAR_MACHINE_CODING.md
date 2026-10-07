# React Machine-Coding Topics → Angular (Interview Map)

From a React interview experience dump — what to practice in **Angular** instead.

---

## Coding tasks (do these in `prevonir-interview-practice`)

| React ask | Angular practice | Route |
|---|---|---|
| Collapse/expand list | Signal `openId` + `@if` | `/q5` |
| Reusable Button variants/sizes | `input()` + `ng-content` + CSS classes | `/q6` |
| Big list windowing | DIY virtual list (or CDK later) | `/q7` |
| File explorer / VS Code sidebar | Recursive tree-node + expanded Set | `/q8` |
| Typeahead / async search | Signals + RxJS + async pipe | `/q4` |

**How to run a “design this component” interview:** [ANGULAR_COMPONENT_DESIGN_ROUND.md](./ANGULAR_COMPONENT_DESIGN_ROUND.md) (autocomplete walkthrough).
| Auth guard flows | Service + functional guard | `/q2` |
| JWT + role-based access | JwtAuthService + jwtAuthGuard + roleGuard + interceptor | `/q9` |

---

## Theory mapping (React phrase → Angular answer)

| React topic | Say in Angular interview |
|---|---|
| Class lifecycle (`componentDidMount`) | `ngOnInit` / `afterNextRender` |
| Hooks (`useState`/`useEffect`) | `signal` / `effect` / RxJS subscriptions with `DestroyRef` |
| Reconciliation / Virtual DOM | Change detection (default vs OnPush) + DOM update |
| Why React re-rendered | What triggered CD: events, inputs, async + markForCheck/signals |
| `key` prop | `@for (...; track id)` |
| Context | DI services / `providedIn` / route providers |
| React.memo | OnPush + pure inputs / signals |
| react-window | CDK `cdk-virtual-scroll-viewport` or DIY window math |
| Build class components ES5 | Pure JS topic — not Angular; skip unless asked as JS |

Deep guides:

- Lifecycle → `ANGULAR_LIFECYCLE.md`  
- DI → `ANGULAR_DEPENDENCY_INJECTION.md`  
- Content projection (Button children) → `ANGULAR_CONTENT_TEMPLATES_QUERIES.md`  

---

## JS / browser topics from the same round (already in other folders)

| Topic | Where to revise |
|---|---|
| Event loop / async | `javascript-interview-prep/EVENT_LOOP.md` |
| Closures, promises, hoisting | `FUNCTIONS.md`, `PROMISES.md`, `ASYNC_AWAIT.md` |
| Promise polyfill | `POLYFILLS_README.md` / `practice/polyfills.js` |
| Async scheduler concurrency | `DSA_FRONTEND_JS.md` § Promise pool |
| Top-k with hash map | practice as small DSA drill |
| Reflow vs repaint | `frontend-system-design/03_REFLOW_REPAINT_RENDERING_PERFORMANCE.md` |
| transform animations | same file + CSS transitions guide |
| Bubbling vs capturing | `EVENT_BUBBLING_CAPTURING_DELEGATION.md` |

---

## HLD from Round 2

| Topic | File |
|---|---|
| Pinterest-like grid | `frontend-system-design/07_PINTEREST_LIKE_GRID_HLD.md` |
| Explain your project HLD | `frontend-system-design/08_PROJECT_HLD_WALKTHROUGH.md` |

---

## Spoken line when they say “in React we do X”

> Same UI problem — in Angular I’d use components + signals/RxJS, DI for shared state, route-level lazy loading, and OnPush/trackBy for list performance. The browser fundamentals (event loop, reflow, event propagation) stay the same.

**Why Angular vs React/Next (managerial / “why this stack”):** [WHY_ANGULAR_VS_REACT_NEXT.md](./WHY_ANGULAR_VS_REACT_NEXT.md)
