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
| [`angular-interview-prep/`](./angular-interview-prep/) | Lifecycle, DI, signals, CD/zoneless, build, version features, why Angular vs React/Next, unit testing, … |
| [`frontend-system-design/`](./frontend-system-design/) | CRP, bundles, tree-shaking, pagination, WebSockets, auth, HLD |
| [`micro-frontends/`](./micro-frontends/) | MFE / Module Federation (overview, NUX split plan, interview story) |
| [`backend-interview-prep/`](./backend-interview-prep/) | Full backend course: Java, Spring/Quarkus, SQL, auth, caching, Kafka, microservices, AWS, Node, system design (start at `INDEX.md`) |
| [`mfe-angular-demo/`](./mfe-angular-demo/) | MFE demo — monorepo workspace |
| [`mfe-separate-repos/`](./mfe-separate-repos/) | MFE demo — separate packages (polyrepo hands-on) |
| [`scenario-based-questions/`](./scenario-based-questions/) | Architecture scenarios + Licious managerial round |
| [`onetrust/`](./onetrust/) | OneTrust Angular interview (start at `INDEX.md`) |
| [`goc/`](./goc/) | Google Operations Center FE Senior Specialist (start at `INDEX.md`) |
| [`prevonir-interview-practice/`](./prevonir-interview-practice/) | Angular machine-coding practice app (q1–q9) |
| [`angular-interview-app/`](./angular-interview-app/) | Angular demo app |
| [`practice-angular/`](./practice-angular/) | Angular playground |
| [`practice/`](./practice/) | JS practice scripts |
| [`prevonir/`](./prevonir/) | Source material |

## Quick starts

```bash
# Machine-coding practice app
cd prevonir-interview-practice && npm install && npm start

# Micro frontend demo — monorepo
cd mfe-angular-demo && npm install && npm run start:all

# Micro frontend demo — separate repos (polyrepo)
cd mfe-separate-repos && ./scripts/start-all.sh

# JS practice
node practice/practice.js
```

## Notes

- `node_modules/` and build outputs are gitignored — run `npm install` inside each app as needed.
- Guides are markdown; start from each folder’s `INDEX.md` when present.
