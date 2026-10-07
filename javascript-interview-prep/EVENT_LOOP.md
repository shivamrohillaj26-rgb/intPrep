# JavaScript Event Loop — Complete Interview Guide

This guide is written for frontend interviews where the interviewer shows a code snippet and asks:

> What is the output?

You will learn:

- How the event loop actually works
- **Who queues what** — browser/host vs JS engine (V8) — see **§2**
- Exact preference / priority order
- A step-by-step method to solve any output question
- Many tricky examples with full reasoning
- More spoken variants — see **§14**

---

## Interview answers (say these first)

### 60–75s — “Explain the event loop”

> JavaScript is single-threaded: the **engine** (like V8) has one **call stack**, so only one piece of JS runs at a time. Async work isn’t done by the engine alone — the **browser host** provides Web APIs for timers, network, and DOM. When you call `setTimeout` or `fetch`, the host does that work outside JS; when it finishes, it **queues a callback as a task**. Promises schedule **microtasks** closer to the engine. The **event loop** — also part of the host — keeps checking: when the stack is empty, drain **all microtasks**, maybe paint, then run **one macrotask**, then microtasks again. So sync runs first, then all Promise/`await` continuations, then a timer — which is why `Promise.then` beats `setTimeout(0)`.

### 20s — “Who does the queueing?”

> The **browser** queues timer/network/DOM callbacks. **Promises** queue microtasks. The **event loop** decides the order: sync → all microtasks → one task.

---

## 1. Why Event Loop Questions Exist

JavaScript is **single-threaded**. Only one piece of JS code runs at a time on the main thread.

But browsers and Node also do async work:

- timers (`setTimeout`)
- network (`fetch`)
- DOM events
- Promises

The **event loop** decides *when* queued callbacks run.

Interviewers use output questions to check whether you understand:

1. Synchronous code runs first
2. Microtasks beat macrotasks
3. Microtasks drain completely
4. Only one macrotask runs at a time
5. `await` is not “magic sync” — its continuation is a microtask

---

## 2. Who does the queueing? (Browser / host vs JS engine)

This is the gap interviewers probe with: *“Where do these queues live? Who puts work there?”*

### Short answer

| Piece | Who owns it | Role |
|---|---|---|
| **Call stack** | JS engine (V8 in Chrome/Node, SpiderMonkey, JSCore…) | Runs your JS — one frame at a time |
| **Heap** | JS engine | Objects / memory |
| **Web APIs / Host APIs** | **Browser** (or Node C++ host) — **not** the JS engine alone | Timers, `fetch`, DOM events, `setTimeout` clocks |
| **Task / macrotask queue** | **Host environment** (HTML event loop in browsers) | Callbacks ready to run as tasks |
| **Microtask queue** | Coordinated by engine + host (Promises are in the JS engine; drained per HTML/event-loop rules) | `.then`, `queueMicrotask`, `await` continuations |
| **Event loop** | **Host** (browser tab / Node) | Forever: “stack empty? drain microtasks; run next task…” |

**One-liner:**

> JavaScript doesn’t do I/O by itself. The **browser (host)** runs timers/network/DOM. When that work finishes, the host **enqueues a callback**. The **event loop** (also host) pulls from those queues and gives the callback to the **JS engine** to run on the call stack.

### Where it happens (picture)

```text
┌─────────────────────────────────────────────────────────────┐
│  BROWSER TAB / NODE PROCESS  (host environment)             │
│                                                             │
│   Web APIs                          Event loop              │
│   ┌─────────────┐                   (scheduler)             │
│   │ setTimeout  │──when ready──► Task queue ──┐             │
│   │ fetch/XHR   │──when ready──► Task queue   │             │
│   │ click/DOM   │──when ready──► Task queue   │             │
│   └─────────────┘                             │             │
│                                               ▼             │
│                                    ┌──────────────────┐     │
│                                    │  JS ENGINE (V8)  │     │
│                                    │  Call stack      │     │
│                                    │  (+ Promise /    │     │
│                                    │   microtask q)   │     │
│                                    └──────────────────┘     │
└─────────────────────────────────────────────────────────────┘
```

### Concrete walk: `setTimeout` vs `Promise`

```js
setTimeout(() => console.log('timeout'), 0);
Promise.resolve().then(() => console.log('promise'));
console.log('sync');
```

1. **JS engine** runs the script on the **call stack** (this whole script is itself one task).
2. `setTimeout(...)` → engine calls into **browser timer Web API**. Browser starts a timer. **Nothing is on the JS queue yet.**
3. `Promise.resolve().then(...)` → engine schedules a **microtask** (Promise job).
4. `console.log('sync')` runs now → prints `sync`.
5. Script/task finishes → stack empty.
6. **Event loop** (browser): drain **microtasks** → prints `promise`.
7. Timer already fired → browser had put the timeout callback on the **task queue**.
8. Event loop takes **one task** → engine runs it → prints `timeout`.

So:

- **Queueing the timeout callback** = browser/host after the timer completes  
- **Queueing the Promise `.then`** = JS Promise machinery (microtask)  
- **Choosing what runs next** = event loop (host), following the rules below  

### Browser vs Node

| | Browser | Node |
|---|---|---|
| Host | HTML page / tab event loop | libuv + Node event loop phases |
| Timer / I/O | Web APIs | libuv |
| Microtasks | Promise + `queueMicrotask` | same + `process.nextTick` (even higher) |
| Engine | V8 / JSCore / SpiderMonkey | V8 |

Frontend interviews almost always mean the **browser** model.

