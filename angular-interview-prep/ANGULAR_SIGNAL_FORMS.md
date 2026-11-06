# Angular Signal Forms — Interview Ready Deep Guide

Signal-based, **model-driven** forms: your data lives in a `signal()`, `form()` builds a field tree, template binds with `[formField]`, rules live in a **schema**.

Classic twin: [ANGULAR_REACTIVE_FORMS.md](./ANGULAR_REACTIVE_FORMS.md) (`FormGroup` / `FormControl`).  
Signals basics: [ANGULAR_SIGNALS.md](./ANGULAR_SIGNALS.md).  
Version context: [ANGULAR_VERSION_FEATURES.md](./ANGULAR_VERSION_FEATURES.md).

> **Status note (say this in interviews):** Signal Forms shipped as **experimental** around Angular **21** and moved toward **stable** in the **22** era. Import path and small API names evolved (`[field]` / `$state` in early docs → `[formField]` + calling the field for state). Always verify against your project’s Angular version + [angular.dev](https://angular.dev).

---

## 1. Interview prompts

> What are Signal Forms? How do they differ from Reactive Forms?  
> How do you validate / do cross-field rules?  
> How do arrays / nested objects work?  
> Why move forms onto signals?

---

## 2. One-liner

> In Signal Forms **I own a writable signal model**. `form(model)` wraps it in a typed **field tree**. I bind inputs with `[formField]`, declare validators/disabled rules in a **schema**, and read `valid` / `errors` / `dirty` as **signals** by calling the field. Same mental model as the rest of signal-based Angular — no separate `FormControl` tree.

---

## 3. Mental model (4 pieces)

Official breakdown:

| Piece | Meaning |
|---|---|
| **1. Data model** | `signal({ name: '', email: '' })` — **source of truth** |
| **2. Field state** | `valid`, `touched`, `dirty`, `errors`, `disabled`… (signals) |
| **3. Field logic** | Schema: validators, `disabled`/`hidden`/`when` rules |
| **4. UI controls** | `<input [formField]="…">` or custom controls |

```text
writable signal model  ──form()──►  FieldTree (mirrors model shape)
        ▲                              │
        │ writes on user input         ├── [formField] ↔ DOM
        └──────────────────────────────┘
                     ▲
                     │ schema rules derive valid/disabled/…
```

**Key principle:** Signal Forms do **not** keep a separate value copy like a detached `FormGroup`. The signal **is** the value. UI edits update the model; model updates show in the UI.

---

## 4. Minimal working example

```ts
import { Component, signal } from '@angular/core';
import {
  form,
  FormField,
  required,
  email,
  minLength,
  submit,
} from '@angular/forms/signals';

@Component({
  selector: 'app-signup',
  imports: [FormField],
  template: `
    <form (submit)="onSubmit($event)">
      <label>
        Name
        <input [formField]="signupForm.name" />
      </label>
      @if (signupForm.name().touched() && signupForm.name().invalid()) {
        <p class="err">{{ signupForm.name().errors()[0]?.message }}</p>
      }

      <label>
        Email
        <input type="email" [formField]="signupForm.email" />
      </label>

      <label>
        Password
        <input type="password" [formField]="signupForm.password" />
      </label>

      <button type="submit" [disabled]="signupForm().invalid()">Sign up</button>
    </form>
  `,
})
export class SignupComponent {
  /** Prefer '' / 0 / [] — avoid null/undefined initials for bound fields */
  readonly model = signal({
    name: '',
    email: '',
    password: '',
  });

  readonly signupForm = form(this.model, (p) => {
    required(p.name, { message: 'Name is required' });
    required(p.email, { message: 'Email is required' });
    email(p.email, { message: 'Invalid email' });
    required(p.password);
    minLength(p.password, 8, { message: 'Min 8 characters' });
  });

  onSubmit(event: Event) {
    event.preventDefault();
    submit(this.signupForm, async () => {
      // runs only when valid; marks fields touched first
      await this.save(this.model());
    });
  }

  private async save(data: { name: string; email: string; password: string }) {
    console.log('POST', data);
  }
}
```

---

## 5. Creating the form — `form(model, schema?)`

```ts
const model = signal({ title: '', count: 0 });
const f = form(model); // no rules yet

const f2 = form(model, (path) => {
  required(path.title);
  min(path.count, 1);
});
```

| | |
|---|---|
| First arg | `WritableSignal<T>` model |
| Second arg | Schema function — declarative rules |
| Return | Field tree shaped like `T` |

Import from **`@angular/forms/signals`** (not classic `@angular/forms` builders).

---

## 6. Field tree vs field state (critical gotcha)

Navigate like the model: `signupForm.address.city`  
To read flags, **call the field** → state:

```ts
signupForm.name;           // field node (structure)
signupForm.name();         // FieldState
signupForm.name().value(); // current value (signal)
signupForm.name().valid();
signupForm.name().errors();
signupForm.name().touched();
signupForm.name().dirty();

signupForm().valid();      // whole-form state
signupForm().value();      // whole model value (or use model())
```

```html
<!-- RIGHT -->
@if (signupForm.email().invalid() && signupForm.email().touched()) { … }

<!-- WRONG — invalid/touched live on state, after calling the field -->
@if (signupForm.email.invalid()) { … }
```

Early experimental docs used `$state`; modern style is **`field()`**. Mention both if the interviewer is on an older preview.

---

## 7. Template binding — `[formField]`

```html
<input [formField]="signupForm.name" />
<input type="checkbox" [formField]="signupForm.agree" />
<select [formField]="signupForm.country">
  <option value="in">India</option>
</select>
```

`[formField]` typically wires:

- value ↔ model  
- disabled / readonly (from schema)  
- touched on blur  
- name / a11y-related bindings where applicable  

**Don’t also bind** `[value]`, `[disabled]`, `[readonly]`, or `min`/`max` attrs on the same control — schema/validators own those.  
(Exception: radio/checkbox **option** `value="economy"` is the option identity, not the field binding.)

---

## 8. Schema rules — validation & UI logic

Built-ins (names may expand by version): `required`, `email`, `min`, `max`, `minLength`, `maxLength`, `pattern`, plus `validate` / async helpers.

```ts
form(this.model, (p) => {
  required(p.name, { message: 'Required' });
  email(p.email);

  // conditional required
  required(p.company, {
    when: ({ valueOf }) => valueOf(p.accountType) === 'business',
  });

  disabled(p.promoCode, {
    when: ({ valueOf }) => !valueOf(p.hasPromo),
  });

  hidden(p.shipping, {
    when: ({ valueOf }) => valueOf(p.sameAsBilling),
  });

  // custom sync validator
  validate(p.username, ({ value }) => {
    if (value() === 'admin') {
      return { kind: 'reserved', message: 'Username taken' };
    }
    // no error → return undefined (not null)
  });
});
```

### Cross-field

```ts
validate(p.confirmPassword, ({ value, valueOf }) => {
  if (value() !== valueOf(p.password)) {
    return { kind: 'mismatch', message: 'Passwords must match' };
  }
});
```

### Paths in schema are not callable signals

Inside the schema callback use **`valueOf(path)`** / **`stateOf(path)`**, not `path.name()`.

---

## 9. Nested objects & arrays

Model shape **is** the form shape — no separate `FormGroup` / `FormArray` types.

```ts
readonly model = signal({
  profile: { first: '', last: '' },
  phones: [] as { number: string; type: string }[],
});

readonly f = form(this.model, (p) => {
  required(p.profile.first);
  applyEach(p.phones, (phone) => {
    required(phone.number);
    minLength(phone.number, 10);
  });
});
```

```html
<input [formField]="f.profile.first" />

@for (phone of f.phones; track $index) {
  <input [formField]="phone.number" />
}
```

**Add a row:** mutate the **model signal** (push a new object), not `FormArray.push`.

```ts
addPhone() {
  this.model.update((m) => ({
    ...m,
    phones: [...m.phones, { number: '', type: 'mobile' }],
  }));
}
```

---

## 10. Submit helper

```ts
import { submit } from '@angular/forms/signals';

onSubmit() {
  submit(this.f, async () => {
    await this.api.save(this.model());
  });
}
```

Typical behavior to say:

- Marks fields **touched** (so errors show)  
- Runs action only if **valid**  
- Callback should be **`async`** and return a Promise  

---

## 11. Signal Forms vs Reactive Forms vs Template-driven

| | Template-driven | Reactive Forms | **Signal Forms** |
|---|---|---|---|
| Model home | Template `ngModel` | `FormGroup` tree in TS | **Your `signal()` model** |
| Binding | `ngModel` | `formControlName` | **`[formField]`** |
| Validation | Directives | `Validators.*` on controls | **Schema functions** |
| Dynamic list | Awkward | `FormArray` | **Array on model + `applyEach`** |
| Reactivity | Zone / CD | Observables / statusChanges | **Signals** |
| Fits zoneless / OnPush | OK | OK with care | **Natural** |
| Maturity | Stable forever | Stable, ubiquitous | Newer (exp → stable by version) |
| Ecosystem | Huge | Huge (CVA, libs) | Growing; CVA interop improving |

**When you’d still use Reactive Forms today**

- Large existing codebase / FormArray-heavy features  
- Third-party controls that only speak `ControlValueAccessor` (interop exists, but migration cost)  
- Team not yet on a Signal Forms–ready Angular version  

**When Signal Forms win the whiteboard**

- Greenfield signal / zoneless apps  
- Want one reactivity model (signals everywhere)  
- Cross-field rules as declarative schema  

---

## 12. Comparison cheat — same feature two ways

| Need | Reactive | Signal Forms |
|---|---|---|
| Create | `fb.group({ name: [''] })` | `form(signal({ name: '' }))` |
| Bind | `formControlName="name"` | `[formField]="f.name"` |
| Required | `Validators.required` | `required(p.name)` |
| Value | `form.value` / `getRawValue()` | `model()` or `f().value()` |
| Valid? | `form.valid` | `f().valid()` |
| Errors | `control.errors` | `f.name().errors()` |
| Disable | `control.disable()` | `disabled(p.name, { when })` declarative |
| Array push | `formArray.push(ctrl)` | `model.update` add item |

---

## 13. Gotchas

1. **Initial values:** use `''`, `0`, `false`, `[]` — avoid `null`/`undefined` for native inputs  
2. **Must call field for state:** `f.name().dirty()` not `f.name.dirty()`  
3. **Schema paths ≠ signals:** use `valueOf` / `stateOf`  
4. **No imperative `.disable()` mindset** — declare `when` rules  
5. **Version drift** — confirm import path / `[formField]` vs older `[field]`  
6. **Don’t mix** classic `FormBuilder` into the same mental model unless interop is intentional  
7. **Security:** client validation only — server still validates  

---

## 14. Spoken answers

### 20s — what are Signal Forms?

> Signal Forms keep the form values in a writable signal I own. `form()` builds a field tree from that model, I bind with `[formField]`, and validation is a declarative schema. Status like valid and dirty are signals, which fits modern Angular better than a parallel FormControl tree.

### 45s — vs Reactive Forms

> Reactive Forms put state in FormGroup/FormControl and bind with formControlName; updates are Observable-oriented. Signal Forms use my signal as the source of truth, schema rules instead of Validators on controls, and formField instead of formControlName. Dynamic rows are just arrays on the model. I’d still use Reactive Forms on older Angular or huge legacy forms; for new signal/zoneless apps I’d lean Signal Forms once the version is stable enough for the team.

### 60s — how validation works

> I pass a schema function as the second argument to form(). Inside it I call required, email, minLength, or custom validate with valueOf for cross-field checks. Conditional disabled/hidden use when callbacks. In the template I show errors when the field’s state says touched and invalid. On submit I use the submit helper so everything gets marked touched and the async save only runs if valid.

---

## 15. Q&A pack

**Q: Do Signal Forms replace Reactive Forms overnight?**  
A: No — coexistence. Migration is gradual; know both.

**Q: Where does the value live?**  
A: In your `WritableSignal` model. The field tree reads/writes that signal.

**Q: How do I unit test?**  
A: Set `model.set(...)` / interact via field state signals; assert `f().valid()` and `model()`. Less DOM than template-driven.

**Q: Async validation?**  
A: Use the version’s async helpers (e.g. `validateHttp` / `validateAsync` style APIs) — say “debounced server check in schema,” then name the exact helper from docs for your version.

**Q: Custom control?**  
A: Prefer signal-form control contracts (`FormValueControl` / checkbox variant) or CVA interop for legacy widgets.

**Q: FormBuilder equivalent?**  
A: None needed — model shape + `form()` is enough.

---

## 16. Practice checklist

- [ ] Draw model signal → `form()` → `[formField]`  
- [ ] Write required + email schema  
- [ ] Explain `f.name()` vs `f.name`  
- [ ] Cross-field password confirm with `valueOf`  
- [ ] Array: `applyEach` + `model.update` to add row  
- [ ] Contrast with FormGroup/FormArray in 30s  
- [ ] Mention experimental → stable version story  

---

## 17. Cheat card

```text
model = signal({ ... })          // you own values
f = form(model, schema)          // field tree + rules
<template [formField]="f.name">
state: f.name().valid() / errors() / touched()
schema: required / email / validate / disabled({ when })
arrays: model arrays + applyEach
submit(f, async () => save(model()))
vs reactive: signals + schema, not FormControl tree
```

---

## Related

| Topic | File |
|---|---|
| Classic reactive forms | [ANGULAR_REACTIVE_FORMS.md](./ANGULAR_REACTIVE_FORMS.md) |
| Signals deep dive | [ANGULAR_SIGNALS.md](./ANGULAR_SIGNALS.md) |
| Version timeline | [ANGULAR_VERSION_FEATURES.md](./ANGULAR_VERSION_FEATURES.md) |
| Practice reactive demo | `prevonir-interview-practice` `/q11` |
