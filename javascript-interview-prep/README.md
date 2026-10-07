# Frontend JavaScript Interview Prep

This guide covers the questions from `Questions1.txt` with interview-ready explanations, minimal examples, edge cases, and complexity. The goal is to help you answer both coding and follow-up discussion questions confidently.

## How To Use This Guide

For each question, practice in this order:

1. Explain the idea in plain English.
2. Write the small code version from memory.
3. Say the complexity.
4. Mention edge cases and production considerations.

A good frontend interview answer is not only code. You should also explain why the approach works, what happens with large input, and how the browser/runtime behaves.

---

## 1. Debounce With API Call Limiting

### Problem

Implement a `debounce` function. Then use it to limit API calls when a user types quickly in a search bar.

### Core Idea

Debounce means: wait until calls stop for a fixed delay, then run the function once with the latest arguments.

For a search box, every keystroke fires an input event. Without debounce, typing `angular` can make 7 API calls. With a 300 ms debounce, the app waits until the user pauses typing, then calls the API once using the final query.

### Interview Explanation

A debounce function keeps one timer. Every time the wrapper function is called, it clears the previous timer and starts a new one. Only the last call survives long enough to execute.

This is useful for:

- Search suggestions
- Resize handlers
- Scroll handlers when final position matters
- Autosave after inactivity

### Minimal Code

```js
function debounce(fn, delay) {
  let timerId;

  return function debounced(...args) {
    clearTimeout(timerId);

    timerId = setTimeout(() => {
      fn.apply(this, args);
    }, delay);
  };
}

const search = debounce((query) => {
  console.log('API call for:', query);
}, 300);

search('a');
search('an');
search('ang');
search('angular'); // Only this runs after 300 ms of silence
```

### Search Bar Example

```js
const input = document.querySelector('#search');

const fetchResults = debounce(async (query) => {
  if (!query.trim()) return;

  const response = await fetch(`/api/search?q=${encodeURIComponent(query)}`);
  const results = await response.json();
  console.log(results);
}, 300);

input.addEventListener('input', (event) => {
  fetchResults(event.target.value);
});
```

### DSA Twist

If the interviewer asks for a DSA angle, explain that debounce reduces the number of expensive operations from `n` input events to at most one operation per burst.

If typing length is `n`:

- Without debounce: up to `O(n)` API calls
- With debounce: `O(1)` API calls per typing burst
- Space: `O(1)` because only one timer is stored

### Important Edge Cases

- Preserve `this` using `fn.apply(this, args)`.
- Preserve latest arguments.
- Clear timer before setting a new one.
- Add `cancel` or `flush` methods in production if needed.
- For API calls, also handle race conditions. A slower old request may return after a newer request.

### Race Condition Fix

```js
let requestId = 0;

const searchApi = debounce(async (query) => {
  const currentId = ++requestId;
  const response = await fetch(`/api/search?q=${query}`);
  const data = await response.json();

  if (currentId === requestId) {
    console.log('Render latest results:', data);
  }
}, 300);
```

---

## 2. Infinite Scroll Loader

### Problem

Given a huge array, for example 10 million items, implement a lazy loader that loads items as the user scrolls with good time and space efficiency.

### Core Idea

Never render or copy the full array. Keep only a small window/page of visible items. Track the current index and return slices by range.

In real frontend apps, this is called virtualization or windowing.

### Interview Explanation

For huge lists, the bottleneck is not only JavaScript memory. DOM nodes are expensive. Rendering 10 million rows freezes the browser. Instead, render only what the user can see plus a small buffer.

### Minimal Lazy Page Loader

```js
function createLazyLoader(items, pageSize) {
  let cursor = 0;

  return function loadNextPage() {
    if (cursor >= items.length) return [];

    const start = cursor;
    const end = Math.min(cursor + pageSize, items.length);
    cursor = end;

    return items.slice(start, end);
  };
}

const items = Array.from({ length: 10000000 }, (_, i) => `Item ${i}`);
const loadNextPage = createLazyLoader(items, 20);

console.log(loadNextPage()); // first 20
console.log(loadNextPage()); // next 20
```

### About Complexity

Each page load returns `k` items, where `k = pageSize`.

- Time per page: `O(k)` because we return `k` items
- Extra state space: `O(1)` because we only store `cursor`
- Rendered DOM space: `O(k)` if we only keep visible rows

Strictly speaking, returning `k` items cannot be `O(1)` time because producing `k` results takes `O(k)`. The right interview answer is: metadata/state is `O(1)`, and page work is proportional to page size, not total list size.

