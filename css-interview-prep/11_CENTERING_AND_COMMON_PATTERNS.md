# Centering & Common CSS Patterns — Interview Guide

---

## 1. Center With Flexbox (Most Common Answer)

```css
.center {
  display: flex;
  justify-content: center;
  align-items: center;
  min-height: 100vh;
}
```

---

## 2. Center With Grid

```css
.center {
  display: grid;
  place-items: center;
  min-height: 100vh;
}
```

`place-items` = `align-items` + `justify-items`.

---

## 3. Center Absolutely Positioned Box

```css
.parent { position: relative; }

.modal {
  position: absolute;
  top: 50%;
  left: 50%;
  transform: translate(-50%, -50%);
}
```

---

## 4. Horizontal Center Block

```css
.box {
  width: 400px;
  margin-left: auto;
  margin-right: auto;
}
```

---

## 5. Common Interview Patterns

### Sticky footer layout

```css
body {
  min-height: 100vh;
  display: flex;
  flex-direction: column;
}

main { flex: 1; }
```

### Truncate text

```css
.truncate {
  white-space: nowrap;
  overflow: hidden;
  text-overflow: ellipsis;
}
```

### Aspect ratio box

```css
.thumb {
  aspect-ratio: 16 / 9;
  width: 100%;
  object-fit: cover;
}
```

### Visually hide but accessible

```css
.sr-only {
  position: absolute;
  width: 1px;
  height: 1px;
  padding: 0;
  margin: -1px;
  overflow: hidden;
  clip: rect(0, 0, 0, 0);
  border: 0;
}
```

---

## 6. Interview Questions

**Q: How do you center a div horizontally and vertically?**  
A: Flex (`justify-content` + `align-items`) or Grid (`place-items: center`).

**Q: Older absolute centering technique?**  
A: `top/left 50%` + `transform: translate(-50%, -50%)`.

---

## 7. Cheat Sheet

```text
Flex center: justify + align center
Grid center: place-items: center
Absolute center: top/left 50% + translate -50%
Block horizontal: margin auto
```
