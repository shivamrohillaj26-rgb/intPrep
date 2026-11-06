# Map Async Limit (Promise Pool) — Interview Ready Guide

GreatFrontEnd-style: `**mapAsyncLimit(iterable, callbackFn, size?)**`  
Also known as: async pool, concurrency-limited `map`, `p-limit` + `map`.

Short version also in [DSA_FRONTEND_JS.md](./DSA_FRONTEND_JS.md) §23.

---

## 0. Why this exists — feel the difference (read this first)

### The real problem in one sentence

You have **many** async jobs (fetch user, upload file, resize image).  
You want them **done as a list of results**, but you must **not start all of them at the same second**.

`mapAsyncLimit` = **map** (transform every item) + **async** + **limit** (max N running together).

---



### Analogy: supermarket checkout

You have **8 customers** (items). Each checkout takes **1 minute**.


| Strategy                              | What happens                                   | Peak cashiers busy | Total time |
| ------------------------------------- | ---------------------------------------------- | ------------------ | ---------- |
| **All at once** (`Promise.all` map)   | Open 8 counters instantly                      | **8**              | ~1 min     |
| **Limit 2** (`mapAsyncLimit(..., 2)`) | Only 2 counters; when one frees, next customer | **2**              | ~4 min     |
| **One by one** (`for` + `await`)      | Single counter                                 | **1**              | ~8 min     |


- All-at-once is **fastest** but **expensive / risky** (server melts, browser chokes, API returns 429).  
- Limit 2 is the **compromise**: still parallel, but never more than 2 in flight.  
- Sequential is **safest** but often **too slow**.

`mapAsyncLimit` is that middle lane: *“I want parallelism, but with a speed limit.”*

---



### Concrete fake API — watch “in flight” count

Imagine each call takes **1 second** and we log how many are running:

```js
let inFlight = 0;

async function fakeFetch(id) {
  inFlight++;
  console.log(`START ${id} | inFlight = ${inFlight}`);
  await new Promise((r) => setTimeout(r, 1000)); // 1s work
  inFlight--;
  console.log(`END   ${id} | inFlight = ${inFlight}`);
  return `ok-${id}`;
}

const ids = [1, 2, 3, 4, 5, 6];
```



#### A) Unlimited — `Promise.all` + `map` (the trap)

```js
await Promise.all(ids.map((id) => fakeFetch(id)));
```

Console (simplified):

```text
START 1 | inFlight = 1
START 2 | inFlight = 2
START 3 | inFlight = 3
START 4 | inFlight = 4
START 5 | inFlight = 5
START 6 | inFlight = 6   ← all 6 started immediately
END   … (all finish ~1s later)
```


| Peak in-flight | Wall-clock time |
| -------------- | --------------- |
| **6**          | ~**1s**         |


Fine for 6. Disaster for **600** or **6000**.

#### B) Limit = 2 — `mapAsyncLimit` (the fix)

```js
await mapAsyncLimit(ids, fakeFetch, 2);
```

Console (simplified):

```text
START 1 | inFlight = 1
START 2 | inFlight = 2   ← capped; 3–6 wait
END   1 | inFlight = 1
START 3 | inFlight = 2   ← slot freed → next starts
END   2 | inFlight = 1
START 4 | inFlight = 2
… same pattern until 6 done
```


| Peak in-flight | Wall-clock time                    |
| -------------- | ---------------------------------- |
| **2**          | ~**3s** (6 items ÷ 2 workers × 1s) |


You traded a bit of speed for **safety**.

#### C) Limit = 1 — fully sequential

```js
await mapAsyncLimit(ids, fakeFetch, 1);
// same idea as: for (const id of ids) await fakeFetch(id);
```


| Peak in-flight | Wall-clock time |
| -------------- | --------------- |
| **1**          | ~**6s**         |


---



### Side-by-side timeline (same 6 jobs, each 1s)