### Scroll Trigger

```js
window.addEventListener('scroll', () => {
  const nearBottom = window.innerHeight + window.scrollY >= document.body.offsetHeight - 200;

  if (nearBottom) {
    const nextItems = loadNextPage();
    render(nextItems);
  }
});
```

### Production Follow-Ups

- Use `IntersectionObserver` instead of raw scroll for better performance.
- Use virtual scrolling to remove old DOM nodes.
- Show loading and error states.
- Prevent duplicate API calls while one page is already loading.
- Use cursor-based pagination for backend APIs.

---

## 3. Implement Deep Clone

### Problem

Implement deep cloning of a nested object while handling functions, dates, and cyclic references.

### Core Idea

Deep clone means nested objects should not share references with the original.

A simple `JSON.parse(JSON.stringify(obj))` fails for:

- Functions
- `Date`
- `Map`, `Set`
- `undefined`
- Symbols
- Cyclic references

### Interview Explanation

Use recursion for nested values. Use a `WeakMap` to remember objects already cloned. If we see the same object again, return the existing clone. This prevents infinite recursion for cycles.

### Minimal Code

```js
function deepClone(value, seen = new WeakMap()) {
  if (value === null || typeof value !== 'object') return value;

  if (typeof value === 'function') return value;
  if (value instanceof Date) return new Date(value.getTime());

  if (seen.has(value)) return seen.get(value);

  if (Array.isArray(value)) {
    const copy = [];
    seen.set(value, copy);

    for (const item of value) {
      copy.push(deepClone(item, seen));
    }

    return copy;
  }

  const copy = {};
  seen.set(value, copy);

  for (const key of Reflect.ownKeys(value)) {
    copy[key] = deepClone(value[key], seen);
  }

  return copy;
}
```

### Example With Cycle

```js
const user = {
  name: 'Shivam',
  createdAt: new Date(),
  greet() {
    return `Hi ${this.name}`;
  }
};

user.self = user;

const cloned = deepClone(user);

console.log(cloned !== user); // true
console.log(cloned.createdAt !== user.createdAt); // true
console.log(cloned.self === cloned); // true
console.log(cloned.greet === user.greet); // true, functions are reused
```

### Why Functions Are Usually Not Cloned

Functions carry lexical scope. You cannot correctly clone a closure in JavaScript. In interviews, say: I keep function references because cloning function behavior and closure state is not reliable.

### Complexity

If there are `n` reachable object properties:

- Time: `O(n)`
- Space: `O(n)` for cloned objects and the `WeakMap`

---

## 4. Longest Substring Without Repeating Characters

### Problem

Given a string, return the length of the longest substring without repeating characters.

Example:

```txt
Input: "abcabcbb"
Output: 3
Explanation: "abc"
```

### Core Idea

Use a sliding window with two pointers. The window always contains unique characters.

When a duplicate appears, move the left pointer to one position after the last occurrence of that character.

### Minimal Code

```js
function lengthOfLongestSubstring(s) {
  const lastSeen = new Map();
  let left = 0;
  let best = 0;

  for (let right = 0; right < s.length; right++) {
    const char = s[right];

    if (lastSeen.has(char) && lastSeen.get(char) >= left) {
      left = lastSeen.get(char) + 1;
    }

    lastSeen.set(char, right);
    best = Math.max(best, right - left + 1);
  }

  return best;
}

console.log(lengthOfLongestSubstring('abcabcbb')); // 3
console.log(lengthOfLongestSubstring('bbbbb')); // 1
console.log(lengthOfLongestSubstring('pwwkew')); // 3
```

### Why This Is O(n)

Each character is visited once by the right pointer. The left pointer only moves forward. No character is processed repeatedly in nested loops.

- Time: `O(n)`
- Space: `O(min(n, charset))`

### Common Mistake

Do not move `left` backward.

For input `abba`, when processing the final `a`, the previous `a` is outside the current window. If you blindly set `left = lastSeen[a] + 1`, you may move left backward. That is why we check `lastSeen.get(char) >= left`.

---

## 5. Design A Controllable Scheduler

### Problem

Implement a `TaskScheduler` class where tasks can be scheduled, paused, resumed, and canceled.

### Core Idea

Wrap `setTimeout`, but store task metadata:

- Callback
- Delay
- Start time
- Remaining time
- Timer id
- Status

When paused, clear the timeout and calculate remaining time. When resumed, start a new timeout using the remaining time.

### Minimal Code

