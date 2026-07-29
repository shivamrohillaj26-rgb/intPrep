# Angular Lifecycle — Deep Interview Guide

Angular components (and directives) go through a predictable life:

**created → inputs set → content projected → view rendered → updated on changes → destroyed**

Lifecycle hooks let you run code at each step. Modern Angular also adds **render callbacks** (`afterNextRender`, `afterEveryRender`) and **reactivity** (`effect`, `DestroyRef`).

This guide covers:

- Exact order of classic hooks
- What each hook is for (with real usage)
- Content vs View (huge interview point)
- Modern alternatives (`afterNextRender`, `DestroyRef`, signals)
- Chat / scroll / HTTP / subscription patterns
- Common mistakes

---

## 1. Full lifecycle order (classic)

For a component:

```text
1. constructor
2. ngOnChanges          (if there are @Input bindings; also on first set)
3. ngOnInit             (once)
4. ngDoCheck
5. ngAfterContentInit   (once)     ← projected content ready (<ng-content>)
6. ngAfterContentChecked
7. ngAfterViewInit      (once)     ← template + ViewChild ready
8. ngAfterViewChecked
   ... later updates: ngOnChanges / ngDoCheck / *Checked hooks again ...
9. ngOnDestroy          (once)
```

Child components are created and initialized **before** the parent’s `ngAfterViewInit` (parent view includes children).

### Tiny memory phrase

> **Changes → Init → Content → View → Destroy**  
> Checked hooks run on later change-detection cycles.

---

## 2. Hook-by-hook with usage

### `constructor`

**When:** class is created; DI is available.

**Use for:**

- Injecting services (`inject()` or constructor params)
- Simple field defaults
- Registering `afterNextRender` / `DestroyRef` callbacks

**Avoid:**

- HTTP calls that depend on `@Input()` (inputs not set yet)
- Touching the DOM / `ViewChild` (view not created)

```ts
import { Component, inject } from '@angular/core';
import { UserService } from './user.service';

@Component({ /* ... */ })
export class Profile {
  private users = inject(UserService);

  constructor() {
    // OK: store service, set defaults
  }
}
```

---

### `ngOnChanges`

**When:** one or more `@Input()` values change (including the **first** change, before `ngOnInit`).

**Use for:**

- React to a specific input change
- Reset internal state when parent passes a new id

```ts
import { Component, Input, OnChanges, SimpleChanges } from '@angular/core';

@Component({
  selector: 'app-user-card',
  template: `<p>{{ userId }}</p>`,
})
export class UserCard implements OnChanges {
  @Input() userId!: number;

  ngOnChanges(changes: SimpleChanges) {
    if (changes['userId']) {
      const prev = changes['userId'].previousValue;
      const curr = changes['userId'].currentValue;
      const first = changes['userId'].firstChange;
      console.log({ prev, curr, first });
      // reload details for new userId
    }
  }
}
```

**Interview tip:** If you only need “run once after first inputs”, prefer `ngOnInit`. Use `ngOnChanges` when you must react to **later** input updates.

**Signals note:** with `input()` signals, you often use `effect()` instead of `ngOnChanges`.

---

### `ngOnInit`

**When:** once, after first `ngOnChanges` (inputs are ready).

**Use for (most common):**

- Initial HTTP fetch based on inputs
- Setup that needs `@Input()` values
- Start subscriptions (and clean them in destroy)

```ts
import { Component, Input, OnInit, OnDestroy } from '@angular/core';
import { Subscription } from 'rxjs';

@Component({ /* ... */ })
export class ProductPage implements OnInit, OnDestroy {
  @Input() productId!: string;
  private sub?: Subscription;

  constructor(private api: ProductApi) {}

  ngOnInit() {
    this.sub = this.api.getProduct(this.productId).subscribe((p) => {
      // use product
    });
  }

  ngOnDestroy() {
    this.sub?.unsubscribe();
  }
}
```

**Rule of thumb:**  
`constructor` = DI  
`ngOnInit` = start work that needs inputs

---

### `ngDoCheck`

**When:** every change-detection cycle for this component.

**Use for:** rare custom change detection (detect deep object mutations Angular won’t see).

**Avoid in interviews unless asked** — easy to create performance bugs.

```ts
ngDoCheck() {
  // custom compare previous vs current expensive state
}
```

Prefer immutable updates + signals / `OnPush` instead.

---

### Content hooks: `ngAfterContentInit` / `ngAfterContentChecked`

**Content** = what the **parent projects** into this component via `<ng-content>`.

```html
<!-- parent -->
<app-card>
  <h2>Title from parent</h2>   <!-- this is CONTENT -->
</app-card>
```

```html
<!-- card template -->
<div class="card">
  <ng-content></ng-content>
</div>
```

| Hook | When |
|---|---|
| `ngAfterContentInit` | Once, after projected content initialized |
| `ngAfterContentChecked` | After every check of projected content |

