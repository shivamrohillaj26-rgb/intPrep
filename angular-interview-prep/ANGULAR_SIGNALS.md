# Angular Signals — Deep Interview Guide

Signals are Angular’s **fine-grained reactive state** primitive.  
They tell Angular *exactly* which values changed and *who* depends on them — so the framework can update only what needs updating.

This guide is interview-depth: mental models, every major API, anti-patterns, RxJS interop, and ready spoken answers.  
Examples mirror patterns from `prevonir-interview-practice` (virtual list, typeahead, JWT auth).

---

## 1. One-sentence definitions (memorize)

| Term | Say this |
|---|---|
| **Signal** | A wrapper around a value that notifies consumers when the value changes |
| **Writable signal** | State you can `.set()` / `.update()` |
| **Computed** | Read-only derived value, lazy + memoized |
| **Effect** | Side-effect that re-runs when tracked signals change |
| **linkedSignal** | Writable state that *resets/resyncs* when a source changes |
| **resource** | Async data exposed as synchronous signals (`value`, `isLoading`, …) |
| **Reactive context** | Runtime where Angular tracks which signals you read |

**Interview opener:**

> A signal is a getter function around a value. Reading it in a reactive context creates a dependency. When the value changes, only dependent computeds/effects/templates invalidate — not the whole app tree by default.

---

## 2. Why Signals Exist (the “why” interviewers want)

### Before Signals (Zone.js world)

```
User clicks → Zone patches async → Angular runs change detection
→ often checks large parts of the component tree
→ OnPush helps, but dependency tracking is still coarse
```

Problems:

- Hard to know *what* changed
- Easy to over-check or miss updates (`markForCheck` dances)
- Derived state often duplicated or synced with buggy `ngOnChanges` / `subscribe`

### With Signals

```
count.set(5)
  → Angular knows: count changed
  → invalidates: doubleCount (computed), template bindings that read count()
  → schedules precise updates
```

Benefits you should name:

1. **Fine-grained reactivity** — track producers → consumers  
2. **Synchronous & predictable** — no “when will this emit?” for local state  
3. **Glitch-free derivations** — computeds see consistent state in one pass  
4. **Works beautifully with `OnPush`** — reading a signal in template marks that component dirty when it changes  
5. **Path to zoneless Angular** — less reliance on Zone.js monkey-patching  

Signals do **not** delete RxJS. They replace *local UI/state plumbing*; RxJS still wins for async streams, cancellation, retry, websockets, complex time operators.

**Interview card (Signals vs RxJS, “are they alternatives?”):** [ANGULAR_SIGNALS_VS_RXJS.md](./ANGULAR_SIGNALS_VS_RXJS.md)

---

## 3. Core Mental Model: Producer → Consumer Graph

```
        ┌────────────┐
        │  count()   │  ← producer (writable signal)
        └─────┬──────┘
              │ read inside reactive context
     ┌────────┴────────┐
     ▼                 ▼
┌──────────┐     ┌───────────┐
│ double() │     │ template  │  ← consumers
│ computed │     │ {{ count() }}
└──────────┘     └───────────┘
```

### Reading a signal

```ts
const count = signal(0);

count();        // READ — returns current value
count.set(1);   // WRITE — notify dependents
count.update(v => v + 1); // WRITE from previous
```

**Critical interview trap:**

```ts
const count = signal(0);

// ❌ This is the Signal object / function — NOT the number
console.log(count);

// ✅ This is the value
console.log(count());
```

In templates you write `{{ count() }}` — the `()` is required (unlike React state).

---

## 4. Writable Signals — Deep Dive

```ts
import { signal, WritableSignal } from '@angular/core';

const count: WritableSignal<number> = signal(0);

count.set(10);
count.update((n) => n + 1);
```

### `set` vs `update`

| API | Use when |
|---|---|
| `.set(value)` | You already have the next value |
| `.update(fn)` | Next value depends on previous |

```ts
// Prefer update for increments / immutable list edits
items.update((list) => [...list, newItem]);

// Prefer set when replacing wholesale
items.set(serverItems);
```

### Immutability rule (very important)

