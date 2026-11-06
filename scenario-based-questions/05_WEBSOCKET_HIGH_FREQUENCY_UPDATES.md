# Scenario 5 — WebSocket Ticks Freeze the Angular UI

**Prompt:** Stock prices update every second via WebSocket. During market hours the Angular UI freezes. How would you optimize rendering and state updates?

---

## 1. Clarify

- How many symbols on screen?  
- Snapshot vs deltas?  
- Charts + table?  
- Parse cost vs CD vs DOM?  
- Hidden tab still applying ticks?

**“Every second” for one price is fine. Freeze = too much work per tick on the main thread — often Zone + Default CD.**

---

## 2. Diagnose

```
WS message → JSON.parse → this.quotes = ... → Zone → CD whole tree → DOM
```

Killers:

1. Putting **every tick** through Angular Zone (`new WebSocket` inside NgZone)  
2. One array `quotes = [...]` new reference → `@for` rebuilds / OnPush sees new input  
3. No `track` / no virtual scroll — thousands of components  
4. Chart as Angular bindings every tick  
5. `JSON.parse` huge frames on main thread  
6. No coalesce — 50 messages / turn  

---

## 3. Layered Angular strategy

### A — Payload

Deltas, subscribe **visible symbols only**, pause when `document.hidden`.

### B — Run the socket **outside** Zone, flush once per frame

```ts
constructor() {
  this.zone.runOutsideAngular(() => {
    this.ws = new WebSocket(url);
    this.ws.onmessage = (evt) => {
      const tick = JSON.parse(evt.data) as Quote;
      this.pending.set(tick.sym, tick);
    };
    const loop = () => {
      if (this.pending.size) {
        const batch = this.pending;
        this.pending = new Map();
        this.zone.run(() => this.applyBatch(batch)); // one CD
      }
      requestAnimationFrame(loop);
    };
    requestAnimationFrame(loop);
  });
}
```

**Why `runOutsideAngular`:** Each WS message would otherwise schedule CD. Pump outside Zone; **one** `zone.run` / signal update per rAF.

### C — Per-symbol signals, not one giant list

```ts
private readonly byId = new Map<string, WritableSignal<Quote>>();

quote(sym: string) {
  if (!this.byId.has(sym)) this.byId.set(sym, signal(emptyQuote(sym)));
  return this.byId.get(sym)!;
}

applyBatch(batch: Map<string, Quote>) {
  batch.forEach((q, id) => this.quote(id).set(q));
}
```

Row template: `quote(row.sym)()` — **only that row** dirties. Not `quotes.set([...all])`.

NgRx for **portfolio metadata**; hot ticks stay in this store.

### D — Rendering

- **CDK virtual scroll** — ~30 DOM rows ([NUX virtual scroll](../onetrust/ONETRUST_INFINITE_VIRTUAL_SCROLL.md))  
- **OnPush** rows + `@for (row of rows; track row.sym)`  
- Split **hot** price cell vs **cool** name  
- Charts: Canvas/WebGL API, not `{{ point }}` on 5k SVG nodes  
- `takeUntilDestroyed` — close WS on leave  

### E — Worker

Parse/aggregate in a **Web Worker**; main thread only applies a small batch. Profile first (Performance panel).

---

## 4. Picture

```
WebSocket (outside NgZone)
  → Worker parse (optional)
  → Map coalesce per symbol
  → rAF → zone.run / signal.set per changed id
  → CDK virtualized OnPush rows
  → Chart imperative downsample
```

---

## 5. Why this over that

| Approach | When |
|---|---|
| OnPush only | Not if parent passes a new `quotes[]` every tick |
| Virtual scroll only | Need it for many rows; won’t fix Zone-per-message |
| NgRx action per tick | Usually too heavy |
| Direct DOM / `ElementRef` | Escape hatch for one cell; don’t reinvent CDK |
| Pause when hidden | Always |

---

## 6. 60-second spoken answer

> Freezes are main-thread: parse, **Zone change detection**, and too many DOM rows. I’d **subscribe only to visible symbols**, parse off-thread if needed, run the **WebSocket outside NgZone**, **coalesce on rAF**, and store **per-symbol signals** so one tick doesn’t dirty the table. Rows are **OnPush + CDK virtual scroll + `track`**. Charts update **imperatively**. Pause when the tab is hidden and prove it in the Performance panel.

---

## Related

- [13_WEBSOCKETS…](../frontend-system-design/13_WEBSOCKETS_HOW_THEY_WORK.md)  
- [ANGULAR_CHANGE_DETECTION…](../angular-interview-prep/ANGULAR_CHANGE_DETECTION_ONPUSH_ZONELESS.md)  
- Scenario 8 — 100k rows
