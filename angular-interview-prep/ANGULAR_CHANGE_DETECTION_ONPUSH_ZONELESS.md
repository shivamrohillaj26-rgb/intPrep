# Angular Change Detection — Default vs OnPush vs Zoneless

Deep interview guide: mental model, version timeline, one showcase example that proves the differences, traps, and spoken answers.

**Pairs with:** [ANGULAR_SIGNALS.md](./ANGULAR_SIGNALS.md) (signals mark views dirty — the engine zoneless depends on).

---

## 0. One-sentence mental model

**Change detection (CD)** = Angular walks (or selectively skips) component views and updates the DOM when template bindings may have changed.

There are **two independent axes** interviewers often mash together:

| Axis | What it controls | Knobs |
|---|---|---|
| **A. Component strategy** | *Which components get checked* when a CD cycle runs | `ChangeDetectionStrategy.Default` vs `OnPush` |
| **B. App scheduler** | *What schedules* a CD cycle in the first place | **Zone.js** (patched async) vs **Zoneless** (explicit notifications) |

```
Zone / Zoneless  →  “Something happened — should I run CD?”
Default / OnPush →  “For this component, do I actually check bindings?”
```

You can mix them:

| | Zone.js app | Zoneless app |
|---|---|---|
| **Default** component | Classic Angular — CD often; component always checked | CD only when notified; Default still checks that view more eagerly once scheduled |
| **OnPush** component | CD often, but OnPush subtrees often skipped | Recommended — only dirty views checked |

---

## 1. Version timeline — what existed when, what’s default

| Era / version | What you get | Notes for interviews |
|---|---|---|
| **Angular 2+** | Zone.js + `Default` strategy | Zone patches `setTimeout`, Promise, DOM events, XHR… then Angular runs CD from root. |
| **Early Angular** | `ChangeDetectionStrategy.OnPush` | Always available; team convention, not CLI default historically. |
| **Angular 16** | Signals (dev preview → evolving) | Fine-grained reactivity starts. |
| **Angular 17–18** | Signals mature; **experimental zoneless** | `provideExperimentalZonelessChangeDetection()` (name varies by minor). |
| **Angular 19–20** | Zoneless hardens | Prefer signals + OnPush for migration. |
| **Angular 20.2** | **`provideZonelessChangeDetection()` stable** | Experimental prefix dropped. |
| **Angular 21+** | **Zoneless is default for new `ng new` apps** | No zone.js in polyfills; you do **not** need to call the provider. Opt **back into Zone** with `provideZoneChangeDetection()` if needed. |

### Defaults cheat-sheet (say this clearly)

| Setting | Historical default (≤20 typical apps) | New Angular 21+ apps |
|---|---|---|
| Zone.js in polyfills | **Yes** | **No** (zoneless) |
| App CD mode | Zone-scheduled | Zoneless (unless you opt into Zone) |
| Component `changeDetection` | Still **`Default`** unless you set `OnPush` | Still **`Default`** in decorator sense — but **OnPush is strongly recommended** for zoneless-friendly apps |
| How you enable zoneless on v20 | `provideZonelessChangeDetection()` | Already default — don’t add `provideZoneChangeDetection` by accident |

> **Spoken tip:** “OnPush is a *component* strategy. Zoneless is an *application* scheduling model. v21 made zoneless the *app* default for new projects; I still put OnPush on components for skip-subtree + clarity.”

### Official enable / disable snippets

**v20 — opt into zoneless:**

```ts
import { provideZonelessChangeDetection } from '@angular/core';

bootstrapApplication(App, {
  providers: [provideZonelessChangeDetection()],
});
```

**v21+ new apps** — already zoneless; to keep Zone.js:

```ts
import { provideZoneChangeDetection } from '@angular/core';

bootstrapApplication(App, {
  providers: [provideZoneChangeDetection()],
});
```

Also remove `zone.js` from `angular.json` polyfills / uninstall the package when going fully zoneless.

---

## 2. Axis A — Default vs OnPush (component strategy)

### Default (`CheckAlways`)

Whenever Angular runs a CD cycle, this component (and descendants that aren’t skipped) get their bindings checked.

With **Zone.js**, “whenever” is often: any patched async task completes (click, timer, HTTP, Promise microtask, etc.) — **even if this component’s data didn’t change**.

### OnPush (`CheckOnce` until marked dirty)