Signals notify based on **equality of the new value vs old** (default: `Object.is`).

```ts
const user = signal({ name: 'Ada', age: 36 });

// ❌ MUTATE in place — same object reference → often NO notification
user().age = 37;
user.set(user()); // same ref → dependents may NOT re-run

// ✅ Immutable update — new object → notifies
user.update((u) => ({ ...u, age: 37 }));
```

Same for arrays:

```ts
// ❌
list().push(4);
list.set(list());

// ✅
list.update((arr) => [...arr, 4]);
```

### Custom equality

Default: referential / `Object.is`.

```ts
import { signal } from '@angular/core';

const filters = signal(
  { q: '', page: 1 },
  {
    equal: (a, b) => a.q === b.q && a.page === b.page,
  },
);

// Different object, same fields → treated as unchanged
filters.set({ q: '', page: 1 });
```

Use custom `equal` when deep equality matters (careful: expensive).

### `asReadonly()` — service pattern (interview favorite)

Expose state without letting consumers `.set()` it:

```ts
@Injectable({ providedIn: 'root' })
export class CartStore {
  private readonly _items = signal<CartItem[]>([]);

  /** public read API */
  readonly items = this._items.asReadonly();

  readonly total = computed(() =>
    this._items().reduce((sum, i) => sum + i.price * i.qty, 0),
  );

  add(item: CartItem) {
    this._items.update((list) => [...list, item]);
  }

  clear() {
    this._items.set([]);
  }
}
```

**Caveat:** `asReadonly()` blocks `.set()` / `.update()`, but **does not deep-freeze** the value. Callers can still mutate nested fields if you hand them the object — keep returning new objects.

### Real example from your practice app (JWT)

```ts
// jwt-auth.service.ts (simplified from q9)
private token = signal<string | null>(this.readStored());

user = computed(() => {
  const payload = this.decode(this.token());
  if (!payload || this.isExpired(payload)) return null;
  return { username: payload.sub, roles: payload.roles };
});

isLoggedIn = computed(() => this.user() !== null);

login(...) {
  this.token.set(jwt); // one write → user + isLoggedIn recompute
}
```

One source of truth (`token`) → many derived views (`user`, `isLoggedIn`). That’s the signal sweet spot.

---

## 5. `computed()` — Lazy, Memoized, Read-only

```ts
const count = signal(0);
const double = computed(() => count() * 2);

double(); // 0
count.set(5);
double(); // 10
```

### Properties interviewers test

1. **Read-only** — no `.set()`  
2. **Lazy** — derivation runs on first read, not at creation  
3. **Memoized** — reuses cached value until a dependency changes  
4. **Dynamic dependencies** — only signals *actually read* this run are tracked  

### Dynamic dependencies (advanced, high-value answer)

```ts
const show = signal(false);
const count = signal(0);

const label = computed(() => {
  if (show()) {
    return `Count: ${count()}`; // count tracked only when show is true
  }
  return 'Hidden';
});

label();          // show=false → count NOT a dependency
count.set(99);    // label does NOT recompute
show.set(true);
label();          // now tracks count → "Count: 99"
count.set(100);   // now invalidates label
```

### Expensive derivations are OK in `computed`

Because of memoization:

```ts
visibleItems = computed(() =>
  this.allItems
    .slice(this.startIndex(), this.endIndex())
    .map((label, i) => ({
      label,
      index: this.startIndex() + i,
      top: (this.startIndex() + i) * this.itemHeight,
    })),
);
```

This is exactly your **virtual list** (`q7-virtual-list`):

```ts
scrollTop = signal(0);

startIndex = computed(() =>
  Math.max(0, Math.floor(this.scrollTop() / this.itemHeight) - this.overscan),
);

endIndex = computed(() =>
  Math.min(this.allItems.length, this.startIndex() + this.visibleCount),
);

visibleItems = computed(() =>
  this.allItems.slice(this.startIndex(), this.endIndex()).map(...),
);

onScroll(e: Event) {
  this.scrollTop.set((e.target as HTMLElement).scrollTop);
}
```

**Speak this in interview:**

