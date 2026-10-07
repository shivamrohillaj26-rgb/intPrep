import { Component, input } from '@angular/core';
import { Guest } from '../guest.model';

interface ScheduleRow {
  date: string;
  breakfast: string[];
  lunch: string[];
  dinner: string[];
}

@Component({
  selector: 'meal-schedule',
  templateUrl: './meal-schedule.html',
  styleUrl: './meal-schedule.css',
})
export class MealSchedule {
  // HR used @Input() guestList — signal input() is equivalent
  guestList = input<Guest[]>([]);

  get scheduleRows(): ScheduleRow[] {
    const dateMap = new Map<string, string[]>();

    for (const guest of this.guestList()) {
      for (const date of this.getDateRange(guest.startDate, guest.endDate)) {
        if (!dateMap.has(date)) dateMap.set(date, []);
        dateMap.get(date)!.push(guest.name);
      }
    }

    return Array.from(dateMap.entries())
      .sort(([a], [b]) => a.localeCompare(b))
      .map(([date, guests]) => ({
        date,
        breakfast: [...guests],
        lunch: [...guests],
        dinner: [...guests],
      }));
  }

  private getDateRange(startDate: string, endDate: string): string[] {
    const dates: string[] = [];
    const [sy, sm, sd] = startDate.split('-').map(Number);
    const [ey, em, ed] = endDate.split('-').map(Number);

    // LOCAL date — avoid UTC off-by-one from new Date('YYYY-MM-DD')
    const current = new Date(sy, sm - 1, sd);
    const end = new Date(ey, em - 1, ed);

    while (current <= end) {
      const y = current.getFullYear();
      const m = String(current.getMonth() + 1).padStart(2, '0');
      const d = String(current.getDate()).padStart(2, '0'); // getDate() with ()
      dates.push(`${y}-${m}-${d}`);
      current.setDate(current.getDate() + 1);
    }

    return dates;
  }
}
