import { Component } from '@angular/core';
import { Guest } from './guest.model';
import { GuestForm } from './guest-form/guest-form';
import { MealSchedule } from './meal-schedule/meal-schedule';

@Component({
  selector: 'app-meal-page',
  imports: [GuestForm, MealSchedule],
  templateUrl: './meal-page.html',
  styleUrl: './meal-page.css',
})
export class MealPage {
  guests: Guest[] = [];

  onGuestAdded(guest: Guest) {
    // new array reference → @Input change detection
    this.guests = [...this.guests, guest];
  }
}
