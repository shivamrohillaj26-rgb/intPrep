# Deep Clone Implementation — Interview Ready Guide

**Twin question:** structural compare → [DEEP_EQUAL.md](./DEEP_EQUAL.md) (`deepEqual` after clone).

---

## 1. What Problem Are We Solving?

Objects and arrays are stored by **reference**.

```js
const original = {
  name: 'Shivam',
  address: { city: 'Delhi' }
};

const copy = original;
copy.address.city = 'Mumbai';

console.log(original.address.city); // Mumbai
```

Both variables point to the same object.

We often need a true independent copy.

---

## 2. Shallow Copy vs Deep Copy

### Shallow copy

Copies only the top level. Nested objects are still shared.

```js
const original = {
  name: 'Shivam',
  address: { city: 'Delhi' }
};

const shallow1 = { ...original };
const shallow2 = Object.assign({}, original);

shallow1.name = 'Rohit';
shallow1.address.city = 'Mumbai';

console.log(original.name);         // Shivam (top-level independent)
console.log(original.address.city); // Mumbai (nested still shared)
```

### Deep copy

Copies all levels so nested data is also independent.

```js
const deep = deepClone(original);
deep.address.city = 'Pune';
console.log(original.address.city); // Delhi
```

Interview one-liner:

> Shallow copy duplicates only the first level. Deep clone recursively copies nested objects/arrays so no references are shared.

---

## 3. Built-in Options (And Limits)

### `structuredClone` (modern)

```js
const clone = structuredClone(original);
```

Good for many cases. May not be accepted alone if interviewer wants your implementation.

### `JSON.parse(JSON.stringify(obj))`

```js
const clone = JSON.parse(JSON.stringify(original));
```

Fails / loses:

- `undefined`
- functions
- `Symbol`
- `Date` becomes string
- `Map` / `Set`
- circular references (throws)

So interviews usually ask for a custom deep clone.

---

## 4. Interview Requirements Usually Asked

Handle:

1. primitives
2. arrays
3. plain objects
4. `Date`
5. circular references
6. (optional) functions, Map, Set

---

## 5. Core Idea Of Implementation

Use recursion:

1. If value is primitive / null → return as is
2. If special type (`Date`) → create new instance
3. If already cloned (cycle) → return cached clone
4. If array → create `[]`, clone each item
5. If object → create `{}`, clone each key
6. Store mapping in `WeakMap` to handle cycles

---

## 6. Interview-Ready Implementation

```js
function deepClone(value, seen = new WeakMap()) {
  // 1) primitives + functions (functions usually returned as-is)
  if (value === null || typeof value !== 'object') {
    return value;
  }

  // 2) Date
  if (value instanceof Date) {
    return new Date(value.getTime());
  }

  // 3) cyclic reference handling
  if (seen.has(value)) {
    return seen.get(value);
  }

  // 4) Array
  if (Array.isArray(value)) {
    const arrCopy = [];
    seen.set(value, arrCopy);

    for (let i = 0; i < value.length; i++) {
      arrCopy[i] = deepClone(value[i], seen);
    }

    return arrCopy;
  }

  // 5) Map (optional but impressive)
  if (value instanceof Map) {
    const mapCopy = new Map();
    seen.set(value, mapCopy);

    value.forEach((v, k) => {
      mapCopy.set(deepClone(k, seen), deepClone(v, seen));
    });

    return mapCopy;
  }

  // 6) Set (optional)
  if (value instanceof Set) {
    const setCopy = new Set();
    seen.set(value, setCopy);

    value.forEach((v) => {
      setCopy.add(deepClone(v, seen));
    });

    return setCopy;
  }

  // 7) plain object
  const objCopy = {};
  seen.set(value, objCopy);

  for (const key of Reflect.ownKeys(value)) {
    objCopy[key] = deepClone(value[key], seen);
  }

  return objCopy;
}
```

---

## 7. Line-by-Line Explanation (Say This In Interview)

