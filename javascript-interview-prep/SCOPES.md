# JavaScript Scopes — Interview Ready Guide

Scope = **where a variable can be accessed**.  
Interviewers pair this with hoisting, TDZ, `var` vs `let`/`const`, closures, and output questions.

Pairs with [FUNCTIONS.md](./FUNCTIONS.md) (closures / `this`) and [EVENT_LOOP.md](./EVENT_LOOP.md) (when code runs — different topic).

---

## Interview answers (say these first)

### 45–60s — “Explain scope in JavaScript”

> Scope decides where a variable is visible. JavaScript uses **lexical (static) scope** — visibility is determined by where you write the code, not where you call it. There are **global**, **function**, and **block** scopes. `var` is function-scoped and hoisted; `let` and `const` are block-scoped and live in the Temporal Dead Zone until initialized. Nested functions look up identifiers through the **scope chain**. A **closure** is when an inner function keeps access to its outer lexical environment after the outer function has returned. Modules add another scope boundary with `import`/`export`.

### 20s — `var` vs `let`/`const`

> `var` is function-scoped and hoisted as `undefined`. `let`/`const` are block-scoped, not usable before declaration (TDZ). Prefer `const` by default, `let` when reassigning, avoid `var` in modern code.

---

## 1. What is scope?

```js
const x = 1; // global (script / module top-level)

function outer() {
  const y = 2; // function scope

  if (true) {
    const z = 3; // block scope
    console.log(x, y, z); // 1 2 3 — can see outer scopes
  }

  // console.log(z); // ReferenceError — z not in this scope
}
```

**One-liner:**

> Scope is the set of rules that control variable visibility and lifetime.

---

## 2. Lexical scope (the #1 interview word)

**Lexical / static scope** = determined by **source nesting**, not call site.

```js
const name = 'global';

function show() {
  console.log(name); // looks up where show was *defined*
}

function wrapper() {
  const name = 'wrapper';
  show(); // still prints 'global' — not 'wrapper'
}

wrapper();
```

Contrast with **dynamic scope** (JS does **not** use this for variables): lookup by call stack. JS uses lexical scope (except historically weird `with` / `eval` — avoid).

**`this` is different:** `this` is usually call-site based for normal functions; arrows are lexical `this`. Don’t mix “lexical scope of variables” with “`this` binding” unless asked.

---

## 3. Types of scope

| Scope | Created by | Visible in |
|---|---|---|
| **Global** | Top-level script / `var` on global object (sloppy) | Everywhere (unless shadowed) |
| **Function** | `function`, method, etc. | Inside that function body |
| **Block** | `{ }`, `if`, `for`, `while`, `switch`, `try/catch` | Inside that block (`let`/`const`/`class`) |
| **Module** | ES module file | That file; exports opt-in to outside |

```js
// Function scope (var leaks out of if)
function f() {
  if (true) {
    var a = 1;
  }
  console.log(a); // 1 — var ignores block
}

// Block scope (let stays inside)
function g() {
  if (true) {
    let b = 1;
  }
  // console.log(b); // ReferenceError
}
```

---

## 4. `var` vs `let` vs `const` (scope angle)

| | `var` | `let` | `const` |
|---|---|---|---|
| Scope | **Function** (or global) | **Block** | **Block** |
| Hoisting | Yes → `undefined` | Yes, but **TDZ** | Yes, but **TDZ** |
| Redeclare same scope | Allowed | SyntaxError | SyntaxError |
| Reassign | Yes | Yes | No (binding fixed; object contents can mutate) |
| Global creates `window` prop (browser) | Often yes (non-module) | No | No |

```js
const user = { name: 'Ada' };
user.name = 'Grace'; // OK — mutate object
// user = {}; // TypeError — rebind const
```

**Interview default:**

> Prefer `const`, use `let` when you must reassign, don’t use `var` unless maintaining legacy code.

---

## 5. Scope chain (nested lookup)

When you reference `x`, engine looks:

```text
1. Current local scope
2. Outer enclosing scope
3. … up to global / module
4. Not found → ReferenceError
```

```js
const a = 'global';

function one() {
  const b = 'one';
  function two() {
    const c = 'two';
    console.log(a, b, c); // global one two
  }
  two();
}
one();
```

