import { Component, signal } from '@angular/core';

interface FaqItem {
  id: number;
  title: string;
  body: string;
}

/** Machine coding: expand / collapse list (Angular version of React accordion) */
@Component({
  selector: 'app-expand-list',
  templateUrl: './expand-list.html',
  styleUrl: './expand-list.css',
})
export class ExpandList {
  // only one open at a time — classic interview choice
  openId = signal<number | null>(1);

  items: FaqItem[] = [
    { id: 1, title: 'What is Angular?', body: 'A framework for building SPAs with components, DI, and RxJS.' },
    { id: 2, title: 'What is a signal?', body: 'A reactive primitive that holds a value and notifies dependents on change.' },
    { id: 3, title: 'What is change detection?', body: 'Angular checks component state and updates the DOM when needed.' },
  ];

  toggle(id: number) {
    this.openId.update((curr) => (curr === id ? null : id));
  }
}
