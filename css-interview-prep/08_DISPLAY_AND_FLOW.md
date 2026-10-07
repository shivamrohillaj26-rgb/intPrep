# CSS Display & Document Flow — Deep Interview Guide

---

## 1. Normal Document Flow

By default, elements layout in normal flow:

- block elements stack vertically
- inline elements sit in horizontal text lines

Understanding flow helps you understand what Flex/Grid/positioning change.

---

## 2. Key `display` Values

| Value | Behavior |
|---|---|
| `block` | new line, full width by default |
| `inline` | in text line, width/height ignored |
| `inline-block` | inline flow + respects width/height |
| `none` | removed from layout (not visible, no space) |
| `flex` | flex container |
| `grid` | grid container |
| `contents` | element's box ignored; children remain |

---

## 3. Block vs Inline Deep Dive

### Block examples

`div`, `p`, `section`, `h1`

```css
.block {
  display: block;
  width: 200px;
  margin: 10px;
}
```

### Inline examples

`span`, `a`, `strong`

```css
.inline {
  display: inline;
  width: 200px;   /* ignored */
  height: 50px;   /* ignored */
  margin: 10px;   /* horizontal works; vertical limited */
}
```

### Inline-block

```css
.chip {
  display: inline-block;
  width: auto;
  padding: 6px 10px;
}
```

---

## 4. `visibility: hidden` vs `display: none` vs `opacity: 0`

| Property | Visible? | Space reserved? | Interactable? |
|---|---|---|---|
| `display: none` | no | no | no |
| `visibility: hidden` | no | yes | no |
| `opacity: 0` | no | yes | yes (unless other controls) |

Very common interview comparison.

---

## 5. Removing From Flow

Ways an element leaves normal flow:

- `display: none`
- `position: absolute`
- `position: fixed`
- floats (legacy)

Flex/grid items are still participating in their container formatting context.

---

## 6. Replaced vs Non-replaced Elements

Replaced: content comes from outside CSS (`img`, `video`, `iframe`).

Important for sizing interviews (`object-fit`, intrinsic size).

```css
img {
  max-width: 100%;
  height: auto;
  object-fit: cover;
}
```

---

## 7. Formatting Contexts (Interview Vocabulary)

- **BFC** (Block Formatting Context): internal layout isolation
- Created by: `display: flow-root`, `overflow` not visible, flex/grid items, etc.

Useful for:

- containing floats
- preventing margin collapse in some cases

```css
.card {
  display: flow-root; /* modern clearfix alternative */
}
```

---

## 8. Interview Questions

**Q: Difference between inline and inline-block?**  
A: Both flow with text; inline-block respects width/height/vertical margins better.

**Q: display none vs visibility hidden?**  
A: none removes from layout; hidden keeps space.

**Q: Does absolute element take space?**  
A: No, removed from normal flow.

---

## 9. Cheat Sheet

```text
block: stacked, full width
inline: text-like
inline-block: hybrid
none: gone
flex/grid: special layout modes
opacity:0 still in flow and clickable
```

---

## 10. Practice Checklist

- [ ] Explain block/inline/inline-block
- [ ] Compare hide techniques
- [ ] Mention BFC briefly
