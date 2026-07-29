import { Component, input } from '@angular/core';

export type BtnVariant = 'primary' | 'secondary' | 'danger';
export type BtnSize = 'sm' | 'md' | 'lg';

/** Reusable Button — variants + sizes (Angular version of MUI-like Button) */
@Component({
  selector: 'ui-button',
  templateUrl: './ui-button.html',
  styleUrl: './ui-button.css',
})
export class UiButton {
  variant = input<BtnVariant>('primary');
  size = input<BtnSize>('md');
  disabled = input(false);
}
