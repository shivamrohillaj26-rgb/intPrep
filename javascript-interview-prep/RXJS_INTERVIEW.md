# RxJS Interview Guide — Operators, Use Cases & Tricky Questions

Deep, interview-ready RxJS prep (Angular-heavy).  
Pairs with [PROMISES_VS_OBSERVABLES.md](./PROMISES_VS_OBSERVABLES.md) and [API_TIMEOUT_RETRY.md](./API_TIMEOUT_RETRY.md) §13.

> Most failed topic in Angular rounds: **wrong flattening operator** + **subscription leaks**.  
> Nail `switchMap` / `mergeMap` / `concatMap` / `exhaustMap` and you’re already ahead.

---

## 0. One-minute mental model

| Idea | Meaning |
|---|---|
| **Observable** | Lazy recipe for a stream of values over time |
| **Observer** | `{ next, error, complete }` consumer |
| **Subscription** | Running execution; call `unsubscribe` to cancel |
| **Operator** | Pure transform in `.pipe(...)` — compose small steps |
| **Higher-order mapping** | Map a value → **inner Observable**, then flatten |

```text
Producer  ──next──►  pipe(ops…)  ──next──►  Subscriber
              │
         unsubscribe / error / complete → teardown
```

**Promise vs Observable (say this):**

> Promise = one eager async result. Observable = lazy, many values, cancellable, rich operators.

---

## 1. Cold vs hot (classic tricky ask)

| | Cold | Hot |
|---|---|---|
| When producer starts | On **each** subscribe | Outside / shared — runs with or without you |
| Subscribers | Each gets **own** execution | Share **one** execution |
| Analogy | YouTube **VOD** (press play → starts from beginning) | **Live** TV (tune in late → miss past) |
| Example | `http.get`, `of`, `new Observable(...)` | DOM events, `Subject`, WebSocket, `shareReplay` |

```ts
import { Observable } from 'rxjs';

// COLD — each subscribe logs "start" and gets its own 1,2,3
const cold$ = new Observable<number>((sub) => {
  console.log('start');
  sub.next(1);
  sub.next(2);
  sub.complete();
});

cold$.subscribe(console.log); // start, 1, 2
cold$.subscribe(console.log); // start, 1, 2  ← second full run
```

```ts
import { Subject } from 'rxjs';

// HOT — late subscriber misses earlier values
const hot$ = new Subject<number>();
hot$.subscribe((v) => console.log('A', v));
hot$.next(1);
hot$.subscribe((v) => console.log('B', v)); // misses 1
hot$.next(2); // A 2, B 2
```

**Interview trap:** “Why did my HTTP fire twice?”  
→ Two subscribers on a **cold** `http.get` without `shareReplay` / `share`.

---

## 2. Creating Observables (quick map)

| Creator | Use |
|---|---|
| `of(1,2,3)` | Sync values then complete |
| `from([1,2])` / `from(promise)` | Array or Promise → stream |
| `fromEvent(el, 'click')` | DOM / Node events |
| `interval(1000)` / `timer(0, 5000)` | Polling / ticks |
| `ajax` / Angular `HttpClient` | HTTP (cold) |
| `new Observable(sub => { … return teardown })` | Custom producer |
| `EMPTY` / `NEVER` / `throwError(() => e)` | Edge streams |

```ts
const ticks$ = timer(0, 5000); // emit 0 immediately, then every 5s
```

---

## 3. Core operators you’ll use every day

### Transform / peek / filter

```ts
source$.pipe(
  map((x) => x * 2),           // transform value
  filter((x) => x > 10),       // keep some
  tap((x) => console.log(x)),  // side effect ONLY — don’t change stream logic here
  take(5),                     // complete after 5
);
```

| Operator | Role |
|---|---|
| `map` | Pure value → value |
| `tap` | Spy / logging / analytics (no business transform) |
| `filter` | Predicate gate |
| `take(n)` / `first()` | Finite take then complete |
| `takeUntil(notifier$)` | Complete when notifier emits |
| `takeUntilDestroyed()` | Angular — auto teardown with destroy |
| `skip` / `distinctUntilChanged` | Drop noise / duplicates |

