# Self-Adjusting Lists In Rows — Deep Interview Guide

This is the exact UI pattern interviewers mean by:

> “Make a list of cards/items that automatically adjusts how many sit in each row as screen size changes.”

---

## 1. What Is A Self-Adjusting List?

A list where:

- items sit in rows
- number of items per row changes automatically by available width
- no manual column count for every breakpoint (or fewer breakpoints)
- items wrap to next line when space is insufficient

Examples:

- product cards
- image gallery
- user avatars / chips
- blog post cards
- feature tiles
- tag list / pill list

Interview one-liner:

> A self-adjusting row list uses wrapping layout (Flex or Grid) so items reflow into as many columns as fit, based on minimum item width.

---

## 2. Two Best Approaches

| Approach | Core idea | Best when |
|---|---|---|
| CSS Grid `auto-fit` + `minmax` | browser calculates columns | equal card grids/galleries |
| Flexbox `flex-wrap` + `flex-basis` | items wrap by basis width | toolbars, chips, mixed content rows |

Both are interview-valid. Grid is usually cleaner for equal cards.

---

## 3. Grid Approach (Recommended For Cards)

### HTML

```html
<section class="card-list">
  <article class="card">Card 1</article>
  <article class="card">Card 2</article>
  <article class="card">Card 3</article>
  <article class="card">Card 4</article>
  <article class="card">Card 5</article>
</section>
```

### CSS

```css
.card-list {
  display: grid;
  grid-template-columns: repeat(auto-fit, minmax(240px, 1fr));
  gap: 16px;
}

.card {
  padding: 16px;
  border: 1px solid #ddd;
  border-radius: 12px;
  background: white;
}
```

### How it self-adjusts

1. Each column wants at least `240px`
2. Browser fits as many 240px columns as possible
3. Extra free space is shared because max is `1fr`
4. If viewport shrinks, column count drops automatically
5. Items flow to next row

### Width behavior demo

```text
1200px width -> maybe 4 columns
800px width  -> maybe 3 columns
500px width  -> maybe 2 columns
300px width  -> 1 column
```

No media query required for basic responsiveness.

---

## 4. Deep Explanation Of The Magic Line

```css
grid-template-columns: repeat(auto-fit, minmax(240px, 1fr));
```

Break it down:

| Piece | Meaning |
|---|---|
| `repeat(...)` | create multiple columns |
| `auto-fit` | make as many columns as fit; collapse empty ones |
| `minmax(240px, 1fr)` | each column >= 240px, can grow equally |

### Why `minmax` matters

If you write only:

```css
repeat(auto-fit, 240px)
```

columns stay fixed 240px and may leave empty right space.

With `minmax(240px, 1fr)`, columns grow and fill the row nicely.

### `auto-fit` vs `auto-fill` here

- `auto-fit`: fewer items stretch to fill row
- `auto-fill`: may leave empty column slots

For card lists, prefer `auto-fit`.

---

## 5. Flexbox Approach (Also Very Common)

```css
.card-list {
  display: flex;
  flex-wrap: wrap;
  gap: 16px;
}

.card {
  flex: 1 1 240px; /* grow, shrink, basis */
  max-width: 100%;
}
```

### What `flex: 1 1 240px` means

- start around 240px wide
- can grow to fill row
- can shrink if needed
- wrap to next line when not enough horizontal space

### Optional: limit growth for nicer rows

```css
.card {
  flex: 1 1 240px;
  max-width: 320px; /* optional design constraint */
}
```

Or keep full stretch:

```css
.card {
  flex: 1 1 240px;
}
```

---

## 6. Grid vs Flex For This Pattern

| Need | Prefer |
|---|---|
| Equal card gallery | Grid auto-fit |
| Items of different intrinsic widths (chips/tags) | Flex wrap |
| Exact equal columns with stretched last row | Grid |
| Horizontal toolbar that wraps | Flex |

Interview answer:

> For equal cards I use Grid `auto-fit/minmax`. For tags/chips or uneven items I use Flex wrap.

---

## 7. Self-Adjusting Tag / Chip List

```html
<ul class="tags">
  <li>JavaScript</li>
  <li>Angular</li>
  <li>RxJS</li>
  <li>CSS Grid</li>
</ul>
```

```css
.tags {
  display: flex;
  flex-wrap: wrap;
  gap: 8px;
  list-style: none;
  padding: 0;
  margin: 0;
}

.tags li {
  padding: 6px 10px;
  border-radius: 999px;
  background: #eef3ff;
  white-space: nowrap;
}
```

Here we do **not** force equal widths. Items keep content width and wrap naturally.

---

## 8. Adding Responsiveness Controls

### Min size by screen using clamp (optional)