> Scroll position is a signal. Window math is computed. Template only renders `visibleItems()`. Changing `scrollTop` invalidates the chain — I don’t recalculate manually in the event handler.

### Rules for `computed`

| Do | Don’t |
|---|---|
| Pure derivations | HTTP / `localStorage` / DOM writes |
| Read other signals | Call `.set()` on other signals |
| Filter/map/reduce | Subscribe to Observables inside |

Side effects → `effect` / `resource` / RxJS.  
Writable derived state → `linkedSignal` (not `computed`).

---

## 6. Reactive Contexts — Where Tracking Happens

Angular tracks signal reads **only inside a reactive context**:

| Context | Tracks reads? |
|---|---|
| Template bindings / `@if` / `@for` | Yes |
| `computed()` | Yes |
| `effect()` / `afterRenderEffect()` | Yes |
| `linkedSignal` computation | Yes |
| `resource` `params` / loader setup | Yes |
| Random method called from a click handler | **No** (unless that method runs inside an effect/computed) |
| Code after `await` inside effect | **No** — context is sync-only |

### `untracked()` — read without depending

```ts
effect(() => {
  const user = currentUser(); // dependency
  // counter changes should NOT re-run this effect
  console.log(user, untracked(counter));
});
```

Or wrap a whole block:

```ts
effect(() => {
  const id = userId();
  untracked(() => {
    this.analytics.pageView(id); // if analytics reads signals, ignore them
  });
});
```

### Async boundary trap

```ts
// ❌ theme() after await is NOT tracked
effect(async () => {
  const data = await fetchUser();
  console.log(theme()); // not a dependency
});

// ✅ read signals BEFORE await
effect(async () => {
  const t = theme();
  const data = await fetchUser();
  console.log(data, t);
});
```

---

## 7. `effect()` — Side Effects (use sparingly)

```ts
effect(() => {
  console.log('count is', this.count());
});
```

### What effects are for

- Syncing to **non-reactive** APIs (chart library, third-party widget)
- Logging / analytics
- Writing to `localStorage` when state changes
- Bridging into imperative DOM APIs

### What effects are **not** for

| Anti-pattern | Prefer |
|---|---|
| Derive state A from state B | `computed` |
| Writable state that resets with input | `linkedSignal` |
| Fetch when id changes | `resource` / RxJS + `toObservable` |
| Keep two signals “in sync” with `.set()` | redesign with computed/linkedSignal |

```ts
// ❌ classic anti-pattern (Angular warns in dev)
effect(() => {
  this.fullName.set(`${this.first()} ${this.last()}`);
});

// ✅
fullName = computed(() => `${this.first()} ${this.last()}`);
```

### Cleanup

```ts
effect((onCleanup) => {
  const id = this.userId();
  const sub = this.bus.on(`user:${id}`, handler);

  onCleanup(() => sub.unsubscribe());
});
```

Effects created in a component/directive injection context are destroyed with that injector.  
You can also pass `{ injector }` / use `DestroyRef` patterns when creating outside.

### `allowSignalWrites` (legacy knowledge)

Older Angular needed `{ allowSignalWrites: true }` to `.set()` inside effects.  
Modern guidance: **don’t write signals in effects** — use `linkedSignal` / redesign. Mention the history; prefer the modern answer.

### `effect` vs lifecycle

| Need | Tool |
|---|---|
| React to `input()` change | `effect` or `computed` |
| One-time init | `ngOnInit` / constructor + `afterNextRender` |
| DOM measurement after paint | `afterNextRender` / `afterRenderEffect` |
| Cleanup on destroy | effect `onCleanup` or `DestroyRef` |

```ts
userId = input.required<string>();

constructor() {
  effect(() => {
    const id = this.userId();
    // runs when input signal changes — replaces many ngOnChanges cases
    this.loadProfile(id);
  });
}
```

(Still prefer `resource` for the load itself — see §10.)

---

## 8. Signal-based Component API

Modern Angular components lean on signal inputs/queries.

### `input()` / `input.required()`

