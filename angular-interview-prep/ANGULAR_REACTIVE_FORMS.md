# Angular Reactive Forms — Interview Ready Deep Guide

Model-driven forms: **FormControl**, **FormGroup**, **FormArray**, **FormBuilder**, validators, dynamic fields, and how to talk about them in interviews.

**Live demo:** `prevonir-interview-practice` → [`/q11`](../prevonir-interview-practice/src/app/q11-reactive-form/README.md) (includes FormArray phones).

**Modern twin (signals):** [ANGULAR_SIGNAL_FORMS.md](./ANGULAR_SIGNAL_FORMS.md) — `form()` + `[formField]` + schema.

---

## 1. The interview question(s)

> What are reactive forms? How do they differ from template-driven?  
> How do you add dynamic fields?  
> How do custom / async / cross-field validators work?

---

## 2. One-liner

> In **reactive forms** the form model lives in TypeScript (`FormGroup` / `FormControl` / `FormArray`). The template only binds with `formControlName`. That makes validation, dynamic fields, and unit tests explicit and easier than `ngModel` for complex forms.

---

## 3. Mental model

```text
Component class                          Template
─────────────────                        ────────
FormGroup {                              <form [formGroup]="form">
  name: FormControl                        <input formControlName="name">
  email: FormControl                       <input formControlName="email">
  phones: FormArray [                      <div formArrayName="phones">
    FormControl, FormControl…                <input [formControlName]="0">
  ]                                        </div>
}                                        </form>

Validators run on the model → status/errors update → template shows messages
```

| Class | Role |
|---|---|
| **FormControl** | One field: value + validators + status |
| **FormGroup** | Named map of controls / nested groups |
| **FormArray** | Ordered list of controls (dynamic rows) |
| **FormBuilder** | Shorthand factory (`fb.group`, `fb.array`) |

---

## 4. Reactive vs template-driven (must nail)

| | Template-driven | Reactive |
|---|---|---|
| Model lives in | Template (`ngModel`) | Component class |
| Module | `FormsModule` | `ReactiveFormsModule` |
| Validation | Directives in HTML | Functions in TS |
| Dynamic fields | Awkward | **FormArray** natural |
| Unit test form logic | Harder (need DOM) | Easy (test FormGroup) |
| Best for | Tiny forms / demos | Complex / enterprise |

**Spoken (20s):**

> Template-driven is fine for a simple login. Reactive wins when I need FormArray, custom/async validators, or to unit-test validation without rendering.

---

## 5. Setup (standalone)

```ts
import { ReactiveFormsModule, FormBuilder, Validators } from '@angular/forms';

@Component({
  imports: [ReactiveFormsModule],
  // ...
})
export class ProfileForm {
  private fb = inject(FormBuilder);
}
```

---

## 6. Creating a form — three equivalent styles

### A) Manual (verbose)

```ts
form = new FormGroup({
  name: new FormControl('', {
    nonNullable: true,
    validators: [Validators.required],
  }),
  email: new FormControl('', {
    nonNullable: true,
    validators: [Validators.required, Validators.email],
  }),
});
```

### B) FormBuilder (interview default)

```ts
form = this.fb.group({
  name: ['', Validators.required],
  email: ['', [Validators.required, Validators.email]],
  role: ['dev'],
});
```

Tuple shape: `[initialValue, syncValidators, asyncValidators?]`.

### C) `nonNullable` FormBuilder (modern / typed)

```ts
form = this.fb.nonNullable.group({
  name: ['', Validators.required],
  email: ['', [Validators.required, Validators.email]],
});
// form.getRawValue().name is string, not string | null
```

**Prefer C** in new code — cleaner types.

---

## 7. Template binding

```html
<form [formGroup]="form" (ngSubmit)="onSubmit()">
  <input formControlName="name" />
  <input formControlName="email" type="email" />

  @if (form.controls.name.invalid && form.controls.name.touched) {
    <span>Name is required</span>
  }

  <button type="submit">Save</button>
</form>
```

Rules:

- Parent: `[formGroup]="form"`  
- Fields: `formControlName="name"` (string key)  
- Standalone control: `[formControl]="emailCtrl"`  

---

## 8. Control status flags (memorize)

| Flag | Meaning |
|---|---|
| `valid` / `invalid` | Passes validators? |
| `pending` | Async validator running |
| `pristine` / `dirty` | User changed value? |
| `untouched` / `touched` | User blurred field? |
| `enabled` / `disabled` | Interactive? |

**UX pattern:** show errors when `invalid && (touched || form submitted)`.

```ts
onSubmit() {
  if (this.form.invalid) {
    this.form.markAllAsTouched(); // reveal all errors
    return;
  }
  const data = this.form.getRawValue();
  // POST data
}
```

---

## 9. Built-in validators

```ts
Validators.required
Validators.minLength(2)
Validators.maxLength(100)
Validators.email
Validators.min(0)
Validators.max(99)
Validators.pattern(/^\d{10}$/)
Validators.requiredTrue  // checkboxes
```

Multiple:

```ts
email: ['', [Validators.required, Validators.email]]
```

---

## 10. Reading & writing values

| API | Use |
|---|---|
| `form.value` | Current values (**excludes disabled** controls) |
| `form.getRawValue()` | **Includes disabled** — prefer on submit |
| `control.value` | One field |
| `patchValue({ name: 'Ada' })` | Partial update (edit forms) |
| `setValue({ ...all keys })` | Must provide **every** key |
| `reset()` / `reset({ name: '' })` | Back to initial / given |

```ts
// Prefill from API
this.api.getProfile(id).subscribe((p) => {
  this.form.patchValue({
    name: p.name,
    email: p.email,
  });
});
```

**Interview trap:** disabled fields missing from `.value` → use `getRawValue()`.

---

## 11. FormArray — dynamic fields (high frequency)

### When

Phones, emails, skills, “add another address”, order line items.

### Model

```ts
form = this.fb.nonNullable.group({
  name: ['', Validators.required],
  phones: this.fb.nonNullable.array([this.createPhone()]),
});

createPhone() {
  return this.fb.nonNullable.control('', [
    Validators.required,
    Validators.pattern(/^\d{10}$/),
  ]);
}

get phones() {
  return this.form.controls.phones; // FormArray
}

addPhone() {
  this.phones.push(this.createPhone());
}

removePhone(i: number) {
  if (this.phones.length > 1) this.phones.removeAt(i);
}
```

### Template

```html
<div formArrayName="phones">
  @for (c of phones.controls; track $index; let i = $index) {
    <input [formControlName]="i" />
    <button type="button" (click)="removePhone(i)">Remove</button>
  }
</div>
<button type="button" (click)="addPhone()">+ Add phone</button>
```

### FormArray of FormGroups (addresses)

```ts
createAddress() {
  return this.fb.nonNullable.group({
    city: ['', Validators.required],
    zip: ['', Validators.required],
  });
}

addresses: this.fb.nonNullable.array([this.createAddress()]);
```

```html
<div formArrayName="addresses">
  @for (g of addresses.controls; track $index; let i = $index) {
    <div [formGroupName]="i">
      <input formControlName="city" />
      <input formControlName="zip" />
    </div>
  }
</div>
```

### Start empty (no rows until user clicks Add)

`array([])` alone is inferred as `FormControl[]` — then `.push(FormGroup)` errors. Cast the empty array:

```ts
// ✅ empty UI, but typed as FormGroup rows
nominees: this.fb.nonNullable.array([] as FormGroup[]),

addNominee() {
  this.nominees.push(this.createNomineeGroup());
}
```

`@for` over an empty array renders nothing until the first `push`.

**Spoken (25s):**

> FormArray is an ordered list of controls. I push to add, removeAt to delete, and bind with formArrayName plus either an index formControlName or formGroupName for nested groups.

---

## 12. Nested FormGroup

```ts
form = this.fb.group({
  name: [''],
  address: this.fb.group({
    street: ['', Validators.required],
    city: ['', Validators.required],
  }),
});
```

