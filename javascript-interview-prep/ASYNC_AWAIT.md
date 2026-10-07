# Async / Await — Deep Interview Ready Guide

This guide shows **what async/await replaced**, not only what it is.

For every important idea you will see:

1. Old callback style (where useful)
2. Promise `.then/.catch` style
3. Modern `async/await` style
4. What changed and why it is better

---

## 0. The Big Picture (Read This First)

JavaScript async history in one line:

```text
Callbacks  →  Promises (.then/.catch)  →  async/await
```

Important truth:

> `async/await` does **not** remove Promises.  
> It is **syntactic sugar** over Promises to make them look like normal sync code.

So when you write:

```js
const user = await getUser();
```

JavaScript is still doing something like:

```js
return getUser().then((user) => {
  // continue with user
});
```

Interview one-liner:

> async/await is a cleaner way to consume Promises. Under the hood it still uses Promises and the microtask queue.

---

## 1. What Problem Was Async/Await Solving?

### Problem with callbacks: Callback Hell

```js
// OLD WAY — nested callbacks
getUser(1, function (user) {
  getPosts(user.id, function (posts) {
    getComments(posts[0].id, function (comments) {
      console.log(comments);
    }, function (err) {
      console.error(err);
    });
  }, function (err) {
    console.error(err);
  });
}, function (err) {
  console.error(err);
});
```

Problems:

- deep nesting (pyramid of doom)
- error handling repeated everywhere
- hard to read / hard to maintain

### Better: Promises

```js
// CONVENTIONAL PROMISE WAY
getUser(1)
  .then((user) => getPosts(user.id))
  .then((posts) => getComments(posts[0].id))
  .then((comments) => console.log(comments))
  .catch((err) => console.error(err));
```

Better, but long chains can still get messy with many branches.

### Cleanest for sequential logic: async/await

```js
// NEW WAY — async/await
async function load() {
  try {
    const user = await getUser(1);
    const posts = await getPosts(user.id);
    const comments = await getComments(posts[0].id);
    console.log(comments);
  } catch (err) {
    console.error(err);
  }
}
```

What was replaced?

| Old idea | New async/await idea |
|---|---|
| nested callbacks | top-to-bottom `await` |
| `.then(value => ...)` | `const value = await ...` |
| `.catch(err => ...)` | `try/catch` |
| `.finally(() => ...)` | `try/catch/finally` |

---

## 2. What Is An `async` Function?

### Native meaning

Adding `async` before a function means:

1. That function always returns a Promise
2. You can use `await` inside it

### Old / equivalent Promise way

```js
// NEW
async function getNumber() {
  return 10;
}

// OLD EQUIVALENT
function getNumber() {
  return Promise.resolve(10);
}
```

Both usages are the same for the caller:

```js
getNumber().then((n) => console.log(n)); // 10
```

### If function throws

```js
// NEW
async function fail() {
  throw new Error('boom');
}

// OLD EQUIVALENT
function fail() {
  return Promise.reject(new Error('boom'));
}
```

Caller still uses:

```js
fail().catch((e) => console.log(e.message)); // boom
```

### Key mental model

```text
async function
= normal function that automatically wraps return/throw into a Promise
```

---

## 3. What Does `await` Really Do?

### Native meaning

`await` waits for a Promise to settle, then:

- if fulfilled → gives you the value
- if rejected → throws that error in the async function

### Side-by-side replacement

```js
// NEW WAY
async function main() {
  const user = await getUser();
  console.log(user);
}
```

```js
// OLD PROMISE WAY (what await replaces)
function main() {
  return getUser().then((user) => {
    console.log(user);
  });
}
```

So:

```text
const x = await somePromise;
```

is basically:

```text
return somePromise.then((x) => {
  // rest of function continues here
});
```

---

## 4. Deep Dive: Await Does Not Block The Whole JS Thread

This is a common interview confusion.

```js
async function main() {
  console.log('A');
  const value = await Promise.resolve('B');
  console.log(value);
  console.log('C');
}

console.log('start');
main();
console.log('end');
```

Output:

```text
start
A
end
B
C
```

### Why?

`await` pauses **only that async function**, not the whole program.

Step-by-step:

1. `start` logs (sync)
2. `main()` starts, logs `A`
3. hits `await` → remaining code of `main` is scheduled as a microtask
4. `main()` returns a Promise immediately
5. sync continues → logs `end`
6. microtask runs → logs `B`, then `C`

### Same thing in old Promise style

```js
function main() {
  console.log('A');
  return Promise.resolve('B').then((value) => {
    console.log(value);
    console.log('C');
  });
}

console.log('start');
main();
console.log('end');

// same output: start A end B C
```

So async/await is not magic multithreading. It is Promise continuation with nicer syntax.

---

## 5. Basic API Example — All Three Eras

Imagine helpers:

```js
function getUser() {
  return fetch('/api/user').then((r) => r.json());
}
```

### Era 1 — Callback style (oldest)

```js
function loadUser(success, failure) {
  fetch('/api/user')
    .then((r) => r.json())
    .then(success)
    .catch(failure);
}

loadUser(
  (user) => console.log(user),
  (err) => console.error(err)
);
```

### Era 2 — Promise `.then` style (conventional)

```js
function loadUser() {
  return fetch('/api/user')
    .then((res) => res.json())
    .then((user) => {
      console.log(user);
      return user;
    })
    .catch((err) => {
      console.error(err);
      throw err;
    });
}
```

### Era 3 — async/await style (modern)

```js
async function loadUser() {
  try {
    const res = await fetch('/api/user');
    const user = await res.json();
    console.log(user);
    return user;
  } catch (err) {
    console.error(err);
    throw err;
  }
}
```

### Mapping of replacements

| Promise chain piece | async/await replacement |
|---|---|
| `.then(res => res.json())` | `const user = await res.json()` |
| nested `.then` | next line after `await` |
| `.catch(err => ...)` | `catch (err) { ... }` |
| return value in `.then` | `return value` in async function |

---

## 6. Error Handling — Old vs New

### Old Promise way

```js
function load() {
  return getUser()
    .then((user) => getPosts(user.id))
    .then((posts) => {
      console.log(posts);
      return posts;
    })
    .catch((err) => {
      console.error('failed', err);
      throw err;
    })
    .finally(() => {
      console.log('cleanup');
    });
}
```

### New async/await way

```js
async function load() {
  try {
    const user = await getUser();
    const posts = await getPosts(user.id);
    console.log(posts);
    return posts;
  } catch (err) {
    console.error('failed', err);
    throw err;
  } finally {
    console.log('cleanup');
  }
}
```

### What replaced what?

| Old | New |
|---|---|
| `.catch(...)` | `catch` block |
| `.finally(...)` | `finally` block |
| error jumps over `.then` | error jumps to `catch` |

### Important behavior difference to remember

If you forget `try/catch` in async/await, a rejected await rejects the async function’s returned Promise:

```js
async function load() {
  const user = await getUser(); // if rejects, load() Promise rejects
  return user;
}

load().catch(console.error); // still valid old-style consume
```

So callers can still use `.catch`, because async functions return Promises.

---

## 7. Sequential Dependent Calls (Best Fit For Await)

When each step needs previous result.

### Old Promise chain

```js
function loadProfile(userId) {
  return getUser(userId)
    .then((user) => {
      return getPosts(user.id).then((posts) => {
        return {
          user,
          posts
        };
      });
    })
    .then((data) => {
      return getComments(data.posts[0].id).then((comments) => {
        return { ...data, comments };
      });
    });
}
```

Even with flattening, it gets noisy when you need multiple previous values.

### async/await (much clearer)

```js
async function loadProfile(userId) {
  const user = await getUser(userId);
  const posts = await getPosts(user.id);
  const comments = await getComments(posts[0].id);

  return { user, posts, comments };
}
```

This is the #1 reason teams prefer async/await for sequential flows.

---

## 8. Parallel Calls — Await Alone Is Not Always Faster

### Wrong mental model

People think: “I used async/await, so it is optimized.”