### What to say if they ask “Is the event loop part of JavaScript?”

> The language spec defines Jobs/Promises; the **HTML spec** (browsers) and **Node** define the event loop that orchestrates tasks and rendering. In practice we say “JS event loop,” but the loop itself is provided by the **runtime host**, not by your `.js` file alone.

---

## 3. The Mental Model (Memorize This)

```text
┌──────────────────────────────┐
│         Call Stack           │  ← currently running JS  (engine)
└──────────────▲───────────────┘
               │
               │ stack empty?
               │
┌──────────────┴───────────────┐
│       Microtask Queue        │  ← drain ALL
│  Promise.then / catch / finally
│  queueMicrotask
│  await continuation
│  MutationObserver
└──────────────▲───────────────┘
               │
               │ microtask queue empty
               │
┌──────────────┴───────────────┐
│       Macrotask Queue        │  ← run ONE  (host task queue)
│  setTimeout / setInterval
│  setImmediate (Node)
│  UI events, MessageChannel
│  I/O callbacks
└──────────────────────────────┘
```

### Golden Rule

```text
1. Run ALL synchronous code (until the call stack is empty)
2. Drain ALL microtasks (including new ones created during the drain)
3. (Browser may render / paint here)
4. Run ONE macrotask
5. Go back to step 2
```

Short form used in interviews:

```text
sync → ALL microtasks → ONE macrotask → ALL microtasks → ONE macrotask → ...
```

---

## 4. Preference / Priority Order

### Browser (most frontend interviews)

From highest priority to lowest after current sync code finishes:

| Priority | What | Examples |
|---|---|---|
| 1 | Synchronous code | `console.log`, loops, function calls |
| 2 | Microtasks (all of them) | `Promise.then`, `catch`, `finally`, `queueMicrotask`, `await` resume, `MutationObserver` |
| 3 | Rendering opportunity | style/layout/paint (browser may do this) |
| 4 | One macrotask | `setTimeout`, `setInterval`, click/input handlers, `MessageChannel`, script tasks |

Important:

- All microtasks run before any pending `setTimeout(fn, 0)`
- Microtasks queued by other microtasks also run before the next macrotask
- Rendering happens **after** microtasks drain, not between individual microtasks

### Node.js (if asked)

Node is similar, but has extra queues/phases.

CommonJS-style order after sync / a callback finishes:

```text
1. Synchronous code
2. process.nextTick queue (ALL)
3. Promise / queueMicrotask microtasks (ALL)
4. Timers phase (setTimeout / setInterval)
5. Pending callbacks
6. Poll (I/O)
7. Check (setImmediate)
8. Close callbacks
```

Between phases, Node again drains:

```text
process.nextTick → Promise microtasks
```

Node-only interview facts:

- `process.nextTick` > Promise microtasks
- Top-level `setTimeout(0)` vs `setImmediate` order is **not always guaranteed**
- Inside an I/O callback, `setImmediate` usually runs before `setTimeout(0)`

For Angular/frontend roles, focus on the **browser model**. Mention Node only if asked.

---

## 4b. Microtasks vs Macrotasks Cheat Sheet

### Microtasks

```js
Promise.resolve().then(fn)
promise.then(fn)
promise.catch(fn)
promise.finally(fn)
queueMicrotask(fn)
async function resume after await
MutationObserver callback
```

### Macrotasks (Tasks)

```js
setTimeout(fn, delay)
setInterval(fn, delay)
setImmediate(fn)          // Node
requestAnimationFrame(fn) // special, tied to rendering (not a classic microtask)
UI events (click, input)
MessageChannel / postMessage
I/O completion callbacks
```

### Quick comparison

| | Microtask | Macrotask |
|---|---|---|
| Priority | Higher | Lower |
| Drain style | Drain entire queue | Run one, then check microtasks |
| Can block UI? | Yes, if chained forever | Yes, if callback is heavy |
| Typical use | Promise chaining, immediate follow-up | Timers, events, yielding to browser |

---

## 5. How To Solve Any Event Loop Output Question

Use this exact method in the interview. Write it on paper if allowed.

### Step A — Label every line

Mark each statement as one of:

- `S` = synchronous
- `μ` = microtask
- `M` = macrotask
- `A` = async function / await (split into sync part + microtask continuation)

### Step B — Run all sync first

Top to bottom. Ignore callbacks that are only scheduled, not executed yet.

### Step C — Drain microtasks

Run the microtask queue left to right / FIFO.

If a microtask schedules another microtask, that new one also runs in this drain.

If a microtask schedules a macrotask (`setTimeout`), put it in the macrotask queue for later.

### Step D — Run one macrotask

Execute only the oldest macrotask.

Whatever sync code is inside it runs now.

Then go back to Step C.

### Step E — Repeat until queues are empty

### Interview paper template

```text
Sync logs:
Microtasks:
Macrotasks:

Final output:
```

---

## 6. Critical Rules Interviewers Expect You To Know

### Rule 1 — `Promise.then` runs before `setTimeout(0)`

Always, in the browser.

### Rule 2 — Microtasks drain completely

A microtask can keep adding more microtasks. The event loop will keep draining until the queue is empty.

This can starve rendering and timers.

### Rule 3 — Only one macrotask at a time

After one timeout callback finishes, microtasks run before the next timeout.

### Rule 4 — `await` splits the function

```js
async function f() {
  console.log('before');
  await something;
  console.log('after'); // this is a microtask continuation
}
```

- Code before `await` runs synchronously
- Code after `await` is scheduled as a microtask (Promise continuation)

