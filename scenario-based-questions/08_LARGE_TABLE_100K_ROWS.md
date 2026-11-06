# Scenario 8 — Admin table with 100,000 rows (Angular)

**Prompt:** An Angular admin panel renders 100,000 rows and becomes unusable. How do you fix performance and UX?

**NUX analogue:** device lists, alerts — CDK virtual scroll, not `*ngFor` of everything. [ONETRUST_INFINITE_VIRTUAL_SCROLL.md](../onetrust/ONETRUST_INFINITE_VIRTUAL_SCROLL.md)

---

## 1. Clarify

Do they need 100k **DOM nodes**, or **access** to 100k records? Sort/filter server vs client? Inline edit?

> Nobody needs 100,000 components. They need **fast access** to any of 100,000 records.

---

## 2. Diagnose

- Enormous DOM → layout/paint/memory  
- Default CD walks 100k bindings (`{{ row.x }}`, worse `{{ fmt(row) }}`)  
- `@for` / `*ngFor` without `track` → destroy/create on every filter  
- Even OnPush dies if **all rows are mounted**

---

## 3. Solution stack (Angular)

### A — Don’t fetch or render everything

```
GET /items?cursor=...&limit=50&sort=&filter=
```

Page size 50–100. **Server** filter/sort at 100k (indexes).

**Why not only virtualize 100k JSON in the browser:** Virtualization fixes DOM; **pagination/cursor fixes download + `JSON.parse` + heap**. Prefer both for “Excel scroll.”

### B — Virtualize when they insist on long scroll

**Angular CDK** `cdk-virtual-scroll-viewport` + `*cdkVirtualFor` + `itemSize`  
PrimeNG `[virtualScroll]` on fat dropdowns (NUX pattern).

~20–50 **DOM** rows. Recycle views.

Practice: `prevonir-interview-practice` `/q7`.

### C — Row discipline

- OnPush row component  
- `@for (row of page; track row.id)` if **not** CDK (paged table)  
- No charts inside each row  
- No `{{ compute(row) }}` — pipe or precompute  

### D — Filter/sort location

| Size | Where |
|---|---|
| Few thousand, simple | Client + `computed()` OK |
| 100k+ | **Server** |

Client sort of 100k on each keystroke = Scenario 5 freeze.

### E — Real grids if Excel-like

AG Grid (Angular) / PrimeNG table with virtual scroll — keyboard, selection, clipboard. Honesty: don’t rebuild that in a week.

### F — Bulk / export

- Export = **server job**, not DOM dump  
- “Select all matching filter” = query on server, not 100k checkboxes  

---

## 4. Picture

```
Admin table
  ├── HttpClient / resource  server page + filters
  ├── CDK virtual viewport   if infinite
  ├── OnPush row + track id
  └── Bulk/export            server IDs / filter query
```

---

## 5. Why this over that

| Approach | Verdict |
|---|---|
| OnPush only | ❌ Still 100k views |
| Pagination only | ✅ Default admin UX |
| CDK virtual + full 100k in memory | ⚠️ DOM OK; heap/network risky |
| Server cursor + virtual window | ✅ |
| `*ngFor` of `data()` 100k | ❌ The bug |

---

## 6. 60-second spoken answer

> 100k rows is unusable because **DOM and change detection** don’t scale. I’d treat it as **data access**: **server filter/sort/cursor**, and the UI renders a **CDK virtual** window — we already do that on NUX device/alert pickers. Rows are **OnPush** with **`track` by id**. Export and bulk actions use **IDs or the same query**, not mounting every row. Memo/OnPush without windowing is not enough.

---

## Related

- Scenario 5 — ticks + virtualize  
- [12_PAGINATION…](../frontend-system-design/12_PAGINATION_TYPES_FRONTEND_SYSTEM_DESIGN.md)
