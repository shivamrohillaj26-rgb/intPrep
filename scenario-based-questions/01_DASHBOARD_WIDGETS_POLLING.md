# Scenario 1 — Dashboard with 50+ Widgets Polling Every 5 Seconds

**Prompt:** A dashboard contains 50+ widgets, each fetching data independently and refreshing every 5 seconds. Users report UI lag, slow rendering, and memory issues. How would you redesign the architecture?

---

## 1. Clarify before designing (30 seconds)

Ask / assume:

- Are all widgets visible at once, or is there scroll / tabs?
- Same backend or many microservices?
- Is “every 5s” a product requirement or accidental over-fetching?
- Critical widgets vs nice-to-have?
- Auth / multi-tenant? Real-time SLA?

**Interview signal:** You don’t jump to “use WebSockets” without understanding visibility and priority.

---

## 2. Diagnose — what’s actually breaking

### Symptom → likely root cause

| Symptom | Likely cause |
|---|---|
| UI lag / jank | Main thread flooded: 50 fetches × JSON parse × React re-renders every 5s |
| Slow rendering | Large component tree re-rendering; no memoization; context storms |
| Memory growth | Timers not cleared, subscriptions leak, retaining huge response graphs, growing arrays |
| Network saturation | 50 concurrent HTTP every 5s → connection contention, browser limits (~6/host HTTP/1.1) |

### The anti-pattern

```
WidgetA → setInterval(5s) → fetch → setState → re-render
WidgetB → setInterval(5s) → fetch → setState → re-render
... × 50
```

Problems:

1. **No coordination** — thundering herd every 5s  
2. **Invisible widgets still poll** — wasted work  
3. **Each widget owns transport** — duplicated auth, retry, cache  
4. **State lives in 50 local islands** — hard to dedupe  
5. **Timers + closures** — classic memory leaks on navigate away  

---

## 3. Target architecture (redesign)

Think in **layers**:

```
┌─────────────────────────────────────────────┐
│  Widget UI (presentational, memoized)       │
│  reads selectors / signals — no fetch here  │
├─────────────────────────────────────────────┤
│  Widget Data Hooks / Adapters               │
│  subscribe to store slices / query cache    │
├─────────────────────────────────────────────┤
│  Data Orchestration Layer                   │
│  • Query client (TanStack Query / RTK Query)│
│  • Priority + visibility-aware refresh      │
│  • Batch / multiplex / SSE / WS gateway     │
├─────────────────────────────────────────────┤
│  Transport                                  │
│  HTTP batch · SSE · WebSocket · push        │
└─────────────────────────────────────────────┘
```

### Pillar A — Stop polling invisible work

- **Viewport-based fetching:** only active/visible widgets refresh (`IntersectionObserver`)  
- **Tab visibility:** `document.visibilityState === 'hidden'` → pause all polling  
- **Route unmount:** cancel queries / clear intervals via AbortController  

**Why over “just increase interval to 30s”:** Increasing interval hides the bug; visibility control cuts ~most load when users aren’t looking.

### Pillar B — Centralize server state (don’t DIY 50 intervals)

Use a **server-state library**:

- **TanStack Query (React Query)** or **RTK Query**  
- One `queryKey` per resource → automatic **deduplication**, cache, stale-while-revalidate  
- `refetchInterval` per query, but shared cache means 10 widgets of same metric = **1 request**

```ts
// conceptual
useQuery({
  queryKey: ['widget', id],
  queryFn: () => api.widget(id),
  refetchInterval: 5_000,
  refetchIntervalInBackground: false, // critical
  enabled: isVisible && isTabActive,
  staleTime: 4_000,
});
```

**Why TanStack Query over hand-rolled `setInterval`:**  
Hand-rolled misses dedupe, GC of unused cache, race handling, retry backoff, DevTools. Interviewers hear “I reinvented a worse React Query.”

**Why not put all widget data in Redux by default:**  
Server cache ≠ client global state. Redux for this becomes Scenario 4 (store bloat). Prefer query cache; Redux only for true client/UI state.

### Pillar C — Collapse the network fan-out

50 independent GETs every 5s is the wrong API shape for a dashboard.

**Preferred (in order):**

1. **Backend aggregation / BFF**  
   `GET /dashboard?widgets=a,b,c` → one payload (or multiplexed stream)

2. **HTTP batching**  
   Client batches widget IDs every N ms into one request

3. **SSE or WebSocket push**  
   Server pushes deltas; client applies patches  
   Best when many clients need the same ticking metrics

4. **Staggered polling**  
   If stuck with many endpoints: jitter intervals (5s ± random) so not all fire together

**Why BFF/batch over 50 parallel fetches:**  
Browser connection limits + JSON parse cost + React commit cost scale with *request count*, not just bytes. One coordinated payload wins.

**Why not jump straight to WebSockets:**  
WS adds infra (sticky sessions, reconnect, auth refresh, backpressure). Use when:

