import { Component } from '@angular/core';
import { CommonModule } from '@angular/common';

@Component({
  selector: 'app-collapse',
  imports: [CommonModule],
  templateUrl: './collapse.html',
  styleUrl: './collapse.css',
})
export class Collapse {

  data = [
    {
      title: 'Item 1',
      content: 'Content 1'
    },
    {
      title: 'Item 2',
      content: 'Content 2'
    },
    {
      title: 'Item 3',
      content: 'Content 3'
    }
  ]

  isOpen = -1

  toggle(index: number){
    this.isOpen = this.isOpen === index ? -1 : index;
  }

}
