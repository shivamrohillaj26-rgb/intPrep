import { AsyncPipe } from '@angular/common';
import { Component, inject, signal } from '@angular/core';
import { toObservable } from '@angular/core/rxjs-interop';
import { map, startWith } from 'rxjs';
import { CitySearchService } from '../city-search.service';

/**
 * Approach 1 — Signals + async pipe (sync filter)
 *
 * toObservable(this.query) = LIVE stream of signal values (every set()).
 * of(this.query()) would emit ONLY the initial value once — not useful for search-as-you-type.
 *
 * (For sync-only UI you could also use computed() instead of async pipe.)
 */
@Component({
  selector: 'app-typeahead-signals',
  imports: [AsyncPipe],
  templateUrl: './typeahead-signals.html',
  styleUrl: '../typeahead-shared.css',
})
export class TypeaheadSignals {
  private api = inject(CitySearchService);

  query = signal('');

  results$ = toObservable(this.query).pipe(
    map((q) => this.api.searchSync(q)),
    startWith([] as string[]),
  );

  onInput(value: string) {
    this.query.set(value);
  }
}
