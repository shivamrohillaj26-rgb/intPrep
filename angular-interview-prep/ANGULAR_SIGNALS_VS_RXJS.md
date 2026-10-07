# Signals vs RxJS — interview card

**Use this if they ask:** “Signals vs Observables?” · “Do signals replace RxJS?” · “When do you still use HttpClient + operators?” · “BehaviorSubject vs signal?”

**Deep APIs:** [ANGULAR_SIGNALS.md](./ANGULAR_SIGNALS.md) · [RXJS_INTERVIEW.md](../javascript-interview-prep/RXJS_INTERVIEW.md) · Promises vs Observables: [PROMISES_VS_OBSERVABLES.md](../javascript-interview-prep/PROMISES_VS_OBSERVABLES.md)

---

## 0. Open with this (~25s) — they want this sentence first

> **No. Signals are not an alternative that kills RxJS.** They solve **different problems**.  
> **Signals** = Angular’s **synchronous, pull-based** UI state. Always a current value. Templates read `count()`. Fine-grained CD / zoneless.  
> **RxJS** = **push-based streams over time**. Zero, one, or many values. Cancellation, debounce, `switchMap`, retry, WebSocket, `HttpClient`.  
> I use **both**. Local UI → signals. Async pipelines → RxJS (or `resource`). Bridge with **`toSignal` / `toObservable`**. Replacing `HttpClient` with only `computed` is a junior answer.

```text
Signals     “what is the count RIGHT NOW?”     pull   sync graph
RxJS        “what happens OVER TIME?”          push   operators + cancel
```

---

## 0b. Say it in normal English (memorize this story)

Think of the **scoreboard** vs the **live commentary**.

The **scoreboard** always shows one number: 2–1. You look at it whenever you want. When it changes, only people watching *that* board notice. That is a **signal**. `count()` is glancing at the board. `computed` is a second board that says “goal difference” and updates when the score does. Nothing about “wait 300ms” or “cancel the last HTTP” lives on the scoreboard.

The **commentary** is a stream: minute 12 shot, minute 14 save, minute 40 goal. It keeps talking. You can ignore it, you can cancel the radio, you can say “if a new search starts, stop talking about the old one.” That is **RxJS**. `HttpClient` is “go ask the server, then tell me.” `debounceTime` is “don’t comment on every keystroke, wait until they pause.” `switchMap` is “new search? drop the old request.”

**Are they the same tool?** Only in one thin place: “the UI should show a value that changes.” A sidebar open/closed is a scoreboard. Search-as-you-type is commentary *plus* a board that shows the latest results.

**Do signals replace RxJS?** Same as asking if a scoreboard replaces the radio. You still need the radio for things that happen **over time**. Angular added signals so the **screen** does not need Zone to guess what changed. It did not add them so you delete `HttpClient`.

**How they talk to each other:**  
`toObservable(query)` = “turn this scoreboard into a radio so I can debounce.”  
`toSignal(http$)` = “whatever the radio last said, write it on the board so the template can just read it.”

**Relative to old Angular:**  
You used to keep UI in a field and `subscribe` in `ngOnInit`, or use `BehaviorSubject` for everything. That was using the radio even for “is the modal open?” Signals are the honest tool for that. Keep the radio for network and time.

**Relative to each other in one sentence:**  
Signal = **now**. RxJS = **next, next, next — and I can stop.**

**If they push “so I can skip RxJS?”**  
> Only if the screen never waits on a server, never searches, never retries, never opens a socket. NUX does all of that. Interceptor and token refresh are still Observables.

---

## 1. What each one *is*

| | **Signal** | **Observable (RxJS)** |
|---|---|---|
| Kind | Wrapper around a **value** | **Recipe** for a stream (lazy until subscribe) |
| Values | Always **one current** value | 0, 1, or **many** over time |
| How you read | `count()` — pull | `subscribe` / `async` pipe — push |
| Time operators | **No** debounce/switchMap on `computed` | **Yes** — that’s the point |
| Cancel | N/A for the value | `unsubscribe` / `switchMap` / destroy |
| Angular CD | Template read **tracks** the signal | `async` pipe / `toSignal` marks view |
| Who owns it | **Angular** (core) | **RxJS** library (`HttpClient` is Observable) |

**BehaviorSubject** is the closest RxJS cousin (has current value + stream). Still push, still subscribe. Signals don’t need subscribe in the template.

---

## 2. Are they alternatives?

**Partial overlap only:** “I have a number that changes and the UI should update.”

| Job | Pick | Why |
|---|---|---|
| Toggle, selected id, form-adjacent UI, derived label | **`signal` / `computed`** | Sync, glitch-free, no leak |
| Typeahead, HTTP, retry, race, WS ticks | **RxJS** | Time + cancel |
| One HTTP → show list | **`resource` / `toSignal(http$)`** or `async` pipe | Async still a stream underneath |
| “Replace all Observables with signals” | **No** | You’d reinvent operators badly |

