# Why Not Call Functions in Templates — Interview Ready Guide

Prompt:

> Why shouldn’t we call functions directly in templates like `{{ getName() }}`?

Related: [ANGULAR_CHANGE_DETECTION_ONPUSH_ZONELESS.md](./ANGULAR_CHANGE_DETECTION_ONPUSH_ZONELESS.md) · [ANGULAR_SIGNALS.md](./ANGULAR_SIGNALS.md)

---

## 1. One-liner

> Template expressions re-run whenever change detection checks the view. A function call like `{{ getName() }}` can run **many times per second** (every CD cycle), even if inputs didn’t change — wasteful and easy to hide bugs (new object refs, HTTP side effects).

---

## 2. What actually happens

```html
<p>{{ getName() }}</p>
```

```ts
getName() {
  console.log('called');
  return this.user.first + ' ' + this.user.last;
}
```

On **Default** change detection, Angular may check this component often (browser events, timers, HTTP). Each check → `getName()` runs again.

```text
Click anywhere → Zone triggers CD → template re-evaluated → getName() again
```

---

## 3. Why it’s a problem

| Issue | Example |
|---|---|
| Extra CPU | Heavy compute in getter/method on every CD |
| Impure / side effects | `getName()` that logs, mutates, or hits API |
| Unstable references | `{{ getUsers() }}` returns **new array** every time → child `OnPush` thrashing |
| Harder to reason | Looks cheap in template; cost is hidden |

---

## 4. What to do instead

### A) Property / field (best for simple values)

```ts
name = '';
ngOnInit() {
  this.name = `${this.user.first} ${this.user.last}`;
}
// or update when user changes
```

```html
{{ name }}
```

### B) Getter only if cheap + pure (still re-runs on CD!)

Getters have the **same** re-run problem. Prefer fields or computed.

### C) Pure pipe

```html
{{ user | fullName }}
```

Pure pipes re-run only when **reference inputs** change.

### D) Signals + `computed` (modern)

```ts
user = signal({ first: 'Ada', last: 'Lovelace' });
fullName = computed(() => {
  const u = this.user();
  return `${u.first} ${u.last}`;
});
```

```html
{{ fullName() }}
```

`computed` caches until dependencies change — not “every random CD.”

### E) `OnPush` + immutable inputs

Reduces how often the template is checked — still don’t put heavy work in template functions.

---

## 5. When a template function is OK

- Trivial + pure + rare CD (e.g. presentational leaf with OnPush)  
- Event handlers: `(click)="save()"` — **not** the same as interpolation; runs on click only  
- `@if (isAdmin())` with signal/`computed` is fine  

Bad:

```html
{{ fetchLabelFromApi() }}   <!-- side effect in template -->
*ngFor="let x of getFiltered()"  <!-- new array every CD -->
```

---

## 6. Spoken (30s)

> Template bindings are re-evaluated on change detection, so `{{ getName() }}` can run far more often than you think. I keep templates dumb: bind to fields, pure pipes, or signal `computed` values. Event handlers are fine because they run on the event, not every CD cycle. For lists I never call a method that returns a new filtered array inline — I compute that in the class when inputs change.

---

## 7. Q&A

**Q: Is `{{ user.name }}` OK?**  
A: Yes — property read is cheap; no function call overhead / hidden work.

**Q: Does OnPush fix template functions?**  
A: It reduces checks, doesn’t make heavy/impure calls free.

**Q: What about `*ngFor="let i of arr; track i.id"`?**  
A: Tracking helps; still avoid `*ngFor="let i of getArr()"` creating new arrays each CD.

---

## 8. Practice checklist

- [ ] Explain CD re-evaluation  
- [ ] List 3 alternatives (field, pure pipe, computed)  
- [ ] Call out “new array every CD” antipattern  
- [ ] Contrast interpolation vs `(click)` handler  
