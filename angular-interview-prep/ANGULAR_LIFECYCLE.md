# Angular Lifecycle — Deep Interview Guide

Interviewers rarely ask “list the hooks.” They ask **why this one exists when that one already ran**, and they catch people on **`ngOnInit` vs `ngOnChanges`** and especially **`ngOnChanges` vs `ngDoCheck`**.

This rewrite is built around those traps: **what Angular already sees**, **what it refuses to see**, and **which hook is the only place that can close the gap**.

**Pairs with:** [Change detection (Default / OnPush / zoneless)](./ANGULAR_CHANGE_DETECTION_ONPUSH_ZONELESS.md) · [Content vs View queries](./ANGULAR_CONTENT_TEMPLATES_QUERIES.md) · [Signals](./ANGULAR_SIGNALS.md)

---

## 0. Mental model (say this first)

A component is not “born then updated.” Angular runs it through **fixed phases of one creation**, then **repeats a subset of hooks on later change-detection (CD) cycles**, then **destroys it once**.

```text
CREATE (once)
  constructor
  ngOnChanges          ← only if @Input bindings exist
  ngOnInit
  ngDoCheck
  ngAfterContentInit
  ngAfterContentChecked
  ngAfterViewInit
  ngAfterViewChecked

UPDATE (every later CD that actually checks this component)
  ngOnChanges          ← ONLY if at least one @Input binding changed (by Angular’s rules)
  ngDoCheck            ← ALWAYS on that check (this is the whole point)
  ngAfterContentChecked
  ngAfterViewChecked

DESTROY (once)
  ngOnDestroy
```

**Creation vs update is the first filter.**  
`ngOnInit` / `*Init` / `ngOnDestroy` never re-run.  
`ngOnChanges` *may* re-run.  
`ngDoCheck` and `*Checked` *do* re-run.

**Tiny memory phrase**

> Changes → Init → DoCheck → Content → View → Destroy.  
> After that, only Changes / DoCheck / Checked.

---

## 1. Hook order details interviewers actually use

### 1.1 No `@Input` at all

`ngOnChanges` is **skipped forever** (including first run).

```text
constructor → ngOnInit → ngDoCheck → AfterContent* → AfterView* → …
```

### 1.2 Has `@Input`, first CD

Inputs are assigned **before** `ngOnInit`, and the **first** assignment still goes through `ngOnChanges`.

```text
constructor → ngOnChanges (firstChange: true) → ngOnInit → ngDoCheck → …
```

### 1.3 Parent vs child

A parent’s **view** includes its child components. So:

```text
Parent ngOnInit
Child  ngOnInit
Child  ngAfterViewInit
Parent ngAfterViewInit   ← parent view is ready only after children
```

Parent `ngAfterContentInit` is about **projected** nodes into the parent, not about the child sitting in the parent template. Those children are **view**, not content.

### 1.4 Directives

Same hooks as components. No “view” of their own in the same way, but they still get `ngOnChanges` / `ngOnInit` / `ngDoCheck` / `ngOnDestroy`. Query/`AfterView*` behavior depends on what they query.

---

## 2. The comparisons that catch people

Read this section even if you skip the rest. Each pair is “why both exist.”

---

### A. `constructor` vs `ngOnInit`

| | `constructor` | `ngOnInit` |
|---|---|---|
| When | JS class constructed; DI already injected | After first input bindings applied |
| Runs | Once | Once |
| `@Input()` | **Not guaranteed** (often `undefined`) | **Ready** |
| View / `ViewChild` | Not created | Still **not** guaranteed |
| DOM / `window` | Unsafe on SSR | Still unsafe on SSR |

**Why Angular didn’t just say “do everything in the constructor”**

The constructor’s job is **construct the object**: receive dependencies, set default fields. Angular has **not finished wiring the component into the template** yet. Inputs come from the parent **binding**, which happens after construction.

```ts
@Component({ selector: 'app-user', template: `{{ userId }}` })
export class User implements OnInit {
  @Input() userId!: string;

  constructor(private api: UserApi) {
    // this.userId is often undefined here
    // this.api.get(this.userId) would fetch the wrong thing
  }

  ngOnInit() {
    this.api.get(this.userId).subscribe(); // input is set
  }
}
```

**Use constructor for:** `inject()`, storing services, `DestroyRef.onDestroy`, `afterNextRender`, field defaults.  
**Use ngOnInit for:** “start work that needs inputs” — HTTP, combining several inputs, one-time setup.

**Spoken 20s**

