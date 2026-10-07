# Frontend-Focused JavaScript DSA — Interview Ready Guide

This guide is tuned for **frontend / JS coding rounds**, not backend-heavy algorithm grind.

It combines:

- Problems from your `js-coding-interview.md` reference
- High-frequency patterns from frontend interview reports (arrays/strings/Map/Set, sliding window, stack, recursion/flatten, trees BFS/DFS basics, intervals, LRU, simple DP)
- Clean interview format: **problem first** → examples → edge cases → intuition → walkthrough → code → complexity → what to say

Cross-links to deeper utility guides in this folder:

- Debounce/Throttle → `DEBOUNCE_THROTTLE.md`
- Deep Clone → `DEEP_CLONE.md`
- LRU → `LRU_CACHE.md`
- WeakMap/WeakSet → `WEAKMAP_WEAKSET.md`
- Polyfills (map/filter/reduce/Promise) → `POLYFILLS_README.md`
- EventEmitter → `EVENT_EMITTER.md`
- Extra coding-round set (product except self, 3Sum **O(1) extra**, LIS…) → `DSA_CODING_ROUND_CLASSICS.md`

---

## 0. What Frontend DSA Actually Tests

Interviewers usually care about:

| Prioritize | Know lightly | Skip unless asked |
|---|---|---|
| Arrays, strings, Map/Set | Binary search | Segment trees |
| Sliding window / two pointers | Simple DP (stairs, house robber) | Max-flow |
| Stack / queue | Intervals merge | Advanced graphs |
| Recursion + flatten | Tree DFS/BFS basics | Red-black trees |
| Sorting comparators / groupBy | Top K / heap mention | Fenwick |
| LRU / caching thinking | Graph islands (sometimes) | Competitive math |

Frontend tie-ins:

- Transform API data for UI
- Deduplicate / group / sort lists
- Search/filter text
- Cache expensive computed values
- Traverse nested JSON/menus/comments

**Interview flow to always use:**

1. Restate the problem in your own words (input → output)  
2. Give 1–2 examples + list edge cases  
3. Brute force idea + complexity  
4. Optimized pattern + why  
5. Code  
6. Trace one example  
7. Complexity + follow-ups  

---

## Pattern Cheat Map

| Pattern | Signature problems | Frontend use |
|---|---|---|
| Hash Map | Two Sum, anagram, frequency | lookups, indexes, counts |
| Sliding window | Longest unique substring | search, uniqueness windows |
| Stack | Valid parentheses | nested UI/token matching |
| Two pointers | Palindrome, **Two Sum sorted, 3Sum, container, move zeros** | string cleanup, **O(1) space follow-ups** |
| Recursion / stack | Flatten nested array / object | nested JSON/menus, form/API shaping |
| Intervals | Merge intervals | calendar/schedule UI |
| BFS | Level order tree | tree-like UI levels |
| Greedy/DP | Kadane, House Robber | optimization basics |
| Design | LRU | browser/app caches |
| Utilities | debounce, deepClone, groupBy | daily FE engineering |

---

# PART A — Core Algorithm Problems

---

## 1. Two Sum (Map)

### Problem

Given an array of numbers `nums` and a `target`, return **indices of two numbers** that add up to `target`.

- Each input has exactly one solution (classic version)
- You may not use the same element twice
- Return any order of the two indices is usually fine; prefer `[earlier, later]`

### Examples

```text
Input:  nums = [2, 7, 11, 15], target = 9
Output: [0, 1]
Why:    2 + 7 = 9

Input:  nums = [3, 2, 4], target = 6
Output: [1, 2]
Why:    2 + 4 = 6
```

### Edge cases

- Negative numbers
- Duplicates (e.g. `[3,3], target = 6`)
- No answer → return `[]` if interviewer allows

### Intuition

For each number `x`, ask: have I already seen `target - x`?  
Store past values in a Map for O(1) lookup.

### Walkthrough

`nums = [2,7,11,15]`, `target = 9`

| i | x | need | map | action |
|---|---|---|---|---|
| 0 | 2 | 7 | {} | store 2→0 |
| 1 | 7 | 2 | {2:0} | found → `[0,1]` |

### Code

```js
function twoSum(nums, target) {
  const seen = new Map(); // value -> index

  for (let i = 0; i < nums.length; i++) {
    const need = target - nums[i];
    if (seen.has(need)) return [seen.get(need), i];
    seen.set(nums[i], i);
  }

  return [];
}
```

**Time `O(n)`**, **Space `O(n)`**

**Say:** “Complement lookup with a Map — one pass.”

### If the array is **not** sorted — what do you do?

**Two pointers only work on a sorted array.** Unsorted `[3, 2, 4]`, target `6`: ends are `3` and `4` (sum 7), you have no rule for which pointer to move.

| Need | Unsorted Two Sum |
|---|---|
| **Indices**, one pair, fast | **Map** — this is the default. O(n) time, O(n) space |
| **O(1) extra space**, they allow O(n²) | Nested loops. No Map. |
| **Values only** (not original indices), O(1) extra | **Sort first** (destroys index order), then two pointers. O(n log n) + O(n) |
| Original indices **and** sort | Sort `{value, index}` pairs — that’s **O(n) extra** anyway, so Map is simpler |

```js
// unsorted + O(1) extra space (slow)
function twoSumBrute(nums, target) {
  for (let i = 0; i < nums.length; i++) {
    for (let j = i + 1; j < nums.length; j++) {
      if (nums[i] + nums[j] === target) return [i, j];
    }
  }
  return [];
}
```

**Spoken 20s:**

> If it’s unsorted and they want **indices**, I use a **Map** — I can’t two-pointer yet. If they forbid extra space, I do **O(n²)** nested loops, or I **sort** and two-pointer **only if** we return values, not original indexes. That’s why 3Sum sorts: we return the numbers, not indexes.

**Why 3Sum can sort:** output is the triplet **values**. Two Sum classic output is **indexes** — sorting without storing indexes would be wrong.

### Follow-up they **will** ask: **already sorted** array, **O(1) extra space**

If the array is **already sorted** (Two Sum II), drop the Map. Two pointers:

```js
function twoSumSorted(nums, target) {
  let l = 0;
  let r = nums.length - 1;
  while (l < r) {
    const sum = nums[l] + nums[r];
    if (sum === target) return [l, r];
    if (sum < target) l++;
    else r--;
  }
  return [];
}
```

**Time `O(n)`**, **Space `O(1)` extra.** This is the inner loop of **3Sum**.

### Follow-up: all pairs


```js
function twoSumAllPairs(nums, target) {
  const out = [];
  const indices = new Map();

  for (let i = 0; i < nums.length; i++) {
    const need = target - nums[i];
    if (indices.has(need)) {
      for (const j of indices.get(need)) out.push([j, i]);
    }
    if (!indices.has(nums[i])) indices.set(nums[i], []);
    indices.get(nums[i]).push(i);
  }

  return out;
}
```

---

## 1b. 3Sum (GOC stuck here) — Map vs **O(1) extra space**

**LeetCode 15.** They often say “threesome” / “triplets that sum to zero.”

### Problem

Given `nums` (ints, can be negative / duplicates), return **all unique triplets** `[a,b,c]` such that `a + b + c === 0`. Same index cannot be reused. Order of triplets doesn’t matter; **duplicate triplets are not allowed**.

```text
[-1, 0, 1, 2, -1, -4]  →  [[-1,-1,2], [-1,0,1]]
```

### What you gave (valid, but **O(n) extra space**)

Fix `i`, then Two Sum on the rest with a **Set / Map**. Time **O(n²)**. Extra space **O(n)** for the set, plus often another Set of string keys to unique the triplets.

```js
function threeSumHash(nums) {
  const n = nums.length;
  const uniq = new Set();

  for (let i = 0; i < n; i++) {
    const seen = new Set();
    for (let j = i + 1; j < n; j++) {
      const need = -nums[i] - nums[j];
      if (seen.has(need)) {
        const t = [nums[i], nums[j], need].sort((a, b) => a - b);
        uniq.add(t.join(','));
      }
      seen.add(nums[j]);
    }
  }

  return [...uniq].map((s) => s.split(',').map(Number));
}
```

