# JavaScript Polyfills — Interview Practice Guide

This guide teaches polyfills the interview way:

1. First understand the **original native method**
2. See clear examples
3. Then implement / explain the **polyfill**

Companion practice file: `polyfills.js`

---

## How To Use This File

For every method, study in this order:

```text
1. What does the native method do?
2. What are its arguments and return value?
3. Practice 2–3 examples
4. Know important edge cases
5. Then write the polyfill
6. Explain how your polyfill matches native behavior
```

In interviews, always start with:

> First I will explain what the original method does, then I will implement the polyfill.

---



## 1. What Is A Polyfill?

A **polyfill** is custom JavaScript code that recreates a built-in feature for environments that do not support it.

Example idea:

- Old browser has no `Array.prototype.includes`
- You write your own `includes` logic
- Now your code can use that feature everywhere

In interviews, polyfills test whether you understand:

- How the method really works
- How callbacks are called
- How `this` works
- Edge cases

---



## 2. Golden Rules



### Array methods

- `this` inside polyfill = the array
- Callback usually gets `(value, index, array)`
- Do not mutate original array unless native method mutates
- Use `i in this` for sparse-array safety



### Promise methods

- Wrap values with `Promise.resolve(item)`
- Keep result order by index for `all` / `allSettled`
- Outer promise settles only once
- Full constructor polyfill (`MyPromise`): states + `then` chaining + microtask async



### Object methods

- Own vs inherited properties matter
- Shallow vs deep copy matter



### Function methods

- `call` / `apply` invoke immediately
- `bind` returns a new function

---



# PART A — ARRAY METHODS

---



## 3. `Array.prototype.map`



### 3.1 What the original method does

`map` creates a **new array** by calling a function on every element of the original array.

It does **not** change the original array.

Think:

> Transform each item → collect transformed items into a new array



### 3.2 Syntax

```js
array.map(callback(currentValue, index, array), thisArg)
```


| Argument       | Meaning                                           |
| -------------- | ------------------------------------------------- |
| `currentValue` | current element                                   |
| `index`        | current index (optional)                          |
| `array`        | original array (optional)                         |
| `thisArg`      | value to use as `this` inside callback (optional) |


**Returns:** a new array of same length (with holes preserved in sparse arrays)

### 3.3 Examples

```js
const nums = [1, 2, 3];

const doubled = nums.map((n) => n * 2);
console.log(doubled); // [2, 4, 6]
console.log(nums);    // [1, 2, 3]  (original unchanged)
```

```js
const users = [
  { id: 1, name: 'A' },
  { id: 2, name: 'B' }
];

const names = users.map((user) => user.name);
console.log(names); // ['A', 'B']
```

```js
const withIndex = ['a', 'b'].map((value, index) => value + index);
console.log(withIndex); // ['a0', 'b1']
```



### 3.4 Important native points

- Always returns a new array
- Original array is not mutated
- Callback should return the transformed value
- Sparse holes stay holes

```js
const sparse = [1, , 3];
console.log(sparse.map((x) => x * 2)); // [2, empty, 6]
```



### 3.5 Polyfill

```js
Array.prototype.myMap = function (callback, thisArg) {
  if (typeof callback !== 'function') {
    throw new TypeError(callback + ' is not a function');
  }

  const result = [];

  for (let i = 0; i < this.length; i++) {
    if (i in this) {
      // same args native map passes: value, index, array
      result[i] = callback.call(thisArg, this[i], i, this);
    }
  }

  return result;
};
```



### 3.6 How polyfill matches native behavior

1. `this` is the array on which method was called
2. Loop all indexes
3. Skip holes with `i in this`
4. Call callback and store returned value at same index
5. Return new array

```js
console.log([1, 2, 3].myMap((x) => x * 2)); // [2, 4, 6]
```

---



## 4. `Array.prototype.filter`



### 4.1 What the original method does

`filter` creates a **new array** with only elements that pass a test.

Think:

> Keep item if callback returns truthy, otherwise skip it



### 4.2 Syntax

```js
array.filter(callback(currentValue, index, array), thisArg)
```

**Returns:** new array (usually shorter or equal length)

### 4.3 Examples

```js
const nums = [1, 2, 3, 4, 5];

const evens = nums.filter((n) => n % 2 === 0);
console.log(evens); // [2, 4]
```

```js
const users = [
  { name: 'A', active: true },
  { name: 'B', active: false },
  { name: 'C', active: true }
];

const activeUsers = users.filter((u) => u.active);
console.log(activeUsers);
// [{ name: 'A', active: true }, { name: 'C', active: true }]
```



### 4.4 Important native points

- Does not mutate original array
- Callback should return boolean-like value
- If nothing matches → `[]`

```js
[1, 3, 5].filter((n) => n % 2 === 0); // []
```



### 4.5 Polyfill

