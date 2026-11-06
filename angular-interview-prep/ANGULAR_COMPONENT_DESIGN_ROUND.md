# How to approach “design this component / feature” (Angular)

**Use this when:** they give you a UI to build in 30–45 min, or “walk me through how you’d design X.”  
**Gold example on the web:** **search autocomplete / typeahead** — InterviewLane and FrontendPrep both treat it as the fan-favorite because it mixes async, races, a11y, and UI. You already practiced the RxJS core on **`/q4`**.

**Not a full HLD** (that’s Pinterest/CDN). This is **component design**.

---

## 0. How you start every time (say this out loud)

Don’t open the laptop and type HTML. **Clarify → split → states → data → keyboard → done.**

```text
1. Repeat the product in one sentence + ask 4 questions
2. Draw: smart page vs dumb pieces
3. List UI states (empty / loading / data / error)
4. Data: who fetches, debounce, cancel, cache
5. Keyboard + a11y if it’s an input/list
6. Then code the happy path; mention extras if time
```

**Spoken 15s before coding:**

> I’ll confirm the API and min characters, then a smart search box that owns the stream and a dumb suggestion list. Debounce, switchMap so old HTTP can’t win, loading/empty/error, keyboard and ARIA combobox if we have time.

---

## 1. Questions to ask (2 minutes)

| Ask | Why |
|---|---|
| Local list or **HTTP**? | Sync filter vs debounce + cancel |
| Min chars? Debounce ms? Max suggestions? | Stops over-fetch |
| Select → fill input, or navigate to detail? | Output contract |
| Multi-select / chips? | Scope creep — v2 |
| Must work keyboard-only? | Senior signal |

If they shrug: **HTTP**, min 2 chars, 300ms, 10 items, click selects, keyboard if time.

---

## 2. Split the component (smart / dumb)

```text
SearchBox (smart)
  - input value (signal or FormControl)
  - calls API
  - loading / error
  SuggestionList (dumb)
    - @Input items, activeIndex
    - @Output pick
```

Smart injects `HttpClient`. Dumb is **OnPush**, no API. Same split for modal, table, file tree.

---

## 3. Worked example — Autocomplete (the one they love)

**Product:** User types; after a pause, show matching devices/users; click or Enter picks one.

```text
[  search input           ]
[  Truck 12               ]
[  Truck 19               ]  ← highlighted
[  Van 7                  ]
```

### Functional

- Type → suggestions  
- Mouse click selects  
- Clear / Escape closes  

### Non-functional (say these)

- Don’t hit the server **every key**  
- Slow “tru” must not overwrite fast “truck”  
- Cap list at ~10 (don’t render 1000 in a popover)  
- Leave the page → **cancel** HTTP  

### Data (Angular — this is the meat)

```text
query signal / valueChanges
  → debounceTime(300)
  → distinctUntilChanged()
  → filter min 2 chars
  → switchMap(q => http.get('/api/search?q=' + q))   // cancel in-flight
  → catchError → []
  → toSignal / async pipe
```

`switchMap` = new keystrokes **abort** the old request. That’s the race. Not `mergeMap`.

Optional: small `Map<string, Item[]>` cache so backspace to a typed query is instant.

### UI states

| State | Show |
|---|---|
| Idle / &lt; min chars | No list |
| Loading | Spinner, keep old list or skeleton |
| Empty | “No matches” |
| Error | “Couldn’t search” + retry |
| Data | List, highlight active index |

### Keyboard (if they want senior)

Arrows move `activeIndex`, Enter selects, Escape closes. Reset index when `results` change.

### A11y (one sentence)

Input `role="combobox"`, `aria-expanded`, `aria-controls` on the list `role="listbox"`, options `role="option"`. That’s the **ARIA combobox** pattern (Angular CDK / Material autocomplete does this).

### What you would **not** do in 45 min

Virtual scroll of 10 items, infinite scroll, GraphQL, NgRx for one box.

---

## 4. 45-minute clock

| Min | Do |
|---|---|
| 0–5 | Clarify + draw boxes |
| 5–20 | Input + debounce + `switchMap` + list |
| 20–30 | Loading / empty / click select |
| 30–40 | `track` by id, OnPush on row, destroy/cancel |
| 40–45 | Keyboard or cache; say what you’d add |

If stuck: **working search + cancel** beats pretty CSS.

---

## 5. Same approach, other prompts

| They say | Same steps |
|---|---|
| Modal / dialog | Smart owns open signal; dumb is overlay; focus trap if time |
| Infinite table | Smart fetches pages; dumb rows OnPush; CDK virtual vs IntersectionObserver |
| File explorer | Dumb node (`isOpen` local); parent owns tree data — your `/q8` |
| Tabs | Dumb headers; smart owns `activeId` + `loadComponent` |
| Toast | Service (root) + dumb toaster view |

Always: **who owns data**, **what are the states**, **what happens on unmount**.

---

## 6. Spoken 45s (autocomplete)

> I’d build a smart search box and a dumb list. The box holds the query as a signal, `toObservable`, debounce 300ms, `distinctUntilChanged`, `switchMap` to `HttpClient` so a slow old response can’t overwrite a new one. Min two characters, max ten rows, loading empty and error. Click emits the item. If we have time, arrow keys and combobox ARIA. I wouldn’t put this in NgRx. Tests: debounce doesn’t fire early; switchMap cancels.

Practice: `prevonir-interview-practice` **`/q4`**. Signals vs RxJS: [ANGULAR_SIGNALS_VS_RXJS.md](./ANGULAR_SIGNALS_VS_RXJS.md).
