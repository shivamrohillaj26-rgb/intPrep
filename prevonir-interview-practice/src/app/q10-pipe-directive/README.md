# Q10 — Custom pipe & directive (interview minimal)

Practice rewriting from memory in ~10 minutes. Open `/q10`.

## Pipe with args

```ts
@Pipe({ name: 'truncate' })
export class TruncatePipe implements PipeTransform {
  transform(value: string, limit = 20, suffix = '…'): string {
    if (!value || value.length <= limit) return value ?? '';
    return value.slice(0, limit) + suffix;
  }
}
```

Template: `{{ sample | truncate:18:'…' }}`

## Directive with args

```ts
@Directive({ selector: '[appHighlight]' })
export class HighlightDirective {
  appHighlight = input('yellow'); // [appHighlight]="'gold'"
  textColor = input('');          // [textColor]="'#111'"

  @HostBinding('style.backgroundColor') get bg() { return this.appHighlight(); }
  @HostBinding('style.color') get color() { return this.textColor() || null; }
}
```

## Spoken (30s)

> A **pipe** transforms values in the template — arguments come after colons. Keep it pure so Angular can skip re-runs when inputs don’t change. A **directive** attaches behavior to an existing element and takes configuration via inputs; I often use `HostBinding` for styles. Pipes transform data; directives change DOM/behavior; components own a template.