- Updates are frequent **and** shared  
- Product needs sub-second push  
- Backend can afford fan-out  

For “refresh every 5s,” **SSE or batched HTTP** is often enough and simpler to operate.

### Pillar D — Rendering architecture

- **Split dashboard shell vs widgets** — lazy load heavy widgets (`React.lazy` / dynamic import)  
- **Memoized widgets** — `React.memo` + stable props; avoid passing new object literals from parent every tick  
- **Normalize updates** — widgets subscribe to *their slice only* (selector / `useSyncExternalStore`)  
- **Virtualize widget grid** if many off-screen (like a windowed masonry)  
- **Priority tiers:**
  - P0 (KPI): 5s or push  
  - P1: 15–30s  
  - P2: on focus / manual refresh  

**Why memo alone isn’t enough:** If parent context/store updates globally every 5s, memo won’t save you. Fix **subscription granularity** first.

### Pillar E — Memory hygiene

- Abort in-flight fetches on unmount  
- Bound cache size / `gcTime` (garbage collect inactive queries)  
- Don’t append history arrays unboundedly in widgets (“last 10k points”) — ring buffer / downsample  
- Profile with Performance + Memory tabs; fix retainers (detached DOM, closures over huge JSON)

---

## 4. Concrete redesign proposal (what you’d draw on a whiteboard)

```
User opens Dashboard
  → Shell loads layout + widget registry (config-driven)
  → For each viewport-visible widget:
        subscribe(queryKey)
  → Data layer:
        if same queryKey inflight → join
        else fetch via BFF batch every 5s OR receive SSE delta
  → Store patch in query cache (normalized entities)
  → Only widgets whose data changed re-render
  → Tab hidden → pause
  → Navigate away → unsubscribe → GC
```

**Config-driven widgets** (important scalability point):

```ts
type WidgetDef = {
  id: string;
  type: 'chart' | 'kpi' | 'table';
  queryKey: string[];
  priority: 0 | 1 | 2;
  refreshMs: number;
};
```

Adding widget #51 shouldn’t mean new polling spaghetti — register config + component map.

---

## 5. Why this over that (tradeoff table)

| Option | Pros | Cons | When I’d choose |
|---|---|---|---|
| Keep 50 `setInterval`s, optimize renders only | Fast to try | Network + memory still broken | Never as final design |
| TanStack Query + visibility | Dedup, cache, pause, DX | Still N endpoints if API bad | Default first step |
| BFF batch endpoint | Huge network win | Needs backend work | Strong recommendation with BE |
| WebSocket all metrics | True push, low duplicate poll | Ops complexity, fan-out cost | High cardinality real-time |
| Move everything to Redux | Familiar | Cache invalidation hell, bloat | Avoid for server lists |
| iframe each widget | Isolation | Heavier memory, harder UX | Only hostile 3rd-party embeds |

**My default recommendation in interview:**

> Visibility-aware **TanStack Query** (or RTK Query) + **BFF/batched API** + **memoized, slice-subscribed widgets** + **priority refresh**. Escalate to **SSE/WebSocket** only if product needs push and backend supports it. Fix memory with abort + cache GC + bounded series data.

---

## 6. Rollout plan (incremental — sounds senior)

1. **Measure:** count requests/min, long tasks, heap, interaction latency  
2. **Quick win:** pause on hidden tab + disable background refetch  
3. **Adopt query library** for new widgets; migrate hot widgets  
4. **Add IntersectionObserver `enabled`**  
5. **Ship BFF batch** for top 20 widgets  
6. **Normalize + memo** render path  
7. **Consider SSE** for shared live KPIs  
8. **Hard caps:** max concurrent widgets refreshing; lazy mount below fold  

---

## 7. Success metrics

- Requests/min ↓ (target: order-of-magnitude if batching works)  
- Main-thread long tasks (>50ms) ↓  
- Interaction to next paint stable under load  
- Heap stable over 30–60 min soak test  
- Widget mount/unmount without leaked timers  

---

## 8. 60-second spoken answer

> I’d treat this as a **data orchestration** problem, not a CSS problem. Fifty independent intervals create a thundering herd of network, JSON parse, and React commits, including for off-screen widgets — which also leaks memory if timers aren’t cleaned up.  
> I’d centralize server state in **React Query/RTK Query**, enable refetch only when the widget is **visible** and the tab is active, and collapse fetches with a **BFF batch or SSE**. Widgets become memoized views over cache slices so only changed widgets re-render. I’d tier refresh rates by priority and bound any time-series buffers. WebSockets are optional if we truly need push; I wouldn’t start there if a batched 5s refresh meets the SLA.

---

## Related

- Scenario 5 (WebSocket high-frequency) — similar render discipline  
- Scenario 4 (Redux bloat) — why not dump API data into Redux  
- `../frontend-system-design/03_REFLOW_REPAINT_RENDERING_PERFORMANCE.md`  
- `../frontend-system-design/05_WEB_WORKERS.md` (parse/transform off main thread if needed)
