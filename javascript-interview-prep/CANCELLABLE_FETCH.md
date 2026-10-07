# Cancellable Fetch (`AbortController` Wrapper) — Interview Ready

Common ask: wrap `fetch` so callers can **cancel** in-flight work (search typeahead, route change, component destroy).

Related: [API_TIMEOUT_RETRY.md](./API_TIMEOUT_RETRY.md) (timeout ≠ cancel), [TRICKY_10_FRONTEND_QUESTIONS.md](./TRICKY_10_FRONTEND_QUESTIONS.md) Q3 (stale responses).

---

## 1. Why this exists

`fetch` returns a Promise. Promises do **not** cancel. If the user types `"a"` then `"ab"`, both requests may still complete — the slow `"a"` response can overwrite `"ab"` UI.

You need two layers:

1. **Cancel network** → `AbortController` + `signal` on `fetch`
2. **Ignore stale UI updates** → request id / “latest wins” even if abort fails

Interviewers want you to name both.

---

## 2. One-liner

> I create an `AbortController`, pass `controller.signal` into `fetch`, and call `controller.abort()` when a newer request starts or the caller unmounts. Aborted fetches reject with `AbortError` — I treat that as non-fatal and don’t update state.

---

## 3. Browser API (know this cold)

```js
const controller = new AbortController();
const { signal } = controller;

fetch('/api/search?q=hi', { signal })
  .then((r) => r.json())
  .then(console.log)
  .catch((err) => {
    if (err.name === 'AbortError') {
      // expected — user cancelled / superseded
      return;
    }
    throw err;
  });

// later
controller.abort(); // → pending fetch rejects with AbortError
```

| Piece | Role |
|---|---|
| `AbortController` | Owns a `signal`; call `.abort()` once |
| `signal` | Passed to `fetch` (and some DOM APIs) |
| `AbortError` / `DOMException` | Rejection reason after abort |
| `signal.aborted` | Already aborted? |

One controller → one logical cancellation scope. New request → **new** controller.

---

## 4. Interview-ready wrapper

### Minimal: `cancellableFetch(url, options?)`

```js
/**
 * @returns {{ promise: Promise<Response>, abort: () => void }}
 */
function cancellableFetch(url, options = {}) {
  const controller = new AbortController();

  const promise = fetch(url, {
    ...options,
    signal: controller.signal,
  });

  return {
    promise,
    abort: () => controller.abort(),
  };
}

// usage
const { promise, abort } = cancellableFetch('/api/items');
setTimeout(abort, 100); // cancel after 100ms
try {
  const res = await promise;
  console.log(await res.json());
} catch (e) {
  if (e.name !== 'AbortError') throw e;
}
```

### Better: auto-abort previous call (search pattern)

```js
function createCancellableSearcher(baseUrl) {
  let current = null;

  return async function search(query) {
    // cancel previous in-flight request
    current?.abort();
    const controller = new AbortController();
    current = controller;

    try {
      const res = await fetch(
        `${baseUrl}?q=${encodeURIComponent(query)}`,
        { signal: controller.signal },
      );
      if (!res.ok) throw new Error(`HTTP ${res.status}`);
      return await res.json();
    } catch (err) {
      if (err.name === 'AbortError') {
        return undefined; // superseded — caller ignores
      }
      throw err;
    } finally {
      if (current === controller) current = null;
    }
  };
}

const search = createCancellableSearcher('/api/search');
await search('a');   // may get aborted
await search('ab');  // latest wins
```

### Production-ish: combine with timeout

Timeout without abort leaves the request running. Race + abort:

```js
async function fetchWithTimeout(url, ms, options = {}) {
  const controller = new AbortController();
  const timer = setTimeout(() => controller.abort(), ms);

  try {
    const res = await fetch(url, {
      ...options,
      signal: controller.signal,
    });
    return res;
  } catch (err) {
    if (err.name === 'AbortError') {
      throw new Error(`Timeout after ${ms}ms`);
    }
    throw err;
  } finally {
    clearTimeout(timer);
  }
}
```

**Caveat:** aborting for timeout and aborting for “user cancelled” look the same (`AbortError`). Senior follow-up: use `AbortSignal.any([timeoutSignal, userSignal])` (modern browsers) or a reason flag.

```js
// modern: compose signals
const userCtrl = new AbortController();
const timeoutSignal = AbortSignal.timeout(300); // aborts after 300ms
const signal = AbortSignal.any([userCtrl.signal, timeoutSignal]);

await fetch(url, { signal });
```

---

## 5. Angular / RxJS twin

`HttpClient` + unsubscribe ≈ abort:

```ts
this.http.get('/api/search', { params: { q } }).pipe(
  // new keystroke cancels previous HTTP
  // (usually via switchMap on an Observable of queries)
);
```

| Promise world | RxJS world |
|---|---|
| `AbortController.abort()` | unsubscribe / `switchMap` |
| `AbortError` | stream completes/errors; ignore if intentional |
| Manual “latest id” | often unnecessary if `switchMap` used correctly |

---

## 6. Race condition without abort (still mention)

Even with abort, teach the **request id** pattern — abort isn’t available everywhere (custom XHR wrappers, some libs):

```js
let seq = 0;

async function load(query, apply) {
  const id = ++seq;
  const data = await api(query);
  if (id !== seq) return; // stale
  apply(data);
}
```

Best answer: **abort + ignore stale**.

---

## 7. Edge cases interviewers poke

| Case | Answer |
|---|---|
| Abort after response already arrived | No-op / already settled — fine |
| Double `abort()` | Safe — second call ignored |
| Pass both external `signal` and internal | Use `AbortSignal.any` or abort both on either |
| `json()` after abort | Don’t call — promise already rejected |
| Does abort free server work? | Browser stops reading; server may still finish — cancel is best-effort |

---

## 8. Spoken answers

### 30s

> Promises aren’t cancellable. I wrap fetch with AbortController, pass the signal, and abort when a newer request starts. I catch AbortError so cancelled calls don’t look like real failures, and I still guard UI updates so a late response can’t overwrite newer state.

### 60s

> For typeahead I’d keep one AbortController for the current request. On each keystroke I abort the previous controller, create a new one, and fetch with that signal. Optionally I race a timeout that also aborts. In Angular I’d use switchMap on the query stream so the previous HttpClient call unsubscribes and aborts. Timeout alone with Promise.race doesn’t cancel the network — that’s why AbortController is the senior follow-up to the timeout question.

---

## 9. Practice checklist

- [ ] Write `cancellableFetch` returning `{ promise, abort }` in &lt; 5 min  
- [ ] Build search helper that aborts previous call  
- [ ] Combine timeout + abort  
- [ ] Explain AbortError vs real network error  
- [ ] Contrast with RxJS `switchMap`  
- [ ] Mention request-id as backup for stale UI  

---

## Related

| Topic | File |
|---|---|
| Timeout + retry | [API_TIMEOUT_RETRY.md](./API_TIMEOUT_RETRY.md) |
| Stale search overwrite | [TRICKY_10_FRONTEND_QUESTIONS.md](./TRICKY_10_FRONTEND_QUESTIONS.md) Q3 |
| Infinite scroll + races | [INFINITE_SCROLL_RACE.md](./INFINITE_SCROLL_RACE.md) |
| RxJS flattening | [RXJS_INTERVIEW.md](./RXJS_INTERVIEW.md) |
