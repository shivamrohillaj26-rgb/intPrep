# API Timeout + Retry — Interview Challenge (Flipkart / DevTools Tech style)

> Wrap an unstable API so it **never blocks the app longer than N ms**.  
> If it doesn’t respond in time: **throw a timeout error**, or **retry once** then give up.

Tests: Promises, `async/await`, `Promise.race`, and resilience thinking.  
**Angular / RxJS twin:** §13 — `timeout` + `retry` on `HttpClient`.

---

## 1. The problem

```js
// Unstable API — sometimes 10ms, sometimes 1000ms+
function unstableApi() {
  const delay = Math.random() < 0.5 ? 10 : 1000;
  return new Promise((resolve) => {
    setTimeout(() => resolve({ ok: true, delay }), delay);
  });
}
```

**Product need:** UI must not wait forever. Cap wait at **300ms**.

Variants interviewers ask:

1. Timeout only → reject with `"Timeout"`  
2. Timeout → **retry once** → if still slow/fail, reject  
3. Retry only on failure (4xx/5xx), not always on timeout  
4. Cancel in-flight work with `AbortController` (senior follow-up)

---

## 2. Core idea — race the API against a timer

```text
Promise.race([
  apiCall(),
  timeoutReject(300)
])
```

Whoever **settles first** wins:

| Winner | Result |
|---|---|
| API resolves in 10ms | You get data |
| Timer fires at 300ms first | You get timeout error |

```js
function timeout(ms) {
  return new Promise((_, reject) => {
    setTimeout(() => reject(new Error(`Timeout after ${ms}ms`)), ms);
  });
}

function withTimeout(promise, ms) {
  return Promise.race([promise, timeout(ms)]);
}

// usage
await withTimeout(unstableApi(), 300);
```

### Why `Promise.race`?

- `Promise.all` waits for **all** — wrong  
- `Promise.any` waits for **first success** — ignores timeout reject semantics you want  
- `race` = **first settle** (fulfill or reject) — perfect for timeout  

---

## 3. Interview-ready: timeout only

```js
async function fetchWithTimeout(fn, ms = 300) {
  return Promise.race([
    fn(),
    new Promise((_, reject) =>
      setTimeout(() => reject(new Error('Timeout')), ms),
    ),
  ]);
}

// demo
fetchWithTimeout(unstableApi, 300)
  .then(console.log)
  .catch((e) => console.error(e.message)); // "Timeout" if slow
```

**Spoken:**

> I race the API promise against a rejecting timer. If the timer wins, the caller gets a timeout error and the UI can show a fallback instead of hanging.

---

## 4. Retry once (the common follow-up)

### Spec (clarify with interviewer)

Typical:

1. Try API with 300ms timeout  
2. If timeout **or** failure → wait optional backoff → try **one more time**  
3. If second attempt also times out/fails → reject  

```js
function delay(ms) {
  return new Promise((resolve) => setTimeout(resolve, ms));
}

function withTimeout(promise, ms) {
  return Promise.race([
    promise,
    new Promise((_, reject) =>
      setTimeout(() => reject(new Error('Timeout')), ms),
    ),
  ]);
}

/**
 * Call fn() with timeout; on timeout/error, retry once.
 * @param {() => Promise<any>} fn  factory — IMPORTANT: call fresh each try
 */
async function withTimeoutRetry(fn, { timeoutMs = 300, retries = 1, backoffMs = 0 } = {}) {
  let lastError;

  for (let attempt = 0; attempt <= retries; attempt++) {
    try {
      return await withTimeout(fn(), timeoutMs);
    } catch (err) {
      lastError = err;
      if (attempt === retries) break;
      if (backoffMs) await delay(backoffMs);
    }
  }

  throw lastError;
}

// usage
const data = await withTimeoutRetry(() => unstableApi(), {
  timeoutMs: 300,
  retries: 1,
});
```

### Why `fn` is a **function**, not a Promise?

```js
// ❌ WRONG — promise starts immediately; retry reuses the SAME in-flight call
await withTimeoutRetry(unstableApi(), …)

// ✅ RIGHT — each attempt starts a NEW request
await withTimeoutRetry(() => unstableApi(), …)
```

This is a classic trap. Say it out loud.

---

## 5. Full solution with clear errors