```text
UNLIMITED (Promise.all map)
time 0s ████████████  all 6 running
time 1s done
peak = 6

LIMIT 2
time 0s ██____  (1,2)
time 1s __██__  (3,4)
time 2s ____██  (5,6)
time 3s done
peak = 2

LIMIT 1
time 0s █_____
time 1s _█____
...
time 6s done
peak = 1
```

**Same final result array.** Different **how hard you hammer the system** while getting there.

---



### Frontend story that makes it “click”

**Upload 20 photos** from a form.

```js
// BAD — browser opens ~20 uploads at once
await Promise.all(files.map((f) => upload(f)));
// → phone heats up, Wi‑Fi stalls, server rate-limits you, UI freezes

// GOOD — at most 3 uploads at a time; rest wait in line
await mapAsyncLimit(files, (f) => upload(f), 3);
// → steady progress bar, fewer failures, app stays responsive
```

Other real cases:


| Situation                               | Unlimited map                               | With limit (e.g. 3–5) |
| --------------------------------------- | ------------------------------------------- | --------------------- |
| Prefetch 200 product images             | 200 connections fight; many cancel/retry    | Smooth pipeline       |
| Admin “export 50 users” API             | Instant 50 hits → **429 Too Many Requests** | Stays under quota     |
| Call LLM/API with cost + rate limit     | Bill spike + bans                           | Controlled throughput |
| Hydrate dashboard with 40 widgets’ APIs | Main thread + network storm                 | Batched calmly        |


**Difference it made:** not the *shape* of the answer (`['ok-1', …]` stays the same) — the difference is **peak load**, **reliability**, and often **whether the feature works in prod at all**.

---



### What you get back (order still matches input)

Even if job **#4 finishes before #2**, results stay aligned with the input list:

```js
const urls = ['a.jpg', 'b.jpg', 'c.jpg', 'd.jpg'];

// suppose c finishes first, then a, then d, then b
const blobs = await mapAsyncLimit(urls, fetchBlob, 2);

// blobs[0] is still a.jpg's data
// blobs[1] is still b.jpg's data
// … same positions as `urls`
```

How? Write `results[i] = …`, never `results.push(…)` (push would scramble order).

---



### Tiny “need vs not need” decision


| Ask yourself                                         | Use                                  |
| ---------------------------------------------------- | ------------------------------------ |
| Only 2–3 calls, cheap API                            | `Promise.all(items.map(fn))` is fine |
| Tens/hundreds of calls, shared API, uploads, images  | `**mapAsyncLimit(..., 2–8)**`        |
| Must never overlap (strict lock / single connection) | `size = 1`                           |


---



### One picture of the algorithm (before code)

Think of **2 workers** and a **todo list with a shared finger**:

```text
Todo:  [A] [B] [C] [D] [E] [F]
              ↑ nextIndex

Worker1 and Worker2 each:
  1. Grab next index (atomically: i = nextIndex++)
  2. Await work for that item
  3. Put answer in results[i]
  4. Go to step 1 until list empty

At any moment ≤ 2 awaits are running.
When both workers finish → return results.
```

That *is* `mapAsyncLimit`. Everything below is just writing that in JavaScript.

### Paste-and-run (Node) — see the difference yourself

**Ready-made file (recommended):**

```bash
node javascript-interview-prep/map-async-limit.demo.js
```

That script has real inputs: inFlight cap, uppercase map, mixed durations (order), and a reject case.

Or save as `demo-limit.js` after you have the function from §4:

```js
let inFlight = 0;
async function job(id) {
  inFlight++;
  console.log(`START ${id} inFlight=${inFlight}`);
  await new Promise((r) => setTimeout(r, 400));
  inFlight--;
  console.log(`END   ${id} inFlight=${inFlight}`);
  return id * 10;
}

console.log('\n=== UNLIMITED ===');
await Promise.all([1, 2, 3, 4, 5, 6].map(job));

console.log('\n=== LIMIT 2 ===');
await mapAsyncLimit([1, 2, 3, 4, 5, 6], job, 2);

console.log('\n=== LIMIT 1 ===');
await mapAsyncLimit([1, 2, 3, 4, 5, 6], job, 1);
```

