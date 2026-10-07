# File Explorer — Interview Cheat Sheet

**Deep guide + web findings:** [README.md](./README.md)

---

## What interviewers usually want first (15–20 min)

1. Recursive tree from JSON  
2. Expand / collapse folders  
3. Indent by depth  
4. Works at any nesting level  

**Follow-ups:** add / delete / rename / select preview  

---

## Pattern we use now (simplest to code)

```text
FileExplorer          → owns tree signal + add/delete
TreeNode              → local isOpen signal + recurse
```

```ts
// inside TreeNode — like React useState(false)
isOpen = signal(false);

onRowClick() {
  if (folder) isOpen.update(o => !o);
}
```

**Why not lifted Set in the timed round?**  
Most machine-coding blogs (DEV.to, hellofrontend) use **local open state**. Faster, less prop drilling.

**Say if they ask for expand-all / controlled state:**  
> I’d lift a `Set` of expanded ids to the parent.

---

## Data

```ts
type FsNode = {
  id: string;
  name: string;
  type: 'file' | 'folder';
  children?: FsNode[];
};
```

---

## Add / delete (follow-up)

```ts
tree.update(nodes => insertChild(nodes, parentId, child)); // immutable map
tree.update(nodes => removeNode(nodes, id));               // filter + map
```

Buttons: `event.stopPropagation()` so row doesn’t toggle.

---

## Spoken 20s

> Recursive `TreeNode` with local open state and depth-based indent. Tree data stays on the parent; add/delete walk the tree immutably. If we need expand-all I’d lift a Set of ids instead.

---

## Practice

Route: `/q8`  
Rewrite blank: model → recurse + local isOpen → add/delete.