```css
.card-list {
  display: grid;
  grid-template-columns: repeat(auto-fit, minmax(min(240px, 100%), 1fr));
  gap: 16px;
}
```

`min(240px, 100%)` prevents overflow on very small screens when 240px is wider than viewport.

This is a strong interview detail.

### With container padding

```css
.page {
  width: min(1100px, 100% - 32px);
  margin-inline: auto;
}

.card-list {
  display: grid;
  grid-template-columns: repeat(auto-fit, minmax(min(240px, 100%), 1fr));
  gap: 16px;
}
```

---

## 9. Equal Height Cards In Adjusting Rows

Grid items in the same row stretch to equal height by default.

```css
.card {
  display: flex;
  flex-direction: column;
}

.card .button-row {
  margin-top: auto; /* pin actions to bottom */
}
```

This is a very common UI interview follow-up.

---

## 10. Media Query Fallback Style (If Asked)

Older explicit approach:

```css
.card-list {
  display: grid;
  grid-template-columns: 1fr;
  gap: 16px;
}

@media (min-width: 600px) {
  .card-list { grid-template-columns: 1fr 1fr; }
}

@media (min-width: 900px) {
  .card-list { grid-template-columns: 1fr 1fr 1fr; }
}
```

Compare:

- media queries = manual breakpoints
- auto-fit/minmax = content-driven automatic columns

Modern interviews love auto-fit answer first, then mention media queries for strict designs.

---

## 11. Complete Interview-Ready Example

```html
<main class="page">
  <section class="card-list">
    <article class="card">
      <h3>Title</h3>
      <p>Short text</p>
      <div class="actions"><button>View</button></div>
    </article>
    <!-- more cards... -->
  </section>
</main>
```

```css
.page {
  width: min(1100px, 100% - 32px);
  margin: 24px auto;
}

.card-list {
  display: grid;
  grid-template-columns: repeat(auto-fit, minmax(min(250px, 100%), 1fr));
  gap: 16px;
}

.card {
  display: flex;
  flex-direction: column;
  gap: 8px;
  padding: 16px;
  border: 1px solid #e5e7eb;
  border-radius: 12px;
  background: #fff;
  box-sizing: border-box;
}

.card .actions {
  margin-top: auto;
}
```

What to say while coding:

1. I use Grid for 2D card layout
2. `auto-fit + minmax` makes columns self-adjust
3. `min(..., 100%)` avoids mobile overflow
4. Inner Flex keeps button at bottom

---

## 12. Common Mistakes

1. Forgetting `flex-wrap: wrap` in flex approach
2. Using fixed `width: 33%` (breaks responsiveness)
3. Using `minmax(240px, 1fr)` without `min(...,100%)` on tiny screens
4. Putting margin on items instead of `gap` (uneven edges)
5. Expecting `justify-content` to create columns (it doesn’t)

---

## 13. Interview Q&A

**Q: How would you build a responsive product list in rows?**  
A: CSS Grid with `repeat(auto-fit, minmax(min(250px,100%), 1fr))` and gap.

**Q: Can you do it with Flexbox?**  
A: Yes — `display:flex; flex-wrap:wrap;` and children `flex:1 1 250px`.

**Q: Why not float?**  
A: Floats need clearfix, weaker alignment control, harder equal heights.

**Q: How do cards stay equal height?**  
A: Grid row items stretch by default; use inner column flex + `margin-top:auto` for actions.

**Q: When still use media queries?**  
A: When design demands exact 1/2/4 column breakpoints or layout redesigns, not just reflow.

---

## 14. Spoken Answer (45–60 sec)

> For a self-adjusting list in rows, I prefer CSS Grid with `grid-template-columns: repeat(auto-fit, minmax(min(250px, 100%), 1fr))`. This lets the browser decide how many cards fit per row based on available width. Each card has a minimum width, grows to fill space, and wraps automatically. For tags or uneven items, I use Flexbox with `flex-wrap` and content-based widths. I use `gap` for spacing and inner flex to keep card actions aligned at the bottom.

---

## 15. Cheat Sheet

```text
GRID CARDS:
display: grid;
grid-template-columns: repeat(auto-fit, minmax(min(240px, 100%), 1fr));
gap: 16px;

FLEX WRAP:
display: flex;
flex-wrap: wrap;
gap: 16px;
item { flex: 1 1 240px; }

CHIPS/TAGS:
display: flex;
flex-wrap: wrap;
gap: 8px;
items keep content width
```

---

## 16. Practice Checklist

- [ ] Write Grid auto-fit list from memory in 2 minutes
- [ ] Write Flex wrap list from memory
- [ ] Explain auto-fit/minmax line piece by piece
- [ ] Build tag list wrapping example
- [ ] Add equal-height card actions with flex