**Say if they ask space:** “The inner `seen` Set is O(n). That’s the Map Two Sum. You wanted no hash.”

### What they wanted — sort + two pointers (**O(n²) time, O(1) extra**)

Same idea as Two Sum **on a sorted array**: no Map.

1. **Sort** in place (`(a,b) => a-b` — JS default sort is **lexicographic**, `[10,2]` becomes wrong).  
2. Fix `i`. Need `nums[l] + nums[r] === -nums[i]`.  
3. `l = i+1`, `r = n-1`. Sum too small → `l++`. Too big → `r--`. Hit → record, then **skip duplicates** on `l` and `r`.  
4. Skip duplicate **anchors** (`nums[i] === nums[i-1]`). Compare **backwards** — `=== nums[i+1]` and `continue` **drops** `[-1,-1,2]`.

```js
function threeSum(nums) {
  nums.sort((a, b) => a - b);
  const res = [];
  const n = nums.length;

  for (let i = 0; i < n - 2; i++) {
    if (nums[i] > 0) break; // rest are ≥ i, cannot sum to 0
    if (i > 0 && nums[i] === nums[i - 1]) continue;

    let l = i + 1;
    let r = n - 1;
    while (l < r) {
      const sum = nums[i] + nums[l] + nums[r];
      if (sum === 0) {
        res.push([nums[i], nums[l], nums[r]]);
        while (l < r && nums[l] === nums[l + 1]) l++;
        while (l < r && nums[r] === nums[r - 1]) r--;
        l++;
        r--;
      } else if (sum < 0) l++;
      else r--;
    }
  }
  return res;
}
```

**Time:** O(n²) — sort O(n log n) dominated by nested scan.  
**Space they want:** **O(1) extra** besides the **output** array.  
**Honest JS:** `Array.sort` uses scratch memory (Timsort ~O(n)). In interviews, “O(1) extra” means **no HashMap / no result-dedup Set**. Output of size k doesn’t count.

**Drill until cold:** write it twice from memory. Skip-duplicates is where people fail.

Same pattern: **3Sum closest**, **3Sum smaller**, **4Sum** (fix two, then two pointers).

Full short copy also in [DSA_CODING_ROUND_CLASSICS.md](./DSA_CODING_ROUND_CLASSICS.md) §9.

---

## 2. Longest Substring Without Repeating Characters

### Problem

Given a string `s`, return the **length of the longest substring** that contains **no repeating characters**.

A substring is a contiguous sequence of characters.

### Examples

```text
Input:  "abcabcbb"
Output: 3
Why:    "abc"

Input:  "bbbbb"
Output: 1
Why:    "b"

Input:  "pwwkew"
Output: 3
Why:    "wke"
```

### Edge cases

- Empty string → `0`
- All unique → `s.length`
- All same character → `1`

### Intuition

Sliding window `[start, end]` always unique chars.  
Expand `end`. On duplicate inside window, jump `start` past previous occurrence.

### Walkthrough

`s = "abcba"` → best length `3` (`"abc"` / `"cba"`)

### Code

```js
function lengthOfLongestSubstring(s) {
  const last = new Map();
  let start = 0;
  let best = 0;

  for (let end = 0; end < s.length; end++) {
    const ch = s[end];
    if (last.has(ch) && last.get(ch) >= start) {
      start = last.get(ch) + 1;
    }
    last.set(ch, end);
    best = Math.max(best, end - start + 1);
  }

  return best;
}
```

**Time `O(n)`**, **Space `O(alphabet)`**

**Say:** “`end` expands, `start` jumps past duplicates inside the window.”

---

## 3. Valid Parentheses (Stack)

### Problem

Given a string containing only `()[]{}`, decide if it is **valid**:

1. Open brackets must be closed by the **same type**
2. Open brackets must be closed in the **correct order**
3. Every close bracket has a matching open bracket

Return `true` / `false`.

### Examples

```text
Input:  "()"        Output: true
Input:  "()[]{}"    Output: true
Input:  "(]"        Output: false
Input:  "([{}])"    Output: true
Input:  "((("       Output: false
```

### Edge cases

- Empty string → usually `true`
- Starts with closer → `false`
- Extra openers left at end → `false`

### Intuition

Closers must match the most recent opener → LIFO stack.

### Code

```js
function isValid(s) {
  const stack = [];
  const pair = { ')': '(', ']': '[', '}': '{' };

  for (const ch of s) {
    if ('([{'.includes(ch)) stack.push(ch);
    else if (stack.pop() !== pair[ch]) return false;
  }

  return stack.length === 0;
}
```

**Time `O(n)`**, **Space `O(n)`**

---

## 4. Merge Intervals

### Problem

You get time ranges `[start, end]`. Some overlap. Return the **smallest list of ranges** that cover the same time, with overlaps **fused**.

Usually **touching counts as overlap**: `[1,2]` and `[2,3]` → `[1,3]` (calendar: one busy block).

Frontend: calendar busy slots, booking, “merge selected date ranges.”

---

### What “overlap” looks like (number line)

Each interval is a segment. Merge = glue segments that share any point.

```text
[1,3]   1--------3
[2,6]        2-----------6
            they share 2–3  →  one bar  1----------------6
```

```text
NO overlap

[1,3]   1--------3
[8,10]                 8------10
            gap 3→8  →  keep TWO bars
```

```text
TOUCHING (usually merge)

[1,4]   1-----------4
[4,5]               4--5
            same point 4  →  1--------------5
```

```text
NESTED (fully inside)

[1,10]  1----------------------10
[3,5]         3----5
            inside  →  still just  1----------------------10
            (end stays 10, not 5)
```

**Rule in one line:** two sorted-by-start intervals `[a,b]` then `[c,d]` overlap if **`c <= b`**. Then the merge is `[a, max(b,d)]`.

```text
         a--------b
              c-----------d     c <= b  → overlap
         a----------------d     new end = max(b,d)

         a--------b
                    c----d      c > b   → gap, start a NEW interval
```

---

### Why sort first (the whole trick)

If you don’t sort, a later interval can sit **between** two you already “finished”:

```text
UNSORTED input:  [8,10] then [1,3] then [2,6]

If you scan left-to-right as given:
  take [8,10]
  [1,3] does NOT overlap 8–10   → you’d keep both
  [2,6] overlaps [1,3] but you already walked past…

You miss that 1–3 and 2–6 are one block.

SORTED by START:
  [1,3] [2,6] [8,10]
  now overlap can ONLY happen with the **last bar you emitted**.
  That’s why the algorithm is so short.
```

```text
After sort by start:

  time →
  1    2    3    4    5    6    7    8    9   10        15   18
  |----[1,3]----|
       |--------[2,6]--------|
                                |----[8,10]----|
                                                    |--[15,18]--|
```

---

### Walkthrough (draw this in the interview)

Input: `[[1,3],[2,6],[8,10],[15,18]]`  
Already sorted by start.

**Seed `out` with a copy of the first interval** so we always have a “current blob” to extend.

```text
out = [ [1,3] ]

Step i=1  next = [2,6]
  last = [1,3]
  2 <= 3 ? YES overlap
  last.end = max(3, 6) = 6

  1--------3
       2-----------6
  1----------------6     ← one blob in out

Step i=2  next = [8,10]
  last = [1,6]
  8 <= 6 ? NO  (gap)
  push [8,10]

  1----------------6  ....  8------10

Step i=3  next = [15,18]
  last = [8,10]
  15 <= 10 ? NO
  push [15,18]

out = [[1,6],[8,10],[15,18]]
```

**Nested case** `[1,10]` then `[3,5]`:

```text
last = [1,10]
3 <= 10 ? YES
last.end = max(10, 5) = 10     ← must use max, not next.end
```

If you wrote `last[1] = end` without `Math.max`, a short inner meeting would **shrink** the long one. Wrong.

---

### What the code is doing (pointer on `out`)

