import { Component, signal } from '@angular/core';
import { FormsModule } from '@angular/forms';
import { RouterLink } from '@angular/router';
import { TruncatePipe } from './truncate.pipe';
import { HighlightDirective } from './highlight.directive';

@Component({
  selector: 'app-pipe-directive-demo',
  imports: [FormsModule, RouterLink, TruncatePipe, HighlightDirective],
  templateUrl: './pipe-directive-demo.html',
  styleUrl: './pipe-directive-demo.css',
})
export class PipeDirectiveDemo {
  readonly sample =
    'Provenir decisioning dashboard for enterprise risk workflows';

  readonly bg = signal('gold');
  readonly fg = signal('#111');
}
