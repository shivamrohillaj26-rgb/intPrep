# Filter + Sort Utility — Interview Ready Guide

Reusable `filterAndSort` for arrays of objects — NTT-style “write a reusable sorting and filtering function.”

Related: [CUSTOM_SORT_PRIORITY.md](./CUSTOM_SORT_PRIORITY.md) · [DSA_FRONTEND_JS.md](./DSA_FRONTEND_JS.md) §12–14

---

## 1. The interview question

> Write a reusable function that filters and sorts an array of objects by config (not hard-coded fields).

---

## 2. One-liner

> Take `items` + a config: apply predicate filters, then a comparator sort. Keep it pure (return a new array). For huge lists, do filter/sort on the **server**; this util is for client-side or page-sized data.

---

## 3. Implementation

```js
/**
 * @param {object[]} items
 * @param {{
 *   filters?: Array<(item) => boolean>,
 *   sortBy?: string | ((item) => any),
 *   order?: 'asc' | 'desc',
 *   compare?: (a, b) => number   // optional override
 * }} config
 */
function filterAndSort(items, config = {}) {
  const {
    filters = [],
    sortBy,
    order = 'asc',
    compare,
  } = config;

  let result = items.filter((item) =>
    filters.every((fn) => fn(item)),
  );

  if (!sortBy && !compare) return result;

  const keyFn =
    typeof sortBy === 'function' ? sortBy : (item) => item[sortBy];

  const cmp =
    compare ||
    ((a, b) => {
      const av = keyFn(a);
      const bv = keyFn(b);
      if (av < bv) return -1;
      if (av > bv) return 1;
      return 0;
    });

  result = result.slice().sort((a, b) => {
    const r = cmp(a, b);
    return order === 'desc' ? -r : r;
  });

  return result;
}
```

---

## 4. Usage

```js
const users = [
  { name: 'Sam', role: 'admin', age: 30 },
  { name: 'Ada', role: 'dev', age: 28 },
  { name: 'Bob', role: 'dev', age: 35 },
];

filterAndSort(users, {
  filters: [
    (u) => u.role === 'dev',
    (u) => u.age >= 30,
  ],
  sortBy: 'name',
  order: 'asc',
});
// [{ name: 'Bob', role: 'dev', age: 35 }]
```

Search + multi-field:

```js
function matchesQuery(q) {
  const needle = q.trim().toLowerCase();
  return (u) =>
    !needle ||
    u.name.toLowerCase().includes(needle) ||
    u.role.toLowerCase().includes(needle);
}

filterAndSort(users, {
  filters: [matchesQuery('a')],
  sortBy: (u) => u.age,
  order: 'desc',
});
```

---

## 5. Architecture note (100k rows)

| Data size | Where filter/sort runs |
|---|---|
| Hundreds–low thousands | Client util OK |
| 100k+ | **Server** (SQL/index) + paginate/virtualize FE |

Interview line:

> I’d use this util for the current page or a cached slice. For 100k I’d push filter/sort/search to the API and virtualize the DOM.

See [08_LARGE_TABLE_100K_ROWS.md](../scenario-based-questions/08_LARGE_TABLE_100K_ROWS.md).

---

## 6. Spoken (30s)

> I take items and a config of filter predicates plus sort key/order. Filters run with `every`, then I copy and `sort` with a comparator. The function is pure and reusable across tables. For large datasets I keep this on the server and only sort/filter the page the UI shows.

---

## 7. Practice checklist

- [ ] Implement `filterAndSort` from memory  
- [ ] Support `sortBy` string and function  
- [ ] Mention server-side for 100k  
- [ ] Contrast with hard-coded `users.filter(...).sort(...)`  