> Constructor is DI and fields. Inputs aren’t bound yet, view isn’t created. I put input-based fetch in `ngOnInit`. If I only needed a service, I wouldn’t even need `ngOnInit`.

**Trap:** “I can use an `@Input()` setter instead of `ngOnInit`.” True for **one** input that should react immediately — not a reason to put HTTP in the constructor.

---

### B. `ngOnInit` vs `ngOnChanges`  ← they will ask this

Both see `@Input()`. That is why people mash them.

| | `ngOnInit` | `ngOnChanges` |
|---|---|---|
| How often | **Once** | First time **and every later input change** Angular detects |
| What you get | Current input fields | `SimpleChanges`: `previousValue`, `currentValue`, `firstChange`, only **keys that changed** |
| If no `@Input` | Still runs | **Never runs** |
| If parent passes same object ref again | Already ran; won’t re-run | **Won’t run** (no change) |
| Best for | Initial load | Reload / reset when **that input** changes |

**Why you still need `ngOnInit` if `ngOnChanges` already ran first**

On the first cycle, `ngOnChanges` fires **per changed input**, then `ngOnInit` fires **once**.

- `ngOnChanges` is the wrong place for “do this exactly once regardless of how many inputs I have.” You’d have to gate on `firstChange` and wait until **all** inputs you care about exist.
- `ngOnInit` is the **batch “construction finished, inputs are on the instance”** hook. One place. No `if (changes.x?.firstChange)` soup.

```ts
ngOnChanges(changes: SimpleChanges) {
  // First CD: may fire with only some keys if others weren't bound
  if (changes['userId'] && !changes['userId'].firstChange) {
    this.reload(changes['userId'].currentValue);
  }
}

ngOnInit() {
  this.reload(this.userId); // once, all inputs already assigned
}
```

Typical production pattern:

- **First fetch** in `ngOnInit`
- **Later refetches** in `ngOnChanges` when `userId` is not `firstChange`

Or put **all** reloads in `ngOnChanges` and treat first + later the same (also valid — then `ngOnInit` may be empty). Interviewers want you to **know the tradeoff**, not a religion.

**When `ngOnInit` cannot replace `ngOnChanges`**

Parent stays mounted, only the input changes:

```html
<app-user [userId]="selectedId" />
```

User clicks another row → same `User` component instance → **`ngOnInit` does not run again**. If you only fetched in `ngOnInit`, the UI shows the **old** user. That is the entire reason `ngOnChanges` exists.

**When `ngOnChanges` cannot replace `ngOnInit` (cleanly)**

- Work that is **not** about inputs (start an interval, subscribe to a store).
- Work that needs **several** inputs together, once.
- Components with **zero** inputs (`ngOnChanges` never called).

**Spoken 20s**

> `ngOnChanges` runs first, including the first input set, and again whenever Angular sees an input binding change. `ngOnInit` runs once after that. I fetch the first time in `ngOnInit`. If the parent reuses the component and only changes `id`, I must handle that in `ngOnChanges` — `ngOnInit` will not save me.

---

### C. `ngOnChanges` vs `ngDoCheck`  ← this is the one that fails interviews

This is **not** “DoCheck is the newer OnChanges.” They detect **different kinds of change**.

#### What `ngOnChanges` can see

Angular’s **input binding** compared the **previous bound value** to the **new bound value** with something like `===` (reference for objects).

It **fires** when:

```ts
// parent
this.userId = 2;           // new primitive → child ngOnChanges
this.user = { ...u, name }; // new object reference → child ngOnChanges
this.items = [...items, x]; // new array reference → child ngOnChanges
```

It **does not fire** when:

```ts
this.user.name = 'Ada';    // mutate in place — same reference
this.items.push(x);        // mutate array — same reference
this.counter++;            // not an @Input on the child at all
this.service.value = 1;    // service field mutated
```

Also: if CD never **checks** the child (OnPush + not marked dirty), you may not see updates in the template either. See the CD guide.

#### What `ngDoCheck` can see

`ngDoCheck` runs on **every CD cycle that checks this component**, whether inputs changed or not.

You can store a **previous snapshot** and compare **deep fields** Angular refuses to watch.

```ts
export class UserCard implements OnChanges, DoCheck {
  @Input() user!: { id: number; name: string };
  private prevName = '';

  ngOnChanges(changes: SimpleChanges) {
    // Runs when parent does user = { ...newUser } (new ref)
    if (changes['user']) {
      this.prevName = this.user.name;
    }
  }

  ngDoCheck() {
    // Runs even if parent did user.name = 'Ada' (same ref)
    if (this.user.name !== this.prevName) {
      this.prevName = this.user.name;
      // custom reaction: log, recompute, markForCheck()
    }
  }
}
```

