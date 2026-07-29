# JavaScript Type Coercion — Interview Ready Guide

This is one of the most asked JS interview topics, especially as **output questions**.

You will learn:

- What coercion is
- Implicit vs explicit conversion
- Truthy / falsy
- `==` vs `===`
- `+` vs other math operators
- Object → primitive (`ToPrimitive`)
- Classic tricky outputs with full explanations

---

## 1. What Is Type Coercion?

**Type coercion** means JavaScript automatically converts a value from one type to another when an operation needs it.

Example:

```js
console.log('5' + 1); // "51"  (number -> string)
console.log('5' - 1); // 4     (string -> number)
```

Interview one-liner:

> Type coercion is automatic type conversion performed by JavaScript during operations or comparisons. Prefer explicit conversion and `===` to avoid surprises.

---

## 2. Implicit vs Explicit Conversion

### Implicit (coercion)

JS converts for you:

```js
1 + '2';     // "12"
'6' * '2';    // 12
if ('hello')  // string used as boolean
```

### Explicit (you convert)

```js
Number('5');     // 5
String(5);       // "5"
Boolean(1);      // true
!!value;         // boolean cast
+'5';            // 5 (unary plus)
```

Interview preference:

> I prefer explicit conversion for readability, and `===` for comparisons.

---

## 3. JavaScript Types Quick Recap

Primitives:

- `string`
- `number`
- `bigint`
- `boolean`
- `undefined`
- `symbol`
- `null` (special primitive; `typeof null === "object"` is a historical bug)

Non-primitive:

- `object` (includes arrays, functions, dates, etc.)

---

## 4. Falsy vs Truthy (Memorize Exact List)

### Exactly falsy values

```text
false
0
-0
0n          // BigInt zero
""          // empty string
null
undefined
NaN
```

Everything else is **truthy**, including:

```js
Boolean([])        // true
Boolean({})        // true
Boolean('0')       // true
Boolean('false')   // true
Boolean(function(){}) // true
```

Common trap:

```js
if ([]) {
  console.log('yes'); // prints, because [] is truthy
}
```

But:

```js
[] == false; // true  (because of == coercion rules)
```

So truthiness and `== false` are different concepts.

---

## 5. Explicit Conversion Tables

### To Number (`Number(value)` / unary `+`)

| Value | Becomes |
|---|---|
| `undefined` | `NaN` |
| `null` | `0` |
| `true` / `false` | `1` / `0` |
| `""` or `"   "` | `0` |
| `"123"` | `123` |
| `"12px"` | `NaN` |
| `[]` | `0` |
| `[5]` | `5` |
| `[1,2]` | `NaN` |
| `{}` | `NaN` |

```js
Number(null);      // 0
Number(undefined); // NaN
Number('');        // 0
Number('  ');      // 0
Number([]);        // 0
```

### To String (`String(value)`)

```js
String(null);      // "null"
String(undefined); // "undefined"
String(true);      // "true"
String([1, 2]);    // "1,2"
String([]);        // ""
String({});        // "[object Object]"
```

### To Boolean (`Boolean(value)` / `!!value`)

Only the falsy list becomes `false`. Everything else `true`.

---

## 6. `==` vs `===` (Core Interview Topic)

### `===` Strict equality

- No coercion
- Type must match
- Then values compared

```js
5 === '5';     // false
null === undefined; // false
0 === false;   // false
```

Exception-like quirks still exist:

```js
NaN === NaN;   // false
+0 === -0;     // true
```

### `==` Loose equality (Abstract Equality)

Does coercion using a rule table.

#### High-level algorithm (memorize this)

1. If same type → compare like `===` (with NaN rule)
2. `null == undefined` → `true` (and only each other in practice for this pair)
3. number vs string → convert string to number
4. boolean vs anything → convert boolean to number, then compare again
5. object vs primitive → convert object to primitive (`ToPrimitive`), then compare again

---

## 7. Important `==` Results To Memorize

```js
null == undefined; // true
null == 0;         // false
null == false;     // false
undefined == 0;    // false

5 == '5';           // true
0 == '';           // true   ('' -> 0)
0 == '0';          // true
0 == '   ';        // true   (whitespace -> 0)

true == 1;         // true
false == 0;        // true
true == '1';       // true
true == 'true';    // false  ('true' -> NaN)

[] == '';          // true   ([] -> '')
[] == 0;           // true   ([] -> '' -> 0)
[0] == 0;          // true
[1] == 1;          // true
[1,2] == '1,2';    // true

[] == false;       // true
{} == false;       // false
```

One safe idiomatic use of `==`:

```js
if (x == null) {
  // true when x is null OR undefined
}
```

Otherwise prefer `===`.

---

## 8. Operator Coercion Rules

### `+` is special

If either side is string (after object-to-primitive), `+` does **concatenation**.  
Otherwise it does numeric addition.

