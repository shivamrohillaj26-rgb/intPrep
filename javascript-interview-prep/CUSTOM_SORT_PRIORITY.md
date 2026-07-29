# Custom Sort by Priority Map — Interview Ready

Classic frontend coding-round question (LinkedIn / machine-coding style).

> Sort objects by a **custom order** of string fields — not alphabetical.

---

## 1. The question

Given users with a `level` of `'easy' | 'medium' | 'hard'`, sort them:

```text
easy → medium → hard
```

```js
const users = [
  { name: 'Alice', level: 'hard' },
  { name: 'Bob', level: 'easy' },
  { name: 'Charlie', level: 'medium' },
  { name: 'Dave', level: 'easy' },
];
```

Expected:

```js
[
  { name: 'Bob', level: 'easy' },
  { name: 'Dave', level: 'easy' },
  { name: 'Charlie', level: 'medium' },
  { name: 'Alice', level: 'hard' },
]
```

---

## 2. The trap (say this first)

Default string sort is **alphabetical**:

```js
['easy', 'medium', 'hard'].sort();
// → ['easy', 'hard', 'medium']  ❌ not what product wants
```

So `users.sort((a, b) => a.level.localeCompare(b.level))` is wrong for difficulty order.

**Interview one-liner:**

> Alphabetical order ≠ business / priority order. Map labels to numbers, then sort by those numbers.

---

## 3. Solution — priority map (the answer they want)

### Step 1 — Map each label to a rank

```js
const priorityOrder = { easy: 1, medium: 2, hard: 3 };
```

Lower number = earlier in the list (or flip if you want hard first).

### Step 2 — Sort using the ranks (don’t mutate original)

```js
const sortedUsers = [...users].sort(
  (a, b) => priorityOrder[a.level] - priorityOrder[b.level],
);

console.log(sortedUsers);
```

### Why `[...users]`?

`.sort()` mutates in place. Spreading (or `.toSorted()` in modern JS) keeps the original array intact — safer for React state / shared data.

```js
// modern alternative (non-mutating)
const sortedUsers = users.toSorted(
  (a, b) => priorityOrder[a.level] - priorityOrder[b.level],
);
```

---

## 4. How the comparator works (deep)

`.sort((a, b) => …)` expects:

| Return | Meaning |
|---|---|
| **negative** | `a` before `b` |
| **0** | equal (keep relative order in stable sort) |
| **positive** | `a` after `b` |

So:

```js
priorityOrder[a.level] - priorityOrder[b.level]
```

- Bob `easy(1)` vs Alice `hard(3)` → `1 - 3 = -2` → Bob first ✅  
- Alice `hard(3)` vs Charlie `medium(2)` → `3 - 2 = +1` → Alice after Charlie ✅  
- Bob `easy` vs Dave `easy` → `0` → order between them stable ✅  

---

## 5. Full interview-ready function

```js
function sortByLevel(users, order = ['easy', 'medium', 'hard']) {
  const priority = Object.fromEntries(order.map((level, i) => [level, i]));

  return [...users].sort(
    (a, b) => (priority[a.level] ?? Infinity) - (priority[b.level] ?? Infinity),
  );
}

sortByLevel(users);
```

**Why `order` array + `Object.fromEntries`?**  
Easy to change order or add `'expert'` without rewriting comparator math.

**Why `?? Infinity`?**  
Unknown levels sink to the end instead of becoming `NaN` (which breaks sort).

---

## 6. Variants interviewers throw next

### A) Hard → medium → easy (reverse)

```js
(a, b) => priorityOrder[b.level] - priorityOrder[a.level];
// or priorityOrder = { hard: 1, medium: 2, easy: 3 }
```

### B) Custom order + secondary key (name)

```js
[...users].sort((a, b) => {
  const byLevel = priorityOrder[a.level] - priorityOrder[b.level];
  if (byLevel !== 0) return byLevel;
  return a.name.localeCompare(b.name);
});
```

### C) Status / ticket columns (same idea)

```js
const statusOrder = { todo: 0, in_progress: 1, done: 2 };
tasks.sort((a, b) => statusOrder[a.status] - statusOrder[b.status]);
```

### D) Don’t use magic `if` chains

```js
// ❌ brittle as levels grow
if (a.level === 'easy') return -1;
...

// ✅ one map scales
priorityOrder[a.level] - priorityOrder[b.level]
```

---

## 7. Complexity

| | |
|---|---|
| Time | `O(n log n)` — sort |
| Space | `O(n)` for copy, or `O(1)` extra if you mutate in place |
| Map lookup | `O(1)` per comparison |

For UI lists of hundreds/thousands, this is fine. Mention you’d sort once / memoize in React if the list is large and re-renders often.

---

## 8. React / Angular tip

```js
// React — never sort state in place
setUsers((prev) =>
  [...prev].sort((a, b) => priorityOrder[a.level] - priorityOrder[b.level]),
);

// Or derive:
const sorted = useMemo(
  () => [...users].sort((a, b) => priorityOrder[a.level] - priorityOrder[b.level]),
  [users],
);
```

In Angular templates, prefer sorting in the component / `computed` once, not with a pure-pipe on every CD if the list is big.

---

## 9. Edge cases to mention

| Case | Handle |
|---|---|
| Missing `level` | `?? Infinity` or filter first |
| Unknown level string | same / throw in strict mode |
| Empty array | returns `[]` |
| Equal levels | stable sort keeps original relative order (ES2019+) |
| Mutating vs copying | prefer copy unless asked otherwise |

---

## 10. Interview Q&A

**Q: Why not alphabetical sort?**  
> Business order isn’t lexicographic — `hard` would come before `medium`.

**Q: Why a map instead of `indexOf` on an array each compare?**  
> Map is clearer and `O(1)`. `order.indexOf(a.level) - order.indexOf(b.level)` also works for tiny lists.

**Q: Does `.sort` mutate?**  
> Yes. Use `[...arr].sort` or `toSorted`.

**Q: Is JS sort stable?**  
> Yes in modern engines (ES2019) — equal keys keep relative order.

---

## 11. 20-second spoken answer

> Default string sort is alphabetical, so easy/hard/medium comes out wrong. I map each level to a numeric priority, copy the array, and sort by `priority[a.level] - priority[b.level]`. That scales if we add more levels — just update the map.

---

## 12. Practice checklist

- [ ] Write priority-map sort from blank in &lt; 3 minutes  
- [ ] Explain why `'hard' < 'medium'` alphabetically  
- [ ] Non-mutating sort (`[...arr]` or `toSorted`)  
- [ ] Add secondary sort by `name`  
- [ ] Handle unknown level safely  

---

## Related

| Topic | File |
|---|---|
| Multi-key object sort (`age` then `name`) | [DSA_FRONTEND_JS.md](./DSA_FRONTEND_JS.md) §12 |
| Array polyfills / `sort` behavior | [POLYFILLS_README.md](./POLYFILLS_README.md) |
