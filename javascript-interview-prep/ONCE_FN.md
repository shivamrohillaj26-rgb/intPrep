# `once(fn)` — Run a Function Only Once — Interview Ready

Functional util: wrap `fn` so it executes **at most once**. Later calls return the **first result** (or `undefined` — clarify with interviewer).

Not the same as EventEmitter’s `once(event, listener)` — see [EVENT_EMITTER.md](./EVENT_EMITTER.md).

---

## 1. Problem

```js
function initAnalytics() {
  console.log('bootstrapped');
  return { ok: true };
}

const initOnce = once(initAnalytics);

initOnce(); // logs, returns { ok: true }
initOnce(); // no log, returns same { ok: true }
initOnce(); // still same
```

Use cases: singleton init, one-time event handler, “paywall shown” flag, lazy SDK load.

---

## 2. One-liner

> I close over a `called` flag and a `result`. First call runs `fn` and caches the return value; every later call skips `fn` and returns the cache.

---

## 3. Core implementation

```js
function once(fn) {
  let called = false;
  let result;

  return function (...args) {
    if (called) return result;
    called = true;
    result = fn.apply(this, args);
    return result;
  };
}
```

Why `apply(this, args)`?

- Preserves `this` when used as a method: `obj.method = once(fn)`
- Forwards all arguments on the **first** call only

### Variant: ignore later args, still return first result

That’s the default above. First call’s args “win.”

### Variant: throw / no-op after first (no cached return)

```js
function onceVoid(fn) {
  let called = false;
  return function (...args) {
    if (called) return;
    called = true;
    fn.apply(this, args);
  };
}
```

### Variant: async — only one in-flight / one settle

Naive `once` on an async function caches the **Promise**:

```js
const loadOnce = once(() => fetch('/config').then((r) => r.json()));

await loadOnce(); // starts fetch
await loadOnce(); // same Promise — good (dedupe)
```

That’s usually what you want. If `fn` throws synchronously, later calls still return the thrown… wait — with the simple version, if `fn` throws, `called` is already `true` and `result` is unset. Fix:

```js
function once(fn) {
  let called = false;
  let result;
  let error;
  let hasError = false;

  return function (...args) {
    if (called) {
      if (hasError) throw error;
      return result;
    }
    called = true;
    try {
      result = fn.apply(this, args);
      return result;
    } catch (e) {
      hasError = true;
      error = e;
      throw e;
    }
  };
}
```

Simpler interview default: set `called = true` **after** success, or document “first throw locks failure.” Ask which they want.

**Cleaner pattern (lodash-style):** mark called only after invocation starts; rethrow cached error:

```js
function once(fn) {
  let state = 'new'; // 'new' | 'ok' | 'err'
  let value;

  return function (...args) {
    if (state === 'ok') return value;
    if (state === 'err') throw value;

    try {
      value = fn.apply(this, args);
      state = 'ok';
      return value;
    } catch (e) {
      value = e;
      state = 'err';
      throw e;
    }
  };
}
```

---

## 4. `this` and arrow functions

```js
const obj = {
  n: 1,
  bump: once(function () {
    return ++this.n;
  }),
};

obj.bump(); // 2
obj.bump(); // 2 (cached — does not bump again)
```

If `fn` is an arrow, `this` is lexical — `apply` won’t rebind. Mention that.

---

## 5. vs related patterns

| Pattern | Behavior |
|---|---|
| `once(fn)` | Run body ≤1 time; cache return |
| `memoize(fn)` | Cache by **arguments**; many unique calls |
| EventEmitter `once` | One listener fire, then remove |
| debounce leading | Time-windowed; can fire again later |
| module singleton | Import-time once for whole app |

**Memoize vs once:** `once` ignores args after first. `memoize` keys on args — see performance traps in [TRICKY_10](./TRICKY_10_FRONTEND_QUESTIONS.md) Q9.

---

## 6. Tiny tests

```js
let n = 0;
const inc = once(() => ++n);
inc(); // 1
inc(); // 1
n;     // 1

const add = once((a, b) => a + b);
add(1, 2); // 3
add(9, 9); // 3  — second args ignored
```

---

## 7. Spoken answers

### 20s

> `once` wraps a function with a closure flag. First call runs the function and stores the result; later calls return that stored result without calling again.

### 45s

> I’d close over `called` and `result`, forward `this` and args with apply on the first invocation only. For async, caching the Promise naturally dedupes concurrent callers. I’d clarify whether a thrown error should lock the wrapper or allow retry. This is different from memoize, which caches per argument list.

---

## 8. Practice checklist

- [ ] Implement `once` with `this` + rest args in &lt; 3 min  
- [ ] Explain async Promise caching  
- [ ] Contrast with memoize / EventEmitter.once  
- [ ] Decide throw-on-first-error policy out loud  

---

## Related

| Topic | File |
|---|---|
| EventEmitter `.once(event)` | [EVENT_EMITTER.md](./EVENT_EMITTER.md) |
| Closures / lexical env | [SCOPES.md](./SCOPES.md) |
| pipe / compose | [PIPE_COMPOSE.md](./PIPE_COMPOSE.md) |