Angular **skips** this component subtree unless something marks it dirty / eligible. Classic triggers:

1. **`@Input()` / `input()` reference changes** (shallow `==` / identity — **mutation of same object does not count**)
2. **Event** handled in this component or a descendant (template / host / output)
3. **`async` pipe** emits (it calls `markForCheck()` for you)
4. **Signal** read in the template updates
5. Explicit **`ChangeDetectorRef.markForCheck()`** (or `ComponentRef.setInput` from outside)

**Performance win:** large stable subtrees (lists, cards, dashboards) are not re-checked on every unrelated click elsewhere in the app.

**Contract:** prefer **immutable updates** (`user = { ...user, name }`, new array refs) or **signals**.

---

## 3. Axis B — Zone.js vs Zoneless (app scheduler)

### Zone.js (classic)

1. Zone monkey-patches browser APIs.
2. When a patched task finishes, Zone notifies Angular.
3. Angular typically runs CD from the **root** (with OnPush skipping eligible subtrees).

**Pros:** “Just mutate a field after `setTimeout` / HTTP and the UI updates.”  
**Cons:** Extra CD cycles, ~30KB payload, harder stack traces, patch gaps (`async`/`await` historically downleveled), ecosystem friction.

### Zoneless (modern)

Angular runs CD only when **notified** by core APIs, including:

- Updating a **signal** read in a template  
- Bound **template / host listeners**  
- **`async` pipe** / `markForCheck()`  
- **`ComponentRef.setInput`**  
- Attaching a view already marked dirty  

**Bare `setTimeout(() => this.count++)` does *not* refresh the UI** unless you also notify (signal / `markForCheck` / etc.).

**Pros:** fewer useless cycles, smaller bundle, clearer “why did UI update?”, better long-term browser compatibility.  
**Cons:** third-party callbacks & reactive forms need explicit bridging; SSR uses `PendingTasks` instead of Zone stability.

---

## 4. Showcase example — same UI, three modes

One counter + one timer. Predict **when the number on screen updates**.

```ts
// Shared idea — three variants below
template: `
  <h3>{{ title }}</h3>
  <p>Clicks: {{ clicks }}</p>
  <p>Ticks: {{ ticks }}</p>
  <button (click)="onClick()">Click me</button>
  <button (click)="startTimer()">Start timer</button>
`
```

### Variant A — Default + Zone.js (classic “just works”)

```ts
@Component({
  selector: 'demo-default-zone',
  // changeDetection: Default is implicit
  template: `...`,
})
export class DemoDefaultZone {
  title = 'Default + Zone';
  clicks = 0;
  ticks = 0;

  onClick() {
    this.clicks++; // event → Zone → CD → UI updates
  }

  startTimer() {
    setInterval(() => {
      this.ticks++; // Zone patches setInterval → CD after tick → UI updates
    }, 1000);
  }
}
```

| Action | UI updates? | Why |
|---|---|---|
| Click | Yes | Event + Default checks component |
| Timer tick | Yes | Zone sees timer; Default checks bindings |
| Parent mutates unrelated state elsewhere | Often yes | Zone schedules app CD; Default still checked |

---

### Variant B — OnPush + Zone.js (skip until dirty)

```ts
@Component({
  selector: 'demo-onpush-zone',
  changeDetection: ChangeDetectionStrategy.OnPush,
  template: `
    <h3>OnPush + Zone</h3>
    <p>Clicks: {{ clicks }}</p>
    <p>Ticks: {{ ticks }}</p>
    <p>Name: {{ user.name }}</p>
    <button (click)="onClick()">Click</button>
    <button (click)="mutateName()">Mutate same object</button>
    <button (click)="replaceUser()">New object ref</button>
    <button (click)="startTimer()">Timer (broken until markForCheck)</button>
    <button (click)="startTimerFixed()">Timer + markForCheck</button>
  `,
})
export class DemoOnPushZone {
  clicks = 0;
  ticks = 0;
  user = { name: 'Ada' };
  private cdr = inject(ChangeDetectorRef);

  onClick() {
    this.clicks++; // event in this view → OnPush checks → OK
  }

  mutateName() {
    this.user.name = 'Grace'; // SAME object ref if this were @Input — parent path wouldn't notify
    // Local field mutation alone: if no event marked dirty incorrectly... 
    // Here it's inside a click handler → CD runs because of the event.
  }

  // Classic interview trap: parent does this WITHOUT creating a new reference
  // @Input() user — parent: this.user.name = 'x' → OnPush child STALE

  replaceUser() {
    this.user = { ...this.user, name: 'Grace' }; // new ref — correct for @Input OnPush
  }

  startTimer() {
    setInterval(() => {
      this.ticks++;
      // Zone WILL schedule CD for the app…
      // but OnPush may SKIP this component — UI often STALE
    }, 1000);
  }

  startTimerFixed() {
    setInterval(() => {
      this.ticks++;
      this.cdr.markForCheck(); // mark dirty → next CD updates UI
    }, 1000);
  }
}
```