```ts
import { Component, computed, input } from '@angular/core';

@Component({
  selector: 'app-user-badge',
  template: `
    <span [class.admin]="isAdmin()">{{ label() }}</span>
  `,
})
export class UserBadge {
  name = input.required<string>();
  role = input('user');

  label = computed(() => `${this.name()} (${this.role()})`);
  isAdmin = computed(() => this.role() === 'admin');
}
```

**vs classic `@Input()`:**

| Classic | Signal input |
|---|---|
| `@Input() name!: string` | `name = input.required<string>()` |
| React in `ngOnChanges` | Read in `computed` / `effect` |
| Optional + default awkward | `role = input('user')` |
| Not a signal | **Is** a `Signal` → composes cleanly |

Aliases / transforms:

```ts
size = input(16, { alias: 'iconSize', transform: Number });
```

### `output()` (not a signal, but pair it)

```ts
import { output } from '@angular/core';

saved = output<User>();

onSave() {
  this.saved.emit(this.user());
}
```

### `model()` — two-way binding signal

```ts
// child
checked = model(false);

toggle() {
  this.checked.update((v) => !v);
}
```

```html
<!-- parent -->
<app-switch [(checked)]="enabled" />
<!-- sugar for [checked] + (checkedChange) -->
```

`model()` ≈ writable signal + output for changes. Great for reusable controls.

### Signal queries

```ts
import { viewChild, ElementRef, afterNextRender } from '@angular/core';

inputEl = viewChild.required<ElementRef<HTMLInputElement>>('q');

constructor() {
  afterNextRender(() => {
    this.inputEl().nativeElement.focus();
  });
}
```

Also: `viewChildren()`, `contentChild()`, `contentChildren()` — signal versions that update when the view changes (see your content/templates guide).

---

## 9. `linkedSignal()` — Writable + Linked to a Source

**Problem:** You want local editable state that *defaults from* (and *resets with*) another signal/input.

`computed` → not writable.  
`signal` + `effect` to reset → anti-pattern.  
`linkedSignal` → correct tool.

### Simple form

```ts
shippingOptions = signal(['Ground', 'Air', 'Sea']);

// defaults to first option; WRITABLE; resets when options change
selected = linkedSignal(() => this.shippingOptions()[0]);

choose(i: number) {
  this.selected.set(this.shippingOptions()[i]);
}
```

```ts
selected(); // 'Ground'
selected.set('Sea');
shippingOptions.set(['Email', 'Will Call']);
selected(); // 'Email'  ← resynced from new computation
```

### Preserve previous selection if still valid

```ts
selected = linkedSignal({
  source: this.shippingOptions,
  computation: (options, previous) => {
    const prev = previous?.value;
    return options.find((o) => o.id === prev?.id) ?? options[0];
  },
});
```

### Interview decision tree

```
Need derived value?
  ├─ Never manually change it → computed()
  ├─ User/local code may override, but reset when source changes → linkedSignal()
  └─ Side effect to outside world → effect() / resource()
```

**Never say:** “I’ll sync with an effect that calls `.set()`.”  
**Say:** “That’s what `linkedSignal` is for.”

---

## 10. `resource()` — Async Data as Signals

All basic signal APIs are **synchronous**.  
`resource` bridges **async** work into signal land.

```ts
userId = input.required<string>();

userResource = resource({
  params: () => ({ id: this.userId() }),
  loader: ({ params, abortSignal }) =>
    fetch(`/api/users/${params.id}`, { signal: abortSignal }).then((r) => r.json()),
});

name = computed(() =>
  this.userResource.hasValue() ? this.userResource.value().name : '',
);
```

### Status surface (know these)

| Signal / API | Meaning |
|---|---|
| `value()` | Latest data (or `undefined`) |
| `hasValue()` | Type-guard + safe read |
| `isLoading()` | Loader running |
| `error()` | Last error |
| `status()` | `'idle' \| 'loading' \| 'reloading' \| 'resolved' \| 'error' \| 'local'` |
| `reload()` | Re-run loader |

### Abort on param change

When `userId` changes mid-flight, resource aborts previous load via `abortSignal` — like `switchMap` cancellation.

### `httpResource` (HTTP-specific)

Built on `HttpClient` (interceptors apply). Prefer when you’re already in Angular HTTP stack.

