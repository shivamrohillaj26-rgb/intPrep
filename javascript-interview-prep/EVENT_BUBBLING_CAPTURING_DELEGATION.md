# Event Bubbling, Capturing & Delegation — Interview Ready Guide

Critical for frontend interviews (DOM + Angular/React mental models).  
Same depth bar as [RXJS_INTERVIEW.md](./RXJS_INTERVIEW.md): phases → APIs → delegation → traps → Q bank.

---

## 0. One-minute mental model

```text
Click on <button> inside nested divs:

  CAPTURE  window → document → … → parent → button
  TARGET   button (listeners on the clicked node)
  BUBBLE   button → parent → … → document → window
```

| Concept | One line |
|---|---|
| **Bubbling** | Event goes **up** after target (default for `addEventListener`) |
| **Capturing** | Event goes **down** before target (`{ capture: true }`) |
| **Delegation** | One parent listener + `target` / `closest` handles many children |
| **`stopPropagation`** | Stop travel to other nodes |
| **`preventDefault`** | Stop browser default action (not the same thing) |

---

## 1. What Happens When You Click An Element?

Suppose HTML:

```html
<div id="grandparent">
  <div id="parent">
    <button id="child">Click</button>
  </div>
</div>
```

When you click the button, the browser processes the event in phases.

Interview one-liner:

> DOM events travel through a path from window down to the target and back up. Capturing goes down, bubbling goes up. Event delegation uses bubbling to handle many elements with one listener.

---

## 2. Event Phases

There are 3 main phases:

```text
1) Capturing phase  (window -> ... -> target parent)
2) Target phase     (event arrives at clicked element)
3) Bubbling phase   (target -> ... -> window)
```

Visual:

```text
window
  ↓ capture
document
  ↓ capture
html
  ↓ capture
body
  ↓ capture
grandparent
  ↓ capture
parent
  ↓ capture
child   <── target
  ↑ bubble
parent
  ↑ bubble
grandparent
  ↑ bubble
body
...
window
```

---

## 3. Event Bubbling

By default, most event handlers listen in the **bubbling** phase.

After the target handles the event, it bubbles up to ancestors.

```js
document.getElementById('grandparent').addEventListener('click', () => {
  console.log('grandparent');
});

document.getElementById('parent').addEventListener('click', () => {
  console.log('parent');
});

document.getElementById('child').addEventListener('click', () => {
  console.log('child');
});
```

Click child output:

```text
child
parent
grandparent
```

Why? Target first, then bubble upward.

---

## 4. Event Capturing (Trickling)

Capturing goes from outer to inner **before** target/bubble.

Enable with third argument `true` (or `{ capture: true }`).

```js
grandparent.addEventListener('click', () => console.log('grandparent capture'), true);
parent.addEventListener('click', () => console.log('parent capture'), true);
child.addEventListener('click', () => console.log('child capture'), true);
```

Click child (only capture listeners):

```text
grandparent capture
parent capture
child capture
```

### Mixed example

```js
grandparent.addEventListener('click', () => console.log('gp bubble')); // bubble default
parent.addEventListener('click', () => console.log('parent capture'), true);
child.addEventListener('click', () => console.log('child bubble'));
```

Click child:

```text
parent capture
child bubble
gp bubble
```

---

## 5. `event.target` vs `event.currentTarget`

| Property | Meaning |
|---|---|
| `event.target` | actual element that originated the event |
| `event.currentTarget` | element whose listener is currently running |

```js
parent.addEventListener('click', (e) => {
  console.log('target:', e.target.id);
  console.log('current:', e.currentTarget.id);
});
```

Click child:

```text
target: child
current: parent
```

This is the key to event delegation.

---

## 6. `stopPropagation` And `stopImmediatePropagation`

### `stopPropagation()`

Stops event from moving to next elements in remaining phases.

```js
child.addEventListener('click', (e) => {
  e.stopPropagation();
  console.log('child');
});

parent.addEventListener('click', () => console.log('parent'));
```

Click child → only `child` (parent does not receive bubble).

### `stopImmediatePropagation()`

Stops propagation **and** prevents other listeners on the same element from running.

```js
child.addEventListener('click', (e) => {
  e.stopImmediatePropagation();
  console.log('first');
});

child.addEventListener('click', () => console.log('second'));
```

Output: only `first`.

---

## 7. `preventDefault()` (Different Thing)

Stops browser default action, not propagation.

