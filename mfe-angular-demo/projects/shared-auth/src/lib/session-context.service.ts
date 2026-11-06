import { Injectable, signal } from '@angular/core';
import { getSharedSession } from './auth.store';
import { emitSessionChanged, onSessionChanged } from './session-bus';

/**
 * Cross-MFE UI context (not auth).
 * Shell sets region → Safety + Fleet remotes read the same value.
 */
@Injectable({ providedIn: 'root' })
export class SessionContextService {
  private readonly session = getSharedSession();
  private readonly regionSignal = signal(this.session.selectedRegion);

  readonly selectedRegion = this.regionSignal.asReadonly();

  constructor() {
    onSessionChanged(() => this.hydrateFromSharedStore());
  }

  setRegion(region: string): void {
    this.session.selectedRegion = region;
    this.regionSignal.set(region);
    emitSessionChanged();
  }

  hydrateFromSharedStore(): void {
    this.regionSignal.set(this.session.selectedRegion);
  }
}
