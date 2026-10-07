# CSS Grid (Responsive Layout) — Deep Interview Guide

---

## 1. What Is CSS Grid?

CSS Grid is a **2-dimensional** layout system for rows **and** columns together.

Use Grid when you need:

- full page layouts
- card galleries that reflow
- dashboard regions (header/sidebar/main/footer)
- precise row + column control

Interview one-liner:

> Flexbox is one-dimensional (row or column). Grid is two-dimensional (rows and columns at the same time), and it is excellent for responsive layouts.

---

## 2. Basic Mental Model

```html
<div class="grid">
  <div>1</div>
  <div>2</div>
  <div>3</div>
  <div>4</div>
</div>
```

```css
.grid {
  display: grid;
  grid-template-columns: 1fr 1fr 1fr;
  gap: 16px;
}
```

| Term | Meaning |
|---|---|
| Grid container | element with `display: grid` |
| Grid item | direct child |
| Track | a row or a column |
| Cell | one row-column intersection |
| Gap | space between tracks |
| `fr` | fraction of free space |

---

## 3. Creating Columns And Rows

### Fixed tracks

```css
.grid {
  display: grid;
  grid-template-columns: 200px 200px 200px;
  grid-template-rows: 100px 100px;
}
```

### Flexible tracks with `fr`

```css
.grid {
  grid-template-columns: 1fr 2fr 1fr;
}
```

Available free width split as 1+2+1 = 4 parts:

- col1 = 1/4
- col2 = 2/4
- col3 = 1/4

### Repeat helper

```css
.grid {
  grid-template-columns: repeat(3, 1fr);
  /* same as 1fr 1fr 1fr */
}
```

---

## 4. Gap

```css
.grid {
  gap: 16px;          /* row + column */
  row-gap: 12px;
  column-gap: 20px;
}
```

Prefer `gap` over hacks with margins.

---

## 5. The Responsive Superpower: `auto-fit` / `auto-fill` + `minmax`

This is the most important Grid interview pattern for responsiveness.

```css
.cards {
  display: grid;
  grid-template-columns: repeat(auto-fit, minmax(250px, 1fr));
  gap: 16px;
}
```

### What this means

- each column is **at least** 250px
- can grow to `1fr` to fill space
- browser creates as many columns as fit
- when space is not enough, items wrap to next row automatically

Result:

- wide screen: 4+ cards/row
- medium: 2–3
- mobile: 1

### `auto-fit` vs `auto-fill`

```css
repeat(auto-fill, minmax(250px, 1fr))
repeat(auto-fit, minmax(250px, 1fr))
```

- `auto-fill`: keeps empty columns if space remains
- `auto-fit`: collapses empty columns and stretches existing ones

For card UIs, `auto-fit` is usually preferred.

Interview line:

> `repeat(auto-fit, minmax(min, 1fr))` creates a responsive grid without media queries.

---

## 6. Explicit vs Implicit Grid

### Explicit

You define tracks:

```css
grid-template-columns: repeat(3, 1fr);
grid-template-rows: 120px 120px;
```

### Implicit

Extra items create extra rows/columns automatically.

Control them:

```css
.grid {
  grid-auto-rows: 120px;
  grid-auto-columns: 200px;
  grid-auto-flow: row; /* default */
}
```

`minmax` for auto rows:

```css
grid-auto-rows: minmax(120px, auto);
```

---

## 7. Placing Items

### By lines

```css
.item {
  grid-column: 1 / 3; /* start line 1, end line 3 */
  grid-row: 1 / 2;
}
```

Shorthand span:

```css
.item {
  grid-column: span 2; /* take 2 columns */
}
```

### By area names (great for page layout)

```css
.page {
  display: grid;
  grid-template-columns: 240px 1fr;
  grid-template-rows: auto 1fr auto;
  grid-template-areas:
    "header header"
    "sidebar main"
    "footer footer";
  min-height: 100vh;
  gap: 12px;
}

.header  { grid-area: header; }
.sidebar { grid-area: sidebar; }
.main    { grid-area: main; }
.footer  { grid-area: footer; }
```

Responsive change:

```css
@media (max-width: 768px) {
  .page {
    grid-template-columns: 1fr;
    grid-template-areas:
      "header"
      "main"
      "sidebar"
      "footer";
  }
}
```

---

## 8. Alignment In Grid

### For whole grid

```css
.grid {
  justify-items: stretch; /* default horizontal item alignment in cell */
  align-items: stretch;   /* default vertical */
  justify-content: center; /* align grid when total tracks smaller than container */
  align-content: center;
}
```