**`resource()` is not “signals instead of RxJS.”** It’s Angular wrapping **async** as signal-shaped `value()` / `isLoading()`. Under the hood it still cancels/refetches. HttpClient remains Observable.

---

## 3. How they differ (say 5)

1. **Push vs pull** — Observable *emits at you*. Signal *you read* and Angular tracks the read.  
2. **Time** — RxJS models delay, throttle, flatten. `computed` is **sync** and **pure**.  
3. **Many values vs one box** — WS can emit 1000 ticks; a signal holds **the latest** (you can still *set* from the stream).  
4. **Teardown** — RxJS must complete/unsubscribe. Signals in a component are just fields.  
5. **CD** — Signal read in template = that consumer invalidates. Cold `HttpClient` in template via two `async` pipes = **two HTTP calls** unless `shareReplay`.

---

## 4. Side-by-side code (same screen)

**UI state — signal (don’t use a Subject):**

```ts
query = signal('');
page = signal(1);
filtered = computed(() => this.rows().filter((r) => r.name.includes(this.query())));
```

**Typeahead — signal at the edge, RxJS for time:**

```ts
query = signal('');

results = toSignal(
  toObservable(this.query).pipe(
    debounceTime(300),
    distinctUntilChanged(),
    switchMap((q) => this.http.get<Item[]>(`/api?q=${q}`)),  // cancel in-flight
  ),
  { initialValue: [] as Item[] },
);
```

**Wrong (they will ding you):**

```ts
// of(this.query()) is ONE shot — not live
of(this.query()).pipe(debounceTime(300), switchMap(...));

// computed cannot debounce HTTP
computed(() => this.http.get(...)); // not how HTTP works
```

**Practice:** `prevonir-interview-practice` `/q4` — `toObservable` vs `of()`.

---

## 5. Decision cheat (draw this)

```text
Does it involve TIME, cancel, retry, WS, many events?
  YES → RxJS (HttpClient, operators)
  NO  → is it current UI state?
         YES → signal / computed
         derived from signals? → computed
         async load for that state? → resource or toSignal(http$)
```

| Smell | Fix |
|---|---|
| `BehaviorSubject` for `isOpen` | `signal(false)` |
| `subscribe` in constructor to copy into a field | `toSignal` / `async` pipe |
| `effect` to call HTTP | `resource` / RxJS `switchMap` |
| Two `async` pipes on same cold HTTP | `shareReplay` or one `toSignal` |
| `toSignal` in a random function | Must be **injection context** (constructor / field) |

---

## 6. NgRx / NUX

- **NgRx** can stay for big workflows; components often `selectSignal`.  
- **NUX** today: lots of RxJS (`HttpClient`, interceptors, 401 refresh). Signals for **new local UI**. Don’t rewrite the interceptor as `computed`.  
- Interceptor / refresh / `switchMap` = **still RxJS**.

---

## 7. Mini Q&A

**Q: Do signals replace RxJS?**  
> No. Sync UI state vs async streams. Both. Bridge at the boundary.

**Q: Then why did Angular add signals?**  
> Fine-grained CD, less Zone, less `ngOnChanges` / `markForCheck` for local state. Not to delete `HttpClient`.

**Q: Signal vs BehaviorSubject?**  
> Both hold “current.” Subject is a stream (subscribe, operators). Signal is a tracked getter. Template: `count()` vs `obs$ \| async`. Convert with `toSignal` / `toObservable`.

**Q: Can `computed` replace `switchMap`?**  
> No. `computed` is sync. Search = `toObservable` + `switchMap` (or `resource` with params).

**Q: `async` pipe vs `toSignal`?**  
> Same idea: subscribe + teardown with the view. `toSignal` is a field you read as `users()`. `async` stays in the template. Don’t mix two subscriptions on a cold HTTP.

**Q: Zoneless without signals?**  
> Painful. Signals (or `markForCheck`) are how the view learns. RxJS still needs `async`/`toSignal` to notify.

---

## 8. Spoken variants

**15s**

> Signals are not RxJS 2. Signals = current UI state. RxJS = events over time. I keep HttpClient and switchMap. I bridge with toSignal.

**45s**

> Signals are pull-based reactive values Angular tracks in templates and computeds — great for toggles, filters, derived labels, OnPush/zoneless. RxJS is push-based streams: HTTP, debounce, cancellation, WebSockets, retry. They’re complementary. Typeahead is a signal for the query box and an Observable pipeline for search. `resource` is still async, just exposed as signals. I’d never say we deleted RxJS from NUX; interceptors and refresh are still Observables.

---

## Cheat card

```text
NOT alternatives          overlap = “a value the UI shows”
Signals                   sync now-value, pull, computed, CD
RxJS                      time, many values, cancel, HttpClient
Bridge                    toSignal / toObservable
Typeahead                 signal query → toObservable → debounce → switchMap
Never                     computed(http)  |  of(signal()) for live search
NUX                       new UI = signals; network = still RxJS
```
