import { Component } from '@angular/core';
import { GuestForm } from './guest-form/guest-form';
import { Schedule } from './schedule/schedule';

@Component({
  selector: 'app-meal-scheduler',
  imports: [GuestForm, Schedule],
  templateUrl: './meal-scheduler.html',
  styleUrl: './meal-scheduler.css',
})
export class MealScheduler {
  guests: any[] = []

  guesAdded(guest: any){
    this.guests.push(guest);
    console.log(guest);
  }
}
