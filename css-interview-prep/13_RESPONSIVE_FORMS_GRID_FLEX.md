# Responsive Forms — Grid, Flex & Media Queries (Interview Deep Guide)

Goal: make a form layout that looks like this on **desktop**, then stacks cleanly on **mobile**.

```text
Desktop
┌──────────┬──────────┬──────────┐
│ First    │ Last     │ Age      │   ← 3 equal columns
├──────────┴──────────┴──────────┤
│ Address (full width)           │
├────────────────┬───────────────┤
│ Place of work  │ Job title     │   ← 2 equal columns
├────────────────┼───────────────┤
│ Phone          │ Skype         │   ← 2 equal columns
├────────────────┴───────────────┤
│ Submit (full width)            │
└────────────────────────────────┘

Mobile
┌────────────────┐
│ First          │
├────────────────┤
│ Last           │
├────────────────┤
│ Age            │
├────────────────┤
│ Address        │
│ ... all stacked │
└────────────────┘
```

This guide uses your HackerRank-style form and explains:

1. **Why Grid is the best fit** for this problem  
2. The **6-column LCM trick** (`span 2` / `span 3` / `span 6`)  
3. A full **Flexbox alternative** (row wrappers)  
4. **Media queries** and what to say in interviews  

Related deeper theory: `02_FLEXBOX.md`, `03_CSS_GRID.md`, `04_RESPONSIVE_DESIGN.md`.

---

## 1. What interviewers want you to say

> For mixed form rows (3-col, full-width, 2-col), I prefer **CSS Grid**. I set one grid with a column count that can express all row patterns — usually **6 columns** because LCM(2,3)=6. Items use `grid-column: span X`. On mobile, I switch to `1fr` with a media query so every field is full width. Flexbox also works, but needs extra row wrappers or more fragile `flex-basis` math.

---

## 2. Always start with the viewport meta

Without this, phones may pretend to be ~980px wide and your media queries look “broken”.

```html
<meta name="viewport" content="width=device-width, initial-scale=1.0">
```

Also use `box-sizing: border-box` so padding doesn’t blow widths:

```css
*, *::before, *::after { box-sizing: border-box; }

input, button {
  width: 100%; /* fill the grid/flex cell */
}
```

---

## 3. Your HTML structure (what we’re styling)

```html
<div class="layout">
  <h2>Your Form</h2>
  <form>
    <!-- Row 1: 3 equal columns -->
    <input class="first-name" placeholder="First name" />
    <input class="last-name"  placeholder="Last name" />
    <input class="age"        placeholder="Age" type="number" />

    <!-- Row 2: full width -->
    <input class="address" placeholder="Address" />

    <!-- Row 3: 2 equal columns -->
    <input class="place-of-work" placeholder="Place of work" />
    <input class="job-title"     placeholder="Job title" />

    <!-- Row 4: 2 equal columns -->
    <input class="phone-number" placeholder="Phone number" />
    <input class="skype"        placeholder="Skype" />

    <!-- Row 5: full width -->
    <button type="submit">Submit</button>
  </form>
</div>
```

Important: fields are **siblings** inside `<form>` — no row wrappers.  
That’s why **Grid shines**: one parent, different spans per child.

---

# PART A — CSS Grid (recommended for this form)

## 4. Why 6 columns? (LCM trick)

You need these row patterns:

| Pattern | Each field width |
|---|---|
| 3 equal fields | 1/3 each |
| 2 equal fields | 1/2 each |
| 1 full-width field | 100% |

In one grid, pick a column count that all of those divide into:

```text
LCM(2, 3) = 6
```

So use **6 equal tracks**:

```css
form {
  display: grid;
  grid-template-columns: repeat(6, 1fr);
  gap: 10px;
}
```

Then:

| Want | Span |
|---|---|
| 1/3 width (3-up) | `span 2` → 2/6 |
| 1/2 width (2-up) | `span 3` → 3/6 |
| Full width | `span 6` → 6/6 |

That’s the key interview insight of this challenge.

```text
6 columns:
| 1 | 2 | 3 | 4 | 5 | 6 |

3-up:   [span2][span2][span2]
2-up:   [  span 3  ][  span 3  ]
full:   [        span 6         ]
```

---

## 5. Full Grid solution (your approach, explained)

