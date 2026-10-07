# Frontend Coding Round Classics (15) — Interview Ready

High-frequency array/string problems from recent “most asked FE coding” lists.  
Valid parentheses already covered in [DSA_FRONTEND_JS.md](./DSA_FRONTEND_JS.md) §3 — linked below.

**How to use:** For each: restate → example → approach → code → complexity → say aloud.

---

## 1. Product of array except self

**Problem:** For each index `i`, result[i] = product of all nums except `nums[i]`. No division (follow-up).

```js
// [1,2,3,4] → [24,12,8,6]
function productExceptSelf(nums) {
  const n = nums.length;
  const out = Array(n).fill(1);
  let left = 1;
  for (let i = 0; i < n; i++) {
    out[i] = left;
    left *= nums[i];
  }
  let right = 1;
  for (let i = n - 1; i >= 0; i--) {
    out[i] *= right;
    right *= nums[i];
  }
  return out;
}
```

**Complexity:** O(n) time, O(1) extra (output doesn’t count).  
**Say:** Prefix products from left, then multiply suffix from right.

---

## 2. Word pattern (isomorphic mapping)

**Problem:** Does `pattern` match `s` with bijection? (`"abba"` ↔ `"dog cat cat dog"`)

```js
function wordPattern(pattern, s) {
  const words = s.split(' ');
  if (pattern.length !== words.length) return false;
  const p2w = new Map();
  const w2p = new Map();
  for (let i = 0; i < pattern.length; i++) {
    const p = pattern[i];
    const w = words[i];
    if (p2w.has(p) && p2w.get(p) !== w) return false;
    if (w2p.has(w) && w2p.get(w) !== p) return false;
    p2w.set(p, w);
    w2p.set(w, p);
  }
  return true;
}
```

**Say:** Two maps — pattern→word and word→pattern — so mapping is 1:1.

---

## 3. Evens to front, odds to back

**Problem:** Stable-ish partition: all evens before odds (order within groups optional — ask).

```js
function evenThenOdd(nums) {
  // stable: filter (simple interview OK)
  return [...nums.filter((n) => n % 2 === 0), ...nums.filter((n) => n % 2 !== 0)];
}

// two pointers in-place (order not stable)
function evenThenOddInPlace(nums) {
  let i = 0;
  for (let j = 0; j < nums.length; j++) {
    if (nums[j] % 2 === 0) {
      [nums[i], nums[j]] = [nums[j], nums[i]];
      i++;
    }
  }
  return nums;
}
```

---

## 4. Valid / balanced brackets

→ [DSA_FRONTEND_JS.md](./DSA_FRONTEND_JS.md) §3 (stack + map).

```js
// quick recall
function isValid(s) {
  const stack = [];
  const pair = { ')': '(', ']': '[', '}': '{' };
  for (const ch of s) {
    if (ch === '(' || ch === '[' || ch === '{') stack.push(ch);
    else if (stack.pop() !== pair[ch]) return false;
  }
  return stack.length === 0;
}
```

---

## 5. All subsets (power set)

```js
function subsets(nums) {
  const res = [[]];
  for (const n of nums) {
    const more = res.map((subset) => [...subset, n]);
    res.push(...more);
  }
  return res;
}
// [1,2] → [[],[1],[2],[1,2]]
```

**Complexity:** O(n · 2ⁿ).  
**Say:** For each number, duplicate existing subsets and append it.

---

## 6. Remove vowels

```js
function removeVowels(s) {
  return s.replace(/[aeiouAEIOU]/g, '');
}
// or filter chars
```

---

## 7. Count subarrays with sum = target

```js
function subarraySum(nums, k) {
  let count = 0;
  let sum = 0;
  const freq = new Map([[0, 1]]); // prefixSum → count
  for (const n of nums) {
    sum += n;
    count += freq.get(sum - k) || 0;
    freq.set(sum, (freq.get(sum) || 0) + 1);
  }
  return count;
}
```

**Say:** Prefix sums + Map: if `sum - k` seen, a subarray ending here equals `k`.

---

## 8. Longest word in a string

```js
function longestWord(sentence) {
  return sentence
    .trim()
    .split(/\s+/)
    .reduce((best, w) => (w.length > best.length ? w : best), '');
}
```

Tie-break: ask — first longest vs last.

---

## 9. 3Sum — unique triplets → 0

**GOC:** Map solution is O(n²) **time** and O(n) **space**. They wanted **O(n²) time, O(1) extra space** → sort + two pointers. Full interview write-up: [DSA_FRONTEND_JS.md](./DSA_FRONTEND_JS.md) **§1b**.

