# Q13 — Custom structural directive (`*appFor` ≈ ngFor)

Practice rewrite in **~15 minutes**. Open `/q13`.

## Skeleton

```ts
@Directive({ selector: '[appFor]' })
export class AppForDirective<T> {
  // *appFor="let x of list"  →  [appForOf]="list"
  readonly appForOf = input<T[] | null>(null);

  private readonly tpl = inject(TemplateRef<AppForContext<T>>);
  private readonly vcr = inject(ViewContainerRef);

  constructor() {
    effect(() => {
      const items = this.appForOf() ?? [];
      this.vcr.clear();
      items.forEach((item, index) => {
        this.vcr.createEmbeddedView(this.tpl, { $implicit: item, index });
      });
    });
  }
}
```

Template:

```html
<li *appFor="let city of cities(); let i = index">
  {{ i }} — {{ city }}
</li>
```

## Microsyntax map

| You write | Angular binds |
|---|---|
| `*appFor="let x of list"` | `[appForOf]="list"` + `let-x` |
| `let i = index` | `let-i="index"` on context |

Context keys you pass to `createEmbeddedView` become microsyntax names (`index`, `$implicit` → `let x`).

## Spoken (45s)

> A structural directive doesn’t style a host — it decides what views exist. Angular injects `TemplateRef` (the `ng-template` body) and `ViewContainerRef` (the insert point). The `*` prefix is sugar: `*appFor="let item of items"` becomes `[appForOf]="items"` on an `ng-template`. I clear the container and create an embedded view per item with `$implicit` and `index`. Real ngFor also diffs with trackBy; for interviews this clear-and-stamp version shows I understand the API.

## vs Q10 attribute directive

| | Attribute (highlight) | Structural (`*appFor`) |
|---|---|---|
| Host | Keeps the element | Replaces host with template views |
| APIs | `HostBinding`, inputs | `TemplateRef`, `ViewContainerRef` |
| Sugar | none required | `*` microsyntax |

Theory: `angular-interview-prep/ANGULAR_CONTENT_TEMPLATES_QUERIES.md` (TemplateRef / ViewContainerRef).
