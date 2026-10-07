# Interview Talking Points (say these out loud)

## Q1 — Responsive Form

> I used CSS Grid with 6 columns because LCM(2,3)=6. That lets me do thirds with `span 2`, halves with `span 3`, and full width with `span 6`. On mobile I collapse to one column and reset spans. Grid is better than Flex here because fields are siblings with mixed row recipes and we couldn’t add wrappers.

Key lines to rewrite from memory:

```css
form {
  display: grid;
  grid-template-columns: repeat(6, 1fr);
  gap: 10px;
}
.first-name { grid-column: span 2; }
.address { grid-column: span 6; }
.job-title { grid-column: span 3; }

@media (max-width: 767px) {
  form { grid-template-columns: 1fr; }
  /* reset all spans to 1 */
}
```

---

## Q2 — Auth Module

> Auth state lives in a root singleton service. Login uses template-driven `[(ngModel)]` (reactive forms were banned). Button disabled until both fields filled. Wrong credentials show error and clear inputs. AuthGuard blocks `/profile` when not logged in and redirects to login. Nav toggles with `isLoggedIn()`.

Flow:

```text
Login → AuthService.login() → navigate /profile
Guard → isLoggedIn()? allow : redirect /q2
Profile → read loggedInUser → Logout clears + navigate login
```

Must remember:

- service methods: `login / logout / isLoggedIn`
- public service in shell if template calls it
- `[disabled]="!userName || !password"`

---

## Q3 — Meal Scheduler

> GuestForm emits a guest via Output. Parent stores guests with spread `[...guests, guest]` so Input change detection fires. MealSchedule uses a getter to build date rows. I use ViewChild to read DOM values because tests set `input.value` directly. Date ranges use local `new Date(y, m-1, d)` to avoid UTC off-by-one. Don’t forget `getDate()` parentheses.

Flow:

```text
GuestForm.addGuest()
  → emit {name, start, end}
  → parent: guests = [...guests, guest]
  → MealSchedule @Input guestList
  → getter scheduleRows → table
```

Bugs to avoid:

1. `push` instead of spread → Input may not update  
2. `new Date('YYYY-MM-DD')` → timezone shift  
3. `getDate` without `()` → wrong dates  
4. Shared array for breakfast/lunch/dinner → use `[...guests]` each  

---

## Q4 — Typeahead

> For API typeahead I use a query signal + RxJS (`debounceTime`, `distinctUntilChanged`, `switchMap`) via `toObservable`/`toSignal`. Pure signals are enough for sync local lists. Getter/setter + Subject is the classic pattern but setter side-effects are noisier.

Best pick: **Signals + RxJS** (see `src/app/q4-typeahead/TYPEAHEAD.md`).

---

## 45-minute practice plan

| Time | Task |
|---|---|
| 0–10 | Rewrite Q1 CSS from blank |
| 10–25 | Rewrite Q2 service + login + guard + profile |
| 25–35 | Rewrite Q3 form + schedule getter |
| 35–45 | Rewrite Signals+RxJS typeahead + speak why |
