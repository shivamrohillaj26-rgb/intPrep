# Script Loading: `async` vs `defer` — Interview Guide

When a browser sees a `<script>` tag, it must decide:

1. Should HTML parsing **pause**?
2. When should the script **download**?
3. When should the script **execute**?

`async` and `defer` answer those questions. This is a classic frontend interview topic.

---

## 1. The Default `<script>` (no attribute)

```html
<script src="app.js"></script>
```

What happens:

1. HTML parser reaches the script
2. **Parsing pauses**
3. Browser downloads `app.js`
4. Browser **executes** it immediately
5. Parsing resumes

```text
HTML ----▶ [PAUSE] download + run script [RESUME] ----▶
```

### Problems

- Blocks first paint / First Contentful Paint
- If script is in `<head>`, page looks blank longer
- Order is preserved only because everything is sequential and blocking

### Old “safe” pattern

Put scripts at the **end of `<body>`**:

```html
<body>
  <h1>Content</h1>
  ...
  <script src="app.js"></script>
</body>
```

HTML is mostly parsed before the script runs. Still not as good as `defer` for modern pages.

---

## 2. `defer`

```html
<script src="app.js" defer></script>
```

### Behavior

| Step | What happens |
|---|---|
| Download | Starts immediately (does **not** block HTML parsing) |
| Execute | Waits until HTML is **fully parsed** |
| Order | Multiple `defer` scripts run in **document order** |
| DOM | DOM is ready when they run (`DOMContentLoaded` waits for them) |

```text
HTML parsing ████████████████████████ done
download      ████████
execute                        ██ (after parse, in order)
```

### When to use `defer`

- Your app needs the **DOM** (querySelector, Angular/React bootstrap, etc.)
- You care about **script order** (A then B)
- Default choice for most application JS

```html
<head>
  <script src="vendor.js" defer></script>
  <script src="app.js" defer></script>
</head>
```

`vendor.js` always runs before `app.js`.

### Interview line

> **`defer` downloads in parallel with HTML parsing, then runs after the document is parsed, in order.**

---

## 3. `async`

```html
<script src="analytics.js" async></script>
```

### Behavior

| Step | What happens |
|---|---|
| Download | Starts immediately (does not block parsing) |
| Execute | Runs **as soon as download finishes** |
| Order | **Not guaranteed** between async scripts |
| Parsing | Execution **pauses** HTML parsing briefly when script runs |

```text
HTML parsing ████  pause ████████
download A    ████
run A              ██     ← whenever A finished
download B      ██████
run B                   ██ ← whenever B finished (may be before A)
```

### When to use `async`

- Independent scripts that **don’t depend on DOM order** or other scripts
- Analytics, ads, non-critical third-party widgets
- Anything where “run ASAP after download” is fine

### When NOT to use `async`

- App bootstrap that needs DOM
- Scripts that depend on each other (`lodash` then `app`)
- Anything where order matters

### Interview line

> **`async` downloads in parallel and executes as soon as ready — order is not guaranteed.**

---

## 4. Side-by-side comparison

| | Default | `defer` | `async` |
|---|---|---|---|
| Blocks HTML while downloading? | Yes | No | No |
| When executes? | Immediately after download | After HTML parsed | ASAP after download |
| Preserves order? | Yes (blocking) | Yes | No |
| Good for app code? | Only if at end of body | **Yes (best)** | Usually no |
| Good for analytics? | No | OK | **Yes** |
| DOM guaranteed ready? | Only if at end of body | Yes | **No** |

---

## 5. Visual mental model

Imagine 3 scripts:

```html
<script src="a.js" defer></script>
<script src="b.js" async></script>
<script src="c.js" defer></script>
```

Possible story:

1. HTML keeps parsing
2. `a`, `b`, `c` all start downloading
3. `b` finishes first → **runs immediately** (may interrupt parsing)
4. HTML finishes parsing
5. `a` runs, then `c` runs (defer order)

So: **async can cut in the middle**; **defer waits and stays ordered**.

---

## 6. `DOMContentLoaded` relationship

- `DOMContentLoaded` fires when HTML is parsed and **deferred scripts have executed**
- `async` scripts may run before or after `DOMContentLoaded` (race)
- `window.onload` waits for images/styles too — later than DOMContentLoaded

```js
document.addEventListener('DOMContentLoaded', () => {
  console.log('DOM ready (after defer scripts)');
});
```

---

## 7. Inline scripts

```html
<script defer>
  console.log('hi');
</script>
```

`async` / `defer` mainly apply to **external** scripts (`src="..."`).

Inline scripts in HTML run immediately when the parser reaches them (unless `type="module"` rules apply).

---

## 8. ES Modules (`type="module"`)

```html
<script type="module" src="app.js"></script>
```

Module scripts are **deferred by default**:

- Download without blocking parse
- Execute after HTML is parsed
- Run in order
- Are deferred even without the `defer` attribute

```html
<!-- these are equivalent in timing spirit -->
<script type="module" src="app.js"></script>
<script type="module" src="app.js" defer></script>
```

You can also use `async` on modules if you want “run when ready, ignore order”:

```html
<script type="module" src="widget.js" async></script>
```

---

## 9. Angular / SPA note

In Angular CLI apps you usually **don’t manually** put `async`/`defer` on bundle tags — the build tooling injects scripts.

Still asked in interviews because:

- You may load third-party scripts in `index.html`
- You may add analytics tags
- You should know browser parsing basics

Typical `index.html` third-party choice:

```html
<!-- app needs order + DOM → defer -->
<script src="https://cdn.example.com/helper.js" defer></script>

<!-- independent tracker → async -->
<script src="https://www.googletagmanager.com/gtag/js?id=..." async></script>
```

---

## 10. Tricky interview questions

### Q1 — What prints first?

```html
<script>
  console.log('1 inline');
</script>
<script src="a.js" defer></script>
<script>
  console.log('2 inline');
</script>
```

`a.js` contains `console.log('3 defer')`.

**Output:**

```text
1 inline
2 inline
3 defer
```

Defer waits until parse completes; inline runs immediately when reached.

### Q2 — async vs defer order

```html
<script src="slow.js" async></script>
<script src="fast.js" async></script>
```

If `fast.js` downloads first, it can run before `slow.js`. **Order not guaranteed.**

### Q3 — Which to pick for your main app bundle?

**`defer`** (or `type="module"`, which defers by default).

### Q4 — Does `async` guarantee DOM is ready?

**No.** Script may run while HTML is still parsing. Use `DOMContentLoaded` / put logic that needs nodes carefully, or prefer `defer`.

### Q5 — Can you use both?

```html
<script src="x.js" async defer></script>
```

Browsers treat this as **`async`** for classic scripts (async wins). Don’t rely on both — pick one.

---

## 11. Decision cheat sheet

```text
Need DOM + order (app, Angular bootstrap helper)?
  → defer  (or type="module")

Independent, fire-and-forget (analytics)?
  → async

Legacy, no attributes, script at end of body?
  → works, but defer in <head> is cleaner
```

---

## 12. Spoken 20-second answer

> Default scripts block HTML parsing. `defer` downloads in parallel and runs after the document is parsed, preserving order — best for app code. `async` also downloads in parallel but executes as soon as the file is ready, so order isn’t guaranteed — good for independent third-party scripts like analytics. Module scripts are deferred by default.

---

## Practice checklist

- [ ] Explain default / defer / async with a timeline sketch
- [ ] Say when order is preserved
- [ ] Know DOM readiness differences
- [ ] Know modules are deferred by default
- [ ] Pick correctly for analytics vs app bundle