Watch `inFlight`: unlimited spikes to 6; limit 2 never goes above 2. Same return shape either way.

---



## 1. What is the question asking?



### Naive approach (usually wrong for large lists)

```js
await Promise.all(items.map((item) => fetchSomething(item)));
```

That starts **all** async tasks at once.


| items  | in-flight requests |
| ------ | ------------------ |
| 4      | 4                  |
| 10_000 | 10_000             |


Browsers and APIs hate that → rate limits, memory spikes, UI jank.

### What they want

Implement `**map**`, but with a **concurrency cap**:

```text
mapAsyncLimit(iterable, callbackFn, size)
```


| Param        | Meaning                                                                                       |
| ------------ | --------------------------------------------------------------------------------------------- |
| `iterable`   | Array of inputs                                                                               |
| `callbackFn` | `(value) => Promise<result>` — async mapper                                                   |
| `size`       | Max number of **in-flight** promises at once (default `Infinity` = same as `Promise.all` map) |


**Return:** `Promise` that resolves to results in the **same order** as the input (even if tasks finish out of order).

### Example (from the prompt)

```js
async function fetchUpperCase(q) {
  // pretend API
  return q.toUpperCase();
}

const results = await mapAsyncLimit(
  ['foo', 'bar', 'qux', 'quz'],
  fetchUpperCase,
  2, // at most 2 pending at a time
);

console.log(results); // ['FOO', 'BAR', 'QUX', 'QUZ']
```

Timeline with `size = 2`:

```text
time →
Worker slots:  [ slotA ] [ slotB ]

Start:  foo, bar          (2 running)
foo ends → start qux      (still ≤ 2)
bar ends → start quz
qux, quz finish
Result array filled by INDEX, not finish order
```

---



## 2. One-liner (say this first)

> It’s `Array.map` + async, but only `size` promises run at once. I keep a shared index into the array, spawn `size` workers that pull the next item when free, store each result at its original index, then `Promise.all` the workers.

---



## 3. Core idea — worker pool

Don’t think “queue library.” Think **N workers sharing one cursor**:

```text
items:  [0] [1] [2] [3] [4] ...
                 ↑
               nextIndex (shared)

Worker 1: take nextIndex → run callback → write results[i] → repeat
Worker 2: same
...
Worker size: same

When nextIndex >= length → worker stops
When all workers done → return results
```

Why this works:

- At most `size` `callbackFn` calls are awaiting at once  
- Order is preserved because we save `results[i]`, not `results.push`  
- Empty list → no workers → resolve `[]`

---



## 4. Interview implementation (recommended)

```js
/**
 * @param {Array<unknown>} iterable
 * @param {(value: unknown) => Promise<unknown>} callbackFn
 * @param {number} [size=Infinity]
 * @return {Promise<Array<unknown>>}
 */
export default async function mapAsyncLimit(iterable, callbackFn, size = Infinity) {
  const items = [...iterable]; // copy if needed; or Array.from(iterable)
  const n = items.length;
  if (n === 0) return [];

  const limit = Math.min(size, n); // never spawn more workers than items
  const results = new Array(n);
  let nextIndex = 0;

  async function worker() {
    while (true) {
      const i = nextIndex++;
      if (i >= n) return;

      // await one task; only then loop for another → caps concurrency
      results[i] = await callbackFn(items[i], i);
    }
  }

  // start `limit` workers in parallel (see simplified form below)
  const workers = [];
  for (let w = 0; w < limit; w++) {
    workers.push(worker()); // calling worker() STARTS that loop immediately
  }
  await Promise.all(workers); // wait until every worker has stopped
  return results;
}
```