```js
class TimeoutError extends Error {
  constructor(ms) {
    super(`Timeout after ${ms}ms`);
    this.name = 'TimeoutError';
  }
}

function withTimeout(promise, ms) {
  let timer;
  const timeoutPromise = new Promise((_, reject) => {
    timer = setTimeout(() => reject(new TimeoutError(ms)), ms);
  });

  return Promise.race([promise, timeoutPromise]).finally(() => {
    clearTimeout(timer); // avoid lingering timer if API wins
  });
}

async function resilientFetch(fn, { timeoutMs = 300, retries = 1 } = {}) {
  let attempt = 0;
  while (true) {
    try {
      return await withTimeout(fn(), timeoutMs);
    } catch (e) {
      attempt++;
      if (attempt > retries) throw e;
      // optional: only retry on TimeoutError
      // if (!(e instanceof TimeoutError)) throw e;
    }
  }
}
```

`clearTimeout` in `finally` is a nice senior touch (prevents useless timer callbacks).

---

## 6. Important gotcha — the slow request still finishes

`Promise.race` **does not cancel** the loser.

```text
t=0     start API (will take 1000ms) + start 300ms timer
t=300   race rejects → your await throws Timeout
t=1000  API still resolves in background (wasted work / setState risk)
```

### Interview follow-up: how do you cancel?

Use **`AbortController`** with `fetch`:

```js
async function fetchWithTimeout(url, ms = 300) {
  const controller = new AbortController();
  const timer = setTimeout(() => controller.abort(), ms);

  try {
    const res = await fetch(url, { signal: controller.signal });
    if (!res.ok) throw new Error(`HTTP ${res.status}`);
    return await res.json();
  } finally {
    clearTimeout(timer);
  }
}
```

For a generic mock `unstableApi()`, you can’t truly cancel unless the API accepts a signal. Mention that distinction.

---

## 7. UI integration (why this matters in frontend)

```ts
// React sketch
async function loadProducts() {
  setStatus('loading');
  try {
    const data = await withTimeoutRetry(() => api.getProducts(), {
      timeoutMs: 300,
      retries: 1,
    });
    setProducts(data);
    setStatus('ready');
  } catch (e) {
    setStatus(e.name === 'TimeoutError' ? 'slow' : 'error');
    // show cached / skeleton / "try again"
  }
}
```

Patterns that pair well:

| Pattern | Role |
|---|---|
| Timeout | Bound waiting |
| Retry | Absorb blips |
| Stale-while-revalidate | Show old cache immediately |
| Skeleton / optimistic UI | Don’t block paint on network |
| Circuit breaker (advanced) | Stop calling a dying API for a while |

**Product line for managers:**

> I’d rather fail fast at 300ms and show a fallback than freeze the UI for a 1s hang on every navigation.

---

## 8. Variants & how to choose

| Spec | Implementation |
|---|---|
| Soft timeout → use fallback, don’t throw | `race` with `resolve(fallback)` instead of reject |
| Retry only on 5xx / network, not 404 | Check error type before looping |
| Exponential backoff | `backoffMs * 2 ** attempt` + jitter |
| Max total time budget (e.g. 300+300) | Each attempt 300ms; or one overall budget |
| Parallel timeout + loading indicator | Start request; if >150ms show spinner; still race at 300 |

### Soft timeout example (UX-friendly)

```js
async function withSoftTimeout(fn, ms, fallback) {
  try {
    return await withTimeout(fn(), ms);
  } catch {
    return fallback; // cached data / empty list
  }
}
```

---

## 9. Step-by-step dry run

```text
Attempt 1:
  API will take 1000ms, timeout 300ms
  → at 300ms TimeoutError
  → retries left → Attempt 2

Attempt 2:
  API takes 10ms
  → resolves { ok: true }
  → return data (never waited the full 1s on attempt 1 from user's perspective for the SUCCESS path;
     user waited ~300ms + 10ms)
```

Worst case with 1 retry: ~600ms+ (two timeouts) then throw.  
Say that so they know you understand latency budgets.

---

## 10. Common mistakes

| Mistake | Fix |
|---|---|
| Pass a Promise into retry helper | Pass `() => api()` factory |
| Use `Promise.all` for timeout | Use `Promise.race` |
| Forget UI still blocked on retry storms | Cap retries (usually 1 in this challenge) |
| Assume race cancels fetch | Mention AbortController |
| Mutate shared state after timeout | Guard with request id / ignore late results |
| `async` function without awaiting race | Always `await` / return the race promise |

### Ignoring late results (if no abort)

