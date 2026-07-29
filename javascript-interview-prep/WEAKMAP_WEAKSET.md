# WeakMap & WeakSet — Interview Ready Guide

---

## 1. Why WeakMap / WeakSet Exist

Normal `Map` / `Set` keep strong references to stored objects.

That means those objects cannot be garbage-collected while the Map/Set still points to them.

`WeakMap` / `WeakSet` hold **weak** references to object keys/values (as keys for WeakMap, as values for WeakSet).

If there is no other reference to that object, GC can clean it up.

Interview one-liner:

> WeakMap and WeakSet store weak references to objects so entries can be garbage-collected automatically when the object is no longer used elsewhere.

---

## 2. WeakMap Basics

`WeakMap` is a collection of key-value pairs where:

- keys must be objects (or non-registered Symbols in modern JS; interviews usually say objects)
- values can be anything
- keys are weakly held

```js
let user = { name: 'Shivam' };
const map = new WeakMap();

map.set(user, 'metadata');
console.log(map.get(user)); // metadata

user = null; // object becomes unreachable
// entry can be GC'ed automatically
```

---

## 3. WeakMap Methods

```js
const wm = new WeakMap();
const obj = {};

wm.set(obj, 123);
wm.get(obj);    // 123
wm.has(obj);    // true
wm.delete(obj); // true
```

There is **no**:

- `size`
- `keys()`
- `values()`
- `entries()`
- `forEach()`
- iteration

Why? Because GC timing is unpredictable, so listing all keys is not reliable.

---

## 4. WeakSet Basics

`WeakSet` stores only objects (weakly).

```js
const ws = new WeakSet();
const user = { name: 'A' };

ws.add(user);
ws.has(user);    // true
ws.delete(user); // true
```

No iteration, no size.

Use case: track whether an object has been processed, without preventing GC.

---

## 5. Map vs WeakMap

| Feature | Map | WeakMap |
|---|---|---|
| Key types | any | objects (mainly) |
| Iterable | yes | no |
| `size` | yes | no |
| Key reference | strong | weak |
| GC of key object | blocked by Map | allowed if no other refs |
| Use case | general dictionary | private metadata / caches tied to object lifetime |

---

## 6. Set vs WeakSet

| Feature | Set | WeakSet |
|---|---|---|
| Values | any | objects |
| Iterable | yes | no |
| `size` | yes | no |
| Reference | strong | weak |

---

## 7. Best Interview Use Cases

### Use case 1 — Private data for objects

```js
const privateData = new WeakMap();

class User {
  constructor(name, password) {
    this.name = name;
    privateData.set(this, { password });
  }

  checkPassword(input) {
    return privateData.get(this).password === input;
  }
}

const u = new User('A', 'secret');
console.log(u.checkPassword('secret')); // true
console.log(u.password); // undefined
```

When `u` is GC'ed, private entry can disappear too.

### Use case 2 — Avoid memory leaks in caching metadata

```js
const cache = new WeakMap();

function process(node) {
  if (cache.has(node)) return cache.get(node);

  const result = expensive(node);
  cache.set(node, result);
  return result;
}
```

If `node` is removed from DOM/app and no longer referenced, cache entry can be collected.

### Use case 3 — Mark visited objects

```js
const visited = new WeakSet();

function dfs(node) {
  if (visited.has(node)) return;
  visited.add(node);
  // explore children...
}
```

### Use case 4 — Deep clone cycle detection

```js
function deepClone(value, seen = new WeakMap()) {
  if (value === null || typeof value !== 'object') return value;
  if (seen.has(value)) return seen.get(value);

  const copy = Array.isArray(value) ? [] : {};
  seen.set(value, copy);
  // ...
  return copy;
}
```

This is a very common tie-in question.

---

## 8. What You Cannot Do

```js
const wm = new WeakMap();
wm.set('id', 1); // TypeError (key must be object)
```

```js
const ws = new WeakSet();
ws.add(10); // TypeError
```

```js
for (const x of wm) {} // not iterable
console.log(wm.size);  // undefined / not available
```

---

## 9. Important Mental Model For GC

Strong reference:

```text
Map ----strongly keeps----> Object
Object stays in memory
```

Weak reference:

```text
WeakMap ----weakly points----> Object
If nothing else points to Object, GC can remove Object and WeakMap entry
```

You cannot force or observe exact GC time in normal JS.

---

## 10. Interview Questions

**Q: Why no iteration in WeakMap?**  
A: Entries can disappear anytime due to GC; iteration/size would be unreliable.

**Q: Can WeakMap keys be primitives?**  
A: No (classic answer: keys must be objects).

**Q: When prefer WeakMap over Map?**  
A: When keys are objects and you don’t want the collection to prevent GC.

**Q: Difference between WeakMap and WeakSet?**  
A: WeakMap stores key-value pairs; WeakSet stores only object presence.

**Q: Are WeakMap values weak?**  
A: Keys are weak. Values are kept as long as the entry exists (and entry exists while key is alive).

---

## 11. Tiny Examples To Remember

```js
// WeakMap
const wm = new WeakMap();
let obj = { a: 1 };
wm.set(obj, 'meta');
console.log(wm.get(obj)); // meta
obj = null; // eligible for GC

// WeakSet
const ws = new WeakSet();
let node = { id: 1 };
ws.add(node);
console.log(ws.has(node)); // true
node = null;
```

---

## 12. Spoken Answer (40 sec)

> WeakMap and WeakSet hold weak references to objects. Unlike Map and Set, they do not prevent garbage collection when the object is no longer referenced elsewhere. They are not iterable and have no size because GC can remove entries at any time. I use WeakMap for private metadata and cycle tracking in deep clone, and WeakSet to mark visited objects.

---

## 13. Cheat Sheet

```text
WeakMap: object key -> value, weak keys, no iteration
WeakSet: objects only, weak refs, no iteration
Use for: private data, caches, visited marks, deepClone seen map
Not for: needing size/list of all entries
```

---

## 14. Practice Checklist

- [ ] Explain Map vs WeakMap in 30 seconds
- [ ] Write private data example with WeakMap
- [ ] Explain why no `size`
- [ ] Connect WeakMap to deepClone cycles
