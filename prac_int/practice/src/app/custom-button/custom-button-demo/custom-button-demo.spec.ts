import { ComponentFixture, TestBed } from '@angular/core/testing';

import { CustomButtonDemo } from './custom-button-demo';

describe('CustomButtonDemo', () => {
  let component: CustomButtonDemo;
  let fixture: ComponentFixture<CustomButtonDemo>;

  beforeEach(async () => {
    await TestBed.configureTestingModule({
      imports: [CustomButtonDemo]
    })
    .compileComponents();

    fixture = TestBed.createComponent(CustomButtonDemo);
    component = fixture.componentInstance;
    await fixture.whenStable();
  });

  it('should create', () => {
    expect(component).toBeTruthy();
  });
});
