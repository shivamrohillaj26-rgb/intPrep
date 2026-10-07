import { ComponentFixture, TestBed } from '@angular/core/testing';

import { MealScheduler } from './meal-scheduler';

describe('MealScheduler', () => {
  let component: MealScheduler;
  let fixture: ComponentFixture<MealScheduler>;

  beforeEach(async () => {
    await TestBed.configureTestingModule({
      imports: [MealScheduler]
    })
    .compileComponents();

    fixture = TestBed.createComponent(MealScheduler);
    component = fixture.componentInstance;
    await fixture.whenStable();
  });

  it('should create', () => {
    expect(component).toBeTruthy();
  });
});