### For one item

```css
.item {
  justify-self: center;
  align-self: end;
}
```

Quick memory:

- `*-items` / `*-self` → inside cells
- `*-content` → tracks as a group

---

## 9. Responsive Grid Strategies

### Strategy 1 — Auto responsive (no breakpoints)

```css
.products {
  display: grid;
  grid-template-columns: repeat(auto-fit, minmax(220px, 1fr));
  gap: 16px;
}
```

Best for card lists/products/gallery.

### Strategy 2 — Media query columns

```css
.grid {
  display: grid;
  grid-template-columns: 1fr;
  gap: 12px;
}

@media (min-width: 640px) {
  .grid { grid-template-columns: 1fr 1fr; }
}

@media (min-width: 1024px) {
  .grid { grid-template-columns: repeat(4, 1fr); }
}
```

Best when design needs exact column counts at breakpoints.

### Strategy 3 — Fluid + constrained

```css
.container {
  width: min(1100px, 100% - 32px);
  margin-inline: auto;
  display: grid;
  grid-template-columns: repeat(auto-fit, minmax(260px, 1fr));
  gap: 20px;
}
```

---

## 10. Holy Grail / App Shell Example

```css
.app {
  display: grid;
  grid-template-columns: 250px 1fr;
  grid-template-rows: 64px 1fr 48px;
  grid-template-areas:
    "header header"
    "nav main"
    "footer footer";
  height: 100vh;
}

.header { grid-area: header; }
.nav    { grid-area: nav; overflow: auto; }
.main   { grid-area: main; overflow: auto; }
.footer { grid-area: footer; }

@media (max-width: 800px) {
  .app {
    grid-template-columns: 1fr;
    grid-template-rows: 64px auto 1fr 48px;
    grid-template-areas:
      "header"
      "nav"
      "main"
      "footer";
  }
}
```

---

## 11. Grid vs Flexbox (Must Memorize)

| Feature | Flexbox | Grid |
|---|---|---|
| Dimensions | 1D | 2D |
| Best for | components, alignment, nav | page/section layouts, galleries |
| Content-first or layout-first | content-first | layout-first |
| Easy equal columns + rows | medium | excellent |
| Responsive cards without MQ | good with wrap | excellent with auto-fit |

Practical rule:

- Use **Flex** for one row/column alignment
- Use **Grid** for overall structure and 2D card layouts
- Often combine both

---

## 12. Combining Grid + Flex

```css
.gallery {
  display: grid;
  grid-template-columns: repeat(auto-fit, minmax(260px, 1fr));
  gap: 16px;
}

.card {
  display: flex;
  flex-direction: column;
  gap: 8px;
}

.card .actions {
  margin-top: auto; /* push buttons to bottom */
  display: flex;
  gap: 8px;
}
```

Grid places cards. Flex controls inside each card.

---

## 13. Useful Functions

### `minmax(min, max)`

```css
minmax(200px, 1fr)
```

Track never below 200px, can grow.

### `min-content` / `max-content` / `auto`

```css
grid-template-columns: max-content 1fr;
```

### `clamp` with grid containers

```css
.card-title {
  font-size: clamp(1rem, 2vw, 1.5rem);
}
```

Not grid-specific, but common in responsive grid pages.

---

## 14. Common Interview Questions

**Q: How do you make a responsive card grid with Grid?**  
A: `grid-template-columns: repeat(auto-fit, minmax(250px, 1fr))` with gap.

**Q: auto-fit vs auto-fill?**  
A: auto-fit collapses empty tracks and stretches items; auto-fill keeps empty tracks.

**Q: What is `fr`?**  
A: A flexible fraction unit of available free space.

**Q: When Grid over Flexbox?**  
A: When controlling rows and columns together, complex page areas, galleries.

**Q: What are grid areas?**  
A: Named regions for readable template layouts and easy responsive reordering.

---

## 15. Cheat Sheet

```text
display: grid
grid-template-columns: repeat(3, 1fr)
gap

responsive cards:
repeat(auto-fit, minmax(250px, 1fr))

placement:
grid-column: 1 / 3
grid-area: header

alignment:
justify-items / align-items
justify-content / align-content

page layout:
grid-template-areas
```

---

## 16. Practice Checklist

- [ ] Explain Grid vs Flex in 30 seconds
- [ ] Write auto-fit minmax card grid from memory
- [ ] Build header/sidebar/main with areas
- [ ] Make mobile reflow with media query areas
- [ ] Explain auto-fit vs auto-fill
