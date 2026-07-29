// Runnable examples for the questions in Questions1.txt.
// Run with: node examples.js

function debounce(fn, delay) {
  let timerId;
  return function debounced(...args) {
    clearTimeout(timerId);
    timerId = setTimeout(() => fn.apply(this, args), delay);
  };
}

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

function deepClone(value, seen = new WeakMap()) {
  if (value === null || typeof value !== 'object') return value;
  if (typeof value === 'function') return value;
  if (value instanceof Date) return new Date(value.getTime());
  if (seen.has(value)) return seen.get(value);

  if (Array.isArray(value)) {
    const copy = [];
    seen.set(value, copy);
    for (const item of value) copy.push(deepClone(item, seen));
    return copy;
  }

  const copy = {};
  seen.set(value, copy);
  for (const key of Reflect.ownKeys(value)) {
    copy[key] = deepClone(value[key], seen);
  }
  return copy;
}

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

class TaskScheduler {
  constructor() {
    this.tasks = new Map();
    this.nextId = 1;
  }

  schedule(callback, delay) {
    const id = this.nextId++;
    const task = {
      callback,
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
    this.tasks.delete(id);
    return true;
  }
}

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

function createCarousel(items) {
  let index = 0;
  return {
    current: () => items[index],
    next: () => {
      index = (index + 1) % items.length;
      return items[index];
    },
    prev: () => {
      index = (index - 1 + items.length) % items.length;
      return items[index];
    }
  };
}

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
      if (!node.children.has(char)) node.children.set(char, new TrieNode());
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
    if (node.word) matches.push({ word: node.word, frequency: node.frequency });
    for (const child of node.children.values()) this.collect(child, matches);
  }
}

console.log('Longest substring:', lengthOfLongestSubstring('abcabcbb'));

const lazyLoad = createLazyLoader(['A', 'B', 'C', 'D', 'E'], 2);
console.log('Lazy pages:', lazyLoad(), lazyLoad(), lazyLoad());

const user = { name: 'Shivam', createdAt: new Date() };
user.self = user;
const cloned = deepClone(user);
console.log('Deep clone cycle preserved:', cloned.self === cloned);

const stream = new IntervalStream();
console.log('Intervals:', stream.add([1, 3]), stream.add([2, 6]), stream.add([8, 10]));

const carousel = createCarousel(['Angular', 'JavaScript', 'RxJS']);
console.log('Carousel:', carousel.current(), carousel.next(), carousel.next(), carousel.next());

const trie = new AutocompleteTrie();
['angular', 'angular', 'animation', 'api'].forEach((word) => trie.insert(word));
console.log('Trie suggestions:', trie.search('an', 2));

const debouncedLog = debounce((value) => console.log('Debounced:', value), 100);
debouncedLog('a');
debouncedLog('angular');

const scheduler = new TaskScheduler();
const taskId = scheduler.schedule(() => console.log('Scheduled task executed'), 200);
setTimeout(() => scheduler.pause(taskId), 50);
setTimeout(() => scheduler.resume(taskId), 150);
