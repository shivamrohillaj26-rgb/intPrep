# Transitions, Transforms & Animations — Interview Guide

---

## 1. Transition vs Animation

| Feature | Transition | Animation |
|---|---|---|
| Trigger | state change (`:hover`, class toggle) | runs with keyframes |
| From/to | between two states | multiple keyframes |
| Looping | no (normally) | yes (`infinite`) |

---

## 2. Transitions

```css
.button {
  background: #3153c7;
  transition: background 0.2s ease, transform 0.2s ease;
}

.button:hover {
  background: #243f9f;
  transform: translateY(-2px);
}
```

Properties:

- `transition-property`
- `transition-duration`
- `transition-timing-function`
- `transition-delay`

Prefer transitioning transform/opacity for performance.

---

## 3. Transforms

```css
.transform-demo {
  transform: translate(10px, 4px) scale(1.05) rotate(2deg);
}
```

Common functions:

- `translateX/Y`
- `scale`
- `rotate`
- `skew`

`transform` does not trigger layout as much as top/left changes (generally better).

---

## 4. Keyframe Animations

```css
@keyframes fadeInUp {
  from {
    opacity: 0;
    transform: translateY(8px);
  }
  to {
    opacity: 1;
    transform: translateY(0);
  }
}

.card {
  animation: fadeInUp 0.35s ease both;
}
```

Useful properties:

- `animation-name`
- `animation-duration`
- `animation-timing-function`
- `animation-iteration-count`
- `animation-direction`
- `animation-fill-mode`

---

## 5. Performance Tip

Prefer:

```css
transform, opacity
```

Avoid animating:

```css
width, height, top, left, margin
```

when possible (layout thrash).

---

## 6. Interview Questions

**Q: Transition vs animation?**  
A: Transition is state-to-state; animation uses keyframes and can loop independently.

**Q: Why animate transform/opacity?**  
A: Usually compositor-friendly and smoother.

---

## 7. Cheat Sheet

```text
transition: on state change
animation: keyframes over time
transform: translate/scale/rotate
prefer transform/opacity
```