```js
Array.prototype.myFilter = function (callback, thisArg) {
  if (typeof callback !== 'function') {
    throw new TypeError(callback + ' is not a function');
  }

  const result = [];

  for (let i = 0; i < this.length; i++) {
    if (i in this) {
      const value = this[i];
      if (callback.call(thisArg, value, i, this)) {
        result.push(value); // keep original value, not callback return
      }
    }
  }

  return result;
};
```



### 4.6 Key difference from `map`


|         | `map`                 | `filter`         |
| ------- | --------------------- | ---------------- |
| Purpose | transform             | select           |
| Pushes  | callback return value | original element |
| Length  | usually same          | usually smaller  |


```js
console.log([1, 2, 3, 4].myFilter((x) => x > 2)); // [3, 4]
```

---



## 5. `Array.prototype.reduce`



### 5.1 What the original method does

`reduce` boils an array down to a **single value** by repeatedly combining elements.

Think:

> Start with accumulator → update it with each element → final accumulator



### 5.2 Syntax

```js
array.reduce(callback(accumulator, currentValue, index, array), initialValue)
```


| Argument       | Meaning                                         |
| -------------- | ----------------------------------------------- |
| `accumulator`  | running result                                  |
| `currentValue` | current element                                 |
| `initialValue` | starting accumulator (optional but recommended) |


**Returns:** single accumulated value (number, object, array, anything)

### 5.3 Examples

Sum:

```js
const sum = [1, 2, 3, 4].reduce((acc, curr) => acc + curr, 0);
console.log(sum); // 10
```

Without initial value:

```js
[1, 2, 3].reduce((acc, curr) => acc + curr);
// first acc = 1, starts from index 1 → 6
```

Build object:

```js
const votes = ['js', 'js', 'py', 'js'];

const count = votes.reduce((acc, lang) => {
  acc[lang] = (acc[lang] || 0) + 1;
  return acc;
}, {});

console.log(count); // { js: 3, py: 1 }
```

Flatten one level:

```js
[[1, 2], [3, 4]].reduce((acc, arr) => acc.concat(arr), []);
// [1, 2, 3, 4]
```



### 5.4 Important native points

```js
[].reduce((a, b) => a + b);     // TypeError
[].reduce((a, b) => a + b, 0);  // 0
```

Always prefer giving `initialValue`.

### 5.5 Polyfill

```js
Array.prototype.myReduce = function (callback, initialValue) {
  if (typeof callback !== 'function') {
    throw new TypeError(callback + ' is not a function');
  }

  const hasInitial = arguments.length >= 2;
  let accumulator = initialValue;
  let startIndex = 0;

  if (!hasInitial) {
    if (this.length === 0) {
      throw new TypeError('Reduce of empty array with no initial value');
    }

    while (startIndex < this.length && !(startIndex in this)) {
      startIndex++;
    }

    accumulator = this[startIndex];
    startIndex++;
  }

  for (let i = startIndex; i < this.length; i++) {
    if (i in this) {
      accumulator = callback(accumulator, this[i], i, this);
    }
  }

  return accumulator;
};
```



### 5.6 How to explain in interview

> If initial value exists, start from index 0 with that accumulator. If not, first element becomes accumulator and loop starts from next index. Empty array with no initial value throws.

```js
console.log([1, 2, 3, 4].myReduce((a, b) => a + b, 0)); // 10
```

---



## 6. `Array.prototype.forEach`



### 6.1 What the original method does

`forEach` runs a function for every element.

It is for **side effects** (logging, pushing elsewhere, updating UI state), not for building a returned array.

### 6.2 Syntax

```js
array.forEach(callback(currentValue, index, array), thisArg)
```

**Returns:** `undefined`

### 6.3 Examples

```js
const nums = [1, 2, 3];

nums.forEach((n) => {
  console.log(n);
});
// 1
// 2
// 3
```

```js
const result = [];
[1, 2, 3].forEach((n) => result.push(n * 2));
console.log(result); // [2, 4, 6]
```



### 6.4 Important native points

- Does not return a useful value
- Cannot break early with `break` (not a loop keyword context)
- `return` inside callback only skips current iteration’s remaining callback code



### 6.5 Polyfill

```js
Array.prototype.myForEach = function (callback, thisArg) {
  if (typeof callback !== 'function') {
    throw new TypeError(callback + ' is not a function');
  }

  for (let i = 0; i < this.length; i++) {
    if (i in this) {
      callback.call(thisArg, this[i], i, this);
    }
  }
};
```



### 6.6 `forEach` vs `map`


|          | `forEach`    | `map`          |
| -------- | ------------ | -------------- |
| Return   | `undefined`  | new array      |
| Main use | side effects | transformation |


---



## 7. `Array.prototype.find` / `findIndex`



### 7.1 What the original methods do

