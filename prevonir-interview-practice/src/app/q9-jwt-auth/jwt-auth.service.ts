import { Injectable, computed, signal } from '@angular/core';
import { AuthUser, JwtPayload, Role } from './models';

const TOKEN_KEY = 'q9_jwt';

/** Fake users — interview demo (no real backend) */
const USERS: Record<string, { password: string; roles: Role[] }> = {
  john: { password: 'John@123', roles: ['user'] },
  admin: { password: 'Admin@123', roles: ['admin', 'user'] },
};

/**
 * JWT + RBAC auth service (interview-ready, mock token).
 * Real apps: login API returns JWT; verify signature on server.
 * Here we encode payload with btoa for demo only.
 */
@Injectable({ providedIn: 'root' })
export class JwtAuthService {
  private token = signal<string | null>(this.readStored());

  /** derived user from token payload */
  user = computed<AuthUser | null>(() => {
    const payload = this.decode(this.token());
    if (!payload || this.isExpired(payload)) return null;
    return { username: payload.sub, roles: payload.roles };
  });

  isLoggedIn = computed(() => this.user() !== null);

  login(username: string, password: string): boolean {
    const found = USERS[username];
    if (!found || found.password !== password) return false;

    const payload: JwtPayload = {
      sub: username,
      roles: found.roles,
      exp: Math.floor(Date.now() / 1000) + 60 * 60, // 1 hour
    };
    const jwt = this.encode(payload);
    this.token.set(jwt);
    localStorage.setItem(TOKEN_KEY, jwt);
    return true;
  }

  logout(): void {
    this.token.set(null);
    localStorage.removeItem(TOKEN_KEY);
  }

  getToken(): string | null {
    return this.token();
  }

  hasRole(role: Role): boolean {
    return this.user()?.roles.includes(role) ?? false;
  }

  hasAnyRole(roles: Role[]): boolean {
    const u = this.user();
    if (!u) return false;
    return roles.some((r) => u.roles.includes(r));
  }

  private readStored(): string | null {
    const t = localStorage.getItem(TOKEN_KEY);
    const payload = this.decode(t);
    if (!payload || this.isExpired(payload)) {
      localStorage.removeItem(TOKEN_KEY);
      return null;
    }
    return t;
  }

  /** demo JWT: header.payload.signature (signature is fake) */
  private encode(payload: JwtPayload): string {
    const header = btoa(JSON.stringify({ alg: 'none', typ: 'JWT' }));
    const body = btoa(JSON.stringify(payload));
    return `${header}.${body}.demo-signature`;
  }

  private decode(token: string | null): JwtPayload | null {
    if (!token) return null;
    try {
      const part = token.split('.')[1];
      return JSON.parse(atob(part)) as JwtPayload;
    } catch {
      return null;
    }
  }

  private isExpired(payload: JwtPayload): boolean {
    return payload.exp * 1000 < Date.now();
  }
}