Even `await null` / `await 0` / `await Promise.resolve()` defers the rest.

### Rule 5 — Creating a Promise executor is sync

```js
new Promise((resolve) => {
  console.log('executor'); // SYNC
  resolve();
}).then(() => console.log('then')); // microtask
```

### Rule 6 — Resolved Promise callbacks still wait for current sync to finish

They do **not** interrupt the currently running function.

### Rule 7 — Delay `0` is not immediate

`setTimeout(fn, 0)` means:

> Put `fn` in the macrotask queue after at least ~0 ms

It still waits for:

1. Current sync to finish
2. All microtasks
3. Possibly other earlier macrotasks
4. Browser minimum timer clamps in some nested cases (~4ms)

---

## 7. Classic Questions With Full Explanation

### Q1 — The basic one

```js
console.log(1);

setTimeout(() => console.log(2), 0);

Promise.resolve().then(() => console.log(3));

console.log(4);
```

**Solve**

- Sync: `1`, schedule timeout, schedule then, `4`
- Microtasks: `3`
- Macrotasks: `2`

**Output**

```text
1
4
3
2
```

---

### Q2 — Microtask inside macrotask

```js
console.log('A');

setTimeout(() => {
  console.log('B');
  Promise.resolve().then(() => console.log('C'));
}, 0);

setTimeout(() => console.log('D'), 0);

Promise.resolve().then(() => console.log('E'));

console.log('F');
```

**Solve**

1. Sync: `A`, `F`
2. Microtasks: `E`
3. First timeout macrotask: `B`, then queues `C`
4. Drain microtasks: `C`
5. Second timeout macrotask: `D`

**Output**

```text
A
F
E
B
C
D
```

Why not `B D C`? Because after the first timeout, microtasks drain before the next timeout.

---

### Q3 — Nested Promises

```js
console.log(1);

Promise.resolve().then(() => {
  console.log(2);
  Promise.resolve().then(() => console.log(3));
});

Promise.resolve().then(() => console.log(4));

console.log(5);
```

**Solve**

- Sync: `1`, `5`
- Microtask queue initially: thenA, thenB
- Run thenA → logs `2`, queues thenC
- Queue now: thenB, thenC
- Run thenB → `4`
- Run thenC → `3`

**Output**

```text
1
5
2
4
3
```

---

### Q4 — Famous javascript.info puzzle

```js
console.log(1);

setTimeout(() => console.log(2));

Promise.resolve().then(() => console.log(3));

Promise.resolve().then(() => setTimeout(() => console.log(4)));

Promise.resolve().then(() => console.log(5));

setTimeout(() => console.log(6));

console.log(7);
```

**Solve**

- Sync: `1`, `7`
- Microtasks: `3`, schedule timeout(4), `5`
- Macrotask queue after microtasks: timeout(2), timeout(6), timeout(4)
- Macros: `2`, `6`, `4`

**Output**

```text
1
7
3
5
2
6
4
```

---

### Q5 — `async/await` basics

```js
async function f() {
  console.log(1);
  await Promise.resolve();
  console.log(2);
}

console.log(3);
f();
console.log(4);
```

**Solve**

- Sync: `3`
- Call `f()`: sync part logs `1`, then awaits → schedules continuation
- Sync continues: `4`
- Microtask: `2`

**Output**

```text
3
1
4
2
```

---

### Q6 — `await` vs `then` vs timeout

```js
console.log('start');

setTimeout(() => console.log('timeout'), 0);

Promise.resolve().then(() => console.log('promise'));

(async () => {
  console.log('async start');
  await null;
  console.log('async after await');
})();

console.log('end');
```

**Solve**

- Sync: `start`, schedule timeout, schedule promise then, enter IIFE → `async start`, schedule await continuation, `end`
- Microtasks: `promise`, then `async after await` (order depends on schedule order; here promise then was scheduled first)
- Macrotask: `timeout`

More precise scheduling order:

1. `Promise.resolve().then(...)` queues microtask A
2. `await null` queues microtask B

So:

**Output**

```text
start
async start
end
promise
async after await
timeout
```

---

### Q7 — Promise executor traps

```js
console.log('1');

const p = new Promise((resolve) => {
  console.log('2');
  resolve();
  console.log('3');
});

p.then(() => console.log('4'));

console.log('5');
```

**Output**

```text
1
2
3
5
4
```

Why: executor is sync. `.then` is async microtask.

---

### Q8 — Reject / catch timing

```js
console.log('A');

Promise.reject('err')
  .catch((e) => {
    console.log('B', e);
    return 'ok';
  })
  .then((v) => console.log('C', v));

console.log('D');
```

**Output**

```text
A
D
B err
C ok
```

Both `.catch` and following `.then` are microtasks. `.then` waits for `.catch` to finish and return.

---

### Q9 — Mixing `queueMicrotask`

```js
console.log(1);

queueMicrotask(() => console.log(2));

Promise.resolve().then(() => console.log(3));

queueMicrotask(() => console.log(4));

console.log(5);
```

**Output**

```text
1
5
2
3
4
```

`queueMicrotask` and Promise microtasks share the same microtask queue (FIFO by schedule order).

---

### Q10 — Infinite microtask starvation concept

```js
let i = 0;

function bomb() {
  Promise.resolve().then(bomb);
  console.log(i++);
}

setTimeout(() => console.log('timeout never?'), 0);
bomb();
```

What happens conceptually:

- Sync starts `bomb`
- Every microtask schedules another microtask
- Microtask queue never empties
- `setTimeout` / rendering can be starved