- `find` → returns **first matching element**
- `findIndex` → returns **index** of first matching element

If nothing matches:

- `find` → `undefined`
- `findIndex` → `-1`



### 7.2 Examples

```js
const users = [
  { id: 1, name: 'A' },
  { id: 2, name: 'B' }
];

console.log(users.find((u) => u.id === 2));      // { id: 2, name: 'B' }
console.log(users.findIndex((u) => u.id === 2)); // 1
console.log(users.find((u) => u.id === 9));      // undefined
```



### 7.3 Polyfills

```js
Array.prototype.myFind = function (callback, thisArg) {
  for (let i = 0; i < this.length; i++) {
    if (i in this && callback.call(thisArg, this[i], i, this)) {
      return this[i];
    }
  }
  return undefined;
};

Array.prototype.myFindIndex = function (callback, thisArg) {
  for (let i = 0; i < this.length; i++) {
    if (i in this && callback.call(thisArg, this[i], i, this)) {
      return i;
    }
  }
  return -1;
};
```

---



## 8. `Array.prototype.some` / `every`



### 8.1 What the original methods do

- `some` → `true` if **at least one** element passes test
- `every` → `true` if **all** elements pass test



### 8.2 Examples

```js
[1, 2, 3].some((n) => n > 2);  // true
[1, 2, 3].every((n) => n > 2); // false
[2, 4, 6].every((n) => n % 2 === 0); // true
```

Empty array rules:

```js
[].some(() => true);  // false
[].every(() => false); // true  (vacuous truth)
```



### 8.3 Polyfills

```js
Array.prototype.mySome = function (callback, thisArg) {
  for (let i = 0; i < this.length; i++) {
    if (i in this && callback.call(thisArg, this[i], i, this)) {
      return true;
    }
  }
  return false;
};

Array.prototype.myEvery = function (callback, thisArg) {
  for (let i = 0; i < this.length; i++) {
    if (i in this && !callback.call(thisArg, this[i], i, this)) {
      return false;
    }
  }
  return true;
};
```

---



## 9. `Array.prototype.flat`



### 9.1 What the original method does

`flat` creates a new array with nested arrays flattened by a given depth.

Default depth = `1`.

### 9.2 Examples

```js
[1, [2, 3]].flat();          // [1, 2, 3]
[1, [2, [3]]].flat(1);       // [1, 2, [3]]
[1, [2, [3]]].flat(2);       // [1, 2, 3]
[1, [2, [3, [4]]]].flat(Infinity); // [1, 2, 3, 4]
```



### 9.3 Polyfill

```js
Array.prototype.myFlat = function (depth = 1) {
  const result = [];

  (function flatten(arr, d) {
    for (let i = 0; i < arr.length; i++) {
      if (!(i in arr)) continue;

      if (Array.isArray(arr[i]) && d > 0) {
        flatten(arr[i], d - 1);
      } else {
        result.push(arr[i]);
      }
    }
  })(this, depth);

  return result;
};
```



### 9.4 How to explain

> Recursively go into nested arrays while depth remains. When depth is 0, push nested arrays as-is.

---



## 10. `Array.prototype.includes`



### 10.1 What the original method does

Checks whether an array contains a value.

Returns `true` / `false`.

### 10.2 Examples

```js
[1, 2, 3].includes(2); // true
[1, 2, 3].includes(9); // false
[1, 2, 3].includes(1, 1); // false (start search from index 1)
```

Special NaN behavior:

```js
[NaN].indexOf(NaN);   // -1
[NaN].includes(NaN);  // true
```



### 10.3 Polyfill

```js
Array.prototype.myIncludes = function (searchElement, fromIndex = 0) {
  let start = fromIndex >= 0 ? fromIndex : Math.max(this.length + fromIndex, 0);

  for (let i = start; i < this.length; i++) {
    if (
      this[i] === searchElement ||
      (Number.isNaN(this[i]) && Number.isNaN(searchElement))
    ) {
      return true;
    }
  }

  return false;
};
```

---



# PART B — OBJECT METHODS

---



## 11. `Object.create`



### 11.1 What the original method does

Creates a new object and sets its prototype to the object you pass.

This is direct prototypal inheritance.

### 11.2 Syntax

```js
Object.create(proto, propertiesObject?)
```



### 11.3 Examples

```js
const animal = {
  eats: true,
  walk() {
    console.log('walking');
  }
};

const rabbit = Object.create(animal);
rabbit.jumps = true;

console.log(rabbit.jumps); // true (own)
console.log(rabbit.eats);  // true (inherited)
rabbit.walk();             // walking (inherited)
```

```js
console.log(Object.getPrototypeOf(rabbit) === animal); // true
```



### 11.4 Important native points

- New object is empty initially (unless propertiesObject given)
- Inherited props are found via prototype chain
- `proto` can be `null` for object with no prototype