```text
sorted:  A     B      C       D
         [1,3] [2,6]  [8,10]  [15,18]

out starts as [ A ]

     compare B with last of out  → merge into last
     compare C with last of out  → no → append C (C is new last)
     compare D with last of out  → no → append D
```

You never compare B with C directly. After merge, B is **inside** the last blob.

---

### Code

```js
function mergeIntervals(intervals) {
  if (!intervals.length) return [];

  const sorted = [...intervals].sort((a, b) => a[0] - b[0]);
  const out = [sorted[0].slice()]; // copy so we don't mutate input

  for (let i = 1; i < sorted.length; i++) {
    const [start, end] = sorted[i];
    const last = out[out.length - 1];

    if (start <= last[1]) {
      last[1] = Math.max(last[1], end); // extend blob
    } else {
      out.push([start, end]); // new blob
    }
  }

  return out;
}
```

**Time `O(n log n)`** (sort). Scan is O(n).  
**Space `O(n)`** for `out` (and the sorted copy).

**Ask:** closed intervals (`<=`) vs half-open (`start < last[1]`). Calendars usually `<=`.

**Spoken 25s:**

> Sort by start. Keep a list of merged blobs. Each next range can only overlap the **last** blob. If its start is `<=` last end, stretch last end with `max`. Else push a new blob. That’s why nested and touching ranges work.

---

## 5. Flatten Nested Array

### Problem

Given a nested array (arrays inside arrays to any depth), return a **single-level array** with all non-array values in order.

Often interviewers also ask for a `depth` argument: flatten only `depth` levels (like `Array.prototype.flat(depth)`).

### Examples

```text
Input:  [1, [2, [3, 4]], 5]
Output: [1, 2, 3, 4, 5]

Input:  [1, [2, [3, [4]]]], depth = 1
Output: [1, 2, [3, [4]]]

Input:  [1, [2, [3, [4]]]], depth = Infinity
Output: [1, 2, 3, 4]
```

### Edge cases

- Empty arrays inside
- Already flat array
- Very deep nesting (recursion stack risk → iterative)

### Intuition

If value is array → unpack; else collect. Recursion or explicit stack.

### Recursive

```js
function flatten(arr, depth = Infinity) {
  const out = [];

  for (const item of arr) {
    if (Array.isArray(item) && depth > 0) {
      out.push(...flatten(item, depth - 1));
    } else {
      out.push(item);
    }
  }

  return out;
}
```

### Iterative stack (no recursion limit worry)

```js
function flattenIter(arr) {
  const out = [];
  const stack = [...arr];

  while (stack.length) {
    const item = stack.pop();
    if (Array.isArray(item)) {
      for (let i = item.length - 1; i >= 0; i--) stack.push(item[i]);
    } else {
      out.push(item);
    }
  }

  return out;
}
```

**Say:** “DFS unpack; iterative pushes right-to-left to preserve order.”

Frontend tie-in: nested comments, menu trees, irregular API arrays.

---

## 6. Reverse Linked List

### How to **make** a linked list (JS)

JS has no built-in list. You build **nodes**. Each node is a small object:

```text
  node
  ┌─────────┬──────────┐
  │ val: 1  │ next ──────────►  next node  (or null = end)
  └─────────┴──────────┘
```

**One node:**

```js
class ListNode {
  constructor(val, next = null) {
    this.val = val;
    this.next = next;
  }
}

const a = new ListNode(1); // 1 -> null
```

**Chain by hand** (draw arrows as `.next`):

```js
const n1 = new ListNode(1);
const n2 = new ListNode(2);
const n3 = new ListNode(3);
n1.next = n2;
n2.next = n3;
// n3.next is already null

// n1 is the HEAD
// 1 -> 2 -> 3 -> null
```

```text
head
  │
  ▼
┌───┬───┐    ┌───┬───┐    ┌───┬───┐
│ 1 │ ──┼───►│ 2 │ ──┼───►│ 3 │ ──┼───► null
└───┴───┘    └───┴───┘    └───┴───┘
```

You can also nest constructors (builds **backwards** — innermost is the tail):

```js
const head = new ListNode(1, new ListNode(2, new ListNode(3)));
// 1 -> 2 -> 3 -> null
```

**From an array** (what you do in interviews / tests):

```js
function listFromArray(arr) {
  const dummy = new ListNode(0); // fake start; skip at the end
  let tail = dummy;
  for (const val of arr) {
    tail.next = new ListNode(val);
    tail = tail.next;
  }
  return dummy.next; // real head (null if arr is empty)
}

const head = listFromArray([1, 2, 3]);
```

```text
dummy (not returned)
  │
  ▼
  0  →  1  →  2  →  3  → null
        ▲
        return this
```

Walk / print:

```js
function listToArray(head) {
  const out = [];
  let cur = head;
  while (cur) {
    out.push(cur.val);
    cur = cur.next; // move to next box
  }
  return out;
}
```

**Spoken 15s:** “A linked list is nodes with `val` and `next`. Head is the first node. Last `next` is `null`. I build it from an array with a dummy tail pointer.”

Runnable: `practice/linkedList.js`

---

### Problem (reverse)

Given the `head` of a singly linked list, reverse the list and return the **new head**.

Each node has `val` and `next`.

### Examples

```text
Input:  1 -> 2 -> 3 -> null
Output: 3 -> 2 -> 1 -> null

Input:  1 -> null
Output: 1 -> null

Input:  null
Output: null
```

### Edge cases

- Empty list
- Single node
- Must not lose the remaining list while rewiring pointers

### Intuition

Rewire `.next` backward with `prev`, `cur`, `next`.

```text
start:     null    1 → 2 → 3 → null
           prev    cur

save next, point cur backward, slide:

           null ← 1    2 → 3 → null
                  prev cur

           null ← 1 ← 2    3 → null
                      prev cur

           null ← 1 ← 2 ← 3
                          prev   cur=null

return prev  (new head = 3)
```

### Code

```js
class ListNode {
  constructor(val, next = null) {
    this.val = val;
    this.next = next;
  }
}

function reverseList(head) {
  let prev = null;
  let cur = head;

  while (cur) {
    const next = cur.next; // save the rest BEFORE you break the arrow
    cur.next = prev;
    prev = cur;
    cur = next;
  }

  return prev;
}
```

**Time `O(n)`**, **Space `O(1)`**

---

## 7. Binary Search

### Problem

Given a **sorted** array of numbers `nums` and a `target`, return the index of `target`, or `-1` if not found.

Must run in `O(log n)` — do not scan linearly.

### Examples

```text
Input:  nums = [-1, 0, 3, 5, 9, 12], target = 9
Output: 4

Input:  nums = [-1, 0, 3, 5, 9, 12], target = 2
Output: -1
```

### Edge cases

- Empty array
- Target smaller/larger than all elements
- Duplicates (classic version: any index of target is OK unless asked for first/last)

### Intuition

Repeatedly cut the search space in half. Compare middle with target; discard the half that cannot contain it.

### Code

```js
function binarySearch(nums, target) {
  let lo = 0;
  let hi = nums.length - 1;

  while (lo <= hi) {
    const mid = (lo + hi) >>> 1;
    if (nums[mid] === target) return mid;
    if (nums[mid] < target) lo = mid + 1;
    else hi = mid - 1;
  }

  return -1;
}
```

**Time `O(log n)`**, **Space `O(1)`**  
Requires sorted array.

---

## 8. Level Order Traversal (BFS)

### Problem

Given the `root` of a binary tree, return the **level-order traversal** of its nodes’ values — left to right, level by level.

Output shape: array of arrays, one array per level.

### Examples

```text
Tree:
    3
   / \
  9  20
    /  \
   15   7

Output: [[3], [9, 20], [15, 7]]
```

### Edge cases

- Empty tree → `[]`
- Single node → `[[val]]`
- Skewed tree (only left or only right children)

### Intuition

Queue processes one level at a time.

### Code

