# NgRx Data Flow — Interview Ready Guide

Prompt:

> Walk me through the NgRx data flow lifecycle, from user interaction to UI update.

Related: when to use NgRx vs signals → Provenir prep / IDMS HLD · Signals → [ANGULAR_SIGNALS.md](./ANGULAR_SIGNALS.md)

---

## 1. One-liner

> **Action** describes “what happened” → **Reducer** (pure) updates **Store** state → **Selectors** read slices → component binds UI. Side effects (HTTP) go through **Effects**, which dispatch new actions — never inside reducers.

---

## 2. Lifecycle diagram

```text
[UI event] click "Load Users"
      │
      ▼
 dispatch(loadUsers())          ← Action (plain object: type + payload)
      │
      ├──────────────────────────────┐
      ▼                              ▼
  Reducers (sync, pure)          Effects (async side effects)
  switch(type) → new state       listen loadUsers$ → HTTP
      │                              │
      ▼                              ▼
    Store                        dispatch(loadUsersSuccess(data))
      │                              │
      └─────────────┬────────────────┘
                    ▼
              Selectors (memoized)
                    │
                    ▼
         Component async pipe / signal
                    │
                    ▼
                   UI
```

---

## 3. Pieces

| Piece | Responsibility |
|---|---|
| **Action** | Event: `{ type: '[Users] Load' }` |
| **Reducer** | `(state, action) => newState` — **no HTTP, no random** |
| **Store** | Single state tree (or feature states) |
| **Selector** | Derive view model; memoized |
| **Effect** | Listen actions → API / router → dispatch success/fail |
| **Component** | Dispatch + select only (thin) |

---

## 4. Minimal code shape

```ts
// actions
export const loadUsers = createAction('[Users] Load');
export const loadUsersSuccess = createAction(
  '[Users] Load Success',
  props<{ users: User[] }>(),
);

// reducer
const initial = { users: [] as User[], loading: false };
export const usersReducer = createReducer(
  initial,
  on(loadUsers, (s) => ({ ...s, loading: true })),
  on(loadUsersSuccess, (s, { users }) => ({ ...s, users, loading: false })),
);

// selectors
export const selectUsers = (s: AppState) => s.users.users;
export const selectUserCount = createSelector(selectUsers, (u) => u.length);

// effect
loadUsers$ = createEffect(() =>
  this.actions$.pipe(
    ofType(loadUsers),
    switchMap(() =>
      this.api.getUsers().pipe(
        map((users) => loadUsersSuccess({ users })),
        catchError(() => of(loadUsersFailure())),
      ),
    ),
  ),
);

// component
this.store.dispatch(loadUsers());
users$ = this.store.select(selectUsers);
```

---

## 5. Rules interviewers love

1. **One-way data flow** — UI never mutates store directly  
2. **Reducers pure** — same action + state → same next state  
3. **Effects for I/O** — HTTP, localStorage, navigation  
4. **Selectors over store soup** — don’t subscribe to whole state in every component  
5. **Feature stores** — lazy `StoreModule.forFeature` / `provideState`  

---

## 6. When NgRx vs signals / services

| Use NgRx when… | Prefer signals/service when… |
|---|---|
| Many features share complex client workflows | Local UI / one feature’s server cache |
| Time-travel / strict audit of events helps | Simple CRUD page |
| Large team needs conventions | Small app / prototype |

> At TCS Employee Portal I used NgRx for shared HR workflows. At Netradyne IDMS we mostly use feature services + signals — domain isolation without global store weight.

---

## 6b. Apart from NgRx — other state approaches (Optum Q)

| Approach | When I’d use it |
|---|---|
| **Component state / signals** | Local UI (open panels, form scratch) |
| **`providedIn` service + signals / BehaviorSubject** | Feature server cache, simple shared state |
| **RxJS `shareReplay` in API layer** | Dedupe in-flight HTTP |
| **NgRx** | Cross-feature workflows, many writers, team convention |
| **NGXS / Elf / Akita** (evaluated) | Similar global-store goals; I’d pick what the team standards — I’ve used NgRx + signals/services most |
| **Component Store** (`@ngrx/component-store`) | Complex **single-feature** local store without app-wide NgRx |
| **URL as state** | Filters, selected id, shareable links (esp. MFEs) |
| **Server as source of truth** | Prefer refetch over syncing giant client stores across apps |

**Spoken (20s):**

> Besides NgRx I’ve used feature services with signals or BehaviorSubject, Component Store for one fat feature, and URL/server state for cross-app cases. I pick NgRx when many features share complex client workflows; otherwise I keep state closer to the feature.

---

## 7. Spoken (45s)

> In NgRx the UI dispatches an action — a plain event object. Reducers handle that action synchronously and return a new state into the store. If we need HTTP, an Effect listens for the action, calls the API, and dispatches a success or failure action which reducers apply. Components read data through memoized selectors, often with async pipe. That unidirectional flow keeps state predictable and side effects out of reducers.

---

## 8. Q&A

**Q: Can reducers call APIs?**  
A: No — Effects do.

**Q: Why memoized selectors?**  
A: Avoid recomputing / re-emitting identical projections → fewer CD triggers.

**Q: Entity adapter?**  
A: Helper for collections (ids + entities map) — good follow-up.

---

## 9. Practice checklist

- [ ] Draw action → reducer/effect → store → selector → UI  
- [ ] Say “reducers pure / effects I/O”  
- [ ] Contrast with signals/service  
- [ ] Name `ofType` + `switchMap` in an effect  
