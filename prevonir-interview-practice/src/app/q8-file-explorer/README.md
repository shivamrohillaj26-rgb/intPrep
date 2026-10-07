# Q8 — File Explorer: Deep Explanation (Interview-Simple Version)

Route: **`/q8`**

Short cheat sheet: [FILE_EXPLORER.md](./FILE_EXPLORER.md)

---

## What the web / interview sources say

I compared common guides (InterviewLane, DEV.to machine-coding posts, hellofrontend, Frontend School, techinterview). Here’s the consensus:

### Almost every solution agrees on this core

1. **Recursive component** — `TreeNode` renders `TreeNode` for children  
2. **Same data shape** at every level — `{ id, name, type, children? }`  
3. **Indent with `depth * N` px**  
4. **Files = leaves** (no children UI)

That alone is the 15–20 minute “must pass” version.

### Where guides disagree: where does “open/closed” live?

| Approach | Who uses it | Pros | Cons |
|---|---|---|---|
| **Local `isOpen` / `useState(false)` inside each folder node** | Most timed machine-coding blogs (DEV.to, hellofrontend) | Fastest to code; no prop drilling for toggle | Can’t easily “expand all”; state lost if node is destroyed/recreated poorly |
| **Lifted `Set` of expanded ids on parent** | InterviewLane / “senior” writeups | Controllable, expand-all, URL restore, one source of truth | More code: pass Set + toggle callback + re-emit through recursion |
| **`isOpen` flag on the data node itself** | Some vanilla JS trees | Simple mentally | Mixes UI state into data; awkward with immutable updates |

**Finding:** For a **45-min interview under pressure**, local `isOpen` is what people actually ship in the first pass. Lifted `Set` is the “say this if they ask how you’d scale it” answer.

### Add / delete?

- Often a **follow-up**, not the first ask  
- When asked: keep tree in the **parent**, update with **immutable** map/filter walk  
- `prompt` / `confirm` are accepted in interviews; mention modal for production  

### What interviewers rarely require in 45 min

- ARIA tree keyboard nav (mention only)  
- Virtualization / lazy load (mention only)  
- Drag-drop, rename, search  

---

## What we changed in this app (and why)

**Before (harder to reason about in a hurry):**

- Parent owned `expandedIds` Set + `selectedId`  
- Every `TreeNode` took 4 inputs and re-emitted 4 outputs  
- Deep event bubbling was hard to read  

**Now (aligned with common interview blogs):**

- Each folder has **local** `isOpen = signal(false)`  
- Parent only owns **`tree`** + `addChild` / `deleteNode`  
- Child only re-emits **`add`** and **`remove`** (needed because tree data is shared)

```text
FileExplorer          tree signal + insert/remove
    └── TreeNode      local isOpen + row UI
            └── TreeNode …
```

### Why local `isOpen` is easier in an interview

```ts
// before: parent Set + emit toggle + re-emit at every level
(toggle)="toggle.emit($event)"

// now: one line inside the node
onRowClick() {
  if (this.isFolder) this.isOpen.update((o) => !o);
}
```

No Set cloning, no toggle output, no selection plumbing.

### When you’d still use a lifted Set (say this out loud)

> “If we need expand-all, persist open folders, or drive open state from the URL, I’d lift a `Set` of ids to the parent — same recursion, just controlled expand.”

That one sentence shows seniority without coding the hard version first.

---

## Files

| File | Job |
|---|---|
| `file-tree.model.ts` | `FsNode` type + sample data |
| `file-explorer.ts` | Owns `tree`, add, delete |
| `tree-node.ts` | One row + local expand + recurse |
| `tree-node.html` | Row + children `@for` |

---

## Data model

```ts
interface FsNode {
  id: string;
  name: string;
  type: 'file' | 'folder';
  children?: FsNode[]; // folders only
}
```

UI open/closed is **not** on the node — it’s `isOpen` on the component instance.

---

## Expand / collapse (the simple path)

```ts
isOpen = signal(false);

onRowClick() {
  if (this.isFolder) this.isOpen.update((open) => !open);
}
```

```html
@if (isFolder && isOpen()) {
  @for (child of node().children; track child.id) {
    <tree-node [node]="child" [depth]="depth() + 1" ... />
  }
}
```

Indent:

```html
[style.paddingLeft.px]="depth() * 14 + 8"
```

---

## Add / delete (follow-up)

Still on the parent — only one tree exists:

```ts
tree.update((nodes) => insertChild(nodes, parentId, child));
tree.update((nodes) => removeNode(nodes, id));
```

Child:

```ts
onAdd(type, event) {
  event.stopPropagation(); // don’t also toggle row
  this.isOpen.set(true);   // so new item is visible
  this.add.emit({ parentId: this.node().id, type });
}
```

`stopPropagation` matters: without it, clicking `+F` also toggles the folder.

Immutable helpers (memorize the shape):

```ts
// insert: map → if id match append child; else recurse into children
// remove: filter out id → map recurse into children
```

---

## Interview build order (doable)

| Time | Do this |
|---|---|
| 0–5 | `FsNode` + sample JSON |
| 5–15 | Recursive `TreeNode` + **local** `isOpen` + depth indent |
| 15–25 | Polish icons / CSS |
| 25–40 | Add + delete (if asked) |
| leftover | Mention lifted Set, a11y, virtualize |

---

## React ↔ Angular map

| React (typical blog) | This Angular code |
|---|---|
| `useState(false)` per folder | `isOpen = signal(false)` |
| `<TreeNode />` recursive | `<tree-node>` imports itself |
| `key={id}` | `track child.id` |
| `paddingLeft: depth * 16` | same |
| Parent `setTree` for CRUD | `tree.update(...)` |

---

## Summary

> Web consensus: recursion + indent is required; **local open state** is the fastest interview path; lifted `Set` is the upgrade story. We simplified q8 to local `isOpen` and kept add/delete as parent immutable updates only — less event plumbing, same interview signals.