Inner can see outer. **Outer cannot see inner.**

```js
function outer() {
  const secret = 42;
  function inner() {
    return secret;
  }
  return inner;
}
const fn = outer();
console.log(fn()); // 42 — closure keeps secret alive
// console.log(secret); // ReferenceError
```

---

## 6. Hoisting + Temporal Dead Zone (TDZ)

### Hoisting (interview meaning)

Declarations are processed before code runs in that scope — but **initialization** differs.

```js
console.log(a); // undefined
var a = 1;

console.log(b); // ReferenceError (TDZ)
let b = 2;
```

| Binding | Before line runs |
|---|---|
| `var a` | Exists as `undefined` |
| `let` / `const` | Exist in TDZ — **cannot access** |
| `function declaration` | Fully hoisted (callable) |
| `class` | TDZ like `let` |

```js
hello(); // works
function hello() {
  console.log('hi');
}

Foo(); // ReferenceError TDZ
class Foo {}
```

### TDZ example interviewers love

```js
const x = 1;
{
  // console.log(x); // ReferenceError — inner x is in TDZ, shadows outer
  const x = 2;
  console.log(x); // 2
}
```

Shadowing + TDZ: inner `x` “exists” in the block from the start of the block, so outer `x` is not used before the `const` line.

---

## 7. Shadowing

Inner binding **hides** outer same name.

```js
let count = 0;

function bump() {
  let count = 10; // shadows global
  count++;
  console.log(count); // 11
}

bump();
console.log(count); // 0
```

**Illegal:** `let` then `let` same name in **same** scope.  
**OK:** same name in nested scopes (shadowing).

---

## 8. Closures = scope that outlives the call

A **closure** is a function plus its **remembered lexical environment**.

```js
function makeCounter() {
  let n = 0; // closed over
  return function () {
    n += 1;
    return n;
  };
}

const c1 = makeCounter();
const c2 = makeCounter();
console.log(c1(), c1()); // 1 2
console.log(c2());       // 1 — separate environment
```

### Classic loop trap (`var` vs `let`)

```js
for (var i = 0; i < 3; i++) {
  setTimeout(() => console.log(i), 0);
}
// 3 3 3 — one function-scoped i

for (let j = 0; j < 3; j++) {
  setTimeout(() => console.log(j), 0);
}
// 0 1 2 — new block binding each iteration
```

**Spoken:**

> Closures capture the **variable binding**, not a snapshot of the value (unless you copy a primitive into a new binding).

See also: stale closure note in [TRICKY_10_FRONTEND_QUESTIONS.md](./TRICKY_10_FRONTEND_QUESTIONS.md) / [FUNCTIONS.md](./FUNCTIONS.md).

---

## 9. Module scope (modern apps)

ES modules have **their own top-level scope** — top-level `const` does **not** become `window.x`.

```js
// math.js
export const PI = 3.14;

// app.js
import { PI } from './math.js';
// other files cannot see non-exported bindings
```

| Script (classic) | Module |
|---|---|
| Top-level `var` may attach to global object | Top-level is module-scoped |
| Shared global namespace risk | Explicit exports |

Angular/React apps are module-scoped by bundlers — good interview mention.

---

## 10. Strict mode & accidental globals

```js
function bad() {
  // 'use strict';
  leaked = 1; // creates global in sloppy mode — bug
}
```

Strict mode → `ReferenceError` instead of silent global. Modules are strict by default.

---

## 11. `catch` / function params are scoped

```js
try {
  throw new Error('x');
} catch (err) {
  // err scoped to catch block
}
// console.log(err); // ReferenceError

function f(a, b = a) {
  // params are in function scope (special rules for defaults)
}
```

---

## 12. Output drills (practice)

### Drill A

```js
var x = 1;
function foo() {
  console.log(x);
  var x = 2;
}
foo();
```

**Answer:** `undefined` — inner `var x` is function-scoped and hoisted; shadows outer; value still `undefined` at log.

### Drill B

```js
let x = 1;
function foo() {
  console.log(x);
  let x = 2;
}
foo();
```

**Answer:** `ReferenceError` — TDZ for inner `x`.

### Drill C

