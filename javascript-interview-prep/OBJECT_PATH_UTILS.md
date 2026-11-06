# Object Path Utils — `set` by Path + snake↔camel — Interview Ready

Two frequent lodash-style machine-coding asks:

1. **`set(obj, path, value)`** — create nested paths  
2. **Recursively convert keys** `snake_case` → `camelCase` (arrays included)

Flatten / unflatten dot paths: [DSA_FRONTEND_JS.md](./DSA_FRONTEND_JS.md) §19.

---

## Part A — `set(obj, path, value)`

### Problem

```js
const obj = {};
set(obj, 'a.b.c', 1);
// obj → { a: { b: { c: 1 } } }

set(obj, 'a.b.d', 2);
// { a: { b: { c: 1, d: 2 } } }
```

Also accept path as array: `['a', 'b', 'c']`.

### One-liner

> Split the path, walk creating plain objects for missing segments, assign the value on the last key. Mutate in place and return `obj` (lodash style).

### Implementation

```js
function set(obj, path, value) {
  const keys = Array.isArray(path)
    ? path
    : String(path)
        .replace(/\[(\d+)\]/g, '.$1') // a[0].b → a.0.b (optional)
        .split('.')
        .filter(Boolean);

  let cur = obj;
  for (let i = 0; i < keys.length - 1; i++) {
    const key = keys[i];
    const nextKey = keys[i + 1];

    if (cur[key] == null || typeof cur[key] !== 'object') {
      // if next segment looks like array index, make []
      cur[key] = /^\d+$/.test(nextKey) ? [] : {};
    }
    cur = cur[key];
  }

  cur[keys[keys.length - 1]] = value;
  return obj;
}

// tests
const o = {};
set(o, 'user.profile.name', 'Ada');
set(o, 'user.tags', ['admin']);
set(o, ['user', 'profile', 'id'], 7);
console.log(o);
// { user: { profile: { name: 'Ada', id: 7 }, tags: ['admin'] } }
```

### Immutable variant (interview follow-up)

```js
function setImmutable(obj, path, value) {
  const keys = Array.isArray(path) ? path : path.split('.');
  if (keys.length === 0) return value;

  const [head, ...rest] = keys;
  const base = Array.isArray(obj) ? obj.slice() : { ...(obj || {}) };
  base[head] = rest.length
    ? setImmutable(base[head], rest, value)
    : value;
  return base;
}
```

### Edge cases

| Case | Policy (say aloud) |
|---|---|
| Empty path | No-op or replace root — ask |
| Mid path is primitive | Overwrite with object (lodash does) |
| Array indices `'items.0.id'` | Create arrays when next key is numeric |
| Prototype pollution `__proto__` | Reject dangerous keys in real code |

```js
const FORBIDDEN = new Set(['__proto__', 'constructor', 'prototype']);
// skip or throw if keys.includes forbidden
```

### Spoken (20s)

> I walk the path segments, creating nested objects when missing, then assign the final key. I mutate and return the same object unless they ask for an immutable copy.

---

## Part B — snake_case → camelCase (recursive, with arrays)

### Problem

```js
keysToCamel({
  user_id: 1,
  profile_data: { first_name: 'Ada', phone_numbers: [{ area_code: '91' }] },
  tags: ['a'],
});
// {
//   userId: 1,
//   profileData: { firstName: 'Ada', phoneNumbers: [{ areaCode: '91' }] },
//   tags: ['a'],
// }
```

### One-liner

> Recurse: arrays map element-wise; plain objects rebuild with camelCase keys; primitives return as-is.

### Helpers + implementation

```js
function toCamelKey(key) {
  return String(key).replace(/_([a-zA-Z0-9])/g, (_, c) => c.toUpperCase());
}

function isPlainObject(v) {
  return Object.prototype.toString.call(v) === '[object Object]';
}

function keysToCamel(input) {
  if (Array.isArray(input)) {
    return input.map(keysToCamel);
  }
  if (!isPlainObject(input)) {
    return input; // number, string, null, Date, etc.
  }

  const out = {};
  for (const [key, value] of Object.entries(input)) {
    out[toCamelKey(key)] = keysToCamel(value);
  }
  return out;
}
```

### camel → snake (mirror)

```js
function toSnakeKey(key) {
  return String(key)
    .replace(/([A-Z])/g, '_$1')
    .replace(/-/g, '_')
    .toLowerCase()
    .replace(/^_/, '');
}

function keysToSnake(input) {
  if (Array.isArray(input)) return input.map(keysToSnake);
  if (!isPlainObject(input)) return input;
  const out = {};
  for (const [key, value] of Object.entries(input)) {
    out[toSnakeKey(key)] = keysToSnake(value);
  }
  return out;
}
```

### Why `isPlainObject`?

Don’t recurse into `Date`, `Map`, class instances — treat as leaves (same discipline as deep clone).

### Key collision

```js
{ user_id: 1, userId: 2 } // both → userId — last wins
```

Mention in interview; rare from well-formed APIs.

### Spoken (30s)

> I walk the structure recursively. Arrays get mapped; plain objects get new keys via a regex that uppercases the letter after each underscore; nested values convert the same way. Primitives and non-plain objects stay as leaves.

---

## Practice checklist

- [ ] `set` with string and array paths  
- [ ] Optional array index creation  
- [ ] `keysToCamel` with nested objects + arrays  
- [ ] Name plain-object check + collision caveat  
- [ ] Point to flatten/unflatten as sibling util  

---

## Related

| Topic | File |
|---|---|
| Flatten / unflatten | [DSA_FRONTEND_JS.md](./DSA_FRONTEND_JS.md) §19 |
| Deep clone (leaf kinds) | [DEEP_CLONE.md](./DEEP_CLONE.md) |
| Deep equal | [DEEP_EQUAL.md](./DEEP_EQUAL.md) |
