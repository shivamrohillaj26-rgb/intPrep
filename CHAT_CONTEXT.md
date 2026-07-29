# Chat / session handoff — intPrep

**Purpose:** Carry forward the long Cursor chat context when this repo is cloned on another machine.  
**For humans + agents:** Read `AGENTS.md` first, then this file.

Last major handoff window: ~Jul 2026 interview prep sessions.

---

## 1. User profile (how to help)

- Preparing for **frontend interviews** (often Angular + JS fundamentals + system design).
- Likes **deep guides** with examples, tradeoffs (“why A over B”), and short spoken answers.
- Practices Provenir/HackerRank-style Angular tasks in `prevonir-interview-practice/` (folder name is a typo of Provenir; keep as-is).
- Also preps managerial rounds (Licious-style: SSE/WS, bundles, gRPC, BFF, tree-shaking, conflict STAR).

---

## 2. What was built in the long chat (inventory)

### Guides — `javascript-interview-prep/`

Notable files (not exhaustive — see `INDEX.md`):

- Event loop, promises, async/await, promises vs observables  
- Deep clone + **deep equal** (twin questions)  
- Debounce/throttle, polyfills, EventEmitter, LRU, DSA frontend JS  
- Custom sort by priority map (`easy → medium → hard`)  
- API timeout + retry (`Promise.race`, factory retry)  
- Tricky 10 frontend questions map  

### Guides — `angular-interview-prep/`

- Lifecycle, DI, ng-content / ViewChild, ecosystem fundamentals  
- **Signals** (deep: computed, effect, linkedSignal, resource)  
- Unit testing (Jest, Jasmine, Karma, TestBed)  
- React → Angular machine-coding map  

### Guides — `frontend-system-design/`

- CRP, bundles/split/lazy, reflow/repaint, HTTP/1 vs 2  
- Web workers, service workers, CORS, auth security  
- Pinterest HLD, project HLD walkthrough  
- **Tree shaking Mark-and-Sweep / DCE** (EM “how not what”)  
- **Pagination types** (offset vs cursor × UI patterns)  
- **WebSockets how they work** (Upgrade → 101 → frames)  

### Guides — `scenario-based-questions/`

- Scenarios 01–10 (dashboard polling, state libs, MFEs, Redux bloat, WS freezes, TS migration, SEO, 100k rows, scale to 5M, CI/CD)  
- `LICIOUS_MANAGERIAL_FRONTEND.md`  
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

- Change detection + OnPush + zoneless (pairs with signals)  
- Playwright E2E + Angular Testing Library  
- More machine-coding: autocomplete advanced, kanban, calendar  
- Web Vitals monitoring deep dive  

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
