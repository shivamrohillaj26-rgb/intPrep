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
| 5 | Build pipeline: ESM, Webpack → esbuild/Vite | [ANGULAR_BUILD_ESM_WEBPACK_ESBUILD.md](./ANGULAR_BUILD_ESM_WEBPACK_ESBUILD.md) |
| 6 | **Version → features (living)** — latest + per-major; **update after each Angular blog** | [ANGULAR_VERSION_FEATURES.md](./ANGULAR_VERSION_FEATURES.md) |
| 7 | React machine-coding → Angular map | [REACT_TO_ANGULAR_MACHINE_CODING.md](./REACT_TO_ANGULAR_MACHINE_CODING.md) |
| 7c | **“Design this component” round** (autocomplete + how to approach) | [ANGULAR_COMPONENT_DESIGN_ROUND.md](./ANGULAR_COMPONENT_DESIGN_ROUND.md) |
| 7b | Why Angular vs React / Next.js (tradeoffs) | [WHY_ANGULAR_VS_REACT_NEXT.md](./WHY_ANGULAR_VS_REACT_NEXT.md) |
| 8 | Unit testing (Jest, Jasmine, Karma, TestBed) | [UNIT_TESTING.md](./UNIT_TESTING.md) |
| 9 | Signals (deep: computed, effect, linkedSignal, resource) | [ANGULAR_SIGNALS.md](./ANGULAR_SIGNALS.md) |
| 9b | **Signals vs RxJS** (not alternatives — interview) | [ANGULAR_SIGNALS_VS_RXJS.md](./ANGULAR_SIGNALS_VS_RXJS.md) |
| 10 | Change detection: Default vs OnPush vs Zoneless | [ANGULAR_CHANGE_DETECTION_ONPUSH_ZONELESS.md](./ANGULAR_CHANGE_DETECTION_ONPUSH_ZONELESS.md) |
| 11 | Why not call functions in templates | [ANGULAR_TEMPLATE_FUNCTIONS_CD.md](./ANGULAR_TEMPLATE_FUNCTIONS_CD.md) |
| 12 | `router.navigate()` internals | [ANGULAR_ROUTER_NAVIGATE_INTERNALS.md](./ANGULAR_ROUTER_NAVIGATE_INTERNALS.md) |
| 12b | **Route guards** (auth, role, CanMatch, deactivate, resolve) | [ANGULAR_ROUTE_GUARDS.md](./ANGULAR_ROUTE_GUARDS.md) |
| 13 | NgRx data flow lifecycle | [ANGULAR_NGRX_DATA_FLOW.md](./ANGULAR_NGRX_DATA_FLOW.md) |
| 14 | Memory leaks — detect & fix | [ANGULAR_MEMORY_LEAKS.md](./ANGULAR_MEMORY_LEAKS.md) |
| 15 | Angular upgrade playbook (`update.angular.io`) | [ANGULAR_UPGRADE_PLAYBOOK.md](./ANGULAR_UPGRADE_PLAYBOOK.md) |
| 16 | Shared Angular library (logging / publish) | [ANGULAR_SHARED_LIBRARY.md](./ANGULAR_SHARED_LIBRARY.md) |
| 17 | **Reactive forms** (FormArray, validators, deep + Q bank) | [ANGULAR_REACTIVE_FORMS.md](./ANGULAR_REACTIVE_FORMS.md) |
| 18 | **Signal forms** (`form()`, `[formField]`, schema) | [ANGULAR_SIGNAL_FORMS.md](./ANGULAR_SIGNAL_FORMS.md) |
| 19 | **SSR** (`@angular/ssr`, hydration, TransferState) | [ANGULAR_SSR.md](./ANGULAR_SSR.md) |
| 20 | **How will you optimize an Angular app?** (interview) | [ANGULAR_OPTIMIZE_APPLICATION.md](./ANGULAR_OPTIMIZE_APPLICATION.md) |
| 21 | **`app.config.ts` vs `angular.json`** | [ANGULAR_APP_CONFIG_AND_ANGULAR_JSON.md](./ANGULAR_APP_CONFIG_AND_ANGULAR_JSON.md) |
| 22 | **NgModule vs Standalone** (old vs latest architecture) | [ANGULAR_NGMODULE_VS_STANDALONE.md](./ANGULAR_NGMODULE_VS_STANDALONE.md) |

