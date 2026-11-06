import { ComponentFixture, TestBed } from '@angular/core/testing';

import { TypeaheadSearch } from './typeahead-search';

describe('TypeaheadSearch', () => {
  let component: TypeaheadSearch;
  let fixture: ComponentFixture<TypeaheadSearch>;

  beforeEach(async () => {
    await TestBed.configureTestingModule({
      imports: [TypeaheadSearch]
    })
    .compileComponents();

    fixture = TestBed.createComponent(TypeaheadSearch);
    component = fixture.componentInstance;
    await fixture.whenStable();
  });

  it('should create', () => {
    expect(component).toBeTruthy();
  });
});