```js
function levelOrder(root) {
  if (!root) return [];

  const res = [];
  const q = [root];
  let head = 0; // avoid O(n) shift

  while (head < q.length) {
    const size = q.length - head;
    const level = [];

    for (let i = 0; i < size; i++) {
      const node = q[head++];
      level.push(node.val);
      if (node.left) q.push(node.left);
      if (node.right) q.push(node.right);
    }

    res.push(level);
  }

  return res;
}
```

**Time `O(n)`**, **Space `O(n)`**

Frontend tie-in: org chart levels, file explorer breadth listing.

### Bonus easy tree asks

**Max depth:** return the number of nodes along the longest path from root to leaf (`null` → `0`).

**Invert tree:** swap every left/right child recursively; return the root.

```js
function maxDepth(root) {
  if (!root) return 0;
  return 1 + Math.max(maxDepth(root.left), maxDepth(root.right));
}

function invertTree(root) {
  if (!root) return null;
  [root.left, root.right] = [invertTree(root.right), invertTree(root.left)];
  return root;
}
```

---

## 9. Maximum Subarray (Kadane)

### Problem

Given an integer array `nums`, find the contiguous **subarray** (at least one number) with the largest sum, and return that **sum**.

### Examples

```text
Input:  [-2, 1, -3, 4, -1, 2, 1, -5, 4]
Output: 6
Why:    [4, -1, 2, 1] sums to 6

Input:  [1]
Output: 1

Input:  [5, 4, -1, 7, 8]
Output: 23
```

### Edge cases

- All negative → return the largest (least negative) single element
- Single element array
- Follow-up sometimes asks for the subarray itself, not only the sum

### Intuition

At each index: extend previous best ending here, or start fresh.

### Code

```js
function maxSubArray(nums) {
  let best = nums[0];
  let cur = nums[0];

  for (let i = 1; i < nums.length; i++) {
    cur = Math.max(nums[i], cur + nums[i]);
    best = Math.max(best, cur);
  }

  return best;
}
```

**Time `O(n)`**, **Space `O(1)`**

---

## 10. House Robber (1D DP)

### Problem

You are a robber walking a street of houses. `nums[i]` is the money in house `i`.

**Constraint:** you cannot rob two **adjacent** houses (alarm goes off).

Return the **maximum amount** you can rob without alerting the police.

### Examples

```text
Input:  [1, 2, 3, 1]
Output: 4
Why:    rob house 0 + house 2 → 1 + 3 = 4

Input:  [2, 7, 9, 3, 1]
Output: 12
Why:    2 + 9 + 1 = 12
```

### Edge cases

- Empty → `0`
- One house → that house’s money
- Two houses → `max` of the two

### Intuition

Cannot take adjacent houses.  
`best(i) = max(best(i-1), nums[i] + best(i-2))`

### Code

```js
function rob(nums) {
  let prev2 = 0;
  let prev1 = 0;

  for (const money of nums) {
    const cur = Math.max(prev1, money + prev2);
    prev2 = prev1;
    prev1 = cur;
  }

  return prev1;
}
```

**Time `O(n)`**, **Space `O(1)`**

Also know: **Climbing Stairs** — you can climb 1 or 2 steps; return ways to reach step `n`. Same recurrence family as House Robber / Fibonacci.

```js
function climbStairs(n) {
  if (n <= 2) return n;
  let a = 1, b = 2;
  for (let i = 3; i <= n; i++) {
    [a, b] = [b, a + b];
  }
  return b;
}
```

---

## 11. LRU Cache (Map Order)

Deep guide: `LRU_CACHE.md`

### Problem

Design a data structure that follows the constraints of a **Least Recently Used (LRU) cache**.

Implement `LRUCache`:

- `LRUCache(capacity)` — initialize with positive capacity
- `get(key)` — return value if key exists, else `-1`. Mark key as recently used
- `put(key, value)` — insert or update. Mark as recently used. If size exceeds capacity, **evict the least recently used** key

Both `get` and `put` should be average `O(1)`.

### Examples

```text
LRUCache cache = new LRUCache(2)
cache.put(1, 1)   // {1}
cache.put(2, 2)   // {1, 2}
cache.get(1)      // returns 1; order becomes {2, 1}
cache.put(3, 3)   // evicts key 2; {1, 3}
cache.get(2)      // returns -1
cache.put(4, 4)   // evicts key 1; {3, 4}
cache.get(1)      // -1
cache.get(3)      // 3
cache.get(4)      // 4
```

### Edge cases

- Capacity `1`
- `put` updating an existing key (refresh recency, no eviction if still under cap)
- `get` miss must not change order

### Minimal interview version

```js
class LRUCache {
  constructor(capacity) {
    this.cap = capacity;
    this.map = new Map();
  }

  get(key) {
    if (!this.map.has(key)) return -1;
    const value = this.map.get(key);
    this.map.delete(key);
    this.map.set(key, value); // move to newest
    return value;
  }

  put(key, value) {
    if (this.map.has(key)) this.map.delete(key);
    this.map.set(key, value);

    if (this.map.size > this.cap) {
      const oldest = this.map.keys().next().value;
      this.map.delete(oldest);
    }
  }
}
```

**Say:** “Map insertion order = recency; delete+set refreshes; first key is LRU.”

---

## 12. Sort Objects By Multiple Keys

### Problem

Given an array of objects (e.g. users), sort them by **multiple keys** with a defined priority.

Classic ask: sort by `age` ascending, and if ages are equal, sort by `name` alphabetically.

Do not mutate the original array unless asked (prefer copy + sort).

### Examples

```text
Input:
[
  { name: "Zoe", age: 30 },
  { name: "Amy", age: 25 },
  { name: "Bob", age: 30 }
]

Output:
[
  { name: "Amy", age: 25 },
  { name: "Bob", age: 30 },
  { name: "Zoe", age: 30 }
]
```

### Edge cases

- Equal on all keys → stable sort keeps relative order (nice to mention)
- Missing fields — clarify with interviewer
- Descending vs ascending per key

### Code

```js
function sortUsers(users) {
  return [...users].sort((a, b) => {
    if (a.age !== b.age) return a.age - b.age;
    return a.name.localeCompare(b.name);
  });
}
```

**Say:** “Comparator cascade: first differing key decides.”

Frontend gold: tables, filters, product lists.

**Related:** custom label order (`easy → medium → hard`) via a priority map — see [CUSTOM_SORT_PRIORITY.md](./CUSTOM_SORT_PRIORITY.md).

---

# PART B — High-Frequency Frontend Data Shaping

---

## 13. Remove Duplicates

### Problem

Given an array, return a new array with **duplicates removed**.

Two common variants:

1. Primitives — keep unique values (`Set`)
2. Objects — keep first occurrence of each item by a key (`uniqueBy`)

Order of first occurrence should usually be preserved.

### Examples

```text
unique([1, 2, 2, 3, 1]) → [1, 2, 3]

uniqueBy(
  [{ id: 1 }, { id: 2 }, { id: 1 }],
  (x) => x.id
) → [{ id: 1 }, { id: 2 }]
```

### Edge cases

- Empty array
- All duplicates
- Object identity vs key equality — clarify which is required

```js
function unique(arr) {
  return [...new Set(arr)];
}

// preserve first occurrence for objects by key
function uniqueBy(arr, keyFn) {
  const seen = new Set();
  return arr.filter((item) => {
    const key = keyFn(item);
    if (seen.has(key)) return false;
    seen.add(key);
    return true;
  });
}
```

---

## 14. Group By (polyfill + UI buckets)

Native today: **`Object.groupBy(iterable, callback)`** (ES2024). Older drafts had `Array.prototype.group` — interviews still say “write `groupBy` on Array.”

### What native does

```js
const users = [
  { name: 'A', role: 'admin' },
  { name: 'B', role: 'user' },
  { name: 'C', role: 'admin' },
];

Object.groupBy(users, (u) => u.role);
// {
//   admin: [{ name: 'A', ... }, { name: 'C', ... }],
//   user:  [{ name: 'B', ... }]
// }
```

- Callback: `(element, index)` — same idea as `map`
- Return: **plain object**, keys = `String(callback result)`
- Does **not** mutate the input
- Empty input → `{}`
- Group **order**: first time a key appears (insertion order)