```js
const clean = Object.create(null);
console.log(clean.toString); // undefined (no Object.prototype)
```



### 11.5 Polyfill

```js
Object.myCreate = function (proto, pr opertiesObject) {
  if (proto !== null && typeof proto !== 'object' && typeof proto !== 'function') {
    throw new TypeError('Object prototype may only be an Object or null');
  }

  function F() {}
  F.prototype = proto;
  const obj = new F();

  if (propertiesObject !== undefined) {
    Object.defineProperties(obj, propertiesObject);
  }

  return obj;
};
```



### 11.6 How polyfill works

1. Make temporary constructor `F`
2. Set `F.prototype = proto`
3. `new F()` creates object linked to that prototype
4. Optionally define extra properties

---



## 12. `Object.assign`



### 12.1 What the original method does

Copies **enumerable own properties** from one or more source objects into a target object.

It performs a **shallow copy/merge**.

### 12.2 Syntax

```js
Object.assign(target, ...sources)
```

**Returns:** the same target object (mutated)

### 12.3 Examples

```js
const target = { a: 1 };
const result = Object.assign(target, { b: 2 }, { a: 3, c: 4 });

console.log(result); // { a: 3, b: 2, c: 4 }
console.log(target); // same object
```

Clone top-level object:

```js
const original = { x: 1, y: 2 };
const clone = Object.assign({}, original);
```

Shallow copy warning:

```js
const original = { nested: { v: 1 } };
const copy = Object.assign({}, original);

copy.nested.v = 99;
console.log(original.nested.v); // 99 (shared nested reference)
```



### 12.4 Important native points

- Later sources overwrite earlier keys
- Skips `null` / `undefined` sources
- Shallow only
- Mutates target



### 12.5 Polyfill

```js
Object.myAssign = function (target, ...sources) {
  if (target == null) {
    throw new TypeError('Cannot convert undefined or null to object');
  }

  const to = Object(target);

  for (const source of sources) {
    if (source == null) continue;

    for (const key of Object.keys(source)) {
      to[key] = source[key];
    }
  }

  return to;
};
```



### 12.6 How to explain

> Convert target to object, loop each source, copy own enumerable keys into target, return target.

```js
console.log(Object.myAssign({ a: 1 }, { b: 2 }, { a: 3 }));
// { a: 3, b: 2 }
```

---



## 13. `Object.keys` / `values` / `entries`



### 13.1 What the original methods do


| Method                | Returns                             |
| --------------------- | ----------------------------------- |
| `Object.keys(obj)`    | array of own enumerable string keys |
| `Object.values(obj)`  | array of own enumerable values      |
| `Object.entries(obj)` | array of `[key, value]` pairs       |




### 13.2 Examples

```js
const user = { name: 'Shivam', age: 25 };

Object.keys(user);    // ['name', 'age']
Object.values(user);  // ['Shivam', 25]
Object.entries(user); // [['name', 'Shivam'], ['age', 25]]
```

Loop pairs:

```js
for (const [key, value] of Object.entries(user)) {
  console.log(key, value);
}
```



### 13.3 Important native points

- Own properties only (not inherited)
- Enumerable string keys only (not Symbols in these APIs)
- Order is generally insertion order for string keys



### 13.4 Polyfills (interview-level)

```js
Object.myKeys = function (obj) {
  if (obj == null) {
    throw new TypeError('Cannot convert undefined or null to object');
  }

  const keys = [];
  for (const key in Object(obj)) {
    if (Object.prototype.hasOwnProperty.call(obj, key)) {
      keys.push(key);
    }
  }
  return keys;
};

Object.myValues = function (obj) {
  return Object.myKeys(obj).map((key) => obj[key]);
};

Object.myEntries = function (obj) {
  return Object.myKeys(obj).map((key) => [key, obj[key]]);
};
```

---



## 14. Deep Clone (asked with Object methods)



### 14.1 What problem it solves

Native `Object.assign` / spread are shallow.

Deep clone copies nested objects too.

### 14.2 Example of shallow bug

```js
const a = { profile: { city: 'Delhi' } };
const b = { ...a };
b.profile.city = 'Mumbai';
console.log(a.profile.city); // Mumbai
```



### 14.3 Deep clone example

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

```js
const a = { profile: { city: 'Delhi' } };
const b = deepClone(a);
b.profile.city = 'Mumbai';
console.log(a.profile.city); // Delhi
```

---



# PART C — FUNCTION METHODS (`this` helpers)

These are extremely common in interviews.

---



## 15. `Function.prototype.call`



### 15.1 What the original method does

Calls a function **immediately**, with a given `this` value, and arguments listed one by one.

### 15.2 Syntax

```js
fn.call(thisArg, arg1, arg2, ...)
```



### 15.3 Examples

