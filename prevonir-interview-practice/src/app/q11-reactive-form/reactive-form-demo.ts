import { JsonPipe } from '@angular/common';
import { Component, inject } from '@angular/core';
import {
  FormArray,
  FormBuilder,
  FormGroup,
  ReactiveFormsModule,
  Validators,
} from '@angular/forms';
import { RouterLink } from '@angular/router';

@Component({
  selector: 'app-reactive-form-demo',
  imports: [ReactiveFormsModule, RouterLink, JsonPipe],
  templateUrl: './reactive-form-demo.html',
  styleUrl: './reactive-form-demo.css',
})
export class ReactiveFormDemo {
  private readonly fb = inject(FormBuilder);

  /**
   * Interview:
   * - FormArray of FormControl → phones
   * - FormArray of FormGroup → nominees { name, phone }
   */
  readonly form = this.fb.nonNullable.group({
    name: ['', [Validators.required, Validators.minLength(2)]],
    email: ['', [Validators.required, Validators.email]],
    role: ['dev', Validators.required],
    phones: this.fb.nonNullable.array([this.createPhoneControl()]),
    // Empty OK — cast tells TS items are FormGroups (not FormControls)
    nominees: this.fb.nonNullable.array([] as FormGroup[]),
  });

  submitted: Record<string, unknown> | null = null;

  get phones(): FormArray {
    return this.form.controls.phones;
  }

  get nominees(): FormArray {
    return this.form.controls.nominees;
  }

  createPhoneControl() {
    return this.fb.nonNullable.control('', [
      Validators.required,
      Validators.pattern(/^\d{10}$/),
    ]);
  }

  /** Each nominee row = FormGroup with name + phone */
  createNomineeGroup(): FormGroup {
    return this.fb.nonNullable.group({
      name: ['', [Validators.required, Validators.minLength(2)]],
      phone: ['', [Validators.required, Validators.pattern(/^\d{10}$/)]],
    });
  }

  addPhone(): void {
    this.phones.push(this.createPhoneControl());
  }

  removePhone(index: number): void {
    if (this.phones.length === 1) return;
    this.phones.removeAt(index);
  }

  addNominee(): void {
    this.nominees.push(this.createNomineeGroup());
  }

  removeNominee(index: number): void {
    this.nominees.removeAt(index); // can go back to 0 rows
  }

  onSubmit(): void {
    if (this.form.invalid) {
      this.form.markAllAsTouched();
      return;
    }
    this.submitted = this.form.getRawValue();
  }

  showError(controlName: 'name' | 'email' | 'role'): boolean {
    const c = this.form.controls[controlName];
    return c.invalid && c.touched;
  }

  showPhoneError(index: number): boolean {
    const c = this.phones.at(index);
    return c.invalid && c.touched;
  }

  showNomineeError(index: number, field: 'name' | 'phone'): boolean {
    const group = this.nominees.at(index) as FormGroup;
    const c = group.controls[field];
    return c.invalid && c.touched;
  }
}
