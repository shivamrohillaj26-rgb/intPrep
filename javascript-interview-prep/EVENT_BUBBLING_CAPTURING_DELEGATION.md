# Event Bubbling, Capturing & Delegation — Interview Ready Guide

Critical for frontend interviews (DOM + Angular/React mental models).

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
  passive: true   // cannot preventDefault (better scroll perf)
});
```

---

## 12. Angular Connection

Angular event bindings like `(click)="save()"` attach listeners for you.

But concepts still matter:

- understanding click on child vs parent
- `$event.stopPropagation()` in templates
- delegation patterns in custom directives
- performance with many DOM nodes

Example mental model:

```html
<div (click)="onParent()">
  <button (click)="onChild(); $event.stopPropagation()">Child</button>
</div>
```

---

## 13. Interview Output Question

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

---

## 14. Common Interview Questions

**Q: What is event bubbling?**  
A: Event moves from target element up through ancestors after target phase.

**Q: What is capturing?**  
A: Event moves from outer ancestors down to the target before bubbling.

**Q: What is event delegation?**  
A: Handling child events on a parent using bubbling and `event.target`.

**Q: target vs currentTarget?**  
A: target = origin element; currentTarget = element with active listener.

**Q: stopPropagation vs preventDefault?**  
A: stopPropagation stops travel through DOM; preventDefault stops browser default action.

**Q: Why use delegation?**  
A: Fewer listeners, works with dynamic elements, better performance.

---

## 15. Mini Implementation Challenge

“Handle clicks on all delete buttons inside a table with one listener.”

```js
table.addEventListener('click', (e) => {
  const btn = e.target.closest('.delete-btn');
  if (!btn) return;

  const row = btn.closest('tr');
  row?.remove();
});
```

Explain:

- listener on table
- click bubbles from button
- `closest` finds button/row even if icon inside button was clicked

---

## 16. Spoken Answer (60 sec)

> When an event occurs, it goes through capturing from the outside in, reaches the target, then bubbles back out. By default listeners run in the bubbling phase. Event delegation uses that bubbling behavior by placing one listener on a parent and checking `event.target` or `closest` to decide which child was interacted with. This is efficient and works well for dynamic lists. `stopPropagation` stops the event from traveling further, while `preventDefault` blocks the browser’s default action.

---

## 17. Cheat Sheet

```text
capture: window -> target
target:  clicked element
bubble:  target -> window

default listeners = bubble phase
capture listeners = addEventListener(..., true)

target = who clicked
currentTarget = who listens

delegation = parent listener + target/closest
stopPropagation = stop travel
preventDefault = stop browser default
```

---

## 18. Practice Checklist

- [ ] Draw capture/target/bubble path
- [ ] Predict mixed capture/bubble output
- [ ] Explain target vs currentTarget
- [ ] Write one delegation example from memory
- [ ] Explain stopPropagation vs preventDefault
