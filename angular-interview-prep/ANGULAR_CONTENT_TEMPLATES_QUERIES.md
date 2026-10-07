# Angular: `ng-content`, `ng-template`, `ViewChild` & Friends — Interview Deep Guide

This guide covers the cluster of topics interviewers mix together:

- `ng-content` (content projection)
- `ng-template` / `ng-container` / `ngTemplateOutlet`
- `ViewChild` / `ViewChildren`
- `ContentChild` / `ContentChildren`
- Modern signal queries (`viewChild()`, `contentChild()`)
- `TemplateRef` / `ViewContainerRef`
- When to use which (decision tree + spoken answers)

Related: lifecycle timing is in `ANGULAR_LIFECYCLE.md` (Content vs View).

---

## 0. One-minute map (memorize this)

| Tool | What it is | Renders by itself? |
|---|---|---|
| `ng-content` | Slot where **parent’s HTML** is projected into child | Projects parent content |
| `ng-template` | Template **blueprint** (not shown until used) | No |
| `ng-container` | Invisible grouping wrapper (no real DOM node) | Children only |
| `*ngTemplateOutlet` | Renders an `ng-template` somewhere | Yes (renders template) |
| `ViewChild` | Query something in **this component’s template** | — |
| `ContentChild` | Query something in **projected content** | — |

```text
Parent template
  └── <child> ...projected nodes... </child>   ← CONTENT (ng-content / ContentChild)
        └── child's own template               ← VIEW (ViewChild)
```

---

## 1. What to say in interviews (short answers)

### `ng-content`

> `ng-content` is Angular’s **content projection** API. The parent passes markup into a child component, and the child places that markup into slots with `<ng-content>`. Bindings in projected content still belong to the **parent** context. Use single-slot for simple wrappers (card/modal) and multi-slot with `select` for header/body/footer layouts.

### `ng-template`

> `ng-template` defines a reusable template that is **not rendered** until something instantiates it — structural directives (`*ngIf`, `@if` under the hood), `ngTemplateOutlet`, or `ViewContainerRef.createEmbeddedView`. It’s a blueprint, not a DOM element.

### `ViewChild`

> `ViewChild` (or `viewChild()`) queries an element/component/directive/`TemplateRef` from the component’s **own view**. It’s ready after the view initializes (`ngAfterViewInit` / `afterNextRender`). Don’t confuse it with `ContentChild`, which queries **projected** content.

---

# PART A — `ng-content` (Content Projection)

## 2. Problem it solves

Without projection, reusable wrappers hardcode inner content:

```html
<!-- inflexible -->
<div class="card">
  <h3>Fixed title</h3>
  <p>Fixed body</p>
</div>
```

With projection, the **consumer** supplies the inside:

```html
<app-card>
  <h3>Any title</h3>
  <p>Any body</p>
</app-card>
```

Like HTML slots / React `children`.

---

## 3. Single-slot projection

### Child

```ts
@Component({
  selector: 'app-card',
  standalone: true,
  template: `
    <div class="card">
      <ng-content></ng-content>
    </div>
  `,
  styles: [`.card { border: 1px solid #ddd; padding: 12px; }`],
})
export class Card {}
```

### Parent

```html
<app-card>
  <h2>Orders</h2>
  <p>You have 3 pending orders.</p>
</app-card>
```

Rendered idea:

```html
<div class="card">
  <h2>Orders</h2>
  <p>You have 3 pending orders.</p>
</div>
```

`<ng-content>` is a **placeholder** — it doesn’t become a real element in the DOM; the projected nodes appear in its place.

---

## 4. Multi-slot projection (`select`)

```ts
@Component({
  selector: 'app-dialog',
  standalone: true,
  template: `
    <div class="dialog">
      <header>
        <ng-content select="[dialog-title]"></ng-content>
      </header>
      <section>
        <ng-content select="[dialog-body]"></ng-content>
      </section>
      <footer>
        <ng-content select="[dialog-actions]"></ng-content>
      </footer>
    </div>
  `,
})
export class Dialog {}
```

```html
<app-dialog>
  <h2 dialog-title>Delete item?</h2>
  <p dialog-body>This cannot be undone.</p>
  <div dialog-actions>
    <button>Cancel</button>
    <button>Delete</button>
  </div>