### When to still use RxJS instead

| Prefer `resource` | Prefer RxJS |
|---|---|
| Request keyed by signal params | Debounce + distinct + complex operators |
| Simple fetch/reload/status UI | WebSockets, multi-stream combine |
| Signal-first components | Existing Observable-heavy services |

Your **typeahead** is a perfect “keep RxJS” example:

```ts
query = signal('');

results$ = toObservable(this.query).pipe(
  debounceTime(300),
  distinctUntilChanged(),
  switchMap((q) => this.api.search(q)),
);
```

`computed` cannot debounce. `resource` is awkward for “cancel previous after 300ms quiet”.  
**Bridge:** `toObservable(signal)` → RxJS operators.

---

## 11. Signals ↔ RxJS Interop

```ts
import { toSignal, toObservable } from '@angular/core/rxjs-interop';
```

### `toSignal(observable)`

Observable → Signal (for templates / computeds).

```ts
users = toSignal(this.api.getUsers(), { initialValue: [] as User[] });
// or { requireSync: true } if observable emits synchronously
```

Options to know:

- `initialValue` — avoid `undefined` before first emit  
- `manualCleanup` / injection context — must be created in injection context by default  
- errors can tear down; handle upstream  

### `toObservable(signal)`

Signal → Observable (for operators).

```ts
toObservable(this.query).pipe(debounceTime(300), switchMap(...));
```

**Classic trap from your typeahead notes:**

```ts
// ❌ emits ONCE (the signal function or a snapshot), then completes
of(this.query)
of(this.query())

// ✅ live stream of signal values on every set()
toObservable(this.query)
```

### Mental model

```
Signal world:   synchronous state, computed graph, templates
RxJS world:     async time, cancellation, retry, streams

Bridge with toSignal / toObservable at the boundary.
Don’t rewrite every Observable as a signal.
```

---

## 12. Signals + Change Detection / OnPush

When a template reads `count()`:

1. Angular records `count` as a dependency of that component view  
2. On `count.set`, that view is marked dirty  
3. Next CD pass updates the bindings  

With `ChangeDetectionStrategy.OnPush`, signals make “when do I update?” much clearer:

```ts
@Component({
  changeDetection: ChangeDetectionStrategy.OnPush,
  template: `{{ total() }}`,
})
export class CartBadge {
  private cart = inject(CartStore);
  total = this.cart.total; // computed signal
}
```

No manual `markForCheck()` for that signal update path.

**Zoneless direction:** Angular is moving toward signal-driven dirty checking without Zone.js. Knowing signals is knowing the future CD model.

---

## 13. End-to-End Examples (Interview Machine Coding)

### Example A — Counter (baseline)

```ts
@Component({
  selector: 'app-counter',
  template: `
    <p>{{ count() }}</p>
    <p>Double: {{ double() }}</p>
    <button (click)="inc()">+</button>
  `,
})
export class Counter {
  count = signal(0);
  double = computed(() => this.count() * 2);

  inc() {
    this.count.update((n) => n + 1);
  }
}
```

### Example B — Search filter (pure computed)

```ts
query = signal('');
users = signal<User[]>([/* ... */]);

filtered = computed(() => {
  const q = this.query().trim().toLowerCase();
  if (!q) return this.users();
  return this.users().filter((u) => u.name.toLowerCase().includes(q));
});
```

### Example C — Typeahead (signal + RxJS) — your q4 pattern

```ts
query = signal('');

results$ = toObservable(this.query).pipe(
  debounceTime(300),
  distinctUntilChanged(),
  switchMap((q) => this.api.search(q)),
  startWith([] as string[]),
);

onInput(value: string) {
  this.query.set(value);
}
```

**Speak:** Signal owns the input text; RxJS owns time/async; async pipe owns subscription cleanup.

### Example D — Virtual list windowing — your q7 pattern

```ts
scrollTop = signal(0);
startIndex = computed(() => Math.floor(this.scrollTop() / ROW) );
visibleItems = computed(() => this.all.slice(this.startIndex(), this.endIndex()));
```

### Example E — Auth store — your q9 pattern