**That is why `ngDoCheck` exists:**  
Angular’s default change detection **updates the template** for `{{ user.name }}` even after mutation (Default strategy walks bindings). But **`ngOnChanges` still will not run**, because the **input binding itself** did not change.

So:

| Need | Hook |
|---|---|
| “Parent passed a **new** `@Input` value / new object” | `ngOnChanges` |
| “Something Angular’s **input diff** missed, and I need **imperative** code (not just template interpolation)” | `ngDoCheck` |
| “Template should show `user.name` after mutation” | Often **no hook** — Default CD already re-reads the binding. Don’t reach for DoCheck for that. |

**Critical interview sentence**

> Template update ≠ `ngOnChanges`. Default CD re-reads `{{ user.name }}` every cycle. `ngOnChanges` only runs when the **input reference/value** Angular bound has changed. `ngDoCheck` is the escape hatch for **custom dirty checking** when you need logic on mutations or non-input state.

#### Why not use `ngDoCheck` for everything?

It can run **very often** (every CD on that component). Heavy work here = jank. Angular’s own docs treat it as advanced / last resort.

Prefer instead:

1. Immutable updates from the parent (`user = { ...user, name }`) so `ngOnChanges` / OnPush work.
2. `input()` + `effect()` / `computed()`.
3. `OnPush` + `markForCheck` / signals so you don’t need custom diffs.

#### Historical “correct” DoCheck: differs

The intended advanced use is Angular’s **differs** (what `ngFor` uses internally):

```ts
private differ = inject(IterableDiffers).find([]).create<Item>();

ngDoCheck() {
  const changes = this.differ.diff(this.items); // @Input array mutated in place
  if (changes) {
    changes.forEachAddedItem((r) => { /* ... */ });
  }
}
```

Same idea: **OnChanges missed the mutation; DoCheck + differ sees collection diffs.**

#### OnPush + DoCheck (follow-up they love)

OnPush skips checking the **template** unless the component is marked dirty. `ngDoCheck` can still run when Angular visits the component; a classic pattern is: custom compare in `ngDoCheck`, then `cdr.markForCheck()` so the view actually refreshes after an in-place mutation.

That is a **patch**, not an architecture. The architecture is: don’t mutate, or use signals.

#### Is `ngDoCheck` only for OnPush?

**No. It exists for both. The *need* is different.**

`ngDoCheck` is **not** an OnPush-only hook. It runs on **every CD that checks this component** — Default **and** OnPush (OnPush: when Angular visits it, including so you can `markForCheck()`).

| Strategy | Template `{{ user.name }}` after `user.name = 'Ada'` (same ref) | Do you **need** `ngDoCheck`? |
|---|---|---|
| **Default** | Already updates — CD **re-reads** the binding | **Usually no** for the template. **Yes** if you need **TypeScript** to run (differ, log, recompute, close a drawer) — `ngOnChanges` will **not** fire |
| **OnPush** | **Stays stale** unless dirty (`markForCheck` / new input ref / event / signal) | **Yes if you insist on mutation** — DoCheck compare + `markForCheck()`. That’s fighting OnPush |

```text
Need ngDoCheck?  =  “OnChanges missed it AND I must run my code”
                   (IterableDiffer, nested field, non-input state)

Not because strategy is OnPush.
OnPush just makes the *template* miss mutations too — so people reach for DoCheck + markForCheck.
```

**Default example (DoCheck still justified):** parent mutates `items.push(x)`. `*ngFor` / `@for` may or may not see it depending on identity; **`ngOnChanges` does not run**. An `IterableDiffer` in `ngDoCheck` is the old Angular way to see collection mutation. Template interpolation of a **field** on Default often needs **no** hook.

**Prefer instead of DoCheck on either strategy:** new object/array from parent, or **signal inputs**.

**Spoken 15s:**

> DoCheck isn’t OnPush-only. It runs whenever this component is checked. On Default I rarely need it for the template — bindings re-read. I need it when I want **my** logic on a mutation `ngOnChanges` won’t see. On OnPush the view also ignores that mutation, so DoCheck plus `markForCheck` is a patch. I’d rather pass a new reference.

---

> `ngOnChanges` is Angular telling me an **`@Input` binding** changed — primitives by value, objects by reference. If the parent mutates `user.name` without a new object, `ngOnChanges` does not run. `ngDoCheck` runs every time this component is checked, so I can compare previous vs current myself. I almost never put real work there because it is a performance trap. I’d rather have the parent pass a new reference, or use signal inputs.

