import { Injectable, InjectionToken } from '@angular/core';

let loginSeq = 0;
let padSeq = 0;
let notepadSeq = 0;
let visitSeq = 0;
let bootSeq = 0;

/** STEP 1 — whole app. Do not put this on a component. */
@Injectable({ providedIn: 'root' })
export class LoginService {
  readonly instance = ++loginSeq;
  readonly name = 'Alex';
}

/** STEP 2 — only exists if the desk lists providers: [ScratchPad]. */
@Injectable()
export class ScratchPad {
  readonly instance = ++padSeq;
  items: string[] = [];

  add(item: string): void {
    this.items = [...this.items, item];
  }
}

/**
 * STEP 3A — route.providers on /q14.
 * Angular caches this injector on the Route object. Home → /q14 keeps the same instance.
 * Home cannot inject it (not in Home’s injector chain).
 */
@Injectable()
export class PageNotepad {
  readonly instance = ++notepadSeq;
  ticks = 0;

  tick(): void {
    this.ticks += 1;
  }
}

/** STEP 3B — listed on DiProvidersDemo.providers. Destroyed with the page. */
@Injectable()
export class VisitPad {
  readonly instance = ++visitSeq;
  ticks = 0;

  tick(): void {
    this.ticks += 1;
  }
}

/** STEP 4 — listed in app.config.ts. Same root injector as login, but always bundled. */
@Injectable()
export class BootStamp {
  readonly instance = ++bootSeq;
}

/** STEP 5 — never provided anywhere. */
export const FORGOTTEN = new InjectionToken<string>('FORGOTTEN');