No. If you await one by one, they run one by one.

### Sequential (slower when independent)

```js
// NEW but sequential
async function load() {
  const users = await fetch('/users').then((r) => r.json());
  const posts = await fetch('/posts').then((r) => r.json());
  return { users, posts };
}
```

Same as old:

```js
// OLD PROMISE sequential
function load() {
  return fetch('/users')
    .then((r) => r.json())
    .then((users) => {
      return fetch('/posts')
        .then((r) => r.json())
        .then((posts) => ({ users, posts }));
    });
}
```

### Parallel (correct for independent requests)

```js
// NEW + Promise.all
async function load() {
  const [users, posts] = await Promise.all([
    fetch('/users').then((r) => r.json()),
    fetch('/posts').then((r) => r.json())
  ]);

  return { users, posts };
}
```

Old equivalent:

```js
// OLD PROMISE parallel
function load() {
  return Promise.all([
    fetch('/users').then((r) => r.json()),
    fetch('/posts').then((r) => r.json())
  ]).then(([users, posts]) => ({ users, posts }));
}
```

Interview tip:

> async/await makes code readable. `Promise.all` makes independent tasks concurrent. Use both together.

---

## 9. Conditionally Branching Logic

This is where async/await becomes clearly better than Promise chains.

### Old Promise style (awkward)

```js
function load(userId) {
  return getUser(userId).then((user) => {
    if (!user.isActive) {
      return { user, posts: [] };
    }

    return getPosts(user.id).then((posts) => {
      if (posts.length === 0) {
        return { user, posts, comments: [] };
      }

      return getComments(posts[0].id).then((comments) => {
        return { user, posts, comments };
      });
    });
  });
}
```

### New async/await style (natural)

```js
async function load(userId) {
  const user = await getUser(userId);

  if (!user.isActive) {
    return { user, posts: [] };
  }

  const posts = await getPosts(user.id);

  if (posts.length === 0) {
    return { user, posts, comments: [] };
  }

  const comments = await getComments(posts[0].id);
  return { user, posts, comments };
}
```

What was replaced?

- nested `.then` branches → normal `if/else`
- temporary return nesting → normal early `return`

---

## 10. Loops With Async Code

### Old Promise way for sequential loop

```js
function loadAllSequential(ids) {
  let chain = Promise.resolve([]);

  ids.forEach((id) => {
    chain = chain.then((acc) => {
      return fetchUser(id).then((user) => {
        acc.push(user);
        return acc;
      });
    });
  });

  return chain;
}
```

### New async/await sequential loop

```js
async function loadAllSequential(ids) {
  const result = [];

  for (const id of ids) {
    const user = await fetchUser(id); // waits each time
    result.push(user);
  }

  return result;
}
```

### Parallel loop (usually better if independent)

Old:

```js
function loadAllParallel(ids) {
  return Promise.all(ids.map((id) => fetchUser(id)));
}
```

New (same idea, cleaner call site):

```js
async function loadAllParallel(ids) {
  return Promise.all(ids.map((id) => fetchUser(id)));
}
```

Interview warning:

> `forEach` + `await` does not wait properly. Use `for...of` for sequential awaits.

```js
// BAD
ids.forEach(async (id) => {
  await fetchUser(id); // forEach does not wait for these
});
```

---

## 11. Await On Non-Promise Values

```js
async function demo() {
  const a = await 10;
  const b = await 'hello';
  return [a, b];
}
```

Old equivalent:

```js
function demo() {
  return Promise.resolve(10).then((a) => {
    return Promise.resolve('hello').then((b) => [a, b]);
  });
}
```

`await` internally uses Promise resolution semantics. Even `await 10` schedules continuation as async (microtask behavior).

```js
async function f() {
  console.log(1);
  await null;
  console.log(2);
}

console.log(3);
f();
console.log(4);

// 3 1 4 2
```

Old equivalent:

```js
function f() {
  console.log(1);
  return Promise.resolve(null).then(() => {
    console.log(2);
  });
}
```

---

## 12. Returning Values And Chaining After Async Functions

Because async functions return Promises, old and new styles can mix.

