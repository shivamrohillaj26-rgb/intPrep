import { Component, signal } from '@angular/core';
import { RouterLink } from '@angular/router';
import { AppForDirective } from './app-for.directive';

@Component({
  selector: 'app-structural-for-demo',
  imports: [RouterLink, AppForDirective],
  templateUrl: './structural-for-demo.html',
  styleUrl: './structural-for-demo.css',
})
export class StructuralForDemo {
  readonly cities = signal(['Bengaluru', 'Hyderabad', 'Pune']);
  private nextId = 1;

  addCity(): void {
    this.cities.update((list) => [...list, `City ${this.nextId++}`]);
  }

  removeLast(): void {
    this.cities.update((list) => list.slice(0, -1));
  }

  shuffle(): void {
    this.cities.update((list) => {
      const copy = [...list];
      for (let i = copy.length - 1; i > 0; i--) {
        const j = Math.floor(Math.random() * (i + 1));
        [copy[i], copy[j]] = [copy[j], copy[i]];
      }
      return copy;
    });
  }
}
