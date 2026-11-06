# OneTrust — infinite scroll + virtualization (Angular / NUX)

**One file for:** “How would you implement infinite scrolling in Angular?” · “What is virtual scroll?” · **“What did you use in IDMS / NUX?”**

**Source of truth:** `cloud-front-end` / `dashboard` — CDK `@angular/cdk/scrolling`, PrimeNG `[virtualScroll]`, All-alerts **IntersectionObserver** load-more.  
**Do not say** folder names like Ternary.

Race-safety drill (JS): `javascript-interview-prep/INFINITE_SCROLL_RACE.md`.  
Pagination UX: `frontend-system-design/12_PAGINATION_TYPES_FRONTEND_SYSTEM_DESIGN.md`.

---

## 0. 40s opener (say this first)

> **Infinite scroll** and **virtual scroll** solve different problems. Infinite scroll is **how we fetch the next page** when the user nears the end. Virtual scroll is **how we keep the DOM small** — only the visible window of rows exist. You can combine them: fetch page 2 while only rendering 20 DOM nodes.  
> In Angular I’d use an **IntersectionObserver** on a sentinel (or a scroll handler with a threshold), `loading` + `hasMore`, **cursor or offset**, and **`switchMap` / abort** if filters change so an old page can’t land. For huge lists already in memory, **Angular CDK** `cdk-virtual-scroll-viewport` + `*cdkVirtualFor` + fixed `itemSize`.  
> **On NUX** we do both: **CDK virtual scrolling** on Greenzone driver lists, All-alerts driver/vehicle filters, transfer-vehicles, requested-video pickers. **PrimeNG** `[virtualScroll]` on big dropdowns (often when options **> 50**). **All-alerts “view all” cards** infinite-load with **IntersectionObserver**, not CDK. Notification drawer loads more when the carousel hits the end (`hasMore` + `endTime` cursor).

---

## 1. Two problems — don’t mix them

```text
Infinite scroll  = DATA   “Get page N from the API”
Virtual scroll   = DOM    “Don’t create 10,000 <tr> nodes”
```

| | Infinite scroll | Virtual scroll (windowing) |
|---|---|---|
| Goal | More **data** as you scroll | Fewer **DOM** nodes |
| Typical API | `offset` / `cursor` / `endTime` | In-memory array (or paged array) |
| Browser API | `IntersectionObserver` or `scroll` | CDK / PrimeNG virtual |
| 10k rows all downloaded | Still **kills** the page | **Fixes** the page |
| Empty next page | Set `hasMore = false` | N/A |

**Resume 8s → &lt;2s:** mostly **virtualization + don’t render everything**, not “infinite scroll” alone.

---

## 1b. Dictate this: sentinel + IntersectionObserver

If she asks “what is a sentinel?” or “what is Intersection Observer?” — **say this, slowly.**

### Sentinel (20s)

> A **sentinel** is just a **dummy element** at the **end of the list** — often an empty `div`. It isn’t a card. It’s a **tripwire**. When that tripwire **scrolls into view**, we know the user is near the bottom, so we fetch the next page. The name comes from “guard that watches.”

```text
  [ card ]
  [ card ]
  [ card ]
  [ ░ empty div — SENTINEL ]   ← when THIS is visible → load more
```

Not Angular-specific. Not CDK. Just HTML we put last (All-alerts: `viewAllLoadMoreSentinel`).

### Intersection Observer (35s)

> **`IntersectionObserver` is a browser API.** You give it an element and a **root** (the scroll box, or the viewport). The browser tells you when that element **intersects** — overlaps — the root. “Is this node on screen (or inside this scroller)?”  
> We **do not** listen to every `scroll` pixel. The browser does the geometry **off the main-thread-heavy path** and **calls us only when visibility changes**. That’s cheaper than `addEventListener('scroll')` firing hundreds of times.  
> Options we care about: **`root`** = which box is the scroller (drawer vs window). **`rootMargin`** = grow that box (e.g. `'200px'`) so we load **before** the user truly hits the bottom — prefetch. **`threshold`** = how much of the sentinel must show (`0` = any pixel).

```text
  Scroll container (root)
  ┌─────────────────────┐
  │  visible cards      │
  │                     │
  │              ↓ user scrolls
  │  sentinel enters    │  ← observer: isIntersecting = true
  └─────────────────────┘
         callback → loadMore()
```

Tiny API shape:

```ts
const observer = new IntersectionObserver(
  (entries) => {
    if (entries.some((e) => e.isIntersecting)) {
      loadMore(); // sentinel became visible
    }
  },
  { root: scrollDiv, rootMargin: '200px', threshold: 0 },
);
observer.observe(sentinelDiv);   // start watching
observer.disconnect();           // ngOnDestroy — avoid leaks
```

**`isIntersecting`:** boolean on each entry — “is this target overlapping the root (plus margin)?”

### Together in one sentence

> The **sentinel** is the **element**. The **IntersectionObserver** is the **watchman** that tells us when that element is visible.

### Why not just `(scroll)`?