```js
async function getUserName() {
  const user = await getUser();
  return user.name;
}

// caller can still use old Promise style
getUserName()
  .then((name) => console.log(name))
  .catch(console.error);

// or new style
async function main() {
  try {
    const name = await getUserName();
    console.log(name);
  } catch (err) {
    console.error(err);
  }
}
```

This is why learning Promises is still mandatory even if you mostly write async/await.

---

## 13. Rewrite Drill Table (Practice This)

| Goal | Old Promise code | async/await code |
|---|---|---|
| Wait one promise | `getUser().then(user => ...)` | `const user = await getUser()` |
| Wait then transform | `.then(user => user.name)` | `const name = (await getUser()).name` |
| Handle error | `.catch(err => ...)` | `try/catch` |
| Cleanup | `.finally(() => ...)` | `finally { ... }` |
| Parallel | `Promise.all([...]).then(...)` | `const [a,b] = await Promise.all([...])` |
| First success | `Promise.any([...]).then(...)` | `const v = await Promise.any([...])` |
| Race | `Promise.race([...]).then(...)` | `const v = await Promise.race([...])` |

---

## 14. Full Conversion Example (Interview Favorite)

### Old Promise version

```js
function loadDashboard(userId) {
  return getUser(userId)
    .then((user) => {
      return Promise.all([
        getPosts(user.id),
        getNotifications(user.id)
      ]).then(([posts, notifications]) => {
        return {
          user,
          posts,
          notifications
        };
      });
    })
    .catch((err) => {
      console.error(err);
      throw err;
    })
    .finally(() => {
      console.log('dashboard load finished');
    });
}
```

### New async/await version

```js
async function loadDashboard(userId) {
  try {
    const user = await getUser(userId);

    const [posts, notifications] = await Promise.all([
      getPosts(user.id),
      getNotifications(user.id)
    ]);

    return { user, posts, notifications };
  } catch (err) {
    console.error(err);
    throw err;
  } finally {
    console.log('dashboard load finished');
  }
}
```

What improved?

- no nested `.then`
- values stay in normal variables (`user`, `posts`)
- control flow looks like sync code
- still uses `Promise.all` for parallel work

---

## 15. Common Mistakes (With Old-vs-New Explanation)

### Mistake 1 — Forgetting `await`

```js
async function bad() {
  const user = getUser(); // Promise object
  console.log(user.name); // undefined / wrong
}
```

Old equivalent mistake:

```js
function bad() {
  const userPromise = getUser();
  console.log(userPromise.name); // also wrong
}
```

Correct:

```js
const user = await getUser();
```

or old:

```js
getUser().then((user) => console.log(user.name));
```

### Mistake 2 — Using await in parallel-needed code

```js
// unnecessary waiting
const a = await fetchA();
const b = await fetchB();
```

Old same mistake:

```js
fetchA().then((a) => fetchB().then((b) => [a, b]));
```

Fix both with `Promise.all`.

### Mistake 3 — Thinking async creates threads

No. Still one JS thread + event loop + microtasks.

### Mistake 4 — `forEach(async ...)`

```js
// BAD
await ids.forEach(async (id) => {
  await fetchUser(id);
});
```

`forEach` ignores the Promises your async callback returns.

Use:

```js
for (const id of ids) {
  await fetchUser(id);
}
```

or

```js
await Promise.all(ids.map((id) => fetchUser(id)));
```

---

## 16. Event Loop Output Questions With Await

### Q1

```js
async function f() {
  console.log(1);
  await Promise.resolve();
  console.log(2);
}

console.log(3);
f();
console.log(4);

// 3 1 4 2
```

Old equivalent:

```js
function f() {
  console.log(1);
  return Promise.resolve().then(() => {
    console.log(2);
  });
}
```

### Q2

```js
async function f() {
  console.log('f1');
  await null;
  console.log('f2');
}

async function g() {
  console.log('g1');
  await null;
  console.log('g2');
}

f();
g();
console.log('sync');

// f1 g1 sync f2 g2
```

