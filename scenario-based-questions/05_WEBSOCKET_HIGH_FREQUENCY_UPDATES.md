# Scenario 5 — Stock Prices via WebSocket Freeze the UI

**Prompt:** Stock prices update every second via WebSocket. During market hours, the UI freezes. How would you optimize rendering and state updates?

---

## 1. Clarify

- How many symbols on screen? (10 vs 5,000)  
- Full snapshot every second or deltas?  
- Charts + table + watchlist all live?  
- Main-thread work: JSON parse? sorting? formatting?  
- Do inactive tabs still process ticks?

**“Every second” for *one* price is fine. Freezes mean you’re doing too much *per tick* on the main thread.**

---

## 2. Diagnose — freeze anatomy

```
WS message → JSON.parse → update store → React render → DOM/layout → paint
         ↑ often 100s–1000s of symbols per second in bursts
```

Typical killers:

1. **SetState/Redux on every tick for entire book** → full tree render  
2. **New object identity every time** → memo useless  
3. **Rendering off-screen rows** (no virtualization)  
4. **Heavy chart redraw** every second  
5. **JSON.parse of huge payloads** on main thread  
6. **No batching / coalescing** — 50 messages in one event-loop turn × expensive work  
7. **Zone/CD thrash** (Angular) or Context at root (React)

---

## 3. Optimization strategy (layered)

### Layer A — Network & payload shape

- Prefer **deltas** (`{ sym, price, ts }`) over full market snapshots  
- Binary protocols (MessagePack/Protobuf) if JSON parse dominates  
- Subscribe only to **visible / watched** symbols (server-side filter)  
- Pause WS processing when `document.hidden`  

**Why subscribe-to-viewport over “client filters 5k ticks”:**  
Cheapest work is work never sent.

### Layer B — Coalesce updates (do not render at tick rate blindly)

Stock UIs rarely need *every* intermediate tick painted.

```ts
// rAF batching sketch
let pending = new Map<string, Quote>();

socket.onmessage = (evt) => {
  const tick = parse(evt.data);
  pending.set(tick.sym, tick); // last write wins per symbol
};

function flush() {
  if (pending.size) {
    applyTicks(pending); // one store update
    pending = new Map();
  }
  requestAnimationFrame(flush);
}
requestAnimationFrame(flush);
```

Or throttle to **4–10 Hz** for UI while keeping a non-UI buffer for calculations.

**Why rAF coalescing over setState per message:**  
Aligns with display refresh; collapses bursts into one React commit.

**Why not “update Redux 1000 times/sec with middleware batch”:**  
Still too much reducer + selector work if every row subscribed. Coalesce *and* narrow subscriptions.

### Layer C — State structure

```ts
// normalized, mutable store with useSyncExternalStore OR
quotesById: Record<string, Quote>

// components subscribe to ONE symbol
function useQuote(sym: string) {
  return useSyncExternalStore(subscribeSymbol(sym), () => getQuote(sym));
}
```

Avoid:

```ts
// ❌ one giant quotes array in React state → all rows re-render
setQuotes(nextArray);
```

**Why `useSyncExternalStore` / external store over React Context for ticks:**  
Context notifies all consumers. External store can notify **per symbol**.

**Why not Redux for the hot path:**  
Possible with extreme care (entity adapter + per-symbol selectors), but a dedicated quote store is simpler and faster to reason about. Redux can hold **portfolio metadata**; quotes stay in a tick store.

### Layer D — Rendering

1. **Virtualize** lists/grids (`react-window` / TanStack Virtual) — only ~30 DOM rows  
2. **`React.memo` row** + primitive props (`price`, `change`)  
3. **Don’t recreate row callbacks/styles** each parent render  
4. **Split cool vs hot UI:**  
   - Hot: price cell (updates often)  
   - Cool: company name, sector (static)  
5. **Charts:** update series via chart API (Canvas/WebGL) — **not** full React re-mount; downsample points  
6. **CSS content-visibility / contain** for large cells where applicable  

### Layer E — Offload main thread

| Work | Where |
|---|---|
| Parse large binary frames | Worker  
| Aggregate candles / indicators | Worker  
| UI apply | Main thread, batched |

```ts
worker.postMessage(rawBuffer);
worker.onmessage = (e) => applyDeltaBatch(e.data);
```

**Why workers over micro-optimizing JSON.parse loops first:**  
If profiling shows parse/aggregate > frame budget, workers are the right tool. If render is the issue, fix virtualization first. **Profile before prescribing.**

### Layer F — Visual tricks that preserve UX

- Flash cell color via CSS class toggled on row store, not whole table re-layout  
- Show “market closed” static mode after hours  
- Reduce precision formatting work (preformat in worker)

---

## 4. Target architecture

```
WebSocket
  → Worker (parse + normalize deltas)
  → Pending Map (coalesce per symbol)
  → rAF flush → QuoteStore (per-symbol notify)
  → Virtualized table rows subscribe to own symbol
  → Chart engine gets downsampled series (not React state every tick)
```

---

## 5. Why this over that

| Approach | When |
|---|---|
| Virtualization only | Essential if many rows; alone won’t fix 1-row chart freezes |
| React.memo only | Insufficient if parent passes new data refs globally |
| Redux + Reselect | OK at moderate scale; hot path often better external |
| Update DOM directly via refs | Escape hatch for single cells; avoid reinventing React |
| Canvas table | Extreme scale (thousands visible); higher complexity |
| Pause when hidden | Always — free win |

**Chosen stack for interview:**  
> Server-side symbol subscription → worker parse → coalesce on rAF → per-symbol store → virtualized memoized rows → chart imperatively updated. Profile to confirm bottlenecks.

---

## 6. Angular note (if asked)

Same ideas: signals/store per symbol, `@defer` / virtual scroll CDK, avoid pushing every tick through a giant `*ngFor` without `trackBy`, run outside Angular zone for WS pump then batch `markForCheck` / signal updates once per frame.

---

## 7. 60-second spoken answer

> Freezes mean the main thread is doing too much per tick—usually parse + global state update + rendering thousands of cells. I’d **subscribe only to needed symbols**, **parse/aggregate in a worker**, **coalesce updates on `requestAnimationFrame`**, hold quotes in a **per-symbol store**, and render a **virtualized, memoized** grid so only visible hot cells update. Charts should update imperatively with downsampled data, not full React re-renders every second. I’d pause when the tab is hidden and prove wins with the Performance panel.

---

## Related

- How WebSockets work (handshake, frames, reconnect): `../frontend-system-design/13_WEBSOCKETS_HOW_THEY_WORK.md`  
- Scenario 1 — dashboard polling (visibility + batching cousins)  
- Scenario 8 — 100k rows (virtualization deep dive)  
- `../frontend-system-design/05_WEB_WORKERS.md`  
- `../frontend-system-design/03_REFLOW_REPAINT_RENDERING_PERFORMANCE.md`
