import { Component, ElementRef, output, viewChild } from '@angular/core';
import { Guest } from '../guest.model';

@Component({
  selector: 'guest-form',
  templateUrl: './guest-form.html',
  styleUrl: './guest-form.css',
})
export class GuestForm {
  // HR used @Output() onGuestAdded — same idea
  guestAdded = output<Guest>();

  // HR used @ViewChild — signal viewChild is the modern equivalent
  nameInput = viewChild.required<ElementRef<HTMLInputElement>>('nameInput');
  startDateInput = viewChild.required<ElementRef<HTMLInputElement>>('startDateInput');
  endDateInput = viewChild.required<ElementRef<HTMLInputElement>>('endDateInput');

  addGuest() {
    const name = this.nameInput().nativeElement.value.trim();
    const startDate = this.startDateInput().nativeElement.value;
    const endDate = this.endDateInput().nativeElement.value;

    if (!name || !startDate || !endDate) return;

    this.guestAdded.emit({ name, startDate, endDate });

    // reset DOM values (what HR tests check)
    this.nameInput().nativeElement.value = '';
    this.startDateInput().nativeElement.value = '';
    this.endDateInput().nativeElement.value = '';
  }
}