| Action | UI updates? | Why |
|---|---|---|
| Click increments `clicks` | Yes | Event in component marks path dirty |
| Timer without `markForCheck` | **Often no** | Zone runs CD, OnPush subtree skipped |
| Timer + `markForCheck` | Yes | Explicit dirty |
| Parent `@Input` mutate in place | **No** | Same reference |
| Parent `@Input` new object | Yes | Input identity change |
| `async` pipe emit | Yes | Pipe calls `markForCheck` |

**Parent → OnPush child trap (memorize):**

```ts
// Parent (WRONG for OnPush child)
this.user.name = 'new';

// Parent (RIGHT)
this.user = { ...this.user, name: 'new' };
```

---

### Variant C — Zoneless + signals (+ OnPush recommended)

```ts
@Component({
  selector: 'demo-zoneless',
  changeDetection: ChangeDetectionStrategy.OnPush,
  template: `
    <h3>Zoneless + signals</h3>
    <p>Clicks: {{ clicks() }}</p>
    <p>Ticks: {{ ticks() }}</p>
    <button (click)="onClick()">Click</button>
    <button (click)="startTimerPlain()">Timer mutate field (BROKEN)</button>
    <button (click)="startTimerSignal()">Timer via signal (WORKS)</button>
  `,
})
export class DemoZoneless {
  clicks = signal(0);
  ticks = signal(0);
  // plain field for the "broken" demo
  plainTicks = 0;

  onClick() {
    this.clicks.update((n) => n + 1); // listener + signal write → notify CD
  }

  startTimerPlain() {
    setInterval(() => {
      this.plainTicks++; // NO Zone, NO signal, NO markForCheck → UI NEVER updates
    }, 1000);
  }

  startTimerSignal() {
    setInterval(() => {
      this.ticks.update((n) => n + 1); // signal write → views that read ticks() marked dirty
    }, 1000);
  }
}
```

| Action | UI updates? | Why |
|---|---|---|
| Click + `signal.update` | Yes | Listener + signal notification |
| Timer + plain field++ | **No** | Nothing notifies Angular |
| Timer + `ticks.set` / `update` | Yes | Signal read in template |
| HTTP via `HttpClient` → `signal.set` / `async` pipe | Yes | Framework / pipe notifies |
| Third-party SDK callback → plain assign | **No** until you `signal.set` or `markForCheck()` |

---

### Side-by-side verdict table (use in interviews)

| Scenario | Default + Zone | OnPush + Zone | Zoneless + signals |
|---|---|---|---|
| Button click updates local field | Updates | Updates | Updates (prefer signal) |
| `setInterval` increments plain field | Updates | Often **stale** | **Stale** |
| `setInterval` + `markForCheck` | Updates | Updates | Updates |
| `setInterval` + `signal.update` | Updates | Updates | Updates |
| Unrelated click elsewhere in app | This component checked | Often **skipped** | Not scheduled unless something notified |
| `@Input` mutated in place | Child may update | Child **stale** | Child **stale** (same rule) |
| Bundle / overhead | Zone cost | Zone cost | No Zone (~tens of KB saved) |

---

## 5. `markForCheck` vs `detectChanges` vs `detach`

| API | What it does | When to use |
|---|---|---|
| **`markForCheck()`** | Marks this view (and ancestors) dirty for the **next** scheduled CD | Async callbacks, third-party SDKs, OnPush + Zone timers. Prefer this. |
| **`detectChanges()`** | Runs CD **immediately** on this view + children | Rare — sync with non-Angular code that needs DOM *now*. Easy to overuse. |
| **`detach()` / `reattach()`** | Removes / restores view from CD tree | Extreme local control (e.g. pause a heavy panel). Pair with manual `detectChanges`. |
| **`async` pipe** | Subscribes + **`markForCheck` on emit** | Prefer over manual subscribe in OnPush templates |

