import { Component, inject } from '@angular/core';
import { RouterLink } from '@angular/router';
import { API_URL, Analytics, ConsoleLogger, Logger, OldLogger, analyticsFactory } from './di-recipes';
import { BootStamp, FORGOTTEN, LoginService, PageNotepad, ScratchPad, VisitPad } from './di-scope';

@Component({
  selector: 'app-desk-a',
  providers: [ScratchPad],
  template: `
    <article class="desk">
      <h3>Desk A</h3>
      <p class="id">Scratch pad <strong>#{{ pad.instance }}</strong></p>
      <button type="button" (click)="pad.add('pen')">Add pen</button>
      <p>On this desk: {{ pad.items.join(', ') || '(empty)' }}</p>
    </article>
  `,
})
export class DeskA {
  readonly pad = inject(ScratchPad);
}

@Component({
  selector: 'app-desk-b',
  providers: [ScratchPad],
  template: `
    <article class="desk">
      <h3>Desk B</h3>
      <p class="id">Scratch pad <strong>#{{ pad.instance }}</strong></p>
      <button type="button" (click)="pad.add('stapler')">Add stapler</button>
      <p>On this desk: {{ pad.items.join(', ') || '(empty)' }}</p>
    </article>
  `,
})
export class DeskB {
  readonly pad = inject(ScratchPad);
}

@Component({
  selector: 'app-di-providers-demo',
  imports: [RouterLink, DeskA, DeskB],
  providers: [
    VisitPad,
    { provide: API_URL, useValue: 'https://api-dev.example.com' },
    { provide: Logger, useClass: ConsoleLogger },
    { provide: Analytics, useFactory: analyticsFactory },
    { provide: OldLogger, useExisting: Logger },
    { provide: FORGOTTEN, useValue: 'FORGOTTEN' },
  ],
  templateUrl: './di-providers-demo.html',
  styleUrl: './di-providers-demo.css',
})
export class DiProvidersDemo {
  readonly login = inject(LoginService);
  readonly boot = inject(BootStamp);
  readonly notepad = inject(PageNotepad);
  readonly visit = inject(VisitPad);
  readonly forgotten = inject(FORGOTTEN);
  readonly apiUrl = inject(API_URL);
  readonly logger = inject(Logger);
  readonly oldLogger = inject(OldLogger);
  readonly analytics = inject(Analytics);

  readonly sameLogger = this.logger === this.oldLogger;
}