```js
function outer() {
  let a = 1;
  return () => a++;
}
const f = outer();
console.log(f(), f());
```

**Answer:** `1` then `2`.

### Drill D

```js
const funcs = [];
for (var i = 0; i < 3; i++) {
  funcs.push(() => i);
}
console.log(funcs.map((f) => f()));
```

**Answer:** `[3, 3, 3]`.

### Drill E — shadow + block

```js
let a = 'outer';
{
  let a = 'inner';
  console.log(a);
}
console.log(a);
```

**Answer:** `inner` then `outer`.

---

## 13. Interview Q bank

**Q1. What is scope?**  
> Rules for where bindings are visible.

**Q2. Lexical vs dynamic scope?**  
> JS is lexical: based on where code is written. Dynamic would follow call stack (JS doesn’t for variables).

**Q3. Function vs block scope?**  
> Function: whole function body (`var`). Block: `{ }` with `let`/`const`.

**Q4. What is the scope chain?**  
> Nested lookup from inner → outer → global/module until found or ReferenceError.

**Q5. What is hoisting?**  
> Declarations are processed before execution in that scope. `var` initializes `undefined`; `let`/`const` stay in TDZ.

**Q6. What is TDZ?**  
> Time from entering scope until `let`/`const`/`class` is initialized — access throws ReferenceError.

**Q7. Why prefer `let`/`const` over `var`?**  
> Block scoping, no accidental outer leakage, TDZ catches bugs, no `var` loop closure trap as often.

**Q8. What is a closure?**  
> Function that remembers its outer lexical environment.

**Q9. Does closure copy values?**  
> No — it closes over the **binding**. Updates are visible unless you created a new binding.

**Q10. Module vs global scope?**  
> Module top-level is private to the file unless exported; avoids polluting `window`.

**Q11. Can outer function access inner variables?**  
> No.

**Q12. Shadowing?**  
> Inner same-name binding hides outer one in that scope.

**Q13. `const` means immutable object?**  
> No — immutable **binding**. Object properties can still change.

**Q14. Are arrow functions about scope?**  
> Arrows inherit lexical **`this`** (and arguments). Variable scope is still normal lexical scope for both arrow and function.

**Q15. IIFE purpose historically?**  
> Create a private function scope before modules / block `let` existed.

```js
(function () {
  var private = 1;
})();
```

---

## 14. Frontend where scope bites you

| Situation | Scope issue |
|---|---|
| Loop + async callback | `var` shared binding → wrong index |
| React/Angular stale handler | Closure over old state (stale closure) |
| Accidental global | Missing `let`/`const` in sloppy mode |
| Huge closed-over objects | Memory kept alive by long-lived closures |
| Event listeners | Handler closes over component data — unsubscribe / destroy |

---

## 15. Cheat sheet

```text
Lexical scope   = where written, not where called
Global          = top-level / shared
Function        = var, function body
Block           = let / const / class inside { }
Module          = file-private top-level

Scope chain     = inner → outer → global
Shadowing       = inner hides outer name

var             = function scope, hoisted undefined
let/const       = block scope, TDZ
const           = no rebind (mutate object OK)

Closure         = fn + outer environment
Loop trap       = var → 3,3,3; let → 0,1,2
```

---

## 16. Practice checklist

- [ ] Explain lexical scope in 20s  
- [ ] Contrast `var` / `let` / `const` scope + TDZ  
- [ ] Draw a scope chain for a nested function  
- [ ] Predict Drills A–E  
- [ ] Write `makeCounter` closure from memory  
- [ ] Fix the `var` loop + `setTimeout` bug with `let` or IIFE  
- [ ] One sentence on module scope  

---

## Related

| Topic | File |
|---|---|
| Functions, closures, arrow `this` | [FUNCTIONS.md](./FUNCTIONS.md) |
| Objects / OOP encapsulation | [OBJECTS_AND_OOP.md](./OBJECTS_AND_OOP.md) |
| Stale closure vs leak | [TRICKY_10_FRONTEND_QUESTIONS.md](./TRICKY_10_FRONTEND_QUESTIONS.md) |
| Event loop (when callbacks run) | [EVENT_LOOP.md](./EVENT_LOOP.md) |