### Step A — stop condition

```js
if (value === null || typeof value !== 'object') return value;
```

Numbers, strings, booleans, `null`, `undefined`, symbols, functions stop recursion.

Functions are usually not deeply cloned because closures cannot be reliably duplicated.

### Step B — Date

```js
if (value instanceof Date) return new Date(value.getTime());
```

Avoid keeping same Date reference.

### Step C — cycles with WeakMap

```js
const user = { name: 'A' };
user.self = user; // circular
```

Without `seen`, recursion never ends.

```js
if (seen.has(value)) return seen.get(value);
seen.set(value, copy);
```

`WeakMap` keys are objects and do not prevent garbage collection.

### Step D — arrays vs objects

```js
Array.isArray(value) ? [] : {}
```

Must preserve array type.

### Step E — copy properties

```js
for (const key of Reflect.ownKeys(value)) {
  objCopy[key] = deepClone(value[key], seen);
}
```

`Reflect.ownKeys` includes string keys and Symbols.

---

## 8. Examples To Demo In Interview

### Nested object

```js
const original = {
  name: 'Shivam',
  skills: ['js', 'angular'],
  meta: { active: true }
};

const clone = deepClone(original);
clone.skills.push('rxjs');
clone.meta.active = false;

console.log(original.skills);     // ['js', 'angular']
console.log(original.meta.active); // true
```

### Circular reference

```js
const original = { name: 'A' };
original.self = original;

const clone = deepClone(original);

console.log(clone !== original);     // true
console.log(clone.self === clone);   // true
console.log(clone.self !== original); // true
```

### Date

```js
const original = { createdAt: new Date('2026-01-01') };
const clone = deepClone(original);

console.log(clone.createdAt !== original.createdAt); // true
console.log(clone.createdAt.getTime() === original.createdAt.getTime()); // true
```

---

## 9. Minimal Interview Version (If Time Is Short)

If interviewer wants short code:

```js
function deepClone(value, seen = new WeakMap()) {
  if (value === null || typeof value !== 'object') return value;
  if (value instanceof Date) return new Date(value.getTime());
  if (seen.has(value)) return seen.get(value);

  const copy = Array.isArray(value) ? [] : {};
  seen.set(value, copy);

  for (const key of Reflect.ownKeys(value)) {
    copy[key] = deepClone(value[key], seen);
  }

  return copy;
}
```

This is enough for most frontend interviews.

---

## 10. Complexity

For `n` reachable properties/nodes:

- Time: `O(n)`
- Space: `O(n)` for clone + recursion/WeakMap

---

## 11. Common Follow-ups

**Q: Why not JSON method?**  
A: Loses functions/Date/undefined and fails on cycles.

**Q: Why WeakMap?**  
A: Store object → clone mapping for cycles without memory leaks.

**Q: Do you clone functions?**  
A: Usually keep same reference; true function clone with closure is not practical.

**Q: Shallow vs deep in React/Angular state?**  
A: UI libs often use shallow immutable updates; deep clone whole state trees can be expensive.

---

## 12. Spoken Explanation (60 sec)

> Deep clone creates a fully independent copy of nested data. I handle primitives first, then special cases like Date. I use a WeakMap to detect circular references so recursion does not infinite-loop. For arrays and objects I create a new container, store it in the WeakMap, then recursively clone each child property. That way the clone has the same structure but no shared nested references.

---

## 13. Practice Checklist

- [ ] Explain shallow bug with nested object
- [ ] Write minimal deepClone from memory
- [ ] Handle circular reference
- [ ] Handle Date + array
- [ ] Mention JSON limitations

---

## Interview drill — “Spread clone still mutated original?”

> `...` is **shallow**. Nested objects/arrays stay shared references, so `clone.nested.x = ...` also changes `original.nested.x`. Fix with deep clone or path-based immutable update.

See also: `TRICKY_10_FRONTEND_QUESTIONS.md` Q2.
