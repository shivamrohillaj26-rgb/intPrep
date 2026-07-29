# Angular Interview Prep — Index

Deep Angular guides with usage examples for interviews and practice apps.

Folder: `angular-interview-prep/`

---

## Topics

| # | Topic | File |
|---|---|---|
| 1 | Component Lifecycle (deep) | [ANGULAR_LIFECYCLE.md](./ANGULAR_LIFECYCLE.md) |
| 2 | Dependency Injection (interview) | [ANGULAR_DEPENDENCY_INJECTION.md](./ANGULAR_DEPENDENCY_INJECTION.md) |
| 3 | ng-content, ng-template, ViewChild | [ANGULAR_CONTENT_TEMPLATES_QUERIES.md](./ANGULAR_CONTENT_TEMPLATES_QUERIES.md) |
| 4 | Ecosystem fundamentals (npm/TS/build) | [ANGULAR_ECOSYSTEM_FUNDAMENTALS.md](./ANGULAR_ECOSYSTEM_FUNDAMENTALS.md) |
| 5 | React machine-coding → Angular map | [REACT_TO_ANGULAR_MACHINE_CODING.md](./REACT_TO_ANGULAR_MACHINE_CODING.md) |
| 6 | Unit testing (Jest, Jasmine, Karma, TestBed) | [UNIT_TESTING.md](./UNIT_TESTING.md) |
| 7 | Signals (deep: computed, effect, linkedSignal, resource) | [ANGULAR_SIGNALS.md](./ANGULAR_SIGNALS.md) |

---

## Related folders

| Folder | What |
|---|---|
| `../angular-interview-app/` | Demo Angular app for Questions1 topics |
| `../practice-angular/` | Your practice playground (chat-bot, cart, etc.) |
| `../javascript-interview-prep/ASYNC_DEFER.md` | Browser script `async` / `defer` (HTML loading) |
| `../javascript-interview-prep/PROMISES_VS_OBSERVABLES.md` | RxJS vs Promises |

---

## Suggested study order

1. Ecosystem fundamentals (npm, SemVer, tsconfig, AOT, lazy load) ← often asked first
2. Dependency Injection (providers, hierarchy, `inject()`)
3. Lifecycle hooks + `afterNextRender` / `DestroyRef`
4. `ng-content` / `ng-template` / `ViewChild` / `ContentChild`
5. Signals (deep) + `input()` / `model()` / `viewChild()` ← [ANGULAR_SIGNALS.md](./ANGULAR_SIGNALS.md)
6. Unit testing (Jest + Jasmine/Karma + TestBed) ← often asked with DI
7. Change detection + `OnPush` + zoneless (pairs with signals)
8. Routing + guards
9. Forms (template + reactive)
