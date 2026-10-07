# Deep Equal — Interview Ready Guide

Yes — **deep equal** is a classic twin of **deep clone**.  
Same recursion skills, different goal:

| | Deep clone | Deep equal |
|---|---|---|
| Goal | Make an independent copy | Compare two values structurally |
| Returns | new value | `true` / `false` |
| Cycles | `WeakMap` value → clone | `WeakMap` pair of objects → already comparing |
| Often asked together | “Clone this, then prove clone equals original with deepEqual” | |

Short version also lives in [DSA_FRONTEND_JS.md](./DSA_FRONTEND_JS.md) §18. This file is the deep prep.

---

## 1. The interview question

> Implement `deepEqual(a, b)` that returns `true` if `a` and `b` are deeply equal.

Usually must handle:

1. Primitives (`string`, `number`, `boolean`, `null`, `undefined`, `symbol`, `bigint`)  
2. Plain objects (nested)  
3. Arrays (nested)  
4. `NaN` / `-0` policy (ask!)  
5. Array vs object with numeric keys → **not** equal  
6. (Follow-up) `Date`, `Map`, `Set`  
7. (Follow-up) Circular references  

```js
deepEqual({ a: 1, b: { c: 2 } }, { a: 1, b: { c: 2 } }); // true
deepEqual([1, [2]], [1, [2]]);                             // true
deepEqual([1, 2], { 0: 1, 1: 2 });                          // false
deepEqual({ a: 1 }, { a: 1, b: undefined });                // false (key sets differ)
```

---

## 2. Why `===` is not enough

```js
const a = { x: 1 };
const b = { x: 1 };

a === b;        // false — different references
deepEqual(a, b); // true  — same shape & values
```

Interview one-liner:

> `===` checks identity (same reference). Deep equal checks **structure and nested values** recursively.

---

## 3. Clarify before coding (30 seconds)

Ask / state assumptions:

| Topic | Common interview default |
|---|---|
| `NaN` vs `NaN` | Treat equal (`Object.is`) |
| `-0` vs `+0` | `Object.is` → different; `===` → same — **ask** |
| Key order in objects | Ignore order (`{a:1,b:2}` equals `{b:2,a:1}`) |
| Prototype / class instances | Often plain objects only |
| Functions | Usually `===` only (same reference) |
| `Date` | Compare `getTime()` |
| Non-enumerable / Symbol keys | Optional — `Reflect.ownKeys` if they want thorough |
| Cycles | Follow-up with pair WeakMap |

---

## 4. Algorithm (mirror of deep clone recursion)

```text
deepEqual(a, b):
  1. If Object.is(a, b) → true          // same ref, same primitive, NaN===NaN
  2. If either not object-like → false  // null already handled by Object.is if both null
  3. If Array.isArray(a) !== Array.isArray(b) → false
  4. (optional) Date / Map / Set branches
  5. Compare key sets (same length, every key in both)
  6. For each key: deepEqual(a[key], b[key])
  7. All match → true
```

---

## 5. Understand it deeply (walk one example)

Goal: decide if two values have the **same shape and same nested values**, even if they are **different references**.

```js
const a = { x: 1, nest: { y: 2 } };
const b = { x: 1, nest: { y: 2 } };
// a === b → false (different objects in memory)
// deepEqual(a, b) → true (same structure)
```

### What the function does, step by step

Think of it as a **tree walk** on both sides at once:

```text
deepEqual(a, b)
│
├─ Same by Object.is?  → true immediately
│     (same number, same string, same ref, NaN≈NaN)
│
├─ Either is not a real object? → false
│     (one number vs object, null vs {}, etc.)
│
├─ One array, one plain object? → false
│
├─ Different number of keys? → false
│
└─ For each key in a:
      key missing on b? → false
      else deepEqual(a[key], b[key])   ← recurse into nest
```

### Trace: `deepEqual({ x: 1, nest: { y: 2 } }, { x: 1, nest: { y: 2 } })`

```text
1. Object.is(a, b)? No (different refs)
2. Both objects? Yes
3. Both arrays or both not? Both plain → OK
4. keys: ['x','nest'] vs ['x','nest'] — same length
5. key 'x':  deepEqual(1, 1) → Object.is → true
6. key 'nest': deepEqual({ y: 2 }, { y: 2 })
      6a. different refs → keep going
      6b. keys ['y'] / ['y']
      6c. deepEqual(2, 2) → true
7. All keys matched → true
```

### Trace that returns false

```js
deepEqual({ a: 1 }, { a: 1, b: 2 });
// keys length 1 vs 2 → false immediately

deepEqual([1, 2], { 0: 1, 1: 2 });
// Array.isArray mismatch → false
// (even though keys look similar)
```