**Tricky:** `map` vs `tap`  
> `map` changes the value downstream. `tap` is for side effects; returning from `tap` does **not** replace the value.

---

## 4. The big four — flattening operators (decide the round)

All four: **outer value → inner Observable → flatten**.  
Difference = what happens when a **new outer** value arrives while an **inner** is still running.

```text
Outer:  --a------b------c---->
Inner:     (HTTP / timer / etc.)
```

| Operator | Overlapping inners | Memory aid | Primary use |
|---|---|---|---|
| **`switchMap`** | **Cancel** previous, switch to latest | “only latest matters” | Typeahead / search |
| **`mergeMap`** | Run **all** in parallel | “fire all” | Independent parallel work |
| **`concatMap`** | **Queue** — one after another | “wait your turn” | Ordered writes / steps |
| **`exhaustMap`** | **Ignore** new while busy | “I’m busy, go away” | Login / pay button spam |

`flatMap` = alias of `mergeMap` (prefer `mergeMap` name).

### 4.1 Timeline intuition

```text
Outer clicks:     c1--------c2--------c3---->
Inner duration:   ====long====

switchMap:        [====c1..X][====c2..X][==c3==]   ← cancel old
mergeMap:         [====c1====]
                       [====c2====]
                            [====c3====]           ← all run
concatMap:        [====c1====][====c2====][==c3==] ← queue
exhaustMap:       [====c1====]..........[==c3==]   ← c2 ignored while busy
```

### 4.2 Deep example — typeahead (`switchMap`)

```ts
this.searchCtrl.valueChanges.pipe(
  debounceTime(300),
  distinctUntilChanged(),
  switchMap((q) =>
    q.trim()
      ? this.http.get<Item[]>(`/api/search?q=${q}`)
      : of([] as Item[]),
  ),
).subscribe((items) => this.results = items);
```

| Why this stack | |
|---|---|
| `debounceTime` | Don’t hit API every keystroke |
| `distinctUntilChanged` | Skip same query |
| `switchMap` | New keystroke **cancels** previous HTTP → no stale “slow old query” overwriting UI |

**Stale-results bug:** used `mergeMap` instead of `switchMap` → old slow response arrives last and wins.

### 4.3 Deep example — save queue (`concatMap`)

```ts
this.saveClicks$.pipe(
  concatMap((draft) => this.http.put(`/docs/${draft.id}`, draft)),
).subscribe();
```

Saves run **in order**. Prevents “save 2 finished before save 1” corrupting server state.

### 4.4 Deep example — parallel fan-out (`mergeMap`)

```ts
of(1, 2, 3).pipe(
  mergeMap((id) => this.http.get(`/users/${id}`)), // 3 in parallel
).subscribe(console.log); // order not guaranteed
```

Cap concurrency: `mergeMap(fn, 2)` → max 2 inners at once.

### 4.5 Deep example — double-submit (`exhaustMap`)

```ts
this.submit$.pipe(
  exhaustMap(() => this.http.post('/checkout', this.cart)),
).subscribe();
```

While checkout is in flight, extra clicks are **ignored**.  
`switchMap` here would **cancel** the first payment mid-flight — dangerous.

### 4.6 Decision tree (memorize)

```text
Need cancel previous (search)?           → switchMap
Need ignore spam while busy (submit)?    → exhaustMap
Must preserve order / no overlap?        → concatMap
Independent parallel OK?                 → mergeMap
```

**90% Angular UI rule of thumb:** typeahead → `switchMap`; buttons → `exhaustMap`.

---

## 5. Time operators

| Operator | Behavior | Use |
|---|---|---|
| `debounceTime(ms)` | Wait for **silence** of ms, then emit latest | Search input |
| `throttleTime(ms)` | Emit, then **ignore** for ms | Scroll / resize handlers |
| `auditTime(ms)` | Emit **latest** at end of each window | Trailing sample of bursts |
| `sampleTime(ms)` / `sample` | Periodic sample | |
| `delay(ms)` | Shift emissions in time | UX stagger |
| `timeout(ms)` | Error if nothing in time | See [API_TIMEOUT_RETRY.md](./API_TIMEOUT_RETRY.md) |

