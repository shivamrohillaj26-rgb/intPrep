import {
  Directive,
  TemplateRef,
  ViewContainerRef,
  effect,
  inject,
  input,
} from '@angular/core';

/** Context stamped into each embedded view (like ngFor). */
export interface AppForContext<T> {
  $implicit: T;
  index: number;
}

/**
 * Tiny ngFor clone for interviews.
 *
 * Usage:
 *   <li *appFor="let city of cities; let i = index">{{ i }} — {{ city }}</li>
 *
 * Microsyntax desugars to:
 *   <ng-template [appForOf]="cities" let-city let-i="index">…</ng-template>
 */
@Directive({
  selector: '[appFor]',
})
export class AppForDirective<T> {
  /** Bound by `of` in `*appFor="let x of list"` → `[appForOf]="list"` */
  readonly appForOf = input<T[] | null | undefined>(null);

  private readonly tpl = inject(TemplateRef<AppForContext<T>>);
  private readonly vcr = inject(ViewContainerRef);

  constructor() {
    effect(() => {
      const items = this.appForOf() ?? [];
      this.vcr.clear();
      for (let index = 0; index < items.length; index++) {
        this.vcr.createEmbeddedView(this.tpl, {
          $implicit: items[index] as T,
          index,
        });
      }
    });
  }

  /** Enables template type-checking for `$implicit` / `index`. */
  static ngTemplateContextGuard<T>(
    _dir: AppForDirective<T>,
    _ctx: unknown,
  ): _ctx is AppForContext<T> {
    return true;
  }
}
