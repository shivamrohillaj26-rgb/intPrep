import { AsyncPipe } from '@angular/common';
import { Component } from '@angular/core';
import { FormsModule } from '@angular/forms';
import { Subject, debounceTime, distinctUntilChanged, startWith, switchMap } from 'rxjs';
import { CitySearchService } from '../city-search.service';

/**
 * Approach 4 — Getter/Setter + ngModel + RxJS + async pipe
 */
@Component({
  selector: 'app-typeahead-ngmodel-rxjs',
  imports: [FormsModule, AsyncPipe],
  templateUrl: './typeahead-ngmodel-rxjs.html',
  styleUrl: '../typeahead-shared.css',
})
export class TypeaheadNgmodelRxjs {
  private query$ = new Subject<string>();
  private _query = '';

  results$ = this.query$.pipe(
    debounceTime(300),
    distinctUntilChanged(),
    switchMap((q) => this.api.search(q)),
    startWith([] as string[]),
  );

  get query(): string {
    return this._query;
  }

  set query(value: string) {
    this._query = value;
    this.query$.next(value);
  }

  constructor(private api: CitySearchService) {}
}