```js
function threeSum(nums) {
  nums.sort((a, b) => a - b); // numeric sort — not default JS sort
  const res = [];
  for (let i = 0; i < nums.length - 2; i++) {
    if (nums[i] > 0) break;
    if (i > 0 && nums[i] === nums[i - 1]) continue; // skip duplicate anchors
    let l = i + 1;
    let r = nums.length - 1;
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

**Complexity:** O(n²) time. **O(1) extra** besides the result (no HashMap). JS `sort` scratch doesn’t count in interview-speak.

**Do not:** skip with `nums[i] === nums[i+1]` on the outer loop — you drop `[-1,-1,2]`.

---

## 10. Run-length compress (`aabbb` → `a2b3`)

```js
function compress(s) {
  if (!s) return '';
  let out = '';
  let i = 0;
  while (i < s.length) {
    let j = i;
    while (j < s.length && s[j] === s[i]) j++;
    const count = j - i;
    out += s[i] + (count > 1 ? String(count) : ''); // or always count — ask
    // problem said aabbb → a2b3 so always include count:
    // out += s[i] + String(count);
    i = j;
  }
  return out;
}

function compressAlwaysCount(s) {
  let out = '';
  let i = 0;
  while (i < s.length) {
    let j = i;
    while (j < s.length && s[j] === s[i]) j++;
    out += s[i] + String(j - i);
    i = j;
  }
  return out;
}
// aabbb → a2b3
```

Use `compressAlwaysCount` for the stated example.

---

## 11. Reverse array without `reverse()`

```js
function reverseArr(arr) {
  const a = [...arr]; // or in-place on copy policy
  let l = 0;
  let r = a.length - 1;
  while (l < r) {
    [a[l], a[r]] = [a[r], a[l]];
    l++;
    r--;
  }
  return a;
}
```

---

## 12. Remove chars of string B from string A

```js
function removeChars(a, b) {
  const ban = new Set(b);
  return [...a].filter((ch) => !ban.has(ch)).join('');
}
```

---

## 13. Longest increasing subsequence (LIS)

Length only (classic DP O(n²)):

```js
function lengthOfLIS(nums) {
  const n = nums.length;
  if (!n) return 0;
  const dp = Array(n).fill(1);
  let best = 1;
  for (let i = 1; i < n; i++) {
    for (let j = 0; j < i; j++) {
      if (nums[j] < nums[i]) dp[i] = Math.max(dp[i], dp[j] + 1);
    }
    best = Math.max(best, dp[i]);
  }
  return best;
}
```

**Say:** `dp[i]` = best LIS ending at i. Mention O(n log n) patience sorting if they ask optimize.

---

## 14. String rotation

**Problem:** Is `s2` a rotation of `s1`? (`waterbottle` / `erbottlewat`)

```js
function isRotation(s1, s2) {
  if (s1.length !== s2.length || !s1.length) return s1 === s2;
  return (s1 + s1).includes(s2);
}
```

**Say:** All rotations of `s1` appear as substrings of `s1+s1`.

---

## 15. Count pairs with difference `k`

```js
function countKDifference(nums, k) {
  const freq = new Map();
  let count = 0;
  for (const n of nums) {
    count += freq.get(n - k) || 0;
    count += freq.get(n + k) || 0;
    freq.set(n, (freq.get(n) || 0) + 1);
  }
  return count;
}
```

If pairs are unordered `{i,j}` once, counting while scanning can double — clarify. Unordered unique pairs:

```js
function countKDifferenceUnordered(nums, k) {
  const freq = new Map();
  for (const n of nums) freq.set(n, (freq.get(n) || 0) + 1);
  let count = 0;
  for (const [n, c] of freq) {
    if (k === 0) count += (c * (c - 1)) / 2;
    else if (freq.has(n + k)) count += c * freq.get(n + k);
  }
  return count;
}
```

---

## Pattern map (these 15)

| # | Pattern |
|---|---|
| 1 | Prefix / suffix |
| 2, 15 | Hash Map |
| 3, 11 | Two pointers |
| 4 | Stack |
| 5 | Cascading / backtrack idea |
| 6, 8, 10, 12 | String scan |
| 7 | Prefix sum + Map |
| 9 | Sort + two pointers |
| 13 | DP |
| 14 | String trick |

---

## Spoken opener

> I’ll clarify I/O and edge cases, pick the pattern — map, two pointers, stack, prefix, or DP — code cleanly, then trace one example and state complexity.

---

## Practice checklist

- [ ] productExceptSelf without division  
- [ ] wordPattern two maps  
- [ ] 3Sum skip duplicates  
- [ ] subarraySum prefix Map  
- [ ] isRotation via `s+s`  
- [ ] LIS O(n²) explanation  
- [ ] compress `a2b3`  
