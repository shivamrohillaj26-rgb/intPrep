# Interview Question Coverage Map (NTT / Persistent / Optum screenshots)

Quick map from recent LinkedIn / company question lists → this repo.  
**Prefer extending these guides over duplicating topics.**

---

## NTT DATA coding checklist

| # | Question | Status | Where |
|---|---|---|---|
| 1 | debounce / throttle | ✅ | [DEBOUNCE_THROTTLE.md](../javascript-interview-prep/DEBOUNCE_THROTTLE.md) |
| 2 | Flatten nested array | ✅ | [DSA_FRONTEND_JS.md](../javascript-interview-prep/DSA_FRONTEND_JS.md) §5 |
| 3 | Promise.all | ✅ | [POLYFILLS_README.md](../javascript-interview-prep/POLYFILLS_README.md) + `practice/promisePolyfill.js` |
| 4 | deepClone | ✅ | [DEEP_CLONE.md](../javascript-interview-prep/DEEP_CLONE.md) |
| 5 | EventEmitter | ✅ | [EVENT_EMITTER.md](../javascript-interview-prep/EVENT_EMITTER.md) |
| 6 | memoization | ✅ | [DSA_FRONTEND_JS.md](../javascript-interview-prep/DSA_FRONTEND_JS.md) §22 |
| 7 | groupBy | ✅ | [DSA_FRONTEND_JS.md](../javascript-interview-prep/DSA_FRONTEND_JS.md) §14 |
| 8 | pipe / compose | ✅ | [PIPE_COMPOSE.md](../javascript-interview-prep/PIPE_COMPOSE.md) |
| 9 | LRU Cache | ✅ | [LRU_CACHE.md](../javascript-interview-prep/LRU_CACHE.md) |
| 10 | Remove duplicate objects | ✅ | DSA `uniqueBy` |
| 11 | First non-repeating char | ✅ | DSA §16 |
| 12 | API retry | ✅ | [API_TIMEOUT_RETRY.md](../javascript-interview-prep/API_TIMEOUT_RETRY.md) |
| 13 | RxJS autocomplete | ✅ | `prevonir-interview-practice/q4` + [RXJS_INTERVIEW.md](../javascript-interview-prep/RXJS_INTERVIEW.md) |
| 14 | Infinite scroll | ✅ | [INFINITE_SCROLL_RACE.md](../javascript-interview-prep/INFINITE_SCROLL_RACE.md) + [12_PAGINATION…](../frontend-system-design/12_PAGINATION_TYPES_FRONTEND_SYSTEM_DESIGN.md) |
| 15 | Reusable filter + sort | ✅ | [FILTER_SORT_UTIL.md](../javascript-interview-prep/FILTER_SORT_UTIL.md) |
| 16 | Virtual scrolling | ✅ | `prevonir-interview-practice/q7` |
| 17 | Pagination component | 🟡 design | [12_PAGINATION…](../frontend-system-design/12_PAGINATION_TYPES_FRONTEND_SYSTEM_DESIGN.md) (no dedicated q-route yet) |
| 18 | Cancel previous search API | ✅ | [CANCELLABLE_FETCH.md](../javascript-interview-prep/CANCELLABLE_FETCH.md) + q4 `switchMap` + TRICKY_10 Q3 |
| 19 | Optimize 100k records | ✅ | [08_LARGE_TABLE_100K_ROWS.md](./08_LARGE_TABLE_100K_ROWS.md) |
| 20 | Angular memory leaks | ✅ | [ANGULAR_MEMORY_LEAKS.md](../angular-interview-prep/ANGULAR_MEMORY_LEAKS.md) |

---

## Persistent Systems

