# 10 Tricky Frontend Interview Questions — Master Map

Full answers + which deep guide owns each topic.

| # | Question theme | Deep guide |
|---|---|---|
| 1 | Resolved Promise chain blocks UI | [EVENT_LOOP.md](./EVENT_LOOP.md) |
| 2 | Spread clone still mutates original | [DEEP_CLONE.md](./DEEP_CLONE.md) |
| 3 | Older API overwrites newer UI (race) | [ASYNC_AWAIT.md](./ASYNC_AWAIT.md), Angular typeahead `switchMap` |
| 4 | Closure outdated value vs memory leak | [FUNCTIONS.md](./FUNCTIONS.md) |
| 5 | try/catch outside async callback | [PROMISES.md](./PROMISES.md), [ASYNC_AWAIT.md](./ASYNC_AWAIT.md) |
| 6 | Slow page: JS vs reflow/repaint/composite | [../frontend-system-design/03_REFLOW_REPAINT_RENDERING_PERFORMANCE.md](../frontend-system-design/03_REFLOW_REPAINT_RENDERING_PERFORMANCE.md) |
| 7 | Property found via prototype chain | [PROTOTYPE_CHAINING.md](./PROTOTYPE_CHAINING.md) |
| 8 | Works in Postman, fails in browser (CORS) | [../frontend-system-design/09_CORS.md](../frontend-system-design/09_CORS.md) |
| 9 | Memoization made app slower | [DSA_FRONTEND_JS.md](./DSA_FRONTEND_JS.md) § Memoize |
| 10 | Auth works but still vulnerable | [../frontend-system-design/10_FRONTEND_AUTH_SECURITY.md](../frontend-system-design/10_FRONTEND_AUTH_SECURITY.md) |

---

## 1️⃣ Why can a long chain of resolved Promises still block the UI?

### Say this

> Promises are async relative to the current call stack, but their callbacks run as **microtasks on the main thread**. A huge chain of already-resolved `.then` handlers can starve the browser so it never reaches rendering/macrotasks — UI freezes even though nothing is “waiting on the network.”

### Why

```text
sync code
  → drain ALL microtasks (Promise.then / queueMicrotask)
  → then maybe render
  → then one macrotask (setTimeout, I/O, …)
```

If each `.then` schedules another `.then`, the microtask queue never empties → no paint.

```js
function bomb() {
  Promise.resolve().then(bomb); // starvation
}
bomb();
```

### Fix ideas

- Break work into chunks with `setTimeout` / `requestAnimationFrame` / `scheduler`
- Don’t recursively enqueue endless microtasks
- Heavy work → Web Worker

---

## 2️⃣ Spread clone changed the original — why?

### Say this

> `...` / `Object.assign` is a **shallow** copy. Top-level keys are new, but nested objects/arrays are still **shared references**. Mutating a nested field mutates both.

```js
const original = { user: { name: 'A' } };
const clone = { ...original };
clone.user.name = 'B';
console.log(original.user.name); // 'B' — same nested object
```

### Fix

Deep clone nested data (structuredClone / custom deepClone), or immutable update only the changed path.

---

## 3️⃣ Older API finishes last and overwrites UI — race — how to prevent?

### Say this

> Ignore or cancel stale responses. Keep a request id / use `AbortController`, or in RxJS use `switchMap` so a new search unsubscribes the previous HTTP call.

### Patterns

```js
// 1) monotonic token
let reqId = 0;
async function search(q) {
  const id = ++reqId;
  const data = await api(q);
  if (id !== reqId) return; // stale
  render(data);
}

// 2) AbortController
const ctrl = new AbortController();
fetch(url, { signal: ctrl.signal });
// later: ctrl.abort()

// 3) RxJS
query$.pipe(debounceTime(300), switchMap(q => api(q)))
```

Angular typeahead demo uses `switchMap` for exactly this.

---

## 4️⃣ Closure returns outdated value — why? vs memory leak?

### Say this

> A closure captures the **variable binding**, not a snapshot of the value at create time (unless you copied it). If you closed over a loop variable / old state object and never read the latest, you see stale data. That’s a **logic/stale-closure** bug.

A **memory leak** is different: something stays referenced forever (detached DOM + listener, uncleared timer, growing unbounded cache) so memory can’t be GC’d.

| Stale closure | Memory leak |
|---|---|
| Wrong/old value used | Memory grows / not released |
| Logic bug | Resource bug |
| Fix: read latest signal/ref, recreate closure, copy primitive in loop | Fix: unsubscribe, removeListener, clear timers, bound caches |

