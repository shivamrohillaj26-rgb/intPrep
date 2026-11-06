# OneTrust — Cursor skills, rules, and “where does the agent start?”

**One file for:** “What is SKILL.md?” · “How do you define rules for Cursor?” · “When I prompt you, what’s the entry point?”

**NUX source:** `cloud-front-end` — root `AGENTS.md`, `.cursor/rules/*.mdc`, `.cursor/skills/*/SKILL.md`, repo `skills/*/SKILL.md`.  
There is usually **no** file named `skills.md`. The unit is **`SKILL.md` inside a skill folder**.  
**Do not say** laptop folder names. Don’t dump secrets, credentials, or internal Confluence URLs in an interview.

This is **how we steer AI on the IDMS frontend**, not a Cursor source-code dump. I don’t see Cursor’s private binary — I see **what the product injects** (rules, skills list, your prompt) **then I read repo files**.

---

## 0. 40s opener

> On NUX we don’t rely on chat memory. **`AGENTS.md` is the agent constitution** — default target `dashboard/`, golden rules, read order. **`.cursor/rules/*.mdc`** are **machine-loaded constraints** (always-on or glob-scoped). **Skills** are **playbooks**: a folder with **`SKILL.md`** (YAML name + description + steps). Cursor shows the agent a **catalog of skill descriptions**; when the task matches, the agent **must open that `SKILL.md`** and follow it — Figma-first, NDS, Leica, etc.  
> **Entry point when you prompt:** your message + **already-injected rules**. I don’t “boot” from `SKILL.md` first. I start from the **prompt + AGENTS/rules**. Then I **route**: read `AGENTS.md` / feature docs if needed, **load the matching skill**, then grep/read/edit. Skills are **on-demand**; rules are **always in the room**.

---

## 1. Three layers (draw this)

```text
YOUR PROMPT
    │
    ▼
┌─────────────────────────────────────────┐
│  Cursor session context (injected)      │
│  • system + tools                       │
│  • User rules                           │
│  • Repo AGENTS.md / always-on .mdc      │
│  • Skill CATALOG (names + descriptions) │
└─────────────────────────────────────────┘
    │
    ▼
Agent decides: which SKILL.md to READ
    │
    ▼
Tools: Read / Grep / Edit  →  code + docs
```

| Layer | What it is | When it loads |
|---|---|---|
| **Rules** | “Never do X / always do Y” | Auto (alwaysApply or file glob) |
| **AGENTS.md** | Repo **constitution** + where to code | Agents are told to read first; often always in context |
| **Skill (`SKILL.md`)** | **How to do a job** (Figma → NDS → PR) | When the **description matches** the prompt — then **read the file** |

**Trap:** “Skills.md is the main entry.” **No.** **`AGENTS.md` + your prompt** are the entry. **`SKILL.md` is a specialist manual.**

---

## 2. What a skill is (in general)

Cursor (and similar agents) use the **Agent Skills** pattern:

```text
.cursor/skills/my-skill/
  SKILL.md          ← required
  standards.md      ← optional extras
  scripts/          ← optional
```

**`SKILL.md` shape:**

```markdown
---
name: netradyne-nux20-frontend-architect
description: Architects NUX 2.0 dashboard work... Use when designing dashboard features, Figma to Angular, NDS...
---

# Title
## Use this skill when
## Read first
## Steps
```

- **`name`:** id  
- **`description`:** **this is the trigger.** The model sees this in a list. If your prompt looks like that job, it should **Read `SKILL.md` immediately** — not invent the workflow.  
- **Body:** steps, links, don’t-guess rules.

**Personal vs project:**

| Where | Scope |
|---|---|
| `~/.cursor/skills/` | Your machine, all repos |
| `.cursor/skills/` | **This git repo** — teammates get it |
| Cursor built-in (`skills-cursor`) | Product skills (create-rule, Figma, …) — not our NUX playbook |

**NUX also has** `skills/netradyne-angular-nds/SKILL.md` at **repo root `skills/`** so any agent (not only Cursor) can load the same playbook (`AGENTS.md` says: if the personal skill isn’t installed, load that file).

---

## 3. What NUX actually has (names you can say)