---

### D. `@Input()` setter vs `ngOnChanges`

```ts
private _id = '';
@Input()
set userId(v: string) {
  this._id = v;
  this.reload(v); // runs per assignment, including first
}
get userId() { return this._id; }
```

| | Setter | `ngOnChanges` |
|---|---|---|
| Granularity | One input at a time | **All changed inputs in one bag** |
| Previous value | You must store it yourself | Given (`previousValue`) |
| Several inputs that must be applied together | Easy to reload twice (id setter then filter setter) | One method; you can wait until both keys exist |
| Reads like | Reactive field | Lifecycle batch |

**Pick setter** when one input is the whole story (id → reload).  
**Pick ngOnChanges** when “if `from` and `to` both changed this CD, run **one** query.”

Setters still **don’t** fire on in-place object mutation. Same hole as `ngOnChanges`. `ngDoCheck` is still the mutation hatch.

---

### E. `ngDoCheck` vs `ngAfterContentChecked` vs `ngAfterViewChecked`

All three can run **every CD**. They are **not** interchangeable; they sit at **different depths** of the same cycle.

```text
ngOnChanges?          input bindings just applied
ngDoCheck             “I’m about to check content + view — custom logic here”
ngAfterContentInit?   (once) projected content initialized
ngAfterContentChecked projected content has been checked
ngAfterViewInit?      (once) my template + ViewChild + child comps ready
ngAfterViewChecked    my view has been checked
```

| Hook | What is already true | What is not |
|---|---|---|
| `ngDoCheck` | Inputs assigned; you may inspect fields | **`@ContentChild` / `@ViewChild` not a safe “query is ready” guarantee on first run** (first CD: Content/View init haven’t run yet) |
| `ngAfterContentChecked` | Projected content checked | Your own `ViewChild` may still be pending on the **first** pass before `ngAfterViewInit` |
| `ngAfterViewChecked` | Full view checked, children too | Writing bound state here → `ExpressionChangedAfterItHasBeenCheckedError` |

**Why three “every cycle” hooks?**

- **DoCheck:** custom **model** dirty-check **before** Angular checks the rest. Classic: differ on an `@Input` collection.
- **AfterContentChecked:** projected children might have changed; you query **content**.
- **AfterViewChecked:** **your** DOM / child components just got updated; measure layout if you must (still dangerous to set more bindings).

**If you only need “run after my `ViewChild` exists, once”** — that is **`ngAfterViewInit`**, not DoCheck and not AfterViewChecked.

**Spoken 20s**

> DoCheck is custom change detection on my data. AfterContentChecked is “projected content was checked.” AfterViewChecked is “my template was checked.” Same frequency, different what-is-ready. I never update bound fields in the Checked hooks.

---

### F. `ngAfterContentInit` vs `ngAfterViewInit`

**Content** = nodes the **parent projected** into `<ng-content>`.  
**View** = **this** component’s template (including child components declared there).

```html
<!-- parent -->
<app-card>
  <h2 #title>Projected</h2>   <!-- child's CONTENT -->
</app-card>

<!-- card template = child's VIEW -->
<div class="card">
  <ng-content></ng-content>
  <p #footer>Inside card template</p>
</div>
```

| | Content | View |
|---|---|---|
| Query | `@ContentChild` / `contentChild()` | `@ViewChild` / `viewChild()` |
| Ready (once) | `ngAfterContentInit` | `ngAfterViewInit` |
| Every later CD | `ngAfterContentChecked` | `ngAfterViewChecked` |

Using `ViewChild` in `ngOnInit` is a classic fail — often `undefined`.  
Using `ContentChild` in `ngAfterViewInit` usually works (content inits **before** view), but the **correct** “content is ready” hook is `ngAfterContentInit`. Don’t mix them in an interview without saying why.

**Spoken 20s**

> Content is `ng-content`. View is my template. ContentChild is ready in AfterContentInit; ViewChild in AfterViewInit. Parent AfterViewInit runs after the child’s AfterViewInit because the child is part of the parent view.

---

### F2. The four hooks — what they are, when they fire (Card example)

Two trees inside **one** component (`Card`):

```html
<!-- PAGE (parent) — this HTML is the page's VIEW -->
<app-card>
  <h2 #hdr>Safety</h2>          <!-- projected into Card = Card's CONTENT -->
</app-card>
```

```html
<!-- CARD template — this HTML is Card's VIEW -->
<section class="frame">
  <ng-content></ng-content>    <!-- slot: parent’s <h2> lands here -->
  <button #ok>OK</button>      <!-- Card wrote this — VIEW, not content -->
</section>
```

