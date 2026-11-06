import { AuthUser } from './auth.models';

/**
 * One shared in-memory store for the whole browser tab.
 *
 * Why globalThis?
 * Module Federation should share `shared-auth` as a singleton package so
 * Angular DI gives one AuthService. During local demos, path/bundling quirks
 * can still create two service classes — pinning state here guarantees
 * shell + remotes always see the same login / tenant / filter.
 *
 * Interview line: "We share framework packages as singletons; business
 * context lives in a shared auth/session library the host owns."
 */
export interface SharedSessionState {
  user: AuthUser | null;
  token: string | null;
  /** Demo cross-MFE data: filter remotes can read */
  selectedRegion: string;
}

declare global {
  // eslint-disable-next-line no-var
  var __MFE_DEMO_SESSION__: SharedSessionState | undefined;
}

export function getSharedSession(): SharedSessionState {
  if (!globalThis.__MFE_DEMO_SESSION__) {
    globalThis.__MFE_DEMO_SESSION__ = {
      user: null,
      token: null,
      selectedRegion: 'all',
    };
  }
  return globalThis.__MFE_DEMO_SESSION__;
}
