# GOC — CSS3 (pseudo + the rest they actually ask)

JD: **HTML5, CSS3**, responsive reusable UI, work with designers, Google-quality reviews.  
GOC L1 also asked **CSS conflicts in micro-frontends**.

Deep catalog of `:hover` / `::before` / `:has`:  
[`../css-interview-prep/14_PSEUDO_CLASSES_PSEUDO_ELEMENTS.md`](../css-interview-prep/14_PSEUDO_CLASSES_PSEUDO_ELEMENTS.md)

Don’t reread every CSS file. This page is the **speak list**. Layout drills stay in `css-interview-prep/` (box, flex, grid).

---

## 0. 40s spoken (open with this if they say “CSS?”)

> I keep specificity **flat** — classes, not IDs. **Pseudo-classes** are states (`:hover`, `:focus-visible`, `:nth-child`). **Pseudo-elements** are fake boxes (`::before` needs `content`). Layout is **flex for one axis / nav**, **grid for 2D / cards**. Box model is **border-box**. In Angular I style through **`:host`**, not `::ng-deep`. For MFEs I isolate CSS with encapsulation or a shared token package so two `.btn:hover` rules don’t collide.

---

## 1. Pseudo-class vs pseudo-element (must not mix)

| | Pseudo-class `:` | Pseudo-element `::` |
|---|---|---|
| What | Real node, extra **condition** | **Virtual** piece of the node |
| Examples | `:hover` `:focus-visible` `:nth-child` `:not` `:has` `:disabled` | `::before` `::after` `::placeholder` `::selection` `::marker` |
| Specificity | Like a **class** | Like a **type** |
| DOM | Yes | No — `querySelector('::before')` is useless; `getComputedStyle(el, '::before')` |

```css
a:hover { color: #174ea6; }
.hint::before { content: ""; } /* no content → box never appears */
input::placeholder { color: #5f6368; }
```

**Traps:** `p:first-child` vs `p:first-of-type`. Don’t put `::before` on `input`/`img`. Don’t remove `:focus` outline without `:focus-visible`. Don’t hide critical UI on `:hover` only (touch + keyboard).

**`:is` vs `:where`:** same matching; `:where` has **zero** specificity (resets).  
**`:has`:** parent selector; keep the inner query tight.

Angular: **`:host`**, `:host(.primary)`, avoid **`::ng-deep`**.

---

## 2. “More CSS” GOC will lump in the same round

### Box model (10s)

`box-sizing: border-box` on `*, *::before, *::after` — padding **inside** width. Content-box surprises in Figma-to-CSS.  
→ [`01_BOX_MODEL.md`](../css-interview-prep/01_BOX_MODEL.md)

### Flex vs Grid (15s)

| Need | Use |
|---|---|
| Navbar, cluster of buttons, center one thing | **Flex** |
| Page regions, equal card gallery | **Grid** + `repeat(auto-fit, minmax(min(250px, 100%), 1fr))` |
| Wrapping chips | Flex `wrap` + `gap` |

→ [`02_FLEXBOX.md`](../css-interview-prep/02_FLEXBOX.md), [`03_CSS_GRID.md`](../css-interview-prep/03_CSS_GRID.md)

### Specificity / cascade (15s)

ID > class/attr/pseudo-class > type/pseudo-element. Later rule wins on a tie. `!important` is a smell except utilities.  
→ [`06_SELECTORS_AND_SPECIFICITY.md`](../css-interview-prep/06_SELECTORS_AND_SPECIFICITY.md)

### Position / z-index (10s)

Overlay = `position` + stacking **context** (`transform`, `opacity` < 1, `z-index` on positioned). Modal `z-index: 9999` loses if parent created a context.  
→ [`07_POSITIONING_AND_ZINDEX.md`](../css-interview-prep/07_POSITIONING_AND_ZINDEX.md)

### Responsive (JD: various devices)

