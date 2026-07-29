# Scenario 8 — Admin Panel with 100,000 Rows

**Prompt:** An admin panel renders 100,000 rows and becomes unusable. How would you improve performance and user experience?

---

## 1. Clarify

- Do users truly need 100k DOM rows at once, or “access to 100k records”?  
- Sorting/filtering/server vs client?  
- Row complexity (text vs nested widgets)?  
- Selection / inline edit / expandable rows?

**Senior reframe:**

> Nobody needs 100,000 DOM nodes. They need **fast access** to any of 100,000 records.

---

## 2. Diagnose

Rendering 100k `<tr>`s means:

- Enormous DOM → memory + style/layout cost  
- React reconcile of huge trees → long tasks  
- Scroll jank, input lag, browser tab crashes  

Even “optimized React” cannot make 100k complex rows feel native if all mounted.

---

## 3. Solution stack (best → supporting)

### A. Don’t fetch or render everything (UX + perf)

**Server-side pagination / cursor** as default admin pattern:

```
GET /items?cursor=...&limit=50&sort=createdAt&filter=...
```

UI: table page size 50–100, total count approx, filters.

**Why over client-only virtualization of 100k in memory:**  
Shipping 100k JSON still costs network + memory. Virtualization fixes DOM; **pagination/cursor fixes data volume**. Prefer **both**: server page *or* windowed fetch + virtualization for “infinite admin”.

### B. Virtualization (when long scroll is required)

Libraries: TanStack Virtual, `react-window`, AG Grid (often worth money for admin).

```
Viewport shows ~20–50 row DOM nodes
scroll → recycle row components → bind to data[index]
```

**Why virtualization over pagination alone:**  
Power users love dense scroll + jump; Excel-like mental model.  
**Why not only CSS `content-visibility`:** Helps but weaker than true windowing for React lists; still holds all data in memory.

### C. Column discipline

- Don’t mount 40 heavy cells per row  
- Lazy columns / column picker  
- Avoid rendering charts inside each row  

### D. Stable row identity & memo

```tsx
rowKey={row.id}  // never index for dynamic data
const Row = memo(function Row({ row }) { ... });
```

### E. Filtering/sorting location

| Dataset size | Where to filter/sort |
|---|---|
| ≤ few thousand, simple | Client OK |
| 100k+ | **Server** (indexes) |

Client sort of 100k on every keystroke = freeze (Scenario 5 vibes).

### F. Specialized grids for admin

For serious admin (select all, cell edit, pinned cols):

- **AG Grid**, Handsontable, TanStack Table + Virtual  

**Why AG Grid over homemade:**  
Keyboard nav, selection model, clipboard — expensive to rebuild; interview honesty scores points.

### G. Progressive UX

- Skeleton rows  
- “Export CSV” async job for full dataset (don’t dump 100k on screen for export-via-DOM)  
- Bulk actions via server (`POST /bulk`) with selected IDs / filter query, not 100k checkboxes in DOM  
- Prefer “select all matching filter” over selecting 100k nodes  

---

## 4. Target architecture

```
Admin Table UX
  ├── Query: server filter/sort/page (or cursor)
  ├── Cache: TanStack Query for page data
  ├── View: virtualized body (N DOM rows)
  ├── Selection model: id set / “select all in query”
  └── Export: background job → download link
```

---

## 5. Why this over that

| Approach | Verdict |
|---|---|
| `React.memo` only | ❌ Won’t save 100k mounts |
| Pagination only (no virtualization) | ✅ Good default UX |
| Virtualization + full 100k client fetch | ⚠️ OK DOM; risky memory/network |
| Server cursor + virtualization window | ✅ Best of both |
| Canvas custom grid | Extreme cases only |
| `*ngFor` / map all rows | ❌ The bug |

**Chosen answer:**  
> Treat 100k as a **data access** problem: server query + pagination/cursor, virtualize if infinite scroll required, use a real grid for complex admin UX, bulk ops/export on server. Never mount 100k rows.

---

## 6. Metrics

- DOM node count in table body (~50 not 100k)  
- Scroll FPS  
- Filter p95 latency  
- Memory after 10 minutes browsing  

---

## 7. 60-second spoken answer

> Rendering 100k rows is unusable because the DOM and React tree can’t scale that way. I’d stop treating “100k records” as “100k components.” Data stays on the server with **filter/sort/cursor pagination**; the UI renders a **virtualized** window of rows, ideally with a battle-tested grid if we need Excel-like behavior. Selection and export operate on **IDs or server-side queries**, not on mounting every row. Memoization helps at the row level, but without windowing and server query it’s insufficient.

---

## Related

- Scenario 5 — high-frequency updates + virtualization  
- Your practice: `prevonir-interview-practice` q7 virtual list  
- `../frontend-system-design/03_REFLOW_REPAINT_RENDERING_PERFORMANCE.md`  
- Pagination types (offset vs cursor vs UI patterns): `../frontend-system-design/12_PAGINATION_TYPES_FRONTEND_SYSTEM_DESIGN.md`