```js
// classic stale in loop with var
for (var i = 0; i < 3; i++) {
  setTimeout(() => console.log(i), 0); // 3,3,3
}
```

---

## 5️⃣ try/catch outside async callback doesn’t catch — where to handle?

### Say this

> `try/catch` only catches errors in the **current synchronous** execution. An async callback runs later on another turn of the event loop, outside that try block. Handle errors **inside** the callback, with Promise `.catch`, or `try/catch` around `await` in an `async` function.

```js
try {
  setTimeout(() => {
    throw new Error('boom'); // NOT caught by outer try
  }, 0);
} catch (e) {
  // never runs for that throw
}

setTimeout(() => {
  try { throw new Error('boom'); }
  catch (e) { /* handle here */ }
}, 0);

async function load() {
  try { await fetch('/x'); }
  catch (e) { /* handle here */ }
}

promise.then(ok).catch(err); // or await + try/catch
```

---

## 6️⃣ APIs fast but page feels slow — JS vs reflow vs repaint vs compositing?

### Say this

> Use Performance panel: long **Scripting** tasks → JS. Purple/green Layout/Paint spikes → style/layout/paint. Prefer checking whether you’re forcing layout (read geometry in loops) or animating layout properties. Compositing issues show up as layer/GPU work; animate `transform`/`opacity` when possible.

| Bottleneck | What you see / cause |
|---|---|
| JS execution | Long tasks, main thread busy, input delay |
| Reflow (layout) | Geometry changes, reading `offsetHeight` in loops |
| Repaint | Color/visibility pixel updates without geometry |
| Compositing | Layer merge; often OK if using transform/opacity |

DevTools: Performance recording → Summary (Scripting / Rendering / Painting).

---

## 7️⃣ Property missing on object but JS finds it — prototype chain

### Say this

> Lookup walks: own properties → `[[Prototype]]` → … → until `null`. Inherited methods like `toString` live on `Object.prototype`. That’s why a plain `{}` still “has” methods.

```text
obj → Obj.prototype → Object.prototype → null
```

```js
const o = {};
o.toString(); // found on Object.prototype
o.hasOwnProperty('toString'); // false
```

---

## 8️⃣ Works in Postman, fails in browser — CORS

### Say this

> Postman isn’t a browser — **no Same-Origin Policy**. Browsers enforce CORS: JS can read a cross-origin response only if the server sends the right `Access-Control-*` headers. Preflight (`OPTIONS`) checks permission for “non-simple” requests. Frontend cannot bypass CORS securely; the **server** (or a proxy) must allow the origin.

See full guide: `frontend-system-design/09_CORS.md`.

---

## 9️⃣ Memoization made app slower / more memory — why?

### Say this

> Cache hit only helps if you **reuse the same keys** and the cached value is cheaper than recomputing. Bad keys (`JSON.stringify` huge objects), caching everything unbounded, or memoizing cheap functions adds Map lookup + memory overhead. Also caching wrong identity causes stale or useless entries.

### Failure modes

- Unbounded cache → memory pressure / GC thrash  
- Keys always unique → never hits, only overhead  
- Memoizing trivial work  
- Holding large objects/DOM forever in cache  

Fix: LRU cache, weak keys where needed, memoize only expensive pure functions.

---

## 🔟 Auth works but still vulnerable — what to check?

### Say this

> Auth ≠ security. I’d audit token storage (HttpOnly cookie vs localStorage XSS risk), XSS surfaces, CSRF on cookie sessions, `SameSite`, secure/HTTPS flags, and that APIs don’t trust the UI alone.

See: `frontend-system-design/10_FRONTEND_AUTH_SECURITY.md` (storage) · `frontend-system-design/17_CYBERATTACKS_FRONTEND_INTERVIEW.md` (attack catalog).

---

## Night-before checklist

- [ ] Microtasks can block UI  
- [ ] Spread = shallow  
- [ ] Race → abort / switchMap / request id  
- [ ] Stale closure ≠ memory leak  
- [ ] Async errors need local / Promise handling  
- [ ] Perf: scripting vs layout vs paint  
- [ ] Prototype walk  
- [ ] CORS is browser-enforced, server-fixed  
- [ ] Memoize carefully (LRU, good keys)  
- [ ] Cookies / XSS / CSRF / SameSite  
