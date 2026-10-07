# JavaScript Functions — Interview Ready Guide

---

## 1. What Is A Function?

A function is a reusable block of code that can take inputs (parameters) and return an output.

```js
function add(a, b) {
  return a + b;
}

console.log(add(2, 3)); // 5
```

Interview one-liner:

> Functions are first-class values in JavaScript — you can store them in variables, pass them as arguments, and return them from other functions.

---

## 2. Ways To Create Functions

### Function declaration

```js
function greet(name) {
  return 'Hi ' + name;
}
```

- Hoisted (can call before definition)

```js
hello(); // works
function hello() {
  console.log('hello');
}
```

### Function expression

```js
const greet = function (name) {
  return 'Hi ' + name;
};
```

- Not hoisted like declarations

```js
hello(); // ReferenceError
const hello = function () {};
```

### Arrow function

```js
const add = (a, b) => a + b;
const square = (n) => n * n;
const sayHi = () => console.log('hi');
```

---

## 3. Arrow Functions — Critical Differences

| Feature | Normal function | Arrow function |
|---|---|---|
| Own `this` | Yes (depends on call) | No (lexical `this`) |
| `arguments` object | Yes | No |
| Can be constructor (`new`) | Yes | No |
| Hoisting | declaration yes | no |

```js
const obj = {
  name: 'A',
  normal() {
    console.log(this.name);
  },
  arrow: () => {
    console.log(this.name);
  }
};

obj.normal(); // A
obj.arrow();  // undefined (in module/strict outer this)
```

Interview rule:

> Use arrow functions for callbacks when you want parent `this`. Avoid arrows as object methods if you need dynamic `this`.

---

## 4. Parameters, Arguments, Defaults, Rest

```js
function demo(a, b = 10, ...rest) {
  console.log(a, b, rest);
}

demo(1);          // 1 10 []
demo(1, 2, 3, 4); // 1 2 [3, 4]
```

- Default params used when argument is `undefined`
- Rest gathers remaining args into array

---

## 5. First-Class Functions & Higher-Order Functions

### First-class

Functions are values:

```js
const fn = function () {};
const arr = [fn];
```

### Higher-order function (HOF)

A function that:

- takes function as argument, or
- returns a function

```js
function multiplier(factor) {
  return function (n) {
    return n * factor;
  };
}

const double = multiplier(2);
console.log(double(5)); // 10
```

Array methods are HOFs:

```js
[1, 2, 3].map((x) => x * 2);
```

---

## 6. Callback Functions

A callback is a function passed into another function to be called later.

```js
function fetchData(callback) {
  setTimeout(() => {
    callback('data ready');
  }, 100);
}

fetchData((msg) => console.log(msg));
```

Used in:

- event handlers
- timers
- array methods
- async APIs

---

## 7. Closures (Must-Know)

A closure is when an inner function remembers variables from its outer scope even after outer function finished.

```js
function makeCounter() {
  let count = 0;

  return function () {
    count++;
    return count;
  };
}

const counter = makeCounter();
console.log(counter()); // 1
console.log(counter()); // 2
```

Why useful:

- data privacy
- function factories
- partial application
- debounce/throttle internals

Interview one-liner:

> Closure = function + its remembered lexical environment.

---

## 8. Pure vs Impure Functions

### Pure

- same input → same output
- no side effects

```js
function add(a, b) {
  return a + b;
}
```

### Impure

```js
let total = 0;
function addToTotal(n) {
  total += n; // side effect
  return total;
}
```

Frontend interviews like pure functions for predictability/testing.

---

## 9. IIFE (Immediately Invoked Function Expression)

```js
(function () {
  console.log('runs immediately');
})();
```

Used historically for private scope before modules.

---

## 10. `call`, `apply`, `bind` (Function context)

```js
function greet(msg) {
  return msg + ' ' + this.name;
}

const user = { name: 'Shivam' };

greet.call(user, 'Hi');          // Hi Shivam
greet.apply(user, ['Hello']);  // Hello Shivam

const bound = greet.bind(user, 'Hey');
bound(); // Hey Shivam
```

| Method | Calls now? | Args |
|---|---|---|
| `call` | yes | list |
| `apply` | yes | array |
| `bind` | no (returns fn) | list (partial) |

---

## 11. Function Scope / Scope Chain

```js
const globalVar = 'g';

function outer() {
  const outerVar = 'o';

  function inner() {
    const innerVar = 'i';
    console.log(innerVar, outerVar, globalVar);
  }

  inner();
}
```

Lookup order: local → outer → global.

---

## 12. Hoisting Differences

```js
console.log(a); // undefined
var a = 1;

console.log(b); // ReferenceError (TDZ)
let b = 2;

fn(); // works
function fn() {}

fn2(); // ReferenceError
const fn2 = () => {};
```

---

## 13. Currying (Common Interview Ask)

Transform `f(a,b,c)` into `f(a)(b)(c)`.

```js
function curryAdd(a) {
  return function (b) {
    return function (c) {
      return a + b + c;
    };
  };
}

console.log(curryAdd(1)(2)(3)); // 6
```

Or:

```js
const curryAdd = (a) => (b) => (c) => a + b + c;
```

Use: reusable partially applied functions.

---

## 14. Recursion

Function calls itself.

```js
function factorial(n) {
  if (n <= 1) return 1;
  return n * factorial(n - 1);
}

console.log(factorial(5)); // 120
```

Always need a base case.

---

## 15. Interview Output Questions

### Q1

```js
for (var i = 0; i < 3; i++) {
  setTimeout(() => console.log(i), 0);
}
// 3 3 3
```

### Q2

```js
for (let i = 0; i < 3; i++) {
  setTimeout(() => console.log(i), 0);
}
// 0 1 2
```

Why: `let` creates new binding each iteration; `var` is function-scoped shared.

### Q3

```js
function outer() {
  let x = 10;
  return function () {
    return x;
  };
}
const fn = outer();
console.log(fn()); // 10 (closure)
```

---

## 16. Angular / Frontend Relevance

- Component methods are functions
- Event handlers are callbacks
- RxJS operators take projector functions
- Closures used in services/factories
- Arrow functions common for lexical `this` in callbacks

---

## 17. Cheat Sheet

```text
declaration vs expression vs arrow
arrow = lexical this, no constructor
HOF = takes/returns function
callback = passed function
closure = remembers outer variables
call/apply = invoke with this
bind = return bound function
pure = no side effects
curry = f(a)(b)(c)
```

---

## 18. Practice Checklist

- [ ] Write arrow vs normal `this` example
- [ ] Write a closure counter
- [ ] Explain call/apply/bind with demo
- [ ] Fix `var` setTimeout loop interview question
- [ ] Write a simple curry function

---

## Interview drill — Stale closure vs memory leak

> A closure keeps the **variable binding**. If that binding isn’t updated (or you closed over an old snapshot/state), you read an **outdated value** — a logic bug. A **memory leak** is different: references prevent GC (listeners, timers, unbounded caches), so memory grows. Fix stale data by reading latest state/signals; fix leaks by cleanup.

See also: `TRICKY_10_FRONTEND_QUESTIONS.md` Q4.

**Deep scope guide:** [SCOPES.md](./SCOPES.md) — lexical scope, TDZ, scope chain, modules, output drills.
