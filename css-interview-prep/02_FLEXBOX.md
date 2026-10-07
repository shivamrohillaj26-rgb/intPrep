# Flexbox — Deep Interview Guide

---

## 1. What Is Flexbox?

Flexbox (Flexible Box Layout) is a 1-dimensional layout system for arranging items in a **row** or **column**.

Use it when you want:

- align items horizontally/vertically
- distribute space
- equal-height cards in a row
- navbar left/right sections
- center content easily

Interview one-liner:

> Flexbox is a one-dimensional layout model that aligns and distributes space among items in a row or column.

---

## 2. Core Terms

```html
<div class="container">
  <div class="item">1</div>
  <div class="item">2</div>
  <div class="item">3</div>
</div>
```

```css
.container {
  display: flex; /* becomes flex container */
}
```

| Term | Meaning |
|---|---|
| Flex container | parent with `display: flex` |
| Flex items | direct children of container |
| Main axis | direction items flow (`row`/`column`) |
| Cross axis | perpendicular to main axis |

```text
flex-direction: row (default)

main axis  ------------------>
cross axis |
           v
```

```text
flex-direction: column

main axis |
          v
cross axis ------------------>
```

---

## 3. Enabling Flexbox

```css
.container {
  display: flex;       /* block-level flex container */
  /* or */
  display: inline-flex; /* inline-level flex container */
}
```

Only **direct children** become flex items.

---

## 4. Container Properties (Parent)

### 4.1 `flex-direction`

```css
.container {
  flex-direction: row;            /* default: left -> right */
  flex-direction: row-reverse;    /* right -> left */
  flex-direction: column;         /* top -> bottom */
  flex-direction: column-reverse; /* bottom -> top */
}
```

### 4.2 `justify-content` (main axis alignment)

```css
.container {
  justify-content: flex-start;    /* default */
  justify-content: flex-end;
  justify-content: center;
  justify-content: space-between; /* first/last at edges */
  justify-content: space-around;  /* equal space around each */
  justify-content: space-evenly;  /* equal space everywhere */
}
```

Navbar example:

```css
.nav {
  display: flex;
  justify-content: space-between; /* logo left, links right */
  align-items: center;
}
```

### 4.3 `align-items` (cross axis alignment)

```css
.container {
  align-items: stretch;     /* default */
  align-items: flex-start;
  align-items: flex-end;
  align-items: center;
  align-items: baseline;
}
```

Perfect centering:

```css
.center-box {
  display: flex;
  justify-content: center; /* horizontal if row */
  align-items: center;     /* vertical if row */
  height: 100vh;
}
```

### 4.4 `flex-wrap`

By default, items stay on one line and may shrink.

```css
.container {
  flex-wrap: nowrap; /* default */
  flex-wrap: wrap;
  flex-wrap: wrap-reverse;
}
```

Responsive cards:

```css
.cards {
  display: flex;
  flex-wrap: wrap;
  gap: 16px;
}
```

### 4.5 `align-content` (multi-line cross-axis)

Works only when there are **multiple flex lines** (`flex-wrap: wrap`).

```css
.container {
  align-content: flex-start;
  align-content: center;
  align-content: space-between;
  align-content: stretch;
}
```

Difference:

- `align-items` → aligns items in one line
- `align-content` → aligns the lines themselves when wrapped

### 4.6 `gap`

```css
.container {
  display: flex;
  gap: 16px;           /* row and column gap */
  column-gap: 16px;
  row-gap: 12px;
}
```

Prefer `gap` over margin hacks in modern interviews/projects.

---

## 5. Item Properties (Children)

### 5.1 `order`

```css
.item:nth-child(1) { order: 2; }
.item:nth-child(2) { order: 1; }
```

Visual order changes without changing HTML. Default `order: 0`.

### 5.2 `flex-grow`

How much item grows when free space exists.

```css
.item {
  flex-grow: 0; /* default: do not grow */
}

.item.grow {
  flex-grow: 1; /* take available free space */
}
```

Example:

```css
.sidebar { flex-grow: 0; width: 240px; }
.main    { flex-grow: 1; } /* fills remaining space */
```

### 5.3 `flex-shrink`

How much item shrinks when not enough space.

```css
.item {
  flex-shrink: 1; /* default: can shrink */
}

.no-shrink {
  flex-shrink: 0; /* refuse to shrink */
}
```

### 5.4 `flex-basis`

Ideal starting size before grow/shrink.

```css
.item {
  flex-basis: 200px;
  flex-basis: 30%;
  flex-basis: auto; /* default */
}
```