```ts
// Prefer
this.cdr.markForCheck();

// Only when you must sync immediately
this.cdr.detectChanges();
```

With **signals**, you rarely need either for normal UI state.

---

## 6. How signals change the story

From [ANGULAR_SIGNALS.md](./ANGULAR_SIGNALS.md):

1. Template reads `count()` → Angular records dependency.  
2. `count.set(1)` → that view is marked dirty.  
3. CD updates bindings.

So:

- **OnPush + signals** = dirty only when dependencies change (plus events / inputs).  
- **Zoneless + signals** = you no longer need Zone to *discover* that something happened.

`computed` cannot replace RxJS `debounce` / `switchMap` — still use RxJS (or `resource`) for async streams; bridge with `toSignal` / `async` pipe.

---

## 7. Migration path (safe order)

1. Make **OnPush** the team default (`ng generate component --change-detection=OnPush`).  
2. Move UI state to **signals** / `async` pipe / immutable `@Input`s.  
3. Fix third-party callbacks (`signal.set` or `markForCheck`).  
4. Fix **reactive forms** if zoneless: form APIs don’t always schedule CD — bridge with signals or `markForCheck` (see angular.dev zoneless guide).  
5. Enable **zoneless** (`provideZonelessChangeDetection` on v20; default on v21 new apps).  
6. **Remove** `zone.js` from polyfills + uninstall.  
7. Replace `NgZone.onStable` / `onMicrotaskEmpty` with `afterNextRender` / `afterEveryRender` / `PendingTasks` for SSR.

Do **not** rip out Zone on day one of a Zone-heavy legacy app.

---

## 8. Common traps (say these out loud)

1. **Mutating `@Input` objects** under OnPush → stale UI.  
2. **Subscribing in TS** without `markForCheck` / signal / `async` pipe under OnPush.  
3. Confusing **OnPush** with **zoneless** — different axes.  
4. Thinking zoneless means “no change detection” — CD still runs; scheduling differs.  
5. **`NgZone.runOutsideAngular`** for high-freq events (scroll) still useful under Zone; under zoneless, prefer signals / throttling without Zone.  
6. Tests: with Zone polyfills, TestBed is Zone-based; force zoneless with `provideZonelessChangeDetection()` and prefer `await fixture.whenStable()` over blind `detectChanges` when verifying notifications.  
7. **`ExpressionChangedAfterItHasBeenCheckedError`** — often a sync write after CD; signals / moving writes help; zoneless debug: `provideCheckNoChangesConfig({ exhaustive: true })`.

---

## 9. Interview questions (researched + model answers)

Sources commonly ask these: Default vs OnPush lists, Zone role, `markForCheck` vs `detectChanges`, signals + OnPush, zoneless enablement, immutability pitfalls. Answer in 20–60s unless they dig deeper.

### Q1. What is change detection in Angular?

> Angular synchronizes component state with the DOM by checking template bindings. Something schedules a CD pass; then strategies decide which views are actually checked.

### Q2. Default vs OnPush?

> Default checks the component whenever CD runs. OnPush skips the subtree unless inputs change by reference, an event fires in the subtree, async pipe / signals notify, or you `markForCheck`.

### Q3. When does Zone.js trigger CD?

> It patches async APIs. When those tasks complete, Angular is notified and typically runs CD from the root (OnPush may still skip clean subtrees).

### Q4. What is zoneless Angular? How do you enable it?

> No Zone.js scheduling — CD only from explicit notifications (signals, listeners, async pipe, markForCheck, setInput). On Angular 20: `provideZonelessChangeDetection()`. On Angular 21+ new apps it’s the default; use `provideZoneChangeDetection()` only if you need Zone back. Remove `zone.js` from polyfills.

### Q5. Does OnPush mean no Zone?

> No. OnPush works with Zone or zoneless. OnPush limits *which* views check; Zone/zoneless controls *what schedules* CD.

### Q6. Why is my OnPush view stale after HTTP / timer?

> Subscription in the class updated a field but didn’t notify. Use `async` pipe, `toSignal`, signal writes, or `markForCheck()`. Also check `@Input` identity.