```ts
private token = signal<string | null>(null);
user = computed(() => decode(this.token()));
isLoggedIn = computed(() => this.user() !== null);
```

### Example F — linkedSignal form draft

```ts
userId = input.required<string>();

// when userId changes, draft resets to that id's defaults
draft = linkedSignal(() => ({
  id: this.userId(),
  note: '',
}));

onNote(v: string) {
  this.draft.update((d) => ({ ...d, note: v }));
}
```

### Example G — resource profile page

```ts
userId = input.required<string>();

profile = resource({
  params: () => ({ id: this.userId() }),
  loader: ({ params, abortSignal }) =>
    fetch(`/api/users/${params.id}`, { signal: abortSignal }).then((r) => r.json()),
});
```

```html
@if (profile.isLoading()) { <p>Loading…</p> }
@else if (profile.error()) { <p>Failed</p> }
@else if (profile.hasValue()) {
  <h1>{{ profile.value().name }}</h1>
}
```

---

## 14. Signals vs RxJS vs Classic Patterns

| Concern | Prefer |
|---|---|
| Component local UI state | `signal` |
| Derived view state | `computed` |
| Resettable local state tied to input | `linkedSignal` |
| Side effect to imperative API | `effect` / `afterRenderEffect` |
| HTTP with status as signals | `resource` / `httpResource` |
| Debounce, throttle, retry, race cancel | RxJS |
| App-wide event bus / websocket | RxJS |
| Replace `@Input` + `ngOnChanges` | `input()` + `computed`/`effect` |
| Replace `BehaviorSubject` for simple state | `signal` + `asReadonly()` |
| Complex multi-stream orchestration | keep RxJS |

**BehaviorSubject → Signal migration pitch:**

```ts
// before
private userSubject = new BehaviorSubject<User|null>(null);
user$ = this.userSubject.asObservable();

// after
private _user = signal<User|null>(null);
readonly user = this._user.asReadonly();
```

Templates become `user()` instead of `user$ | async`.

---

## 15. Common Mistakes (call these out)

1. **Forgetting `()`** — reading the function instead of the value  
2. **Mutating objects/arrays in place** — no notification  
3. **Using `effect` to derive state** — use `computed` / `linkedSignal`  
4. **Putting debounce in `computed`** — can’t; use RxJS / debounced signal utilities  
5. **`of(this.query())` for live updates** — use `toObservable`  
6. **Assuming effects track after `await`** — they don’t  
7. **Huge logic in effects** — hard to test; extract pure functions + computed  
8. **Treating signals as a full RxJS replacement** — wrong level of abstraction  
9. **Deep equality everywhere** — can get slow; prefer immutable structural updates  
10. **Creating `toSignal` outside injection context** without care — runtime error  

---

## 16. Testing Signals (short)

```ts
it('derives double', () => {
  const c = signal(2);
  const d = computed(() => c() * 2);
  expect(d()).toBe(4);
  c.set(5);
  expect(d()).toBe(10);
});
```

Component:

```ts
fixture.componentInstance.query.set('paris');
fixture.detectChanges();
expect(...).toContain('paris');
```

For effects in tests, flush microtasks / use Angular testing utilities; assert **observable outcomes**, not effect internals.

---

## 17. Interview Q&A (ready answers)

### Q1. What is a signal?

> A reactive wrapper around a value. Calling the signal reads the value and, in a reactive context, registers a dependency. Updating it notifies dependents so Angular can update precisely.

### Q2. `signal` vs `computed` vs `effect`?

> `signal` = writable state. `computed` = pure derived read-only value (lazy, memoized). `effect` = side effect that re-runs when dependencies change. Don’t use effects to create derived state.

### Q3. Why is `computed` memoized?

> It recalculates only when a tracked dependency changes, and only when something reads it (lazy). Expensive filters/maps are safe because repeated reads hit the cache.

### Q4. What is a reactive context?

> A phase where Angular tracks signal reads: templates, `computed`, `effect`, `linkedSignal`, resource params. Reads outside that (or after `await`) are not tracked.

### Q5. `linkedSignal` vs `computed`?

