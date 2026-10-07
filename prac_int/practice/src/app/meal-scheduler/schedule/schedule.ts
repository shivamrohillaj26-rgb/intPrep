import { Component, input } from '@angular/core';

@Component({
  selector: 'app-schedule',
  imports: [],
  templateUrl: './schedule.html',
  styleUrl: './schedule.css',
})
export class Schedule {
 
  guests = input<any[]>([]);

  get scheduleRows(){
    const scheduleRows = new Map<string, string[]>();
    for(let guest of this.guests()){
      const dateRanges = this.getDateRanges(guest.startDate, guest.endDate);
      for(let date of dateRanges){
        if(!scheduleRows.has(date)){
          scheduleRows.set(date , []);
        }
        scheduleRows.get(date)?.push(guest.name);
      }
    }
      console.log(Array.from(scheduleRows.entries()));
      return Array.from(scheduleRows.entries()).sort((a,b)=>a[0].localeCompare(b[0])).map(([date ,guests])=>({date , guests}));
  }

  getDateRanges(startDate:string , endDate:string){
    const start = new Date(startDate);
    const end = new Date(endDate);
    const dateRanges = [];

    while(start<=end){
      dateRanges.push(new Date(start).toISOString().split('T')[0]);
      start.setDate(start.getDate() + 1);
    }
    console.log(dateRanges);
    return dateRanges;
  }
}