```js
class TaskScheduler {
  constructor() {
    this.tasks = new Map();
    this.nextId = 1;
  }

  schedule(callback, delay) {
    const id = this.nextId++;
    const task = {
      id,
      callback,
      delay,
      remaining: delay,
      startedAt: Date.now(),
      timerId: null,
      status: 'scheduled'
    };

    task.timerId = setTimeout(() => this.run(id), delay);
    this.tasks.set(id, task);
    return id;
  }

  run(id) {
    const task = this.tasks.get(id);
    if (!task || task.status === 'canceled') return;

    task.status = 'completed';
    this.tasks.delete(id);
    task.callback();
  }

  pause(id) {
    const task = this.tasks.get(id);
    if (!task || task.status !== 'scheduled') return false;

    clearTimeout(task.timerId);
    task.remaining -= Date.now() - task.startedAt;
    task.status = 'paused';
    return true;
  }

  resume(id) {
    const task = this.tasks.get(id);
    if (!task || task.status !== 'paused') return false;

    task.startedAt = Date.now();
    task.status = 'scheduled';
    task.timerId = setTimeout(() => this.run(id), task.remaining);
    return true;
  }

  cancel(id) {
    const task = this.tasks.get(id);
    if (!task) return false;

    clearTimeout(task.timerId);
    task.status = 'canceled';
    this.tasks.delete(id);
    return true;
  }
}
```

### Example

```js
const scheduler = new TaskScheduler();

const id = scheduler.schedule(() => {
  console.log('Task executed');
}, 3000);

setTimeout(() => scheduler.pause(id), 1000);
setTimeout(() => scheduler.resume(id), 3000);
```

### Complexity

- Schedule: `O(1)`
- Pause: `O(1)`
- Resume: `O(1)`
- Cancel: `O(1)`
- Space: `O(n)` for `n` pending tasks

### Follow-Up

If the interviewer asks for many tasks ordered by execution time, use a min-heap by due time. Then the scheduler can efficiently run the earliest task first.

---

## 6. Auto-Save With setInterval And Debounce

### Problem

A user is typing in a text editor. Auto-save must trigger after 5 seconds of inactivity. Combine `setInterval` and debounce efficiently.

### Core Idea

Debounce is perfect for inactivity. `setInterval` can be used as a lightweight safety loop to check dirty state, network status, or flush changes if needed.

### Interview Explanation

The typing handler marks content as dirty and updates the last edited time. A debounced save runs after 5 seconds of no typing. A periodic interval can check whether unsaved content is stale and trigger save as a backup.

### Minimal Code

```js
function debounce(fn, delay) {
  let timerId;

  return (...args) => {
    clearTimeout(timerId);
    timerId = setTimeout(() => fn(...args), delay);
  };
}

let content = '';
let dirty = false;
let lastEditedAt = 0;

async function saveDraft() {
  if (!dirty) return;

  dirty = false;
  console.log('Saving:', content);
}

const debouncedSave = debounce(saveDraft, 5000);

function onEditorChange(nextContent) {
  content = nextContent;
  dirty = true;
  lastEditedAt = Date.now();
  debouncedSave();
}

setInterval(() => {
  const inactiveFor = Date.now() - lastEditedAt;

  if (dirty && inactiveFor >= 5000) {
    saveDraft();
  }
}, 1000);
```

### Why Use Both

- Debounce handles the main inactivity behavior.
- Interval acts as a safety check.
- Interval can also show UI like `Unsaved`, `Saving...`, `Saved`.

### Edge Cases

- Do not save when content has not changed.
- Cancel or ignore old save responses.
- Handle browser tab close with `beforeunload` or `navigator.sendBeacon`.
- Retry failed saves.
- Show clear save status to the user.

---

## 7. Merge Intervals In A Stream

### Problem

Intervals arrive one by one. After each insertion, merge overlapping intervals and return the updated list.

### Core Idea

Keep the intervals sorted by start time. Insert the new interval in the correct place. Merge only neighbors that overlap.

### Minimal Code

```js
class IntervalStream {
  constructor() {
    this.intervals = [];
  }

  add(newInterval) {
    const result = [];
    let [start, end] = newInterval;
    let inserted = false;

    for (const [currentStart, currentEnd] of this.intervals) {
      if (currentEnd < start) {
        result.push([currentStart, currentEnd]);
      } else if (end < currentStart) {
        if (!inserted) {
          result.push([start, end]);
          inserted = true;
        }
        result.push([currentStart, currentEnd]);
      } else {
        start = Math.min(start, currentStart);
        end = Math.max(end, currentEnd);
      }
    }

    if (!inserted) result.push([start, end]);
    this.intervals = result;
    return this.intervals;
  }
}

const stream = new IntervalStream();
console.log(stream.add([1, 3])); // [[1, 3]]
console.log(stream.add([6, 9])); // [[1, 3], [6, 9]]
console.log(stream.add([2, 5])); // [[1, 5], [6, 9]]
```