> Both derive from sources. `computed` is read-only. `linkedSignal` is writable and re-syncs when its source/computation inputs change — ideal for “default from parent, but user can edit.”

### Q6. Can `computed` replace RxJS debounce?

> No. `computed` is synchronous and has no notion of time. Use `toObservable(signal).pipe(debounceTime(...))` or dedicated debounce helpers / `resource` for request lifecycles.

### Q7. How do signals work with OnPush?

> Reading a signal in an OnPush template registers a dependency. When that signal changes, Angular marks the component dirty so it updates — without Zone-driven tree-wide checks for that path.

### Q8. Signals vs BehaviorSubject?

> Both hold current value. Signals integrate natively with Angular templates/CD and computeds; no subscription needed in templates. BehaviorSubject fits RxJS pipelines. Convert at boundaries with `toSignal` / `toObservable`.

### Q9. How do you react to input changes without `ngOnChanges`?

> Use `input()` signals and either `computed` for derived UI or `effect`/`resource` for side effects/loads.

### Q10. What is `untracked`?

> Read a signal without creating a dependency — useful when an effect should react to A but only *observe* B.

### Q11. Mutable update bug — explain.

> Signals compare with `Object.is` by default. Mutating a nested field keeps the same reference, so dependents may not run. Always set a new object/array.

### Q12. What is `resource`?

> An async loader tied to reactive `params`, exposing `value` / `isLoading` / `error` as signals, with abort on param change — signal-native data fetching.

### Q13. Will Signals kill Zone.js?

> They’re a major step toward zoneless apps. Many apps still use Zone today; new code should be signal-friendly so zoneless migration is easier.

### Q14. `model()` vs `input()` + `output()`?

> `model()` is the concise two-way binding primitive (writable signal + change output). Use for form-like child state; use separate input/output when the data flow isn’t a simple two-way value.

### Q15. Dynamic dependencies — example?

> In a `computed`, if you only read `count()` inside `if (show())`, then when `show` is false, changing `count` won’t recompute. Dependencies are whatever was actually read during the last execution.

---

## 18. 30-second elevator pitch

> Signals are Angular’s fine-grained reactive state. I store UI state in `signal`, derive with `computed`, use `linkedSignal` for editable defaults tied to inputs, and `effect` only for external side effects. Async stays in RxJS or `resource`, bridged with `toSignal`/`toObservable`. That gives predictable updates, clean OnPush, and less `ngOnChanges` / manual CD.

---

## 19. Practice checklist

- [ ] Build counter with `signal` + `computed`  
- [ ] Immutable list add/remove with `.update`  
- [ ] `input()` + `computed` badge component  
- [ ] Explain why mutate-in-place fails  
- [ ] Write typeahead: `signal` → `toObservable` → debounce → `switchMap`  
- [ ] Explain virtual list computeds (your q7)  
- [ ] Auth store with private signal + `asReadonly` + computeds (your q9)  
- [ ] `linkedSignal` shipping selector story  
- [ ] `resource` params + abort story  
- [ ] Answer: effect vs computed vs linkedSignal in 20 seconds  

---

## Related

| Topic | File |
|---|---|
| Lifecycle + effect vs hooks | [ANGULAR_LIFECYCLE.md](./ANGULAR_LIFECYCLE.md) |
| Signal queries (`viewChild`) | [ANGULAR_CONTENT_TEMPLATES_QUERIES.md](./ANGULAR_CONTENT_TEMPLATES_QUERIES.md) |
| DI for signal stores | [ANGULAR_DEPENDENCY_INJECTION.md](./ANGULAR_DEPENDENCY_INJECTION.md) |
| Promises vs Observables | `../javascript-interview-prep/PROMISES_VS_OBSERVABLES.md` |
| Practice demos | `../prevonir-interview-practice` q4 / q7 / q9 |

---

*Twin guide:* [ANGULAR_CHANGE_DETECTION_ONPUSH_ZONELESS.md](./ANGULAR_CHANGE_DETECTION_ONPUSH_ZONELESS.md) — Default vs OnPush vs Zone/zoneless, version defaults, showcase example, interview Qs.
