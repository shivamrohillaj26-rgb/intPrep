# Q3 - Hotel Meal Scheduler

## Problem
Build a Hotel Meal Scheduler with 2 components:
- GuestForm: name + start date + end date + "Add to Menu" button (resets after submit)
- MealSchedule: table with 1 row per date, 4 columns: Date, Breakfast, Lunch, Dinner
  - Each meal column lists all guests staying on that date (in order added)
  - Rows sorted ascending by date
  - All dates between start and end (inclusive) are stay dates

## Data Flow
GuestForm → @Output onGuestAdded → AppComponent → @Input guestList → MealSchedule

## Files Changed
1. app.component.ts          → added guests[], onGuestAdded()
2. app.component.html        → added [guestList]="guests" binding
3. guestForm.component.ts    → ViewChild + addGuest() logic
4. guestForm.component.html  → template refs + (click)
5. mealSchedule.component.ts → @Input, getter, getDateRange()
6. mealSchedule.component.html → *ngFor over scheduleRows

## Key Decisions & Why

### ViewChild over [(ngModel)] in GuestForm
Tests set input.value directly in DOM.
[(ngModel)] needs 'input' event to sync — test may not dispatch it.
ViewChild reads nativeElement.value = exactly what the test sets.
Resetting nativeElement.value = '' clears exactly what test checks.

### Getter over ngOnChanges in MealSchedule
Getter recomputes fresh every Angular cycle → no stale state.
ngOnChanges can miss updates if timing is off.

### Local Date over new Date('YYYY-MM-DD')
ISO strings parsed as UTC midnight → off-by-one in some timezones.
new Date(y, m-1, d) uses local time → always correct.

### [...spread] for breakfast/lunch/dinner arrays
Same guests per day for all 3 meals.
Spread creates separate arrays → no accidental shared mutations.

### Why [...this.guests, guest] in AppComponent
Creates NEW array reference → Angular change detection fires on @Input.
Push() mutates existing array → Angular may not detect the change.

## Required data-test-id attributes
- name-input      (guest name input)
- start-date      (start date input)
- end-date        (end date input)
- submit-button   (Add to Menu button)
- meal-schedule   (tbody)
- date            (td - date column)
- breakfast-list  (ul - breakfast column)
- lunch-list      (ul - lunch column)
- dinner-list     (ul - dinner column)

## Interview Talking Points
1. Why ViewChild? Tests set DOM value directly, ngModel needs event dispatch
2. Why getter? Always fresh data, no stale state risk
3. Why local Date? Avoid UTC timezone off-by-one bugs
4. Why spread for guests array in AppComponent? Triggers change detection
5. The bug that was hard to find: getDate vs getDate() (missing parentheses)
