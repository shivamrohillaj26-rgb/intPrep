import { Injectable, computed, signal } from '@angular/core';
import { AuthUser, UserRole } from './auth.models';
import { getSharedSession } from './auth.store';
import { emitSessionChanged, onSessionChanged } from './session-bus';

/** Fake users — same idea as demo login before real OAuth. */
const USERS: Record<string, { password: string; user: AuthUser }> = {
  admin: {
    password: 'admin',
    user: {
      id: 'u-1',
      name: 'Alex Admin',
      email: 'admin@demo.local',
      role: 'admin',
      tenantId: 'tenant-acme',
    },
  },
  viewer: {
    password: 'viewer',
    user: {
      id: 'u-2',
      name: 'Sam Viewer',
      email: 'viewer@demo.local',
      role: 'viewer',
      tenantId: 'tenant-acme',
    },
  },
};

@Injectable({ providedIn: 'root' })
export class AuthService {
  private readonly session = getSharedSession();
  private readonly userSignal = signal<AuthUser | null>(this.session.user);
  private readonly tokenSignal = signal<string | null>(this.session.token);

  readonly user = this.userSignal.asReadonly();
  readonly token = this.tokenSignal.asReadonly();
  readonly isLoggedIn = computed(() => !!this.tokenSignal());
  readonly role = computed<UserRole | null>(() => this.userSignal()?.role ?? null);

  constructor() {
    onSessionChanged(() => this.hydrateFromSharedStore());
  }

  login(username: string, password: string): { ok: true } | { ok: false; error: string } {
    const entry = USERS[username.trim().toLowerCase()];
    if (!entry || entry.password !== password) {
      return { ok: false, error: 'Invalid credentials. Try admin/admin or viewer/viewer.' };
    }

    const token = `demo-jwt.${entry.user.id}.${Date.now()}`;
    this.session.user = entry.user;
    this.session.token = token;
    this.userSignal.set(entry.user);
    this.tokenSignal.set(token);
    emitSessionChanged();
    return { ok: true };
  }

  logout(): void {
    this.session.user = null;
    this.session.token = null;
    this.userSignal.set(null);
    this.tokenSignal.set(null);
    emitSessionChanged();
  }

  /** Remotes call this on bootstrap so signals pick up host login. */
  hydrateFromSharedStore(): void {
    this.userSignal.set(this.session.user);
    this.tokenSignal.set(this.session.token);
  }

  hasRole(role: UserRole): boolean {
    return this.userSignal()?.role === role;
  }
}