> Interview tip: you can write the compact form too — same meaning:
> `return Promise.all(Array.from({ length: limit }, () => worker())).then(() => results);`



### Those last lines, simplified

**Goal:** start 2 (or N) workers at the same time, wait for all of them, return answers.

```js
// SAME IDEA — verbose / easy to read
const workers = [];
for (let w = 0; w < limit; w++) {
  workers.push(worker()); // start one worker; it returns a Promise
}
await Promise.all(workers); // “don’t continue until all workers are done”
return results;
```

```js
// SAME IDEA — short form (what many solutions use)
const workers = Array.from({ length: limit }, () => worker());
return Promise.all(workers).then(() => results);
```

Break the short form:


| Piece                             | Meaning                                                             |
| --------------------------------- | ------------------------------------------------------------------- |
| `{ length: limit }`               | “I want an array-shaped thing of size `limit`” (e.g. 2 empty slots) |
| `Array.from(..., () => worker())` | For each slot, **call** `worker()` → get a Promise, collect them    |
| `workers`                         | e.g. `[Promise, Promise]` — two running loops                       |
| `Promise.all(workers)`            | Wait until **both** Promises finish                                 |
| `.then(() => results)`            | After that, give back the filled `results` array                    |


If `limit = 2`, picture:

```text
workers[0] = worker()  →  Worker1 starts grabbing jobs
workers[1] = worker()  →  Worker2 starts grabbing jobs
         ↓
Promise.all waits for both to return
         ↓
return results
```

`worker()` is **not** “schedule for later” — calling it **starts** the async function right away.  
`Promise.all` only means “I’ll wait here until those started workers are finished.”

### Why `Math.min(size, n)`?

If `size = 100` but only 3 items, you only need 3 workers.

### Why not `results.push`?

Finish order ≠ input order. Index write keeps order.

### Line-by-line (what every line does)

```js
export default function mapAsyncLimit(iterable, callbackFn, size = Infinity) {
```

- Declares the function.
- `iterable` — list of inputs (array, etc.).
- `callbackFn` — async function for **one** item → returns a Promise.
- `size = Infinity` — if caller omits size, behave like unlimited (`Promise.all` map).

```js
  const items = [...iterable];
  const n = items.length;
```

- Copy into a real array (so we can use `.length` and `items[i]` safely).
- `n` = how many jobs total.

```js
  if (n === 0) return Promise.resolve([]);
```

- Empty input → immediately return an empty array Promise. No workers needed.

```js
  const limit = Math.min(size, n);
```

- How many workers to start.
- Example: 4 items, `size = 2` → `limit = 2`.
- Example: 3 items, `size = 100` → `limit = 3` (extra workers would do nothing).

```js
  const results = new Array(n);
  let nextIndex = 0;
```

- `results` — pre-sized output array; we fill `results[0]`, `results[1]`, … later.
- `nextIndex` — shared “finger” on the todo list. Next free job index. Starts at 0.
- All workers **share** this one `nextIndex` (closure).

```js
  async function worker() {
    while (true) {
```

- One worker = one async loop that keeps taking jobs until none left.
- `while (true)` means “keep going until we `return`.”

```js
      const i = nextIndex++;
```

- **Most important line for the pool.**
- Read current `nextIndex`, then immediately bump it by 1.
- Example: `nextIndex` was 0 → this worker gets `i = 0`, now `nextIndex` is 1.
- Next worker/call gets 1, then 2, … so two workers never steal the same index.

```js
      if (i >= n) return;
```

- If index is past the end of the list, this worker is done → exit the loop.
- Example: `n = 4`, worker gets `i = 4` → stop.

```js
      results[i] = await callbackFn(items[i], i);
```

