# Critical Rendering Path (CRP) — Frontend System Design Interview Guide

---

## 1. What Is The Critical Rendering Path?

The **Critical Rendering Path** is the sequence of steps the browser takes to convert HTML, CSS, and JavaScript into pixels on the screen.

Interview one-liner:

> CRP is the browser pipeline from receiving bytes to painting pixels. Optimizing it means getting first meaningful content on screen faster by reducing critical resources, bytes, and blocking work.

Why it matters:

- First Contentful Paint (FCP)
- Largest Contentful Paint (LCP)
- Time to Interactive (TTI)
- Perceived performance

---

## 2. High-Level Pipeline

```text
1. Network download (HTML)
2. Parse HTML -> DOM
3. Download/parse CSS -> CSSOM
4. Combine DOM + CSSOM -> Render Tree
5. Layout (Reflow) -> geometry
6. Paint -> pixels
7. Composite -> layers to screen
```

Detailed flow:

```text
HTML bytes
   -> HTML parser
   -> DOM Tree

CSS bytes
   -> CSS parser
   -> CSSOM Tree

DOM + CSSOM
   -> Render Tree (visible nodes only)

Render Tree
   -> Layout (exact positions/sizes)

Layout result
   -> Paint (fill pixels)

Painted layers
   -> Composite (GPU combine)
```

---

## 3. DOM Construction

Browser reads HTML tokens and builds the Document Object Model.

```html
<html>
  <head>...</head>
  <body>
    <div id="app">Hello</div>
  </body>
</html>
```

Becomes a tree:

```text
html
├─ head
└─ body
   └─ div#app
      └─ "Hello"
```

Notes:

- HTML parsing can be incremental (streamed)
- `<script>` without async/defer can **block** HTML parsing
- DOM represents structure + content

---

## 4. CSSOM Construction

Browser downloads and parses CSS into CSS Object Model.

```css
body { font-size: 16px; }
#app { color: red; }
```

Important:

- CSS is **render-blocking** by default
- Browser usually waits for critical CSS before first paint (to avoid FOUC: Flash of Unstyled Content)
- Complex selectors cost more parse/match time

---

## 5. Render Tree

Render tree = visible nodes that will be drawn.

Not everything in DOM is in render tree:

- `display: none` nodes excluded
- `<head>`, `<script>` metadata excluded
- `visibility: hidden` still takes space, so may still participate in layout

```text
DOM node + matching CSS styles => render object
```

---

## 6. Layout (Reflow)

Browser calculates geometry:

- width/height
- top/left
- positions of all boxes

Triggered by:

- first render
- viewport resize
- DOM insert/remove
- changing layout-affecting CSS (`width`, `margin`, `font-size`, etc.)

Expensive for large trees.

---

## 7. Paint And Composite

### Paint

Fill in pixels: text, colors, borders, shadows, images.

### Composite

Combine layers (often GPU-accelerated) into final frame.

Transforms/opacity changes can sometimes skip layout/paint and only composite (cheaper).

---

## 8. What Blocks The Critical Path?

### 1) Render-blocking CSS

```html
<link rel="stylesheet" href="main.css" />
```

Browser needs CSSOM for correct first paint.

### 2) Parser-blocking JS

```html
<script src="app.js"></script>
```

Default script:

- stops HTML parsing
- must download + execute before parsing continues
- can also read/modify DOM/CSSOM

### 3) Large critical resources

- big HTML
- big CSS above-the-fold
- big JS needed for first screen
- fonts blocking text render

---

## 9. Script Loading Attributes (Must Know)

```html
<script src="app.js"></script>           <!-- blocks parser -->
<script src="app.js" defer></script>     <!-- download parallel, run after HTML parsed -->
<script src="app.js" async></script>     <!-- download parallel, run when ready (order not guaranteed) -->
```

| Attribute | Download | Execution | Order preserved? | Good for |
|---|---|---|---|---|
| none | blocks parser | immediately when fetched | yes (document order) | rarely ideal at end/critical only |
| `defer` | non-blocking | after document parsed | yes | general app bundles |
| `async` | non-blocking | ASAP when downloaded | no | independent analytics/tags |

Module scripts (`type="module"`) are deferred by default.

---

## 10. Optimizing The Critical Rendering Path

Interview framework: reduce **critical resources**, **critical bytes**, **critical path length**.

