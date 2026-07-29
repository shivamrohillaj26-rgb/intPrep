// =============================================
// QUESTION 3 - HOTEL MEAL SCHEDULER
// FILE: mealSchedule/mealSchedule.component.ts
//
// APPROACH: getter + @Input() + local Date
//
// WHY getter instead of ngOnChanges?
// getter recomputes FRESH every Angular check cycle.
// ngOnChanges could miss updates if change detection
// doesn't run at the right time → stale state bug.
//
// WHY local Date instead of new Date('YYYY-MM-DD')?
// ISO string 'YYYY-MM-DD' is parsed as UTC midnight.
// In IST (UTC+5:30) that's fine, but in timezones
// behind UTC it becomes the PREVIOUS day (off-by-one).
// new Date(y, m-1, d) uses LOCAL time → always safe.
//
// WHY [...guests] spread for breakfast/lunch/dinner?
// All 3 meals have same guests per day.
// Spread prevents shared array mutations.
// =============================================

import { Component, Input, OnInit } from '@angular/core';
import { Guest } from '../app.component';

interface ScheduleRow {
  date: string;
  breakfast: string[];
  lunch: string[];
  dinner: string[];
}

@Component({
  selector: 'meal-schedule',
  templateUrl: './mealSchedule.component.html',
  styleUrls: ['./mealSchedule.component.scss'],
  standalone: false
})
export class MealSchedule implements OnInit {
  @Input() guestList: Guest[] = [];

  constructor() {}
  ngOnInit() {}

  // GETTER: always fresh, no stale state possible
  get scheduleRows(): ScheduleRow[] {
    const dateMap = new Map<string, string[]>();

    for (const guest of this.guestList || []) {
      for (const date of this.getDateRange(guest.startDate, guest.endDate)) {
        if (!dateMap.has(date)) dateMap.set(date, []);
        dateMap.get(date)!.push(guest.name);
      }
    }

    return Array.from(dateMap.entries())
      .sort(([a], [b]) => a.localeCompare(b))
      .map(([date, guests]) => ({
        date,
        breakfast: [...guests], // spread = separate array per meal
        lunch: [...guests],
        dinner: [...guests]
      }));
  }

  getDateRange(startDate: string, endDate: string): string[] {
    const dates: string[] = [];
    const s = startDate.split('-').map(Number);
    const e = endDate.split('-').map(Number);

    // LOCAL date (not UTC) to avoid timezone off-by-one bug
    const current = new Date(s[0], s[1] - 1, s[2]);
    const end = new Date(e[0], e[1] - 1, e[2]);

    while (current <= end) {
      const y = current.getFullYear();
      const m = String(current.getMonth() + 1).padStart(2, '0');
      const d = String(current.getDate()).padStart(2, '0'); // getDate() WITH ()
      dates.push(y + '-' + m + '-' + d);
      current.setDate(current.getDate() + 1);
    }
    return dates;
  }

  trackByValue(_index: number, item: unknown): unknown {
    return item;
  }
}