| | `scroll` event | IntersectionObserver |
|---|---|---|
| How often | Every wheel tick | Only when visibility **changes** |
| Work | You compute `scrollTop + height vs scrollHeight` | Browser computes intersection |
| Nested drawer | Easy to bind the wrong element | Pass **`root`** = the overflowing div |
| Prefetch | Manual threshold math | **`rootMargin`** |

We still use `(scroll)` in some NUX modals (subscribe-users). Observer is the **cleaner** interview answer for infinite scroll.

### Cleanup (they may ask)

> Observe in `ngAfterViewInit` (sentinel exists). **`disconnect()` in `ngOnDestroy`** or you leak observers. If the list is rebuilt, unbind and observe the new sentinel (All-alerts does `unbind` / `bind`).

---

## 2. Infinite scroll — high level (whiteboard)

```text
items[], cursor/offset, loading, hasMore

User scrolls near bottom
  → if !loading && hasMore
  → fetch next page
  → append (dedupe by id)
  → if short page / flag from API → hasMore = false

Filter / tenant / search change
  → reset items + cursor
  → cancel in-flight (switchMap / AbortController)
```

**States:**

| Flag | Why |
|---|---|
| `loading` / `loadingMore` | Block **duplicate** fetches |
| `hasMore` | Stop at the end |
| `cursor` or `offset` | Next request |
| generation / `switchMap` | Ignore **stale** page after filter change |

**Trigger options:**

1. **Sentinel + `IntersectionObserver`** (preferred) — a 1px div at the bottom; when it enters the scrollport, load more.  
2. **`(scroll)`** on the container — `scrollTop + clientHeight >= scrollHeight - threshold`.  
3. **Explicit “Load more” button** — simpler, worse UX; we still have this on some panels.

**Don’t** `setInterval` poll. Don’t listen on `window` if the list is inside a drawer with its own overflow.

**API:** prefer **cursor** (`nextEndTime`, `nextToken`) over page numbers when rows insert at the top. Offset is OK for stable admin lists (`offset: users.length`).

---

## 3. Infinite scroll — Angular code (interview-simple)

### A — IntersectionObserver (same idea as All-alerts view-all)

```ts
@Component({ /* ... */ })
export class AlertFeed implements AfterViewInit, OnDestroy {
  private readonly api = inject(AlertApi);
  @ViewChild('sentinel') sentinel?: ElementRef<HTMLElement>;

  items = signal<Alert[]>([]);
  loadingMore = signal(false);
  hasMore = signal(true);
  private cursor: string | null = null;
  private observer?: IntersectionObserver;
  private inFlight = false;

  ngAfterViewInit(): void {
    const el = this.sentinel?.nativeElement;
    if (!el || !('IntersectionObserver' in window)) return;

    this.observer = new IntersectionObserver(
      (entries) => {
        if (!entries.some((e) => e.isIntersecting)) return;
        void this.loadMore();
      },
      { root: this.scrollRoot?.nativeElement ?? null, rootMargin: '200px', threshold: 0 },
    );
    this.observer.observe(el);
  }

  ngOnDestroy(): void {
    this.observer?.disconnect();
  }

  async loadMore(): Promise<void> {
    if (this.inFlight || this.loadingMore() || !this.hasMore()) return;
    this.inFlight = true;
    this.loadingMore.set(true);
    try {
      const page = await this.api.list({ cursor: this.cursor });
      this.items.update((prev) => [...prev, ...page.items]);
      this.cursor = page.nextCursor;
      this.hasMore.set(page.hasMore);
    } finally {
      this.inFlight = false;
      this.loadingMore.set(false);
    }
  }
}
```

```html
<div #scrollRoot class="list" style="overflow: auto; height: 70vh">
  @for (row of items(); track row.id) {
    <app-row [row]="row" />
  }
  @if (loadingMore()) { <div class="skeleton">Loading…</div> }
  <div #sentinel aria-hidden="true"></div>
</div>
```

**NUX extras to mention:** All-alerts runs the callback in **`NgZone`**, uses `rootMargin` to **prefetch** before the user hits the true bottom, and flags `consumed` / `requestInFlight` so one intersection doesn’t fire two pages.

### B — RxJS if they want streams

```ts
loadMore$.pipe(
  exhaustMap(() => this.api.list(this.cursor)), // ignore taps while in flight
);
filter$.pipe(
  debounceTime(300),
  switchMap((q) => this.api.listFirstPage(q)), // drop stale
);
```

`exhaustMap` = infinite-scroll **append**. `switchMap` = **new search**.

### C — What NUX also does (not only observer)

| Surface | How load-more fires |
|---|---|
| All-alerts **view all** cards | **IntersectionObserver** on sentinel |
| Notification drawer | Scroll carousel to end + `hasMore` → `GET .../notification/list&endTime=` |
| Reports “subscribe users” | `(scroll)` + `offset: users.length` until `total` |
| Some panels | **Load more** button (`common.pagination.loadMore`) |

---

