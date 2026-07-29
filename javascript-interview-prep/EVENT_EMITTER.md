# Implement EventEmitter From Scratch — Interview Ready Guide

This question looks small, but interviewers use it to test real frontend architecture skills:

- Pub-Sub design
- Closures
- Function references
- Event-driven systems
- Memory management
- Decoupled communication
- Async thinking / ordering

By the end, you should be able to:

1. Explain EventEmitter in plain English
2. Implement `on`, `off`, `emit`, `once`
3. Handle edge cases (duplicates, unsubscribe during emit, leaks)
4. Relate it to DOM, Node, RxJS, Angular, Redux

---

## 1. What Is An EventEmitter?

An **EventEmitter** lets different parts of code communicate through events without knowing each other directly.

One part **emits** an event.  
Other parts **listen** and react.

```text
Publisher (emit)  --->  EventEmitter  --->  Subscribers (listeners)
```

Interview one-liner:

> EventEmitter is a Pub-Sub utility: subscribers register listeners for named events, and publishers notify them by emitting those events with data.

---

## 2. Why Interviewers Ask This

They are not only checking if you can write a class.

They check whether you understand:

| Concept | How it appears in EventEmitter |
|---|---|
| Pub-Sub | `on` subscribe, `emit` publish |
| Closures | store listener lists privately |
| Function references | `off` needs same function identity |
| Memory leaks | forgotten listeners keep objects alive |
| Decoupling | emitter connects modules without hard imports |
| Ordering | listeners usually run in registration order |
| Edge cases | emit while unsubscribing, duplicates, once |

---

## 3. Real-World Places This Pattern Exists

| System | How EventEmitter idea appears |
|---|---|
| DOM Events | `addEventListener` / `dispatchEvent` |
| Node.js | `EventEmitter` class |
| RxJS | `Subject.next()` + subscribe |
| Redux | store.subscribe(listener) |
| Angular | `@Output() EventEmitter` |
| WebSockets | message/open/close listeners |
| Custom UI systems | app-wide event bus |

So this interview question maps directly to production frontend architecture.

---

## 4. Required API (Start Here)

```js
class EventEmitter {
  on(event, listener) {}
  off(event, listener) {}
  emit(event, ...args) {}
}
```

Common extras:

```js
once(event, listener) {}
listenerCount(event) {}
removeAllListeners(event?) {}
```

### Behavior

- `on(event, listener)` → subscribe
- `off(event, listener)` → unsubscribe
- `emit(event, ...args)` → call all current listeners with args
- `once(event, listener)` → run only first time, then auto-off

---

## 5. Mental Model / Data Structure

Use a map from event name → list of listeners.

```text
events = {
  "click": [fn1, fn2],
  "login": [fn3],
  "message": [fn4, fn5, fn6]
}
```

In modern JS:

```js
this.events = new Map(); // eventName -> Set/Array of listeners
```

### Array vs Set for listeners

| Structure | Pros | Cons |
|---|---|---|
| Array | preserves order easily, simple | duplicate handling manual |
| Set | unique listeners by default, O(1)-ish delete | order is insertion order (usually fine) |

Both are acceptable. Many interviews use Array first. Set is nicer for uniqueness + off.

---

## 6. Interview-Ready Implementation (Core)

```js
class EventEmitter {
  constructor() {
    // eventName -> Set of listener functions
    this.events = new Map();
  }

  on(event, listener) {
    if (typeof listener !== 'function') {
      throw new TypeError('listener must be a function');
    }

    if (!this.events.has(event)) {
      this.events.set(event, new Set());
    }

    this.events.get(event).add(listener);

    // optional: return unsubscribe function (very useful in frontend)
    return () => this.off(event, listener);
  }

  off(event, listener) {
    const listeners = this.events.get(event);
    if (!listeners) return false;

    const removed = listeners.delete(listener);

    if (listeners.size === 0) {
      this.events.delete(event); // avoid memory leak of empty sets
    }

    return removed;
  }

  emit(event, ...args) {
    const listeners = this.events.get(event);
    if (!listeners || listeners.size === 0) return false;

    // copy before calling to protect against on/off during emit
    [...listeners].forEach((listener) => {
      listener(...args);
    });

    return true;
  }
}
```