- Run the async job for item at index `i`.
- `await` **pauses this worker only** until that Promise finishes.
- While this worker is waiting, other workers can still run (that’s the parallelism).
- Because we `await` before looping again, **this worker** never starts a 2nd job until the 1st finishes → across `limit` workers, at most `limit` jobs are in flight.
- Store answer at `results[i]` so order matches input (not finish order).

```js
    }  // end while — loop back, grab next index
  }
```

```js
  const workers = [];
  for (let w = 0; w < limit; w++) {
    workers.push(worker());
  }
  await Promise.all(workers);
  return results;
```

- Loop `limit` times; each `worker()` **starts** one async loop and returns a Promise.
- `Promise.all` = wait until all those Promises finish.
- Then return `results`.
- Short form of the same thing: `Array.from({ length: limit }, () => worker())` + `Promise.all(...).then(() => results)`.

**Mental glue:** `limit` workers + shared `nextIndex++` + `await` before next grab = concurrency cap. `results[i]` = correct order.

---



## 5. Dry run (`size = 2`)

```text
items = [A, B, C, D]
limit = 2
results = [_, _, _, _]
nextIndex = 0

t0: Worker1 takes i=0 → starts A
    Worker2 takes i=1 → starts B
    nextIndex = 2
    in-flight: A, B

t1: A finishes → results[0] = RA
    Worker1 takes i=2 → starts C
    in-flight: B, C

t2: B finishes → results[1] = RB
    Worker2 takes i=3 → starts D
    in-flight: C, D

t3: C, D finish → results[2], results[3]
    both workers see nextIndex >= 4 → exit

Promise.all(workers) resolves → return results
```

---



## 6. Edge cases (ask / handle)


| Case                        | Behavior                                                                                      |
| --------------------------- | --------------------------------------------------------------------------------------------- |
| `size` omitted / `Infinity` | Same as unlimited parallel map                                                                |
| `size = 1`                  | Fully sequential                                                                              |
| `size = 0`                  | Ambiguous — usually treat as invalid or no-op; ask. Safe: `if (size < 1) throw` or treat as 1 |
| Empty iterable              | `[]` immediately                                                                              |
| `callbackFn` rejects        | Default: **fail fast** — whole `mapAsyncLimit` rejects (like `Promise.all`)                   |
| Non-array iterable          | `Array.from(iterable)`                                                                        |


Fail-fast (default, matches `Promise.all`):

```js
results[i] = await callbackFn(items[i]); // rejection rejects worker → Promise.all rejects
```

Collect errors (only if they ask):

```js
const settled = await Promise.allSettled(/* ... */); // different API
```

---



## 7. Alternate mental models (same idea)



### A) Pool of promises + refill (more verbose)

Keep a `Set` of in-flight promises; when one settles, start the next. Harder to write cleanly in interview — prefer workers.

### B) Recursive “start next when one finishes”

Same pool idea; workers loop is clearer.

### C) Library equivalents

- `p-limit` + map  
- `p-map` with `{ concurrency: size }`  
In interview: implement yourself.

---



## 8. Complexity


|       |                                                                         |
| ----- | ----------------------------------------------------------------------- |
| Time  | Dominated by async work; wall-clock ≈ totalWork / concurrency (roughly) |
| Space | `O(n)` for results + `O(size)` workers                                  |


---



## 9. Frontend why it matters


| Use case                     | Why limit                  |
| ---------------------------- | -------------------------- |
| Prefetch many images         | Browser connection limits  |
| Bulk API calls               | Rate limits / 429s         |
| Upload queue                 | Don’t open 200 connections |
| Hydration / SSR data fan-out | Protect origin             |


**Angular/RxJS cousin:** `mergeMap(fn, concurrency)` — same idea on streams. See [RXJS_INTERVIEW.md](./RXJS_INTERVIEW.md).

---



## 10. Compare related APIs