## 4. Virtualization — high level

```text
Array of 10,000 drivers
Viewport shows ~8 rows
CDK creates ~8 + buffer DOM nodes
On scroll: recycle nodes, bind next slice (trackBy id)
```

**Fixed `itemSize`:** CDK **fixed-size** strategy (what we use). All rows **same height** (NUX: filters ~32px, Greenzone/transfer ~**56px**). CSS **must match** `itemSize` or the scrollbar lies.

**Variable height:** CDK autosize / experimental — we **don’t** lead with that. Interview: “we keep rows fixed so math is O(1).”

**`trackBy` / `track`:** recycled DOM. Wrong id → **wrong checkbox / avatar**. NUX uses `trackByDriverId` / `trackEntityById`.

**Buffer:** `minBufferPx` / `maxBufferPx` — extra rows above/below so fast flick doesn’t flash empty.

---

## 5. What NUX actually uses for virtualization

**Yes — Angular CDK virtual scrolling.** Package `@angular/cdk` (`^21.x`). Imports:

`CdkVirtualScrollViewport`, `CdkFixedSizeVirtualScroll`, `CdkVirtualForOf` from `@angular/cdk/scrolling`.

```html
<cdk-virtual-scroll-viewport
  [itemSize]="56"
  minBufferPx="400"
  maxBufferPx="800"
>
  <button
    type="button"
    *cdkVirtualFor="let driver of drivers; trackBy: trackByDriverId"
  >
    {{ driver.driverName }}
  </button>
</cdk-virtual-scroll-viewport>
```

(Greenzone driver panel is this shape.)

**Also PrimeNG** (not instead of CDK — **dropdowns**):

```html
<p-select
  [virtualScroll]="driverOpts.length > 50"
  [virtualScrollItemSize]="34"
  ...
/>
```

| Where | Tool |
|---|---|
| Greenzone driver sidebar | **CDK** viewport + `*cdkVirtualFor` |
| All-alerts filter dialog (drivers/vehicles) | **CDK** |
| Transfer-vehicles picker | **CDK** |
| Requested-videos / live-management vehicle filters | **CDK** |
| PrimeNG selects (Greenzone, beacons, accessory, assign-driver, …) | **`[virtualScroll]`** when list is large |
| All-alerts **card feed** | Infinite **fetch** via Observer — **not** CDK on every card |

**Not:** `react-window`, ag-Grid row virtualization as the default for those pickers, homemade `translateY` window (unless they ask DIY).

**Real bug (say if they ask “any catch?”):** CDK **reuses** row DOM. Native checkbox click can **desync** from Angular `[ngModel]`. We drive selection from the **model** (`toggleDriverId`) / `preventDefault` where needed. Always **`trackBy` id**.

Viewport needs a **fixed height** (CSS). CDK cannot virtualize a page that grows with content and has no overflow.

---

## 6. Combining both (senior answer)

```text
GET page 1 (50 alerts)     → items = 50
User scrolls (virtual or not)
Near end → GET page 2      → items = 100
CDK still only paints ~10 DOM rows
```

If the API already returned 10k (bad): **only CDK** saves you. If the API is paged 50 at a time: **infinite scroll** saves bandwidth; add CDK if each **row is heavy** (video thumbs) even at 50.

**OnPush:** append with a **new array** (`[...prev, ...page]`), don’t mutate.

---

## 7. When not to infinite-scroll

| UX | Prefer |
|---|---|
| Jump to page 50 / share `?page=3` | Offset **pagination** |
| SEO listing | Page links |
| Tiny list (&lt; ~50) | Just `@for` — no CDK |
| Ops scan of 10k devices | **CDK** + maybe paged fetch |

---

## 8. Q bank

**Q: How do you implement infinite scroll in Angular?**  
Observer or scroll threshold → `loadMore` if `hasMore` && !`loading` → append → cursor. Reset + `switchMap` on filters.

**Q: CDK vs infinite scroll?**  
CDK = DOM. Infinite = API. Different layers.

**Q: What do you use in NUX?**  
**`@angular/cdk/scrolling`** (`cdk-virtual-scroll-viewport`, `*cdkVirtualFor`, fixed `itemSize`). PrimeNG virtual scroll on large selects. All-alerts cards: **IntersectionObserver** load-more.

**Q: Why fixed itemSize?**  
Simple, performant. Rows must be one height.

**Q: IntersectionObserver vs scroll event?**  
Observer is cheaper (no scroll spam). Need a **root** if the scroller isn’t the window.

**Q: Duplicate requests?**  
`inFlight` / `exhaustMap`. Stale search: `switchMap` or generation id.

**Q: Accessibility?**  
Don’t trap focus in recycled rows; announce loading; keep a Load more fallback if observer fails.

---

## 9. Don’t mix with other OneTrust files

- Tests: mock Observer in specs (All-alerts already does). File **9**.  
- Notifications load-more is **HTTP cursor**, not FCM. File **11**.  
- Large vendor list on a consent UI: **same CDK story** as Greenzone.