```ts
export class Card implements AfterContentInit, AfterContentChecked, AfterViewInit, AfterViewChecked {
  @ContentChild('hdr') header?: ElementRef; // the <h2> from the page
  @ViewChild('ok') okBtn?: ElementRef;      // the button in Card's template
}
```

| Word | Meaning |
|---|---|
| **Content** | Stuff the **parent stuffed into** `<app-card>…</app-card>`. Lives in the parent’s template, **projected** through `<ng-content>`. Query: `ContentChild`. |
| **View** | Stuff **this** component wrote in **its own** `template`. Includes child components like `<button>` / `<app-icon>`. Query: `ViewChild`. |
| **Init** | **Once**, first time that tree is created and queries are filled. |
| **Checked** | **Every later CD** (and also right after Init on the first pass). Angular just finished **checking** that tree (bindings, child CD). |

`ngOnInit` is **too early** for both queries — often `undefined`.  
Content is ready **before** view on the same component (Angular projects, then builds your template around the slot).

---

#### First creation (one Card) — order

```
constructor
ngOnChanges? / ngOnInit / ngDoCheck

ngAfterContentInit       ← FIRST time ContentChild is safe
                           this.header.nativeElement.textContent === 'Safety'
                           this.okBtn is still UNDEFINED

ngAfterContentChecked    ← content tree was just checked (also runs this first time)

ngAfterViewInit          ← FIRST time ViewChild is safe
                           this.okBtn.nativeElement exists
                           this.header still exists (content already done)

ngAfterViewChecked       ← view tree was just checked (also runs this first time)
```

**Why content before view?**  
Angular must know what was projected into `<ng-content>` **before** it finishes laying out Card’s own template (the slot is part of that template). So: project → `AfterContent*` → finish view → `AfterView*`.

**Parent vs Card:** the `<h2>` is in the **page’s view**. For **Card**, that same `<h2>` is **content**. The `<button>` is only Card’s view. Page’s `AfterViewInit` runs **after** Card’s `AfterViewInit` (Card is a child in the page view).

---

#### Later clicks / CD (same Card, already on screen)

Init hooks **do not run again**.

```
ngOnChanges?              (only if @Input bindings changed)
ngDoCheck
ngAfterContentChecked     ← projected <h2> was checked again
ngAfterViewChecked        ← Card template / button / child comps checked again
```

| Hook | How often | Typical use |
|---|---|---|
| `ngAfterContentInit` | **Once** | Read `ContentChild`. “Projected title exists — measure it / wire tabs.” |
| `ngAfterContentChecked` | **Every CD** | Rare. Projected nodes changed (ngIf inside the slot). **Do not** set `{{ }}` fields here. |
| `ngAfterViewInit` | **Once** | Read `ViewChild`. Focus the button, `new Chart(canvas)`, subscribe to child `EventEmitter` if you must. |
| `ngAfterViewChecked` | **Every CD** | Rare. Layout after the view updated (`scrollHeight`). Easy to get **ExpressionChangedAfterItHasBeenCheckedError** if you then set a bound field. |

**“Checked” means:** Angular already walked that subtree for this CD turn — bindings applied, child components checked. It is **not** “browser paint finished.” For paint/focus/SSR-safe DOM, prefer `afterNextRender` (see G).

---

#### What to put where (same Card)

```ts
ngAfterContentInit() {
  // ✅ projected header is here
  console.log(this.header?.nativeElement.textContent);
}

ngAfterViewInit() {
  // ✅ my button is here
  this.okBtn?.nativeElement.focus();
}

ngAfterContentChecked() {
  // ⚠️ every CD — don’t this.title = … 
}

ngAfterViewChecked() {
  // ⚠️ every CD — this.okWidth = this.okBtn.offsetWidth
  //    then {{ okWidth }} in the template → ExpressionChanged
}
```

**ExpressionChanged:** you changed a value that the **already-checked** view displays, in the same CD. Angular’s extra verify pass sees a different value → error (dev mode). Fix: compute earlier (`ngOnInit` / `computed`), or `afterNextRender`, not in `*Checked`.

---

#### Spoken 30s

> Content is `ng-content` — what the parent projected. View is my own template. `AfterContentInit` / `AfterViewInit` run once when those queries are first safe. `AfterContentChecked` / `AfterViewChecked` run every change detection after Angular has checked that tree. I use Init for setup. I almost never write bound state in Checked.

---

### G. `ngAfterViewInit` vs `afterNextRender` / `afterEveryRender`