```html
<div formGroupName="address">
  <input formControlName="street" />
  <input formControlName="city" />
</div>
```

Access: `form.get('address.city')` or `form.controls.address.controls.city`.

---

## 13. Custom sync validator

```ts
import { AbstractControl, ValidationErrors, ValidatorFn } from '@angular/forms';

/** Control-level: value must end with @company.com */
export function companyEmail(): ValidatorFn {
  return (control: AbstractControl): ValidationErrors | null => {
    const v = String(control.value ?? '');
    if (!v) return null; // let `required` handle empty
    return v.endsWith('@company.com') ? null : { companyEmail: true };
  };
}

// usage
email: ['', [Validators.required, companyEmail()]],
```

```html
@if (form.controls.email.hasError('companyEmail')) {
  <span>Use your company email</span>
}
```

**Contract:** return `null` if OK, else `{ errorKey: true }` (or richer object).

---

## 14. Cross-field (group) validator

```ts
export const passwordMatch: ValidatorFn = (group: AbstractControl) => {
  const pass = group.get('password')?.value;
  const confirm = group.get('confirm')?.value;
  return pass === confirm ? null : { passwordMismatch: true };
};

form = this.fb.group(
  {
    password: ['', Validators.required],
    confirm: ['', Validators.required],
  },
  { validators: passwordMatch },
);
```

```html
@if (form.hasError('passwordMismatch') && form.touched) {
  <span>Passwords must match</span>
}
```

---

## 15. Async validator (API uniqueness)

```ts
import { AbstractControl, AsyncValidatorFn } from '@angular/forms';
import { map, catchError, of } from 'rxjs';

function uniqueUsername(api: UserApi): AsyncValidatorFn {
  return (control) => {
    if (!control.value) return of(null);
    return api.exists(control.value).pipe(
      map((exists) => (exists ? { usernameTaken: true } : null)),
      catchError(() => of(null)),
    );
  };
}

// FormBuilder 3rd slot = async validators
username: ['', [Validators.required], [uniqueUsername(this.api)]],
```

While pending: `control.status === 'PENDING'` — show spinner. Sync validators run first; async only if sync pass.

---

## 16. Conditional validation

```ts
form.controls.role.valueChanges.subscribe((role) => {
  const empId = form.controls.employeeId;
  if (role === 'employee') {
    empId.setValidators([Validators.required]);
  } else {
    empId.clearValidators();
  }
  empId.updateValueAndValidity();
});
```

Or enable/disable:

```ts
form.controls.coupon.disable(); // omitted from .value
form.controls.coupon.enable();
```

---

## 17. `valueChanges` (reactive pipeline)

```ts
form.controls.email.valueChanges
  .pipe(
    debounceTime(300),
    distinctUntilChanged(),
    takeUntilDestroyed(),
  )
  .subscribe((email) => {
    // live search / preview
  });
```

Also: `statusChanges` for valid/invalid transitions.

Unsubscribe with `takeUntilDestroyed` / async pipe — see [ANGULAR_MEMORY_LEAKS.md](./ANGULAR_MEMORY_LEAKS.md).

---

## 18. End-to-end example (profile + dynamic phones)

```ts
@Component({
  imports: [ReactiveFormsModule],
  templateUrl: './profile.html',
})
export class ProfileForm {
  private fb = inject(FormBuilder);

  form = this.fb.nonNullable.group({
    name: ['', [Validators.required, Validators.minLength(2)]],
    email: ['', [Validators.required, Validators.email]],
    phones: this.fb.nonNullable.array([this.phoneCtrl()]),
  });

  get phones() {
    return this.form.controls.phones;
  }

  phoneCtrl() {
    return this.fb.nonNullable.control('', [
      Validators.required,
      Validators.pattern(/^\d{10}$/),
    ]);
  }

  addPhone() {
    this.phones.push(this.phoneCtrl());
  }

  removePhone(i: number) {
    if (this.phones.length > 1) this.phones.removeAt(i);
  }

  submit() {
    if (this.form.invalid) {
      this.form.markAllAsTouched();
      return;
    }
    console.log(this.form.getRawValue());
    // { name, email, phones: ['9999999999', ...] }
  }
}
```

