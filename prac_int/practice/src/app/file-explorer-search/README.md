# File Explorer Search — How It Works

Route: `/file-explorer-search` (nav: **FE Search**)

This is a copy of the original `file-explorer` with **tree search** added. Original files are untouched.

---

## The problem we’re solving

A file tree is nested:

```text
src/
  app/
    app.component.ts
    app.config.ts
  assets/
    logo.svg
public/
  index.html
docs/
  readme.md
```

If the user types `component`, we must:

1. Find matching nodes (`app.component.ts`, etc.)
2. **Still show parent folders** (`src` → `app`), otherwise the match has no path context
3. **Hide unrelated branches** (`public`, `docs`, `assets`)
4. **Auto-expand** matching paths (matches are useless if parents stay collapsed)
5. Optionally **highlight** the matched text

That is the classic “search in a tree” interview question.

---

## High-level flow

```text
User types in search box
        │
        ▼
searchQuery signal updates
        │
        ├──► filteredData (computed)  → filterTree() rebuilds visible tree
        │
        └──► searchActive (computed)  → true when query is non-empty
                    │
                    ▼
           passed into every <app-node-search>
                    │
                    ├── effect() forces isExpanded = true
                    └── highlightParts() yellow-marks the match
```

**Parent owns search state. Nodes only display + expand/highlight.**

| Piece | Where | Role |
|-------|--------|------|
| `searchQuery` | parent | what the user typed |
| `filterTree()` | parent | decide which nodes stay in the UI |
| `filteredData` | parent | reactive filtered tree for `@for` |
| `searchActive` | parent → nodes | “we’re searching, open folders” |
| `isExpanded` | each node | local open/close |
| `highlightParts()` | each node | split name for yellow highlight |

---

## Step 1 — Capture the query (parent)

```html
<input
  [ngModel]="searchQuery()"
  (ngModelChange)="searchQuery.set($event)"
/>
```

```ts
searchQuery = signal('');
```

Every keystroke updates the signal. That alone re-runs anything that depends on it (`computed`, templates, `effect`s in children that read related inputs).

---

## Step 2 — Filter the tree (`filterTree`)

This is the core algorithm.

### Rule

For each node:

- **Keep it** if its own `name` contains the query (**self match**), **OR**
- **Keep it** if any filtered child survived (**descendant match**)

That second rule is why ancestors stay visible.

### Empty query

If the query is blank → return the original `data` unchanged. No filtering.

### Pseudocode

```text
filterTree(nodes, query):
  if query empty → return nodes

  result = []
  for each node in nodes:
    selfMatch = node.name includes query?
    filteredChildren = filterTree(node.children, query)   // recurse first

    if selfMatch OR filteredChildren is not empty:
      keep a copy of node
      decide which children to attach (see below)
      push into result

  return result
```

### Which children do we attach?

| Situation | Children shown |
|-----------|----------------|
| Only descendants matched | **filtered** children (matching branch only) |
| Folder name matched, but no child matched | **all** original children |
| Both folder and some children matched | **filtered** children |

Example query: `component`

```text
BEFORE (full tree)                    AFTER (filtered)
─────────────────                     ────────────────
src/                                  src/          ← kept (child matched)
  app/                                  app/        ← kept (child matched)
    app.component.ts                      app.component.ts  ← self match
    app.component.html                    app.component.html
    app.component.scss                    app.component.scss
    app.config.ts                       (config/routes dropped)
    app.routes.ts
  assets/                             (assets dropped — no match)
    logo.svg
public/                               (public dropped)
docs/                                 (docs dropped)
```

Example query: `src` (folder name matches, children don’t contain `"src"`)

```text
src/                 ← self match, no child matches the string "src"
  app/               ← show ALL original children
  assets/
```

### Why we copy with `{ ...node, children: ... }`

We don’t mutate the original `data` while filtering. We build a **new tree shape for display**. Clearing the search returns to the full original tree.

---

## Step 3 — Render the filtered tree

```html
@for (node of filteredData(); track node.id) {
  <app-node-search
    [nodes]="node"
    [searchQuery]="searchQuery()"
    [searchActive]="searchActive()"
  />
}
```

- Template loops **`filteredData()`**, not raw `data`
- Same recursive `<app-node-search>` pattern as the original explorer
- If filter returns `[]` → show “No matches”

`filteredData` is a **computed**:

```ts
filteredData = computed(() => this.filterTree(this.data, this.searchQuery()));
```

