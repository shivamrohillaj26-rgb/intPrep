// =============================================
// QUESTION 3 - HOTEL MEAL SCHEDULER
// FILE: app.component.ts
//
// APPROACH:
// - Holds guests[] array
// - onGuestAdded: creates NEW array reference
//   WHY? [...spread] triggers Angular change detection
//   on MealSchedule's @Input() guestList
// =============================================

import { Component } from '@angular/core';

export interface Guest {
  name: string;
  startDate: string;
  endDate: string;
}

@Component({
  selector: 'app-root',
  templateUrl: './app.component.html',
  styleUrls: ['./app.component.scss'],
  standalone: false
})
export class AppComponent {
  title = 'Hotel Meal Schedule';
  guests: Guest[] = [];

  onGuestAdded(guest: Guest) {
    // IMPORTANT: spread creates new array reference
    // Without this, Angular won't detect the change
    this.guests = [...this.guests, guest];
  }
}