---

## 7. Line-by-Line Explanation (Say This In Interview)

### Why `Map`?

- event names can be many
- clean get/set/delete
- better than plain object if keys are dynamic

### Why `Set` of listeners?

- prevents exact same function reference being added twice easily
- delete by function reference is straightforward

### Why return unsubscribe from `on`?

Frontend pattern:

```js
const stop = emitter.on('resize', handler);
// later
stop();
```

This reduces memory-leak bugs.

### Why copy listeners before emit?

```js
[...listeners].forEach(...)
```

If one listener calls `off` or `on` during emit, the iteration set should not get corrupted / skip unexpectedly.

This is a strong senior signal.

---

## 8. Usage Example

```js
const emitter = new EventEmitter();

function onLogin(user) {
  console.log('Welcome', user.name);
}

emitter.on('login', onLogin);

emitter.emit('login', { name: 'Shivam' });
// Welcome Shivam

emitter.off('login', onLogin);

emitter.emit('login', { name: 'Shivam' });
// nothing happens
```

Multiple listeners:

```js
emitter.on('message', (msg) => console.log('A', msg));
emitter.on('message', (msg) => console.log('B', msg));

emitter.emit('message', 'hello');
// A hello
// B hello
```

Order is registration order (Set/Array insertion order).

---

## 9. Implement `once`

```js
once(event, listener) {
  const wrapper = (...args) => {
    this.off(event, wrapper);
    listener(...args);
  };

  // keep link so off(event, originalListener) can also work if desired
  wrapper.originalListener = listener;

  return this.on(event, wrapper);
}
```

Better version that supports off by original:

```js
once(event, listener) {
  const wrapper = (...args) => {
    this.off(event, wrapper);
    listener.apply(this, args);
  };

  // store mapping if you want off(original) support
  wrapper.__original = listener;
  return this.on(event, wrapper);
}
```

Minimal interview version is enough:

```js
once(event, listener) {
  const wrapper = (...args) => {
    this.off(event, wrapper);
    listener(...args);
  };
  this.on(event, wrapper);
}
```

Example:

```js
emitter.once('ready', () => console.log('ready once'));
emitter.emit('ready'); // prints
emitter.emit('ready'); // no print
```

---

## 10. Full Version With Helpers

```js
class EventEmitter {
  constructor() {
    this.events = new Map();
  }

  on(event, listener) {
    if (typeof listener !== 'function') {
      throw new TypeError('listener must be a function');
    }

    if (!this.events.has(event)) {
      this.events.set(event, new Set());
    }

    this.events.get(event).add(listener);
    return () => this.off(event, listener);
  }

  once(event, listener) {
    const wrapper = (...args) => {
      this.off(event, wrapper);
      listener(...args);
    };
    return this.on(event, wrapper);
  }

  off(event, listener) {
    const listeners = this.events.get(event);
    if (!listeners) return false;

    const removed = listeners.delete(listener);
    if (listeners.size === 0) this.events.delete(event);
    return removed;
  }

  emit(event, ...args) {
    const listeners = this.events.get(event);
    if (!listeners || listeners.size === 0) return false;

    for (const listener of [...listeners]) {
      try {
        listener(...args);
      } catch (err) {
        // optional: isolate listener failures
        console.error(`Error in listener for "${event}"`, err);
      }
    }

    return true;
  }

  listenerCount(event) {
    return this.events.get(event)?.size ?? 0;
  }

  removeAllListeners(event) {
    if (event === undefined) {
      this.events.clear();
      return;
    }
    this.events.delete(event);
  }
}
```

---

## 11. The Tricky Parts Interviewers Probe

### Trick 1 — Function reference identity

This fails:

```js
emitter.on('click', () => console.log('hi'));
emitter.off('click', () => console.log('hi')); // different function!
```

Because each arrow creates a new function reference.

Correct:

