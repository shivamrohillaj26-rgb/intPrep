import { AsyncPipe } from '@angular/common';
import { Component } from '@angular/core';
import { Subject, debounceTime, distinctUntilChanged, startWith, switchMap } from 'rxjs';
import { CitySearchService } from '../city-search.service';

/**
 * Approach 3 — Getter/Setter + RxJS + async pipe
 * No subscribe/ngOnDestroy — async pipe unsubscribes
 */
@Component({
  selector: 'app-typeahead-accessor-rxjs',
  imports: [AsyncPipe],
  templateUrl: './typeahead-accessor-rxjs.html',
  styleUrl: '../typeahead-shared.css',
})
export class TypeaheadAccessorRxjs {
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
