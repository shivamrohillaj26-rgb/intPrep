# `pipe()` & `compose()` — Interview Ready Guide

Functional helpers that combine functions. Often asked next to debounce / memoize.

**Not the same as** RxJS `observable.pipe(map, filter)` — that is operator composition on streams. This guide is plain JS function composition.

---

## 1. The interview question

> Implement `pipe` and `compose`. What’s the difference?

---

## 2. One-liner

> `pipe(f, g, h)(x)` runs **left → right**: `h(g(f(x)))`.  
> `compose(f, g, h)(x)` runs **right → left**: `f(g(h(x)))`.  
> Same idea; opposite order.

---

## 3. Why it matters

```js
const trim = (s) => s.trim();
const lower = (s) => s.toLowerCase();
const exclaim = (s) => s + '!';

// Without compose/pipe — nested, hard to read
exclaim(lower(trim('  Hi  '))); // "hi!"

// With pipe — data flows top to bottom
pipe(trim, lower, exclaim)('  Hi  '); // "hi!"
```

Frontend uses: transform pipelines, Redux-style enhancers, small util chains.

---

## 4. Implementation

```js
function pipe(...fns) {
  return function (initial) {
    return fns.reduce((value, fn) => fn(value), initial);
  };
}

function compose(...fns) {
  return function (initial) {
    return fns.reduceRight((value, fn) => fn(value), initial);
  };
  // or: return pipe(...fns.reverse()); // careful: mutates if you reverse in place
}
```

Safer compose without mutating:

```js
function compose(...fns) {
  return pipe(...fns.slice().reverse());
}
```

---

## 5. Dry run

```js
const add1 = (n) => n + 1;
const double = (n) => n * 2;

pipe(add1, double)(3);    // double(add1(3)) = double(4) = 8
compose(add1, double)(3); // add1(double(3)) = add1(6) = 7
```

| Call | Order | Result for `3` |
|---|---|---|
| `pipe(add1, double)` | +1 then ×2 | `8` |
| `compose(add1, double)` | ×2 then +1 | `7` |

---

## 6. Edge cases

```js
pipe()(42);     // 42 — identity (reduce on [] returns initial)
compose()(42);  // 42

// Async? Classic interview pipe is sync. For Promises:
async function pipeAsync(...fns) {
  return async (initial) => {
    let value = initial;
    for (const fn of fns) value = await fn(value);
    return value;
  };
}
```

---

## 7. vs RxJS `.pipe`

| | FP `pipe` | RxJS `.pipe` |
|---|---|---|
| Input | value | Observable |
| Fns | `a → b` | operators `(source) => Observable` |
| Example | `pipe(trim, lower)` | `obs.pipe(map, filter, debounceTime)` |

Say:

> Same word, different domain. FP pipe composes unary functions; RxJS pipe composes operators on a stream.

---

## 8. Common Q&A

**Q: Why reduce?**  
A: Fold the list of functions over the value left-to-right.

**Q: Unary only?**  
A: Classic interview versions assume one arg. Multi-arg → curry first args or pass a context object.

**Q: pipe vs compose which to use?**  
A: Prefer `pipe` for readability (same order as reading). `compose` is math/legacy Redux style.

---

## 9. Spoken (30s)

> `pipe` and `compose` both combine functions into one. `pipe(f,g,h)(x)` applies f then g then h — left to right — usually with `reduce`. `compose` is the reverse order. I use them for small transform pipelines. This is different from RxJS `.pipe`, which chains Observable operators.

---

## 10. Practice checklist

- [ ] Write `pipe` / `compose` from memory  
- [ ] Dry-run add1/double both ways  
- [ ] Contrast with RxJS `.pipe`  
- [ ] Mention empty-args identity behavior  
