import { Component, ElementRef, EventEmitter, Output, ViewChild, viewChild } from '@angular/core';

@Component({
  selector: 'app-guest-form',
  imports: [],
  templateUrl: './guest-form.html',
  styleUrl: './guest-form.css',
})
export class GuestForm {

  @Output() guestAdded : EventEmitter<any> = new EventEmitter<any>();

  @ViewChild('name') nameInput: ElementRef<HTMLInputElement> | null = null;
  @ViewChild('startDate') startDate: ElementRef<HTMLInputElement> | null = null;
  @ViewChild('endDate') endDate: ElementRef<HTMLInputElement> | null = null;

  addGuest(){
    this.guestAdded.emit({
      name: this.nameInput?.nativeElement.value,
      startDate: this.startDate?.nativeElement.value,
      endDate: this.endDate?.nativeElement.value,
    })
    console.log(this.nameInput?.nativeElement.value, this.startDate?.nativeElement.value, this.endDate?.nativeElement.value);
  }

}