Interview answer:

> Unbounded microtask chaining can block macrotasks and UI painting because the event loop drains microtasks completely before taking the next task.

---

## 8. Harder Tricky Output Questions

### Q11 — Two timeouts and promise chain

```js
setTimeout(() => {
  console.log(1);
  Promise.resolve().then(() => console.log(2));
}, 0);

setTimeout(() => {
  console.log(3);
}, 0);

Promise.resolve()
  .then(() => console.log(4))
  .then(() => console.log(5));
```

**Output**

```text
4
5
1
2
3
```

---

### Q12 — `async` function return value

```js
async function foo() {
  console.log('foo');
  return 'done';
}

console.log('start');

foo().then((v) => console.log(v));

console.log('end');
```

**Solve**

- Sync: `start`
- Call `foo`: sync logs `foo`, returns a resolved Promise
- Schedule `.then`
- Sync: `end`
- Microtask: `done`

**Output**

```text
start
foo
end
done
```

---

### Q13 — Nested async/await

```js
async function a() {
  console.log(1);
  await b();
  console.log(2);
}

async function b() {
  console.log(3);
  await Promise.resolve();
  console.log(4);
}

console.log(5);
a();
console.log(6);
```

**Solve carefully**

1. Sync: `5`
2. Call `a()`:
   - log `1`
   - call `b()`
   - in `b`: log `3`
   - `await Promise.resolve()` → pause `b`, schedule continuation of `b`
   - `await b()` in `a` waits for `b`'s promise
3. Sync continues: `6`
4. Microtasks:
   - resume `b` → log `4` → `b` resolves
   - resume `a` → log `2`

**Output**

```text
5
1
3
6
4
2
```

---

### Q14 — Promise inside timeout vs timeout inside promise

```js
Promise.resolve().then(() => {
  console.log('p1');
  setTimeout(() => console.log('t1'), 0);
});

setTimeout(() => {
  console.log('t2');
  Promise.resolve().then(() => console.log('p2'));
}, 0);
```

**Solve**

1. Sync schedules microtask and macrotask(t2)
2. Microtask: `p1`, schedules macrotask(t1)
3. Macrotask t2: `t2`, schedules microtask p2
4. Drain microtasks: `p2`
5. Macrotask t1: `t1`

**Output**

```text
p1
t2
p2
t1
```

---

### Q15 — `finally` ordering

```js
Promise.resolve('ok')
  .then((v) => {
    console.log('then1', v);
    return 'next';
  })
  .finally(() => {
    console.log('finally');
  })
  .then((v) => {
    console.log('then2', v);
  });
```

**Output**

```text
then1 ok
finally
then2 next
```

`finally` is also a microtask stage in the chain. It does not change the fulfilled value unless it throws / returns a rejected promise.

---

### Q16 — Error in microtask does not stop later macrotask scheduling

```js
setTimeout(() => console.log('timeout'), 0);

Promise.resolve().then(() => {
  console.log('before throw');
  throw new Error('boom');
});

Promise.resolve().then(() => console.log('other microtask'));
```

In browsers / Node, one rejected microtask becomes an unhandled rejection (if not caught), but the other already-queued microtask and later macrotask still run.

**Typical output**

```text
before throw
other microtask
timeout
```

plus an unhandled rejection warning/error for `boom`.

---

### Q17 — `setTimeout` delay ordering

```js
setTimeout(() => console.log('A'), 100);
setTimeout(() => console.log('B'), 0);
setTimeout(() => console.log('C'), 50);
```

Assuming no heavy blocking:

**Output**

```text
B
C
A
```

Same delay = schedule order (FIFO among equal-due timers).

---

### Q18 — Blocking sync delays timers

```js
console.log('start');

setTimeout(() => console.log('timeout'), 0);

const end = Date.now() + 1000;
while (Date.now() < end) {} // block ~1s

console.log('end');
```

**Output**

```text
start
end
timeout
```

Even with delay `0`, timeout cannot run until the blocking sync loop finishes. This is why heavy sync freezes UI.

---

### Q19 — `requestAnimationFrame` awareness

```js
console.log('1');

setTimeout(() => console.log('timeout'), 0);

Promise.resolve().then(() => console.log('promise'));

requestAnimationFrame(() => console.log('raf'));

console.log('2');
```

Typical browser order (approximate, depends on frame timing):

```text
1
2
promise
timeout   // or raf around here depending on browser/frame
raf
```

Interview-safe statement:

> `requestAnimationFrame` is tied to the rendering pipeline. It is not a Promise microtask. Exact interleaving with `setTimeout(0)` can vary, so do not treat rAF as a microtask.

For most output drills, interviewers focus on Promise vs `setTimeout`.

---

### Q20 — Chained then vs nested then

```js
Promise.resolve()
  .then(() => {
    console.log(1);
    return Promise.resolve();
  })
  .then(() => console.log(2));

Promise.resolve()
  .then(() => {
    console.log(3);
    Promise.resolve().then(() => console.log(4));
  })
  .then(() => console.log(5));
```

This one is tricky because returning a Promise waits an extra microtask tick.

Common modern engine output:

```text
1
3
5
4
2
```

Why (high level):

- First chain's second `then` waits for the returned Promise settlement (extra microtask hop)
- Second chain's inner `then(4)` is just separately queued
- Second chain's outer next `then(5)` does **not** wait for the inner nested promise because it was not returned

Interview tip:

> If you `return` a Promise from `then`, the next `then` waits for it. If you only create a Promise without returning it, the outer chain continues independently.

---

