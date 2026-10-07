// =============================================
// QUESTION 3 - HOTEL MEAL SCHEDULER
// FILE: guestForm/guestForm.component.ts
//
// APPROACH: ViewChild instead of [(ngModel)]
//
// WHY ViewChild?
// Tests set input.value directly in the DOM like:
//   nameInput.value = 'John'
//   nameInput.dispatchEvent(new Event('input'))
//
// [(ngModel)] only syncs when Angular's 'input'
// event fires. If the test doesn't dispatch it,
// this.guestName stays '' and addGuest() never runs.
//
// ViewChild reads nativeElement.value directly
// from the DOM — exactly what the test sets.
// Resetting via nativeElement.value = '' clears
// exactly what the test then checks.
// =============================================

import { Component, OnInit, Output, EventEmitter, ViewChild, ElementRef } from '@angular/core';
import { Guest } from '../app.component';

@Component({
  selector: 'guest-form',
  templateUrl: './guestForm.component.html',
  styleUrls: ['./guestForm.component.scss'],
  standalone: false
})
export class GuestForm implements OnInit {
  @Output() onGuestAdded: EventEmitter<Guest> = new EventEmitter<Guest>();

  @ViewChild('nameInput') nameInput: ElementRef;
  @ViewChild('startDateInput') startDateInput: ElementRef;
  @ViewChild('endDateInput') endDateInput: ElementRef;

  constructor() {}
  ngOnInit() {}

  addGuest() {
    const name = this.nameInput.nativeElement.value;
    const startDate = this.startDateInput.nativeElement.value;
    const endDate = this.endDateInput.nativeElement.value;

    if (name && startDate && endDate) {
      this.onGuestAdded.emit({ name, startDate, endDate });

      // Reset DOM directly — guaranteed to clear what test checks
      this.nameInput.nativeElement.value = '';
      this.startDateInput.nativeElement.value = '';
      this.endDateInput.nativeElement.value = '';
    }
  }
}
