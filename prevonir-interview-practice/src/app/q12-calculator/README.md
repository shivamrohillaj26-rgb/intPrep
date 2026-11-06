# Q12 — Basic calculator (interview quick version)

Open `/q12`. Target: rewrite in **~20–25 minutes**.

This is the version most companies want: digits, four ops, `=`, clear, decimal — **no `eval`**, no `%` / `+/−`.

## Spec

- `0–9`, `.`, `+ − * /`, `=`, `C`
- Left-to-right when you press an operator (`2 + 3 + 4`)
- `5 / 0` → `Error`
- No PEMDAS unless they ask

## Only 3 pieces of state

```ts
display = '0';           // screen
previous: number | null; // left side
operator: Op | null;     // pending + - * /
fresh = false;           // next digit replaces screen
```

## Flow

```text
digit → append (or replace if fresh)
op    → if pending, compute first; store previous + op; fresh=true
=     → compute; clear previous/op; fresh=true
C     → reset all
```

## Skeleton to type from memory

```ts
pressDigit(d: string) {
  if (this.fresh || this.display === '0') {
    this.display = d;
    this.fresh = false;
  } else this.display += d;
}

pressOp(op: Op) {
  const cur = Number(this.display);
  if (this.previous != null && this.operator && !this.fresh) {
    const r = this.compute(this.previous, cur, this.operator);
    if (r == null) return this.reset('Error');
    this.display = String(r);
    this.previous = r;
  } else {
    this.previous = cur;
  }
  this.operator = op;
  this.fresh = true;
}

pressEquals() {
  if (this.previous == null || !this.operator) return;
  const r = this.compute(this.previous, Number(this.display), this.operator);
  if (r == null) return this.reset('Error');
  this.display = String(r);
  this.previous = null;
  this.operator = null;
  this.fresh = true;
}
```

## Spoken (25s)

> I keep the screen string, the previous number, and the pending operator. Digits append until I press an operator — then I store the value and wait for the next number. If there’s already a pending op, I evaluate left-to-right first. Equals finishes the pending op. No eval — just a small compute helper.

## Practice

- [ ] Code from memory in one component  
- [ ] Trace `12 + 3 =` and `2 + 3 + 4`  
- [ ] Handle divide by zero  
