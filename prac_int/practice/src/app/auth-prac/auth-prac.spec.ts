import { ComponentFixture, TestBed } from '@angular/core/testing';

import { AuthPrac } from './auth-prac';

describe('AuthPrac', () => {
  let component: AuthPrac;
  let fixture: ComponentFixture<AuthPrac>;

  beforeEach(async () => {
    await TestBed.configureTestingModule({
      imports: [AuthPrac]
    })
    .compileComponents();

    fixture = TestBed.createComponent(AuthPrac);
    component = fixture.componentInstance;
    await fixture.whenStable();
  });

  it('should create', () => {
    expect(component).toBeTruthy();
  });
});