| Question | Status | Where |
|---|---|---|
| ViewChild / ContentChild / ng-content / Portal | ✅ | [ANGULAR_CONTENT_TEMPLATES_QUERIES.md](../angular-interview-prep/ANGULAR_CONTENT_TEMPLATES_QUERIES.md) §28 Portal |
| Why not `{{ getName() }}` in template | ✅ | [ANGULAR_TEMPLATE_FUNCTIONS_CD.md](../angular-interview-prep/ANGULAR_TEMPLATE_FUNCTIONS_CD.md) |
| `router.navigate()` internals | ✅ | [ANGULAR_ROUTER_NAVIGATE_INTERNALS.md](../angular-interview-prep/ANGULAR_ROUTER_NAVIGATE_INTERNALS.md) |
| 100 widgets updating every second | ✅ | [01_DASHBOARD_WIDGETS_POLLING.md](./01_DASHBOARD_WIDGETS_POLLING.md) |
| 100k + filter/sort/pagination | ✅ | [08_LARGE_TABLE_100K_ROWS.md](./08_LARGE_TABLE_100K_ROWS.md) |
| SSR / CSR / SSG / hydration / streaming | ✅ | [14_SSR_CSR_SSG_HYDRATION.md](../frontend-system-design/14_SSR_CSR_SSG_HYDRATION.md) |
| Hydration mismatch + debug | ✅ | same file §6 |
| Module Federation | ✅ | [../micro-frontends/INDEX.md](../micro-frontends/INDEX.md) |
| Implement EventEmitter `on()` | ✅ | [EVENT_EMITTER.md](../javascript-interview-prep/EVENT_EMITTER.md) |

---

## Optum

| Question | Status | Where |
|---|---|---|
| Angular upgrade approach | ✅ | [ANGULAR_UPGRADE_PLAYBOOK.md](../angular-interview-prep/ANGULAR_UPGRADE_PLAYBOOK.md) |
| Official upgrade resources | ✅ | same (`update.angular.io`) |
| Hardest upgrade issue | ✅ | same §4 + your Netradyne strangler story |
| package.json / package-lock | ✅ | [ANGULAR_ECOSYSTEM_FUNDAMENTALS.md](../angular-interview-prep/ANGULAR_ECOSYSTEM_FUNDAMENTALS.md) §3 |
| `npm install` behind the scenes | ✅ | ecosystem §7 |
| npm registry | ✅ | ecosystem §7b |
| Package not on public registry | ✅ | ecosystem §7b |
| Shared logging across apps | ✅ | [ANGULAR_SHARED_LIBRARY.md](../angular-interview-prep/ANGULAR_SHARED_LIBRARY.md) |
| Package & distribute Angular lib | ✅ | same |
| MFE challenges | ✅ | [../micro-frontends/INDEX.md](../micro-frontends/INDEX.md) |
| Angular beyond UI? | ✅ | shared-library §7 + [WHY_ANGULAR…](../angular-interview-prep/WHY_ANGULAR_VS_REACT_NEXT.md) |
| State across MFEs | ✅ | [../micro-frontends/01_MICRO_FRONTENDS_OVERVIEW.md](../micro-frontends/01_MICRO_FRONTENDS_OVERVIEW.md) §6 |
| Apps sharing data | ✅ | same |
| NgRx data flow lifecycle | ✅ | [ANGULAR_NGRX_DATA_FLOW.md](../angular-interview-prep/ANGULAR_NGRX_DATA_FLOW.md) |

---

## Easy–medium coding list (LinkedIn screenshot)

Conceptual “tricky 10” → [TRICKY_10_FRONTEND_QUESTIONS.md](../javascript-interview-prep/TRICKY_10_FRONTEND_QUESTIONS.md) (already covered).