```js
let reqId = 0;

async function load() {
  const id = ++reqId;
  try {
    const data = await withTimeout(() => api(), 300);
    if (id !== reqId) return; // stale
    setData(data);
  } catch {
    if (id !== reqId) return;
    setError(true);
  }
}
```

---

## 11. Tiny test harness (practice in Node)

```js
function mockApi(ms, value = 'ok') {
  return () =>
    new Promise((resolve) => setTimeout(() => resolve(value), ms));
}

(async () => {
  console.log(await withTimeoutRetry(mockApi(10), { timeoutMs: 300, retries: 1 }));
  // → 'ok'

  try {
    await withTimeoutRetry(mockApi(1000), { timeoutMs: 300, retries: 1 });
  } catch (e) {
    console.log(e.message); // Timeout after both attempts
  }
})();
```

---

## 12. Interview Q&A

**Q: How do you implement a timeout on a Promise?**  
> `Promise.race` the real work against a rejecting `setTimeout` promise.

**Q: Difference between timeout and cancel?**  
> Timeout stops *waiting*. Cancel stops *work* (AbortController). Race alone doesn’t cancel.

**Q: Why retry?**  
> Transient failures / rare slow spikes. One retry often recovers without hurting UX if each attempt is bounded.

**Q: Won’t retry make it worse (up to 600ms)?**  
> Yes — tradeoff. Cap retries, use backoff, prefer cache fallback for UI.

**Q: `Promise.race` vs `Promise.any`?**  
> `race` = first settle (including reject). `any` = first fulfill (ignores rejects until all fail). Timeout needs `race`.

**Q: How do you do this in Angular / RxJS?**  
> `http.get(…).pipe(timeout(300), retry({ count: 1 }), catchError(…))`. Timeout bounds each attempt; retry re-subscribes and starts a new request.

**Q: Why timeout before retry?**  
> So every attempt is capped. Retry-first can leave a slow call hanging without a per-attempt deadline.

**Q: Does RxJS timeout cancel HTTP?**  
> Timing out errors the stream and unsubscribes upstream — with `HttpClient` that typically aborts the in-flight request. Bare `Promise.race` does not abort unless you use `AbortController`.

---

## 13. Angular + RxJS — same problem, Observable operators

In Angular interviews they often rephrase this as:

> “How would you add a **timeout** and **retry** on an `HttpClient` call?”

Same product goal. Different tools:

| Promise / vanilla JS | RxJS / Angular |
|---|---|
| `Promise.race([api(), timer])` | `pipe(timeout(300))` |
| Manual `for` + factory `() => api()` | `retry(1)` / `retry({ count: 1 })` |
| `AbortController` | Unsubscribe / `takeUntilDestroyed` — **HttpClient cancels** the XHR/fetch |
| `async/await` + try/catch | `subscribe` / `async` pipe / `firstValueFrom` + `catchError` |

**Mapping one-liner:**

> `timeout` = race against a timer. `retry` = re-subscribe (new HTTP call). That’s the Observable version of factory + `Promise.race`.

---

### 13.1 Timeout only (RxJS)

```ts
import { timeout, TimeoutError } from 'rxjs';
import { catchError } from 'rxjs/operators'; // or from 'rxjs' in modern imports

this.http.get<Product[]>('/api/products').pipe(
  timeout(300), // throws TimeoutError if no emit within 300ms
  catchError((err) => {
    if (err instanceof TimeoutError) {
      // show fallback / toast
    }
    throw err; // or return of([]) soft fallback
  }),
);
```

**Modern RxJS (7+)** — prefer object form / named imports from `'rxjs'`:

```ts
import { timeout, catchError, of, TimeoutError } from 'rxjs';

this.http.get<Product[]>('/api/products').pipe(
  timeout({ each: 300 }), // or timeout(300)
  catchError((err) => {
    if (err.name === 'TimeoutError' || err instanceof TimeoutError) {
      return of([] as Product[]); // soft timeout → empty list
    }
    throw err;
  }),
);
```

| Concept | Behavior |
|---|---|
| `timeout(300)` | If source doesn’t emit/complete in time → error |
| Vs `Promise.race` | Same idea; operator handles the timer for you |
| Soft timeout | `catchError` → `of(fallback)` instead of rethrow |

---

### 13.2 Timeout + retry once (interview MVP — Angular)

