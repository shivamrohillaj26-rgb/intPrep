import { Component, computed, signal } from '@angular/core';
import { combineLatest, combineLatestAll, debounceTime, of, Subject, switchMap } from 'rxjs';
import { FormsModule } from '@angular/forms';
import { AsyncPipe } from '@angular/common';
import { toObservable } from '@angular/core/rxjs-interop';

@Component({
  selector: 'app-typeahead-search',
  imports: [FormsModule , AsyncPipe],
  templateUrl: './typeahead-search.html',
  styleUrl: './typeahead-search.css',
})
export class TypeaheadSearch {
  // searchTermSubject = new Subject<string>();
  // search_query = ""
  // get search(){
  //   return this.search_query
  // }
  // set search(value: string) {
  //   this.search_query = value;
  //   console.log(value);
  //   this.searchTermSubject.next(value);
  // }

  // result = this.searchTermSubject.pipe(
  //   switchMap((value:string)=>of(value))
  // )

  search = signal<string>('');
  result = toObservable(this.search).pipe(
    debounceTime(300),
    switchMap((value:string)=>of(value))
  )
}
