# CSS Interview Prep — Index

Deep, interview-ready CSS guides with examples and explanations.

Folder: `css-interview-prep/`

---

## Priority Topics (Your Focus)

| # | Topic | File |
|---|---|---|
| 1 | CSS Box Model | [01_BOX_MODEL.md](./01_BOX_MODEL.md) |
| 2 | Flexbox | [02_FLEXBOX.md](./02_FLEXBOX.md) |
| 3 | CSS Grid (Responsive) | [03_CSS_GRID.md](./03_CSS_GRID.md) |
| 4 | Responsive Design | [04_RESPONSIVE_DESIGN.md](./04_RESPONSIVE_DESIGN.md) |
| 5 | Self-Adjusting Lists In Rows | [05_SELF_ADJUSTING_LISTS.md](./05_SELF_ADJUSTING_LISTS.md) |

---

## Other Important Interview Topics

| # | Topic | File |
|---|---|---|
| 6 | Selectors & Specificity | [06_SELECTORS_AND_SPECIFICITY.md](./06_SELECTORS_AND_SPECIFICITY.md) |
| 7 | Positioning & z-index | [07_POSITIONING_AND_ZINDEX.md](./07_POSITIONING_AND_ZINDEX.md) |
| 8 | Display & Document Flow | [08_DISPLAY_AND_FLOW.md](./08_DISPLAY_AND_FLOW.md) |
| 9 | Units & Typography | [09_UNITS_AND_TYPOGRAPHY.md](./09_UNITS_AND_TYPOGRAPHY.md) |
| 10 | Transitions / Transforms / Animations | [10_TRANSITIONS_TRANSFORMS_ANIMATIONS.md](./10_TRANSITIONS_TRANSFORMS_ANIMATIONS.md) |
| 11 | Centering & Common Patterns | [11_CENTERING_AND_COMMON_PATTERNS.md](./11_CENTERING_AND_COMMON_PATTERNS.md) |
| 12 | Tables + Chatbot Layout | [12_TABLES_AND_CHATBOT_LAYOUT.md](./12_TABLES_AND_CHATBOT_LAYOUT.md) |
| 13 | Responsive Forms (Grid + Flex) | [13_RESPONSIVE_FORMS_GRID_FLEX.md](./13_RESPONSIVE_FORMS_GRID_FLEX.md) |
| **14** | **Pseudo-classes & pseudo-elements** (`:hover` / `::before` / `:has`) | [14_PSEUDO_CLASSES_PSEUDO_ELEMENTS.md](./14_PSEUDO_CLASSES_PSEUDO_ELEMENTS.md) |

---

## Suggested Study Order

1. Box Model (`border-box` mastery)
2. Flexbox (nav, align, wrap)
3. Grid + auto-fit/minmax
4. Self-adjusting card/tag lists
5. Responsive design (mobile-first)
6. Selectors/specificity
7. Positioning/z-index
8. Display/flow + hide techniques
9. Units/rem/clamp
10. Centering patterns
11. Motion basics
12. Pseudo-classes / pseudo-elements (GOC CSS3)

---

## Must-Memorize Snippets

### Box model reset

```css
*, *::before, *::after { box-sizing: border-box; }
```

### Flex center

```css
.center {
  display: flex;
  justify-content: center;
  align-items: center;
}
```

### Responsive self-adjusting cards

```css
.cards {
  display: grid;
  grid-template-columns: repeat(auto-fit, minmax(min(250px, 100%), 1fr));
  gap: 16px;
}
```

### Flex wrapping list

```css
.list {
  display: flex;
  flex-wrap: wrap;
  gap: 16px;
}
.item { flex: 1 1 240px; }
```

---

## How To Practice For Interviews

For each topic:

1. Explain in plain English (30–45 sec)
2. Write a tiny CSS example from memory
3. Mention one edge case / bug
4. Compare alternatives (Flex vs Grid, em vs rem, etc.)

---

## Quick Decision Guide

| UI need | Use |
|---|---|
| Navbar / toolbar / center item | Flexbox |
| Page regions / equal card gallery | Grid |
| Self-adjusting card rows | Grid `auto-fit` + `minmax` |
| Wrapping chips/tags | Flex `wrap` |
| Overlay badge/modal | Positioning |
| Why styles conflict | Specificity + cascade |
| Responsive type/spacing | `rem` + `clamp` |
