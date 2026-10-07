# Pseudo-classes, pseudo-elements, and related CSS

Interview depth for **HTML5 / CSS3** rounds (GOC JD, design-collab, reusable components).  
GOC spoken hub: [`../goc/GOC_CSS.md`](../goc/GOC_CSS.md). Specificity/cascade: [`06_SELECTORS_AND_SPECIFICITY.md`](./06_SELECTORS_AND_SPECIFICITY.md).

---

## 0. One-sentence difference (say this)

- **Pseudo-class** (`:`) — select an element in a **state or position** (`:hover`, `:nth-child(2)`). Same node in the DOM.
- **Pseudo-element** (`::`) — style a **virtual piece** the browser invents (`::before`, `::placeholder`). Not a real child you wrote in HTML.

Single `:` on `::before` still works (legacy). In interviews write **`::` for elements, `:` for classes**.

Specificity: pseudo-**class** = class (0,1,0). Pseudo-**element** = type (0,0,1).

---

## 1. Pseudo-classes you must speak

### User action / focus

| Selector | When | Interview trap |
|---|---|---|
| `:hover` | Pointer over | **Not on touch.** Don’t hide essential UI behind hover only. |
| `:active` | Mouse down / tap | Fires on keyboard activate too for buttons |
| `:focus` | Keyboard *or* mouse click into field | Outline removed → a11y fail. Restore with `:focus-visible` |
| `:focus-visible` | “Focus that should show a ring” (keyboard) | **Prefer this** for custom focus rings |
| `:focus-within` | This element **or a descendant** is focused | Dropdown / card highlight while input inside is focused |

```css
.btn:focus { outline: none; } /* bad if nothing replaces it */
.btn:focus-visible { outline: 2px solid #1a73e8; outline-offset: 2px; }
.card:focus-within { box-shadow: 0 0 0 2px #1a73e8; }
```

**Spoken 20s:** “I don’t remove outline. I style `:focus-visible` so mouse users don’t get a ring on every click, keyboard users still see it. Google-quality UI cares about that.”

### Links

`:link` unvisited, `:visited` visited (privacy: **very few properties** allowed — color, etc., not `background-image`). `:any-link` = either.

### Form / input

| Selector | Use |
|---|---|
| `:disabled` / `:enabled` | Grey out; `pointer-events: none` is not the same as disabled |
| `:checked` | Checkbox, radio, **and** `<option>` |
| `:required` / `:optional` | |
| `:valid` / `:invalid` | Native constraint validation — don’t style `:invalid` on empty required until `:user-invalid` / touched (otherwise red on first paint) |
| `:placeholder-shown` | Input still showing placeholder |
| `:read-only` / `:read-write` | |
| `:autofill` | Browser filled the field (ugly yellow — you can restyle carefully) |

```css
input:not(:placeholder-shown) { border-color: #188038; }
input:user-invalid { border-color: #d93025; } /* where supported */
```

### Structural (lists, tables, CMS HTML)

| Selector | Meaning |
|---|---|
| `:first-child` / `:last-child` | First/last **among siblings** (any type) |
| `:first-of-type` / `:last-of-type` | First/last **of that tag** |
| `:nth-child(2n)` / `:nth-child(2n+1)` | Even / odd **children** |
| `:nth-child(3)` | Third child, whatever tag |
| `:nth-of-type(2)` | Second `p` (if selector is `p`) |
| `:only-child` | No siblings |
| `:empty` | No children **and** no text (whitespace can make it *not* empty) |
| `:root` | `<html>` — put CSS variables here |

**Classic trap:** `p:first-child` vs `p:first-of-type`.

```html
<div>
  <h2>Title</h2>
  <p>Hello</p>
</div>
```

`p:first-child` → **matches nothing** (first child is `h2`).  
`p:first-of-type` → matches **Hello**.

`nth-child` vs `nth-of-type` is the same idea.

```css
tr:nth-child(even) { background: #f8f9fa; } /* zebra table */
.chips span:not(:last-child)::after { content: " · "; }
```

### Logical / modern

| Selector | Meaning | Specificity note |
|---|---|---|
| `:not(.x)` | Exclude | Specificity **includes** the argument (`:not(.a)` = one class) |
| `:is(.a, .b)` | Any of | Specificity = **most specific argument** |
| `:where(.a, .b)` | Same matching as `:is` | Specificity of `:where` is **0** — great for resets |
| `:has(> img)` | Parent has a matching descendant | “Parent selector”; can be expensive — don’t put wild `*` inside on huge trees |

```css
:where(h1, h2, h3) { margin: 0; } /* zero specificity reset */
.card:has(img) { padding-top: 0; }
label:has(:checked) { font-weight: 600; }
```

---

## 2. Pseudo-elements you must speak

