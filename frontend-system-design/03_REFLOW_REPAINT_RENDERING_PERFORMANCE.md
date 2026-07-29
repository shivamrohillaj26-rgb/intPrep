# Reflow vs Repaint & Rendering Performance — Interview Guide

---

## 1. Why Rendering Performance Matters

Even after assets download, the browser must continually update the screen at ~60fps.

Frame budget:

```text
60fps => ~16.6ms per frame
```

If JS + style + layout + paint exceed this, UI stutters/janks.

Interview one-liner:

> Rendering performance is about minimizing expensive style recalculation, layout (reflow), and paint work so the page stays smooth and responsive.

---

## 2. Rendering Pipeline Recap

For each UI update:

```text
JavaScript
  -> Style calculation
  -> Layout (Reflow)
  -> Paint
  -> Composite
```

Not every change goes through every stage.

Some changes can skip layout or paint.

---

## 3. What Is Reflow (Layout)?

**Reflow** = browser recalculates geometry of elements (sizes/positions).

Can be:

- one element
- or large parts of the document (cascading layout)

Triggered when you change layout-affecting properties or read geometry after writes in costly ways.

Examples of layout-affecting changes:

- `width`, `height`
- `margin`, `padding`, `border`
- `display`, `position`
- `top/left` (for non-composited positioning)
- font-size changes affecting text flow
- adding/removing DOM nodes
- changing text content that affects size
- window resize

Interview line:

> Reflow is geometry recalculation and is usually more expensive than paint.

---

## 4. What Is Repaint?

**Repaint** = browser redraws visible pixels without necessarily recalculating layout.

Triggered by visual changes that do not affect geometry:

- `color`
- `background-color`
- `visibility`
- `outline`
- `box-shadow` (often paint-heavy)
- some border-color changes

Example:

```css
.el { color: red; } /* may repaint, no layout change */
```

vs

```css
.el { width: 300px; } /* layout + likely paint */
```

---

## 5. Reflow vs Repaint Comparison

| | Reflow (Layout) | Repaint |
|---|---|---|
| Recalculates size/position? | Yes | No |
| Redraws pixels? | Usually yes after layout | Yes |
| Relative cost | Higher | Medium |
| Example props | width, margin, font-size | color, background |

Composite-only updates (best case):

- `transform`
- `opacity`

These can often skip layout and paint (still depends on browser/conditions).

---

## 6. Composite-Only Animations (Performance Gold)

Prefer animating:

```css
transform: translateX(10px) scale(1.02);
opacity: 0.8;
```

Avoid animating:

```css
top/left/width/height/margin
```

for continuous animations.

Why?

- transform/opacity often handled on compositor thread
- less main-thread layout/paint thrash

---

## 7. Layout Thrashing (Critical Interview Topic)

**Layout thrashing** = repeatedly forcing the browser to calculate layout by interleaving reads and writes.

Bad pattern:

```js
for (const el of elements) {
  // WRITE
  el.style.width = '100px';
  // READ (forces layout now)
  const h = el.offsetHeight;
  // WRITE again...
  el.style.height = h + 10 + 'px';
}
```

Each read after write can force synchronous reflow.

Better:

```js
// read all first
const heights = elements.map((el) => el.offsetHeight);

// write all after
elements.forEach((el, i) => {
  el.style.height = heights[i] + 10 + 'px';
});
```

Batch reads, then batch writes.

Geometry reads that can force layout:

- `offsetTop/Left/Width/Height`
- `clientHeight/Width`
- `getBoundingClientRect()`
- `scrollTop/Height` (often)

---

## 8. What Makes Rendering Slow?

1. Large DOM trees
2. Complex CSS selectors / expensive styles
3. Frequent reflows in loops
4. Unnecessary shadow/blur/filter effects
5. Layout-inducing animations
6. Long JS tasks blocking style/layout
7. Forced synchronous layouts
8. Massive paint areas every frame

---

## 9. Practical Optimization Techniques

### DOM

- keep DOM shallow when possible
- avoid frequent huge DOM mutations
- use document fragments / batched updates
- virtualize long lists (render visible window only)

### CSS

- prefer simpler selectors
- avoid changing layout props in animations
- use `contain` where appropriate
- reduce expensive effects over large areas

### JS

- debounce/throttle scroll/resize handlers
- batch DOM reads/writes
- use `requestAnimationFrame` for visual updates
- avoid sync layout in hot paths

### Rendering strategy