Frontend: messages by date, products by category, table sections.

### Edge cases

- Empty list → `{}`
- Number / boolean keys → become `"1"`, `"true"` on a normal object
- Need object/number keys without stringifying → use **`Map`**, not `{}`
- Sparse arrays: skip holes (`i in this`) if they want spec-strict Array polyfill

---

### Polyfill A — `Object.groupBy` (prefer this in 2026)

```js
if (!Object.groupBy) {
  Object.groupBy = function groupBy(items, fn) {
    const out = Object.create(null); // no inherited `toString` key clashes
    let i = 0;
    for (const item of items) {
      const key = String(fn(item, i++));
      if (!Object.prototype.hasOwnProperty.call(out, key)) out[key] = [];
      out[key].push(item);
    }
    return out;
  };
}

Object.groupBy(users, (u) => u.role);
```

**Time `O(n)`**, **Space `O(n)`** (the buckets).

**Why `Object.create(null)`:** `{}` has `__proto__`. A key named `"__proto__"` can break the object. Interviews like this one-liner.

**Why `String(...)`:** object keys are strings. `groupBy(nums, n => n % 2)` → `"0"` / `"1"`.

---

### Polyfill B — `Array.prototype.groupBy` (if they say “on the array”)

```js
if (!Array.prototype.groupBy) {
  Array.prototype.groupBy = function groupBy(fn) {
    const out = Object.create(null);
    for (let i = 0; i < this.length; i++) {
      if (!(i in this)) continue; // sparse: skip holes
      const key = String(fn.call(undefined, this[i], i, this));
      if (!out[key]) out[key] = [];
      out[key].push(this[i]);
    }
    return out;
  };
}

[1, 2, 3, 4].groupBy((n) => (n % 2 === 0 ? 'even' : 'odd'));
// { odd: [1, 3], even: [2, 4] }
```

Same as `map`: `this` is the array; callback gets `(value, index, array)`.

**Do not** overwrite native if it exists (`if (!Array.prototype.groupBy)`).

---

### Helper (no prototype — safest in app code)

```js
function groupBy(items, keyFn) {
  const out = Object.create(null);
  let i = 0;
  for (const item of items) {
    const key = String(keyFn(item, i++));
    if (!out[key]) out[key] = [];
    out[key].push(item);
  }
  return out;
}
```

### Map version (keys stay numbers / objects)

```js
function groupByMap(items, keyFn) {
  const out = new Map();
  let i = 0;
  for (const item of items) {
    const key = keyFn(item, i++);
    if (!out.has(key)) out.set(key, []);
    out.get(key).push(item);
  }
  return out;
}
```

### Spoken 25s

> Native `Object.groupBy` walks the list, calls `fn(item, i)`, buckets into a null-prototype object, keys stringified. Polyfill is one loop: create array per key, `push`. O(n). If they want Array method, same loop on `this`. I don’t mutate the source.

Runnable: `practice/groupBy.js`

---

## 15. Anagram & Palindrome

### Problem A — Anagram

Given two strings, return `true` if they are **anagrams** of each other (same characters with same frequencies, ignoring spaces/case as agreed).

### Problem B — Palindrome

Given a string, return `true` if it reads the same forward and backward after cleaning (usually ignore non-alphanumeric and case).

### Problem C — Group Anagrams

Given an array of strings, group the anagrams together. Order of groups / within groups often does not matter.

### Examples

```text
isAnagram("listen", "silent") → true
isAnagram("hello", "world")   → false

isPalindrome("A man, a plan, a canal: Panama") → true
isPalindrome("race a car") → false

groupAnagrams(["eat","tea","tan","ate","nat","bat"])
→ [["eat","tea","ate"], ["tan","nat"], ["bat"]]
```

### Edge cases

- Empty strings
- Different lengths (cannot be anagrams)
- Unicode / accents — ask interviewer

```js
function isAnagram(a, b) {
  const norm = (s) => s.toLowerCase().replace(/\s+/g, '');
  const A = norm(a);
  const B = norm(b);
  if (A.length !== B.length) return false;

  const count = new Map();
  for (const ch of A) count.set(ch, (count.get(ch) || 0) + 1);
  for (const ch of B) {
    if (!count.has(ch)) return false;
    count.set(ch, count.get(ch) - 1);
    if (count.get(ch) === 0) count.delete(ch);
  }
  return count.size === 0;
}

function isPalindrome(s) {
  const clean = s.toLowerCase().replace(/[^a-z0-9]/g, '');
  let l = 0, r = clean.length - 1;
  while (l < r) {
    if (clean[l++] !== clean[r--]) return false;
  }
  return true;
}
```

### Group Anagrams (common medium)

```js
function groupAnagrams(strs) {
  const map = new Map();

  for (const s of strs) {
    const key = s.split('').sort().join('');
    if (!map.has(key)) map.set(key, []);
    map.get(key).push(s);
  }

  return [...map.values()];
}
```

---

## 16. First Non-Repeating Character

### Problem

Given a string `s`, find the **first character that appears exactly once** and return its **index**. If none exists, return `-1`.

### Examples

```text
Input:  "leetcode"
Output: 0
Why:    'l' is first unique

Input:  "loveleetcode"
Output: 2
Why:    'v'

Input:  "aabb"
Output: -1
```

### Edge cases

- Empty string → `-1`
- All characters repeated
- Case sensitivity — usually case-sensitive unless told otherwise

```js
function firstUniqChar(s) {
  const freq = new Map();
  for (const ch of s) freq.set(ch, (freq.get(ch) || 0) + 1);

  for (let i = 0; i < s.length; i++) {
    if (freq.get(s[i]) === 1) return i;
  }
  return -1;
}
```

---

## 17. Chunk Array (pagination helper)

### Problem

Given an array `arr` and a positive integer `size`, split the array into chunks of length `size`. The last chunk may be shorter if items do not divide evenly.

Return an array of chunks (arrays).

### Examples

```text
chunk([1, 2, 3, 4, 5], 2) → [[1, 2], [3, 4], [5]]
chunk([1, 2, 3], 5)       → [[1, 2, 3]]
chunk([], 3)              → []
```

### Edge cases

- `size <= 0` — throw or define behavior
- `size` larger than array length → one chunk
- Frontend use: pagination pages, batching API uploads

```js
function chunk(arr, size) {
  if (size <= 0) throw new Error('size must be > 0');
  const out = [];
  for (let i = 0; i < arr.length; i += size) {
    out.push(arr.slice(i, i + size));
  }
  return out;
}
```

---

## 18. Deep Equal (often asked with deep clone)

**Full guide + walkthrough:** [DEEP_EQUAL.md](./DEEP_EQUAL.md)

### Problem

Implement `deepEqual(a, b)` → `true` if values are **structurally** equal (not just same reference).

### Examples

```text
deepEqual({ a: 1, b: { c: 2 } }, { a: 1, b: { c: 2 } }) → true
deepEqual([1, 2], [1, 2]) → true
deepEqual([1, 2], { 0: 1, 1: 2 }) → false
deepEqual(NaN, NaN) → true   // Object.is
```

### Interview-simple solution (`Object.keys`)

Write this first (same style as other DSA answers here):

```js
function deepEqual(a, b) {
  if (Object.is(a, b)) return true;
  if (typeof a !== 'object' || typeof b !== 'object' || a === null || b === null) {
    return false;
  }
  if (Array.isArray(a) !== Array.isArray(b)) return false;

  const keysA = Object.keys(a);
  const keysB = Object.keys(b);
  if (keysA.length !== keysB.length) return false;

  for (const key of keysA) {
    if (!Object.prototype.hasOwnProperty.call(b, key)) return false;
    if (!deepEqual(a[key], b[key])) return false;
  }
  return true;
}
```

### Algorithm (memorize)

1. `Object.is` → true (primitives, same ref, `NaN`)
2. Not both non-null objects → false
3. Array vs object mismatch → false
4. Same key count; each key recurse

### Follow-ups