```ts
// debounce vs throttle
input$.pipe(debounceTime(300)); // "stop typing, then search"
scroll$.pipe(throttleTime(100)); // "at most ~10 updates/sec"
```

**Tricky compare:**

| | debounceTime | throttleTime |
|---|---|---|
| Leading burst | Waits until quiet | Emits early, then gates |
| Search box | ✅ | Usually wrong |
| Scroll position | Can feel laggy | ✅ |

---

## 6. Combining streams

| Operator | Emits when | Completes when | Like |
|---|---|---|---|
| **`forkJoin`** | All sources **complete** → one array/object | After that one emit | `Promise.all` |
| **`combineLatest`** | Any source emits (after each has emitted ≥1) | All complete | Reactive “current snapshot” |
| **`zip`** | Pair by **index** (waits for matching slots) | Shortest completes | Zipper |
| **`withLatestFrom`** | **Primary** emits; samples latest from others | With primary | “click + latest form value” |
| **`merge`** | Any source emits (interleaved) | All complete | Merge lanes |
| **`concat`** | First source fully, then next | All done in order | Sequence streams |

### forkJoin — wait for all HTTP

```ts
forkJoin({
  user: this.http.get('/user'),
  perms: this.http.get('/perms'),
}).subscribe(({ user, perms }) => { … });
// One emit when BOTH complete. If one errors → whole forkJoin errors (unless caught).
```

### combineLatest — dashboard filters

```ts
combineLatest([this.page$, this.sort$, this.filter$]).pipe(
  switchMap(([page, sort, filter]) =>
    this.http.get('/items', { params: { page, sort, filter } }),
  ),
);
```

Emits whenever **any** filter changes (after all have initial values).

### withLatestFrom — action + latest state

```ts
this.saveClick$.pipe(
  withLatestFrom(this.form.valueChanges.pipe(startWith(this.form.value))),
  exhaustMap(([_, value]) => this.api.save(value)),
);
```

### zip trap

```ts
zip(of('a', 'b'), interval(1000)).subscribe(console.log);
// ['a', 0] then ['b', 1] — waits for pairs; NOT "latest of each"
```

**Interview line:**

> `forkJoin` = Promise.all for completions. `combineLatest` = ongoing latest tuple. `zip` = index pairing. `withLatestFrom` = trigger stream + sample others.

---

## 7. Subjects — multicast + push

A **Subject** is both Observable **and** Observer — you can `.next()` into it and many can subscribe (multicast / hot).

| Type | Initial / replay | Use |
|---|---|---|
| `Subject` | None — only future values | Event bus, one-shot events |
| `BehaviorSubject` | Needs **seed**; replays **current** to new subs | App state / “current user” |
| `ReplaySubject(n)` | Replays last **n** (or time window) | Late subscribers need history |
| `AsyncSubject` | Only **last** value on **complete** | Rare |

```ts
const user$ = new BehaviorSubject<User | null>(null);

user$.subscribe(console.log); // immediately gets null (or current)
user$.next({ id: 1, name: 'Ada' }); // all subs get update

// read sync (BehaviorSubject only)
const snapshot = user$.value;
```

**Don’t** expose `BehaviorSubject` publicly if you want encapsulation — expose `asObservable()`:

```ts
private readonly _user = new BehaviorSubject<User | null>(null);
readonly user$ = this._user.asObservable();
setUser(u: User) { this._user.next(u); }
```

---

## 8. Multicasting — `share` / `shareReplay` (tricky leaks)

**Problem:** two template `async` pipes → two HTTP calls on cold Observable.

```ts
// ❌ two subscribers = two GETs
user$ = this.http.get('/user');
```

```ts
// ✅ share one execution + replay last to late subscribers
user$ = this.http.get<User>('/user').pipe(
  shareReplay({ bufferSize: 1, refCount: true }),
);
```