```js
1 + 2;         // 3
'1' + 2;       // "12"
1 + '2';       // "12"
'1' + true;    // "1true"
1 + true;      // 2
1 + null;      // 1   (null -> 0)
1 + undefined; // NaN (undefined -> NaN)
```

### `-`, `*`, `/`, `%` always go numeric

```js
'5' - 2;   // 3
'5' * '2'; // 10
'5' / '2'; // 2.5
'5px' - 1; // NaN
```

### Unary `+` and `-`

```js
+'42';   // 42
+true;  // 1
+[];    // 0
+'';    // 0
-true;  // -1
```

### `!` and `!!`

```js
!0;      // true
!!'hi';  // true
!!'';   // false
!![];    // true
```

---

## 9. Object To Primitive (`ToPrimitive`)

When JS needs an object as a primitive, it roughly does:

1. If `Symbol.toPrimitive` exists → call it
2. Else depending on hint:
   - number-ish: `valueOf()` then `toString()`
   - string-ish: `toString()` then `valueOf()`

Arrays:

```js
[].toString();      // ""
[1,2].toString();   // "1,2"
[1].valueOf();      // [1] (object), so toString often used next
```

Plain objects:

```js
({}).toString(); // "[object Object]"
```

Custom example:

```js
const obj = {
  valueOf() { return 10; },
  toString() { return 'ten'; }
};

console.log(obj + 1);     // 11   (valueOf used for +)
console.log(String(obj)); // "ten"
```

With `Symbol.toPrimitive`:

```js
const obj = {
  [Symbol.toPrimitive](hint) {
    if (hint === 'number') return 10;
    if (hint === 'string') return 'ten';
    return true;
  }
};

console.log(+obj);       // 10
console.log(`${obj}`);   // ten
console.log(obj + '');   // "true" or depending default hint path
```

---

## 10. Classic Tricky Output Questions

### Q1 — `+` vs `-`

```js
console.log(1 + '2'); // "12"
console.log('3' - 1); // 2
console.log('3' * '2'); // 6
```

Why: `+` concatenates with string; `-`/`*` force numbers.

---

### Q2 — null / undefined

```js
console.log(null == undefined); // true
console.log(null === undefined); // false
console.log(null == 0); // false
console.log(null + 1); // 1
console.log(undefined + 1); // NaN
```

Why:

- `==` special-cases null/undefined together
- numeric: `null -> 0`, `undefined -> NaN`

---

### Q3 — empty array weirdness

```js
console.log([] + []); // ""
console.log([] + {}); // "[object Object]"
console.log([] == 0); // true
console.log(Boolean([])); // true
```

Why:

- `[]` stringifies to `""`
- `{}` stringifies to `"[object Object]"`
- `[] == 0` becomes `"" == 0` → `0 == 0`
- truthiness of `[]` is still true

---

### Q4 — famous `{} + []` parsing trap

```js
{} + []; // often 0 in console / some contexts
```

Why people get confused:

- leading `{}` can be parsed as an **empty block**, not object literal
- remaining expression becomes `+[]` → `0`

Safer:

```js
({} + []); // "[object Object]"
```

Also:

```js
console.log({} + []); // "[object Object]" in many engines via console.log args
```

Know the parsing story for interviews.

---

### Q5 — `[] == ![]`

```js
console.log([] == ![]); // true
```

Step-by-step:

1. `![]` → `false` (because `[]` is truthy)
2. `[] == false`
3. boolean → number: `false -> 0`
4. object → primitive: `[] -> "" -> 0`
5. `0 == 0` → true

---

### Q6 — true with strings

```js
console.log(true == '1');    // true
console.log(true == 'true'); // false
```

Why:

- `true -> 1`, `'1' -> 1`
- `'true' -> NaN`

---

### Q7 — NaN traps

```js
console.log(NaN === NaN); // false
console.log(Number.isNaN(NaN)); // true
console.log(isNaN('hello')); // true  (coerces first)
console.log(Number.isNaN('hello')); // false
```

Prefer `Number.isNaN`.

---

### Q8 — typeof quirks

```js
typeof null;      // "object"  (bug/legacy)
typeof NaN;       // "number"
typeof [];        // "object"
typeof (()=>{});  // "function"
```

---

### Q9 — || and ?? defaults

```js
0 || 10;        // 10   (0 falsy)
0 ?? 10;        // 0    (nullish only)
'' || 'default'; // "default"
'' ?? 'default'; // ""
null ?? 'x';    // "x"
```

Interview line:

> Use `??` when `0` or `''` are valid values. Use `||` only if any falsy should fallback.

---

### Q10 — array/object equality is reference

```js
console.log([] === []); // false
console.log({} === {}); // false

const a = [];
console.log(a === a); // true
```

`==` / `===` do not deep-compare objects.

---