Mobile-first `@media (min-width: …)`. Prefer **fluid** (`clamp`, `%`, `minmax`) over 12 breakpoints. **Container queries** if they ask “component that works in sidebar and main.”  
→ [`04_RESPONSIVE_DESIGN.md`](../css-interview-prep/04_RESPONSIVE_DESIGN.md)

### Units

`rem` for type/spacing (a11y zoom). `em` for component-local. `svh`/`dvh` for mobile browser chrome. `px` for hairline borders.

### Custom properties (design collab)

```css
:root { --space-2: 8px; --color-primary: #1a73e8; }
```

Figma tokens → CSS variables → Angular `:host { --btn-bg: … }` from `@Input`. Don’t hardcode hex in 40 components.

### Motion (designer hypothetical)

`transform` + `opacity` (compositor) over `top`/`height` (reflow). `prefers-reduced-motion: reduce { animation: none; }`.  
→ [`10_TRANSITIONS_TRANSFORMS_ANIMATIONS.md`](../css-interview-prep/10_TRANSITIONS_TRANSFORMS_ANIMATIONS.md), [`03_REFLOW_REPAINT_RENDERING_PERFORMANCE.md`](../frontend-system-design/03_REFLOW_REPAINT_RENDERING_PERFORMANCE.md)

### Overflow / text

`text-overflow: ellipsis` needs `overflow: hidden` + `white-space: nowrap` (or `-webkit-line-clamp` for multi-line). CMS titles will overflow — designers always miss this.

---

## 3. CSS in Angular + MFEs (GOC L1 Q5)

**Emulated encapsulation:** Angular suffixes `_ngcontent-xxx` so `.card:hover` in `app-card` doesn’t style another `.card`.

**Leaks:** `ViewEncapsulation.None`, global `styles.css`, `::ng-deep`, third-party CSS.

**MFE isolation (say this):**

1. Shared **design-token** package (one `--color-primary`).
2. Don’t load **two copies** of a global stylesheet.
3. Component encapsulation **or** Shadow DOM / prefix (`goc-btn`).
4. Avoid global tag selectors (`button { }`) in a remote.

---

## 4. Live-code CSS they might ask (whiteboard)

**Focus ring**

```css
.btn:focus { outline: none; }
.btn:focus-visible { outline: 2px solid #1a73e8; outline-offset: 2px; }
```

**Zebra + last item no divider**

```css
li:nth-child(odd) { background: #f8f9fa; }
li:not(:last-child) { border-bottom: 1px solid #dadce0; }
```

**Required asterisk (decorative)**

```css
.lbl--req::after { content: " *"; color: #d93025; }
```

Keep the word “required” in accessible name if it’s essential.

**Responsive cards**

```css
.cards {
  display: grid;
  grid-template-columns: repeat(auto-fit, minmax(min(16rem, 100%), 1fr));
  gap: 1rem;
}
```

---

## 5. Rapid-fire answers

| Q | A |
|---|---|
| `::` vs `:` | Element vs class; old IE used `:` for both |
| Why `content: ""` | Generates the before/after box |
| `:empty` failed | Whitespace text node |
| Style placeholder | `::placeholder` |
| Parent selector | `:has()` |
| Zero-specificity grouping | `:where()` |
| Host of component | `:host` |
| Kill encapsulation | `::ng-deep` — don’t |
| Flex `gap` vs margin | `gap` doesn’t collapse on last child |
| `minmax(250px, 1fr)` overflow | Use `minmax(min(250px, 100%), 1fr)` |
| Repaint vs reflow | Color vs geometry — see FE system-design 03 |

---

## 6. Practice 20 min

1. Write `:focus-visible` + `::before` icon from memory.  
2. Explain `nth-child` vs `nth-of-type` with the `h2` + `p` HTML.  
3. Flex vs grid for a Figma card row.  
4. How two MFEs don’t fight on `.btn:hover`.