| Option | Meaning |
|---|---|
| `bufferSize: 1` | Keep last value for new subscribers |
| `refCount: true` | When subscriber count → 0, **unsubscribe** upstream (can refetch later) |
| `refCount: false` (old `shareReplay(1)` default feel) | Keeps source alive forever → **memory leak** risk in long-lived apps |

**Interview trap:** `shareReplay(1)` without `{ refCount: true }` in a root service can pin subscriptions forever.

---

## 9. Errors, retry, timeout

Errors **terminate** the stream unless handled.

```ts
this.http.get('/api').pipe(
  timeout(3000),
  retry({ count: 1, delay: 200 }),
  catchError((err) => {
    console.error(err);
    return of([] as Item[]); // recover → stream can continue/complete with fallback
  }),
);
```

| Operator | Role |
|---|---|
| `catchError` | Handle + return a **new** Observable (fallback or `throwError`) |
| `retry` / `retry({ count })` | Re-subscribe source on error |
| `timeout` | Error if too slow |
| `throwError(() => e)` | Create error Observable |

**Order:** `timeout` → `retry` → `catchError` (see [API_TIMEOUT_RETRY.md](./API_TIMEOUT_RETRY.md) §13).

**Tricky:** after `error`, without `catchError`, subscribers won’t get more `next`s on that subscription.

---

## 10. Memory leaks & teardown (always asked)

### Causes

1. `subscribe` in component without unsubscribe  
2. Long-lived `interval` / WebSocket  
3. `shareReplay` without `refCount`  
4. Nested subscriptions (`subscribe` inside `subscribe`) instead of `switchMap`

### Fixes (prefer in this order)

| Approach | When |
|---|---|
| **`async` pipe** | Stable in templates — auto sub/unsub |
| **`takeUntilDestroyed()`** | Manual subscribe in modern Angular |
| **`toSignal(obs$)`** | Bridge to signals; tied to injector destroy |
| `takeUntil(destroy$)` | Older pattern with `Subject` in `ngOnDestroy` |
| `take(1)` | One-shot then auto-complete |

```ts
import { takeUntilDestroyed } from '@angular/core/rxjs-interop';

this.api.live().pipe(takeUntilDestroyed()).subscribe((v) => this.v = v);
```

**HttpClient:** unsubscribing **cancels** the in-flight request — big advantage over bare Promises.

---

## 11. Angular real-world recipes

### A. Typeahead (golden path)

```ts
results$ = this.query$.pipe(
  debounceTime(300),
  distinctUntilChanged(),
  switchMap((q) => this.api.search(q).pipe(
    catchError(() => of([])),
  )),
);
```

### B. Login button — no double submit

```ts
this.loginClick$.pipe(
  exhaustMap(() => this.auth.login(this.form.value).pipe(
    catchError((e) => {
      this.error.set(e.message);
      return EMPTY;
    }),
  )),
).subscribe((session) => this.router.navigateByUrl('/home'));
```

### C. Polling

```ts
status$ = timer(0, 5000).pipe(
  switchMap(() => this.api.getStatus().pipe(
    catchError(() => of({ ok: false })),
  )),
  takeUntilDestroyed(),
);
```

Use `switchMap` so a slow poll doesn’t stack (`mergeMap` would pile up).

### D. Parallel page load

```ts
data$ = forkJoin({
  profile: this.api.profile(),
  feed: this.api.feed(),
}).pipe(catchError(() => of(null)));
```

### E. Dependent calls (user then orders)

```ts
orders$ = this.api.getUser().pipe(
  switchMap((user) => this.api.getOrders(user.id)),
);
```

### F. Signals coexistence (2024–2026)

```ts
// RxJS in → signal out
items = toSignal(this.api.list(), { initialValue: [] });

// signal out → RxJS in (for debounce/switchMap)
query$ = toObservable(this.querySignal);
results$ = this.query$.pipe(
  debounceTime(300),
  switchMap((q) => this.api.search(q)),
);
```

> Signals don’t replace RxJS for async streams; they replace a lot of **sync UI state**. Bridge with `toSignal` / `toObservable`.

**Full compare (interview):** [../angular-interview-prep/ANGULAR_SIGNALS_VS_RXJS.md](../angular-interview-prep/ANGULAR_SIGNALS_VS_RXJS.md)

