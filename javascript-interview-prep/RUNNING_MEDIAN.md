# Running Median (Two Heaps) — Interview Ready

**Problem:** Stream of integers arrives one-by-one. After each number, return the **median** of all numbers seen so far.

Hint they give: **two heaps**.

---

## 1. Example

```text
stream: 5, 15, 1, 3

after 5  → median 5
after 15 → median (5+15)/2 = 10
after 1  → median 5
after 3  → median (3+5)/2 = 4
```

Clarify: for even count, return average of two middle values (float OK) or lower/upper middle — **ask**.

---

## 2. One-liner

> Keep a max-heap of the lower half and a min-heap of the upper half, balanced so sizes differ by at most 1. Median is the top of the larger heap, or average of both tops when equal size.

---

## 3. Intuition

Sorted stream so far:

```text
[ lower half | upper half ]
       ↑ max     ↑ min
```

- Everything in lower ≤ everything in upper  
- Max of lower and min of upper are the two candidates for the middle  

| Count | Median |
|---|---|
| Odd | Top of the heap that has one extra element |
| Even | Average of both tops |

---

## 4. JS heaps (interview-simple)

JS has no built-in heap. Use a small binary-heap class, or say “I’d use a library / implement binary heap.” Interviewers accept a compact heap:

```js
class Heap {
  constructor(compare) {
    this.data = [];
    this.compare = compare; // (a,b) => true if a should be above b
  }
  get size() {
    return this.data.length;
  }
  peek() {
    return this.data[0];
  }
  push(val) {
    this.data.push(val);
    this.#up(this.data.length - 1);
  }
  pop() {
    const { data } = this;
    if (data.length === 0) return undefined;
    const top = data[0];
    const last = data.pop();
    if (data.length) {
      data[0] = last;
      this.#down(0);
    }
    return top;
  }
  #up(i) {
    const { data, compare } = this;
    while (i > 0) {
      const p = (i - 1) >> 1;
      if (!compare(data[i], data[p])) break;
      [data[i], data[p]] = [data[p], data[i]];
      i = p;
    }
  }
  #down(i) {
    const { data, compare } = this;
    const n = data.length;
    while (true) {
      let best = i;
      const l = i * 2 + 1;
      const r = l + 1;
      if (l < n && compare(data[l], data[best])) best = l;
      if (r < n && compare(data[r], data[best])) best = r;
      if (best === i) break;
      [data[i], data[best]] = [data[best], data[i]];
      i = best;
    }
  }
}
```

Max-heap: `compare = (a, b) => a > b`  
Min-heap: `compare = (a, b) => a < b`

---

## 5. Full solution

```js
class MedianFinder {
  constructor() {
    // lower half — max heap
    this.low = new Heap((a, b) => a > b);
    // upper half — min heap
    this.high = new Heap((a, b) => a < b);
  }

  addNum(num) {
    // 1) push to low, then move max to high (ensures ordering)
    this.low.push(num);
    this.high.push(this.low.pop());

    // 2) rebalance: low can be larger by 1; never let high be bigger
    if (this.high.size > this.low.size) {
      this.low.push(this.high.pop());
    }
  }

  findMedian() {
    if (this.low.size > this.high.size) {
      return this.low.peek();
    }
    return (this.low.peek() + this.high.peek()) / 2;
  }
}

// demo
const mf = new MedianFinder();
for (const x of [5, 15, 1, 3]) {
  mf.addNum(x);
  console.log(mf.findMedian());
}
// 5, 10, 5, 4
```

### Why that insert order?

1. Always push new number through `low` then move `low`’s max into `high` → new value ends up on the correct side after rebalance.  
2. If `high` has more elements, move its min back to `low`.  
3. Invariant: `low.size === high.size` or `low.size === high.size + 1`.

Alternative story: if `num <= low.peek()` go left else right, then rebalance sizes — same idea, more branches.

---

## 6. Complexity

| Op | Time |
|---|---|
| `addNum` | O(log n) heap ops |
| `findMedian` | O(1) |
| Space | O(n) |

Naive: keep sorted array → insert O(n). Two heaps win for streams.

---

## 7. Edge cases

| Case | Handle |
|---|---|
| First element | Only `low` has it |
| Negatives / duplicates | Heaps fine |
| Even vs odd average | Clarify float vs int truncation |
| Empty findMedian | Throw or undefined — ask |

---

## 8. Spoken answers

### 30s

> Two heaps: max-heap for the lower half, min-heap for the upper. I keep them balanced. Median is the max of the lower half when odd count, or the average of both tops when even. Each insert is log n.

### 60s

> If I sorted on every insert that’s O(n) per add. With two heaps I always know the middle candidates at the tops. I insert so every value in the max-heap is ≤ every value in the min-heap, and sizes differ by at most one. JavaScript doesn’t ship a heap, so I implement a small binary heap or say I’d use a library in production.

---

## 9. Practice checklist

- [ ] Explain lower/upper half picture  
- [ ] Implement Heap + MedianFinder  
- [ ] Trace [5,15,1,3]  
- [ ] State O(log n) add / O(1) query  

---

## Related

| Topic | File |
|---|---|
| LRU (another “design DS” ask) | [LRU_CACHE.md](./LRU_CACHE.md) |
| Frontend DSA index | [DSA_FRONTEND_JS.md](./DSA_FRONTEND_JS.md) |