### Q11 — chained weirdness

```js
console.log([] + 1);     // "1"
console.log([[]] + 1);   // "1"
console.log(true + true); // 2
console.log('' - 1);     // -1
```

---

### Q12 — template / string cast

```js
console.log(`${[1, 2]}`); // "1,2"
console.log(`${{}}`);     // "[object Object]"
```

---

## 11. How To Solve Coercion Output Questions (Method)

Use this checklist in interviews:

1. Identify operator (`+`, `-`, `==`, `===`, `if`, `||`, `??`)
2. Ask: does this force string, number, or boolean?
3. Convert step by step on paper
4. For objects/arrays, apply `toString` / `valueOf`
5. For `==`, apply the abstract equality rules in order
6. Watch parsing traps (`{} + []`)

Template:

```text
Expression: [] == false
Step1: false -> 0
Step2: [] -> "" -> 0
Step3: 0 == 0 -> true
```

---

## 12. Best Practices (What To Say You Use In Code)

1. Prefer `===` and `!==`
2. Allowed exception: `x == null` for null/undefined check
3. Prefer `??` over `||` for defaults when 0/'' valid
4. Convert explicitly: `Number(x)`, `String(x)`, `Boolean(x)`
5. Check arrays with `Array.isArray`
6. Check NaN with `Number.isNaN`
7. Avoid relying on `==` puzzles in production logic

---

## 13. `Object.is` vs `===`

```js
Object.is(NaN, NaN); // true
Object.is(+0, -0);   // false
+0 === -0;           // true
NaN === NaN;         // false
```

`Object.is` is SameValue comparison. Rarely needed daily, good senior mention.

---

## 14. Practice Set (Predict Before Opening)

### P1

```js
console.log(1 + 2 + '3');
console.log('1' + 2 + 3);
```

<details>
<summary>Answer</summary>

```text
"33"
"123"
```

Left-to-right: `(1+2)+"3" = "33"`; `"1"+2+3 = "123"`.
</details>

### P2

```js
console.log([] == false);
console.log([] ? 't' : 'f');
```

<details>
<summary>Answer</summary>

```text
true
t
```
</details>

### P3

```js
console.log(null || 'a');
console.log(null ?? 'a');
console.log(0 || 'a');
console.log(0 ?? 'a');
```

<details>
<summary>Answer</summary>

```text
a
a
a
0
```
</details>

### P4

```js
console.log([1,2] == '1,2');
console.log([1,2] === '1,2');
```

<details>
<summary>Answer</summary>

```text
true
false
```
</details>

### P5

```js
console.log(false == '0');
console.log(false === '0');
```

<details>
<summary>Answer</summary>

```text
true
false
```

`false -> 0`, `'0' -> 0`.
</details>

---

## 15. Common Interview Q&A

**Q: What is type coercion?**  
A: Automatic conversion of values between types during operations/comparisons.

**Q: Difference between `==` and `===`?**  
A: `==` coerces types using abstract equality rules; `===` never coerces and requires same type.

**Q: Why is `[]` truthy but `[] == false` true?**  
A: Truthiness checks boolean conversion (`Boolean([]) === true`). `==` uses numeric/string coercion path that becomes `0 == 0`.

**Q: Why prefer `===`?**  
A: Predictable comparisons without hidden conversions.

**Q: When is `==` acceptable?**  
A: Common idiom `x == null` to detect null or undefined.

**Q: Why `typeof null === "object"`?**  
A: Legacy bug in JS; null is still a primitive.

---

## 16. Spoken Answer (45–60 sec)

> Type coercion is JavaScript converting values between types automatically. It happens in operators like plus/minus and in loose equality. I use strict equality by default because == follows a multi-step coercion algorithm that creates surprises, like empty arrays equaling two falsey-looking values while still being truthy in if-checks. Plus is special because it concatenates when a string is involved, while other math operators force numbers. For production code I prefer explicit Number/String/Boolean conversions and nullish checks with ?? or x == null.

---

## 17. Cheat Sheet

```text
Falsy: false, 0, -0, 0n, "", null, undefined, NaN
Everything else truthy ([] and {} included)

===  no coercion
==   coercion table
x == null  => null or undefined

+      string concat if either side string-like
-*/%   numeric conversion

null -> 0 (number), undefined -> NaN
[] -> "" -> 0 in many == / numeric paths
{} -> "[object Object]"

Prefer:
===, ??, Number.isNaN, explicit casts
```

---

## 18. Practice Checklist

- [ ] List all falsy values from memory
- [ ] Explain `==` algorithm in 5 steps
- [ ] Predict `1+'2'`, `'3'-1`, `[]==0`, `[]?1:0`
- [ ] Explain `[] == ![]`
- [ ] Explain `||` vs `??`
- [ ] Explain `typeof null`
- [ ] Solve 10 output questions without running code