- use CSS transform for movement
- promote intentional layers carefully (not everywhere)
- content-visibility / virtualization for long pages

---

## 10. `requestAnimationFrame` Pattern

```js
let scheduled = false;

window.addEventListener('scroll', () => {
  if (scheduled) return;
  scheduled = true;

  requestAnimationFrame(() => {
    scheduled = false;
    updateUI(); // DOM writes here
  });
});
```

Aligns work with browser paint cycle and reduces wasted updates.

---

## 11. Layers And Compositing (Interview Depth)

Browser may put some elements on their own compositor layers.

Can help animations of transform/opacity.

But too many layers:

- more memory
- layer management overhead

Do not blindly add:

```css
will-change: transform;
transform: translateZ(0);
```

everywhere. Use for known animated elements.

---

## 12. Measuring Rendering Performance

Chrome DevTools:

- Performance panel (flame chart, layout/paint events)
- Rendering features: Paint flashing, Layer borders, Core Web Vitals overlay
- Performance monitor

Look for:

- frequent Layout events
- large Paint regions
- long tasks > 50ms
- drop in FPS while scrolling/animating

---

## 13. Examples To Use In Interviews

### Example A — Changing color

```js
el.style.color = 'blue';
```

Likely: style + paint (no layout)

### Example B — Changing width

```js
el.style.width = '50%';
```

Likely: style + layout + paint

### Example C — Moving with transform

```js
el.style.transform = 'translateX(20px)';
```

Likely: composite-only (best for animation)

### Example D — Thrash

```js
el.style.width = '200px';
const w = el.offsetWidth; // forces layout now
```

---

## 14. Angular/React Angle

Frameworks batch many updates, but you can still cause expensive renders:

- huge component trees re-rendered
- layout reads in lifecycle hooks after DOM writes
- animating layout props
- large `*ngFor`/lists without virtualization

Mitigations:

- `OnPush` / memoization
- trackBy
- virtual scroll (CDK)
- avoid heavy computation in templates
- animate transform/opacity

---

## 15. Common Interview Questions

**Q: Difference between reflow and repaint?**  
A: Reflow recalculates geometry; repaint redraws pixels. Reflow is generally costlier and usually followed by paint.

**Q: Which is more expensive?**  
A: Reflow/layout typically more expensive than paint; worst is frequent forced synchronous layouts.

**Q: How do you avoid layout thrashing?**  
A: Batch DOM reads then writes; avoid read/write interleaving in loops.

**Q: Best properties to animate?**  
A: `transform` and `opacity`.

**Q: Does `display:none` cause reflow?**  
A: Changing to/from `display:none` affects layout. `visibility:hidden` keeps space and is usually less geometry-destructive than removing from flow.

---

## 16. Spoken Answer (60–90 sec)

> After style changes, the browser may need to recalculate layout and repaint. Reflow updates geometry; repaint updates pixels. Continuous animations should prefer transform and opacity because they can be composited cheaply. The biggest footgun is layout thrashing—mixing DOM writes and geometry reads repeatedly. I optimize by batching reads/writes, throttling scroll handlers, virtualizing large lists, and measuring with Performance tools for layout/paint bottlenecks.

---

## 17. Cheat Sheet

```text
Pipeline: JS -> Style -> Layout -> Paint -> Composite

Reflow = geometry
Repaint = pixels
Best animate = transform/opacity

Avoid:
- animate width/top/left
- read layout after write in loops

Do:
- batch reads then writes
- rAF for visual updates
- debounce/throttle scroll/resize
- virtualize long lists
```

---

## 18. Practice Checklist

- [ ] Define reflow vs repaint clearly
- [ ] Give 3 properties that cause layout
- [ ] Give 3 that mainly repaint
- [ ] Explain layout thrashing with code
- [ ] Explain why transform/opacity are preferred
- [ ] Mention how to measure in DevTools

---

## Interview drill — APIs fast, page still slow: where is the bottleneck?

| Suspect | How you identify |
|---|---|
| JS execution | Performance panel long **Scripting** tasks / long tasks |
| Reflow (layout) | Layout/Recalculate Style spikes; geometry reads in loops |
| Repaint | Paint work without big layout changes |
| Compositing | Layer/composite work; prefer `transform`/`opacity` animations |

Record Performance → look at Summary + flame chart. Same guide above for fix strategies.

See also: `../javascript-interview-prep/TRICKY_10_FRONTEND_QUESTIONS.md` Q6.