**Mental model one-liner:**

> Same as deep clone’s walk, but instead of copying each node, I ask “are these two nodes equal?” and bubble `true`/`false` up.

---

## 6. Interview-simple version (write this first)

This is what you should code in a **5–8 min** whiteboard / HackerRank-style round.  
Uses `Object.keys` (JSON-like data only) — same style as other DSA answers in this repo.

```js
function deepEqual(a, b) {
  // Same value, same reference, or NaN === NaN
  if (Object.is(a, b)) return true;

  // null / primitives that didn't match above → not equal
  // (typeof null === 'object', so null must be excluded)
  if (typeof a !== 'object' || typeof b !== 'object' || a === null || b === null) {
    return false;
  }

  // [1,2] should NOT equal { 0:1, 1:2 }
  if (Array.isArray(a) !== Array.isArray(b)) return false;

  const keysA = Object.keys(a);
  const keysB = Object.keys(b);
  if (keysA.length !== keysB.length) return false;

  for (const key of keysA) {
    if (!Object.prototype.hasOwnProperty.call(b, key)) return false;
    if (!deepEqual(a[key], b[key])) return false;
  }

  return true;
}
```

### Why each line (say while typing)

| Line | Why |
|---|---|
| `Object.is(a, b)` | Handles primitives + same ref + `NaN` |
| `typeof … !== 'object' \|\| null` | Stop recursion on numbers/strings; fix `typeof null` |
| `Array.isArray` mismatch | Don’t treat arrays as plain objects |
| `Object.keys` length | Fast fail if different key sets |
| `hasOwnProperty` on `b` | Key must exist on both (order doesn’t matter) |
| Recurse | Nested objects/arrays |

### Tiny tests to run verbally

```js
deepEqual(1, 1);                 // true
deepEqual(1, '1');               // false
deepEqual(NaN, NaN);             // true
deepEqual(null, null);           // true  (Object.is)
deepEqual(null, {});             // false
deepEqual({ a: 1 }, { a: 1 });   // true
deepEqual({ a: 1 }, { a: 2 });   // false
deepEqual([1, [2]], [1, [2]]);   // true
deepEqual([1, 2], { 0: 1, 1: 2 }); // false
```

### `Object.keys` vs `Reflect.ownKeys` in interview

| Use | When |
|---|---|
| **`Object.keys`** (simple version above) | Default interview — enumerable string keys only |
| **`Reflect.ownKeys`** | They ask Symbols / non-enumerable / “complete” equal |

Say: *“I’ll start with Object.keys for normal objects; I can switch to Reflect.ownKeys if we need Symbols.”*

---

## 7. Slightly stronger MVP (`Reflect.ownKeys`)

Same algorithm; only the key listing changes. Use if they want thoroughness.

```js
function deepEqual(a, b) {
  if (Object.is(a, b)) return true;

  if (typeof a !== 'object' || typeof b !== 'object' || a === null || b === null) {
    return false;
  }

  if (Array.isArray(a) !== Array.isArray(b)) return false;

  const keysA = Reflect.ownKeys(a);
  const keysB = Reflect.ownKeys(b);
  if (keysA.length !== keysB.length) return false;

  for (const key of keysA) {
    if (!Object.prototype.hasOwnProperty.call(b, key)) return false;
    if (!deepEqual(a[key], b[key])) return false;
  }

  return true;
}
```

### Why `Object.is` first?

```js
Object.is(NaN, NaN); // true  (=== is false)
Object.is(0, -0);    // false (=== is true)
```

Many interviewers like `NaN` equal. If they want `-0 === 0`, use a custom primitive compare.

### Why reject array vs object?

```js
Array.isArray([1, 2]);           // true
Array.isArray({ 0: 1, 1: 2 });   // false
// same keys "0","1" but different types → false
```

---

## 8. Special types (impress follow-up)