```css
/* Parent becomes a 6-column grid */
form {
  display: grid;
  grid-template-columns: repeat(6, 1fr);
  gap: 10px;
}

/* Make controls fill their cell */
form input,
form button {
  width: 100%;
  min-width: 0; /* avoid overflow in grid/flex children */
}

/* Row 1 — 3 equal columns (2+2+2 = 6) */
.first-name { grid-column: span 2; }
.last-name  { grid-column: span 2; }
.age        { grid-column: span 2; }

/* Row 2 — full width */
.address { grid-column: span 6; }

/* Row 3 — 2 equal columns (3+3 = 6) */
.place-of-work { grid-column: span 3; }
.job-title     { grid-column: span 3; }

/* Row 4 — 2 equal columns */
.phone-number { grid-column: span 3; }
.skype        { grid-column: span 3; }

/* Row 5 — full width */
button[type="submit"] { grid-column: span 6; }

/* Mobile — one column, everything full width */
@media (max-width: 767px) {
  form {
    grid-template-columns: 1fr;
  }

  .first-name,
  .last-name,
  .age,
  .address,
  .place-of-work,
  .job-title,
  .phone-number,
  .skype,
  button[type="submit"] {
    grid-column: span 1; /* or: grid-column: 1 / -1; */
  }
}
```

### What `grid-column: span 2` means

“This item should occupy **2 tracks** of the current grid.”

Auto-placement then packs items left-to-right, wrapping to the next row when the current row is full:

```text
first-name (2) + last-name (2) + age (2) = 6 → row fills → next item new row
address (6) fills whole next row
...
```

You don’t need to invent rows manually. Grid placement does it.

### Alternative full-width syntax

```css
.address { grid-column: 1 / -1; } /* from first line to last line */
```

Same visual as `span 6` on a 6-column grid.

---

## 6. Why mobile resets spans

On mobile you change the template to **1 column**:

```css
form { grid-template-columns: 1fr; }
```

If you leave `span 2` / `span 3` / `span 6`, those spans are larger than the available columns and can cause weird overflow or implicit tracks. So reset every field to `span 1` (or `1 / -1`).

**Interview line:**  
> Desktop uses a 6-track grid with spans; mobile collapses the template to one track and resets spans so every control is full width.

---

## 7. Grid mental model for forms (quick)

```text
display: grid
        │
        ├─ defines TRACKS (columns/rows)
        ├─ children are ITEMS
        └─ each item can SPAN tracks
```

Useful properties:

| Property | Role |
|---|---|
| `grid-template-columns` | how many columns + sizes |
| `gap` | space between cells |
| `grid-column: span N` | item width in tracks |
| `grid-column: 1 / -1` | full row |
| `@media` | change tracks/spans by breakpoint |

---

## 8. Other Grid variants (know for interviews)

### A) 12-column system (Bootstrap-like)

Same idea, bigger number:

```css
form { grid-template-columns: repeat(12, 1fr); }
.age { grid-column: span 4; }      /* 3-up */
.address { grid-column: span 12; } /* full */
.job-title { grid-column: span 6; }/* 2-up */
```

### B) Named lines / areas (explicit layout)

```css
form {
  display: grid;
  grid-template-columns: 1fr 1fr 1fr;
  grid-template-areas:
    "first last age"
    "addr  addr addr"
    "work  title title"
    "phone skype skype"
    "submit submit submit";
}
.first-name { grid-area: first; }
.address    { grid-area: addr; }
/* ... */
```

Clear, but more verbose. For this HackerRank task, **span + 6 columns** is cleaner.

### C) `auto-fit` + `minmax` (card galleries — not this form)

```css
grid-template-columns: repeat(auto-fit, minmax(220px, 1fr));
```

Great for equal cards that reflow automatically. **Less ideal** when row 1 must be exactly 3 fields and row 2 must be full-width address — spans give precise control.

---

# PART B — Flexbox implementation

## 9. When Flex is fine / when it’s awkward

Flexbox is **1D** (one row or one column at a time).

For this form, Flex usually needs **row wrappers**:

```html
<form class="flex-form">
  <div class="row row-3">
    <input class="first-name" />
    <input class="last-name" />
    <input class="age" />
  </div>
  <div class="row row-1">
    <input class="address" />
  </div>
  <div class="row row-2">
    <input class="place-of-work" />
    <input class="job-title" />
  </div>
  <!-- ... -->
</form>
```

If HTML **cannot** change (HackerRank often locks markup), Grid is the right tool.  
If you **can** change HTML, Flex is also interview-valid.

---

## 10. Flex solution (with row wrappers)

