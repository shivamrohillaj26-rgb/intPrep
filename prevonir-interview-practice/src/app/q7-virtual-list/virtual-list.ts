import { Component, computed, signal } from '@angular/core';

/**
 * Minimal windowing / virtualization (interview DIY).
 * Only render visible rows + small overscan — not full 10k DOM nodes.
 *
 * Speak: CDK virtual-scroll is production choice; this shows the math.
 */
@Component({
  selector: 'app-virtual-list',
  templateUrl: './virtual-list.html',
  styleUrl: './virtual-list.css',
})
export class VirtualList {
  readonly itemHeight = 36;
  readonly viewportHeight = 360;
  readonly overscan = 5;

  // pretend API returned 10_000 rows
  readonly allItems = Array.from({ length: 10_000 }, (_, i) => `Row #${i + 1}`);

  scrollTop = signal(0);

  totalHeight = this.allItems.length * this.itemHeight;

  startIndex = computed(() =>
    Math.max(0, Math.floor(this.scrollTop() / this.itemHeight) - this.overscan),
  );

  visibleCount = Math.ceil(this.viewportHeight / this.itemHeight) + this.overscan * 2;

  endIndex = computed(() =>
    Math.min(this.allItems.length, this.startIndex() + this.visibleCount),
  );

  visibleItems = computed(() =>
    this.allItems.slice(this.startIndex(), this.endIndex()).map((label, i) => ({
      label,
      index: this.startIndex() + i,
      top: (this.startIndex() + i) * this.itemHeight,
    })),
  );

  onScroll(event: Event) {
    const el = event.target as HTMLElement;
    this.scrollTop.set(el.scrollTop);
  }
}