## 9. Node.js Event Loop: I/O, `setImmediate`, Timers, `nextTick`

Frontend interviews mostly use the browser model. But many companies also ask Node questions like:

- What is the order of `setTimeout`, `setImmediate`, and I/O?
- Why is order different inside `fs.readFile`?
- Where does `process.nextTick` fit?

This section gives you a complete answer.

---

### 9.1 Important: Browser vs Node

| Topic | Browser | Node.js |
|---|---|---|
| Queues | Microtask + Macrotask | Multiple **phases** + `nextTick` + Promise microtasks |
| `setImmediate` | Not available (old IE only) | Yes — runs in **check** phase |
| I/O callbacks | Network/DOM style tasks | Mostly run in **poll** phase |
| Highest deferred priority | Microtasks | `process.nextTick`, then Promise microtasks |
| Rendering | Yes | No DOM rendering |

Spoken interview line:

> In the browser I reason with sync → microtasks → one macrotask. In Node, macrotasks are split into phases like timers, poll, and check. `setImmediate` is a check-phase callback, and I/O callbacks usually run in poll.

---

### 9.2 Node Event Loop Phases (Memorize This Procedure)

Official Node order (simplified):

```text
   ┌───────────────────────────┐
┌─>│           timers          │  setTimeout / setInterval
│  └─────────────┬─────────────┘
│                ▼
│  ┌───────────────────────────┐
│  │     pending callbacks     │  some system/TCP error callbacks
│  └─────────────┬─────────────┘
│                ▼
│  ┌───────────────────────────┐
│  │       idle, prepare       │  internal only
│  └─────────────┬─────────────┘
│                ▼
│  ┌───────────────────────────┐
│  │           poll            │  I/O callbacks (fs, network, etc.)
│  └─────────────┬─────────────┘
│                ▼
│  ┌───────────────────────────┐
│  │           check           │  setImmediate callbacks
│  └─────────────┬─────────────┘
│                ▼
│  ┌───────────────────────────┐
│  │      close callbacks      │  e.g. socket.on('close')
│  └─────────────┬─────────────┘
│                │
└────────────────┘
```

#### What each important phase means

1. **timers**
   - Runs `setTimeout` / `setInterval` callbacks whose delay has expired.
   - Delay is a *minimum*, not a guarantee.

2. **pending callbacks**
   - Some deferred system callbacks (less common in interview snippets).

3. **poll**
   - Waits for / runs almost all I/O callbacks.
   - Examples: `fs.readFile`, many network/socket readable events.
   - This is the phase interviewers mean by “I/O callback”.

4. **check**
   - Runs `setImmediate()` callbacks.
   - Designed to run right after poll completes.

5. **close callbacks**
   - Close-related callbacks like `socket.on('close')`.

#### Where `process.nextTick` and Promises fit

They are **not shown as a phase**, because they run *between* phases / after the current JS callback finishes:

```text
After current JS callback / operation finishes:
1) drain process.nextTick queue completely
2) drain Promise / queueMicrotask queue completely
3) then move to the next event-loop phase work
```

So the practical priority is:

```text
Sync code in current callback
  → process.nextTick (ALL)
  → Promise microtasks (ALL)
  → next phase callbacks (timers / poll / check / ...)
```

---

### 9.3 Preference Order Cheat Sheet (Node)

Use this ranking in interviews:

```text
1. Synchronous code
2. process.nextTick
3. Promise.then / queueMicrotask
4. setTimeout / setInterval          (timers phase)
5. I/O callbacks                     (poll phase)
6. setImmediate                      (check phase)
7. close callbacks
```

But remember the key nuance:

> Phase order is not “global forever”. It depends on **which phase you are currently in** when you schedule the next callbacks.

That is why:

- Top-level `setTimeout(0)` vs `setImmediate` can race
- Inside an I/O callback, `setImmediate` is reliably before `setTimeout(0)`

---

### 9.4 The Most Asked Rule: `setTimeout` vs `setImmediate`

#### Case A — Top level (main module): NON-DETERMINISTIC

```js
setTimeout(() => console.log('timeout'), 0);
setImmediate(() => console.log('immediate'));
```

Possible outputs:

```text
timeout
immediate
```

or

```text
immediate
timeout
```

**Why?**

At startup, both are scheduled before the loop is fully in a stable I/O cycle. Whether the timer threshold is already considered expired when timers phase runs can depend on process performance / timing. Official Node docs call this non-deterministic.

**Interview answer:**

> Outside an I/O cycle, `setTimeout(0)` and `setImmediate` can race. I would not guarantee either order.

#### Case B — Inside I/O callback: `setImmediate` ALWAYS first

```js
const fs = require('fs');

fs.readFile(__filename, () => {
  setTimeout(() => console.log('timeout'), 0);
  setImmediate(() => console.log('immediate'));
});
```

**Output (always)**

```text
immediate
timeout
```

**Procedure / why**

1. `fs.readFile` completes → its callback runs in the **poll** phase.
2. Inside that callback we schedule:
   - a timer (`setTimeout`) for timers phase
   - an immediate (`setImmediate`) for check phase
3. After poll finishes, event loop goes to **check**.
4. `setImmediate` runs now → logs `immediate`.
5. Later, loop reaches **timers** → logs `timeout`.

This is the #1 Node event-loop interview fact.

---

### 9.5 Full Procedure To Solve Node Output Questions

When you see Node code, do this:

```text
Step 1: Run all sync code in the current script/callback.
Step 2: Drain process.nextTick completely.
Step 3: Drain Promise microtasks completely.
Step 4: Ask: which phase am I in / coming from?
         - timers? poll? check?
Step 5: Move to the next relevant phase and run that queue.
Step 6: After each callback, repeat nextTick → Promises.
```

Helpful phase transition memory:

```text
If currently inside I/O (poll) callback:
  next important phase is check → setImmediate
  then later timers → setTimeout
```

---

### 9.6 Deep Examples With Explanation

### Q21 — `process.nextTick` vs Promise vs timeout

```js
setTimeout(() => console.log('timeout'), 0);

Promise.resolve().then(() => console.log('promise'));

process.nextTick(() => console.log('nextTick'));

console.log('sync');
```

**Walkthrough**

1. Sync schedules timeout, promise, nextTick, then logs `sync`
2. Drain nextTick → `nextTick`
3. Drain Promise microtask → `promise`
4. Timers phase → `timeout`

**Output**

```text
sync
nextTick
promise
timeout
```

**What to say**

> `nextTick` is higher priority than Promises. Both run before timers.

---

### Q22 — I/O + `setImmediate` + `setTimeout` (classic)

```js
const fs = require('fs');

fs.readFile(__filename, () => {
  setTimeout(() => console.log('timeout'), 0);
  setImmediate(() => console.log('immediate'));
});
```

**Output**

```text
immediate
timeout
```

**What to say**

> The I/O callback is in poll. After poll comes check, so `setImmediate` wins over `setTimeout(0)` when both are scheduled inside that I/O callback.

---

### Q23 — Add `nextTick` and Promise inside I/O

```js
const fs = require('fs');

fs.readFile(__filename, () => {
  console.log('io');

  setTimeout(() => console.log('timeout'), 0);

  setImmediate(() => console.log('immediate'));

  process.nextTick(() => console.log('nextTick'));

  Promise.resolve().then(() => console.log('promise'));
});
```

**Walkthrough**

1. Poll runs I/O callback → `io`
2. Schedules timeout, immediate, nextTick, promise
3. Before leaving this callback’s “after work”:
   - nextTick → `nextTick`
   - promise → `promise`
4. Check phase → `immediate`
5. Timers phase → `timeout`

**Output**

```text
io
nextTick
promise
immediate
timeout
```

This is an excellent “full ranking” interview answer example.

---

### Q24 — Nested `setImmediate` and `nextTick`

```js
setImmediate(() => {
  console.log('immediate1');

  setImmediate(() => console.log('immediate2'));

  process.nextTick(() => console.log('nextTick'));

  Promise.resolve().then(() => console.log('promise'));
});
```

**Walkthrough**

1. Check phase runs `immediate1`
2. It schedules another immediate, a nextTick, and a promise
3. After current callback:
   - `nextTick`
   - `promise`
4. Next check-phase turn / remaining immediates → `immediate2`

**Output**

```text
immediate1
nextTick
promise
immediate2
```

**Key point**

> Even inside `setImmediate`, `nextTick` and Promises still jump ahead of the next immediate.

---

### Q25 — Top-level race vs I/O certainty (compare both)

```js
// File: race.js
setTimeout(() => console.log('timeout'), 0);
setImmediate(() => console.log('immediate'));
```

```js
// File: io.js
const fs = require('fs');

fs.readFile(__filename, () => {
  setTimeout(() => console.log('timeout'), 0);
  setImmediate(() => console.log('immediate'));
});
```

**Interview comparison table**

| Location | Order |
|---|---|
| Top-level main script | Unpredictable / race |
| Inside I/O callback (`fs.readFile`, etc.) | Always `immediate` then `timeout` |

---

### Q26 — Multiple I/O-related callbacks with timers

```js
const fs = require('fs');

console.log('start');

setTimeout(() => console.log('timeout'), 0);
setImmediate(() => console.log('immediate'));

fs.readFile(__filename, () => {
  console.log('io1');
});

fs.readFile(__filename, () => {
  console.log('io2');
});

console.log('end');
```

**What is guaranteed**

```text
start
end
```

Then async order can vary more:

- `timeout` vs `immediate` at top level may race
- `io1` / `io2` order depends on which read finishes/queued first
- Once in poll, I/O callbacks run there

**Safe interview answer**

> Sync logs first: `start`, `end`. After that, top-level timer/immediate can race, and I/O callbacks appear when poll executes completed reads. I would not hardcode a single full order unless the snippet schedules everything inside one known phase.

Interviewers often prefer this honesty over a fake exact order.

---

### Q27 — Why I/O can delay a timer

```js
const fs = require('fs');

const start = Date.now();

setTimeout(() => {
  console.log('timer fired after', Date.now() - start, 'ms');
}, 100);

fs.readFile(__filename, () => {
  const blockStart = Date.now();
  while (Date.now() - blockStart < 50) {} // block 50ms inside I/O callback
  console.log('io done');
});
```

**Idea**

- Timer is scheduled for 100ms
- I/O may complete earlier and run in poll
- If the I/O callback itself is slow, it can push when the timer actually runs
- Timer delay is minimum threshold, not exact fire time

**What to say**

> `setTimeout` does not mean exact timing. If poll is busy with I/O callbacks, timers can run late.

---

### Q28 — `setImmediate` vs `process.nextTick` naming trap

```js
process.nextTick(() => console.log('nextTick'));
setImmediate(() => console.log('immediate'));
```

**Output**

```text
nextTick
immediate
```

**Interview explanation (official Node philosophy)**

> Names are historically confusing. `process.nextTick` runs sooner than `setImmediate`. Node docs even say the names feel reversed. Prefer `setImmediate` when you want to defer to a later phase without starving the loop.