---

## Related folders

| Folder | What |
|---|---|
| `../angular-interview-app/` | Demo Angular app for Questions1 topics |
| `../practice-angular/` | Your practice playground (chat-bot, cart, etc.) |
| `../javascript-interview-prep/ASYNC_DEFER.md` | Browser script `async` / `defer` (HTML loading) |
| `../javascript-interview-prep/PROMISES_VS_OBSERVABLES.md` | RxJS vs Promises |
| `../javascript-interview-prep/RXJS_INTERVIEW.md` | **Full RxJS interview guide** — flattening ops, Subjects, combine*, leaks, Q bank |
| `../javascript-interview-prep/API_TIMEOUT_RETRY.md` | Timeout + retry — Promise.race **and** HttpClient `timeout`/`retry` |

---

## Suggested study order

1. Ecosystem fundamentals (npm, SemVer, tsconfig, AOT, lazy load) ← often asked first
2. Build pipeline ESM / Webpack→esbuild ← [ANGULAR_BUILD_ESM_WEBPACK_ESBUILD.md](./ANGULAR_BUILD_ESM_WEBPACK_ESBUILD.md)
3. Version → features cheat sheet ← [ANGULAR_VERSION_FEATURES.md](./ANGULAR_VERSION_FEATURES.md)
4. Dependency Injection (providers, hierarchy, `inject()`)
5. Lifecycle hooks + `afterNextRender` / `DestroyRef`
6. `ng-content` / `ng-template` / `ViewChild` / `ContentChild`
7. Signals (deep) + `input()` / `model()` / `viewChild()` ← [ANGULAR_SIGNALS.md](./ANGULAR_SIGNALS.md)  
   **Signals vs RxJS** ← [ANGULAR_SIGNALS_VS_RXJS.md](./ANGULAR_SIGNALS_VS_RXJS.md)
8. Unit testing (Jest + Jasmine/Karma + TestBed) ← often asked with DI
9. Change detection + `OnPush` + zoneless ← [ANGULAR_CHANGE_DETECTION_ONPUSH_ZONELESS.md](./ANGULAR_CHANGE_DETECTION_ONPUSH_ZONELESS.md)
10. **RxJS** (flattening ops, Subjects, leaks) ← [../javascript-interview-prep/RXJS_INTERVIEW.md](../javascript-interview-prep/RXJS_INTERVIEW.md)
11. Routing + guards ← [ANGULAR_ROUTE_GUARDS.md](./ANGULAR_ROUTE_GUARDS.md) + [navigate internals](./ANGULAR_ROUTER_NAVIGATE_INTERNALS.md)
12. Template functions / CD pitfalls ← [ANGULAR_TEMPLATE_FUNCTIONS_CD.md](./ANGULAR_TEMPLATE_FUNCTIONS_CD.md)
13. NgRx lifecycle / upgrade / shared libs / memory leaks (as needed)
14. **Reactive forms** ← [ANGULAR_REACTIVE_FORMS.md](./ANGULAR_REACTIVE_FORMS.md) + practice `/q11`  
15. **Signal forms** ← [ANGULAR_SIGNAL_FORMS.md](./ANGULAR_SIGNAL_FORMS.md) (pair with reactive)
16. **SSR / hydration** ← [ANGULAR_SSR.md](./ANGULAR_SSR.md) (pair with [system-design 14](../frontend-system-design/14_SSR_CSR_SSG_HYDRATION.md))
17. **Optimize an Angular app** (load / CD / lists / memory) ← [ANGULAR_OPTIMIZE_APPLICATION.md](./ANGULAR_OPTIMIZE_APPLICATION.md)  
18. **NgModule vs Standalone** ← [ANGULAR_NGMODULE_VS_STANDALONE.md](./ANGULAR_NGMODULE_VS_STANDALONE.md)