| They ask… | You do… |
|---|---|
| Symbols / non-enumerable | `Reflect.ownKeys` instead of `Object.keys` |
| Cycles | `WeakMap` of pairs already comparing |
| Date | `getTime()` compare |

**Spoken:** *“Same recursive walk as deep clone, but return boolean instead of a copy.”*

---

## 19. Flatten Nested Object (Dot Paths)

### Problem

Given a nested plain object, return a **flat object** whose keys are **dot-separated paths** to leaf values.

This is a very common frontend interview ask (API payload shaping, form field maps, config flattening).

### Rules (match the example below — clarify these in the interview)

1. **Recurse only into plain objects** (`{}` style), not into arrays.
2. **Arrays are leaves** — keep the whole array as the value (even if it contains objects).
3. Keep leaf primitives as-is: `string`, `number`, `boolean`, `''`, `null`, `undefined`.
4. **Skip empty plain objects** — do not emit a key for `{}` (and do not keep walking into nothing).
5. Build path as `parent.child.grandchild`.

> Note: some interviewers instead flatten arrays as `projects.0.id`. **Ask first.**  
> This guide follows your example: arrays stay intact.

### Input

```js
let obj = {
  user: {
    id: 101,
    name: 'Jane Doe',
    isVerified: false,
    nickname: '',
    settings: {
      is_active: true,
      theme: null,
      data: {},
      preferences: {},
    },
    tags: ['admin', 'dev'],
    roles: [],
    metadata: undefined,
  },
  address: {
    street: 'wood nagar',
    town: 'chirala',
    district: 'LA',
    geo: { lat: 15.123, lng: 80.456 },
  },
  projects: [
    { id: 1, name: 'AI Project' },
    { id: 2, name: 'Web App' },
  ],
};
```

### Output

```js
{
  'user.id': 101,
  'user.name': 'Jane Doe',
  'user.isVerified': false,
  'user.nickname': '',
  'user.settings.is_active': true,
  'user.settings.theme': null,
  // notice: user.settings.data / preferences omitted (empty {})
  'user.tags': ['admin', 'dev'],
  'user.roles': [],
  'user.metadata': undefined,
  'address.street': 'wood nagar',
  'address.town': 'chirala',
  'address.district': 'LA',
  'address.geo.lat': 15.123,
  'address.geo.lng': 80.456,
  projects: [
    { id: 1, name: 'AI Project' },
    { id: 2, name: 'Web App' },
  ],
}
```

### Why these results? (walkthrough)

| Path / value | What we do | Why |
|---|---|---|
| `user.id: 101` | emit `'user.id': 101` | number is a leaf |
| `user.isVerified: false` | keep `false` | `false` is a real value, not “empty” |
| `user.nickname: ''` | keep `''` | empty string is still a leaf |
| `user.settings.theme: null` | keep `null` | `null` is a leaf (do not recurse) |
| `user.settings.data: {}` | **skip** | empty plain object → no key |
| `user.tags: [...]` | keep whole array | arrays are leaves in this variant |
| `user.roles: []` | keep `[]` | empty array is still a leaf array |
| `user.metadata: undefined` | keep `undefined` | still a leaf |
| `address.geo.lat` | emit dotted path | nested plain object → recurse |
| `projects: [{...}]` | keep under `projects` | array of objects not expanded |

### Intuition

DFS / recursion with a running `path` string:

- If value is a **plain non-empty object** → recurse into each key, append `.key` to path
- Otherwise → write `result[path] = value` (leaf)

Helper: “plain object” means `typeof === 'object'`, not `null`, not array.

```text
isPlainObject(v) =
  v !== null &&
  typeof v === 'object' &&
  !Array.isArray(v)
```

### Small warm-up example

```js
flattenObject({ a: { b: 1, c: {} }, d: [2, 3] })
// → { 'a.b': 1, d: [2, 3] }
// 'a.c' omitted because {}
```

### Code (interview-friendly)

```js
function isPlainObject(value) {
  return (
    value !== null &&
    typeof value === 'object' &&
    !Array.isArray(value)
  );
}

function flattenObject(obj) {
  const result = {};

  function walk(current, path) {
    // Empty plain object → skip entirely (no key emitted)
    if (isPlainObject(current) && Object.keys(current).length === 0) {
      return;
    }

    // Non-empty plain object → recurse
    if (isPlainObject(current)) {
      for (const key of Object.keys(current)) {
        const nextPath = path ? `${path}.${key}` : key;
        walk(current[key], nextPath);
      }
      return;
    }

    // Leaf: primitive / null / undefined / array / etc.
    // Only emit if we actually have a path (root shouldn't be a leaf normally)
    if (path) {
      result[path] = current;
    }
  }

  walk(obj, '');
  return result;
}
```

### Trace (partial)

```text
walk(obj, '')
  user → walk(userObj, 'user')
    id → leaf → result['user.id'] = 101
    settings → walk(settingsObj, 'user.settings')
      is_active → result['user.settings.is_active'] = true
      theme → result['user.settings.theme'] = null
      data → {} → skip
      preferences → {} → skip
    tags → array leaf → result['user.tags'] = ['admin','dev']
  address.geo → walk → lat/lng leaves
  projects → array leaf → result['projects'] = [ {...}, {...} ]
```

### Edge cases to mention

| Case | Behavior in this version |
|---|---|
| `null` / `undefined` values | kept as leaves |
| `false` / `0` / `''` | kept (don’t treat as empty) |
| `{}` nested | skipped (no key) |
| `[]` | kept as leaf array |
| Array of objects | kept whole (not `projects.0.id`) |
| Root empty `{}` | returns `{}` |
| Only one level | keys stay without extra dots |

### Follow-ups interviewers love

**1) Also flatten arrays**

```js
// projects.0.id, projects.0.name, ...
if (Array.isArray(current)) {
  current.forEach((item, i) => walk(item, `${path}.${i}`));
  return;
}
```

**2) Unflatten (reverse)**

```js
function unflattenObject(flat) {
  const result = {};

  for (const [path, value] of Object.entries(flat)) {
    const parts = path.split('.');
    let cur = result;

    for (let i = 0; i < parts.length - 1; i++) {
      const p = parts[i];
      if (!isPlainObject(cur[p])) cur[p] = {};
      cur = cur[p];
    }

    cur[parts[parts.length - 1]] = value;
  }

  return result;
}
```

> Unflatten of the sample is imperfect for arrays/`undefined` unless you special-case — say that aloud.

**3) Custom separator** (`user/id` or `user_id`) — pass `sep = '.'` argument.

### Complexity

- **Time:** `O(n)` where `n` = number of keys visited in the object tree  
- **Space:** `O(n)` for the output + recursion depth `O(depth)`

### Frontend use

- Convert nested API JSON → flat form control names (`user.settings.theme`)
- Logging / analytics property bags
- Diffing configs by path keys

**Say:**  
“I recurse only into non-empty plain objects, join keys with dots, and treat arrays/null/primitives as leaves — matching typical form/API flatten behavior.”

---

# PART C — Frontend Utility Patterns (Coding Round Favorites)

Implement briefly here; use dedicated MD files for deep dives.

---

## 20. Debounce / Throttle

See `DEBOUNCE_THROTTLE.md`.

### Problem

Implement two rate-limiting helpers:

**Debounce:** given `fn` and `wait`, return a function that delays calling `fn` until `wait` ms have passed **without another call**. (Reset the timer on each call.)

**Throttle:** given `fn` and `wait`, return a function that invokes `fn` at most once every `wait` ms (leading-edge simple version).

### Examples

```text
Debounce (wait = 300):
call at t=0, 100, 200 → fn runs once around t=500

Throttle (wait = 300):
call at t=0, 100, 200, 400 → fn runs at t=0 and t=400
```

### Edge cases

- Preserve `this` and arguments
- Cancel / flush APIs — advanced follow-up
- Trailing throttle vs leading — ask which variant

```js
function debounce(fn, wait) {
  let timer;
  return function (...args) {
    clearTimeout(timer);
    timer = setTimeout(() => fn.apply(this, args), wait);
  };
}

function throttle(fn, wait) {
  let last = 0;
  return function (...args) {
    const now = Date.now();
    if (now - last < wait) return;
    last = now;
    return fn.apply(this, args);
  };
}
```