```js
function handler() {
  console.log('hi');
}

emitter.on('click', handler);
emitter.off('click', handler); // same reference
```

Interview line:

> Unsubscribe works by function reference equality, not by source-code similarity.

---

### Trick 2 — Duplicate listeners

With Array:

```js
this.events[event].push(listener);
this.events[event].push(listener); // now called twice
```

With Set:

```js
set.add(listener); // second add ignored
```

Ask interviewer if duplicates should be allowed.  
Default good answer: usually unique by reference.

---

### Trick 3 — Unsubscribe during emit

```js
function a() {
  console.log('a');
  emitter.off('x', b);
}
function b() {
  console.log('b');
}

emitter.on('x', a);
emitter.on('x', b);
emitter.emit('x');
```

If you mutate the live list while iterating, `b` might be skipped unexpectedly depending on implementation.

Safe approach:

```js
const snapshot = [...listeners];
snapshot.forEach((fn) => fn(...args));
```

---

### Trick 4 — Memory leaks

If a component registers listener and never offs it:

- emitter keeps function
- function may close over component state
- component cannot be GC'ed

Fixes:

- return unsubscribe from `on`
- call `off` in cleanup (`ngOnDestroy`, React `useEffect` cleanup)
- `once` for one-time events
- `removeAllListeners` on teardown

---

### Trick 5 — Listener throws error

If one listener throws, should others still run?

Production-friendly:

```js
try {
  listener(...args);
} catch (err) {
  console.error(err);
}
```

Mention this as a design choice.

---

### Trick 6 — Async listeners

`emit` is usually sync:

```js
emitter.emit('save');
console.log('after emit');
// listeners run before this line
```

If listeners are async functions, `emit` does not await them unless you design `emitAsync`.

```js
async emitAsync(event, ...args) {
  const listeners = [...(this.events.get(event) || [])];
  await Promise.all(listeners.map((fn) => fn(...args)));
}
```

Good follow-up answer.

---

## 12. Pub-Sub Architecture Explanation

Without EventEmitter (tight coupling):

```js
// module A directly calls module B
authService.login();
navbar.updateUser();
analytics.trackLogin();
```

A must know B and C.

With EventEmitter (decoupled):

```js
authService.login();
emitter.emit('login', user);

// somewhere else
emitter.on('login', (user) => navbar.updateUser(user));
emitter.on('login', (user) => analytics.trackLogin(user));
```

Benefits:

- modules stay independent
- easy to add/remove listeners
- better for extensible systems

Costs:

- harder to trace flow if overused
- memory leak risk if cleanup is poor
- event name contracts must be clear

---

## 13. Closures In This Problem

```js
on(event, listener) {
  // this.events is closed over by returned unsubscribe
  return () => this.off(event, listener);
}
```

Also `once` wrapper closes over original listener + event name.

Interviewers like hearing:

> I use closure to return an unsubscribe function that remembers the exact event and listener reference.

---

## 14. Array-Based Version (If You Prefer)

```js
class EventEmitter {
  constructor() {
    this.events = {};
  }

  on(event, listener) {
    if (!this.events[event]) this.events[event] = [];
    this.events[event].push(listener);
    return () => this.off(event, listener);
  }

  off(event, listener) {
    const list = this.events[event];
    if (!list) return;

    this.events[event] = list.filter((fn) => fn !== listener);
    if (this.events[event].length === 0) delete this.events[event];
  }

  emit(event, ...args) {
    const list = this.events[event];
    if (!list) return;

    [...list].forEach((fn) => fn(...args));
  }
}
```

Note:

- duplicates possible unless you check before push
- off uses filter by reference

---

## 15. Tiny Test Plan (Do This In Interview If Time)

```js
const ee = new EventEmitter();
const logs = [];

const a = (x) => logs.push('a' + x);
const b = (x) => logs.push('b' + x);

ee.on('t', a);
ee.on('t', b);
ee.emit('t', 1);
// logs: ['a1', 'b1']

ee.off('t', a);
ee.emit('t', 2);
// logs: ['a1', 'b1', 'b2']

ee.once('ready', () => logs.push('ready'));
ee.emit('ready');
ee.emit('ready');
// ready added once
```