**Use `ngAfterContentInit` when:**

- You query projected content with `@ContentChild` / `contentChild()`

```ts
import { AfterContentInit, Component, ContentChild, ElementRef } from '@angular/core';

@Component({
  selector: 'app-card',
  template: `<div class="card"><ng-content></ng-content></div>`,
})
export class Card implements AfterContentInit {
  @ContentChild('title') title?: ElementRef;

  ngAfterContentInit() {
    console.log('projected title', this.title?.nativeElement);
  }
}
```

---

### View hooks: `ngAfterViewInit` / `ngAfterViewChecked`

**View** = this component’s **own template** (and child components in that template).

| Hook | When |
|---|---|
| `ngAfterViewInit` | Once, after view + `ViewChild` ready |
| `ngAfterViewChecked` | After every check of the view |

**Use `ngAfterViewInit` when:**

- Access `ViewChild` / `viewChild()` DOM
- Init chart libraries, focus an input, measure element size
- First scroll-to-bottom of a chat list (if data already present)

```ts
import { AfterViewInit, Component, ElementRef, viewChild } from '@angular/core';

@Component({
  selector: 'app-chat',
  template: `
    <div class="body" #body></div>
    <input #input />
  `,
})
export class Chat implements AfterViewInit {
  body = viewChild.required<ElementRef<HTMLDivElement>>('body');
  input = viewChild.required<ElementRef<HTMLInputElement>>('input');

  ngAfterViewInit() {
    this.input().nativeElement.focus();
  }
}
```

**Danger:** don’t change bound state in `ngAfterViewChecked` → classic `ExpressionChangedAfterItHasBeenCheckedError`.

---

### `ngOnDestroy`

**When:** once, just before component is removed (route leave, `@if` false, etc.).

**Use for cleanup:**

- `unsubscribe()`
- `clearInterval` / `clearTimeout`
- remove manual `addEventListener`
- tear down 3rd-party widgets

```ts
ngOnDestroy() {
  this.sub?.unsubscribe();
  clearInterval(this.timerId);
  window.removeEventListener('resize', this.onResize);
}
```

Modern cleaner alternative: **`DestroyRef`** (see below).

---

## 3. Content vs View (interview favorite)

| | Content | View |
|---|---|---|
| Comes from | Parent projection (`ng-content`) | Component’s own template |
| Query API | `@ContentChild` / `contentChild` | `@ViewChild` / `viewChild` |
| Ready in | `ngAfterContentInit` | `ngAfterViewInit` |

```text
Parent template
  └── <child> projected nodes </child>   ← child's CONTENT
        └── child's template + its children  ← child's VIEW
```

---

## 4. Modern Angular: render callbacks

Classic hooks also run during **SSR**. DOM APIs (`window`, `document`, measuring height) can break on the server.

Use these for **browser-only after-paint** work:

### `afterNextRender` — once after next render

Perfect for:

- Focus input
- Init chart / map library
- Measure DOM once
- Scroll chat to bottom after first paint

```ts
import { Component, ElementRef, afterNextRender, viewChild } from '@angular/core';

@Component({
  selector: 'app-chart-host',
  template: `<div #host></div>`,
})
export class ChartHost {
  host = viewChild.required<ElementRef<HTMLDivElement>>('host');

  constructor() {
    afterNextRender(() => {
      // browser only — safe for DOM
      const el = this.host().nativeElement;
      // new Chart(el, ...)
    });
  }
}
```

### `afterEveryRender` — after every render

Use rarely (logging, syncing third-party DOM). Prefer signals/`effect` for app state.

### Chat scroll example (better than random `setTimeout` sometimes)

```ts
import { Component, ElementRef, afterNextRender, viewChild } from '@angular/core';

@Component({ /* ... */ })
export class ChatBot {
  chatBody = viewChild<ElementRef<HTMLDivElement>>('chatBody');
  chatHistory: { message: string; sender: string }[] = [];

  constructor() {
    // optional: scroll after first paint
    afterNextRender(() => this.scrollToBottom());
  }

  sendMessage(text: string) {
    this.chatHistory.push({ message: text, sender: 'user' });
    // after DOM updates for this change, scroll once
    afterNextRender(() => this.scrollToBottom());
  }

  private scrollToBottom() {
    const el = this.chatBody()?.nativeElement;
    if (el) el.scrollTop = el.scrollHeight;
  }
}
```

> Note: calling `afterNextRender` inside `sendMessage` schedules for the **next** render. For simple apps, `setTimeout(() => ...)` after push is also fine and shorter.

---

## 5. Modern cleanup: `DestroyRef` + `takeUntilDestroyed`

You don’t always need to implement `OnDestroy`.

```ts
import { Component, DestroyRef, inject, OnInit } from '@angular/core';
import { takeUntilDestroyed } from '@angular/core/rxjs-interop';