</app-dialog>
```

`select` can match:

- attribute: `select="[dialog-title]"`
- CSS class: `select=".title"`
- element: `select="h2"`
- component selector: `select="app-icon"`

Fallback slot (no `select`) catches remaining content:

```html
<ng-content select="[title]"></ng-content>
<ng-content></ng-content> <!-- everything else -->
```

---

## 5. Critical interview fact: projection context

Projected content is compiled in the **parent’s** context.

```html
<!-- parent -->
<app-card>
  <p>{{ parentName }}</p>   <!-- uses PARENT component fields -->
</app-card>
```

The child **cannot** directly bind its own fields into projected markup.

If the child must pass data into customizable UI → prefer **`ng-template` + `ngTemplateOutlet` context** (Part B), not plain `ng-content`.

---

## 6. When to use `ng-content`

| Use | Example |
|---|---|
| Layout wrappers | card, panel, modal shell |
| Design-system slots | header / body / footer |
| Compose unknown child markup | tabs, toolbar with custom buttons |

Don’t use `ng-content` when you need:

- child to pass **row data** into custom cell UI → use templates
- conditional choose among multiple templates → `ngTemplateOutlet`

---

# PART B — `ng-template`, `ng-container`, `ngTemplateOutlet`

## 7. `ng-template` — blueprint, not DOM

```html
<ng-template>
  <p>I am NOT visible</p>
</ng-template>
```

Nothing appears until something uses this template.

### How it gets used

1. Structural directives (`*ngIf`, `*ngFor` — syntactic sugar over `ng-template`)
2. `*ngTemplateOutlet` / `[ngTemplateOutlet]`
3. Programmatic: `ViewContainerRef.createEmbeddedView(templateRef)`

### Desugaring mental model

```html
<div *ngIf="ok">Hi</div>
```

Roughly becomes:

```html
<ng-template [ngIf]="ok">
  <div>Hi</div>
</ng-template>
```

Modern control flow (`@if`, `@for`) is different syntax but same idea: conditional/repeated views.

---

## 8. Template reference variable

```html
<ng-template #loading>
  <p>Loading…</p>
</ng-template>

<button (click)="show = !show">Toggle</button>

<ng-container *ngTemplateOutlet="show ? loading : null"></ng-container>
```

`#loading` is a `TemplateRef` you can pass around or query with `ViewChild`.

---

## 9. `ng-container` — invisible grouper

`ng-container` does **not** create a DOM element. Use it to:

- host structural directives without extra `<div>`
- host `ngTemplateOutlet`
- group elements for `@if` / `*ngIf` without breaking CSS (flex/grid child counts)

```html
<!-- BAD for flex: extra div may break layout -->
<div *ngIf=" Cond ">
  <span>A</span>
  <span>B</span>
</div>

<!-- GOOD -->
<ng-container *ngIf="cond">
  <span>A</span>
  <span>B</span>
</ng-container>
```

Interview line:

> `ng-container` is a logical container with zero DOM footprint.

---

## 10. `ngTemplateOutlet` — render a template here

```html
<ng-template #userTpl let-name="name" let-age="age">
  <p>{{ name }} ({{ age }})</p>
</ng-template>

<ng-container
  *ngTemplateOutlet="userTpl; context: { name: 'Amy', age: 30 }"
></ng-container>
```

Or attribute form:

```html
<ng-container
  [ngTemplateOutlet]="userTpl"
  [ngTemplateOutletContext]="{ name: 'Amy', age: 30 }"
></ng-container>
```

### Context rules

- `let-name="name"` reads `context.name`
- `let-name` (no `=`) reads `context.$implicit`

```html
<ng-template #itemTpl let-item>
  {{ item }}
</ng-template>

<ng-container
  *ngTemplateOutlet="itemTpl; context: { $implicit: 'Hello' }"
></ng-container>
```

---

## 11. Power pattern: configurable component with default + custom template

Child accepts an optional template input; falls back to default.

```ts
import { Component, Input, TemplateRef } from '@angular/core';
import { NgTemplateOutlet } from '@angular/common';

@Component({
  selector: 'app-list',
  standalone: true,
  imports: [NgTemplateOutlet],
  template: `
    @for (item of items; track item.id) {
      <ng-container
        *ngTemplateOutlet="itemTpl || defaultTpl; context: { $implicit: item }"
      />
    }

    <ng-template #defaultTpl let-item>
      <div>{{ item.name }}</div>
    </ng-template>
  `,
})
export class List {
  @Input() items: { id: number; name: string }[] = [];
  @Input() itemTpl?: TemplateRef<{ $implicit: { id: number; name: string } }>;
}
```

Parent customizes rendering:

```html
<app-list [items]="users" [itemTpl]="fancy">
</app-list>

<ng-template #fancy let-user>
  <strong>{{ user.name }}</strong>
</ng-template>
```

