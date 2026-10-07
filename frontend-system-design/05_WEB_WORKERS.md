# Web Workers — Frontend System Design Interview Guide

---

## 1. What Is A Web Worker?

A **Web Worker** lets you run JavaScript in a **background thread**, separate from the main UI thread.

Interview one-liner:

> Web Workers move CPU-heavy JavaScript off the main thread so the UI stays responsive while expensive work runs in parallel.

Why needed?

**JavaScript on the main thread is single-threaded** — one call stack, one event loop for your page’s UI. Heavy work blocks:

- rendering
- input handling
- animations
- scrolling

### Common confusion: “JS is single-threaded, so workers still run on that thread?”

**No.** The slogan means: **one JS thread per realm**, not “the whole browser has only one thread.”

| Place | Thread? |
|---|---|
| Your Angular/React app, DOM, click handlers | **Main thread** (one JS call stack) |
| `new Worker('worker.js')` | **Another OS thread** with its **own** JS engine instance, own event loop, own call stack |
| Browser internals (layout, compositor, network, GPU) | Extra native threads — not your JS |

So: **the worker still runs JavaScript**, but **not on the UI thread**. The UI thread stays free to paint and handle clicks while the worker burns CPU.

```text
  Browser process
  ├── Main JS thread     ← your app + DOM  (THIS is the “single thread”)
  ├── Worker JS thread   ← worker.js  (parallel)
  ├── Worker JS thread   ← another Worker if you spawn more
  ├── Layout / compositor / network  (native, not JS)
```

**Still “single-threaded JS” per worker:** that worker cannot use two cores by itself. **Two workers** = two JS threads. They do **not** share memory by default (no shared `let x`); they talk with `postMessage`. (`SharedArrayBuffer` is the exception — mention only if asked.)

**20s answer:**

> JS on the **page** is single-threaded — that’s why a huge loop freezes the UI. A Web Worker is a **second JS thread** in the same tab. It can’t touch the DOM; we send data with `postMessage`. That’s how we get parallelism without breaking the DOM model.

---

## 2. Main Thread vs Worker Thread

```text
Main Thread
- DOM
- UI rendering
- event handlers
- most app logic

Web Worker Thread
- heavy computation
- parsing large JSON
- image/data processing
- encryption/compression-like CPU work
- NO direct DOM access
```

Workers cannot:

- access `window`
- access `document`
- directly manipulate DOM

They communicate with main thread via messages.

---

## 3. Basic Usage

### worker.js

```js
self.onmessage = function (event) {
  const numbers = event.data;
  const sum = numbers.reduce((a, b) => a + b, 0);

  self.postMessage(sum);
};
```

### main.js

```js
const worker = new Worker('worker.js');

worker.postMessage([1, 2, 3, 4, 5]);

worker.onmessage = function (event) {
  console.log('Result from worker:', event.data); // 15
};

worker.onerror = function (err) {
  console.error('Worker error:', err.message);
};
```

Flow:

```text
Main --postMessage--> Worker
Worker runs heavy task
Worker --postMessage--> Main
```

---

## 4. Types Of Workers

### Dedicated Worker

Used by one script/page.

```js
const worker = new Worker('worker.js');
```

Most common interview answer.

### Shared Worker

Shared by multiple tabs/windows of same origin.

```js
const worker = new SharedWorker('shared.js');
```

Less commonly used; support/use-cases more limited in many apps.

### Worklets / specialty workers (mention only if asked)

- Paint worklets, audio worklets, etc. (advanced)

For interviews, focus on dedicated workers.

---

## 5. Communication Model (Important)

Workers use **structured clone** / transferable objects via messaging.

### Clone (default)

```js
worker.postMessage(bigObject);
```

Data is copied (can be costly for huge data).

### Transferable (better for large binary data)

```js
const buffer = new ArrayBuffer(1024 * 1024);
worker.postMessage(buffer, [buffer]);
// ownership moved; original buffer becomes detached in sender
```

Use for:

- `ArrayBuffer`
- large typed arrays
- image bitmap style data transfers (where supported)

Interview tip:

> For large payloads, prefer transferable objects to avoid expensive cloning.

---

## 6. When To Use Web Workers

Good use cases:

- large JSON parse/transform
- client-side search/indexing
- image filters / canvas pixel processing
- cryptography / hashing heavy work
- complex calculations (charts data prep, pathfinding)
- fuzzy search over big lists

Bad / unnecessary:

- tiny calculations
- anything requiring constant DOM access
- simple API calls (network is already async)

---

## 7. Worker Lifecycle And Cleanup

```js
const worker = new Worker('worker.js');

// ... use worker
worker.terminate(); // from main thread
```

Inside worker:

```js
self.close();
```

Always terminate workers you no longer need to free memory/CPU.

---

## 8. Module Workers

Modern:

```js
const worker = new Worker(new URL('./worker.js', import.meta.url), {
  type: 'module'
});
```

Allows `import` inside worker files (bundler-dependent support).

Angular/React apps usually create workers through bundler-friendly URL patterns.

---

## 9. Architecture Pattern: Offload Expensive Task

```text
UI event
 -> main thread shows spinner
 -> postMessage(taskData) to worker
 -> worker computes
 -> posts result
 -> main thread updates DOM
```

Keeps interaction smooth even if compute takes 200–500ms+.

---

## 10. Limitations (Must Mention In Interviews)

1. No DOM access
2. Message-passing overhead (clone cost)
3. Separate JS context (no shared variables directly)
4. Debugging slightly harder
5. Not magic for I/O-bound tasks already async
6. Creating too many workers can hurt (thread/memory overhead)

