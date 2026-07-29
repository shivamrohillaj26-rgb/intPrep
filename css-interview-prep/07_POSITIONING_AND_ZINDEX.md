# CSS Positioning & z-index — Deep Interview Guide

---

## 1. `position` Values

| Value | Behavior |
|---|---|
| `static` | default normal flow |
| `relative` | offset from normal position; space reserved |
| `absolute` | removed from flow; relative to nearest positioned ancestor |
| `fixed` | relative to viewport; stays on scroll |
| `sticky` | hybrid relative+fixed within container |

---

## 2. `relative`

```css
.box {
  position: relative;
  top: 10px;
  left: 20px;
}
```

Element moves visually, but original space remains.

Often used as anchor for absolute children.

---

## 3. `absolute`

```css
.parent {
  position: relative;
}

.badge {
  position: absolute;
  top: 8px;
  right: 8px;
}
```

Badge is placed against `.parent`, not the whole page (if parent is positioned).

If no positioned ancestor → relative to initial containing block (usually viewport-ish/page).

---

## 4. `fixed`

```css
.navbar {
  position: fixed;
  top: 0;
  left: 0;
  right: 0;
}
```

Stays visible while scrolling. Good for sticky headers/toasts.

---

## 5. `sticky`

```css
.table-header {
  position: sticky;
  top: 0;
}
```

Acts relative until threshold, then sticks. Needs scroll container and room to move.

---

## 6. Containing Block Concept

Absolute/fixed positioning is resolved against a containing block.

For absolute:

- nearest ancestor with `position` not `static`
- or transform/filter/perspective in some cases creates containing block

This is a common “why my absolute is wrong” interview bug.

---

## 7. `z-index`

Controls stacking order of positioned elements (and flex/grid items in many cases).

```css
.modal { position: fixed; z-index: 1000; }
.overlay { position: fixed; z-index: 900; }
```

Rules:

- larger `z-index` appears on top
- only works on non-static positioned elements (generally)
- stacking contexts can isolate z-index comparisons

### Stacking context triggers (common)

- `position` + `z-index` not auto
- `opacity < 1`
- `transform`, `filter`
- `isolation: isolate`

Interview line:

> z-index compares within the same stacking context. A child cannot escape parent stacking context just with a huge z-index.

---

## 8. Practical Patterns

### Overlay modal

```css
.overlay {
  position: fixed;
  inset: 0;
  background: rgb(0 0 0 / 50%);
}

.modal {
  position: fixed;
  inset: 0;
  margin: auto;
  width: min(480px, 92vw);
  height: fit-content;
}
```

### Badge on avatar

```css
.avatar {
  position: relative;
}
.status {
  position: absolute;
  right: 0;
  bottom: 0;
}
```

---

## 9. Interview Questions

**Q: relative vs absolute?**  
A: relative stays in flow and offsets itself; absolute leaves flow and positions against positioned ancestor.

**Q: fixed vs sticky?**  
A: fixed always viewport-based; sticky toggles based on scroll within container.

**Q: Why z-index not working?**  
A: element may be static, or stacking context prevents expected comparison.

---

## 10. Cheat Sheet

```text
static -> relative -> absolute/fixed/sticky
absolute needs positioned ancestor
fixed = viewport
sticky = scroll-aware
z-index needs stacking context awareness
```

---

## 11. Practice Checklist

- [ ] Build badge with relative parent + absolute child
- [ ] Explain fixed navbar
- [ ] Explain stacking context in one minute