```js
link.addEventListener('click', (e) => {
  e.preventDefault(); // do not navigate
});
```

Examples of default actions:

- clicking `<a>` navigates
- form submit reloads page
- checkbox toggles

You can combine:

```js
e.preventDefault();
e.stopPropagation();
```

---

## 8. Event Delegation (Most Asked)

### Problem

100 list items each with their own click listener = many listeners, harder cleanup, bad for dynamic items.

### Solution

Put **one listener on parent**, use bubbling + `event.target`.

```html
<ul id="list">
  <li data-id="1">Item 1</li>
  <li data-id="2">Item 2</li>
  <li data-id="3">Item 3</li>
</ul>
```

```js
document.getElementById('list').addEventListener('click', (e) => {
  const li = e.target.closest('li');
  if (!li || !e.currentTarget.contains(li)) return;

  console.log('Clicked item', li.dataset.id);
});
```

### Why this is powerful

- One listener handles many children
- Works for dynamically added children
- Better memory/performance
- Cleaner code

Interview one-liner:

> Event delegation attaches a single listener to a parent and uses bubbling to handle events from children via `event.target`.

---

## 9. Practical Delegation Example (Buttons)

```html
<div id="toolbar">
  <button data-action="save">Save</button>
  <button data-action="delete">Delete</button>
  <button data-action="share">Share</button>
</div>
```

```js
toolbar.addEventListener('click', (e) => {
  const button = e.target.closest('button[data-action]');
  if (!button) return;

  const action = button.dataset.action;

  if (action === 'save') console.log('Saving...');
  if (action === 'delete') console.log('Deleting...');
  if (action === 'share') console.log('Sharing...');
});
```

---

## 10. Events That Do Not Bubble (Know A Few)

Most bubble, but some don’t (or behave specially):

- `focus` / `blur` (do not bubble; use capture or `focusin`/`focusout`)
- `mouseenter` / `mouseleave` (do not bubble; `mouseover`/`mouseout` do)

Interview tip:

> Delegation needs bubbling (or capture). For focus-like cases, use `focusin` or capture phase.

---

## 11. addEventListener Options

```js
element.addEventListener('click', handler, {
  capture: true,  // listen in capture phase
  once: true,     // auto-remove after one call
  passive: true,  // promise not to preventDefault (better scroll/touch)
  signal: controller.signal, // AbortController removes listener
});
```

| Option | Interview point |
|---|---|
| `capture` | Run on the way **down** |
| `once` | Fire once then auto-remove |
| `passive: true` | Browser can scroll without waiting; **`preventDefault` is ignored / warned** — use for `touchstart` / `wheel` / scroll |
| `signal` | Modern cleanup without storing the handler fn |

```js
const ac = new AbortController();
el.addEventListener('click', onClick, { signal: ac.signal });
// later
ac.abort(); // removes listener
```

---

## 12. When capturing is actually useful

Most app code uses bubble. Capture shines when you need to run **before** the target:

| Use case | Why capture |
|---|---|
| Outside-click / “click away to close” | See event on `document` early; decide if target is inside modal |
| Analytics / logging all clicks | Run even if child later `stopPropagation`s (if you listen capture on ancestor **before** stop — note: stop in capture still blocks lower nodes) |
| Intercept before child cancels | Parent capture runs before child bubble handler |

```js
// Simplified outside-click
document.addEventListener('click', (e) => {
  if (!modal.contains(e.target)) closeModal();
}); // bubble on document is usually enough

// Capture example: stop everything from reaching a subtree (rare / nuclear)
window.addEventListener('click', (e) => e.stopPropagation(), true);
```

**Senior note:** Overusing `stopPropagation` breaks ancestor handlers (tooltips, analytics, React roots). Prefer checking `target` in the parent instead of stopping the world.

---

## 13. Target-phase nuance (tricky)

On the **target element itself**, both capture-registered and bubble-registered listeners can run.

Order on the same node: typically **capture listeners first, then bubble listeners** (registration order among same-phase listeners).

```js
el.addEventListener('click', () => console.log('bubble'), false);
el.addEventListener('click', () => console.log('capture'), true);
// Click el → often: capture, then bubble
```

`event.eventPhase`:

| Value | Phase |
|---|---|
| `Event.CAPTURING_PHASE` (1) | Capturing |
| `Event.AT_TARGET` (2) | At target |
| `Event.BUBBLING_PHASE` (3) | Bubbling |

---

## 14. Icon-in-button gotcha (delegation bug)

