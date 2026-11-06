# Scenario 1 — Dashboard with 50+ Widgets Polling Every 5 Seconds (Angular)

**Prompt:** An Angular dashboard contains 50+ widgets, each fetching independently and refreshing every 5 seconds. Users report UI lag, slow rendering, and memory issues. How would you redesign the architecture?

**Stack to name:** Angular + `HttpClient` + RxJS · OnPush / signals · `takeUntilDestroyed` · CDK / `@defer`  
**Not:** 50 `setInterval`s in components · dump every payload into NgRx

---

## 1. Clarify before designing (30 seconds)

- All widgets visible, or scroll / tabs / `@defer`?
- Same API or many microservices?
- Is “every 5s” a product SLA or accidental over-fetch?
- Critical KPIs vs nice-to-have?
- Auth / multi-tenant? Real-time SLA?

**Interview signal:** Don’t jump to WebSockets. Visibility + Zone/CD + RxJS first.

---

## 2. Diagnose — what’s actually breaking

| Symptom | Likely Angular cause |
|---|---|
| UI lag / jank | 50 HTTP × `JSON.parse` × **change detection** every 5s (Default CD + Zone from each `HttpClient` complete) |
| Slow rendering | Fat component tree; functions in templates; `@for` without `track`; no OnPush |
| Memory growth | `interval` / `subscribe` **not** `takeUntilDestroyed`; growing chart arrays; widgets still polling off-screen |
| Network saturation | 50 GETs / 5s → HTTP/1.1 ~6 connections per host |

### The anti-pattern

```ts
// widget.ts — ❌
ngOnInit() {
  this.sub = interval(5000).pipe(switchMap(() => this.http.get(url))).subscribe((d) => {
    this.data = d; // Default CD → this widget + often the whole dashboard
  });
}
// no ngOnDestroy / takeUntilDestroyed
```

Problems:

1. **No coordination** — thundering herd every 5s  
2. **Invisible widgets still poll**  
3. Each widget owns transport — duplicated auth/retry  
4. 50 local islands — no HTTP dedupe (`shareReplay`)  
5. Leaked intervals after `router` navigates away  

---

## 3. Target architecture

```
┌─────────────────────────────────────────────┐
│  Widget UI  OnPush / signals                │
│  async pipe or resource() — no HttpClient   │
├─────────────────────────────────────────────┤
│  Widget facade  useWidget(id) / signal      │
├─────────────────────────────────────────────┤
│  Data orchestration                         │
│  HttpClient + shareReplay / resource        │
│  visibility + document.hidden               │
│  BFF batch or SSE                           │
├─────────────────────────────────────────────┤
│  Transport  HTTP batch · SSE · WS (later)   │
└─────────────────────────────────────────────┘
```

### Pillar A — Stop polling invisible work

- **`IntersectionObserver`** (or CDK scroll) → `enabled` only when in viewport  
- **`document.visibilityState === 'hidden'`** → `timer` pauses (`filter` / `switchMap` to `EMPTY`)  
- **`takeUntilDestroyed()`** on every stream — route change cancels HTTP (`HttpClient` + `DestroyRef`)

**Why over “interval 30s”:** Hides the bug. Visibility cuts most load when nobody is looking.

### Pillar B — Centralize server state (not 50 intervals, not NgRx for lists)

Angular defaults:

| Tool | Role |
|---|---|
| **`HttpClient` + RxJS** | One service per resource; `shareReplay({ bufferSize: 1, refCount: true })` so 10 KPI widgets = **1** GET |
| **`resource()` / `rxResource()`** (v19+) | Declarative server state; abort on destroy |
| **TanStack Query Angular** | If team wants Query-shaped cache (optional; say it, don’t require it) |
| **NgRx** | Session, flags, wizard — **not** 50 widget payloads (that’s Scenario 4) |

```ts
// widget-data.service.ts
widget$(id: string) {
  return this.http.get(`/api/widgets/${id}`).pipe(
    shareReplay({ bufferSize: 1, refCount: true }),
  );
}

// widget.ts — OnPush
data = toSignal(
  toObservable(this.visible).pipe(
    switchMap((on) => (on ? timer(0, 5_000).pipe(switchMap(() => this.api.widget$(this.id()))) : EMPTY)),
    takeUntilDestroyed(),
  ),
);
```