| Path | Job |
|---|---|
| Root **`AGENTS.md`** | **Start here.** Default `dashboard/`, golden rules, mandatory read order, memory files, pointer to skills |
| **`dashboard/AGENTS.md`** | Dashboard-only |
| **`dashboard/docs/ai/CONTEXT_ROUTER.md`** | Topic → **few files** (don’t dump the whole repo into context) |
| **`.cursor/rules/*.mdc`** | Dozens of Cursor rules (i18n, tokens, no `*ngIf`, e2e video, …) |
| **`.cursor/skills/netradyne-nux20-frontend-architect/SKILL.md`** | Architect skill: Figma, NDS, Jira cache, Leica screenshots |
| **`skills/netradyne-angular-nds/SKILL.md`** | Implement dashboard/NDS features, API via credentials not guess |
| **`docs/governance/RULE_HIERARCHY.md`** | If docs conflict: constitution **>** `.mdc` **>** feature docs **>** “copy existing code” |

**Always-on example:** `dashboard-default-target.mdc` — `alwaysApply: true` — new work goes to **`dashboard/`**, not stale `console-beta`.

**.mdc frontmatter (how we “define rules”):**

```yaml
---
description: Default coding target is dashboard/
globs: []          # or **/*.html to apply only on HTML
alwaysApply: true  # every chat vs only matching files
---
```

Body = the law (tokens, i18n, no `--no-verify`, …).

**Hierarchy (say this):** `AGENTS.md` / constitution **wins**. Then **`.mdc`**. Then dashboard AGENTS. Then feature markdown. Code is last.

---

## 4. “You are Cursor — where do you go when I prompt?”

Honest loop (this product, this session):

```text
1. You type. Cursor builds ONE request:
   system + tools + user rules + workspace always-on rules
   + skill catalog (descriptions, not always full SKILL.md bodies)

2. I read YOUR question first.

3. If a workspace rule says “read AGENTS.md” — I do (or it’s already inlined).

4. If the catalog has a skill whose description matches
   (Figma, PR, infinite scroll, …) → I READ that SKILL.md NEXT
   before implementing.

5. Then tools: INDEX.md / grep / existing code — don’t reinvent.

6. Then edit / run. Skills can add more reads (standards.md, Figma MCP).
```

**Main entry point in the *repo*:** **`AGENTS.md`**.  
**Main entry point in the *product*:** **the user prompt** plus **injected rules**.  
**Not** “I always open SKILL.md first.”

**intPrep analogy (same idea, smaller):** `AGENTS.md` + `.cursor/rules/intprep-handoff.mdc` + folder `INDEX.md`. I extend existing guides; I don’t mix GOC and OneTrust.

---

## 5. Rules vs skills vs memory (trap table)

| | Rules (`.mdc`) | Skill (`SKILL.md`) | `memory/*.md` |
|---|---|---|---|
| Size | Short, enforceable | Longer playbook | Rolling facts |
| Load | Automatic | On match + explicit Read | AGENTS tells agent to open |
| Example | No `*ngFor` in dashboard HTML | “Figma MCP then NDS then Leica” | Current feature, ports |

**Why both:** Rules stop **illegal** diffs. Skills stop **lost** agents (wrong folder, skip Figma, guess APIs).

**CONTEXT_ROUTER:** load **5–8 files**, not the whole monorepo — token budget. Senior line: “We gate context on purpose.”

---

## 6. Q bank

**Q: What is SKILL.md?**  
A markdown playbook with YAML `name`/`description`. Teaches the agent a **workflow**. Description = **when to use**.

**Q: skills.md?**  
Convention is **`SKILL.md` in a folder**, not one root `skills.md`.

**Q: How do you define rules?**  
`.cursor/rules/*.mdc` + frontmatter `alwaysApply` / `globs`. Constitution in `AGENTS.md`. Hierarchy doc if they conflict.

**Q: Cursor entry point?**  
Prompt + injected rules. Repo start = `AGENTS.md`. Matching skill is **read on demand**.

**Q: Why not put everything in one rule?**  
Context window. Rules stay small; skills stay lazy-loaded; router maps topics to files.

**Q: Copilot vs Cursor?**  
Same **markdown contracts** (`AGENTS.md`, `skills/`) so Claude/Copilot/Cursor share one source of truth. `.mdc` is **Cursor-shaped**; other tools still read `AGENTS.md`.

---

## 7. Don’t mix

- This is **process**, not Angular CDK. Infinite scroll → file **13**.  
- Don’t recite internal Figma/Jira URLs in a vendor interview.  
- Don’t claim Cursor “runs SKILL.md like `package.json`.” It’s **instructions for the model**, not a Node entry.