```js
function deepEqual(a, b, seen = new WeakMap()) {
  if (Object.is(a, b)) return true;
  if (typeof a !== 'object' || typeof b !== 'object' || !a || !b) return false;

  // Cycle: if we already started comparing this pair, treat as equal so far
  if (seen.has(a)) return seen.get(a) === b;
  seen.set(a, b);

  if (a instanceof Date && b instanceof Date) {
    return a.getTime() === b.getTime();
  }

  if (a instanceof RegExp && b instanceof RegExp) {
    return a.source === b.source && a.flags === b.flags;
  }

  if (a instanceof Map && b instanceof Map) {
    if (a.size !== b.size) return false;
    for (const [k, v] of a) {
      if (!b.has(k) || !deepEqual(v, b.get(k), seen)) return false;
      // Note: object keys in Map need deep key matching — hard; ask scope
    }
    return true;
  }

  if (a instanceof Set && b instanceof Set) {
    if (a.size !== b.size) return false;
    // naive: only works well for primitive sets
    for (const v of a) {
      let found = false;
      for (const w of b) {
        if (deepEqual(v, w, seen)) {
          found = true;
          break;
        }
      }
      if (!found) return false;
    }
    return true;
  }

  if (Array.isArray(a) !== Array.isArray(b)) return false;

  const keysA = Reflect.ownKeys(a);
  const keysB = Reflect.ownKeys(b);
  if (keysA.length !== keysB.length) return false;

  for (const key of keysA) {
    if (!Object.prototype.hasOwnProperty.call(b, key)) return false;
    if (!deepEqual(a[key], b[key], seen)) return false;
  }
  return true;
}
```

**Cycles example:**

```js
const a = { name: 'x' };
a.self = a;
const b = { name: 'x' };
b.self = b;
deepEqual(a, b); // true with seen map
```

Without `seen`, infinite recursion → stack overflow.

---

## 9. Pair with deep clone (classic combo ask)

```js
const original = { user: { name: 'Ada' }, tags: ['js', 'fe'] };
const copy = deepClone(original);

deepEqual(original, copy); // true — same structure
copy.user.name = 'Grace';
deepEqual(original, copy); // false — independent after mutation
original === copy;         // false — different references
```

**Spoken bridge:**

> Deep clone breaks shared references. Deep equal verifies structural sameness even when references differ — so after cloning, equal should be true, identity false.

---

## 10. vs Lodash `_.isEqual` / Node `assert.deepStrictEqual`

In interviews they want **your** recursion, not library calls.

Know differences exist:

- Lodash handles more exotic types  
- `JSON.stringify` compare is a hack — key order sensitive, drops `undefined`, fails on cycles  

```js
// ❌ fragile interview answer
JSON.stringify(a) === JSON.stringify(b);
```

---

## 11. Complexity

| | |
|---|---|
| Time | `O(n)` over all nested keys/values visited |
| Space | `O(d)` recursion depth (+ `WeakMap` for cycles) |

For UI: don’t deep-equal huge Redux trees every render — use selectors / referential equality when possible.

---

## 12. Frontend where it shows up

| Use | Why deep equal |
|---|---|
| Unit tests / assert UI state | Compare expected vs actual objects |
| `React.memo` custom compare | Rarely — usually shallow; deep is expensive |
| Detect form dirty state | Compare draft vs saved model |
| Cache keys | Prefer stable serialize; deep equal for small objects |
| Avoid useless setState | `if (!deepEqual(prev, next)) setState(next)` |

**Perf caution:** Deep equal on large objects every keystroke is a smell — mention that.

---

## 13. Common mistakes

| Mistake | Fix |
|---|---|
| Use `==` / loose equality | Stick to `Object.is` / strict |
| Forget `null` (`typeof null === 'object'`) | Explicit null check |
| Treat arrays as objects only | `Array.isArray` gate |
| Compare key lists with `Object.keys` only if Symbols matter | Ask; use `Reflect.ownKeys` if needed |
| No cycle guard on follow-up | WeakMap pair tracking |
| `JSON.stringify` equality | Reject for interviews |

---

## 14. Variant — order-insensitive arrays of primitives

Interview twist: treat `[1, 2]` as equal to `[2, 1]` when elements are **primitives** (multiset / bag equality). Nested objects usually stay **order-sensitive** — **clarify**.

### When they want this

Tag lists, id sets dumped as arrays, “same items, different sort.”

### Approach

For an array whose elements are all primitives (`string | number | boolean | null | undefined | symbol | bigint`):

1. Same length (after counting)
2. Same multiset — frequency map, not sort-only if you must preserve duplicate counts

Sorting works for primitives that share a total order:

```js
function samePrimitiveMultiset(a, b) {
  if (a.length !== b.length) return false;
  const sa = a.slice().sort();
  const sb = b.slice().sort();
  for (let i = 0; i < sa.length; i++) {
    if (!Object.is(sa[i], sb[i])) return false;
  }
  return true;
}
```

Frequency map (handles `NaN` via `Object.is` / careful keys):

