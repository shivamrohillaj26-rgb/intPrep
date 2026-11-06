# Generate Valid Parentheses — Interview Ready

**Problem:** Given `n` pairs of parentheses, return **all** strings of well-formed parentheses.

Validate-only is in [DSA_FRONTEND_JS.md](./DSA_FRONTEND_JS.md) §3. This is the **generate** follow-up (backtracking).

---

## 1. Example

```text
n = 1 → ["()"]
n = 2 → ["(())", "()()"]
n = 3 → ["((()))", "(()())", "(())()", "()(())", "()()()"]
```

Order doesn’t matter unless they ask for lexicographic.

---

## 2. One-liner

> Backtracking: build a string keeping counts of open and close used. I can add `(` while open &lt; n, and `)` while close &lt; open. When length is `2n`, push a copy.

---

## 3. Why those rules work

A string of `(` and `)` is valid iff:

1. Count(`(`) === Count(`)`) at the end (= `n` each)
2. In every prefix, Count(`(`) ≥ Count(`)`) (never more closes)

So while building:

| Move | When allowed |
|---|---|
| Add `(` | `openUsed < n` |
| Add `)` | `closeUsed < openUsed` |

That’s all — no need to validate with a stack at the end if you never break the invariant.

---

## 4. Interview-ready code

```js
function generateParenthesis(n) {
  const result = [];

  function dfs(path, open, close) {
    if (path.length === 2 * n) {
      result.push(path);
      return;
    }

    if (open < n) {
      dfs(path + '(', open + 1, close);
    }
    if (close < open) {
      dfs(path + ')', open, close + 1);
    }
  }

  dfs('', 0, 0);
  return result;
}

console.log(generateParenthesis(3));
```

### Array path (avoids string concat churn — optional)

```js
function generateParenthesis(n) {
  const result = [];
  const path = [];

  function dfs(open, close) {
    if (path.length === 2 * n) {
      result.push(path.join(''));
      return;
    }
    if (open < n) {
      path.push('(');
      dfs(open + 1, close);
      path.pop();
    }
    if (close < open) {
      path.push(')');
      dfs(open, close + 1);
      path.pop();
    }
  }

  dfs(0, 0);
  return result;
}
```

Either is fine in interviews. String concat is clearer for small `n`.

---

## 5. Complexity

| | |
|---|---|
| Time / space | Catalan number \(C_n\) solutions; each length `2n` |
| \(C_n\) grows | ~ \(4^n / (n^{1.5}\sqrt{\pi})\) — exponential |

Say: “Output size is the Catalan number; we generate each valid string once.”

```text
C_0=1, C_1=1, C_2=2, C_3=5, C_4=14, ...
```

---

## 6. Trace `n = 2`

```text
"" 
 ├─ "("        open=1
 │   ├─ "(("     open=2
 │   │   └─ "(()"   close=1
 │   │       └─ "(())"  ✓
 │   └─ "()"     close=1
 │       └─ "()("  open=2
 │           └─ "()()" ✓
```

Invalid paths never explored (e.g. starting with `)`).

---

## 7. Follow-ups

| Follow-up | Answer |
|---|---|
| Only count how many | DP / Catalan formula — don’t generate |
| Generate with `[]` `{}` too | Multi-type backtracking + stack validity |
| Related: valid path counting | Same Catalan family |
| Iterative? | BFS level by level with same rules |

---

## 8. Spoken answers

### 30s

> I use backtracking with open and close counters. I add an open paren while I still have pairs left, and a close only when it wouldn’t exceed opens. When the string hits length 2n I collect it. That guarantees every string is valid and I don’t generate invalid ones.

### 45s + complexity

> The number of results is the nth Catalan number, so time is proportional to that times 2n to write each string. For interviews n is tiny — 8 or less. This is different from the stack-based “is valid” check; here we construct only legal prefixes.

---

## 9. Practice checklist

- [ ] Write generate from memory in &lt; 8 min  
- [ ] Trace n=2 on paper  
- [ ] Name Catalan / exponential output  
- [ ] Contrast with validate-parentheses stack problem  

---

## Related

| Topic | File |
|---|---|
| Valid parentheses (check) | [DSA_FRONTEND_JS.md](./DSA_FRONTEND_JS.md) §3 |
| Other coding classics | [DSA_CODING_ROUND_CLASSICS.md](./DSA_CODING_ROUND_CLASSICS.md) |
