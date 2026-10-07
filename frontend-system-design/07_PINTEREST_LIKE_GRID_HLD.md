# HLD — Pinterest-like Grid UI (Frontend System Design)

Interview prompt:

> Design a Pinterest-like grid UI. Discuss architecture, performance, component breakdown, data flow, and large datasets.

---

## 1. Spoken 60-second answer

> I’d build a masonry/responsive card grid with infinite scroll. Core pieces: a Feed page, Card component, image lazy-loading, a virtualized or windowed render strategy for huge feeds, and an API layer with cursor pagination. Images come from a CDN. Client caches pages, dedupes requests, and uses intersection observer for load-more and lazy images. Performance focus is fewer DOM nodes, fewer layout thrash, and transform-friendly animations.

---

## 2. Requirements (clarify first)

### Functional
- Responsive multi-column card grid (masonry or CSS columns / grid)
- Infinite scroll or “Load more”
- Card: image, title, optional user/save actions
- Optional: search / filters / boards

### Non-functional
- Fast first paint
- Smooth scroll with thousands of cards
- Good mobile performance
- Resilient network (retry/skeleton)

---

## 3. High-level architecture

```text
Browser
  App Shell (header/nav)
    FeedPage
      FilterBar (optional)
      MasonryGrid / VirtualGrid
        PinCard (many)
      IntersectionSentinel (infinite scroll)
  Services
    FeedApiService (HTTP + pagination)
    FeedCache / state (signals/store)
CDN / API
  /pins?cursor=...&limit=30
  image CDN URLs
```

---

## 4. Component breakdown (Angular)

| Piece | Responsibility |
|---|---|
| `FeedPage` | owns query/filters, page state, loadMore |
| `MasonryGrid` | layout of visible cards |
| `PinCard` | presentational: image, title, click |
| `FeedApiService` | fetch pages, map DTO → view model |
| `ImageLazy` directive | `loading="lazy"` / IntersectionObserver |

Keep cards **dumb/presentational**; page/service own data.

---

## 5. Data flow

```text
User opens Feed
  → FeedPage calls FeedApiService.loadFirst()
  → show skeletons
  → append pins to list signal/state
  → grid renders cards

User scrolls near bottom
  → sentinel visible
  → loadNext(cursor)
  → append (dedupe by id)

User clicks card
  → router to detail (lazy route)
```

API contract sketch:

```ts
interface PinsPage {
  items: Pin[];
  nextCursor: string | null;
}

interface Pin {
  id: string;
  title: string;
  imageUrl: string;
  height: number; // helps masonry without layout jump
  author: string;
}
```

Prefer **cursor pagination** over offset for infinite feeds.  
(Full comparison: [12_PAGINATION_TYPES_FRONTEND_SYSTEM_DESIGN.md](./12_PAGINATION_TYPES_FRONTEND_SYSTEM_DESIGN.md).)

---

## 6. Layout options

| Approach | Pros | Cons |
|---|---|---|
| CSS `columns` | simple masonry look | reorder / a11y quirks |
| CSS Grid + spanning | modern control | need height strategy |
| Absolute masonry (JS measure) | classic Pinterest | measure cost, reflow risk |

Interview pick:

> Start with CSS Grid/columns for MVP. If heights vary wildly and perf suffers, move to measured masonry with cached heights from API.

---

## 7. Performance strategy (what they want)

1. **Don’t render 10k DOM cards** — window/virtualize or page in chunks  
2. **Lazy images** — `loading="lazy"` + width/height or aspect-ratio to avoid CLS  
3. **Infinite scroll with cursor** — small pages (20–40)  
4. **TrackBy / `@for (pin of pins; track pin.id)`**  
5. **OnPush / signals** — reduce change detection cost  
6. **CDN + responsive images** — `srcset`  
7. **Animate with `transform`/`opacity`** — avoid layout-triggering props  
8. **Virtual scroll** for extreme lists (Angular CDK or custom windowing)

Tie to Round-1 topics:

- Reflow vs repaint → measuring masonry carefully  
- Why transform animations → scroll/hover effects  
- Big list optimization → same as virtual list coding round  

---

## 8. Caching

- In-memory page cache keyed by filter+cursor  
- HTTP cache headers / CDN for images  
- Optional Service Worker for image shell (advanced)  
- Deduplicate in-flight requests (share Replay/switchMap)

---

## 9. Edge cases to mention

- Slow network → skeletons + retry  
- Duplicate pins across pages → Map by id  
- Image fail → placeholder  
- Filter change → reset list + cursor  
- Back navigation → restore scroll position if asked  

---

## 10. Angular vs React wording

| React interview phrase | Angular equivalent |
|---|---|
| memo / PureComponent | `OnPush` / signals |
| key={id} | `track pin.id` |
| react-window | CDK virtual scroll / DIY window |
| Context/Redux feed store | signals service / NgRx (if large) |
| Suspense/skeleton | `@if (loading)` skeletons |

---

## 11. Checklist to draw on whiteboard

- [ ] App shell + Feed route  
- [ ] Card component  
- [ ] API + cursor pagination  
- [ ] Infinite scroll sentinel  
- [ ] Image lazy + aspect ratio  
- [ ] Perf: trackBy, OnPush, virtualize if needed  
- [ ] CDN images  
- [ ] Error/empty/loading states  