### Q7. `markForCheck` vs `detectChanges`?

> `markForCheck` flags dirty for the next CD cycle (preferred). `detectChanges` runs CD immediately on that subtree (use sparingly).

### Q8. How do signals interact with OnPush / zoneless?

> Reading a signal in a template registers a dependency; writing it marks that view dirty. That’s the main path that makes zoneless practical without Zone patches.

### Q9. Performance benefits of OnPush / zoneless?

> OnPush: skip large unchanged subtrees. Zoneless: fewer spurious CD runs, smaller bundle, less monkey-patch overhead, clearer debugging / CWV.

### Q10. Should every component be OnPush?

> Yes as a team default for app components. Library hosts of dynamic user components sometimes stay Default for compatibility. Zoneless docs recommend OnPush as a step toward compatibility, not a hard runtime requirement if you still notify correctly.

### Q11. Immutability and OnPush?

> Angular compares input references. Mutate-in-place keeps the same reference → OnPush won’t treat it as a new input. Spread / new array / new object (or signals).

### Q12. `detach()` — when?

> When you want the view completely out of CD until you `detectChanges` / `reattach` — advanced; prefer OnPush + signals first.

### Q13. Reactive forms under zoneless?

> `setValue` / `patchValue` update form state but may not schedule CD. Bridge with signals or `markForCheck` if the template reads form state.

### Q14. How do you migrate a Zone app to zoneless?

> OnPush everywhere → signals / async pipe → fix third-party + forms → enable zoneless → remove zone.js → replace Zone stability APIs with render hooks / PendingTasks.

### Q15. “Show me an example where Default updates but OnPush doesn’t.”

> Use the timer example in §4: Zone schedules CD; Default shows ticks; OnPush without `markForCheck` stays stale. Even clearer under zoneless with a plain field++.

---

## 10. Spoken answers

### 45s — Default vs OnPush

> Default means whenever Angular runs change detection, my component is checked. OnPush means Angular skips me unless my inputs change by reference, an event happens in my subtree, an async pipe or signal notifies, or I call markForCheck. I use OnPush with immutable data or signals so large trees don’t re-check on every unrelated async event.

### 45s — Zoneless

> Zone.js monkey-patches async APIs and schedules change detection very often. Zoneless removes that: Angular updates when signals, template events, async pipe, or markForCheck notify it. It’s stable via provideZonelessChangeDetection since 20.2, and default for new apps in Angular 21. The migration path is OnPush plus signals, then drop zone.js.

### 30s — Why both OnPush and zoneless?

> They’re different layers. Zoneless decides when CD is scheduled; OnPush decides which components participate. Together with signals you get fewer cycles and clearer data flow — that’s the modern Angular performance story.

---

## 11. Quick revision card

| Term | Remember |
|---|---|
| Default | Check when CD runs |
| OnPush | Check only when dirty triggers fire |
| Zone.js | Patches async → schedules CD |
| Zoneless | Explicit notifications only |
| Signals | Template read → dependency; write → dirty |
| v20.2 | `provideZonelessChangeDetection` stable |
| v21 | Zoneless default for new apps |
| Stale UI fix | New input ref / signal / async pipe / `markForCheck` |

---

## 12. Practice checklist

- [ ] Explain the **two axes** without mixing them up  
- [ ] Draw the §4 verdict table from memory  
- [ ] Predict output: OnPush + mutate `@Input` in place  
- [ ] Predict output: zoneless + `setInterval` + plain field  
- [ ] Name version defaults (Zone classic vs v21 zoneless)  
- [ ] Contrast `markForCheck` vs `detectChanges` in one sentence  
- [ ] Give the 45s spoken answers above  

---

## Related

| Guide | Why |
|---|---|
| [ANGULAR_SIGNALS.md](./ANGULAR_SIGNALS.md) | Fine-grained dirty marking |
| [UNIT_TESTING.md](./UNIT_TESTING.md) | `whenStable` / zoneless TestBed notes |
| [REACT_TO_ANGULAR_MACHINE_CODING.md](./REACT_TO_ANGULAR_MACHINE_CODING.md) | React.memo ≈ OnPush |

Official: [angular.dev/guide/zoneless](https://angular.dev/guide/zoneless)

---

*Update when Angular changes defaults (e.g. CLI generator OnPush) or renames providers.*
