import { AsyncPipe } from '@angular/common';
import { Component, inject, signal } from '@angular/core';
import { toObservable } from '@angular/core/rxjs-interop';
import { debounceTime, distinctUntilChanged, startWith, switchMap } from 'rxjs';
import { CitySearchService } from '../city-search.service';

/**
 * Approach 2 — Signals + RxJS + async pipe  ✅
 *
 * WHY toObservable(this.query) — NOT of(this.query)?
 * -------------------------------------------------
 * toObservable(signal):
 *   - Creates a LIVE stream from a signal
 *   - Emits the current value, then emits AGAIN every time signal.set() runs
 *   - So each keystroke → query.set('d') → query.set('de') → new emissions
 *   - Perfect bridge: Signal world → RxJS operators (debounce/switchMap)
 *
 * of(this.query)  ❌ WRONG for typeahead
 *   - of(...) emits whatever you pass ONCE, then completes
 *   - this.query is the Signal FUNCTION/object itself, not the string value
 *   - Even of(this.query()) only emits the value AT THAT MOMENT (e.g. '')
 *     and NEVER listens to later keystrokes
 *
 * of(this.query()) example problem:
 *   results$ = of(this.query()).pipe(...)  // emits '' once at construction
 *   // typing later updates the signal, but results$ already completed → no search
 */
@Component({
  selector: 'app-typeahead-signals-rxjs',
  imports: [AsyncPipe],
  templateUrl: './typeahead-signals-rxjs.html',
  styleUrl: '../typeahead-shared.css',
})
export class TypeaheadSignalsRxjs {
  private api = inject(CitySearchService);

  // source of truth for the input text (signal)
  query = signal('');

  // Bridge signal → Observable, then apply RxJS time/async operators
  results$ = toObservable(this.query).pipe(
    // wait until user pauses typing
    debounceTime(300),
    // ignore emit if text did not change
    distinctUntilChanged(),
    // new term cancels previous in-flight search (no race)
    switchMap((q) => this.api.search(q)),
    // first template render before any keystroke
    startWith([] as string[]),
  );

  onInput(value: string) {
    // each set() triggers a new toObservable emission
    this.query.set(value);
  }
}