### Complexity

For `n` existing intervals:

- Time per insertion: `O(n)`
- Space per insertion: `O(n)` for the new result array

If the interviewer insists on optimizing for many stream updates, discuss balanced trees or interval trees. But for typical frontend interviews, sorted-array merging is clear and acceptable.

### Edge Cases

- Touching intervals like `[1, 3]` and `[3, 5]` usually merge if endpoints are inclusive.
- Validate `start <= end`.
- Empty stream should return the new interval.
- Negative values work the same way.

---

## 8. Infinite Carousel Navigation

### Problem

Implement an infinite carousel with left/right navigation. It should wrap around circularly.

### Core Idea

Use modulo arithmetic. Moving right from the last item goes to index `0`. Moving left from index `0` goes to the last item.

### Minimal Code

```js
function createCarousel(items) {
  let index = 0;

  return {
    current() {
      return items[index];
    },
    next() {
      index = (index + 1) % items.length;
      return items[index];
    },
    prev() {
      index = (index - 1 + items.length) % items.length;
      return items[index];
    }
  };
}

const carousel = createCarousel(['A', 'B', 'C']);

console.log(carousel.current()); // A
console.log(carousel.next()); // B
console.log(carousel.next()); // C
console.log(carousel.next()); // A
console.log(carousel.prev()); // C
```

### Why Add `items.length` When Going Left

In JavaScript, `-1 % 3` is `-1`, not `2`. So we use:

```js
(index - 1 + items.length) % items.length
```

This keeps the index positive.

### Production Follow-Ups

- Use CSS transform for smooth animation.
- Support keyboard navigation.
- Add ARIA labels.
- Pause autoplay when the user hovers.
- Avoid layout shift by reserving fixed dimensions.

---

## 9. Trie For Autocomplete

### Problem

Build an autocomplete engine using a Trie that returns top `K` suggestions based on frequency of past search terms.

### Core Idea

A Trie stores words character by character. Prefix search becomes fast because we walk only the prefix length, then collect words below that node.

For top K suggestions, store frequency at terminal nodes and sort matching words by frequency.

### Minimal Code

```js
class TrieNode {
  constructor() {
    this.children = new Map();
    this.word = null;
    this.frequency = 0;
  }
}

class AutocompleteTrie {
  constructor() {
    this.root = new TrieNode();
  }

  insert(word) {
    let node = this.root;

    for (const char of word.toLowerCase()) {
      if (!node.children.has(char)) {
        node.children.set(char, new TrieNode());
      }
      node = node.children.get(char);
    }

    node.word = word;
    node.frequency += 1;
  }

  search(prefix, k) {
    let node = this.root;

    for (const char of prefix.toLowerCase()) {
      if (!node.children.has(char)) return [];
      node = node.children.get(char);
    }

    const matches = [];
    this.collect(node, matches);

    return matches
      .sort((a, b) => b.frequency - a.frequency || a.word.localeCompare(b.word))
      .slice(0, k)
      .map((item) => item.word);
  }

  collect(node, matches) {
    if (node.word) {
      matches.push({ word: node.word, frequency: node.frequency });
    }

    for (const child of node.children.values()) {
      this.collect(child, matches);
    }
  }
}

const trie = new AutocompleteTrie();
trie.insert('angular');
trie.insert('angular');
trie.insert('animation');
trie.insert('api');

console.log(trie.search('an', 2)); // ['angular', 'animation']
```

### Complexity

Let:

- `p` = prefix length
- `m` = number of matched words under the prefix
- `L` = total characters visited under that prefix

Then:

- Insert: `O(word length)`
- Find prefix node: `O(p)`
- Collect matches: `O(L)`
- Sort matches: `O(m log m)`

### Optimization Follow-Up

For high-scale autocomplete, store top K suggestions at every Trie node during insertion. Then search becomes closer to `O(p + k)`, but insertion becomes heavier because every prefix node must update its top suggestions.

---

## Final Interview Tips

For every question, use this answer structure:

1. State the core data structure or browser concept.
2. Write the simplest correct code.
3. Explain complexity.
4. Discuss edge cases.
5. Mention production improvements only after the base solution is done.

Most frontend interviews reward clear thinking more than over-engineered code. Start simple, then improve when asked.
