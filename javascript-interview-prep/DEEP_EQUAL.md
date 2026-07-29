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

## 5. Core implementation (interview MVP)

```js
function deepEqual(a, b) {
  // 1) Same value / same reference / NaN
  if (Object.is(a, b)) return true;

  // 2) Must both be non-null objects
  if (typeof a !== 'object' || typeof b !== 'object' || a === null || b === null) {
    return false;
  }

  // 3) Array vs plain object
  if (Array.isArray(a) !== Array.isArray(b)) return false;

  // 4) Keys
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

## 6. Special types (impress follow-up)

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

## 7. Pair with deep clone (classic combo ask)

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

## 8. vs Lodash `_.isEqual` / Node `assert.deepStrictEqual`

In interviews they want **your** recursion, not library calls.

Know differences exist:

- Lodash handles more exotic types  
- `JSON.stringify` compare is a hack — key order sensitive, drops `undefined`, fails on cycles  

```js
// ❌ fragile interview answer
JSON.stringify(a) === JSON.stringify(b);
```

---

## 9. Complexity

| | |
|---|---|
| Time | `O(n)` over all nested keys/values visited |
| Space | `O(d)` recursion depth (+ `WeakMap` for cycles) |

For UI: don’t deep-equal huge Redux trees every render — use selectors / referential equality when possible.

---

## 10. Frontend where it shows up

| Use | Why deep equal |
|---|---|
| Unit tests / assert UI state | Compare expected vs actual objects |
| `React.memo` custom compare | Rarely — usually shallow; deep is expensive |
| Detect form dirty state | Compare draft vs saved model |
| Cache keys | Prefer stable serialize; deep equal for small objects |
| Avoid useless setState | `if (!deepEqual(prev, next)) setState(next)` |

**Perf caution:** Deep equal on large objects every keystroke is a smell — mention that.

---

## 11. Common mistakes

| Mistake | Fix |
|---|---|
| Use `==` / loose equality | Stick to `Object.is` / strict |
| Forget `null` (`typeof null === 'object'`) | Explicit null check |
| Treat arrays as objects only | `Array.isArray` gate |
| Compare key lists with `Object.keys` only if Symbols matter | Ask; use `Reflect.ownKeys` if needed |
| No cycle guard on follow-up | WeakMap pair tracking |
| `JSON.stringify` equality | Reject for interviews |

---

## 12. Mini test cases (practice)

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

## 13. Interview Q&A

**Q: Can you make a question like deep clone for equality?**  
> Yes — `deepEqual(a, b)` is the standard pair. Same recursive walk; return boolean instead of copying.

**Q: Shallow equal vs deep equal?**  
> Shallow: top-level keys/`===` on values (React `memo` default idea). Deep: recurse into nested objects/arrays.

**Q: How do you handle cycles?**  
> Track pairs already under comparison in a `WeakMap` so `a.self → a` doesn’t recurse forever.

**Q: Why not stringify?**  
> Unstable key order, loses `undefined`/functions, throws on cycles, Date quirks.

---

## 14. 20-second spoken answer

> Deep equal recursively compares structure: if `Object.is` matches we’re done; otherwise both must be objects of the same kind (array vs array), with the same keys, and every nested value deep-equal. I’d use `Object.is` for `NaN`, reject array-vs-object, and for cycles keep a WeakMap of pairs already being compared — same recursion family as deep clone, but boolean result instead of a copy.

---

## 15. Practice checklist

- [ ] Write MVP `deepEqual` in &lt; 10 minutes  
- [ ] Handle `null`, arrays, nested objects  
- [ ] Explain `Object.is` vs `===`  
- [ ] Add Date + cycle follow-up  
- [ ] Show `deepClone` then `deepEqual` demo  
- [ ] Say when *not* to deep-equal in React render paths  

---

## Related

| Topic | File |
|---|---|
| Deep clone implementation | [DEEP_CLONE.md](./DEEP_CLONE.md) |
| Short DSA entry | [DSA_FRONTEND_JS.md](./DSA_FRONTEND_JS.md) §18 |
| Type coercion (`==` traps) | [TYPE_COERCION.md](./TYPE_COERCION.md) |
