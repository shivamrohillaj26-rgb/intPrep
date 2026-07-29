# CSS Units & Typography — Deep Interview Guide

---

## 1. Absolute vs Relative Units

### Absolute

- `px` — pixel
- `pt`, `cm` (rare in UI)

### Relative

| Unit | Relative to |
|---|---|
| `%` | parent property |
| `em` | current/parent font-size |
| `rem` | root (`html`) font-size |
| `vw` | 1% viewport width |
| `vh` | 1% viewport height |
| `vmin/vmax` | smaller/larger viewport side |
| `ch` | width of “0” |
| `fr` | free space in grid |

Interview preference:

> Use `rem` for consistent spacing/typography; `%/fr/vw` for fluid layout; `px` for tiny borders/shadows when needed.

---

## 2. `em` vs `rem` (Classic Question)

```css
html { font-size: 16px; }

.card {
  font-size: 20px;
  padding: 1em;  /* 20px */
  margin: 1rem;  /* 16px */
}
```

- `em` compounds with nested font-size
- `rem` stays stable to root

Nested `em` trap:

```css
.a { font-size: 1.2em; }
.a .b { font-size: 1.2em; } /* becomes 1.44 relative to root if nested */
```

---

## 3. Viewport Units

```css
.hero {
  min-height: 100vh;
}
```

Mobile caveat: `100vh` can include browser chrome oddly. Modern alternatives:

```css
min-height: 100dvh; /* dynamic viewport height */
```

---

## 4. Fluid Type With `clamp`

```css
h1 {
  font-size: clamp(1.5rem, 1rem + 2vw, 3rem);
}
```

Meaning:

- never below 1.5rem
- preferred scales with viewport
- never above 3rem

Great responsive interview answer.

---

## 5. Width Helpers

```css
.container {
  width: min(1100px, 100% - 32px);
}
```

```css
.sidebar {
  width: max(240px, 20%);
}
```

---

## 6. Typography Basics Interviewers Expect

```css
body {
  font-family: Inter, system-ui, sans-serif;
  line-height: 1.5;
  font-weight: 400;
}

h1, h2, h3 {
  line-height: 1.2;
}
```

Useful properties:

- `font-size`
- `font-weight`
- `line-height`
- `letter-spacing`
- `text-align`
- `text-overflow: ellipsis` with overflow hidden + nowrap

```css
.title {
  white-space: nowrap;
  overflow: hidden;
  text-overflow: ellipsis;
}
```

---

## 7. Interview Questions

**Q: em vs rem?**  
A: em depends on current element/parent font-size; rem depends on root.

**Q: Why rem for design systems?**  
A: consistent scaling and easier global adjustments via root font-size.

**Q: What is clamp?**  
A: Fluid value between min and max.

---

## 8. Cheat Sheet

```text
px = absolute
rem = root-relative (preferred)
em = local-relative
% = parent
vw/vh = viewport
fr = grid free space
clamp(min, preferred, max)
```

---

## 9. Practice Checklist

- [ ] Explain em vs rem with nested example
- [ ] Write fluid heading with clamp
- [ ] Write constrained container with min()
