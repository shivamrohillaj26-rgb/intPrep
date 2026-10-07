# LRU Cache Implementation — Interview Ready Guide

---

## 1. What Is An LRU Cache?

**LRU = Least Recently Used**

An LRU cache stores a limited number of items. When capacity is full and a new item must be inserted, it removes the item that was used least recently.

Interview one-liner:

> LRU cache keeps recent items and evicts the oldest-used item when capacity is exceeded.

---

## 2. Why It Matters

Used in:

- browser memory caches
- API response caches
- image/thumbnail caches
- editor state / computed result caches

Goal:

- fast `get` and `put`
- bounded memory

Ideal complexity:

- `get`: `O(1)`
- `put`: `O(1)`

---

## 3. Required Operations

```text
get(key) -> value (and mark key as most recently used)
put(key, value) -> insert/update (and mark as most recently used)
                 -> if over capacity, remove least recently used
```

---

## 4. Data Structure Choice

To get O(1) operations, use:

1. **Map** (or HashMap) for key → node lookup
2. **Doubly Linked List** for recency order

Why?

- Map: O(1) access by key
- Doubly linked list: O(1) move-to-front / remove node when you already have node reference

In JavaScript interviews, `Map` preserves insertion order, so a simpler Map-only LRU is also accepted often.

---

## 5. Simple Interview Implementation Using `Map` (Recommended First)

JavaScript `Map` keeps insertion order.

Idea:

- Most recently used = newest inserted/updated entry
- On `get`/`put`, delete and re-set key to move it to the end
- Least recently used = first key in Map

```js
class LRUCache {
  constructor(capacity) {
    this.capacity = capacity;
    this.map = new Map();
  }

  get(key) {
    if (!this.map.has(key)) return -1;

    const value = this.map.get(key);
    // move to most recently used
    this.map.delete(key);
    this.map.set(key, value);
    return value;
  }

  put(key, value) {
    if (this.map.has(key)) {
      this.map.delete(key);
    }

    this.map.set(key, value);

    if (this.map.size > this.capacity) {
      // first key is least recently used
      const lruKey = this.map.keys().next().value;
      this.map.delete(lruKey);
    }
  }
}
```

---

## 6. Dry Run (Very Important In Interview)

```js
const cache = new LRUCache(2);

cache.put(1, 1); // map: {1=1}
cache.put(2, 2); // map: {1=1, 2=2}
cache.get(1);    // returns 1; map becomes {2=2, 1=1}
cache.put(3, 3); // capacity full, remove LRU key 2; map: {1=1, 3=3}
cache.get(2);    // -1
cache.put(4, 4); // remove LRU key 1; map: {3=3, 4=4}
cache.get(1);    // -1
cache.get(3);    // 3; map: {4=4, 3=3}
cache.get(4);    // 4; map: {3=3, 4=4}
```

Practice explaining this out loud.

---

## 7. Why Re-insert On Get?

Because access updates recency.

```js
get(key):
  value = map.get(key)
  map.delete(key)
  map.set(key, value) // now most recent
```

Without this, recently read items may be wrongly evicted.

---

## 8. Classic Doubly Linked List Version (If Asked For DSA Depth)

```js
class Node {
  constructor(key, value) {
    this.key = key;
    this.value = value;
    this.prev = null;
    this.next = null;
  }
}

class LRUCache {
  constructor(capacity) {
    this.capacity = capacity;
    this.map = new Map();

    // dummy head/tail to avoid edge cases
    this.head = new Node(0, 0);
    this.tail = new Node(0, 0);
    this.head.next = this.tail;
    this.tail.prev = this.head;
  }

  _remove(node) {
    node.prev.next = node.next;
    node.next.prev = node.prev;
  }

  _addToFront(node) {
    node.next = this.head.next;
    node.prev = this.head;
    this.head.next.prev = node;
    this.head.next = node;
  }

  get(key) {
    if (!this.map.has(key)) return -1;

    const node = this.map.get(key);
    this._remove(node);
    this._addToFront(node);
    return node.value;
  }

  put(key, value) {
    if (this.map.has(key)) {
      const node = this.map.get(key);
      node.value = value;
      this._remove(node);
      this._addToFront(node);
      return;
    }

    const node = new Node(key, value);
    this.map.set(key, node);
    this._addToFront(node);

    if (this.map.size > this.capacity) {
      const lru = this.tail.prev;
      this._remove(lru);
      this.map.delete(lru.key);
    }
  }
}
```

List order:

```text
head <-> most recent ... least recent <-> tail
```

---

## 9. Complexity

| Approach | get | put | space |
|---|---|---|---|
| Map insertion-order trick | O(1) avg | O(1) avg | O(capacity) |
| HashMap + DLL | O(1) | O(1) | O(capacity) |

---

## 10. Edge Cases

- capacity = 1
- get missing key → `-1` (or `undefined`, ask interviewer)
- put existing key → update value + recency
- repeated gets should keep key fresh
- capacity must be > 0

```js
const cache = new LRUCache(1);
cache.put(1, 10);
cache.put(2, 20); // evicts 1
cache.get(1); // -1
```

---

## 11. Frontend Example

Cache API responses for recently visited user profiles:

```js
const userCache = new LRUCache(50);

async function getUser(id) {
  const cached = userCache.get(id);
  if (cached !== -1) return cached;

  const user = await fetch('/users/' + id).then((r) => r.json());
  userCache.put(id, user);
  return user;
}
```

---

## 12. Common Interview Questions

**Q: Why not use only array?**  
A: Finding/removing would be O(n).

**Q: Why Map works in JS?**  
A: Because Map preserves insertion order and supports O(1) set/delete/get.

**Q: What does “recently used” mean?**  
A: Any `get` or `put` on that key updates recency.

**Q: Difference between LRU and FIFO?**  
A: FIFO evicts oldest inserted; LRU evicts oldest accessed.

---

## 13. Spoken Answer (60 sec)

> An LRU cache evicts the least recently used item when full. I implement it with a JavaScript Map because Map preserves insertion order. On get or put I delete and re-insert the key to mark it most recent. When size exceeds capacity, I delete the first key in the Map, which is the least recently used. This gives average O(1) get and put. If asked for lower-level DSA, I use a HashMap plus doubly linked list.

---

## 14. What To Write First In Interview

Start with Map version (fast to code, clear to explain).  
Offer DLL version if they ask for O(1) “classic” design.

---

## 15. Practice Checklist

- [ ] Implement Map-based LRU from memory
- [ ] Dry-run capacity 2 example
- [ ] Explain why delete+set updates recency
- [ ] Mention hashmap + DLL alternative
- [ ] Discuss one frontend caching use case
