# Infinite Scroll Fetching + Race Conditions — Interview Ready

**Problem:** Load pages of data as the user scrolls near the bottom. Handle loading flags, end-of-list, and **out-of-order responses** so an older page can’t corrupt state.

Related: lazy windowing in [README.md](./README.md) §2, pagination UX in [12_PAGINATION…](../frontend-system-design/12_PAGINATION_TYPES_FRONTEND_SYSTEM_DESIGN.md), cancel in [CANCELLABLE_FETCH.md](./CANCELLABLE_FETCH.md).

---

## 1. What “good” looks like

```text
User scrolls → near bottom → fetch page N
  → append items
  → if empty / short page → stop
  → ignore response if a newer fetch superseded it (filter change)
```

States to track:

| State | Why |
|---|---|
| `items[]` | Accumulated list |
| `page` / `cursor` | Next request |
| `loading` | Block duplicate fetches |
| `hasMore` | Stop when done |
| `requestId` or AbortController | Race safety |

---

## 2. One-liner

> On scroll-near-bottom I fetch the next page if not already loading and hasMore. I guard with a monotonic request id (and optionally AbortController) so stale responses never append. Filters/reset clear the list and bump the id.

---

## 3. Core race bug

```text
t0: fetch page=1 (slow)
t1: user changes filter → fetch page=1 for filter B (fast)
t2: B returns → show B
t3: slow A returns → appends/overwrites with A 💥
```

Same class of bug as typeahead (Tricky Q3). Infinite scroll adds **append** vs replace.

---

## 4. Interview-ready implementation (vanilla)

```js
function createInfiniteList(fetchPage) {
  let items = [];
  let page = 1;
  let loading = false;
  let hasMore = true;
  let seq = 0; // monotonic request generation

  async function loadMore() {
    if (loading || !hasMore) return;

    loading = true;
    const mySeq = ++seq;
    const myPage = page;

    try {
      const batch = await fetchPage(myPage);
      // stale: a reset/newer load happened
      if (mySeq !== seq) return;

      if (!batch.length) {
        hasMore = false;
      } else {
        items = items.concat(batch);
        page = myPage + 1;
      }
      return items;
    } finally {
      if (mySeq === seq) loading = false;
    }
  }

  function reset() {
    seq++; // invalidate in-flight
    items = [];
    page = 1;
    loading = false;
    hasMore = true;
  }

  function onScroll({ scrollY, viewportH, scrollHeight, threshold = 200 }) {
    if (scrollY + viewportH >= scrollHeight - threshold) {
      return loadMore();
    }
  }

  return {
    loadMore,
    reset,
    onScroll,
    getState: () => ({ items, page, loading, hasMore }),
  };
}

// mock API
async function fetchPage(page) {
  await new Promise((r) => setTimeout(r, 100 + Math.random() * 400));
  if (page > 5) return [];
  return Array.from({ length: 10 }, (_, i) => `item-${page}-${i}`);
}

const list = createInfiniteList(fetchPage);
await list.loadMore();
console.log(list.getState().items.length); // 10
```

### Wire to DOM (sketch)

```js
const list = createInfiniteList((page) =>
  fetch(`/api/feed?page=${page}`).then((r) => r.json()),
);

window.addEventListener('scroll', () => {
  list
    .onScroll({
      scrollY: window.scrollY,
      viewportH: window.innerHeight,
      scrollHeight: document.documentElement.scrollHeight,
    })
    .then(() => {
      // re-render from list.getState().items
    });
});

list.loadMore(); // initial page
```

Throttle the scroll handler — see [DEBOUNCE_THROTTLE.md](./DEBOUNCE_THROTTLE.md).

---

## 5. Stronger: AbortController per generation

```js
async function loadMore() {
  if (loading || !hasMore) return;
  loading = true;

  controller?.abort();
  controller = new AbortController();
  const { signal } = controller;
  const mySeq = ++seq;
  const myPage = page;

  try {
    const batch = await fetchPage(myPage, { signal });
    if (mySeq !== seq) return;
    // append / hasMore update...
  } catch (e) {
    if (e.name === 'AbortError') return;
    throw e;
  } finally {
    if (mySeq === seq) loading = false;
  }
}
```

Use **both** abort (save bandwidth) and seq (correctness if abort unavailable).

---

## 6. Cursor / offset notes

| API style | Client state |
|---|---|
| `?page=2` | Increment page |
| `?cursor=abc` | Store `nextCursor` from response |
| Offset | `offset = items.length` — careful with inserts/deletes |

Prefer cursor for feeds (pagination guide). Race rules identical.

---

## 7. UX details interviewers like

| Topic | Answer |
|---|---|
| Double fire on scroll | `loading` gate + throttle |
| Empty first page | `hasMore = false`, show empty state |
| Error | Clear loading; optional retry; don’t advance page |
| Filter change | `reset()` then `loadMore()` |
| Virtualization | Don’t keep 50k DOM nodes — window render (README §2) |
| IntersectionObserver | Prefer over scroll math: observe a sentinel `div` at list bottom |

### IntersectionObserver sketch

```js
const sentinel = document.querySelector('#sentinel');
const io = new IntersectionObserver((entries) => {
  if (entries[0].isIntersecting) list.loadMore();
});
io.observe(sentinel);
```

---

## 8. Spoken answers

### 30s

> I keep page, items, loading, and hasMore. Near the bottom I fetch the next page and append. To handle races I bump a request id on each load or reset and only apply the response if the id still matches — same idea as search cancellation, optionally with AbortController.

### 60s

> Infinite scroll is pagination plus a scroll or IntersectionObserver trigger. The hard part isn’t the slice — it’s duplicate requests and stale responses when filters change. I gate on loading, invalidate in-flight work on reset, and prefer cursor-based APIs. For huge lists I separate data paging from DOM virtualization so we don’t mount every row.

---

## 9. Practice checklist

- [ ] Implement `createInfiniteList` with seq guard  
- [ ] Explain stale append bug with timeline  
- [ ] Add AbortController  
- [ ] Mention IntersectionObserver + throttle  
- [ ] Contrast with pure in-memory lazy loader (README)  

---

## Related

| Topic | File |
|---|---|
| Cancellable fetch | [CANCELLABLE_FETCH.md](./CANCELLABLE_FETCH.md) |
| Pagination system design | [12_PAGINATION…](../frontend-system-design/12_PAGINATION_TYPES_FRONTEND_SYSTEM_DESIGN.md) |
| Debounce / throttle | [DEBOUNCE_THROTTLE.md](./DEBOUNCE_THROTTLE.md) |
| Stale search | [TRICKY_10_FRONTEND_QUESTIONS.md](./TRICKY_10_FRONTEND_QUESTIONS.md) Q3 |