```html
<button class="delete-btn">
  <svg><!-- icon --></svg>
  Delete
</button>
```

```js
// ❌ Often wrong — target may be <svg> or <path>, not <button>
list.addEventListener('click', (e) => {
  if (e.target.classList.contains('delete-btn')) { … }
});

// ✅ Walk up to the actionable element
list.addEventListener('click', (e) => {
  const btn = e.target.closest('.delete-btn');
  if (!btn || !list.contains(btn)) return;
  …
});
```

Also guard with `currentTarget.contains(btn)` so a click that somehow matched outside doesn’t count.

---

## 15. Angular connection

Angular `(click)="save()"` attaches listeners for you — phases still matter:

```html
<div (click)="onParent()">
  <button (click)="onChild(); $event.stopPropagation()">Child</button>
</div>
```

| Pattern | Notes |
|---|---|
| `$event.stopPropagation()` | Same as native — parent won’t see bubble |
| `$event.preventDefault()` | Forms / links |
| `@HostListener('click', …)` | Component host listener |
| `@HostListener('document:click')` | Outside-click patterns |
| Huge `*ngFor` lists | Prefer one parent handler / delegation mindset over N bindings when perf matters |

Practice app: q8 file explorer uses `stopPropagation` on add/delete so the row click doesn’t also toggle open.

---

## 16. React connection (often asked)

React 17+ attaches listeners at the **root** (delegation under the hood).

| API | Phase |
|---|---|
| `onClick` | Bubble (React’s synthetic system) |
| `onClickCapture` | Capture |

**Trap:** `e.stopPropagation()` on a **React** synthetic event stops other React handlers; **native** listeners outside may still run (and the reverse). Mixing native `addEventListener` + React on the same tree is a common footgun.

---

## 17. Output prediction drills

### Drill A — mixed phases

```js
parent.addEventListener('click', () => console.log('parent bubble'));
parent.addEventListener('click', () => console.log('parent capture'), true);
child.addEventListener('click', () => console.log('child'));
```

Click child:

```text
parent capture
child
parent bubble
```

### Drill B — stop in capture

```js
parent.addEventListener('click', (e) => {
  e.stopPropagation();
  console.log('parent capture stop');
}, true);
child.addEventListener('click', () => console.log('child'));
```

Click child → only `parent capture stop` (never reaches child).

### Drill C — stopImmediate vs stop

```js
child.addEventListener('click', (e) => {
  e.stopImmediatePropagation();
  console.log('1');
});
child.addEventListener('click', () => console.log('2'));
parent.addEventListener('click', () => console.log('parent'));
```

→ only `1` (no `2`, no `parent`).

### Drill D — preventDefault alone

```js
child.addEventListener('click', (e) => {
  e.preventDefault();
  console.log('child');
});
parent.addEventListener('click', () => console.log('parent'));
```

→ `child` then `parent` (propagation still happens).

---

## 18. Mini implementation challenges

### Challenge 1 — table delete (delegation)

```js
table.addEventListener('click', (e) => {
  const btn = e.target.closest('.delete-btn');
  if (!btn || !table.contains(btn)) return;
  btn.closest('tr')?.remove();
});
```

### Challenge 2 — toolbar actions with `data-*`

```js
toolbar.addEventListener('click', (e) => {
  const btn = e.target.closest('[data-action]');
  if (!btn) return;
  const { action } = btn.dataset;
  actions[action]?.();
});
```

### Challenge 3 — once + AbortController cleanup

```js
function onFirstClick(el, fn) {
  const ac = new AbortController();
  el.addEventListener('click', (e) => {
    fn(e);
    ac.abort();
  }, { signal: ac.signal });
}
```

---

## 19. Tricky interview Q bank

**Q1. What are the three event phases?**  
> Capture (down), target, bubble (up).

**Q2. Default phase for `addEventListener`?**  
> Bubbling (`capture: false`).

**Q3. Bubbling vs capturing?**  
> Bubble = target → root. Capture = root → target. Same path, opposite direction.

**Q4. What is event delegation?**  
> One listener on a common ancestor; use bubbling + `target`/`closest` to handle many children — works for dynamic nodes, fewer listeners.

**Q5. `target` vs `currentTarget`?**  
> `target` = origin node. `currentTarget` = node whose listener is running (the delegated parent).

**Q6. `stopPropagation` vs `preventDefault`?**  
> Propagation = DOM travel. Default = browser action (navigate, submit). Independent.