---

## 21. Deep Clone / Deep Merge

See `DEEP_CLONE.md`.

### Problem

**Deep clone:** return a new value that is a full recursive copy of the input (mutating the clone must not mutate the original).

**Deep merge:** given two plain objects `a` and `b`, return a new object where nested plain objects are merged recursively; for conflicts on non-object values, `b` wins.

### Examples

```text
const a = { user: { name: "A", age: 1 }, tags: [1] }
const b = { user: { age: 2, city: "X" }, active: true }

deepMerge(a, b) →
{
  user: { name: "A", age: 2, city: "X" },
  tags: [1],
  active: true
}
```

### Edge cases

- Arrays usually replaced, not element-merged (unless asked)
- Cycles, Date, Map, Set — ask scope
- Do not treat arrays as mergeable plain objects

```js
function deepMerge(a, b) {
  const isObj = (v) => v && typeof v === 'object' && !Array.isArray(v);
  if (!isObj(a)) return b;

  const out = { ...a };
  for (const key of Object.keys(b)) {
    out[key] = isObj(out[key]) && isObj(b[key])
      ? deepMerge(out[key], b[key])
      : b[key];
  }
  return out;
}
```

---

## 22. Memoize

### Problem

Write `memoize(fn)` that returns a wrapped function caching results by arguments. On a repeated call with the same args, return the cached result instead of recomputing.

### Examples

```text
const slowAdd = (a, b) => a + b
const add = memoize(slowAdd)

add(1, 2) // computes → 3
add(1, 2) // cache hit → 3
add(2, 3) // computes → 5
```

### Edge cases

- Object arguments — `JSON.stringify` key is imperfect (order, undefined)
- `this` binding if used as a method
- Cache growth / eviction (LRU memo) as follow-up

```js
function memoize(fn) {
  const cache = new Map();
  return function (...args) {
    const key = JSON.stringify(args); // interview caveat for objects
    if (cache.has(key)) return cache.get(key);
    const val = fn.apply(this, args);
    cache.set(key, val);
    return val;
  };
}
```

### Interview drill — Memoization made the app slower?

> Cache only helps on **repeated keys** when compute cost > lookup cost. Unbounded Maps hold large values forever (memory/GC pressure). Bad keys (`JSON.stringify` huge/unique objects) → never hit, only overhead. Memoizing cheap functions adds cost. Prefer LRU + memoize only expensive pure work.

See also: `TRICKY_10_FRONTEND_QUESTIONS.md` Q9.

---

## 23. Promise Pool / Concurrency Limit (senior FE favorite)

**Deep interview guide (GreatFrontEnd `mapAsyncLimit`):** [MAP_ASYNC_LIMIT.md](./MAP_ASYNC_LIMIT.md)

### Problem

Given a list of items, an async `worker(item)`, and a concurrency `limit`, process all items such that **at most `limit` workers run at the same time**.

Return results in the **same order** as the input items (even if tasks finish out of order).

### Examples

```text
items = [url1, url2, url3, url4]
limit = 2
worker = (url) => fetch(url)

→ never more than 2 fetches in flight
→ results[i] corresponds to items[i]
```

### Edge cases

- `limit` larger than list length
- Empty list
- Worker rejection — decide fail-fast vs collect errors

```js
async function asyncPool(limit, items, worker) {
  const results = new Array(items.length);
  let next = 0;

  async function run() {
    while (next < items.length) {
      const i = next++;
      results[i] = await worker(items[i], i);
    }
  }

  const runners = Array.from({ length: Math.min(limit, items.length) }, run);
  await Promise.all(runners);
  return results;
}

// asyncPool(2, urls, (url) => fetch(url).then(r => r.json()))
```

Frontend tie-in: limit parallel image/API requests.

---

## 24. EventEmitter

See `EVENT_EMITTER.md`.

### Problem

Implement a tiny pub/sub class:

- `on(event, cb)` — subscribe
- `off(event, cb)` — unsubscribe
- `emit(event, ...args)` — call all listeners for that event
- Optional: `once(event, cb)` — auto-unsubscribe after first emit

### Examples

```text
const bus = new EventEmitter()
const handler = (msg) => console.log(msg)

bus.on("chat", handler)
bus.emit("chat", "hi")  // logs "hi"
bus.off("chat", handler)
bus.emit("chat", "bye") // no-op
```

### Edge cases

- Emitting with no listeners
- Unsubscribing during emit
- Same callback registered twice

---

# PART C2 — Extra FE coding drills (web 2025–26 + GOC)

