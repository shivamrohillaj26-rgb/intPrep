import { Directive, HostBinding, input } from '@angular/core';

/**
 * Interview attribute directive with arguments.
 * Usage: <p [appHighlight]="'gold'" [textColor]="'#111'">…</p>
 */
@Directive({
  selector: '[appHighlight]',
})
export class HighlightDirective {
  /** Background color — [appHighlight]="'gold'" */
  readonly appHighlight = input('yellow');

  /** Optional text color — [textColor]="'#111'" */
  readonly textColor = input('');

  @HostBinding('style.backgroundColor')
  get bg(): string {
    return this.appHighlight();
  }

  @HostBinding('style.color')
  get color(): string | null {
    return this.textColor() || null;
  }

  @HostBinding('style.padding')
  get pad(): string {
    return '2px 6px';
  }
}
