# Typeahead — Which approach is better?

## Winner for interviews / real apps: **Signals + RxJS + async pipe**

```ts
query = signal('');
results$ = toObservable(this.query).pipe(
  debounceTime(300),
  distinctUntilChanged(),
  switchMap((q) => this.api.search(q)),
  startWith([]),
);
```

```html
@for (city of results$ | async; track city) { ... }
```

`async` pipe subscribes/unsubscribes for you — no manual `subscribe` / `ngOnDestroy`.

### Why this wins

| Need | Signals only | Signals + RxJS | Getter/Setter + RxJS |
|---|---|---|---|
| Local sync filter | ✅ best simple | OK | OK |
| Debounce typing | ❌ manual timer | ✅ | ✅ |
| Cancel old HTTP (`switchMap`) | ❌ | ✅ | ✅ |
| Skip duplicate terms | ❌ | ✅ `distinctUntilChanged` | ✅ |
| Clean template state | ✅ signals | ✅ signals | plain array |
| Easy to test/read | ✅ | ✅ | ⚠️ side-effect in setter |
| Modern Angular style | ✅ | ✅✅ | legacy-ish |

### Speak this

> For typeahead I keep the query as a signal, convert it with `toObservable`, then use RxJS operators for time-based async control — debounce, distinct, switchMap. Results come back with `toSignal` for the template. Pure signals are fine for sync local filtering, but RxJS is better for async search. Getter/setter + Subject is the old pattern; it works, but putting stream next() inside a setter is less clear than an explicit `onInput` + signal.

### Operator roles (must know)

- `debounceTime(300)` — wait until user pauses  
- `distinctUntilChanged()` — ignore same query again  
- `switchMap` — new keystroke cancels previous request (no race)

### When pick each

1. **Signals only** — autocomplete over an in-memory array, no API  
2. **Signals + RxJS** — API/typeahead (choose this in interviews)  
3. **Getter/Setter + RxJS** — manual `[value]/(input)` without FormsModule  
4. **Getter/Setter + ngModel + RxJS** — classic interview style; `[(ngModel)]="query"` calls setter each keystroke
