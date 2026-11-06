# CSS Selectors & Specificity — Deep Interview Guide

---

## 1. What Are Selectors?

Selectors tell the browser **which elements** to style.

```css
p { color: black; }           /* all <p> */
.card { padding: 16px; }      /* class */
#header { height: 64px; }     /* id */
```

---

## 2. Common Selector Types

| Selector | Example | Selects |
|---|---|---|
| Universal | `*` | all elements |
| Type | `h1`, `div` | by tag |
| Class | `.btn` | by class |
| ID | `#app` | by id |
| Attribute | `[type="text"]` | by attribute |
| Descendant | `.card p` | p inside card (any depth) |
| Child | `.card > p` | direct child only |
| Adjacent sibling | `h2 + p` | p immediately after h2 |
| General sibling | `h2 ~ p` | all p siblings after h2 |

---

## 3. Pseudo-classes vs Pseudo-elements

### Pseudo-class = state/position

```css
a:hover { color: red; }
input:focus { outline: 2px solid blue; }
li:first-child { font-weight: bold; }
li:nth-child(2n) { background: #f5f5f5; }
```

### Pseudo-element = virtual part

```css
p::first-line { font-weight: bold; }
p::before { content: "★ "; }
input::placeholder { color: #999; }
```

Interview tip: use `::` for pseudo-elements, `:` for pseudo-classes.

**Full list, traps, Angular `:host`, `:has` / `:where`:** [14_PSEUDO_CLASSES_PSEUDO_ELEMENTS.md](./14_PSEUDO_CLASSES_PSEUDO_ELEMENTS.md). **GOC spoken sheet:** [../goc/GOC_CSS.md](../goc/GOC_CSS.md).

---

## 4. Specificity (Critical Interview Topic)

When multiple rules conflict, specificity decides winner.

### Score system (simple mental model)

| Selector type | Points |
|---|---|
| Inline style | 1000 |
| ID | 100 |
| Class / attribute / pseudo-class | 10 |
| Type / pseudo-element | 1 |
| Universal / combinators | 0 |

Examples:

```css
p            /* 1 */
.card        /* 10 */
.card p      /* 11 */
#title       /* 100 */
#title.card  /* 110 */
```

```html
<p style="color: red"> <!-- 1000 -->
```

### Practical comparison

```css
.card .title { color: blue; }   /* 20 */
#app .title { color: green; }   /* 110 -> wins */
```

---

## 5. Cascade Order (When Specificity Ties)

1. Origin/importance (`!important` nuances)
2. Specificity
3. Source order (later rule wins)

```css
.title { color: red; }
.title { color: blue; } /* wins if same specificity */
```

---

## 6. `!important` (Use Rarely)

```css
.title { color: red !important; }
```

Overrides normal specificity. Makes maintenance hard. Avoid in interviews unless explaining override emergencies/utilities.

---

## 7. Good Practices

- Prefer classes over IDs for styling
- Avoid deep selectors (`.a .b .c .d`)
- Keep specificity low and flat
- Do not fight CSS with many `!important`

---

## 8. Interview Questions

**Q: What is specificity?**  
A: A weight algorithm determining which CSS rule wins when selectors conflict.

**Q: Who wins: class or ID?**  
A: ID.

**Q: Difference between `.card p` and `.card > p`?**  
A: Descendant any level vs direct child only.

**Q: `:hover` vs `::before`?**  
A: Pseudo-class state vs pseudo-element fragment.

---

## 9. Cheat Sheet

```text
ID > Class > Type
later rule wins if equal specificity
avoid !important
descendant vs child: space vs >
```

---

## 10. Practice Checklist

- [ ] Calculate specificity of 4 selectors
- [ ] Explain cascade tie-break
- [ ] Write nth-child example
- [ ] Distinguish pseudo-class/element