Why `nextTick` can be dangerous:

```js
function starve() {
  process.nextTick(starve);
}
starve();
// Event loop may never reach poll/I/O
```

Recursive `nextTick` can starve I/O because nextTick is drained before moving phases.

---

### Q29 — Complete “kitchen sink” Node ordering

```js
const fs = require('fs');

console.log('sync1');

setTimeout(() => console.log('timeout'), 0);
setImmediate(() => console.log('immediate-top'));

process.nextTick(() => console.log('nextTick1'));
Promise.resolve().then(() => console.log('promise1'));

fs.readFile(__filename, () => {
  console.log('io');

  process.nextTick(() => console.log('nextTick2'));
  Promise.resolve().then(() => console.log('promise2'));

  setTimeout(() => console.log('timeout-in-io'), 0);
  setImmediate(() => console.log('immediate-in-io'));
});

console.log('sync2');
```

**Guaranteed beginning**

```text
sync1
sync2
nextTick1
promise1
```

Then top-level `timeout` vs `immediate-top` may race.

Then when I/O callback runs:

```text
io
nextTick2
promise2
immediate-in-io
timeout-in-io
```

**Best way to answer in interview**

Split your answer into:

1. What is guaranteed
2. What can race
3. What becomes deterministic inside I/O

That shows senior understanding.

---

### 9.7 One Diagram To Remember For I/O Questions

```text
Current I/O callback (POLL phase)
─────────────────────────────────
console.log('io')                 ← sync in poll callback
setTimeout(...)                   ← schedule for TIMERS
setImmediate(...)                 ← schedule for CHECK
process.nextTick(...)             ← schedule nextTick queue
Promise.then(...)                 ← schedule microtask queue

After this callback finishes:
  nextTick  →  Promise microtasks

Then event loop continues:
  CHECK phase  → setImmediate runs
  ...
  TIMERS phase → setTimeout runs
```

So inside I/O:

```text
io → nextTick → promise → immediate → timeout
```

---

### 9.8 Perfect Spoken Answer For Node I/O Questions

> Node’s event loop has phases: timers, pending callbacks, poll, check, and close. I/O callbacks mostly run in poll. `setImmediate` runs in check, which comes right after poll. That is why if I schedule both `setTimeout(0)` and `setImmediate` inside an `fs.readFile` callback, `setImmediate` always runs first. At the top level of a script, those two can race. Separately, after every callback Node drains `process.nextTick` and then Promise microtasks before moving on, so `nextTick` has higher priority than Promises, and both beat timers and immediates scheduled for later phases.

---

### 9.9 Quick Decision Table

| Question | Answer |
|---|---|
| Does browser have `setImmediate`? | No (ignore for browser snippets) |
| Where do I/O callbacks run? | Mostly **poll** |
| Where does `setImmediate` run? | **check** (after poll) |
| Where does `setTimeout` run? | **timers** |
| Top-level timeout vs immediate? | Race / non-deterministic |
| Same pair inside I/O? | Always immediate → timeout |
| `nextTick` vs Promise? | nextTick first |
| `nextTick` vs setImmediate? | nextTick first |
| Can nextTick starve I/O? | Yes, if used recursively |

---

## 10. Angular / Frontend Interview Angle

For an Angular frontend role, connect event loop knowledge to real UI:

1. Heavy sync work in a click handler blocks change detection and rendering.
2. Promise microtasks can run before the browser paints.
3. `setTimeout` is often used to defer work to the next macrotask.
4. RxJS scheduling (`queueScheduler`, `asyncScheduler`) maps roughly to sync/micro/macro ideas.
5. Zone.js (older Angular) patched async APIs to trigger change detection; understanding tasks/microtasks helps explain why CD runs after timers/promises.

Good spoken answer:

> JavaScript finishes the current call stack, then drains microtasks like Promise callbacks, then takes one macrotask such as a timer or event. That is why Promise handlers run before `setTimeout(0)`, and why a long sync loop freezes the UI.

---

## 11. One-Page Cheat Sheet (Memorize Before Interview)

```text
ORDER (Browser):
1) Sync code
2) All microtasks
3) Maybe render
4) One macrotask
5) Repeat from (2)

MICROTASKS:
Promise.then/catch/finally
queueMicrotask
await continuation
MutationObserver

MACROTASKS:
setTimeout / setInterval
UI events
MessageChannel
I/O

ORDER (Node):
1) Sync in current callback
2) process.nextTick (ALL)
3) Promise / queueMicrotask (ALL)
4) timers      -> setTimeout / setInterval
5) poll        -> I/O callbacks (fs, network)
6) check       -> setImmediate
7) close callbacks

NODE SPECIAL:
Top-level setTimeout(0) vs setImmediate = RACE
Inside I/O callback: setImmediate ALWAYS before setTimeout(0)
Inside I/O with all queues:
  io -> nextTick -> promise -> immediate -> timeout

SPECIAL:
Promise executor = SYNC
await splits function (after await = microtask)
microtasks inside a timeout run before the next timeout
returning a Promise from then waits; not returning does not
process.nextTick (Node) > Promise microtasks
recursive nextTick can starve I/O
```

### Solve checklist

```text
[ ] Mark S / μ / M
[ ] Run all sync logs
[ ] Drain microtasks fully
[ ] Run one macrotask
[ ] Drain microtasks again
[ ] Continue until done
```

---

## 12. Practice Set (Try Before Looking)

### Practice 1