`HttpClient` already uses `AbortSignal` when unsubscribed — **async pipe / `toSignal` / `takeUntilDestroyed`** is the leak fix.

**Why not NgRx for every widget tick:** 50 actions × 50 reducers × DevTools = freeze. Query/cache layer owns server data.

### Pillar C — Collapse the network fan-out

1. **BFF:** `GET /dashboard?widgets=a,b,c`  
2. **Client batch** of IDs every N ms  
3. **SSE** for shared KPIs (`EventSource` + `NgZone.run` once per event or `runOutsideAngular` + batch)  
4. **Jitter** if stuck with many endpoints  

**Why not WS first:** Ops (reconnect, auth). 5s SLA → batched HTTP or SSE.

NUX-shaped: bell is **FCM**, not 50 polls. Dashboards that must tick: BFF or SSE.

### Pillar D — Rendering (Angular-specific)

- **OnPush** on widgets; parent must not pass `{...}` new objects every tick  
- **`@for (w of widgets; track w.id)`**  
- **`@defer (on viewport)`** heavy charts  
- **`loadComponent`** for widget types not on first paint  
- **No `{{ compute() }}`** in templates — `computed()`  
- Priority: P0 5s / P1 30s / P2 on focus  

**Why OnPush alone isn’t enough:** If a root service pushes one giant `dashboardState` signal every 5s, every widget still dirties. **Slice** per widget id.

### Pillar E — Memory

- `takeUntilDestroyed` / async pipe  
- Bound ring buffers for charts (last N points)  
- Don’t append unbounded arrays in the service  
- Profile: Angular DevTools + Chrome Memory after 30 min  

---

## 4. Whiteboard flow

```
Dashboard shell + widget registry (config)
  → viewport-visible widgets subscribe(widget$(id))
  → same id inflight → shareReplay joins
  → else BFF batch every 5s OR SSE delta
  → only that widget’s signal updates → OnPush row
  → tab hidden → pause
  → navigate away → unsubscribe → GC
```

```ts
type WidgetDef = {
  id: string;
  type: 'chart' | 'kpi' | 'table';
  priority: 0 | 1 | 2;
  refreshMs: number;
};
```

Widget #51 = config + component map, not another `interval`.

---

## 5. Why this over that

| Option | When |
|---|---|
| 50 `timer`s, OnPush only | Never as final — network still broken |
| HttpClient + shareReplay + visibility | **Default first step** |
| BFF batch | With backend — biggest win |
| NgRx for all widget JSON | Avoid (Scenario 4) |
| WebSocket everything | Only if sub-second shared push |
| iframe per widget | Hostile 3rd-party only |

**Default:**

> Visibility-aware **HttpClient + RxJS (`shareReplay` / `resource`)** + **BFF or SSE** + **OnPush widgets** + **`takeUntilDestroyed`**. NgRx stays client/session. WS only if the SLA needs push.

---

## 6. Rollout

1. Measure: requests/min, long tasks, heap, INP  
2. Pause on `document.hidden`  
3. Shared `widget$(id)` + `takeUntilDestroyed`  
4. IntersectionObserver `enabled`  
5. BFF for top 20  
6. OnPush + `track` + `@defer` charts  
7. SSE for live KPIs if needed  

---

## 7. 60-second spoken answer

> Fifty independent `interval` + `HttpClient` subscriptions are a thundering herd: network, JSON parse, and **Angular change detection**, including off-screen widgets, plus leaked timers on navigate. I’d put server data in a **shared RxJS/resource cache**, refetch only when the widget is **visible** and the tab is active, and collapse APIs with a **BFF batch or SSE**. Widgets are **OnPush** views over **per-id** signals so one KPI doesn’t check the whole dashboard. I’d `takeUntilDestroyed` everything and cap chart buffers. WebSockets are optional; I wouldn’t start there for a 5-second refresh.

---

## Related

- Scenario 5 — WS + `runOutsideAngular`  
- Scenario 4 — don’t dump APIs into NgRx  
- [ONETRUST_ANGULAR_OPTIMIZATION.md](../onetrust/ONETRUST_ANGULAR_OPTIMIZATION.md)  
- [ANGULAR_MEMORY_LEAKS.md](../angular-interview-prep/ANGULAR_MEMORY_LEAKS.md)