```ts
import { HttpClient } from '@angular/common/http';
import { inject, Injectable } from '@angular/core';
import { timeout, retry, catchError, throwError, TimeoutError } from 'rxjs';

@Injectable({ providedIn: 'root' })
export class ProductApi {
  private http = inject(HttpClient);

  getProducts() {
    return this.http.get<Product[]>('/api/products').pipe(
      timeout(300),
      // On error (including TimeoutError), re-subscribe → NEW HTTP request
      retry({ count: 1, delay: 0 }), // one retry = 2 total attempts
      catchError((err) => {
        const msg =
          err instanceof TimeoutError || err.name === 'TimeoutError'
            ? 'Timeout'
            : err.message ?? 'Request failed';
        return throwError(() => new Error(msg));
      }),
    );
  }
}
```

**Operator order matters:**

```text
http.get
  → timeout(300)     // each attempt is bounded
  → retry(1)         // on error, re-subscribe the WHOLE upstream pipe
  → catchError       // final failure for the UI
```

If you put `retry` *before* `timeout`, a slow request might hang without timing out per attempt — wrong for this challenge.

**Why retry = factory pattern:**

```text
Promise:  withTimeoutRetry(() => api())  // new call each loop
RxJS:     retry() re-subscribes source   // HttpClient starts a NEW request
```

You do **not** manually wrap a factory — cold Observables from `HttpClient` already start work on subscribe.

---

### 13.3 Retry only on timeout / 5xx (selective)

```ts
import { timeout, retry, timer, throwError } from 'rxjs';

this.http.get('/api/products').pipe(
  timeout(300),
  retry({
    count: 1,
    delay: (error, retryCount) => {
      // retry only Timeout or 5xx
      const status = error?.status;
      const isTimeout = error.name === 'TimeoutError';
      const isServer = status >= 500;
      if (!isTimeout && !isServer) {
        return throwError(() => error); // stop retrying
      }
      return timer(0); // or timer(200 * retryCount) backoff
    },
  }),
);
```

Older style still seen in interviews:

```ts
import { retryWhen, delay, take, timeout } from 'rxjs/operators';
// or pipeable from 'rxjs' depending on version

this.http.get('/api/x').pipe(
  timeout(300),
  retry({ count: 1 }), // prefer this over retryWhen in modern RxJS
);
```

---

### 13.4 Component usage (signals / subscribe / async pipe)

**Option A — `async` pipe (auto-unsubscribe):**

```ts
@Component({
  template: `
    @if (products$ | async; as products) {
      <li *ngFor="let p of products">{{ p.name }}</li>
    } @else {
      <p>Loading…</p>
    }
  `,
})
export class ProductList {
  private api = inject(ProductApi);
  products$ = this.api.getProducts(); // already has timeout + retry
}
```

**Option B — signals + `toSignal` / subscribe once:**

```ts
import { catchError, of } from 'rxjs';
import { toSignal } from '@angular/core/rxjs-interop';

products = toSignal(
  this.api.getProducts().pipe(catchError(() => of([]))),
  { initialValue: [] as Product[] },
);
```

**Option C — imperative (machine-coding style):**

```ts
loading = signal(true);
error = signal<string | null>(null);
products = signal<Product[]>([]);

ngOnInit() {
  this.api.getProducts().subscribe({
    next: (data) => {
      this.products.set(data);
      this.loading.set(false);
    },
    error: (e) => {
      this.error.set(e.message);
      this.loading.set(false);
    },
  });
}
```

Prefer `takeUntilDestroyed()` if you subscribe manually:

```ts
import { takeUntilDestroyed } from '@angular/core/rxjs-interop';

this.api.getProducts()
  .pipe(takeUntilDestroyed())
  .subscribe({ next: (d) => this.products.set(d) });
```

---

### 13.5 Cancellation — RxJS advantage over bare `Promise.race`

| | Promise `race` | Angular `HttpClient` + unsubscribe |
|---|---|---|
| Stops waiting | Yes | Yes |
| Cancels in-flight HTTP | **No** (need AbortController) | **Yes** — unsubscribing aborts the request |
| Leave page mid-flight | Late `.then` can still run | Unsubscribe → no next/error (if torn down correctly) |

```ts
// Navigate away / destroy component → subscription ends → request aborted
this.http.get('/api/slow').pipe(timeout(300), takeUntilDestroyed()).subscribe(…);
```

**Spoken senior line:**

> With Promises, timeout doesn’t cancel work — I need AbortController. With HttpClient, unsubscribing cancels the XHR/fetch, so timeout + destroy both stop waiting *and* can stop the network call.

---