### 5.5 `flex` shorthand (use this in interviews)

```css
.item {
  flex: 1;           /* grow=1, shrink=1, basis=0 */
  flex: 1 1 200px;   /* grow shrink basis */
  flex: none;        /* 0 0 auto */
  flex: auto;        /* 1 1 auto */
}
```

Very common pattern:

```css
.card {
  flex: 1 1 250px; /* grow, shrink, start around 250px */
}
```

### 5.6 `align-self`

Overrides parent `align-items` for one item.

```css
.item.special {
  align-self: flex-end;
}
```

---

## 6. Mental Model: Grow / Shrink / Basis

Think of layout engine steps:

1. Look at `flex-basis` (starting size)
2. If extra space → distribute by `flex-grow`
3. If overflow → reduce by `flex-shrink`

Example:

```css
.a { flex: 1; }
.b { flex: 2; }
```

If free space = 300px:

- A gets 100px extra
- B gets 200px extra

---

## 7. Practical Patterns (Interview Gold)

### Pattern A — Navbar

```css
.nav {
  display: flex;
  align-items: center;
  justify-content: space-between;
  gap: 16px;
}

.nav-links {
  display: flex;
  gap: 12px;
}
```

### Pattern B — Sidebar + Main

```css
.layout {
  display: flex;
  min-height: 100vh;
}

.sidebar {
  flex: 0 0 240px; /* fixed-ish width */
}

.main {
  flex: 1; /* take rest */
}
```

### Pattern C — Equal cards in a row

```css
.row {
  display: flex;
  gap: 16px;
}

.card {
  flex: 1; /* equal widths */
}
```

### Pattern D — Center anything

```css
.center {
  display: flex;
  justify-content: center;
  align-items: center;
}
```

### Pattern E — Space between left and right groups

```css
.toolbar {
  display: flex;
  justify-content: space-between;
  align-items: center;
}
```

---

## 8. Self-Adjusting List With Flexbox (Intro)

```css
.list {
  display: flex;
  flex-wrap: wrap;
  gap: 16px;
}

.list-item {
  flex: 1 1 220px; /* grow/shrink, basis 220 */
  max-width: 100%;
}
```

Behavior:

- wide screen → many items per row
- medium → fewer
- narrow → one column

(See dedicated file `05_SELF_ADJUSTING_LISTS.md` for deep coverage.)

---

## 9. Flexbox vs Float / Inline-Block (Why Flex Won)

Old ways:

- floats for columns (clearfix needed)
- inline-block gaps/whitespace issues

Flexbox advantages:

- easy vertical centering
- equal height items
- space distribution
- wrapping
- no clearfix for normal layouts

---

## 10. Common Bugs And Fixes

### Bug: children not wrapping

```css
.container { display: flex; } /* nowrap by default */
```

Fix: `flex-wrap: wrap;`

### Bug: item overflow with long text

```css
.item {
  min-width: 0; /* important in flex children */
  overflow-wrap: anywhere;
}
```

Flex items default `min-width: auto`, which can prevent shrinking below content size.

### Bug: gap not supported in old browsers

Fallback: margins (rare ask now).

---

## 11. Interview Questions

**Q: Is Flexbox 1D or 2D?**  
A: 1D (row or column). Grid is 2D.

**Q: Difference between `justify-content` and `align-items`?**  
A: justify = main axis, align-items = cross axis.

**Q: What does `flex: 1` mean?**  
A: Item can grow/shrink; basis 0; shares free space equally with other `flex:1` siblings.

**Q: `align-items` vs `align-content`?**  
A: items vs multi-line packing.

**Q: When use Flexbox over Grid?**  
A: One-dimensional alignment/distribution; components like navbars, toolbars, simple rows/columns.

---

## 12. Mini Exercises

1. Center a modal in viewport with flex.
2. Build navbar with logo left and links right.
3. Make 3 equal-width cards with gap.
4. Make wrapping card list with `flex: 1 1 250px`.

---

## 13. Cheat Sheet

```text
display: flex
flex-direction: row | column
justify-content: main axis
align-items: cross axis
flex-wrap: wrap
gap

item:
flex-grow / flex-shrink / flex-basis
flex: 1 1 200px
align-self
order

centering:
justify-content: center + align-items: center
```

---

## 14. Practice Checklist

- [ ] Explain main vs cross axis
- [ ] Build navbar and centered box from memory
- [ ] Explain flex-grow/shrink/basis
- [ ] Write wrapping responsive card row
- [ ] Fix min-width overflow issue verbally