**Q7. `stopImmediatePropagation`?**  
> Also blocks **other listeners on the same element**.

**Q8. Why doesn’t `focus` delegation work with bubble?**  
> `focus`/`blur` don’t bubble. Use `focusin`/`focusout` or capture.

**Q9. `mouseenter` vs `mouseover`?**  
> `mouseenter`/`mouseleave` don’t bubble; `mouseover`/`mouseout` do (and fire often on children).

**Q10. What is `{ passive: true }`?**  
> Tells the browser you won’t `preventDefault` — smoother scroll/touch. Calling `preventDefault` in a passive listener doesn’t work as expected.

**Q11. Why use `closest` in delegation?**  
> Click may hit a nested icon/text node; `closest` finds the actionable ancestor.

**Q12. Does `stopPropagation` in bubble stop capture listeners?**  
> Capture already ran on the way down. Stop in bubble only blocks further bubbling (and remaining path).

**Q13. Can you listen in both phases on one element?**  
> Yes — two `addEventListener` calls, one with `capture: true`.

**Q14. React `onClick` vs `onClickCapture`?**  
> Bubble vs capture in React’s system; React roots use delegation internally.

**Q15. When is capture preferred over bubble?**  
> Need to run before children (intercept), or some non-bubbling cases via capture.

**Q16. Memory win of delegation?**  
> O(1) listeners on parent vs O(n) on each row; critical for big lists / infinite scroll cells.

**Q17. `event.bubbles` / `cancelable`?**  
> Flags whether the event type bubbles and whether `preventDefault` can work.

**Q18. How do you remove a listener cleanly today?**  
> Same function reference + `removeEventListener`, or `{ signal: AbortSignal }`, or `{ once: true }`.

**Q19. Child calls `stopPropagation` — does parent capture still run?**  
> Parent **capture** already ran before the child. Parent **bubble** will not run.

**Q20. Difference between delegation and just putting handlers on each child?**  
> Delegation scales, survives DOM add/remove, centralizes logic; per-child needs rebinding and more memory.

---

## 20. Spoken answers

### 60s — full topic

> When an event occurs, it goes through capturing from the outside in, reaches the target, then bubbles back out. By default listeners run in the bubbling phase. Event delegation uses that bubbling behavior by placing one listener on a parent and checking `event.target` or `closest` to decide which child was interacted with. This is efficient and works well for dynamic lists. `stopPropagation` stops the event from traveling further, while `preventDefault` blocks the browser’s default action.

### 30s — delegation only

> I’d attach one listener on a common parent, let clicks bubble, then use `closest` to find the row or button. That way new items work without rebinding, and I avoid hundreds of listeners.

### 20s — stopPropagation vs preventDefault

> stopPropagation stops DOM propagation. preventDefault stops the browser default. They solve different problems and are often confused.

---

## 21. Cheat sheet

```text
capture: window -> target
target:  clicked element
bubble:  target -> window

default listeners = bubble phase
capture listeners = addEventListener(..., true) or { capture: true }

target        = who originated
currentTarget = who listens (delegation parent)
closest()     = find actionable ancestor (icon-in-button)

delegation = parent listener + target/closest
stopPropagation          = stop travel to other nodes
stopImmediatePropagation = + block same-element listeners
preventDefault           = stop browser default

passive: true  → scroll/touch perf (no preventDefault)
focus/blur     → don’t bubble → use focusin/focusout
mouseenter     → don’t bubble → mouseover does

Angular: (click) + $event.stopPropagation()
React:   onClick / onClickCapture (root delegation)
```

---

## 22. Practice checklist

- [ ] Draw capture/target/bubble path  
- [ ] Predict mixed capture/bubble output (Drill A–D)  
- [ ] Explain target vs currentTarget  
- [ ] Write delegation with `closest` from memory  
- [ ] Explain stopPropagation vs preventDefault vs stopImmediate  
- [ ] Name 2 non-bubbling events + fixes  
- [ ] Explain `{ passive: true }`  
- [ ] One Angular + one React sentence  

---

## Related

| Topic | File |
|---|---|
| Custom EventEmitter (JS) | [EVENT_EMITTER.md](./EVENT_EMITTER.md) |
| Event loop (async timing ≠ DOM phases) | [EVENT_LOOP.md](./EVENT_LOOP.md) |
| File explorer `stopPropagation` practice | `prevonir-interview-practice` `/q8` |