### 13.6 Promise helpers inside Angular (when they ask both)

You can still use the JS solution with `firstValueFrom` / `lastValueFrom`:

```ts
import { firstValueFrom, timeout } from 'rxjs';

async load() {
  try {
    const data = await firstValueFrom(
      this.http.get<Product[]>('/api/products').pipe(
        timeout(300),
        retry({ count: 1 }),
      ),
    );
    this.products.set(data);
  } catch {
    this.error.set('Timeout or failed');
  }
}
```

Or wrap a Promise API the JS way, then `from(promise)` if you must mix.

---

### 13.7 Side-by-side cheat sheet

```text
JS interview                    Angular / RxJS interview
─────────────────────────       ────────────────────────────────
Promise.race([api, timer])  →   pipe(timeout(300))
for-loop + () => api()      →   retry({ count: 1 })
clearTimeout in finally     →   (operator cleans up; unsub cancels HTTP)
AbortController             →   unsubscribe / takeUntilDestroyed
try/catch                   →   catchError / subscribe error
show fallback               →   catchError(() => of(cache))
```

**Interview-simple Angular snippet to memorize:**

```ts
this.http.get(url).pipe(
  timeout(300),
  retry({ count: 1 }),
  catchError((e) => throwError(() => e)),
);
```

---

### 13.8 Angular-specific gotchas

| Mistake | Fix |
|---|---|
| `retry` before `timeout` | Put **`timeout` then `retry`** so each attempt is capped |
| Hot Observable / shared replay | Retry re-subscribes; for HTTP stay on **cold** `http.get` |
| Retry on 404 | Use selective `delay` predicate — don’t retry client errors |
| Forget unsubscribe on manual subscribe | `async` pipe or `takeUntilDestroyed` |
| `toPromise()` | Deprecated — use `firstValueFrom` |
| Interceptor vs per-call | Global timeout in interceptor is possible; usually per-API is clearer for interviews |

**HTTP interceptor sketch (optional follow-up):**

```ts
export const timeoutInterceptor: HttpInterceptorFn = (req, next) =>
  next(req).pipe(timeout(10_000)); // global ceiling; still can retry per service
```

---

## 14. 30-second spoken answer (vanilla JS)

> I’d wrap the API with `Promise.race` against a 300ms rejecting timer so the UI never waits longer than that. For resilience I’d accept a function that starts the request, and on timeout or failure retry once with the same timeout budget. I’d clear the timer when the API wins, and mention that true cancellation needs `AbortController` because race doesn’t abort the slow request. In the UI I’d show cached/fallback data on timeout instead of blocking.

### 30-second spoken answer (Angular / RxJS)

> In Angular I’d use `HttpClient` with `timeout(300)` then `retry({ count: 1 })` so each attempt is bounded and a failure re-subscribes — which starts a new HTTP call, same idea as a factory in the Promise version. I’d handle the final error with `catchError` and show fallback UI. Unsubscribe or `takeUntilDestroyed` cancels in-flight requests, which is nicer than bare `Promise.race`. Operator order is timeout first, then retry.

---

## 15. Practice checklist

- [ ] Write `withTimeout` from blank in &lt; 3 minutes  
- [ ] Add one retry with factory `() => api()`  
- [ ] Explain why not to pass a bare Promise into retry  
- [ ] Name AbortController as cancel follow-up  
- [ ] Wire a loading/error/fallback UI story  
- [ ] Know `race` vs `all` vs `any`  
- [ ] Write Angular: `http.get.pipe(timeout(300), retry({ count: 1 }))`  
- [ ] Explain why **timeout before retry**  
- [ ] Say HttpClient unsub ≈ cancel (vs Promise race)  

---

## Related

| Topic | File |
|---|---|
| `Promise.race` basics | [PROMISES.md](./PROMISES.md) |
| async/await control flow | [ASYNC_AWAIT.md](./ASYNC_AWAIT.md) |
| Promises vs Observables | [PROMISES_VS_OBSERVABLES.md](./PROMISES_VS_OBSERVABLES.md) |
| Event loop + timers | [EVENT_LOOP.md](./EVENT_LOOP.md) |
| Debounce (don’t spam retries) | [DEBOUNCE_THROTTLE.md](./DEBOUNCE_THROTTLE.md) |
| Angular signals / `toSignal` | [../angular-interview-prep/ANGULAR_SIGNALS.md](../angular-interview-prep/ANGULAR_SIGNALS.md) |