This is how many table/cell libraries work (Angular Material style thinking).

---

## 12. `ng-content` vs `ng-template` (interview comparison)

| | `ng-content` | `ng-template` + outlet |
|---|---|---|
| Who writes markup? | Parent, projected as-is | Parent defines template; child decides when/where/with what data |
| Data context | Parent’s component | Context object from child |
| Best for | Layout slots | Customizable lists/tables/cells |
| Child can inject row data? | No | Yes (`context`) |

Spoken:

> Use `ng-content` for structural slots. Use `ng-template` when the child must stamp custom UI with its own data.

---

# PART C — `ViewChild` / `ViewChildren`

## 13. What `ViewChild` does

Queries **one** thing from the component’s **own template** (view):

- DOM element (`ElementRef`)
- Child component instance
- Directive instance
- `TemplateRef`
- `ViewContainerRef` (with read option)

```html
<input #nameInput />
<app-child #childComp></app-child>
```

### Classic decorator API

```ts
import { AfterViewInit, Component, ElementRef, ViewChild } from '@angular/core';

@Component({
  selector: 'app-form',
  template: `<input #nameInput /><app-child #childComp />`,
})
export class FormCmp implements AfterViewInit {
  @ViewChild('nameInput') input!: ElementRef<HTMLInputElement>;
  @ViewChild('childComp') child!: ChildCmp;

  ngAfterViewInit() {
    this.input.nativeElement.focus();
    this.child.doSomething();
  }
}
```

### Modern signal API (preferred in new code)

```ts
import { Component, ElementRef, viewChild, afterNextRender } from '@angular/core';

@Component({
  template: `<input #nameInput />`,
})
export class FormCmp {
  input = viewChild<ElementRef<HTMLInputElement>>('nameInput');

  constructor() {
    afterNextRender(() => {
      this.input()?.nativeElement.focus();
    });
  }
}
```

`viewChild.required(...)` if it must exist.

---

## 14. Timing rules (very important)

| API | Available |
|---|---|
| `@ViewChild` / `viewChild()` | After view init (`ngAfterViewInit` / after render) |
| In `ngOnInit` / constructor | Often `undefined` / not ready |

Why your chat scroll used `setTimeout` / `afterNextRender`: the message must be in the DOM first.

```ts
@ViewChild('body') body?: ElementRef<HTMLDivElement>;

scroll() {
  // after DOM update
  queueMicrotask(() => {
    const el = this.body?.nativeElement;
    if (el) el.scrollTop = el.scrollHeight;
  });
}
```

---

## 15. `ViewChildren` — multiple matches

```html
<div #row *ngFor="let u of users">{{ u }}</div>
```

```ts
@ViewChildren('row') rows!: QueryList<ElementRef>;

ngAfterViewInit() {
  this.rows.changes.subscribe(() => {
    // list changed
  });
  console.log(this.rows.length);
}
```

Signal form: `viewChildren('row')`.

`QueryList` updates when the view changes; subscribe to `.changes` if needed.

---

## 16. `{ read: ... }` option

By default Angular guesses the token. Force what you want:

```ts
@ViewChild('host', { read: ViewContainerRef }) vcr!: ViewContainerRef;
@ViewChild('host', { read: ElementRef }) el!: ElementRef;
@ViewChild(ChildCmp) child!: ChildCmp; // by type
```

---

## 17. `static` option (older interviews)

```ts
@ViewChild('x', { static: true }) x!: ElementRef;
```

- `static: true` → resolved before change detection (available in `ngOnInit`) — only if always present (not inside `*ngIf`)
- `static: false` (default) → resolved after view init

In modern Angular, prefer signal queries + `afterNextRender`.

---

# PART D — `ContentChild` / `ContentChildren`

## 18. What they query

They query **projected content** (what parent put between the component tags), not the child’s own template.

```ts
@Component({
  selector: 'app-tabs',
  template: `
    <div class="headers">...</div>
    <ng-content></ng-content>
  `,
})
export class Tabs implements AfterContentInit {
  @ContentChildren(Tab) tabs!: QueryList<Tab>;

  ngAfterContentInit() {
    console.log('projected tabs', this.tabs.length);
  }
}
```

```html
<app-tabs>
  <app-tab title="One">...</app-tab>
  <app-tab title="Two">...</app-tab>
