# Debounce & Throttle — Interview Ready Guide

These are among the most asked frontend implementation questions.

---

## 1. Why Debounce And Throttle Exist

Browser events can fire very frequently:

- typing in search box
- window resize
- scroll
- mouse move

If you call an expensive function every time (API call, heavy compute), app becomes slow.

Debounce and throttle control **how often** a function runs.

---

## 2. Debounce vs Throttle (Clear Difference)

### Debounce

> Wait until events **stop** for X ms, then run once.

Example: user typing `angular` quickly → only final query triggers search API.

### Throttle

> Run at most once every X ms while events keep happening.

Example: on scroll, update UI at most every 200 ms.

| | Debounce | Throttle |
|---|---|---|
| Mental model | “run after pause” | “run at steady intervals” |
| Typing search | Best | Less ideal |
| Scroll progress | Possible | Best |
| Resize cleanup | Best | Also used |
| Guarantee during continuous events | Runs at end | Runs periodically |

Interview one-liner:

> Debounce delays execution until quiet time. Throttle limits execution frequency during continuous activity.

---

## 3. Debounce — Deep Explanation

### Behavior

Every call resets the timer.

Only the last call in a burst survives.

```text
calls:  a  a  a  a         a
timer:  |--| reset reset   |----| fire
```

### Interview Implementation (Minimal)

```js
function debounce(fn, delay) {
  let timerId;

  return function (...args) {
    clearTimeout(timerId);

    timerId = setTimeout(() => {
      fn.apply(this, args);
    }, delay);
  };
}
```

### Why this works

1. Keep one `timerId` in closure
2. On each call, clear old timer
3. Start new timer
4. If no new call arrives before delay, run function
5. `apply(this, args)` preserves context and arguments

### Example: Search Box

```js
const searchAPI = debounce((query) => {
  console.log('API call:', query);
}, 300);

searchAPI('a');
searchAPI('an');
searchAPI('ang');
searchAPI('angular');
// only one call: API call: angular
```

HTML-style usage:

```js
input.addEventListener('input', (e) => {
  searchAPI(e.target.value);
});
```

### Interview-ready enhanced version (optional)

```js
function debounce(fn, delay) {
  let timerId;

  function debounced(...args) {
    clearTimeout(timerId);
    timerId = setTimeout(() => {
      fn.apply(this, args);
    }, delay);
  }

  debounced.cancel = function () {
    clearTimeout(timerId);
  };

  return debounced;
}
```

---

## 4. Throttle — Deep Explanation

### Behavior

Ignore calls that happen too soon after a successful run.

```text
events: *********
run:    *    *    *
        |200ms|200ms|
```

### Interview Implementation (Trailing-simple / leading style)

Common interview version: leading throttle with timestamp.

```js
function throttle(fn, delay) {
  let last = 0;

  return function (...args) {
    const now = Date.now();

    if (now - last >= delay) {
      last = now;
      fn.apply(this, args);
    }
  };
}
```

### Example: Scroll

```js
const onScroll = throttle(() => {
  console.log('scroll handler', window.scrollY);
}, 200);

window.addEventListener('scroll', onScroll);
```

### Timer-based throttle variant

```js
function throttle(fn, delay) {
  let waiting = false;

  return function (...args) {
    if (waiting) return;

    fn.apply(this, args);
    waiting = true;

    setTimeout(() => {
      waiting = false;
    }, delay);
  };
}
```

This runs immediately, then blocks for `delay`.

---

## 5. Visual Comparison Example

Suppose events fire at times: 0, 100, 200, 300, 400 ms  
Delay = 300 ms

### Debounce

Runs once after last event + 300ms  
(around t = 700)

### Throttle (leading timestamp)

May run at t=0 and t=300 (depending exact implementation)

Use this comparison verbally in interviews.

---

## 6. Where To Use What

### Use Debounce for

- Search autocomplete
- Form validation while typing
- Window resize recalculation after user stops
- Autosave after inactivity

### Use Throttle for

- Scroll position tracking
- Button spam prevention (or disable button)
- Mouse move / drag handlers
- Game/input sampling
- Infinite scroll check (sometimes)

---

## 7. Autosave Combo Example (Interview Gold)

Requirement: save after 5 seconds of inactivity.

```js
const saveDraft = debounce((text) => {
  console.log('Saving:', text);
}, 5000);

editor.addEventListener('input', (e) => {
  saveDraft(e.target.value);
});
```

This is pure debounce and is usually the right answer.

---

## 8. Angular / RxJS Version (Mention In Angular Interviews)

```ts
this.searchControl.valueChanges.pipe(
  debounceTime(300),
  distinctUntilChanged(),
  switchMap((q) => this.api.search(q))
).subscribe((res) => this.results = res);
```

Throttle equivalent:

```ts
fromEvent(window, 'scroll').pipe(
  throttleTime(200)
).subscribe(...)
```

But still be ready to write plain JS debounce/throttle by hand.

---

## 9. Edge Cases Interviewers Ask

1. Preserve `this`
2. Preserve arguments
3. Cancel option
4. Leading vs trailing behavior
5. Immediate first call? (leading debounce variant)

### Leading debounce (optional advanced)

Runs immediately first, then ignores until pause:

```js
function debounceLeading(fn, delay) {
  let timerId;

  return function (...args) {
    const isFree = !timerId;

    clearTimeout(timerId);
    timerId = setTimeout(() => {
      timerId = null;
    }, delay);

    if (isFree) fn.apply(this, args);
  };
}
```

Know conceptually; implement classic trailing debounce first.

---

## 10. Complexity

Both debounce and throttle:

- Time per call: `O(1)`
- Extra space: `O(1)` (one timer / one timestamp)

---

## 11. Full Interview Script (What To Say)

> Debounce and throttle both control expensive event handlers. Debounce waits for a quiet period and is ideal for search typing. Throttle ensures a function runs at most once per interval and is ideal for scroll. For debounce I keep a timeout in a closure, clear it on every call, and schedule a new one. For throttle I track last run time and execute only if enough delay has passed.

---

## 12. Practice Implementations (Do From Memory)

### Debounce

```js
function debounce(fn, delay) {
  let timerId;
  return function (...args) {
    clearTimeout(timerId);
    timerId = setTimeout(() => fn.apply(this, args), delay);
  };
}
```

### Throttle

```js
function throttle(fn, delay) {
  let last = 0;
  return function (...args) {
    const now = Date.now();
    if (now - last >= delay) {
      last = now;
      fn.apply(this, args);
    }
  };
}
```

---

## 13. Quick Output Mentality Question

```js
const d = debounce(() => console.log('ran'), 100);
d();
d();
d();
```

How many times does it log?  
**Once** (after quiet period)

```js
const t = throttle(() => console.log('ran'), 100);
t();
t();
t();
```

How many?  
**Once immediately** (for leading throttle), later calls ignored until delay passes.

---

## 14. Cheat Sheet

```text
Debounce = run after pause
Throttle = run at most once per interval

Search typing -> debounce
Scroll/mousemove -> throttle

Closure stores timer/lastExecuted
Use apply(this, args)
```

---

## 15. Practice Checklist

- [ ] Write debounce in < 2 minutes
- [ ] Write throttle in < 2 minutes
- [ ] Explain one real UI example for each
- [ ] Mention preserve this/args
- [ ] Mention RxJS debounceTime/throttleTime for Angular