Because both run sync until await, then both continuations are microtasks in schedule order.

---

## 17. When To Prefer Which Style

| Situation | Prefer |
|---|---|
| Sequential steps, many conditions | `async/await` |
| Independent parallel tasks | `async/await` + `Promise.all` |
| One short chain | either is fine |
| Library returning Promise | consume with await or then |
| Need first settled/first success | `Promise.race` / `Promise.any` (can still await them) |
| Multiple event values over time | Observables (Angular/RxJS), not async/await alone |

Interview answer:

> I prefer async/await for readability in sequential async flows, but I still use Promise combinators like `all`, `race`, and `any` when I need concurrency or race semantics.

---

## 18. Top-Level Await

In ES modules you can do:

```js
const data = await fetch('/api').then((r) => r.json());
```

Old style needed a wrapper:

```js
fetch('/api')
  .then((r) => r.json())
  .then((data) => {
    // use data
  });
```

or:

```js
(async () => {
  const data = await fetch('/api').then((r) => r.json());
})();
```

---

## 19. Perfect Spoken Answer (60–90 sec)

> Before Promises we used nested callbacks, which became callback hell. Promises flattened that with then/catch chains. async/await is syntactic sugar over Promises that makes asynchronous code look synchronous. An async function always returns a Promise, and await pauses only that function until the Promise settles. Under the hood, code after await continues as a microtask, same as then callbacks. For independent requests I still use Promise.all with await. Error handling moves from catch to try/catch, but the behavior is still Promise-based.

---

## 20. Cheat Sheet

```text
CALLBACKS
- nested, hard error handling

PROMISES
- then/catch/finally
- combinators: all/race/any/allSettled

ASYNC/AWAIT
- sugar over Promises
- async fn always returns Promise
- await ~= then continuation
- try/catch ~= catch
- finally ~= finally

REMEMBER
- await pauses function, not whole thread
- sequential await = one-by-one
- parallel = Promise.all
- forget await = you get Promise, not value
- forEach + await = trap
```

---

## 21. Conversion Practice (Do These)

### Practice 1

Convert this to async/await:

```js
function load() {
  return login()
    .then((session) => fetchProfile(session.token))
    .then((profile) => enrich(profile))
    .catch((err) => {
      logError(err);
      throw err;
    });
}
```

<details>
<summary>Answer</summary>

```js
async function load() {
  try {
    const session = await login();
    const profile = await fetchProfile(session.token);
    return await enrich(profile);
  } catch (err) {
    logError(err);
    throw err;
  }
}
```
</details>

### Practice 2

Convert this to Promise `.then` style:

```js
async function load() {
  const user = await getUser();
  const posts = await getPosts(user.id);
  return { user, posts };
}
```

<details>
<summary>Answer</summary>

```js
function load() {
  return getUser().then((user) => {
    return getPosts(user.id).then((posts) => ({ user, posts }));
  });
}
```
</details>

### Practice 3

Make this parallel:

```js
async function load() {
  const a = await fetchA();
  const b = await fetchB();
  return [a, b];
}
```

<details>
<summary>Answer</summary>

```js
async function load() {
  const [a, b] = await Promise.all([fetchA(), fetchB()]);
  return [a, b];
}
```
</details>

---

## 22. Practice Checklist

- [ ] Explain callbacks → Promises → async/await evolution
- [ ] Rewrite one Promise chain into async/await
- [ ] Rewrite one async/await back into `.then`
- [ ] Show sequential vs parallel with both styles
- [ ] Explain why await does not block the main thread
- [ ] Predict at least 2 await output questions
- [ ] Explain try/catch vs `.catch` equivalence

---

## Interview drills

### Race: older API overwrites newer UI

> Ignore/cancel stale responses: request id token, `AbortController`, or RxJS `switchMap` (new call unsubscribes previous).

### try/catch outside async callback

> Outer `try/catch` is sync-only. Errors in later callbacks need handling **inside** the callback, via `.catch`, or `try/catch` around `await` in `async` functions.

See also: `TRICKY_10_FRONTEND_QUESTIONS.md` Q3 & Q5.
