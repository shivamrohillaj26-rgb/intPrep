# Angular Memory Leaks — Detect & Prevent (Interview)

Prompt:

> How do you detect and prevent memory leaks in an Angular app?

**Related:** [Lifecycle](./ANGULAR_LIFECYCLE.md) · [Optimize](./ANGULAR_OPTIMIZE_APPLICATION.md) · [RxJS](../javascript-interview-prep/RXJS_INTERVIEW.md) §10 · [WebSockets](../frontend-system-design/05_WEB_WORKERS.md) (if you use workers) · [LRU](../javascript-interview-prep/LRU_CACHE.md)

---

## 0. Memorize (~40s)

> A leak is when something **still holds a component (or DOM) after Angular destroyed it**. Classic: `subscribe` without teardown, `setInterval`, `window.addEventListener`, a **root service** keeping a component callback, a chart/map you never `.remove()`.  
> I **prevent** first: `async` pipe / `takeUntilDestroyed` / `DestroyRef.onDestroy`, template `(click)` not manual listeners, `HttpClient` cancel on leave, bound caches.  
> I **detect** by navigating on/off a route 20 times and watching heap — detached `HTML*` and growing `MyComponent` counts. OnPush/signals do **not** replace unsubscribe.

---

## 1. What “leak” means here

JS GC frees an object only when **nothing reachable from `window` / a live service** points at it.

You leave `/alerts`. Angular runs `ngOnDestroy` and removes the component from the tree. If a **root** `Subject`, a **timer**, or a **DOM listener** still points at `this` (or a closure over `this`), the component **and its template DOM** stay in memory. Do that every navigation → heap climbs → tab dies after a long IDMS session.

```
Root AuthService.user$  ──subscribe──►  AlertsPage (destroyed)
setInterval ────────────closure──────►  AlertsPage
window resize ──────────handler──────►  AlertsPage
```

---

## 2. What Angular **already** cleans (don’t over-unsubscribe)

| You wrote | Teardown |
|---|---|
| `(click)="save()"` in the template | **Auto** — Angular removes the listener with the view |
| `@HostListener('window:resize')` | **Auto** with the directive/component |
| `users$ \| async` | **Auto** — pipe unsubscribes on destroy |
| `toSignal(obs$)` created in injection context | **Auto** — tied to that injector |
| `HttpClient.get` if you **unsubscribe** / destroy with `takeUntilDestroyed` | Request **aborted** |
| `HttpClient.get` fire-and-forget, you leave mid-flight | Completes on response anyway; still nicer to cancel |

You do **not** need `takeUntilDestroyed` on a one-shot HTTP **only** for “it completes” — you **do** want it so **leaving the page cancels** the in-flight call and the callback never touches a dead view.

---

## 3. Leak sources → prevent (bad / good)

### A. RxJS `subscribe` (most asked)

```ts
// ❌ lives after destroy — callback keeps the component
ngOnInit() {
  this.store.alerts$.subscribe((a) => (this.rows = a));
}

// ✅ injection context
constructor() {
  this.store.alerts$
    .pipe(takeUntilDestroyed())
    .subscribe((a) => (this.rows = a));
}

// ✅ later in a method — pass DestroyRef
private destroyRef = inject(DestroyRef);
startLive() {
  this.api.live$.pipe(takeUntilDestroyed(this.destroyRef)).subscribe(/* … */);
}

// ✅ no subscribe at all
// template: @for (row of alerts$ | async; track row.id)
```

`takeUntilDestroyed()` with **no args** = `inject(DestroyRef)` **now**. Only legal in constructor / field init / factory.

| DestroyRef owner | Unsub when |
|---|---|
| Component / directive | That view is destroyed |
| Route-provided service | That route injector dies (often **cached** — see DI Step 3) |
| `providedIn: 'root'` | **Almost never** — don’t hang UI subs off a root DestroyRef |

Old style still valid: `takeUntil(this.destroy$)` + `ngOnDestroy`. Prefer `DestroyRef`.

---

### B. Timers / `requestAnimationFrame`

```ts
const id = setInterval(() => this.poll(), 5000);
inject(DestroyRef).onDestroy(() => clearInterval(id));

// or RxJS
interval(5000).pipe(takeUntilDestroyed(), switchMap(() => this.api.tick())).subscribe();
```

---

### C. Manual DOM / `fromEvent(window)`

```ts
// ❌
window.addEventListener('resize', this.onResize);

// ✅ same function reference on remove
const onResize = () => this.measure();
window.addEventListener('resize', onResize);
this.destroyRef.onDestroy(() => window.removeEventListener('resize', onResize));

// ✅ better
fromEvent(window, 'resize').pipe(debounceTime(100), takeUntilDestroyed()).subscribe(() => this.measure());

// ✅ best if you only need it on the host
@HostListener('window:resize')
onResize() { this.measure(); }
```

