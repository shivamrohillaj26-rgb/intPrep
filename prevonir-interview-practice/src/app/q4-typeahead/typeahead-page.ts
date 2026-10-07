import { Component } from '@angular/core';
import { TypeaheadSignals } from './typeahead-signals/typeahead-signals';
import { TypeaheadSignalsRxjs } from './typeahead-signals-rxjs/typeahead-signals-rxjs';
import { TypeaheadAccessorRxjs } from './typeahead-accessor-rxjs/typeahead-accessor-rxjs';
import { TypeaheadNgmodelRxjs } from './typeahead-ngmodel-rxjs/typeahead-ngmodel-rxjs';

@Component({
  selector: 'app-typeahead-page',
  imports: [
    TypeaheadSignals,
    TypeaheadSignalsRxjs,
    TypeaheadAccessorRxjs,
    TypeaheadNgmodelRxjs,
  ],
  templateUrl: './typeahead-page.html',
  styleUrl: './typeahead-page.css',
})
export class TypeaheadPage {}