---

## 11. Web Worker vs Async/Await vs Debounce

| Tool | Problem it solves |
|---|---|
| `async/await` | wait for async I/O without blocking syntax-wise |
| Debounce/Throttle | reduce call frequency |
| Web Worker | move CPU-heavy sync work off main thread |

Important:

> `async` does **not** make CPU-heavy loops non-blocking. A long `for` loop still freezes UI unless chunked or moved to a worker.

---

## 12. Mini Example: Heavy Loop Without Worker (UI Freeze)

```js
function heavy() {
  let total = 0;
  for (let i = 0; i < 1e9; i++) total += i;
  return total;
}

button.onclick = () => {
  console.log(heavy()); // page freezes
};
```

With worker: freeze moves off main thread; UI can still paint/scroll.

---

## 13. Error Handling Pattern

```js
worker.onerror = (e) => {
  console.error(e.message, e.filename, e.lineno);
};

worker.onmessageerror = (e) => {
  console.error('Message could not be deserialized', e);
};
```

In worker:

```js
self.onmessage = (e) => {
  try {
    const result = doWork(e.data);
    self.postMessage({ ok: true, result });
  } catch (err) {
    self.postMessage({ ok: false, error: String(err) });
  }
};
```

---

## 14. Angular — basic Web Worker example

Use workers for large client-side transforms / parsing.  
Workers **cannot** update Angular templates. Flow: worker returns data → component sets state → CD updates UI.

### Generate (Angular CLI)

```bash
ng generate web-worker heavy
# creates src/app/heavy.worker.ts (and may hint tsconfig worker setup)
```

### Worker file — `heavy.worker.ts`

```ts
/// <reference lib="webworker" />

addEventListener('message', ({ data }) => {
  // heavy CPU work — runs OFF the UI thread
  const numbers: number[] = data;
  let sum = 0;
  for (const n of numbers) sum += n;

  postMessage(sum); // send result back to component
});
```

### Component — create worker, send work, get result

```ts
import { Component, OnDestroy, signal } from '@angular/core';

@Component({
  selector: 'app-sum',
  template: `
    <button type="button" (click)="run()">Sum in worker</button>
    <p>Result: {{ result() }}</p>
  `,
})
export class SumComponent implements OnDestroy {
  readonly result = signal<number | null>(null);
  private worker?: Worker;

  run(): void {
    if (typeof Worker === 'undefined') {
      // SSR / old browser — fall back or skip
      return;
    }

    // bundler-friendly URL (esbuild / application builder)
    this.worker ??= new Worker(
      new URL('./heavy.worker', import.meta.url),
    );

    this.worker.onmessage = ({ data }) => {
      this.result.set(data as number); // back on main thread → update UI
    };

    this.worker.postMessage([1, 2, 3, 4, 5]); // → worker
  }

  ngOnDestroy(): void {
    this.worker?.terminate(); // cleanup
  }
}
```

```text
Button click (main / Angular)
   → worker.postMessage(numbers)
   → heavy.worker.ts loops / computes
   → postMessage(sum)
   → component signal/state updates
   → template re-renders
```

**Say:** Web Worker in Angular is still browser `Worker` + `postMessage`. CLI just scaffolds the file; Zone/CD only see the result after you set state on the main thread.

---

## 14b. Web Worker vs Service Worker (quick)

| | **Web Worker** | **Service Worker** |
|---|---|---|
| Job | Heavy **CPU** off main thread | **Network** proxy: cache / offline / PWA |
| Typical API | `new Worker(...)`, `postMessage` | `navigator.serviceWorker.register`, `fetch` event |
| Lives | With the page (terminate on leave) | Can outlive tabs; scoped to origin/path |
| DOM | No | No |
| Intercepts HTTP | No | Yes |
| Angular use | `ng g web-worker` for compute | `@angular/service-worker` / `ngsw` for offline |

One-liner:

> Web Worker = “don’t freeze the UI while calculating.”  
> Service Worker = “don’t always hit the network; cache / offline.”

Deep SW guide: [06_SERVICE_WORKERS.md](./06_SERVICE_WORKERS.md).

---

## 15. Common Interview Questions

**Q: What is a Web Worker?**  
A: Background JS thread for CPU-intensive tasks without blocking UI.

**Q: Can workers access DOM?**  
A: No. Communication is via `postMessage`.

**Q: Difference between async code and workers?**  
A: Async waits on I/O events; workers provide true parallel CPU execution off main thread.

**Q: How do main thread and worker share data?**  
A: By message copying (structured clone) or transferring ownership of certain binary objects.

**Q: When not to use a worker?**  
A: Tiny tasks, DOM-heavy workflows, or when messaging overhead exceeds benefit.

---

## 16. Spoken Answer (45–60 sec)

> Web Workers run JavaScript in a separate background thread so expensive CPU work does not block rendering or user input. The main thread and worker communicate with postMessage, and workers cannot touch the DOM. I use them for heavy parsing, transformations, or computations, and I keep UI updates on the main thread after receiving results. For large binary data, transferable objects reduce cloning costs.

---

## 17. Cheat Sheet

```text
Web Worker = background JS thread
No DOM / window
Talk via postMessage
Use for CPU-heavy work
terminate() when done
async != worker
transferables for big binary data
```

---

## 18. Practice Checklist

- [ ] Explain why UI freezes without workers
- [ ] Write main + worker message example
- [ ] List 4 good use cases
- [ ] Explain no-DOM limitation
- [ ] Compare worker vs async/await
