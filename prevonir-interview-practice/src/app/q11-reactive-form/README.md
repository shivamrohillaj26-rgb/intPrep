# Q11 — Reactive forms (+ dynamic FormArray)

Open `/q11`. Deep guide: `../../angular-interview-prep/ANGULAR_REACTIVE_FORMS.md`

## What this demo covers

1. `FormBuilder.nonNullable.group` + built-in validators  
2. **FormArray of FormControl** — phones  
3. **FormArray of FormGroup** — nominees `{ name, phone }`  
4. Submit → `getRawValue()` JSON  

## Nominees pattern (FormArray of FormGroup)

```ts
createNomineeGroup() {
  return this.fb.nonNullable.group({
    name: ['', [Validators.required, Validators.minLength(2)]],
    phone: ['', [Validators.required, Validators.pattern(/^\d{10}$/)]],
  });
}

nominees: this.fb.nonNullable.array([this.createNomineeGroup()]);

addNominee() { this.nominees.push(this.createNomineeGroup()); }
removeNominee(i: number) { this.nominees.removeAt(i); }
```

```html
<div formArrayName="nominees">
  @for (g of nominees.controls; track $index; let i = $index) {
    <div [formGroupName]="i">
      <input formControlName="name" />
      <input formControlName="phone" />
    </div>
  }
</div>
```

| List type | Array item | Bind row with |
|---|---|---|
| Phones | `FormControl` | `[formControlName]="i"` |
| Nominees | `FormGroup` | `[formGroupName]="i"` then named `formControlName`s |

## Spoken (40s)

> For phones I use a FormArray of controls and bind by index. For nominees — each row has name and phone — I use a FormArray of FormGroups. The row uses formGroupName with the index, then formControlName for each field. Add is push, remove is removeAt.