So it recalculates whenever `searchQuery` changes.

---

## Step 4 — Auto-expand while searching

Filtering alone is not enough. Each node still has:

```ts
isExpanded = signal(false); // starts collapsed
```

Children render only when expanded:

```html
@if (nodes()?.children && isExpanded()) { ... }
```

So without help, a match under `src/app` would stay hidden.

**Fix:** parent computes:

```ts
searchActive = computed(() => this.searchQuery().trim().length > 0);
```

and passes it down. Each node runs:

```ts
effect(() => {
  if (this.searchActive()) {
    this.isExpanded.set(true);
  }
});
```

When the user is searching → every visible folder opens.  
When they clear search → `searchActive` becomes false; folders keep whatever expand state they had (we don’t force-collapse).

This is an interview talking point: **filter decides what exists; expand decides what’s visible in the UI.**

---

## Step 5 — Highlight the match

In the node template we don’t print `{{ name }}` directly. We split the name:

```ts
highlightParts("app.component.ts")  // query = "component"
// →
// [
//   { text: "app.",           match: false },
//   { text: "component",      match: true  },
//   { text: ".ts",            match: false },
// ]
```

Template:

```html
@for (part of highlightParts(nodes()?.name ?? ''); track $index) {
  <span [class.match]="part.match">{{ part.text }}</span>
}
```

CSS `.match { background: #ffe566; }` makes the hit obvious.

Matching uses `indexOf` on lowercased strings (case-insensitive, first occurrence only).

---

## End-to-end example (type `css`)

1. Input sets `searchQuery` to `"css"`.
2. `filterTree` walks the tree:
   - `styles.css` under `assets` → match → keep `assets` → keep `src`
   - `style.css` under `public` → match → keep `public`
   - `docs` → no match → drop
3. `filteredData` becomes roughly:

   ```text
   src/
     assets/
       styles.css
   public/
     style.css
   ```

4. `searchActive === true` → effects open `src`, `assets`, `public`.
5. Highlight paints **css** inside `styles.css` / `style.css`.

---

## File map

```text
file-explorer-search/
├── README.md                      ← this file
├── file-explorer-search.ts        ← data, searchQuery, filterTree, computeds
├── file-explorer-search.html      ← search input + loop filteredData
├── file-explorer-search.css
└── node/
    ├── node-search.ts             ← expand effect, highlightParts, add/delete
    ├── node-search.html           ← recursive tree UI
    └── node-search.css            ← .match highlight
```

---

## Interview talking points

### What to say in 30 seconds

> “I keep the full tree in the parent. On each keystroke I recursively filter: a node stays if its name matches or any child matches, so ancestors are preserved. I render the filtered tree, auto-expand while searching so matches aren’t hidden, and highlight the matched substring in each label.”

### Complexity

- Time: **O(n)** per keystroke — visit every node once  
- Space: **O(n)** for the filtered copy in the worst case (everything matches)

### Alternatives (if they ask “what else?”)

| Approach | Idea | Tradeoff |
|----------|------|----------|
| **Filter + expand** (what we did) | Build a smaller tree for display | Simple; cloning means edits during search can be tricky |
| **Visibility flags** | Don’t clone; mark `visible` / `expanded` on each node | Mutates model or needs parallel maps; good for large trees + edits |
| **Flat index** | Precompute `id → path`, search flat list, then expand paths | Faster repeated search; more setup |
| **Debounce** | Wait 200ms before filtering | Better UX on huge trees / remote search |

### Common follow-ups

1. **Case sensitivity?** — we lowercased both sides.  
2. **Match only files?** — add `if (node.type === 'file' && selfMatch)`.  
3. **Expand only ancestors of matches (not every visible folder)?** — track “has matching descendant” and expand only those.  
4. **Should add/delete work during search?** — safer to edit original `data` by `id`, then re-filter; our demo mostly filters for display.

---

## How this differs from the original explorer

| | Original `file-explorer` | `file-explorer-search` |
|--|--------------------------|-------------------------|
| Data shown | always full `data` | `filteredData()` |
| Search UI | none | input bound to `searchQuery` |
| Expand | manual only | manual + auto when `searchActive` |
| Labels | plain name | highlighted parts |

Same recursive node idea; search is layered on top in the parent, with small node helpers for expand + highlight.

---

## Try it

1. Run the app → open **FE Search**
2. Type `component` → only `src/app` + matching files
3. Type `css` → `styles.css` and `style.css` paths
4. Clear the box → full tree again
