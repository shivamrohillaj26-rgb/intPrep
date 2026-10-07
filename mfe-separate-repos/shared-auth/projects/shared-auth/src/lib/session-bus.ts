/** Tiny cross-bundle bus so duplicate service instances stay in sync. */
export const MFE_SESSION_EVENT = 'mfe-demo-session-changed';

export function emitSessionChanged(): void {
  if (typeof window !== 'undefined') {
    window.dispatchEvent(new CustomEvent(MFE_SESSION_EVENT));
  }
}

export function onSessionChanged(handler: () => void): () => void {
  if (typeof window === 'undefined') {
    return () => undefined;
  }
  const listener = () => handler();
  window.addEventListener(MFE_SESSION_EVENT, listener);
  return () => window.removeEventListener(MFE_SESSION_EVENT, listener);
}