```js
function samePrimitiveMultiset(a, b) {
  if (a.length !== b.length) return false;
  const counts = new Map();

  for (const x of a) {
    let found = false;
    for (const [k, n] of counts) {
      if (Object.is(k, x)) {
        counts.set(k, n + 1);
        found = true;
        break;
      }
    }
    if (!found) counts.set(x, 1);
  }

  for (const x of b) {
    let key = null;
    for (const k of counts.keys()) {
      if (Object.is(k, x)) {
        key = k;
        break;
      }
    }
    if (key === null) return false;
    const n = counts.get(key) - 1;
    if (n === 0) counts.delete(key);
    else counts.set(key, n);
  }
  return counts.size === 0;
}
```

Simpler interview version when no `NaN`/`-0` games: `Map` with values as keys + sort fallback.

### Hook into `deepEqual`

```js
function deepEqual(a, b, opts = {}) {
  // ... Object.is, null, type gates ...

  if (Array.isArray(a) && Array.isArray(b)) {
    if (
      opts.orderInsensitivePrimitives &&
      a.every(isPrimitive) &&
      b.every(isPrimitive)
    ) {
      return samePrimitiveMultiset(a, b);
    }
    if (a.length !== b.length) return false;
    return a.every((v, i) => deepEqual(v, b[i], opts));
  }
  // ... objects ...
}

function isPrimitive(v) {
  return v === null || (typeof v !== 'object' && typeof v !== 'function');
}
```

### Say aloud

> Default deep equal is position-sensitive for arrays. If they want order-insensitive, I only apply multiset compare when both sides are arrays of primitives; nested structures stay ordered unless they explicitly ask otherwise. Sorting is fine for numbers/strings; I use frequency counts if NaN matters.

### Trap

`[{a:1},{a:2}]` vs `[{a:2},{a:1}]` is **not** solved by sorting — that’s multiset of objects (hard). Push back: “only primitives” or “normalize then compare.”

---

## 15. Mini test cases (practice)

```js
deepEqual(1, 1);                         // true
deepEqual(1, '1');                       // false
deepEqual(null, null);                   // true
deepEqual(null, {});                     // false
deepEqual(NaN, NaN);                     // true with Object.is
deepEqual([1, { a: 2 }], [1, { a: 2 }]); // true
deepEqual([1, 2], [1, 2, 3]);            // false
deepEqual({ a: undefined }, {});         // false (keys differ)
deepEqual({ b: 2, a: 1 }, { a: 1, b: 2 }); // true
```

---

## 16. Interview Q&A

**Q: Can you make a question like deep clone for equality?**  
> Yes — `deepEqual(a, b)` is the standard pair. Same recursive walk; return boolean instead of copying.

**Q: Shallow equal vs deep equal?**  
> Shallow: top-level keys/`===` on values (React `memo` default idea). Deep: recurse into nested objects/arrays.

**Q: How do you handle cycles?**  
> Track pairs already under comparison in a `WeakMap` so `a.self → a` doesn’t recurse forever.

**Q: Why not stringify?**  
> Unstable key order, loses `undefined`/functions, throws on cycles, Date quirks.

---

## 17. Spoken answers

### 20s — what is deep equal?

> `===` checks identity. Deep equal walks both values and checks nested structure: same keys, same kinds (array vs object), and every nested value deep-equal. I start with `Object.is` so `NaN` matches.

### 45s — how I’d implement it

> First `Object.is` — if true, done. If either isn’t a non-null object, false. If one is an array and the other isn’t, false. Then compare `Object.keys` lengths, and for each key recurse. That’s enough for nested plain objects and arrays. If they ask Symbols I’d switch to `Reflect.ownKeys`; for cycles I’d track comparing pairs in a WeakMap.

---

## 18. Practice checklist

- [ ] Write the **simple `Object.keys` version** from memory in &lt; 8 minutes  
- [ ] Trace one nested true case and one false case out loud  
- [ ] Handle `null`, arrays, nested objects  
- [ ] Explain `Object.is` vs `===`  
- [ ] Know when to upgrade to `Reflect.ownKeys` / Date / cycles  
- [ ] Order-insensitive primitive arrays variant  
- [ ] Show `deepClone` then `deepEqual` demo  
- [ ] Say when *not* to deep-equal in React render paths  

---

## Related

| Topic | File |
|---|---|
| Deep clone implementation | [DEEP_CLONE.md](./DEEP_CLONE.md) |
| Short DSA entry | [DSA_FRONTEND_JS.md](./DSA_FRONTEND_JS.md) §18 |
| Path / case utils | [OBJECT_PATH_UTILS.md](./OBJECT_PATH_UTILS.md) |
| Type coercion (`==` traps) | [TYPE_COERCION.md](./TYPE_COERCION.md) |