| | `ngAfterViewInit` | `afterNextRender` |
|---|---|---|
| When | After first view init (during CD / lifecycle) | After the **next render is flushed** to the DOM |
| SSR | **Runs on the server** | **Browser only** (skips server) |
| `ViewChild` | Available | Available (schedule from constructor) |
| Measure / `getBoundingClientRect` | Can be early / SSR-broken | Intended for paint-time DOM |
| 3rd-party chart on a `div` | Common, but SSR-unsafe | Prefer this |

`afterEveryRender` ≈ “AfterViewChecked but browser-render-oriented.” Still easy to overuse.

**Spoken 15s**

> AfterViewInit is the classic ‘ViewChild exists’ hook; it also runs during SSR. For real DOM — focus, charts, scrollHeight — I use `afterNextRender` so it never touches `window` on the server.

---

### H. `ngOnDestroy` vs `DestroyRef` / `takeUntilDestroyed`

Same **moment** (instance going away). Different **API**.

| | `ngOnDestroy` | `DestroyRef` |
|---|---|---|
| Need `implements OnDestroy` | Yes | No |
| Multiple cleanup sites | One method that grows | Register next to the resource (`onDestroy`) |
| RxJS | `unsubscribe` / `takeUntil(subject)` | `takeUntilDestroyed(destroyRef)` |

```ts
constructor() {
  const id = setInterval(() => {}, 1000);
  inject(DestroyRef).onDestroy(() => clearInterval(id));
}

ngOnInit() {
  this.api.poll()
    .pipe(takeUntilDestroyed(this.destroyRef))
    .subscribe();
}
```

**Spoken 15s**

> Destroy is for subscriptions, timers, listeners, third-party widgets. I still know `ngOnDestroy`; in new code I prefer `DestroyRef` so cleanup lives next to the allocation.

---

### I. `ngOnChanges` vs `effect()` + `input()`

| | `ngOnChanges` + `@Input()` | `effect` + `input()` |
|---|---|---|
| Trigger | Binding change (reference) | Signal read inside effect changed |
| Previous value | `SimpleChanges` | You store previous yourself |
| First run | Yes (if inputs exist) | Effect runs after creation when it first reads |
| Object mutation | Misses it | Misses it unless a **signal** inside changed |
| Style | Lifecycle interface | Reactivity graph |

**Spoken 15s**

> For decorator inputs I use OnChanges. For signal inputs I use `effect` or `computed`. Neither sees in-place mutation of a plain object; I’d make the field a signal or replace the object.

---

## 3. Hook-by-hook (what it is *for*)

### `constructor`

**Exists to:** create the instance and take DI.

**Use:** inject services, defaults, register render/destroy callbacks.

**Don’t:** HTTP that needs inputs, `ViewChild`, `document`.

---

### `ngOnChanges(changes: SimpleChanges)`

**Exists to:** notify you of **input binding** changes, with a **diff**, including the first assignment.

Read the API; interviews poke this:

```ts
changes['userId'].currentValue
changes['userId'].previousValue  // undefined on firstChange
changes['userId'].firstChange
changes['userId'].isFirstChange()
Object.keys(changes)             // ONLY inputs that changed this cycle
```

**Use:** reset local state, refetch by id, sync a non-signal derived field.

**Don’t:** treat it as “any state change in my component.” Internal `this.x = 1` does not call it.

---

### `ngOnInit`

**Exists to:** one-time “component is bound into the tree, inputs are on the instance.”

**Use:** initial HTTP, combine inputs, start subscriptions.

**Don’t:** assume it re-runs on route param change **if** the same component is reused (that’s `ngOnChanges` or `paramMap` subscribe). Don’t use `ViewChild` here.

---

### `ngDoCheck`

**Exists to:** let **you** implement change detection Angular will not.

**Use (rare):** `IterableDiffer` / `KeyValueDiffer`; OnPush + in-place mutation + `markForCheck`; comparing a nested field for imperative side effects.

**Don’t:** log, fetch, or heavy compute “just to see if it runs.” It will run a lot.

**If the interviewer says “why do we need it if OnChanges / Default CD exist?”**

Answer in three beats:

1. **OnChanges** = input **binding** diff only.  
2. **Default CD** = re-render **template bindings**; it does **not** call your TypeScript when `user.name` mutates.  
3. **DoCheck** = your TypeScript on every check, so you can react to mutations / custom structures.

Without DoCheck there is **no lifecycle hook** for “the `@Input` object is the same reference but a nested field changed, and I need to run code.”

---

### `ngAfterContentInit` / `ngAfterContentChecked`