This matches the `/q11` practice app.

---

## 19. Testing (short)

```ts
it('requires email', () => {
  const c = form.controls.email;
  c.setValue('');
  expect(c.hasError('required')).toBe(true);
  c.setValue('a@b.com');
  expect(c.valid).toBe(true);
});

it('adds a phone row', () => {
  expect(form.controls.phones.length).toBe(1);
  // call addPhone()
  expect(form.controls.phones.length).toBe(2);
});
```

No need to render the template to test validators — big reactive-forms win.

---

## 20. Common mistakes

1. Forgetting `ReactiveFormsModule` in `imports`  
2. Using `ngModel` together with `formControlName` on same input (avoid)  
3. Showing errors before `touched` (noisy UX)  
4. Submitting `.value` and wondering why disabled fields vanished → `getRawValue()`  
5. `setValue` without all keys → error; use `patchValue` for partial  
6. Removing last FormArray row with no guard → empty array surprises API  
7. Not calling `updateValueAndValidity()` after `setValidators`  

---

## 21. Interview Q&A bank

**Q: Reactive vs template-driven?**  
A: Model in class vs template. Reactive for complex/dynamic/testable forms.

**Q: FormControl vs FormGroup vs FormArray?**  
A: One field / named group / list of controls.

**Q: Why FormBuilder?**  
A: Less boilerplate than `new FormControl(...)`.

**Q: How dynamic fields?**  
A: FormArray + push/removeAt + formArrayName.

**Q: Custom validator shape?**  
A: `(control) => null | { key: true }`.

**Q: Async validator?**  
A: Returns Observable/Promise of errors; 3rd arg in FormBuilder tuple.

**Q: patchValue vs setValue?**  
A: Partial vs full object.

**Q: value vs getRawValue?**  
A: Raw includes disabled.

**Q: How show errors only after blur?**  
A: Check `touched` (or submit → `markAllAsTouched`).

**Q: Cross-field validation?**  
A: Validator on FormGroup comparing sibling controls.

---

## 22. Spoken answers

**30s — what are reactive forms?**

> Reactive forms put the form model in the component as FormControls inside a FormGroup. The template binds with formControlName. Validators are functions on the model, so I get strong typing, FormArrays for dynamic fields, and easy unit tests.

**45s — dynamic fields**

> For a list that grows — like phone numbers — I use a FormArray. Each item is a control or a small FormGroup. Add pushes a new control with validators; remove calls removeAt. In the template I set formArrayName on a container and bind each row with the index as formControlName or formGroupName.

**60s — full design**

> I’d use FormBuilder.nonNullable.group for the profile fields, a FormArray for phones, built-in validators plus a custom one if needed, and markAllAsTouched on invalid submit. Edit screens use patchValue from the API. Disabled fields come through getRawValue. For password confirm I’d put a group-level validator. That’s the same pattern as our /q11 practice.

---

## 23. What to draw first on a whiteboard

```text
FormGroup
├── name        FormControl + required
├── email       FormControl + required,email
└── phones      FormArray
      ├── [0] FormControl + pattern
      └── [1] FormControl + pattern   ← push/removeAt
```

---

## 24. Practice checklist

- [ ] Build FormBuilder group from memory  
- [ ] Show error with `invalid && touched`  
- [ ] Implement FormArray add/remove  
- [ ] Explain patchValue vs setValue  
- [ ] Write a custom sync validator  
- [ ] Explain password-match group validator  
- [ ] Say getRawValue vs value  
- [ ] Rewrite `/q11` without looking  

---

## 25. Cheat card

```text
ReactiveFormsModule
FormBuilder.group / array / control
formControlName · formGroupName · formArrayName
Validators.* · custom → null | { key: true }
FormArray: push / removeAt / at(i)
Submit: markAllAsTouched · getRawValue()
Edit: patchValue
Dynamic list → FormArray (not *ngFor of plain strings alone)
Template-driven = ngModel; Reactive = TS model
```