</app-tabs>
```

| Query | Looks in | Ready in |
|---|---|---|
| `ViewChild` | Own template | `ngAfterViewInit` |
| `ContentChild` | Projected content | `ngAfterContentInit` |

Signal forms: `contentChild()`, `contentChildren()`.

---

## 19. View vs Content — exam trap

```ts
@Component({
  selector: 'app-panel',
  template: `
    <h3 #viewTitle>I am VIEW</h3>
    <ng-content></ng-content>
  `,
})
export class Panel implements AfterContentInit, AfterViewInit {
  @ViewChild('viewTitle') viewTitle!: ElementRef;
  @ContentChild('projTitle') projTitle?: ElementRef;

  ngAfterContentInit() {
    console.log('content', this.projTitle?.nativeElement);
  }

  ngAfterViewInit() {
    console.log('view', this.viewTitle.nativeElement);
  }
}
```

```html
<app-panel>
  <h3 #projTitle>I am CONTENT</h3>
</app-panel>
```

- `#viewTitle` → ViewChild  
- `#projTitle` → ContentChild  

If you use `@ViewChild('projTitle')` it will be **undefined**.

---

# PART E — `TemplateRef` & `ViewContainerRef` (deeper)

## 20. `TemplateRef`

Represents an `ng-template`. You can create embedded views from it.

```ts
@ViewChild('tpl') tpl!: TemplateRef<unknown>;
@ViewChild('host', { read: ViewContainerRef }) host!: ViewContainerRef;

show() {
  this.host.clear();
  this.host.createEmbeddedView(this.tpl, { $implicit: 'Hi' });
}
```

## 21. `ViewContainerRef`

A place where Angular can attach views (embedded templates or dynamic components).

Common uses:

- structural directives under the hood
- dynamic component loading (`createComponent`)
- manually stamping templates

Interview line:

> `TemplateRef` is the blueprint; `ViewContainerRef` is the place you stamp it.

### Custom structural directive (mini `*ngFor`)

Live practice: `prevonir-interview-practice` **`/q13`** (`*appFor`).

```ts
@Directive({ selector: '[appFor]' })
export class AppForDirective<T> {
  readonly appForOf = input<T[] | null>(null); // *appFor="let x of list"
  private tpl = inject(TemplateRef<{ $implicit: T; index: number }>);
  private vcr = inject(ViewContainerRef);

  constructor() {
    effect(() => {
      const items = this.appForOf() ?? [];
      this.vcr.clear();
      items.forEach((item, index) =>
        this.vcr.createEmbeddedView(this.tpl, { $implicit: item, index }),
      );
    });
  }
}
```

```html
<li *appFor="let city of cities; let i = index">{{ i }} — {{ city }}</li>
```

**Microsyntax:** `of` → input suffix `Of` → `[appForOf]`. Context keys (`$implicit`, `index`) become `let city` / `let i = index`.

**Say:** Attribute directives decorate a host; structural directives stamp/clear embedded views. Real `*ngFor` / `@for` also diff + `track`; interviews often want the clear + `createEmbeddedView` version.

---

# PART F — Putting it all together

## 22. Decision tree

```text
Need parent to drop arbitrary markup into a child layout?
  → ng-content (+ select for multiple slots)

Need child to render custom UI using child's data (row/item)?
  → ng-template + ngTemplateOutlet (pass TemplateRef @Input)

Need invisible wrapper for *ngIf / outlet without extra DOM?
  → ng-container

Need access to something in MY template?
  → ViewChild / viewChild()

Need access to something PARENT projected into me?
  → ContentChild / contentChild()

Need after DOM paint?
  → ngAfterViewInit / afterNextRender
```

---

## 23. Mini real examples

### A) Modal shell (`ng-content`)

```html
<!-- modal.component.html -->
<div class="overlay">
  <div class="modal">
    <ng-content select="[modal-title]"></ng-content>
    <ng-content></ng-content>
  </div>
</div>
```

### B) Chat empty state template

```html
<ng-template #empty>
  <p>No messages yet</p>
</ng-template>

@if (messages.length === 0) {
  <ng-container *ngTemplateOutlet="empty" />
} @else {
  @for (m of messages; track m.id) {
    <div>{{ m.text }}</div>
  }
}
```

### C) Focus input (`ViewChild`) — same idea as your chatbot scroll host

```ts
inputEl = viewChild<ElementRef<HTMLInputElement>>('input');

focusInput() {
  this.inputEl()?.nativeElement.focus();
}
```

```html
<input #input />
```

---

## 24. Common mistakes

