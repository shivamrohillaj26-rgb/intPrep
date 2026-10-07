/**
 * Interview polyfills practice file
 * Read explanations in: POLYFILLS_README.md
 *
 * Run: node polyfills.js
 */

// ─────────────────────────────────────────────
// ARRAY POLYFILLS
// ─────────────────────────────────────────────

Array.prototype.myMap = function (callback, thisArg) {
  if (typeof callback !== 'function') {
    throw new TypeError(callback + ' is not a function');
  }

  const result = [];
  for (let i = 0; i < this.length; i++) {
    if (i in this) {
      result[i] = callback.call(thisArg, this[i], i, this);
    }
  }
  return result;
};

Array.prototype.myFilter = function (callback, thisArg) {
  if (typeof callback !== 'function') {
    throw new TypeError(callback + ' is not a function');
  }

  const result = [];
  for (let i = 0; i < this.length; i++) {
    if (i in this) {
      const value = this[i];
      if (callback.call(thisArg, value, i, this)) {
        result.push(value);
      }
    }
  }
  return result;
};

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

// ─────────────────────────────────────────────
// OBJECT POLYFILLS
// ─────────────────────────────────────────────

Object.myCreate = function (proto, propertiesObject) {
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

// ─────────────────────────────────────────────
// FUNCTION POLYFILLS
// ─────────────────────────────────────────────

Function.prototype.myCall = function (thisArg, ...args) {
  if (typeof this !== 'function') {
    throw new TypeError('myCall must be called on a function');
  }

  const context = thisArg != null ? Object(thisArg) : globalThis;
  const key = Symbol();
  context[key] = this;
  const result = context[key](...args);
  delete context[key];
  return result;
};

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

// ─────────────────────────────────────────────
// FULL PROMISE CONSTRUCTOR POLYFILL (interview)
// ─────────────────────────────────────────────

class MyPromise {
  constructor(executor) {
    this.state = 'pending';
    this.value = undefined;
    this.reason = undefined;
    this.onFulfilled = [];
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
    return new MyPromise((resolve, reject) => {
      const handleFulfilled = (value) => {
        queueMicrotask(() => {
          try {
            if (typeof onFulfilled !== 'function') {
              resolve(value);
              return;
            }
            const result = onFulfilled(value);
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
              reject(reason);
              return;
            }
            const result = onRejected(reason);
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

// Demo (uncomment to try):
// console.log(1);
// MyPromise.resolve(2).then((v) => console.log(v));
// console.log(3); // 1 3 2

// ─────────────────────────────────────────────
// PROMISE STATIC METHOD POLYFILLS (use native Promise)
// ─────────────────────────────────────────────

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
          results[index] = value;
          remaining -= 1;
          if (remaining === 0) resolve(results);
        },
        (reason) => reject(reason),
      );
    });
  });
};

Promise.myRace = function (iterable) {
  return new Promise((resolve, reject) => {
    for (const item of iterable) {
      Promise.resolve(item).then(resolve, reject);
    }
  });
};

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
        },
      );
    });
  });
};

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
        },
      );
    });
  });
};

// ─────────────────────────────────────────────
// QUICK SELF-CHECKS
// ─────────────────────────────────────────────

console.log('--- Array ---');
console.log([1, 2, 3].myMap((x) => x * 2)); // [2, 4, 6]
console.log([1, 2, 3, 4].myFilter((x) => x % 2 === 0)); // [2, 4]
console.log([1, 2, 3, 4].myReduce((a, b) => a + b, 0)); // 10
console.log([1, [2, [3]]].myFlat(2)); // [1, 2, 3]
console.log([NaN].myIncludes(NaN)); // true

console.log('--- Object ---');
console.log(Object.myAssign({ a: 1 }, { b: 2 }, { a: 3 })); // { a: 3, b: 2 }
const proto = { greet: 'hi' };
console.log(Object.myCreate(proto).greet); // hi
console.log(Object.myEntries({ a: 1, b: 2 })); // [['a',1],['b',2]]

console.log('--- Function ---');
function greet(msg) {
  return msg + ' ' + this.name;
}
console.log(greet.myCall({ name: 'Shivam' }, 'Hi')); // Hi Shivam
console.log(greet.myApply({ name: 'Shivam' }, ['Hello'])); // Hello Shivam
console.log(greet.myBind({ name: 'Shivam' }, 'Hey')()); // Hey Shivam

console.log('--- Promise ---');
Promise.myAll([Promise.resolve(1), 2, Promise.resolve(3)]).then((v) =>
  console.log('myAll', v),
);

Promise.myRace([
  new Promise((res) => setTimeout(() => res('slow'), 30)),
  Promise.resolve('fast'),
]).then((v) => console.log('myRace', v));

Promise.myAllSettled([Promise.resolve(1), Promise.reject('err')]).then((v) =>
  console.log('myAllSettled', v),
);

Promise.myAny([Promise.reject('a'), Promise.resolve('b')]).then((v) =>
  console.log('myAny', v),
);