| API                             | Behavior                                                            |
| ------------------------------- | ------------------------------------------------------------------- |
| `Promise.all(arr.map(fn))`      | Unlimited concurrency                                               |
| `mapAsyncLimit(..., 2)`         | Max 2 in flight                                                     |
| Sequential `for...of` + `await` | Concurrency 1                                                       |
| `Promise.allSettled`            | Wait all; collect fulfill/reject (no concurrency control by itself) |


---



## 11. Typed version (optional)

```ts
async function mapAsyncLimit<T, R>(
  iterable: Iterable<T>,
  callbackFn: (value: T, index: number) => Promise<R>,
  size = Infinity,
): Promise<R[]> {
  const items = Array.from(iterable);
  const n = items.length;
  if (n === 0) return [];

  const limit = Math.min(Number.isFinite(size) ? size : n, n);
  if (limit < 1) return [];

  const results = new Array<R>(n);
  let nextIndex = 0;

  async function worker(): Promise<void> {
    while (true) {
      const i = nextIndex++;
      if (i >= n) return;
      results[i] = await callbackFn(items[i], i);
    }
  }

  await Promise.all(Array.from({ length: limit }, () => worker()));
  return results;
}
```

---



## 12. Common mistakes

1. `Promise.all(items.map(...))` — ignores `size`
2. `results.push(await ...)` — wrong order
3. Spawning `size` tasks once without refill — only processes first batch
4. Shared `i` without careful increment — race; use `const i = nextIndex++` in one statement
5. Forgetting empty-array fast path

---



## 13. Interview Q&A

**Q: How do you preserve order?**  
A: Write `results[index]`, never push in completion order.

**Q: How is concurrency enforced?**  
A: Only `size` worker loops run; each awaits one task before taking another.

**Q: What if one fails?**  
A: Like `Promise.all` — reject the outer promise unless asked for `allSettled` behavior.

**Q: Difference from a queue?**  
A: Same idea; workers + shared index is a compact queue.

**Q:** `size > items.length`**?**  
A: `Math.min` — extra workers would no-op immediately.

---



## 14. Spoken answers

**30s — why it exists**

> Promise.all with map starts every request at once. That’s fine for three calls, but twenty uploads or two hundred fetches can hit rate limits and freeze the UI. mapAsyncLimit is the same map, but only N jobs run at a time — when one finishes, the next starts. Results stay in input order; the difference is peak load, not the final array shape.

**30s — how I’d build it**

> I start `size` worker loops that share a nextIndex counter. Each worker takes an index, awaits the callback, writes results[i], and loops until the list is done. Then I await Promise.all on the workers.

**60s**

> Promise.all on a full map is unlimited concurrency — bad for 1000 fetches. With a limit of 2 I create two async workers sharing nextIndex. Each worker does const i = nextIndex++, awaits callbackFn(items[i]), assigns results[i], and repeats. Promise.all on the workers finishes when every item is processed. If size is omitted I treat it as Infinity. Rejections fail fast unless the interviewer wants settled results. Think supermarket: unlimited opens every checkout; limit 2 keeps only two busy and queues the rest.

---



## 15. What to write first on a whiteboard

```text
1. results = Array(n)
2. nextIndex = 0
3. worker = async () => { while take i; results[i] = await fn(items[i]) }
4. await Promise.all( Array(limit).fill(0).map(worker) )
5. return results
```

---



## 16. Practice checklist

- [ ] Explain vs `Promise.all(map)`  
- [ ] Draw worker pool + shared index  
- [ ] Code without looking  
- [ ] Dry-run size=2 on 4 items  
- [ ] Mention order via `results[i]`  
- [ ] Mention fail-fast on reject  
- [ ] Tie to FE rate limiting / `mergeMap(fn, n)`  

---



## 17. Cheat card

```text
Problem: async map with max N in flight
Pattern: N workers + shared nextIndex
Order:   results[i] = await fn(items[i])
Done:    await Promise.all(workers)
Empty:   return []
Default size: Infinity ≈ Promise.all
Fail:    one reject → whole promise rejects
```