Same for `document`, `IntersectionObserver`, `MutationObserver`, `ResizeObserver` — `.disconnect()` in `onDestroy`.

---

### D. Root service holding a **component**

```ts
// ❌ AuthService (root)
this.listeners.push(component.refresh); // component never GC’d

// ✅ service emits; component subscribes with takeUntilDestroyed
readonly alerts$ = new BehaviorSubject<Alert[]>([]);
// page: alerts$.pipe(takeUntilDestroyed()).subscribe(...)
```

Never store `ElementRef` / component instances on a singleton. Store **data**.

---

### E. WebSocket / EventSource / third-party map or chart

```ts
const ws = new WebSocket(url);
this.destroyRef.onDestroy(() => ws.close());

// Mapbox / Google Maps / Chart.js
ngAfterViewInit() {
  this.chart = new Chart(this.canvas.nativeElement, cfg);
}
ngOnDestroy() {
  this.chart?.destroy();
}
```

Dashboard video/map screens: if you don’t `remove()` the map, **WebGL + DOM** leak across route changes.

---

### F. Unbounded caches

In-memory `Map` of video metadata / translations with no cap → grows all day. Cap + LRU ([LRU_CACHE.md](../javascript-interview-prep/LRU_CACHE.md)) or store in the feature service that dies with the route.

---

### G. Closures in `setTimeout` after navigate

```ts
setTimeout(() => this.toast.show(), 3000); // if `this` is the page, page stuck 3s
this.destroyRef.onDestroy(() => clearTimeout(id));
```

---

## 4. Prevention checklist (what you do **before** Chrome)

| Habit | Why |
|---|---|
| Prefer `async` / `toSignal` / `resource` over raw `subscribe` | Framework teardown |
| Every long-lived `subscribe` has `takeUntilDestroyed` | Rule of thumb |
| Every `setInterval` / observer / WS has `onDestroy` | Symmetric alloc/free |
| No component refs on `providedIn: 'root'` | Singleton outlives routes |
| Charts/maps `.destroy()` in `ngOnDestroy` | Native resources |
| `track` / virtual scroll | Less DOM retained (not a “sub leak,” but heap) |
| Don’t grow arrays of snapshots in a root logger | Same as cache |

`effect()`: return a cleanup function if you allocate inside the effect.

---

## 5. How to detect (tools)

1. Open a heavy route (alerts, map).  
2. Navigate Home. Repeat **20+** times.  
3. Chrome **Memory → Heap snapshot**. Force GC. Compare.  
4. Look for **Detached HTMLElement**, your `*Component` class **instance count climbing**.  
5. **Performance monitor**: JS heap should sawtooth and **return near baseline**. Stairs up = leak.  
6. Allocation instrumentation on “navigate away.”

**Spoken:**  
> If heap and component counts keep rising after create/destroy, I have a retained reference. I find it in the snapshot retainer tree — usually a subscription or a listener.

---

## 6. Q&A

**Q: Must I unsubscribe `HttpClient`?**  
> It completes after one response. I still `takeUntilDestroyed` so leaving the page **cancels** the request and the next handler doesn’t run.

**Q: Does `async` pipe leak?**  
> No — it unsubscribes when the view is destroyed (or the `@if` removes it).

**Q: OnPush / zoneless / signals?**  
> Fewer CD cycles. **Not** a substitute for tearing down sockets and timers.

**Q: `providedIn: 'root'` + `takeUntilDestroyed()` in the service constructor?**  
> That DestroyRef is the **app**. The sub lives until refresh. Use it only for process-lifetime streams (auth). UI streams belong in the **component**.

**Q: Router `events.subscribe` in a component?**  
> Same as any Observable — `takeUntilDestroyed`.

**Q: Memory vs leak?**  
> A 10k-row table in the DOM is **heavy**, not always a leak. A leak is **still there after you left**.

---

## 7. Spoken extras

**30s prevent**

> I treat teardown as part of the feature. Template events and async pipe I get for free. Anything I `subscribe`, `setInterval`, or `addEventListener` myself gets `DestroyRef`. Maps and charts get an explicit destroy. Root services only hold data, never the page instance.

**20s detect**

> Navigate on and off, heap snapshot, detached DOM and growing component counts. Then I search for a subscribe without takeUntilDestroyed.

---

## 8. Practice

- [ ] List 5 sources + the prevent for each  
- [ ] Write `takeUntilDestroyed()` vs `takeUntilDestroyed(destroyRef)`  
- [ ] Explain why root service + component callback leaks  
- [ ] Heap snapshot story  
- [ ] HttpClient: complete vs cancel-on-destroy  