**Exists to:** projected content (`ng-content`) is a **different tree** from your template. Queries for that tree need their own ready/checked points.

**Use Init:** `@ContentChild`, initialize a wrapper around projected tabs/headers.

**Use Checked:** almost never in app code. Same ExpressionChanged risk.

---

### `ngAfterViewInit` / `ngAfterViewChecked`

**Exists to:** your template + child components + `ViewChild` are created.

**Use Init:** focus, chart `new Chart(el)`, read initial `scrollHeight` if not SSR.

**Use Checked:** avoid. If you set a bound field here, Angular already finished checking this view → **ExpressionChangedAfterItHasBeenCheckedError**. That error is Angular telling you: you changed the model **after** this view was checked in the same CD.

---

### `ngOnDestroy`

**Exists to:** the instance is leaving the tree (route change, `@if` false, `*ngIf` false, parent destroyed).

**Use:** reverse everything you allocated that the GC won’t (subs, timers, listeners, widget `.destroy()`).

**Don’t:** assume it runs on browser refresh (the tab dies; you don’t always get a graceful hook). Assume it **does** run on in-app navigation.

---

## 4. Worked example: same child, four kinds of “change”

Parent:

```ts
user = { id: 1, name: 'Ada' };
userId = 1;
```

```html
<app-panel [user]="user" [userId]="userId" />
```

| Parent does | `ngOnChanges` | `ngDoCheck` | Template `{{ user.name }}` (Default) |
|---|---|---|---|
| `userId = 2` | Yes (`userId`) | Yes | Updates |
| `user = { id: 2, name: 'Lin' }` | Yes (`user`) | Yes | Updates |
| `user.name = 'Lin'` (same object) | **No** | Yes | **Updates** (Default re-reads) |
| `tick++` (not an input) | **No** | Yes | Unrelated |

OnPush + `user.name = 'Lin'` and **no** `markForCheck`: template may **stay Ada**. OnChanges still no. DoCheck may still run depending on whether Angular visits the component — this is why OnPush + mutation is a footgun. Full story in the CD guide.

---

## 5. Parent / child + content / view (one picture)

```text
Parent template (PARENT VIEW)
  └── <child>
        projected nodes          → CHILD CONTENT   (AfterContent*)
        └── child's own template → CHILD VIEW      (AfterView*)
              └── <grandchild/>  → part of child view
```

Order on create (simplified):

```text
P constructor / P ngOnChanges / P ngOnInit / P ngDoCheck
P AfterContentInit / P AfterContentChecked
  C constructor … C AfterViewInit / C AfterViewChecked
P AfterViewInit / P AfterViewChecked
```

---

## 6. Modern extras (don’t confuse with classic hooks)

| Need | Prefer |
|---|---|
| Browser DOM after paint | `afterNextRender` |
| After every render (rare) | `afterEveryRender` |
| React to `input()` / signals | `effect` / `computed` |
| Cleanup | `DestroyRef` / `takeUntilDestroyed` |
| Keep using decorator `@Input` + later changes | `ngOnChanges` |

Classic hooks **still run on SSR**. Render callbacks are the “don’t smash `document` on the server” layer.

Chat scroll: template ref + `viewChild` + `afterNextRender` (or `ngAfterViewInit` if you ignore SSR). Not `document.querySelector`.

---

## 7. Which hook? (decision tree)

```text
Need DI / register DestroyRef / afterNextRender?
  → constructor

Need @Input values once (first fetch)?
  → ngOnInit

Need to react when parent changes an @Input binding (new id / new object)?
  → ngOnChanges  (or effect + input())

Need one function that sees several inputs that changed together?
  → ngOnChanges  (not a setter)

Need TypeScript to run when a nested field mutated / custom collection diff?
  → ngDoCheck (+ differ / markForCheck)  — then explain you’d rather immutability

Need projected ContentChild?
  → ngAfterContentInit

Need ViewChild / first DOM?
  → ngAfterViewInit  (or afterNextRender if real browser DOM)

Need cleanup?
  → ngOnDestroy / DestroyRef

Need “every CD” for layout sync?
  → usually you don’t; AfterViewChecked is a last resort
```

---

## 8. Common mistakes

1. **Fetch only in `ngOnInit`** on a reused component (`[id]="routeId"`) → stale data. Need `ngOnChanges` or router observables.  
2. **`ViewChild` in `ngOnInit`** → `undefined`.  
3. **Assume `ngOnChanges` sees `user.name = x`** → it doesn’t.  
4. **Heavy `ngDoCheck`** → performance bug.  
5. **Set bindings in `ngAfterViewChecked`** → ExpressionChanged.  
6. **HTTP in constructor using `@Input`** → undefined id.  
7. **`document` / `window` in `ngOnInit` with SSR** → use `afterNextRender`.  
8. **Forget destroy** → leaks on route change ([memory leaks guide](./ANGULAR_MEMORY_LEAKS.md)).  
9. **Confuse content vs view** → wrong query + wrong init hook.

