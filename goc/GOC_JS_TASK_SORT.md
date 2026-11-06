# GOC L1 coding — tasks with dependencies + priority

Reported on a **GOC frontend L1** (React team, Jul 2025). Same question is fair on an Angular JD.

---

## Problem (as posted)

```js
const tasks = [
  { id: 'T1', name: 'Submit Report', priority: 2, dependsOn: null },
  { id: 'T2', name: 'Review Docs', priority: 1, dependsOn: 'T4' },
  { id: 'T3', name: 'Attend Meeting', priority: 3, dependsOn: null },
  { id: 'T4', name: 'Prepare Presentation', priority: 1, dependsOn: null },
  { id: 'T5', name: 'Follow up on email', priority: 2, dependsOn: 'T1' },
  { id: 'T6', name: 'Clean Desk', priority: 5, dependsOn: null },
];
```

**Requirement (their words):**

1. Show **non-dependent** tasks first, sorted by priority.
2. Then show **dependent** tasks, **only after** their dependencies.
3. Maintain priority sorting **within groups**.

**Clarify in the interview:** lower `priority` number = more important (usual). If they say opposite, invert the comparator.

---

## What they actually want

This is **topological sort** (Kahn) with a **priority queue** among tasks whose deps are done — **not** “sort the array by `dependsOn == null` then concat the rest” (that can run `T2` before `T4`).

If they *literally* want two buckets:

- Bucket A: `dependsOn == null`, sort by priority  
- Bucket B: the rest, but still only emit when parent already emitted, sort by priority among ready nodes  

Kahn with “ready set sorted by priority” **is** that: roots (`indegree 0`) come first; `T2` waits for `T4`.

---

## Walkthrough

Graph: `T4 → T2`, `T1 → T5`. Others independent.

Ready first (indegree 0), priority asc: **T4 (1), T1 (2), T3 (3), T6 (5)**.  
After T4: T2 becomes ready (priority 1) — it can interleave **as soon as T4 is done**, which is what “only after dependencies” means.  
After T1: T5 becomes ready.

One valid order: `T4, T1, T2, T3, T5, T6`  
(or `T4, T2, T1, T3, T5, T6` if you emit T2 immediately when ready).

If they insist **all independent first, then all dependents**: that’s a weaker spec (two-phase). Ask. Two-phase: independents `T4, T1, T3, T6` then dependents `T2, T5`.

**Say both interpretations, pick Kahn unless they lock two-phase.**

---

## Code (Kahn + priority)

```js
function orderTasks(tasks, { lowerIsFirst = true } = {}) {
  const byId = new Map(tasks.map((t) => [t.id, t]));
  const indegree = new Map();
  const children = new Map();

  for (const t of tasks) {
    indegree.set(t.id, 0);
    children.set(t.id, []);
  }

  for (const t of tasks) {
    if (t.dependsOn == null) continue;
    if (!byId.has(t.dependsOn)) {
      throw new Error(`Missing dependency ${t.dependsOn} for ${t.id}`);
    }
    indegree.set(t.id, indegree.get(t.id) + 1);
    children.get(t.dependsOn).push(t.id);
  }

  const cmp = (a, b) => {
    const pa = byId.get(a).priority;
    const pb = byId.get(b).priority;
    const p = lowerIsFirst ? pa - pb : pb - pa;
    return p !== 0 ? p : a.localeCompare(b);
  };

  const ready = tasks.filter((t) => indegree.get(t.id) === 0).map((t) => t.id);
  ready.sort(cmp);

  const out = [];
  while (ready.length) {
    const id = ready.shift();
    out.push(byId.get(id));
    for (const child of children.get(id)) {
      indegree.set(child, indegree.get(child) - 1);
      if (indegree.get(child) === 0) {
        ready.push(child);
        ready.sort(cmp); // n is tiny; heap if they ask complexity
      }
    }
  }

  if (out.length !== tasks.length) {
    throw new Error('Cycle in dependencies');
  }
  return out;
}
```

**Complexity:** O(n² log n) with sort-each-time; say “I’d use a heap for large n.”

**Cycle:** leftover indegree > 0 → throw / return error — mention it.

---

## Two-phase (if they insist)

```js
function orderTasksTwoPhase(tasks) {
  const indep = tasks
    .filter((t) => t.dependsOn == null)
    .sort((a, b) => a.priority - b.priority);
  const done = new Set(indep.map((t) => t.id));
  const rest = tasks.filter((t) => t.dependsOn != null);
  const out = [...indep];
  let guard = rest.length + 1;
  while (out.length < tasks.length && guard--) {
    const next = rest
      .filter((t) => !done.has(t.id) && done.has(t.dependsOn))
      .sort((a, b) => a.priority - b.priority);
    if (!next.length) throw new Error('Cycle or missing parent');
    for (const t of next) {
      out.push(t);
      done.add(t.id);
    }
  }
  return out;
}
```

---

## Follow-ups

| They ask | You say |
|---|---|
| Multiple deps | `dependsOn: string[]`, indegree += length |
| Same priority | Stable sort by id |
| Closure / debounce next | Switch to [DEBOUNCE_THROTTLE.md](../javascript-interview-prep/DEBOUNCE_THROTTLE.md) |

**Debounce one-liner to write after this:**

```js
function debounce(fn, ms) {
  let t;
  return function (...args) {
    clearTimeout(t);
    t = setTimeout(() => fn.apply(this, args), ms);
  };
}
```

Closure keeps `t` private across calls.