Sources: [FrontendAtlas DSA-for-FE](https://frontendatlas.com/guides/interview-blueprint/dsa-for-fe), [GreatFrontend must-know JS](https://www.greatfrontend.com/blog/10-must-know-javascript-coding-interview-questions), [StackInterview 30 JS coding 2026](https://stackinterview.dev/guides/javascript-coding-interview-questions-2026-with-optimized-solutions), GOC L1 (task-sort, debounce) + **your GOC round: 3Sum**.

Most FE rounds are **utilities + data shaping**. **GOC / product companies** still throw **LeetCode-medium arrays** (Two Sum family, two pointers, **O(1) extra space** follow-up). Practice both.

### Coverage map (don’t duplicate — drill the file)

| Asked a lot | This repo |
|---|---|
| Two Sum / 3Sum | §1, **§1b** |
| Longest unique substring | §2 |
| Valid parentheses | §3 |
| Flatten array / object | §5, §19 |
| Merge intervals | §4 |
| Kadane / House Robber | §9, §10 |
| Binary search | §7 |
| LRU | §11 + `LRU_CACHE.md` |
| GroupBy / dedupe | §14, §13 |
| Debounce / throttle / once | §20, `DEBOUNCE_THROTTLE.md`, `ONCE_FN.md` |
| Deep clone / equal | §18, §21 |
| EventEmitter / Promise pool | §24, §23 |
| map/filter/reduce polyfill | `POLYFILLS_README.md` |
| pipe/compose | `PIPE_COMPOSE.md` |
| Topo / task deps + priority | `../goc/GOC_JS_TASK_SORT.md` |
| productExceptSelf, LIS, compress | `DSA_CODING_ROUND_CLASSICS.md` |

**GOC space follow-up pattern:** Map = O(n) extra. They often then want **sort + two pointers** or **in-place two pointers** = O(1) extra. Same family: Two Sum II, 3Sum, move zeros, container with most water.

---

## 25. Move zeros to the end (in-place, O(1) space)

### Problem

Array of numbers. **Move every `0` to the end.** Keep the **relative order** of the non-zeros. Do it **in place** — no second array (that would be O(n) extra space).

LeetCode 283. Same “O(1) extra” follow-up energy as 3Sum / Two Sum sorted.

```text
Input:  [0, 1, 0, 3, 12]
Output: [1, 3, 12, 0, 0]

Input:  [0, 0, 1]
Output: [1, 0, 0]
```

Ask: mutate the given array? (yes, classic). Must non-zeros stay in order? (**yes** — `[1,0,3]` → `[1,3,0]`, not `[3,1,0]`).

---

### What you are not allowed to do (O(n) space)

```js
function moveZeroesExtra(nums) {
  const out = nums.filter((n) => n !== 0);
  while (out.length < nums.length) out.push(0);
  return out; // NEW array → O(n) extra. They reject this.
}
```

---

### Learn this version first (no swap — easy)

**Job in two steps:**

1. Copy every **non-zero** to the front, in order.  
2. Fill whatever is left with **0**.

`next` = “where the next non-zero should sit.” Start at `0`. Walk `i` through the whole array.

```text
nums = [0, 1, 0, 3, 12]
        next=0

i=0  value 0  → ignore
i=1  value 1  → put at next  →  [1, 1, 0, 3, 12]  next=1
i=2  value 0  → ignore
i=3  value 3  → put at next  →  [1, 3, 0, 3, 12]  next=2
i=4  value 12 → put at next  →  [1, 3, 12, 3, 12] next=3

step 2: from next to end, write 0
        [1, 3, 12, 0, 0]
```

You overwrote some cells. That’s OK — those old values were already copied left, or they were zeros we don’t need.

```js
function moveZeroes(nums) {
  let next = 0; // next index that should get a non-zero

  for (let i = 0; i < nums.length; i++) {
    if (nums[i] !== 0) {
      nums[next] = nums[i];
      next++;
    }
  }

  for (let i = next; i < nums.length; i++) {
    nums[i] = 0;
  }

  return nums;
}
```

Read it in English:

- Scan left to right.  
- If I see a real number, write it at `next` and move `next` one step right.  
- When the scan is done, `next` is “how many non-zeros I kept.” Everything after that must be zero.

**Time O(n). Extra space O(1).** This is enough for the interview.

---

### The swap one-liner (same idea, one loop)

LeetCode often shows this. It **looks** harder. It is doing the same thing: put the next non-zero at `next`.

Instead of “copy then fill zeros later,” it **swaps** so the zero at `next` jumps to where the non-zero was.

```js
function moveZeroesSwap(nums) {
  let next = 0;
  for (let i = 0; i < nums.length; i++) {
    if (nums[i] !== 0) {
      // put this non-zero at `next`; whatever was at `next` (often 0) goes to i
      const temp = nums[next];
      nums[next] = nums[i];
      nums[i] = temp;
      next++;
    }
  }
  return nums;
}
```

`[nums[next], nums[i]] = [nums[i], nums[next]]` is just that swap in one line.

If `next === i`, you swap a cell with itself — nothing changes, then `next++`. That happens when the left side is already non-zeros.

**In the interview, write the two-step version.** Mention swap only if they want one pass.

---

### Traps

| Trap | Fix |
|---|---|
| `filter` into a new array | They want in-place |
| Moving `next` when the value is `0` | Only move `next` when you place a non-zero |
| Sort | Wrong complexity / can scramble order |

**Spoken 20s:**

> I keep an index `next` for the next non-zero slot. I copy every non-zero there in order, then fill the rest with zeros. No extra array.

---

## 26. Rotate array by `k` (in-place)

```js
function rotate(nums, k) {
  const n = nums.length;
  k %= n;
  reverse(nums, 0, n - 1);
  reverse(nums, 0, k - 1);
  reverse(nums, k, n - 1);
  return nums;
}
function reverse(a, l, r) {
  while (l < r) {
    [a[l], a[r]] = [a[r], a[l]];
    l++;
    r--;
  }
}
```

**O(n) time, O(1) extra.** Extra array is O(n) space — they may reject it.

---

## 27. Group anagrams

```js
function groupAnagrams(strs) {
  const map = new Map();
  for (const s of strs) {
    const key = [...s].sort().join('');
    if (!map.has(key)) map.set(key, []);
    map.get(key).push(s);
  }
  return [...map.values()];
}
```

**O(n · k log k)** with sort-key. Count-array key `[26]` is O(n · k). Space O(n).

---

## 28. Container with most water (two pointers, O(1) extra)

```js
function maxArea(height) {
  let l = 0;
  let r = height.length - 1;
  let best = 0;
  while (l < r) {
    best = Math.max(best, Math.min(height[l], height[r]) * (r - l));
    if (height[l] < height[r]) l++;
    else r--;
  }
  return best;
}
```

**O(n) time, O(1) extra.** Move the **shorter** wall. Classic “we don’t need a Map.”

---

## 29. Reverse words in a sentence

```js
function reverseWords(s) {
  return s.trim().split(/\s+/).reverse().join(' ');
}
```

Ask: multiple spaces? punctuation? In-place on char array is the O(1) extra follow-up.

---

# PART D — Complexity + Interview Habits

---

## Quick Complexity Table

| Problem | Time | Space |
|---|---|---|
| Two Sum | O(n) | O(n) Map |
| Two Sum sorted | O(n) | O(1) |
| **3Sum two pointers** | O(n²) | **O(1) extra** (no Map) |
| 3Sum hash | O(n²) | O(n) |
| Longest unique substring | O(n) | O(σ) |
| Valid parentheses | O(n) | O(n) |
| Merge intervals | O(n log n) | O(n) |
| Flatten array | O(n) | O(depth) |
| Flatten object | O(n) | O(n + depth) |
| Reverse list | O(n) | O(1) |
| Binary search | O(log n) | O(1) |
| Level order | O(n) | O(n) |
| Kadane | O(n) | O(1) |
| House Robber | O(n) | O(1) |
| LRU get/put | O(1) avg | O(capacity) |
| GroupBy / unique | O(n) | O(n) |

---

## Array Method Complexity Traps (Frontend Specific)

| Operation | Cost |
|---|---|
| `push` / `pop` | O(1) amortized |
| `shift` / `unshift` | O(n) |
| `splice` in middle | O(n) |
| `includes` / `indexOf` | O(n) |
| `Set.has` / `Map.get` | O(1) avg |

Never use `shift()` as a queue in hot loops for large n — use index pointer or real queue structure.

---

## Before You Code Checklist

1. Confirm constraints (sorted? duplicates? negatives? empty?)
2. Give brute force first if non-obvious
3. Name the pattern (Map / window / stack / DP)
4. Write clean JS (meaningful names)
5. Trace one example aloud
6. State time/space
7. Mention one edge case

---

## 7-Day Frontend DSA Plan

| Day | Focus | Drill |
|---|---|---|
| 1 | Map/Set **and** two-pointer Two Sum | Two Sum Map, Two Sum sorted, **3Sum O(1) extra**, uniqueBy, groupBy |
| 2 | Sliding window / strings | longest unique substring, palindrome, first unique char, reverse words |
| 3 | Stack / intervals / in-place | parentheses, merge intervals, **move zeros, rotate, container** |
| 4 | Recursion | flatten array(depth), flatten object, deepEqual, deepClone |
| 5 | Trees | level order, max depth, invert |
| 6 | Design + DP light | LRU, House Robber / stairs, Kadane |
| 7 | FE utilities | debounce/throttle, Promise pool, EventEmitter mock |

---

## Spoken Opening For Any DSA Round

> For frontend roles I focus on practical patterns: hash maps, sliding windows, stacks, recursion for nested data, and design utilities like LRU or debounce. **If they want O(1) extra space**, I switch Map → **sort + two pointers** (3Sum, Two Sum II). I’ll clarify constraints, start from a correct approach, then optimize and explain complexity.

---

## Master List (Practice Tracker)

### From classic DSA (your file + web)

- [ ] Two Sum
- [ ] Two Sum **sorted / O(1) space**
- [ ] **3Sum two pointers** (no Map) — GOC
- [ ] All pairs sum
- [ ] Longest substring no repeat
- [ ] Valid parentheses
- [ ] Merge intervals
- [ ] Flatten nested array (+ depth)
- [ ] Flatten nested object (dot paths)
- [ ] Reverse linked list
- [ ] Binary search
- [ ] Level order BFS
- [ ] Max depth / invert tree
- [ ] Kadane max subarray
- [ ] House Robber / Climbing Stairs
- [ ] LRU Cache
- [ ] Multi-key object sort
- [ ] Group anagrams
- [ ] Move zeros / rotate array / container most water
- [ ] First unique character
- [ ] Remove duplicates / uniqueBy
- [ ] Chunk array
- [ ] Deep equal

### FE utility coding

- [ ] Debounce / Throttle
- [ ] Deep clone / deep merge
- [ ] Memoize
- [ ] groupBy
- [ ] Promise concurrency pool
- [ ] EventEmitter
- [ ] map/filter/reduce polyfills

---

## Final Tip

For Angular/React frontend interviews:

- Expect **more utilities + data shaping** than hard graph DP
- Still know **Two Sum / 3Sum two pointers / sliding window / stack / flatten / LRU** cold
- Always connect solution to UI reality (“group messages by day”, “cache API responses”, “flatten nested nav”)

That combination sounds practical and strong.
