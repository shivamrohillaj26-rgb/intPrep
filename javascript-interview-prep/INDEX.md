# JavaScript Interview Prep — Topic Index

All guides are interview-ready with explanations, examples, and practice checklists.

## Core Topics

| Topic | File |
|---|---|
| Event Loop (output questions) | [EVENT_LOOP.md](./EVENT_LOOP.md) |
| Objects & OOP | [OBJECTS_AND_OOP.md](./OBJECTS_AND_OOP.md) |
| Polyfills (native + implementation) | [POLYFILLS_README.md](./POLYFILLS_README.md) |
| Questions from `Questions1.txt` | [README.md](./README.md) |

## New Topic Guides

| Topic | File |
|---|---|
| Promises | [PROMISES.md](./PROMISES.md) |
| Async / Await | [ASYNC_AWAIT.md](./ASYNC_AWAIT.md) |
| Promises vs Observables | [PROMISES_VS_OBSERVABLES.md](./PROMISES_VS_OBSERVABLES.md) |
| **RxJS interview** (operators, flattening, Subjects, tricky Qs) | [RXJS_INTERVIEW.md](./RXJS_INTERVIEW.md) |
| Functions | [FUNCTIONS.md](./FUNCTIONS.md) |
| **Scopes** (lexical, var/let/const, TDZ, closures) | [SCOPES.md](./SCOPES.md) |
| Prototype Chaining | [PROTOTYPE_CHAINING.md](./PROTOTYPE_CHAINING.md) |
| Deep Clone Implementation | [DEEP_CLONE.md](./DEEP_CLONE.md) |
| Deep Equal (twin of deep clone) | [DEEP_EQUAL.md](./DEEP_EQUAL.md) |
| Debounce & Throttle | [DEBOUNCE_THROTTLE.md](./DEBOUNCE_THROTTLE.md) |
| WeakMap & WeakSet | [WEAKMAP_WEAKSET.md](./WEAKMAP_WEAKSET.md) |
| LRU Cache | [LRU_CACHE.md](./LRU_CACHE.md) |
| Event Bubbling / Capturing / Delegation (deep + tricky Qs) | [EVENT_BUBBLING_CAPTURING_DELEGATION.md](./EVENT_BUBBLING_CAPTURING_DELEGATION.md) |
| EventEmitter From Scratch | [EVENT_EMITTER.md](./EVENT_EMITTER.md) |
| Type Coercion | [TYPE_COERCION.md](./TYPE_COERCION.md) |
| Frontend DSA / JS Coding | [DSA_FRONTEND_JS.md](./DSA_FRONTEND_JS.md) — **§1b 3Sum** (Map vs two-pointer O(1) extra) |
| Custom sort by priority map (easy→medium→hard) | [CUSTOM_SORT_PRIORITY.md](./CUSTOM_SORT_PRIORITY.md) |
| API timeout + retry (`Promise.race` + Angular RxJS `timeout`/`retry`) | [API_TIMEOUT_RETRY.md](./API_TIMEOUT_RETRY.md) |
| Script `async` / `defer` | [ASYNC_DEFER.md](./ASYNC_DEFER.md) |
| Tricky 10 frontend questions (map + answers) | [TRICKY_10_FRONTEND_QUESTIONS.md](./TRICKY_10_FRONTEND_QUESTIONS.md) |
| **pipe() / compose()** (FP, vs RxJS pipe) | [PIPE_COMPOSE.md](./PIPE_COMPOSE.md) |
| Reusable **filter + sort** util | [FILTER_SORT_UTIL.md](./FILTER_SORT_UTIL.md) |
| **Coding round classics** (productExceptSelf, 3Sum, LIS…) | [DSA_CODING_ROUND_CLASSICS.md](./DSA_CODING_ROUND_CLASSICS.md) |
| **mapAsyncLimit** / Promise pool (concurrency cap) | [MAP_ASYNC_LIMIT.md](./MAP_ASYNC_LIMIT.md) |
| **Cancellable fetch** (`AbortController` wrapper) | [CANCELLABLE_FETCH.md](./CANCELLABLE_FETCH.md) |
| **`once(fn)`** util | [ONCE_FN.md](./ONCE_FN.md) |
| **Generate parentheses** (backtracking) | [GENERATE_PARENTHESES.md](./GENERATE_PARENTHESES.md) |
| **Running median** (two heaps) | [RUNNING_MEDIAN.md](./RUNNING_MEDIAN.md) |
| **`set` by path + snake↔camel** | [OBJECT_PATH_UTILS.md](./OBJECT_PATH_UTILS.md) |
| **Infinite scroll fetch + races** | [INFINITE_SCROLL_RACE.md](./INFINITE_SCROLL_RACE.md) |

## Suggested Study Order

1. **Scopes** ← [SCOPES.md](./SCOPES.md)
2. Functions
3. Objects & OOP
4. Prototype Chaining
5. Promises
6. Async/Await
7. Event Loop
8. Debounce & Throttle
9. Deep Clone
10. WeakMap & WeakSet
11. Event Bubbling / Delegation
12. LRU Cache
13. Promises vs Observables (Angular focus)
14. Polyfills
15. RxJS (Angular)

## Companion Code

- `examples.js` — runnable examples for Questions1 topics
- `map-async-limit.demo.js` — **run this** to see concurrency cap + order (`node javascript-interview-prep/map-async-limit.demo.js`)
- `../practice/polyfills.js` — polyfill implementations to run with Node