---

## 9. Minimal demo of the important ones

```ts
import {
  Component,
  Input,
  OnChanges,
  OnInit,
  DoCheck,
  AfterViewInit,
  OnDestroy,
  SimpleChanges,
  ElementRef,
  viewChild,
} from '@angular/core';

@Component({
  selector: 'app-demo-life',
  template: `<div #box>{{ title }}</div>`,
})
export class DemoLife
  implements OnChanges, OnInit, DoCheck, AfterViewInit, OnDestroy
{
  @Input() title = '';
  box = viewChild<ElementRef<HTMLDivElement>>('box');
  private prevTitle = '';

  ngOnChanges(changes: SimpleChanges) {
    if (changes['title']) {
      console.log('binding changed', changes['title'].previousValue, '→', this.title);
    }
  }

  ngOnInit() {
    console.log('init, title already', this.title);
  }

  ngDoCheck() {
    if (this.title !== this.prevTitle) {
      this.prevTitle = this.title;
      // would also catch cases OnChanges missed if title were nested on an object input
    }
  }

  ngAfterViewInit() {
    console.log('view ready', this.box()?.nativeElement);
  }

  ngOnDestroy() {
    console.log('cleanup');
  }
}
```

---

## 10. Spoken answers (memorize)

### Lifecycle in 25s

> Hooks run at fixed points: create, then on later CD, then destroy. I use `ngOnInit` for one-time input-based setup, `ngOnChanges` when `@Input` bindings keep changing, `ngAfterViewInit` or `afterNextRender` for ViewChild/DOM, content hooks for `ng-content`, and `DestroyRef`/`ngOnDestroy` for cleanup. `ngDoCheck` is only for custom dirty checking Angular’s input diff won’t see.

### `ngOnInit` vs `ngOnChanges`

> OnChanges can run first and again whenever an input **binding** changes. OnInit runs once after the first OnChanges. First fetch: OnInit. Same component, new id from parent: OnChanges, because OnInit will not run again.

### Why `ngDoCheck` if OnChanges exists?

> OnChanges is the input-binding diff — objects by reference. Mutating `user.name` does not call OnChanges. Default CD may still update `{{ user.name }}` in the template, but my TypeScript doesn’t run. DoCheck runs every check so I can compare nested state myself. I avoid putting real work there; I’d rather pass a new object or use signals.

### Why not always DoCheck instead of OnChanges?

> DoCheck doesn’t give me `SimpleChanges` (prev/current/firstChange) for free, and it runs even when nothing about inputs changed. OnChanges is cheap and precise for bindings. DoCheck is the escape hatch.

### Content vs View

> Content is projected from the parent through `ng-content`. View is my own template. ContentChild → AfterContentInit. ViewChild → AfterViewInit.

---

## 11. Practice checklist

- [ ] Write create vs update vs destroy lists from memory  
- [ ] Explain why OnInit does not re-run when `userId` input changes  
- [ ] Explain why OnChanges misses `user.name = 'x'`  
- [ ] Explain why DoCheck exists **and** why Default CD updating the template is not the same thing  
- [ ] Setter vs OnChanges (one input vs several)  
- [ ] DoCheck vs AfterViewChecked (model diff vs view already checked)  
- [ ] Content vs View + parent AfterViewInit after child  
- [ ] AfterViewInit vs `afterNextRender` (SSR)  
- [ ] ExpressionChanged = writing state in a Checked hook  
- [ ] Cleanup: `ngOnDestroy` vs `DestroyRef`

---

## Quick comparison wall

| Pair | Difference in one line |
|---|---|
| constructor / OnInit | DI vs inputs-are-ready |
| OnInit / OnChanges | once vs every input **binding** change |
| OnChanges / DoCheck | Angular’s input `===` vs **your** dirty check every CD |
| OnChanges / setter | batch + previous values vs per-input |
| DoCheck / AfterViewChecked | before content/view check vs after **view** check |
| AfterContentInit / AfterViewInit | `ng-content` vs own template |
| AfterViewInit / afterNextRender | lifecycle (SSR too) vs browser after paint |
| OnDestroy / DestroyRef | one method vs register-next-to-resource |
| OnChanges / effect | decorator inputs vs signal graph |