@Component({ /* ... */ })
export class Feed implements OnInit {
  private destroyRef = inject(DestroyRef);
  private api = inject(FeedApi);

  ngOnInit() {
    this.api.poll()
      .pipe(takeUntilDestroyed(this.destroyRef))
      .subscribe();
  }
}
```

Or register any cleanup:

```ts
constructor() {
  const id = setInterval(() => {}, 1000);
  inject(DestroyRef).onDestroy(() => clearInterval(id));
}
```

---

## 6. Signals + `effect` vs lifecycle

| Need | Prefer |
|---|---|
| React to signal / `input()` changes | `effect()` |
| One-time init with inputs | `ngOnInit` or `effect` once |
| DOM after paint | `afterNextRender` |
| Cleanup | `DestroyRef` / effect cleanup |
| Input object changed by reference | `ngOnChanges` or signal inputs |

```ts
import { Component, effect, input } from '@angular/core';

@Component({ /* ... */ })
export class UserPanel {
  userId = input.required<number>();

  constructor() {
    effect(() => {
      const id = this.userId();
      // runs when userId signal changes
      console.log('load user', id);
    });
  }
}
```

---

## 7. Practical “which hook?” cheat sheet

| Task | Where |
|---|---|
| Inject services | `constructor` / `inject()` |
| Read `@Input` and call API | `ngOnInit` |
| Reload when `@Input` changes | `ngOnChanges` or `effect` + `input()` |
| Use `ViewChild` / focus input | `ngAfterViewInit` or `afterNextRender` |
| Use projected `<ng-content>` child | `ngAfterContentInit` |
| Scroll chat / measure height | `afterNextRender` / `ngAfterViewInit` |
| Unsubscribe / clear timers | `ngOnDestroy` or `DestroyRef` |
| Every CD cycle custom logic | `ngDoCheck` (avoid) |

---

## 8. Parent / child order example

```ts
// Parent
ngOnInit()        { console.log('P init'); }
ngAfterViewInit() { console.log('P after view'); }

// Child
ngOnInit()        { console.log('C init'); }
ngAfterViewInit() { console.log('C after view'); }
```

Typical log order:

```text
P init
C init
C after view
P after view
```

Parent’s view is ready only after children are ready → parent `ngAfterViewInit` last.

---

## 9. Common mistakes

1. **Using `ViewChild` in `ngOnInit`** → often `undefined`. Wait for `ngAfterViewInit` / `afterNextRender`.
2. **HTTP in `constructor` using `@Input`** → input not set yet. Use `ngOnInit`.
3. **Forgetting unsubscribe** → memory leaks on route changes.
4. **Updating state in `ngAfterViewChecked`** → ExpressionChanged errors / loops.
5. **Heavy work in `ngDoCheck`** → runs very often; kills performance.
6. **DOM APIs in `ngOnInit` during SSR** → prefer `afterNextRender`.

---

## 10. Minimal component implementing the important hooks

```ts
import {
  Component,
  Input,
  OnChanges,
  OnInit,
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
export class DemoLife implements OnChanges, OnInit, AfterViewInit, OnDestroy {
  @Input() title = '';
  box = viewChild<ElementRef<HTMLDivElement>>('box');

  ngOnChanges(changes: SimpleChanges) {
    console.log('changes', changes);
  }

  ngOnInit() {
    console.log('init with title', this.title);
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

## 11. Spoken interview answers

### Short

> Lifecycle hooks run at fixed points. I use `ngOnInit` for input-based setup, `ngAfterViewInit` or `afterNextRender` for DOM/`ViewChild`, `ngOnChanges` when inputs keep changing, and `ngOnDestroy`/`DestroyRef` for cleanup. Content hooks are for `ng-content`; view hooks are for the component template.

### About your chat scroll

> Don’t use `document.querySelector`. Use a template ref + `viewChild`, then scroll after the view updates (`afterNextRender` or a short `setTimeout`) so the new message exists in the DOM first.

---

## 12. Practice checklist

- [ ] Write the hook order from memory
- [ ] Explain Content vs View with an example
- [ ] Know why ViewChild is late (`ngAfterViewInit`)
- [ ] Explain when to use `ngOnChanges` vs `ngOnInit`
- [ ] Cleanup with `ngOnDestroy` / `takeUntilDestroyed`
- [ ] Know `afterNextRender` is browser-only after paint
- [ ] Avoid ExpressionChanged by not writing state in `*Checked` hooks

---

## Quick decision tree

```text
Need DI only?
  → constructor

Need @Input values once?
  → ngOnInit

Need react every time @Input changes?
  → ngOnChanges  (or effect + input())

Need DOM / ViewChild?
  → ngAfterViewInit or afterNextRender

Need projected content?
  → ngAfterContentInit

Leaving the page / destroying component?
  → ngOnDestroy / DestroyRef
```