---

## 16. Compare With Similar Frontend Tools

### DOM

```js
button.addEventListener('click', handler);
button.removeEventListener('click', handler);
button.click(); // emit-like
```

### RxJS Subject

```ts
const subject = new Subject();
const sub = subject.subscribe((v) => console.log(v));
subject.next(10); // emit
sub.unsubscribe(); // off
```

### Angular EventEmitter

```ts
@Output() saved = new EventEmitter<number>();
this.saved.emit(1); // child to parent communication
```

### Redux

```js
const unsubscribe = store.subscribe(listener);
unsubscribe();
```

Knowing these comparisons makes your answer sound architecture-aware.

---

## 17. Design Decisions Checklist (Speak These)

When implementing, mention choices:

1. Store listeners in `Map<event, Set<fn>>`
2. Preserve registration order
3. Unique listeners by reference
4. Snapshot on emit for safe mutation
5. Return unsubscribe function
6. Clean empty event keys
7. Optional error isolation per listener
8. Sync emit by default

---

## 18. Common Follow-up Questions

**Q: How do you prevent memory leaks?**  
A: Always unsubscribe, return cleanup function, remove empty event entries, use once when suitable.

**Q: Why is off not working?**  
A: Different function reference passed than the one registered.

**Q: Should emit be async?**  
A: Default sync. Provide emitAsync if awaiting listeners is required.

**Q: How is this different from Promises?**  
A: Promise = one future value/settlement. EventEmitter = many events over time, multiple listeners.

**Q: How is this different from Observables?**  
A: Similar push model; Observables add operators, completion semantics, richer stream composition.

**Q: Can multiple emitters share events?**  
A: Only if they use same emitter instance/event bus.

---

## 19. Perfect Spoken Answer (60–90 sec)

> EventEmitter implements the Pub-Sub pattern. Listeners subscribe to named events with on, unsubscribe with off, and publishers notify them using emit. Internally I keep a Map from event name to a Set of listener functions. Using Set helps avoid duplicate references and makes removal easy. During emit I copy the listener list first so unsubscribing inside a handler does not break iteration. I also return an unsubscribe function from on to make cleanup easy and avoid memory leaks. This same pattern powers DOM events, Node EventEmitter, RxJS subjects, and Angular EventEmitter.

---

## 20. Minimal Version To Write Under Time Pressure

If interviewer wants short code first:

```js
class EventEmitter {
  constructor() {
    this.events = new Map();
  }

  on(event, cb) {
    if (!this.events.has(event)) this.events.set(event, new Set());
    this.events.get(event).add(cb);
  }

  off(event, cb) {
    this.events.get(event)?.delete(cb);
  }

  emit(event, ...args) {
    [...(this.events.get(event) || [])].forEach((cb) => cb(...args));
  }
}
```

Then upgrade with:

- validation
- once
- unsubscribe return
- empty cleanup
- error isolation

---

## 21. Practice Checklist

- [ ] Implement `on/off/emit` from memory in < 10 minutes
- [ ] Add `once`
- [ ] Explain function-reference unsubscribe bug
- [ ] Explain why snapshot on emit
- [ ] Explain memory leak + cleanup
- [ ] Compare with DOM / RxJS / Angular EventEmitter
- [ ] Mention sync vs async emit design choice

---

## 22. Cheat Sheet

```text
EventEmitter = Pub-Sub

on(event, fn)     -> subscribe
off(event, fn)    -> unsubscribe (same reference!)
emit(event, args) -> notify listeners in order
once              -> auto-off after first call

Store: Map<event, Set<fn>>
Emit safely: [...listeners].forEach(...)
Cleanup: remove empty sets, return unsubscribe
Leak risk: forgotten listeners
Exists in: DOM, Node, RxJS, Angular, Redux
```

If you can implement this cleanly and explain the edge cases, you demonstrate strong JavaScript architecture fundamentals — not just syntax.