---

## 12. Higher-order Observables (what “flatten” means)

```ts
// BAD mental model: Observable<Observable<User>>
const bad$ = ids$.pipe(map((id) => this.http.get(`/u/${id}`)));
// You get Observables as values — must subscribe inner (nested hell)

// GOOD: flatten with *Map
const good$ = ids$.pipe(mergeMap((id) => this.http.get(`/u/${id}`)));
```

If interviewer says “higher-order Observable,” they mean **Observable of Observables** — solve with `*Map` / `switchAll` / `mergeAll`.

---

## 13. Tricky questions bank (researched + model answers)

Compiled from common Angular/RxJS interview patterns (flattening ops, Subjects, combine operators, leaks, shareReplay).

### Fundamentals

**Q1. What is an Observable?**  
> Lazy push stream of 0..N values over time, with error/complete and cancellable subscription.

**Q2. Promise vs Observable?**  
> Promise: eager, one value, not cancellable. Observable: lazy, many, cancellable, operators.

**Q3. Cold vs hot?**  
> Cold: per-subscriber execution (HTTP). Hot: shared execution (Subject, DOM, shared streams).

**Q4. What does `pipe` do?**  
> Composes operators into a new Observable without subscribing yet.

### Subjects

**Q5. Subject vs BehaviorSubject?**  
> Subject: no current value; late subs miss past. BehaviorSubject: seed + always has current; new sub gets latest immediately.

**Q6. When ReplaySubject?**  
> Late subscriber must see last N emissions (e.g. last 5 WS messages).

### Flattening (highest weight)

**Q7. switchMap vs mergeMap vs concatMap vs exhaustMap?**  
> Switch cancels previous; merge runs parallel; concat queues ordered; exhaust ignores while busy.  
> Search → switch; spam button → exhaust; ordered saves → concat; fan-out → merge.

**Q8. Typeahead shows wrong results — why?**  
> Likely `mergeMap`/`concatMap` — use `switchMap` + debounce so only latest response wins.

**Q9. Why not switchMap on payment click?**  
> New click cancels in-flight payment. Use `exhaustMap`.

### Combining

**Q10. forkJoin vs combineLatest vs zip?**  
> forkJoin: one result when all complete. combineLatest: any emit after all primed. zip: pair by index.

**Q11. withLatestFrom vs combineLatest?**  
> withLatestFrom emits only when **primary** emits; combineLatest emits when **any** emits.

### Multicasting / leaks

**Q12. HTTP runs twice in template — fix?**  
> Two `async` pipes on cold obs → `shareReplay({ bufferSize: 1, refCount: true })` or single `async` + local var / `toSignal`.

**Q13. shareReplay memory leak?**  
> Without `refCount: true`, source may stay subscribed forever after last consumer leaves.

**Q14. How do you unsubscribe in Angular today?**  
> `async` pipe, `takeUntilDestroyed()`, `toSignal`, or destroy notifier. Prefer not hand-rolling unless needed.

### Errors / resilience

**Q15. Does catchError let the stream continue?**  
> It replaces the failed source with a new Observable you return (`of(fallback)`). If you rethrow, it still errors.

**Q16. timeout + retry order?**  
> `timeout` then `retry` so each attempt is bounded.

**Q17. How to cancel HTTP?**  
> Unsubscribe the Observable subscription — HttpClient aborts. Contrast with Promise + AbortController.

### Scenarios

**Q18. Implement polling every 5s.**  
> `timer(0, 5000).pipe(switchMap(() => api.status()), takeUntilDestroyed())`.

**Q19. Three APIs must all succeed for page.**  
> `forkJoin({ a, b, c })` + `catchError` for UI error state.

**Q20. Nested subscribe anti-pattern — fix?**  
> Flatten with `switchMap`/`mergeMap` instead of `subscribe` inside `subscribe`.

**Q21. map vs switchMap?**  
> `map` → value. `switchMap` → Observable (and flatten/cancel). If you return Observable from `map`, you get Observable\<Observable\>.