```js
console.log('A');

setTimeout(() => console.log('B'), 0);

Promise.resolve()
  .then(() => {
    console.log('C');
    return Promise.resolve('D');
  })
  .then((v) => console.log(v));

console.log('E');
```

<details>
<summary>Answer</summary>

```text
A
E
C
D
B
```
</details>

### Practice 2

```js
setTimeout(() => console.log(1), 0);

queueMicrotask(() => {
  console.log(2);
  queueMicrotask(() => console.log(3));
});

Promise.resolve().then(() => console.log(4));
```

<details>
<summary>Answer</summary>

```text
2
4
3
1
```
</details>

### Practice 3

```js
async function x() {
  console.log('x1');
  await y();
  console.log('x2');
}

async function y() {
  console.log('y1');
}

console.log('start');
x();
console.log('end');
```

<details>
<summary>Answer</summary>

```text
start
x1
y1
end
x2
```

Why: `y` is async and returns a Promise. Even if `y` has no `await`, awaiting `y()` still defers `x2` to a microtask.
</details>

### Practice 4

```js
console.log(1);

setTimeout(() => {
  console.log(2);
  Promise.resolve().then(() => {
    console.log(3);
    setTimeout(() => console.log(4), 0);
  });
}, 0);

Promise.resolve().then(() => {
  console.log(5);
  setTimeout(() => console.log(6), 0);
});

setTimeout(() => console.log(7), 0);

console.log(8);
```

<details>
<summary>Answer</summary>

```text
1
8
5
2
3
7
6
4
```

Walkthrough:

1. Sync: `1`, `8`
2. Micro: `5` (schedules timeout 6)
3. Timeout(2): `2`, queues micro `3`
4. Micro: `3` (schedules timeout 4)
5. Timeout(7): `7`
6. Timeout(6): `6`
7. Timeout(4): `4`
</details>

### Practice 5

```js
Promise.resolve()
  .then(() => {
    console.log(1);
    Promise.resolve().then(() => console.log(2));
  })
  .then(() => console.log(3));

queueMicrotask(() => console.log(4));
```

<details>
<summary>Answer</summary>

Common output:

```text
1
4
2
3
```

or depending on exact scheduling of the chained `.then(3)` relative to nested microtasks, engines keep FIFO carefully:

More precise modern behavior often:

```text
1
4
2
3
```

Reasoning style to say in interview:

> First scheduled microtasks run in order. Nested microtasks are appended. Chained `.then` is scheduled when previous handler finishes.
</details>

---

## 13. Common Mistakes That Lose Marks

1. Saying Promises are multi-threaded
2. Thinking `setTimeout(0)` runs immediately
3. Forgetting microtasks drain after every macrotask
4. Treating `await` continuation as sync
5. Thinking Promise executor is async
6. Assuming two timeouts and one promise "race randomly"
7. Ignoring that nested microtasks still run before the next timeout
8. Forgetting `return promise` vs nested non-returned promise

---

## 14. Perfect spoken answers

### 60–75s — full “explain the event loop” (use this)

> JavaScript is single-threaded: the **engine** (like V8) has one **call stack**, so only one piece of JS runs at a time. Async work isn’t done by the engine alone — the **browser host** provides Web APIs for timers, network, and DOM. When you call `setTimeout` or `fetch`, the host does that work outside JS; when it finishes, it **queues a callback as a task**. Promises schedule **microtasks** closer to the engine. The **event loop** — also part of the host — keeps checking: when the stack is empty, drain **all microtasks**, maybe paint, then run **one macrotask**, then microtasks again. So sync runs first, then all Promise/`await` continuations, then a timer — which is why `Promise.then` beats `setTimeout(0)`.

### 45s — shorter version

> JS has one call stack. The browser runs timers and I/O and puts callbacks on task queues; Promises use the microtask queue. After sync code, the event loop drains every microtask, then one macrotask, and repeats. That’s why microtasks run before `setTimeout(fn, 0)`.

### 20s — who queues what

> The **browser** queues timer/network/DOM callbacks. **Promises** queue microtasks. The **event loop** decides the order: sync → all microtasks → one task.

---

## 15. Quick Reference Diagram

```text
Current running script (macrotask)
        │
        ▼
   sync code finishes
        │
        ▼
 ┌──────────────────┐
 │ drain microtasks │◀── if microtask adds microtask, keep going
 └─────────┬────────┘
           │
           ▼
     render opportunity
           │
           ▼
   take next macrotask
           │
           └────────── loop again
```

---

## 16. What To Practice Daily (15 minutes)

1. Predict 3 mixed Promise/`setTimeout` snippets
2. Predict 2 `async/await` snippets
3. Explain one Node difference (`nextTick`)
4. Explain one UI consequence (blocking / starvation)

If you can consistently get Q2, Q4, Q13, and Q14 right, you are interview-ready for event-loop output questions.

---

## Interview drill — “Resolved Promises still block UI?”

> Promises are async vs the current stack, but `.then` runs as **microtasks on the main thread**. A long chain of already-resolved Promises can drain forever and starve rendering/macrotasks — UI freezes without any network wait.

See also: master list `TRICKY_10_FRONTEND_QUESTIONS.md` Q1.

---

## Sources / further reading

- [javascript.info — Event loop: microtasks and macrotasks](https://javascript.info/event-loop)
- [MDN — Using microtasks in JavaScript with `queueMicrotask()`](https://developer.mozilla.org/en-US/docs/Web/API/HTML_DOM_API/Microtask_guide)
- Node docs / guides on event loop phases, `process.nextTick`, and `setImmediate`
