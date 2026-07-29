# intPrep — Frontend Interview Prep

Personal interview preparation workspace: JavaScript, CSS, Angular, frontend system design, scenario questions, and practice apps.

## Continue on another laptop / new Cursor chat

After `git clone`, open this folder in Cursor and start with:

> Read `AGENTS.md` and `CHAT_CONTEXT.md` first, then continue interview prep.

| File | Purpose |
|---|---|
| [`AGENTS.md`](./AGENTS.md) | Short instructions for the AI agent |
| [`CHAT_CONTEXT.md`](./CHAT_CONTEXT.md) | Full prior-session handoff (decisions, apps, topics) |
| [`.cursor/rules/intprep-handoff.mdc`](./.cursor/rules/intprep-handoff.mdc) | Auto-applied Cursor rule |

## Contents

| Folder | What |
|---|---|
| [`javascript-interview-prep/`](./javascript-interview-prep/) | Event loop, promises, async/await, deep clone/equal, DSA, polyfills, timeout/retry, … |
| [`css-interview-prep/`](./css-interview-prep/) | CSS interview topics |
| [`angular-interview-prep/`](./angular-interview-prep/) | Lifecycle, DI, signals, content/templates, unit testing, … |
| [`frontend-system-design/`](./frontend-system-design/) | CRP, bundles, tree-shaking, pagination, WebSockets, auth, HLD |
| [`scenario-based-questions/`](./scenario-based-questions/) | Architecture scenarios + Licious managerial round |
| [`prevonir-interview-practice/`](./prevonir-interview-practice/) | Angular machine-coding practice app (q1–q9) |
| [`angular-interview-app/`](./angular-interview-app/) | Angular demo app |
| [`practice-angular/`](./practice-angular/) | Angular playground |
| [`practice/`](./practice/) | JS practice scripts |
| [`prevonir/`](./prevonir/) | Source material |

## Quick starts

```bash
# Machine-coding practice app
cd prevonir-interview-practice && npm install && npm start

# JS practice
node practice/practice.js
```

## Notes

- `node_modules/` and build outputs are gitignored — run `npm install` inside each app as needed.
- Guides are markdown; start from each folder’s `INDEX.md` when present.