**Q22. debounceTime vs throttleTime?**  
> Debounce waits for quiet; throttle limits rate after emit. Search vs scroll.

**Q23. What is exhaustMap in one line?**  
> “Ignore new outer values while the current inner Observable hasn’t completed.”

**Q24. Signals replace RxJS?**  
> No — sync state → signals; async streams/HTTP/events → still RxJS; bridge with `toSignal`/`toObservable`.

**Q25. firstValueFrom vs subscribe?**  
> Bridge to async/await for one value; still need error handling; don’t use for infinite streams.

---

## 14. Mini “output” / prediction drills

### Drill A

```ts
of('a', 'b', 'c').pipe(
  mergeMap((x) => of(x).pipe(delay(x === 'a' ? 30 : 0))),
).subscribe(console.log);
```

Possible order: `b`, `c`, `a` — mergeMap doesn’t preserve completion order.

### Drill B

```ts
of('a', 'b').pipe(
  concatMap((x) => of(x).pipe(delay(10))),
).subscribe(console.log);
```

Always `a` then `b` — queued.

### Drill C

```ts
interval(1000).pipe(take(3), shareReplay(1)).subscribe();
// second subscriber later gets last value immediately if still live
```

---

## 15. Spoken answers

### 45s — flattening operators

> All four map each outer value to an inner Observable. switchMap cancels the previous inner — perfect for search. mergeMap runs inners in parallel. concatMap queues them to preserve order. exhaustMap ignores new outers while busy — perfect for submit buttons. Choosing the wrong one causes stale UI or double payments.

### 30s — cold vs hot

> Cold Observables start a fresh producer per subscriber — like HttpClient. Hot Observables share one producer — Subjects, DOM events, or cold streams made shared with shareReplay. That’s why two async pipes can double-fetch unless you multicast.

### 30s — leaks

> Leaks come from long-lived subscriptions. I prefer async pipe or takeUntilDestroyed, avoid nested subscribes, and use shareReplay with refCount true when sharing HTTP.

---

## 16. Cheat sheet

```text
SEARCH / TYPEAHEAD     debounce + distinct + switchMap
BUTTON SPAM / PAY      exhaustMap
ORDERED SAVES          concatMap
PARALLEL FAN-OUT       mergeMap (optional concurrency)
PAGE LOAD MANY APIs    forkJoin
LIVE FILTERS           combineLatest + switchMap
CLICK + FORM STATE     withLatestFrom
CACHE HTTP             shareReplay({ bufferSize:1, refCount:true })
TIMEOUT + RETRY        timeout → retry → catchError
TEARDOWN               async pipe | takeUntilDestroyed | toSignal
STATE BUS              BehaviorSubject → asObservable()
```

---

## 17. Practice checklist

- [ ] Draw the four flattening timelines from memory  
- [ ] Write typeahead pipe without looking  
- [ ] Explain forkJoin vs combineLatest vs zip in 20s each  
- [ ] Fix “HTTP twice” with shareReplay + refCount  
- [ ] Name 3 unsubscribe strategies in Angular  
- [ ] Predict stale-results bug (mergeMap on search)  
- [ ] Wire timeout + retry order  
- [ ] Bridge one stream with `toSignal` / `toObservable`  

---

## Related

| Topic | File |
|---|---|
| Promise vs Observable | [PROMISES_VS_OBSERVABLES.md](./PROMISES_VS_OBSERVABLES.md) |
| Timeout / retry | [API_TIMEOUT_RETRY.md](./API_TIMEOUT_RETRY.md) |
| Debounce / throttle (JS) | [DEBOUNCE_THROTTLE.md](./DEBOUNCE_THROTTLE.md) |
| Angular signals bridge | [../angular-interview-prep/ANGULAR_SIGNALS.md](../angular-interview-prep/ANGULAR_SIGNALS.md) |
| Practice typeahead | `prevonir-interview-practice` `/q4` |

Official: [rxjs.dev](https://rxjs.dev) operator decision tree.

---

*Update when Angular adds more RxJS↔signals bridges (`resource` / `rxResource`) or RxJS major renames.*
