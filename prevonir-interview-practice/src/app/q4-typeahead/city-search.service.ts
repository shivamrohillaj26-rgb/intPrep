import { Injectable } from '@angular/core';
import { Observable, delay, of } from 'rxjs';

/** Tiny fake API — same data for all 3 typeahead demos */
@Injectable({ providedIn: 'root' })
export class CitySearchService {
  private cities = [
    'Delhi',
    'Mumbai',
    'Bengaluru',
    'Hyderabad',
    'Chennai',
    'Pune',
    'Kolkata',
    'Ahmedabad',
    'Jaipur',
    'Chandigarh',
  ];

  /** sync filter (signals-only demo) */
  searchSync(term: string): string[] {
    const q = term.trim().toLowerCase();
    if (!q) return [];
    return this.cities.filter((c) => c.toLowerCase().includes(q));
  }

  /** async API style (rxjs demos) */
  search(term: string): Observable<string[]> {
    return of(this.searchSync(term)).pipe(delay(300));
  }
}
