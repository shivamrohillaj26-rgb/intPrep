# JavaScript Promises — Interview Ready Guide

---

## 1. What Is A Promise?

A **Promise** is an object that represents the eventual result of an asynchronous operation.

It can be in one of three states:

| State | Meaning |
|---|---|
| `pending` | waiting, not finished yet |
| `fulfilled` | operation succeeded |
| `rejected` | operation failed |

Once fulfilled or rejected, it is **settled** and cannot change again.

Interview one-liner:

> A Promise is a placeholder for a future value. It starts pending, then becomes fulfilled with a value or rejected with a reason.

---

## 2. Why Promises Exist

Before Promises, async code used callbacks:

```js
getUser(1, function (user) {
  getPosts(user.id, function (posts) {
    getComments(posts[0].id, function (comments) {
      console.log(comments);
    });
  });
});
```

Problems:

- Callback hell (nested pyramid)
- Hard error handling
- Hard to compose

Promises make async flow flatter and chainable.

---

## 3. Creating A Promise

```js
const promise = new Promise((resolve, reject) => {
  // executor runs synchronously
  const success = true;

  if (success) {
    resolve('Done');
  } else {
    reject('Failed');
  }
});
```

- `resolve(value)` → fulfill
- `reject(reason)` → reject
- Executor function runs **immediately** (sync)

```js
console.log('1');

new Promise((resolve) => {
  console.log('2'); // sync
  resolve('3');
}).then((v) => console.log(v)); // microtask

console.log('4');

// Output: 1 2 4 3
```

---

## 4. Consuming Promises

### `.then()`

```js
promise.then(
  (value) => console.log('success', value),
  (error) => console.log('error', error)
);
```

### `.catch()`

```js
promise.catch((error) => console.log(error));
```

### `.finally()`

Runs for both success and failure.

```js
promise.finally(() => console.log('cleanup'));
```

---

## 5. Promise Chaining

Each `.then` returns a new Promise.

```js
Promise.resolve(2)
  .then((n) => n * 2)      // 4
  .then((n) => n + 1)      // 5
  .then((n) => console.log(n));
```

If you return a Promise inside `then`, next `then` waits for it:

```js
Promise.resolve(1)
  .then((n) => {
    return new Promise((resolve) => {
      setTimeout(() => resolve(n + 10), 100);
    });
  })
  .then((n) => console.log(n)); // 11
```

---

## 6. Error Handling

Rejected promises jump to nearest `.catch`.

```js
Promise.resolve(1)
  .then(() => {
    throw new Error('boom');
  })
  .then(() => console.log('skipped'))
  .catch((err) => console.log('caught', err.message))
  .then(() => console.log('continues after catch'));
```

Output:

```text
caught boom
continues after catch
```

After `catch`, chain can continue as fulfilled unless you rethrow.

---

## 7. `Promise.resolve` / `Promise.reject`

```js
Promise.resolve(10).then(console.log); // 10
Promise.reject('err').catch(console.log); // err
```

Useful to wrap normal values into promises.

---

## 8. Static Combinators

### `Promise.all`

- Wait for all to fulfill
- Reject on first failure
- Keep input order

```js
Promise.all([
  Promise.resolve(1),
  2,
  Promise.resolve(3)
]).then(console.log); // [1, 2, 3]
```

### `Promise.allSettled`

- Wait for all to settle
- Never fails due to one reject

```js
Promise.allSettled([
  Promise.resolve(1),
  Promise.reject('x')
]).then(console.log);
```

### `Promise.race`

- First settled wins (success or fail)

```js
Promise.race([
  new Promise((r) => setTimeout(() => r('slow'), 100)),
  Promise.resolve('fast')
]).then(console.log); // fast
```

**Interview pattern:** race API vs timer → timeout; add one retry → resilience.  
Deep guide: [API_TIMEOUT_RETRY.md](./API_TIMEOUT_RETRY.md).

### `Promise.any`

- First fulfilled wins
- If all reject → `AggregateError`

```js
Promise.any([
  Promise.reject('a'),
  Promise.resolve('b')
]).then(console.log); // b
```

### Comparison table

| Method | Resolves when | Rejects when |
|---|---|---|
| `all` | all fulfill | first reject |
| `allSettled` | all settle | almost never from input rejects |
| `race` | first settle fulfill | first settle reject |
| `any` | first fulfill | all reject |

---

## 9. Promises And Event Loop

Promise callbacks (`.then/.catch/.finally`) are **microtasks**.

```js
console.log('A');

setTimeout(() => console.log('B'), 0);

Promise.resolve().then(() => console.log('C'));

console.log('D');

// A D C B
```

Rule:

```text
sync → all microtasks (Promises) → macrotasks (setTimeout)
```

---

## 10. Common Interview Output Questions

### Q1

```js
console.log(1);

Promise.resolve().then(() => console.log(2));

console.log(3);
```

Output: `1 3 2`

### Q2

```js
Promise.resolve()
  .then(() => {
    console.log(1);
    return Promise.resolve(2);
  })
  .then(console.log);

Promise.resolve().then(() => console.log(3));
```

Typical modern output involves microtask hops; explain that returning a Promise waits for settlement before next `then`.

### Q3

```js
new Promise((resolve, reject) => {
  console.log('A');
  resolve();
  console.log('B');
}).then(() => console.log('C'));

console.log('D');
```

Output: `A B D C`

Executor is sync; `then` is async microtask.

---

## 11. Practical Frontend Example

```js
function fetchUser(id) {
  return fetch(`/api/users/${id}`).then((res) => {
    if (!res.ok) throw new Error('Failed');
    return res.json();
  });
}

fetchUser(1)
  .then((user) => console.log(user))
  .catch((err) => console.error(err))
  .finally(() => console.log('done'));
```

---

## 12. Important Interview Answers

**Are Promises multi-threaded?**  
No. JS is single-threaded. Promises schedule callbacks on the microtask queue.

**Can a Promise be pending forever?**  
Yes, if never resolved/rejected.

**Difference between reject and throw in executor?**  
Both reject the promise (throw in executor becomes reject).

**What if resolve is called twice?**  
Only first settlement counts.

---

## 13. Cheat Sheet

```text
new Promise((resolve, reject) => { ... })  // executor sync
then / catch / finally                     // microtasks
Promise.all        -> all success / first fail
Promise.allSettled -> wait all outcomes
Promise.race       -> first settle
Promise.any        -> first success
```

---

## 14. Practice Checklist

- [ ] Create and consume a Promise
- [ ] Chain then/catch/finally
- [ ] Explain all/allSettled/race/any
- [ ] Predict Promise vs setTimeout output
- [ ] Write a small `fetch` style Promise chain
- [ ] Implement `MyPromise` polyfill ← [POLYFILLS_README.md](./POLYFILLS_README.md) §18b

---

## Interview drill — Errors in async callbacks

> `try/catch` around `promise.then(...)` does **not** catch throws inside the async handler. Use `.catch`, or `async/await` with `try/catch` around `await`. Long resolved-`.then` chains can also block UI via microtask starvation (see `EVENT_LOOP.md`).

See also: `TRICKY_10_FRONTEND_QUESTIONS.md` Q1 & Q5.

**Polyfills:** full constructor + `all`/`race`/`allSettled`/`any` in [POLYFILLS_README.md](./POLYFILLS_README.md) and `practice/polyfills.js`.