1. Expecting `ng-template` to show without outlet / structural directive  
2. Using `ViewChild` for projected nodes (need `ContentChild`)  
3. Reading `ViewChild` in `ngOnInit` → undefined  
4. Assuming projected content can use **child** component fields  
5. Wrapping flex children in extra `div` instead of `ng-container`  
6. Forgetting to import `NgTemplateOutlet` in standalone components  
7. Overusing `ViewChild` to call child methods when `@Output` / inputs would be cleaner

---

## 25. Interview Q&A pack

### Q: Difference between `ng-content` and `ng-template`?

A: `ng-content` projects parent markup into child slots. `ng-template` defines a non-rendered template blueprint that must be instantiated later with outlet/structural directive/API.

### Q: Does `ng-content` create a DOM node?

A: No meaningful host node — projected nodes appear at the slot location.

### Q: What is `ng-container`?

A: A grouping element that doesn’t appear in the DOM; used for structural directives and template outlets.

### Q: ViewChild vs ContentChild?

A: ViewChild → own template. ContentChild → projected content. Different lifecycle readiness (`AfterViewInit` vs `AfterContentInit`).

### Q: How do you pass data into a custom template?

A: Use `ngTemplateOutlet` with a `context` object (`$implicit` / named fields).

### Q: When is ViewChild available?

A: After the view is initialized; use `ngAfterViewInit` or `afterNextRender` / signal query after render.

### Q: Can projected content call child methods via interpolation?

A: Bindings run in parent context. To customize with child data, pass a template into the child.

### Q: `select` on `ng-content`?

A: Multi-slot projection — routes matching elements/attributes into specific slots.

---

## 26. Spoken 40-second “combo” answer

> Angular gives two composition tools. `ng-content` projects parent markup into child slots — great for cards/modals with header/body/footer via `select`. `ng-template` is a blueprint that doesn’t render until used with `ngTemplateOutlet` or structural directives, and it can receive a context so children can stamp custom UI with their data. `ng-container` groups without extra DOM. For queries: `ViewChild` reads the component’s own view; `ContentChild` reads projected content. I access view queries after view init, and I prefer `viewChild()` + `afterNextRender` for DOM work like focus or scroll.

---

## 27. Practice checklist

- [ ] Build a card with single `ng-content`
- [ ] Build a dialog with 3 slots (`select`)
- [ ] Explain parent vs child binding context
- [ ] Render an `ng-template` via `ngTemplateOutlet` with context
- [ ] Explain why `ng-template` alone shows nothing
- [ ] Use `viewChild` to focus an input
- [ ] Use `ContentChildren` to count projected tabs
- [ ] Say View vs Content + lifecycle hooks from memory

---

## 28. CDK Portal vs `ng-content` / `ViewContainerRef` (Persistent follow-up)

Interview prompt:

> Difference between ContentChild, ViewChild, content projection, `ng-content`, and Portal?

### Short map

| Concept | What it does |
|---|---|
| **`ng-content`** | Projects **parent’s DOM** into child slots (composition) |
| **Content projection** | The pattern; `ng-content` is the mechanism |
| **`ViewChild`** | Query something in **this** component’s template |
| **`ContentChild`** | Query something in **projected** content |
| **CDK Portal** | Imperative API to render a template/component **into an outlet** (often overlays/modals) |

### Portal in one breath

> A **Portal** is portable UI: `TemplatePortal` or `ComponentPortal` attached to a `CdkPortalOutlet` (or overlay). Unlike `ng-content`, the parent doesn’t declare the slot in the child’s template at compile time — you **attach/detach** programmatically. Great for modals, toasts, tooltips via Overlay.

```ts
// conceptual
const portal = new ComponentPortal(DialogComponent);
overlayRef.attach(portal);
```

vs `ng-content`:

```html
<!-- declarative projection -->
<app-card><h2 header>Title</h2></app-card>
```

vs `ViewContainerRef.createComponent`:

> Same family (dynamic render). Portal + Overlay is the CDK-packaged pattern for floating UI; VCR is the lower-level primitive.

### Spoken combo (add Portal)

> `ng-content` is declarative projection. ViewChild/ContentChild are queries into view vs projected content. Portal is CDK’s way to teleport a template or component into an outlet — typically overlays — attach/detach instead of projecting through the child’s template.

---

## Quick cheat sheet

```text
ng-content      → project parent HTML into child
ng-template     → template blueprint (hidden until used)
ng-container    → no DOM wrapper
ngTemplateOutlet→ stamp template + context
ViewChild       → query my template
ContentChild    → query projected content
CDK Portal      → attach template/component to outlet (overlays)
```