| # | Question | Status | Where |
|---|---|---|---|
| 1 | Flatten / unflatten dot paths | ✅ | [DSA_FRONTEND_JS.md](../javascript-interview-prep/DSA_FRONTEND_JS.md) §19 |
| 2 | Cancellable fetch / AbortController | ✅ | [CANCELLABLE_FETCH.md](../javascript-interview-prep/CANCELLABLE_FETCH.md) |
| 3 | Generate valid parentheses | ✅ | [GENERATE_PARENTHESES.md](../javascript-interview-prep/GENERATE_PARENTHESES.md) |
| 4 | `once(fn)` | ✅ | [ONCE_FN.md](../javascript-interview-prep/ONCE_FN.md) |
| 5 | LRU cache | ✅ | [LRU_CACHE.md](../javascript-interview-prep/LRU_CACHE.md) |
| 6 | Running median (two heaps) | ✅ | [RUNNING_MEDIAN.md](../javascript-interview-prep/RUNNING_MEDIAN.md) |
| 7 | snake_case → camelCase recursive | ✅ | [OBJECT_PATH_UTILS.md](../javascript-interview-prep/OBJECT_PATH_UTILS.md) Part B |
| 8 | `set(obj, path, value)` | ✅ | [OBJECT_PATH_UTILS.md](../javascript-interview-prep/OBJECT_PATH_UTILS.md) Part A |
| 9 | Deep equal, order-insensitive primitive arrays | ✅ | [DEEP_EQUAL.md](../javascript-interview-prep/DEEP_EQUAL.md) §14 |
| 10 | Infinite scroll + race conditions | ✅ | [INFINITE_SCROLL_RACE.md](../javascript-interview-prep/INFINITE_SCROLL_RACE.md) |

---

## Machine coding — Calculator

| Topic | Status | Where |
|---|---|---|
| Calculator UI + state (asked at Jane Street–style / NamasteDev / FE Mentor) | ✅ | `prevonir-interview-practice` **`/q12`** + `q12-calculator/README.md` |

---

## Still thin (optional later)

- Dedicated **pagination component** route in `prevonir-interview-practice` (design guide exists)
- Deeper **streaming SSR** Angular/Next code samples

---

## Optum follow-up (shared libs / state / MFE)

| Question | Status | Where |
|---|---|---|
| Angular beyond UI? | ✅ | [ANGULAR_SHARED_LIBRARY.md](../angular-interview-prep/ANGULAR_SHARED_LIBRARY.md) §10 · [WHY_ANGULAR…](../angular-interview-prep/WHY_ANGULAR_VS_REACT_NEXT.md) §10 |
| MFE cross-app state | ✅ | [../micro-frontends/01_MICRO_FRONTENDS_OVERVIEW.md](../micro-frontends/01_MICRO_FRONTENDS_OVERVIEW.md) §6 |
| Separate apps share data | ✅ | Shared lib §9 + MF guide |
| NgRx lifecycle | ✅ | [ANGULAR_NGRX_DATA_FLOW.md](../angular-interview-prep/ANGULAR_NGRX_DATA_FLOW.md) |
| State mgmt **besides** NgRx | ✅ | NgRx guide §6b |
| Independent projects data transfer | ✅ | Shared lib §9 |
| Share logic/utils/components | ✅ | Shared library guide |
| Create + consume shared lib example | ✅ | Shared lib §7 |
| Reusable lib design factors | ✅ | Shared lib §8 |
| MFE version / dependency sharing | ✅ | Micro frontends (singleton `shared`, `requiredVersion`) |

---

## Coding round classics (15)

| # | Problem | Where |
|---|---|---|
| 1–15 | productExceptSelf, word pattern, even/odd, brackets, subsets, vowels, subarray sum=k, longest word, 3Sum, compress, reverse arr, remove chars, LIS, rotation, pairs diff k | [DSA_CODING_ROUND_CLASSICS.md](../javascript-interview-prep/DSA_CODING_ROUND_CLASSICS.md) |
| brackets | also | [DSA_FRONTEND_JS.md](../javascript-interview-prep/DSA_FRONTEND_JS.md) §3 |

---

## Night-before drill (from these lists)

1. pipe/compose dry-run  
2. `{{ getName() }}` 30s answer  
3. router.navigate pipeline  
4. NgRx action→effect→store→selector  
5. Memory leak detect + `takeUntilDestroyed`  
6. update.angular.io + one hard upgrade story  
7. Hydration mismatch causes  
8. `@org/logging` peerDeps story  
9. State besides NgRx (signals / ComponentStore / URL)  
10. One DSA classic: productExceptSelf or 3Sum  