### A) Reduce critical resources

- remove unused CSS/JS from first load
- code-split and lazy-load non-critical routes/components
- delay third-party scripts

### B) Reduce critical bytes

- minify HTML/CSS/JS
- compress (gzip/br)
- tree-shake
- smaller images/fonts for above-the-fold

### C) Reduce critical path length

- fewer blocking round trips
- inline tiny critical CSS
- preload key resources
- HTTP/2 multiplexing helps parallel fetches

---

## 11. Practical Techniques

### Inline critical CSS

```html
<head>
  <style>
    /* only above-the-fold styles */
    header, .hero { ... }
  </style>
  <link rel="stylesheet" href="full.css" />
</head>
```

### Preload critical assets

```html
<link rel="preload" href="font.woff2" as="font" type="font/woff2" crossorigin />
<link rel="preload" href="hero.webp" as="image" />
```

### Defer non-critical JS

```html
<script src="main.js" defer></script>
```

### Async non-critical independent JS

```html
<script src="analytics.js" async></script>
```

### Font strategy

```css
font-display: swap; /* show fallback text quickly */
```

### Avoid giant blocking bundles on first paint

- route-level lazy loading
- below-the-fold components lazy loaded

---

## 12. CRP Metrics To Mention

| Metric | Meaning |
|---|---|
| FCP | first content painted |
| LCP | largest above-the-fold content painted |
| TTI | when page becomes reliably interactive |
| TBT | total blocking time on main thread |
| CLS | layout shift stability |

CRP optimization mainly improves FCP/LCP/TTI.

---

## 13. Example Walkthrough (Interview Story)

Page has:

- HTML
- one big CSS
- one big JS in `<head>` without defer

What happens:

1. HTML starts downloading/parsing
2. CSS blocks rendering
3. JS in head blocks parsing
4. First paint delayed until CSS + JS work finishes

Optimized:

1. critical CSS inlined
2. full CSS async/deferred strategy
3. JS deferred / split by route
4. hero image + font preloaded

Result: earlier first paint and better LCP.

---

## 14. Angular-Specific Angle

- Initial bundle size matters for CRP
- Lazy-loaded feature modules reduce critical JS
- Avoid heavy work in `APP_INITIALIZER` if it blocks startup
- Server-Side Rendering / hydration can improve first paint for content pages
- Critical styles in global styles should stay lean

---

## 15. Common Interview Questions

**Q: What is Critical Rendering Path?**  
A: Browser steps from HTML/CSS/JS bytes to rendered pixels (DOM, CSSOM, render tree, layout, paint, composite).

**Q: Why is CSS render-blocking?**  
A: Browser needs style information to avoid painting unstyled content incorrectly.

**Q: Why can JS block parsing?**  
A: Scripts may mutate DOM; parser waits to keep execution order/correctness unless async/defer.

**Q: defer vs async?**  
A: Both download without blocking parse; defer runs after parse in order, async runs when ready unordered.

**Q: How do you optimize CRP?**  
A: Reduce blocking CSS/JS, shrink bytes, preload critical assets, lazy-load non-critical code, optimize fonts/images.

---

## 16. Spoken Answer (60–90 sec)

> The Critical Rendering Path is how the browser turns HTML, CSS, and JS into pixels. It builds the DOM from HTML and CSSOM from CSS, combines them into a render tree, then does layout, paint, and compositing. CSS is render-blocking, and normal scripts can block HTML parsing. To optimize CRP, I reduce critical resources and bytes: inline or prioritize critical CSS, defer non-critical JS, split bundles so the first screen loads less code, preload key fonts/images, and lazy-load below-the-fold features. The goal is faster first paint and interactivity.

---

## 17. Cheat Sheet

```text
HTML -> DOM
CSS  -> CSSOM
DOM + CSSOM -> Render Tree
-> Layout -> Paint -> Composite

CSS: render-blocking
JS: parser-blocking (unless async/defer)

Optimize:
- fewer critical resources
- fewer critical bytes
- shorter critical path
- defer/async JS
- critical CSS
- preload LCP assets
- code split / lazy load
```

---

## 18. Practice Checklist

- [ ] Draw CRP stages from memory
- [ ] Explain DOM vs CSSOM vs render tree
- [ ] Explain async vs defer
- [ ] List 5 CRP optimizations
- [ ] Connect CRP to FCP/LCP/TTI
