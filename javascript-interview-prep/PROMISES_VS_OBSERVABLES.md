# Promises vs Observables — Interview Ready Guide

Especially important for **Angular** frontend interviews (RxJS).

---

## 1. Quick Definitions

### Promise

A Promise represents **one** future value (or failure).

```js
const p = fetch('/api/user').then((r) => r.json());
p.then((user) => console.log(user));
```

### Observable

An Observable represents a **stream** of zero or more values over time.

```ts
import { interval } from 'rxjs';

const stream$ = interval(1000); // 0,1,2,3... every second
const sub = stream$.subscribe((n) => console.log(n));
```

Interview one-liner:

> Promise = single async result. Observable = lazy stream of multiple values that can be cancelled and transformed with operators.

---

## 2. Side-by-Side Comparison

| Feature | Promise | Observable |
|---|---|---|
| Values | One | Zero, one, or many |
| Lazy / Eager | Eager (starts immediately) | Lazy (starts on subscribe) |
| Cancelable | No (native) | Yes (`unsubscribe`) |
| Retries | Manual | Easy with operators |
| Operators | Limited chaining | Rich (`map`, `filter`, `switchMap`, ...) |
| Push model | Thenable callbacks | Next / error / complete |
| Best for | One-time async (`fetch`) | Streams, events, websockets, Angular HTTP patterns |

---

## 3. Eager vs Lazy (Very Important)

### Promise is eager

```js
const p = new Promise((resolve) => {
  console.log('Promise started');
  resolve(10);
});

// "Promise started" already logged, even without then
p.then(console.log);
```

### Observable is lazy

```ts
import { Observable } from 'rxjs';

const obs$ = new Observable((subscriber) => {
  console.log('Observable started');
  subscriber.next(10);
  subscriber.complete();
});

// nothing runs yet
obs$.subscribe((v) => console.log(v)); // now it starts
```

Interview line:

> Creating a Promise starts work immediately. Creating an Observable does not; work starts when someone subscribes.

---

## 4. Single Value vs Multiple Values

### Promise

```js
Promise.resolve(1).then(console.log); // only one value
```

### Observable

```ts
import { of } from 'rxjs';

of(1, 2, 3).subscribe(console.log);
// 1
// 2
// 3
```

Or continuous:

```ts
fromEvent(button, 'click').subscribe(() => console.log('clicked'));
```

---

## 5. Cancellation

### Promise

Native Promise cannot be cancelled.

Workarounds exist (`AbortController` with fetch), but Promise itself has no unsubscribe.

```js
const controller = new AbortController();
fetch('/api', { signal: controller.signal });
controller.abort();
```

### Observable

```ts
const sub = interval(1000).subscribe(console.log);
sub.unsubscribe(); // stops stream
```

This is a major Angular interview point.

---

## 6. Anatomy Of Observable Subscribe

```ts
obs$.subscribe({
  next: (value) => console.log('next', value),
  error: (err) => console.log('error', err),
  complete: () => console.log('done')
});
```

- `next` → each emitted value
- `error` → failure (stream stops)
- `complete` → successful finish (no more values)

Promise has only success/fail, not a continuous next stream.

---

## 7. Operators (Observable Superpower)

```ts
import { of } from 'rxjs';
import { map, filter } from 'rxjs/operators';

of(1, 2, 3, 4).pipe(
  filter((n) => n % 2 === 0),
  map((n) => n * 10)
).subscribe(console.log);

// 20
// 40
```

Promise chaining is possible, but RxJS operators are designed for streaming composition.

Common Angular operators:

- `map`
- `filter`
- `switchMap` (cancel previous inner request)
- `mergeMap`
- `debounceTime`
- `catchError`
- `takeUntil` (unsubscribe pattern)

---

## 8. Convert Between Them

### Promise → Observable

```ts
import { from } from 'rxjs';

from(fetch('/api').then((r) => r.json())).subscribe(console.log);
```

### Observable → Promise (first/last value)

```ts
import { firstValueFrom } from 'rxjs';

const value = await firstValueFrom(obs$);
```

Older style: `obs$.toPromise()` (deprecated).

---

## 9. Angular-Focused Example

### Promise style mental model

```ts
async loadUser() {
  this.user = await this.http.get('/user').toPromise();
}
```

### Observable style (Angular idiomatic)

```ts
ngOnInit() {
  this.http.get('/user')
    .pipe(takeUntil(this.destroy$))
    .subscribe((user) => this.user = user);
}
```

Why Observables fit Angular:

- HTTP can be composed with operators
- Easy cancel on component destroy
- Template async pipe handles subscribe/unsubscribe
- Event streams (valueChanges, router events)

---

## 10. `switchMap` Interview Example

Search box: user types fast, cancel old requests.

```ts
this.searchControl.valueChanges.pipe(
  debounceTime(300),
  distinctUntilChanged(),
  switchMap((q) => this.api.search(q))
).subscribe((results) => this.results = results);
```

Promise alone cannot cancel previous in-flight request as elegantly.

---

## 11. When To Use Which

### Use Promise when

- One-time async action
- Simple `async/await` flow
- No need for cancel/stream

### Use Observable when

- Multiple values over time
- Need cancellation
- Need debounce/retry/switchMap
- Angular reactive forms, HTTP composition, websocket-like streams

---

## 12. Common Interview Questions

**Q: Is Observable a Promise replacement?**  
A: Not exactly. Observables are more general streams. Promises are single-value async results.

**Q: Are Observables eager?**  
A: Cold Observables are lazy. (Mention hot Observables if advanced discussion comes.)

**Q: Can Promises emit multiple values?**  
A: No. One settle only.

**Q: How do you unsubscribe in Angular?**  
A: `unsubscribe()`, `takeUntil`, or `async` pipe.

**Q: Why RxJS in Angular?**  
A: Reactive composition, cancellation, operators for async UI flows.

---

## 13. Cold vs Hot Observables (Bonus)

- **Cold**: each subscriber gets its own execution (like new HTTP call)
- **Hot**: shared producer (like DOM click events, subjects)

```ts
// cold: new execution per subscribe
this.http.get('/api')

// hot-ish: same event source
fromEvent(window, 'resize')
```

---

## 14. Perfect Spoken Answer (45–60 sec)

> A Promise handles a single future value and starts work as soon as it is created. An Observable represents a lazy stream of values over time. Observables can emit multiple values, can be cancelled through unsubscribe, and can be transformed with RxJS operators like map, debounceTime, and switchMap. In Angular, Observables are preferred for HTTP and UI event streams because they compose well and can be cleaned up when a component is destroyed.

---

## 15. Cheat Sheet

```text
Promise     -> one value, eager, not cancelable
Observable  -> stream, lazy (cold), cancelable, operators

Promise success/fail
Observable next/error/complete

Angular: prefer Observables + async pipe / takeUntil
Search box: debounceTime + switchMap
```

---

## Related

**Full RxJS operators + tricky interview Q bank:** [RXJS_INTERVIEW.md](./RXJS_INTERVIEW.md)