```css
.flex-form {
  display: flex;
  flex-direction: column;
  gap: 10px;
}

.row {
  display: flex;
  flex-wrap: wrap;
  gap: 10px;
}

.row > * {
  min-width: 0;
}

/* 3 equal fields */
.row-3 > * {
  flex: 1 1 calc((100% - 20px) / 3); /* 2 gaps of 10px */
}

/* 2 equal fields */
.row-2 > * {
  flex: 1 1 calc((100% - 10px) / 2); /* 1 gap */
}

/* full width */
.row-1 > * {
  flex: 1 1 100%;
}

@media (max-width: 767px) {
  .row-3 > *,
  .row-2 > *,
  .row-1 > * {
    flex: 1 1 100%; /* stack */
  }
}
```

### Reading `flex: 1 1 calc(...)`

```text
flex-grow: 1     → share extra space equally
flex-shrink: 1   → can shrink
flex-basis: ...  → starting width target
```

`calc((100% - gaps) / n)` keeps equal columns while accounting for `gap`.

---

## 11. Flex without wrappers (harder / fragile)

Possible with `flex-basis` percentages on siblings, but wrapping math gets messy when mixing 33%, 50%, 100% in one flex container:

```css
form {
  display: flex;
  flex-wrap: wrap;
  gap: 10px;
}

.first-name,
.last-name,
.age {
  flex: 1 1 calc((100% - 20px) / 3);
}

.address,
button[type="submit"] {
  flex: 1 1 100%;
}

.place-of-work,
.job-title,
.phone-number,
.skype {
  flex: 1 1 calc((100% - 10px) / 2);
}

@media (max-width: 767px) {
  form > * { flex: 1 1 100%; }
}
```

This can work, but:

- gap subtraction is easy to get wrong  
- browser rounding can cause early wraps  
- Grid spans are clearer for mixed row recipes  

**Say in interview:**  
> I can do this in Flex with wrap + basis, but Grid spans are more reliable for mixed 2/3/full-width rows without changing HTML.

---

# PART C — Media queries (responsive strategy)

## 12. Mobile-first vs desktop-first

### Desktop-first (what your CSS used)

```css
/* default = desktop grid */
form { grid-template-columns: repeat(6, 1fr); }

@media (max-width: 767px) {
  form { grid-template-columns: 1fr; }
}
```

### Mobile-first (often preferred in modern CSS)

```css
/* default = mobile */
form {
  display: grid;
  grid-template-columns: 1fr;
  gap: 10px;
}

form > * { grid-column: 1 / -1; }

@media (min-width: 768px) {
  form { grid-template-columns: repeat(6, 1fr); }

  .first-name, .last-name, .age { grid-column: span 2; }
  .address, button[type="submit"] { grid-column: span 6; }
  .place-of-work, .job-title,
  .phone-number, .skype { grid-column: span 3; }
}
```

Both are valid. Mentions of **mobile-first** score well.

---

## 13. Common breakpoints (interview shorthand)

| Name | Typical width |
|---|---|
| Mobile | `< 768px` |
| Tablet | `768px – 1024px` |
| Desktop | `> 1024px` |

For forms, often only **one** breakpoint is enough: stack below 768px.

Optional tablet middle step:

```css
@media (min-width: 768px) and (max-width: 1023px) {
  /* e.g. 2-column instead of 3 */
  form { grid-template-columns: repeat(2, 1fr); }
  .first-name, .last-name, .age,
  .place-of-work, .job-title,
  .phone-number, .skype { grid-column: span 1; }
  .address, button { grid-column: span 2; }
}
```

---

## 14. Side-by-side: Grid vs Flex for THIS problem

| Concern | Grid | Flex |
|---|---|---|
| Mixed 2/3/full rows | Excellent (`span`) | Needs wrappers or careful basis |
| No HTML change | Best | Possible but fragile |
| Equal columns | `1fr` tracks | `flex: 1` / calc |
| Mobile stack | change template + spans | `flex-basis: 100%` |
| 2D control | Native | Manual rows |
| Interview preference for this form | **Grid** | Acceptable if explained |

---

## 15. Complete tiny demo page (Grid)

Save as a local HTML file to practice:

```html
<!DOCTYPE html>
<html lang="en">
<head>
  <meta charset="UTF-8" />
  <meta name="viewport" content="width=device-width, initial-scale=1.0" />
  <title>Responsive Form — Grid</title>
  <style>
    * { box-sizing: border-box; }
    body { font-family: system-ui, sans-serif; padding: 24px; }
    form {
      display: grid;
      grid-template-columns: repeat(6, 1fr);
      gap: 10px;
      max-width: 720px;
    }
    input, button { width: 100%; padding: 10px; }
    .first-name, .last-name, .age { grid-column: span 2; }
    .address, button { grid-column: span 6; }
    .place-of-work, .job-title,
    .phone-number, .skype { grid-column: span 3; }

    @media (max-width: 767px) {
      form { grid-template-columns: 1fr; }
      form > * { grid-column: span 1; }
    }
  </style>
</head>
<body>
  <form>
    <input class="first-name" placeholder="First name" />
    <input class="last-name" placeholder="Last name" />
    <input class="age" placeholder="Age" type="number" />
    <input class="address" placeholder="Address" />
    <input class="place-of-work" placeholder="Place of work" />
    <input class="job-title" placeholder="Job title" />
    <input class="phone-number" placeholder="Phone number" />
    <input class="skype" placeholder="Skype" />
    <button type="submit">Submit</button>
  </form>
</body>
</html>
```

Resize the browser below/above 768px to see the switch.

---

## 16. Step-by-step how to solve in a live coding interview

1. Restate layout: 3-up, full, 2-up, 2-up, full  
2. Choose Grid (siblings, mixed spans)  
3. Pick column count: LCM(2,3)=6  
4. Write `display: grid; grid-template-columns: repeat(6, 1fr); gap: ...`  
5. Assign `span 2` / `span 3` / `span 6`  
6. Add `width: 100%` on inputs  
7. Add `@media (max-width: 767px)` → `1fr` + reset spans  
8. Mention Flex alternative if HTML had row wrappers  

---

## 17. Common mistakes

| Mistake | Fix |
|---|---|
| Forgetting viewport meta | add it in `<head>` |
| Using 3 columns only, then can’t do clean halves | use 6 (or 12) |
| Leaving `span 6` on mobile 1-col grid | reset to `span 1` |
| Not setting `width: 100%` on inputs | inputs may not fill cell |
| Using `%` widths + padding without `border-box` | `box-sizing: border-box` |
| Trying Flex without understanding gap in `calc` | prefer Grid for this markup |

---

## 18. Interview Q&A

### Q: Why Grid over Flex here?

A: Fields are siblings with different row recipes. Grid spans express 1/3, 1/2, and full width in one container without wrappers.

### Q: Why 6 columns?

A: LCM of 2 and 3. `span 2` = third, `span 3` = half, `span 6` = full.

### Q: What does `1fr` mean?

A: One fraction of free space. `repeat(6, 1fr)` = six equal columns sharing leftover width.

### Q: How do you make it responsive?

A: Media query changes `grid-template-columns` to `1fr` and resets spans so every field stacks full width.

### Q: Can Flex do it?

A: Yes — best with row wrappers, or with wrap + `flex-basis` calc. More fragile than Grid for this HTML.

### Q: `span 6` vs `1 / -1`?

A: Both can mean full width. `1 / -1` means “from first grid line to last”, independent of counting spans.

### Q: Mobile-first or desktop-first?

A: Either works. Mobile-first (`min-width` queries) is a strong modern default; desktop-first is fine if explained.

---

## 19. Spoken 30-second answer (memorize)

> I’d use CSS Grid on the form with six equal columns because we need thirds and halves — LCM of 2 and 3 is 6. Three-up fields span 2, two-up span 3, full-width span 6. Inputs are width 100% inside their cells. Under 768px I collapse to one column and reset spans so everything stacks. Flex could work with row wrappers, but with flat sibling markup Grid is cleaner.

---

## 20. Practice checklist

- [ ] Explain LCM(2,3)=6 without notes  
- [ ] Write the desktop spans from memory  
- [ ] Write the mobile media query reset  
- [ ] Explain Grid vs Flex for this exact HTML  
- [ ] Know `1fr`, `gap`, `span`, `1 / -1`  
- [ ] Mention viewport + `border-box`  
- [ ] Rebuild Flex version with row wrappers once  

---

## Quick cheat sheet

```css
/* DESKTOP */
form {
  display: grid;
  grid-template-columns: repeat(6, 1fr);
  gap: 10px;
}
.third  { grid-column: span 2; } /* 3-up */
.half   { grid-column: span 3; } /* 2-up */
.full   { grid-column: span 6; } /* full */

/* MOBILE */
@media (max-width: 767px) {
  form { grid-template-columns: 1fr; }
  .third, .half, .full { grid-column: span 1; }
}
```

Your original CSS is already the correct Grid interview solution — this file is the deep “why” behind every line.
