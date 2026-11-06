# Provenir HackerRank — Interview Practice (Angular)

Minimal Angular app to practice the 3 questions from `../prevonir/`.

## Run

```bash
cd prevonir-interview-practice
npm start
```

Open http://localhost:4200

## Routes

| Route | Question |
|---|---|
| `/` | Home + concept checklist |
| `/q1` | Responsive form (CSS Grid) |
| `/q2` | Auth (service + guard + login/profile) |
| `/q3` | Meal scheduler (Input/Output + ViewChild) |
| `/q4` | Typeahead — signals / signals+rxjs / getter-setter+rxjs |
| `/q5` | Expand/collapse list (machine coding) |
| `/q6` | Reusable Button variants/sizes |
| `/q7` | Virtualized big list |
| `/q8` | File explorer / VS Code sidebar |
| `/q9` | JWT auth + RBAC + route guards + interceptor |
| `/q10` | Custom pipe (args) + attribute directive (inputs) |
| `/q11` | Reactive forms (FormBuilder + validators + FormArray) |
| `/q12` | Basic calculator (digits, 4 ops, =, C — no eval) |
| `/q13` | Custom structural directive (`*appFor` ≈ ngFor) |
| `/q14` | DI scopes — five steps (root / component / route / appConfig / missing) |

## Demo credentials (Q2)

- `John` / `John@123`
- `Alexa` / `Alexa@123`

## How to practice for tomorrow

1. Open the matching folder in `../prevonir/Q*-*/APPROACH.md`
2. Run this app and click through the feature
3. Close the code and rewrite the feature from memory in a blank component
4. Say the interview talking points out loud (see `PRACTICE.md`)

## Source map

```text
src/app/
  q1-responsive-form/     ← CSS Grid form
  q2-auth/                ← AuthService, authGuard, Login, Profile
  q3-meal/                ← GuestForm + MealSchedule
  q4-typeahead/           ← typeahead approaches + TYPEAHEAD.md
  q5-expand-list/         ← accordion
  q6-ui-button/           ← reusable button
  q7-virtual-list/        ← windowing / virtualization
  q8-file-explorer/       ← VS Code–like tree + README.md (deep) + FILE_EXPLORER.md
  q9-jwt-auth/            ← JWT + role guards + JWT_RBAC.md
  q10-pipe-directive/     ← TruncatePipe + HighlightDirective + README.md
  q11-reactive-form/      ← FormBuilder + validators + README.md
  q12-calculator/         ← phone-style calc engine + UI + README.md
  q13-structural-for/     ← *appFor ngFor clone + README.md
```



Also see: `MACHINE_CODING.md`

Theory / HLD (not in this app):

- `../frontend-system-design/07_PINTEREST_LIKE_GRID_HLD.md`
- `../frontend-system-design/08_PROJECT_HLD_WALKTHROUGH.md`
- `../angular-interview-prep/REACT_TO_ANGULAR_MACHINE_CODING.md`

Reference originals (HR): `../prevonir/`