```js
function greet(greeting, punct) {
  return greeting + ', ' + this.name + punct;
}

const user = { name: 'Shivam' };

console.log(greet.call(user, 'Hello', '!')); // Hello, Shivam!
```

Borrow method:

```js
const obj1 = {
  nums: [1, 2, 3],
  max() {
    return Math.max(...this.nums);
  }
};

const obj2 = { nums: [8, 3, 10] };
console.log(obj1.max.call(obj2)); // 10
```



### 15.4 Important native points

- Invokes immediately
- Args are comma-separated
- Useful to set `this` explicitly



### 15.5 Polyfill

```js
Function.prototype.myCall = function (thisArg, ...args) {
  if (typeof this !== 'function') {
    throw new TypeError('myCall must be called on a function');
  }

  const context = thisArg != null ? Object(thisArg) : globalThis;
  const key = Symbol();
  context[key] = this;          // put function temporarily on context
  const result = context[key](...args); // call as method => this = context
  delete context[key];
  return result;
};
```



### 15.6 How to explain

> I attach the function temporarily to the provided object, call it as a method so `this` becomes that object, then delete the temporary property.

---



## 16. `Function.prototype.apply`



### 16.1 What the original method does

Same as `call`, but arguments are passed as an **array** (or array-like).

### 16.2 Syntax

```js
fn.apply(thisArg, [arg1, arg2, ...])
```



### 16.3 Examples

```js
function greet(greeting, punct) {
  return greeting + ', ' + this.name + punct;
}

console.log(greet.apply({ name: 'Shivam' }, ['Hi', '!!']));
// Hi, Shivam!!
```

Classic use:

```js
Math.max.apply(null, [1, 5, 3]); // 5
```



### 16.4 `call` vs `apply`


|             | `call`     | `apply`               |
| ----------- | ---------- | --------------------- |
| Args style  | list       | array                 |
| When to use | known args | args already in array |




### 16.5 Polyfill

```js
Function.prototype.myApply = function (thisArg, args = []) {
  if (typeof this !== 'function') {
    throw new TypeError('myApply must be called on a function');
  }

  const context = thisArg != null ? Object(thisArg) : globalThis;
  const key = Symbol();
  context[key] = this;
  const result = context[key](...(args || []));
  delete context[key];
  return result;
};
```

---



## 17. `Function.prototype.bind`



### 17.1 What the original method does

Returns a **new function** whose `this` is permanently set.

It does **not** call the function immediately.

Also supports partial arguments.

### 17.2 Syntax

```js
const boundFn = fn.bind(thisArg, arg1, arg2, ...)
boundFn(arg3, arg4)
```



### 17.3 Examples

```js
const user = {
  name: 'Shivam',
  greet(msg) {
    return msg + ' ' + this.name;
  }
};

const fn = user.greet;
console.log(fn('Hi')); // 'Hi undefined' (lost this)

const bound = user.greet.bind(user);
console.log(bound('Hi')); // Hi Shivam
```

Partial application:

```js
function multiply(a, b) {
  return a * b;
}

const double = multiply.bind(null, 2);
console.log(double(5)); // 10
```



### 17.4 Important native points

- Returns function
- Presets `this`
- Can preset some arguments
- Very common fix for lost-`this` bugs



### 17.5 Polyfill

```js
Function.prototype.myBind = function (thisArg, ...boundArgs) {
  if (typeof this !== 'function') {
    throw new TypeError('myBind must be called on a function');
  }

  const originalFn = this;

  function boundFn(...args) {
    if (new.target) {
      return new originalFn(...boundArgs, ...args);
    }
    return originalFn.apply(thisArg, [...boundArgs, ...args]);
  }

  if (originalFn.prototype) {
    boundFn.prototype = Object.create(originalFn.prototype);
  }

  return boundFn;
};
```



### 17.6 How to explain

> `bind` stores the function and context, returns a wrapper. When wrapper is called later, it calls original with bound `this` and merged arguments.

---



# PART D — PROMISE METHODS

---



## 18. Promise basics before polyfills

A Promise represents a future value.

States:

- `pending`
- `fulfilled`
- `rejected`

```js
const p = new Promise((resolve, reject) => {
  resolve(10);
});

p.then((value) => console.log(value)); // 10
```

Static helpers:

- `Promise.resolve(value)`
- `Promise.reject(reason)`

---



## 18b. Full `Promise` constructor polyfill (`MyPromise`)

> Previously this guide covered **static** helpers (`all` / `race` / …) that assume a real `Promise` exists.  
> Interviews also ask: **implement Promise itself**.

### What you must support (MVP)

| Piece | Behavior |
|---|---|
| States | `pending` → `fulfilled` **or** `rejected` (settle **once**) |
| Executor | `new MyPromise((resolve, reject) => { … })` runs **sync** |
| `then` | Registers callbacks; runs **async** (microtask); returns a **new** promise |
| Chaining | `then` return value / thrown error / returned promise → next link |
| `catch` | `then(undefined, onReject)` sugar |
| `resolve`/`reject` after settle | No-ops |