| Selector | What it styles | Needs `content`? |
|---|---|---|
| `::before` / `::after` | Boxes **inside** the element, before/after its children | **Yes** (`content: ""` at minimum) or they don’t generate |
| `::placeholder` | Input placeholder text | — |
| `::selection` | Highlighted text | Limited properties |
| `::first-line` / `::first-letter` | First line / letter of a **block** | — |
| `::marker` | `<li>` bullet / number | — |
| `::backdrop` | Behind `<dialog>` / fullscreen | — |
| `::file-selector-button` | “Choose file” button | — |

```css
.icon-btn { position: relative; }
.icon-btn::before {
  content: "";
  display: block;
  width: 16px;
  height: 16px;
  background: currentColor;
  mask: url(icon.svg) center / contain no-repeat;
}

.required::after {
  content: " *";
  color: #d93025;
}

blockquote::before {
  content: open-quote;
}
```

**Rules interviewers like:**

1. `::before` / `::after` only on **elements that can have children**. **Not** on replaced elements (`img`, `input`, `br`, `video`) — `input::placeholder` is the exception API.
2. They are in the **box tree**, they affect layout unless `position: absolute`.
3. `content` is **not** in the DOM — screen readers may ignore decorative `content: ""`; don’t put essential text only in `::before`.
4. `pointer-events` on `::before` can steal clicks.

**Clear / extra last child without extra HTML:**

```css
.clearfix::after {
  content: "";
  display: table;
  clear: both;
}
```

(Modern: use flex/grid; mention clearfix only if they ask legacy.)

---

## 3. Combinators (they lump this with “more CSS”)

| | |
|---|---|
| ` ` descendant | any depth |
| `>` child | one level |
| `+` adjacent sibling | next sibling |
| `~` general sibling | later siblings |
| `\|\|` column | CSS Grid/table columns (rarely asked) |

```css
label:has(+ input:invalid) { color: #d93025; }
h2 + p { margin-top: 0; } /* first paragraph after heading */
```

---

## 4. Attribute selectors

```css
a[href^="https"] { }
input[type="checkbox"] { }
[data-state="open"] { }
[class*="col-"] { } /* avoid if you can — slow + messy */
```

`[attr]` 0,1,0 like a class.

---

## 5. Angular-specific “pseudo”

| | |
|---|---|
| `:host` | The **component host** element (`app-button`) |
| `:host(.primary)` | Host has class `primary` |
| `:host-context(.dark)` | Some **ancestor** has `.dark` (use sparingly — piercing) |
| `::ng-deep` | **Deprecated.** Pierces encapsulation. Prefer `:host` + inputs + global design tokens / mixins |

Emulated encapsulation adds `_ngcontent` attributes so `.btn:hover` in the component doesn’t leak. **Pseudo-classes still work** inside the template.

**MFE / GOC L1:** two remotes both using `.btn:hover` — encapsulation or **prefix / Shadow DOM / shared token package**. Don’t `::ng-deep` your way across MFEs.

---

## 6. Cascade layers, variables, important extras

**Custom properties** (not pseudo, but always next question):

```css
:root {
  --space-2: 8px;
  --color-primary: #1a73e8;
}
.btn { padding: var(--space-2) calc(var(--space-2) * 2); }
```

**`@layer`:** reset < tokens < components < utilities — keeps specificity fights down.

**`!important`:** utilities / third-party override only.

---

## 7. A11y + CMS (GOC overlap)

- Hover-only tooltips fail keyboard and touch → `:focus-visible` + click.
- `content: "Required"` in `::after` may be skipped by SR → real text or `aria-hidden` on decorative.
- CMS HTML: `p:empty { display: none; }` to hide leftover empty tags.
- `:visited` privacy — don’t try to detect history.

---

## 8. Q bank (short)

**`:nth-child(2)` vs `:nth-of-type(2)`?**  
Child counts **all siblings**; of-type counts **same tag**.

**Can JS `querySelector('::before')`?**  
No useful element. Computed style via `getComputedStyle(el, '::before')`.

**Why `content: ""`?**  
Without `content`, `::before`/`::after` are not generated.

**`:is` vs `:where`?**  
Same match; `:where` has **zero** specificity.

**`:has` performance?**  
Yes cost; keep the inner selector tight.

**Stacking hover + focus?**  
`.btn:hover, .btn:focus-visible { }` — don’t rely on hover alone.

**Pseudo-element on `input`?**  
No `::before`. Use wrapper + `::placeholder`.

---

## 9. 45s spoken (whole topic)

> Pseudo-classes select a real element in a state — hover, focus-visible, nth-child, :not, :has. Pseudo-elements create virtual boxes — before/after need content, placeholder, selection. Specificity: classes vs elements. I use focus-visible for rings, :host in Angular, and I don’t hide critical UI behind hover. For zebra rows and “required asterisk” I prefer nth-child and ::after, but essential copy stays in the DOM for screen readers.
