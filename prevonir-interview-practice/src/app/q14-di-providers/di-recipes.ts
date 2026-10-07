import { InjectionToken, inject } from '@angular/core';

export const API_URL = new InjectionToken<string>('API_URL');

export abstract class Logger {
  abstract kind: string;
}

export class ConsoleLogger extends Logger {
  readonly kind = 'ConsoleLogger';
}

export abstract class OldLogger {
  abstract kind: string;
}

export class Analytics {
  readonly mode: string;
  constructor(url: string) {
    this.mode = url.includes('prod') ? 'prod' : 'dev';
  }
}

export function analyticsFactory(): Analytics {
  return new Analytics(inject(API_URL));
}