Optional follow-ups: `finally`, `MyPromise.resolve` / `reject`, static `all` on top of `MyPromise`.

### Interview-simple implementation

```js
class MyPromise {
  constructor(executor) {
    this.state = 'pending'; // pending | fulfilled | rejected
    this.value = undefined;
    this.reason = undefined;
    this.onFulfilled = []; // queued thens while pending
    this.onRejected = [];

    const resolve = (value) => {
      if (this.state !== 'pending') return;
      this.state = 'fulfilled';
      this.value = value;
      this.onFulfilled.forEach((fn) => fn(value));
      this.onFulfilled = [];
      this.onRejected = [];
    };

    const reject = (reason) => {
      if (this.state !== 'pending') return;
      this.state = 'rejected';
      this.reason = reason;
      this.onRejected.forEach((fn) => fn(reason));
      this.onFulfilled = [];
      this.onRejected = [];
    };

    try {
      executor(resolve, reject);
    } catch (err) {
      reject(err);
    }
  }

  then(onFulfilled, onRejected) {
    // Always return a NEW promise (chaining)
    return new MyPromise((resolve, reject) => {
      const handleFulfilled = (value) => {
        queueMicrotask(() => {
          try {
            if (typeof onFulfilled !== 'function') {
              resolve(value); // pass-through
              return;
            }
            const result = onFulfilled(value);
            // If handler returns a thenable, adopt its state
            if (result && typeof result.then === 'function') {
              result.then(resolve, reject);
            } else {
              resolve(result);
            }
          } catch (err) {
            reject(err);
          }
        });
      };

      const handleRejected = (reason) => {
        queueMicrotask(() => {
          try {
            if (typeof onRejected !== 'function') {
              reject(reason); // pass-through
              return;
            }
            const result = onRejected(reason);
            if (result && typeof result.then === 'function') {
              result.then(resolve, reject);
            } else {
              resolve(result); // catch recovering → fulfill next
            }
          } catch (err) {
            reject(err);
          }
        });
      };

      if (this.state === 'fulfilled') {
        handleFulfilled(this.value);
      } else if (this.state === 'rejected') {
        handleRejected(this.reason);
      } else {
        this.onFulfilled.push(handleFulfilled);
        this.onRejected.push(handleRejected);
      }
    });
  }

  catch(onRejected) {
    return this.then(undefined, onRejected);
  }

  static resolve(value) {
    if (value instanceof MyPromise) return value;
    return new MyPromise((resolve) => resolve(value));
  }

  static reject(reason) {
    return new MyPromise((_, reject) => reject(reason));
  }
}
```

### Tiny demos

```js
new MyPromise((res) => res(1))
  .then((v) => v + 1)
  .then((v) => console.log(v)); // 2 (async — after sync code)

new MyPromise((_, rej) => rej('boom'))
  .catch((e) => 'recovered')
  .then(console.log); // recovered

console.log('sync first');
```

Typical order: `sync first` then `2` / `recovered`.

### Why `queueMicrotask`?

Native `then` callbacks are **microtasks** — not sync, not `setTimeout` macrotasks.

```js
console.log(1);
MyPromise.resolve().then(() => console.log(2));
console.log(3);
// 1 3 2
```

### Spoken 45s

> I’d implement a Promise with three states and settle only once. The executor runs synchronously and receives resolve/reject. `then` always returns a new promise, queues handlers as microtasks, and if a handler returns a thenable I adopt its settlement. While pending I store callbacks in arrays and flush them on settle. `catch` is just `then` with an onReject.

### What this MVP skips (say if asked)

| Advanced | Notes |
|---|---|
| Full Promises/A+ resolution procedure | Same-object cycles, exotic thenables |
| `finally` | Run on settle; pass through value/reason |
| Unhandled rejection tracking | Host-specific |
| Subclassing `Symbol.species` | Rare in interviews |

For **static** `all` / `race` / `allSettled` / `any` polyfills (on native `Promise`), see sections 19–22. You can rewrite them against `MyPromise` the same way.

---



## 19. `Promise.all`



### 19.1 What the original method does

Takes an iterable of promises and returns one promise that:

- **fulfills** when **all** input promises fulfill
- **rejects** immediately when **any** input promise rejects (fail-fast)
- result array keeps **input order**, not completion order



### 19.2 Syntax

```js
Promise.all(iterable)
```



### 19.3 Examples

All success:

```js
Promise.all([
  Promise.resolve(1),
  Promise.resolve(2),
  Promise.resolve(3)
]).then(console.log); // [1, 2, 3]
```

Mixed non-promise values:

```js
Promise.all([1, Promise.resolve(2), 3]).then(console.log); // [1, 2, 3]
```

Fail-fast:

```js
Promise.all([
  Promise.resolve(1),
  Promise.reject('failed'),
  Promise.resolve(3)
]).catch(console.log); // failed
```

Empty list:

```js
Promise.all([]).then(console.log); // []
```

Order example:

```js
Promise.all([
  new Promise((res) => setTimeout(() => res('slow'), 50)),
  Promise.resolve('fast')
]).then(console.log); // ['slow', 'fast']  (input order)
```



### 19.4 Important native points

- Fail-fast on first rejection
- Preserve index order
- Accept non-promises via internal `Promise.resolve`
- Empty iterable resolves to `[]`



### 19.5 Real use case

Wait for multiple APIs:

```js
Promise.all([fetch('/users'), fetch('/posts')])
  .then(async ([usersRes, postsRes]) => {
    // both done
  });
```



### 19.6 Polyfill

```js
Promise.myAll = function (iterable) {
  return new Promise((resolve, reject) => {
    const items = Array.from(iterable);
    const results = new Array(items.length);
    let remaining = items.length;

    if (remaining === 0) {
      resolve(results);
      return;
    }

    items.forEach((item, index) => {
      Promise.resolve(item).then(
        (value) => {
          results[index] = value; // keep order
          remaining -= 1;
          if (remaining === 0) resolve(results);
        },
        (reason) => reject(reason) // fail-fast
      );
    });
  });
};
```



### 19.7 How to explain step-by-step

1. Convert iterable to array
2. Make results array of same length
3. Track how many are still pending
4. For each item, `Promise.resolve(item).then(...)`
5. On success, store at same index
6. When counter hits 0, resolve
7. On first failure, reject immediately

---



## 20. `Promise.race`



### 20.1 What the original method does

Returns a promise that settles with the **first** input promise that settles (fulfill or reject).

Think: whoever finishes first wins.

### 20.2 Examples

```js
Promise.race([
  new Promise((res) => setTimeout(() => res('slow'), 100)),
  new Promise((res) => setTimeout(() => res('fast'), 10))
]).then(console.log); // fast
```

Reject can win too:

```js
Promise.race([
  new Promise((_, rej) => setTimeout(() => rej('err'), 10)),
  new Promise((res) => setTimeout(() => res('ok'), 100))
]).catch(console.log); // err
```



### 20.3 Real use case

Timeout pattern:

```js
function withTimeout(promise, ms) {
  return Promise.race([
    promise,
    new Promise((_, reject) => setTimeout(() => reject('Timeout'), ms))
  ]);
}
```



### 20.4 Polyfill

```js
Promise.myRace = function (iterable) {
  return new Promise((resolve, reject) => {
    for (const item of iterable) {
      Promise.resolve(item).then(resolve, reject);
    }
  });
};
```



### 20.5 How to explain

> Attach resolve/reject to every input. The first one that settles settles the outer promise. Later ones are ignored because a promise settles only once.

---



## 21. `Promise.allSettled`



### 21.1 What the original method does

Waits for **all** promises to settle, whether fulfilled or rejected.

It does **not** fail-fast.

Returns an array of status objects:

```js
{ status: 'fulfilled', value: ... }
{ status: 'rejected', reason: ... }
```



### 21.2 Examples

```js
Promise.allSettled([
  Promise.resolve(1),
  Promise.reject('err'),
  Promise.resolve(3)
]).then(console.log);

/*
[
  { status: 'fulfilled', value: 1 },
  { status: 'rejected', reason: 'err' },
  { status: 'fulfilled', value: 3 }
]
*/
```



### 21.3 Real use case

You want results from many APIs even if some fail.

### 21.4 `all` vs `allSettled`


|            | `all`               | `allSettled`          |
| ---------- | ------------------- | --------------------- |
| One reject | whole thing rejects | still continues       |
| Result     | values only         | status objects        |
| Use when   | all must succeed    | partial success is ok |




### 21.5 Polyfill

```js
Promise.myAllSettled = function (iterable) {
  return new Promise((resolve) => {
    const items = Array.from(iterable);
    const results = new Array(items.length);
    let remaining = items.length;

    if (remaining === 0) {
      resolve(results);
      return;
    }

    items.forEach((item, index) => {
      Promise.resolve(item).then(
        (value) => {
          results[index] = { status: 'fulfilled', value };
          if (--remaining === 0) resolve(results);
        },
        (reason) => {
          results[index] = { status: 'rejected', reason };
          if (--remaining === 0) resolve(results);
        }
      );
    });
  });
};
```

---



## 22. `Promise.any`



### 22.1 What the original method does

Resolves with the **first fulfilled** promise.

Ignores rejections unless **all** promises reject.

If all reject → rejects with `AggregateError`.

### 22.2 Examples

