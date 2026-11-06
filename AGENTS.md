# Agent instructions — intPrep

Read this file first in any new Cursor chat on this repo (including after clone on another machine).

## Who / what this repo is

- Owner prep workspace for **frontend interviews** (JS, CSS, Angular, system design, managerial scenarios).
- Practice Angular machine-coding lives in `prevonir-interview-practice/` (routes `/q1`–`/q9`).
- Prefer **deep markdown guides** + small runnable demos over drive-by refactors.

## How to work here

1. Before answering interview topics, check the matching folder `INDEX.md` and existing guide — **extend** it instead of duplicating.
2. New interview topics → add a guide under the right folder + link from that folder’s `INDEX.md`.
3. Machine-coding demos → keep code **interview-simple** (readable in 45 min), with a short README when non-obvious.
4. Do **not** commit `node_modules/`, `dist/`, `.env`. Root `.gitignore` already covers this.
5. User often wants: deep explanation, good examples, “why this over that”, spoken 20–60s answers.

## Folder map

| Path | Use |
|---|---|
| `javascript-interview-prep/` | Promises, event loop, DSA, deep clone/equal, timeout/retry, polyfills |
| `css-interview-prep/` | Box model, flex, grid, responsive forms |
| `angular-interview-prep/` | Lifecycle, DI, signals, content/templates, unit testing |
| `frontend-system-design/` | CRP, bundles, tree-shaking, pagination, WebSockets, auth, HLD |
| `micro-frontends/` | MFE / Module Federation (overview, NUX split plan, interview story) |
| `backend-interview-prep/` | Backend course 01–25 (BookNest example app). Keep it generic: no former-employer internals |
| `mfe-angular-demo/` | Runnable Angular NF demo — **monorepo** workspace (shell + 2 remotes + shared-auth) |
| `mfe-separate-repos/` | Same MFE demo as **polyrepo** (4 independent packages / “repos”) |
| `scenario-based-questions/` | Architecture scenarios + Licious managerial |
| `onetrust/` | **OneTrust interview hub** (prep plan + resume/MFE/CI-CD story) |
| `goc/` | **Google Operations Center** FE Senior Specialist hub (JD, questions, CMS, STAR) |
| `prevonir-interview-practice/` | Live Angular practice app |
| `practice/` | Node JS scratch (`practice.js`, `polyfills.js`) |
| `CHAT_CONTEXT.md` | **Full handoff** of prior chat decisions & built artifacts |

## Transferring chat to another laptop

1. Clone this repo.
2. Open the folder in Cursor.
3. Tell the agent: `Read AGENTS.md and CHAT_CONTEXT.md first.`
4. Optional: Cursor rules in `.cursor/rules/` auto-apply.

## Git remotes (as of handoff)

- Intended push target discussed: `git@github.com:Shivamr-nd/intprep.git`
- Earlier empty target (other account): `shivamrohillaj26-rgb/intPrep` — SSH key already used on Shivamr-nd account

## Do not

- Big-bang rewrites of practice apps without asking
- Over-engineer q8 file explorer (local `isOpen` is intentional interview-simple pattern)
- Put secrets in guides