```js
Promise.any([
  Promise.reject('a'),
  Promise.resolve('b'),
  Promise.resolve('c')
]).then(console.log); // b
```

All rejected:

```js
Promise.any([
  Promise.reject('a'),
  Promise.reject('b')
]).catch((err) => {
  console.log(err instanceof AggregateError); // true
  console.log(err.errors); // ['a', 'b']
});
```



### 22.3 `any` vs `race`


|               | `race`                            | `any`                          |
| ------------- | --------------------------------- | ------------------------------ |
| First reject  | can finish whole race as rejected | ignored if later fulfill comes |
| First fulfill | resolves                          | resolves                       |
| All reject    | rejects with that reason          | `AggregateError`               |




### 22.4 Real use case

Try multiple mirrors/sources, use first successful response.

### 22.5 Polyfill

```js
Promise.myAny = function (iterable) {
  return new Promise((resolve, reject) => {
    const items = Array.from(iterable);
    const errors = new Array(items.length);
    let rejectedCount = 0;

    if (items.length === 0) {
      reject(new AggregateError([], 'All promises were rejected'));
      return;
    }

    items.forEach((item, index) => {
      Promise.resolve(item).then(
        (value) => resolve(value),
        (reason) => {
          errors[index] = reason;
          rejectedCount += 1;
          if (rejectedCount === items.length) {
            reject(new AggregateError(errors, 'All promises were rejected'));
          }
        }
      );
    });
  });
};
```

---



## 23. Promise methods comparison (memorize)

```text
Promise.all
- wait all success
- fail on first reject
- ordered values

Promise.allSettled
- wait all settle
- never fail due to input reject
- status objects

Promise.race
- first settle wins (success or fail)

Promise.any
- first success wins
- AggregateError if all fail
```

---



# PART E — INTERVIEW PRACTICE

---



## 24. How To Answer In Interview

Use this template:

1. **Native meaning**
  > `map` transforms each element and returns a new array.
2. **Tiny example**
  > `[1,2,3].map(x => x*2)` gives `[2,4,6]`.
3. **Polyfill approach**
  > I loop the array, call callback, push/store results.
4. **Edge cases**
  > Empty arrays, non-promise values, sparse holes, fail-fast, order.

---



## 25. Highest Priority Order



### Tier 1

1. `map` (native + polyfill)
2. `filter`
3. `reduce`
4. `bind`
5. `Promise.all`



### Tier 2

1. `call` / `apply`
2. `Promise.race`
3. `Promise.allSettled`
4. `Promise.any`
5. `Object.assign`
6. `Object.create`



### Tier 3

1. `flat`
2. `includes`
3. deep clone

---



## 26. Rapid Fire

**Q: Does** `map` **mutate original array?**  
A: No.

**Q: Does** `Object.assign` **deep copy?**  
A: No, shallow.

**Q: Difference between** `call` **and** `apply`**?**  
A: Args list vs args array. Both invoke immediately.

**Q: Difference between** `bind` **and** `call`**?**  
A: `bind` returns new function; `call` executes now.

**Q: Does** `Promise.all` **preserve completion order?**  
A: No, it preserves input index order.

**Q: When use** `allSettled` **over** `all`**?**  
A: When you need every result even if some fail.

**Q:** `race` **vs** `any`**?**  
A: `race` = first settle; `any` = first fulfill.

---



## 27. Practice Checklist

- [ ] Explain native `map`, then write `myMap`
- [ ] Explain native `filter`, then write `myFilter`
- [ ] Explain native `reduce` with and without initial value
- [ ] Explain `call` / `apply` / `bind` differences, implement all three
- [ ] **Implement full `MyPromise` (states, then chaining, microtask)** ← §18b
- [ ] Explain `Promise.all` fail-fast + order, implement it
- [ ] Explain and implement `race`, `allSettled`, `any`
- [ ] Explain and implement `Object.assign` and `Object.create`

Run:

```bash
node polyfills.js
```

---



## 28. Final Cheat Sheet

```text
ARRAY
map      -> transform each item -> new array
filter   -> keep items that pass test -> new array
reduce   -> combine to one value
forEach  -> side effects, returns undefined
find     -> first matching element
some     -> any match?
every    -> all match?
flat     -> flatten nested arrays
includes -> value exists? (NaN-safe)

OBJECT
create   -> new object with given prototype
assign   -> shallow merge into target
keys/values/entries -> own enumerable data views
groupBy  -> Object.groupBy polyfill (DSA §14) — buckets by callback key

FUNCTION
call     -> run now, args list, set this
apply    -> run now, args array, set this
bind     -> return bound function for later

PROMISE
all         -> all success / first fail / ordered
allSettled  -> wait all / status list
race        -> first settle
any         -> first success / AggregateError
```

If you can explain the native method clearly first, your polyfill answer becomes much stronger in interviews.