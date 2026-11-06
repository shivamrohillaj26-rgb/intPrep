# OneTrust — iframe leftover `/app`: how auth is shared (snapshots)

**If she asks:** “How do you show legacy pages in an iframe and share login?”  
This file. Long catalog: [18 IframeBridge](./ONETRUST_IFRAME_BRIDGE.md). Not MFE: [24](./ONETRUST_MFE_AUTH.md).

**Say:** NUX shell + leftover Angular `/app`. **Do not say** laptop folder names.

---

## 0. How to present (~45s)

> NUX is the **shell**. Pages we have not nativized yet still live in the **older `/app` Angular app**. We embed that in an **iframe** so the user keeps one chrome — nav, tenant, language.  
>  
> Parent and iframe are **same origin** (`idms-qa3.netradyne.com` — `/app` vs `/dashboard` after path swap). Login happens **once in NUX**. We write **bare** `localStorage` keys `token` and `session` — **not** `qa3::token` — so the iframe’s interceptor reads the **same** keys and sends `Authorization` + `session-key`. We **do not** `postMessage` the JWT.  
>  
> Before `iframe.src` we stamp a legacy **`IDMS` blob** (tenant, language, cached session payload) so `/app` does not boot on tenant 0. After load, the child **asks** the parent over **origin-locked `postMessage`**: `getSessionData`, hierarchy, groups. That is **product context**, not credentials.  
>  
> This is a **strangler iframe**, not Module Federation. Remotes will `inject` kernel auth. Iframe goes away when that page is nativized.

---

## 1. Picture (two channels)

```text
  idms-qa3.netradyne.com
  ┌─ NUX shell ─────────────────────────────────────────┐
  │  login already done                                  │
  │  localStorage['token']     }  BARE keys              │
  │  localStorage['session']   }  same origin = shared   │
  │  localStorage['IDMS']        tenant + UserService    │
  │                                                      │
  │  ┌─ iframe  /app/#/… leftover page ───────────────┐ │
  │  │  own Angular, own interceptor                   │ │
  │  │  reads token/session → Bearer + session-key     │ │
  │  │  postMessage getSessionData → parent setSession │ │
  │  └─────────────────────────────────────────────────┘ │
  └──────────────────────────────────────────────────────┘
```

| Channel | Carries | Not |
|---|---|---|
| **Same-origin `localStorage`** | OAuth `token`, `session`, some tenant keys, `IDMS` blob | JWT in `postMessage` |
| **`postMessage` (origin-locked)** | Session **payload**, hierarchy, groups, nav, locale, expiry | Password / access token |

**Same origin is the whole trick.** Cross-origin iframe would force token-in-postMessage. We refuse that.

---

## 1b. What is `postMessage`? What are the **actions**?

`window.postMessage` is a **browser API**. An iframe is a **second document**. It cannot call NUX services, and NUX cannot call `/app` services. They talk by sending a **JSON envelope** to the other window.

```javascript
// child → parent
window.parent.postMessage(
  { action: 'getSessionData' },
  window.location.origin        // NOT '*'
);

// parent listens
window.addEventListener('message', (event) => {
  if (event.origin !== window.location.origin) return;   // ignore evil.com
  switch (event.data.action) { /* … */ }
});

// parent → child
iframe.contentWindow.postMessage(
  { action: 'setSessionData', data: payload },
  window.location.origin
);
```

**`action` is just a string we invented.** It is not HTTP POST. It is “which handler should run.”  
**`data` is the payload** for that action.

Pattern: child **getX** → parent **setX**. Map in `/app` `IdmsAdapterService.RequestToActionMap`.

### Data asks (child asks, parent answers from **already loaded** NUX cache)

| Child sends `action` | Parent replies `action` | What `data` is |
|---|---|---|
| `getSessionData` | `setSessionData` | User/session **object** `/app` services expect — **not** the JWT |
| `getHierarchyData` | `setHierarchyData` | Hierarchy |
| `getTenantGroups` | `setTenantGroups` | Groups |
| `getTenantSettings` | `setTenantSettings` | Tenant settings |
| `getManagedTenants` | `setManagedTenants` | Managed fleets |
| `getQueryParams` | `getQueryParams` | Query map (same name both ways — quirk) |
| `getGZVersion` | `setGZVersion` | `'V3'` |

### Chrome / stay-in-sync (not login)

| `action` | Who → whom | Meaning |
|---|---|---|
| `nuxBridgeReady` | child → parent | Iframe can speak v2 context |
| `nuxContextInit` / `nuxContextUpdate` | parent → child | Tenant, locale, theme — avoid full reload |
| `nuxContextApplied` | child → parent | Ack |
| `navigate` | parent → child | Same-feature tab: move `/app` router, don’t reset `src` |
| `idmsNavigate` | child → parent | Child URL changed; parent updates address bar |
| `modalOpenedInNUX` / `modalClosedInNUX` | child → parent | Shell paints a scrim over the NUX header |
| `nuxSessionExpired` | child → parent | **Whole NUX** logs out — not a login form inside the iframe |
| `internalClick` | child → parent | Clicks don’t bubble out of iframe; close NUX menus |
| `nuxBookmarksUpdated` | both | Favorites |

**Spoken ~20s:** “postMessage is the browser’s way for parent and iframe to talk. We send `{ action, data }` and lock the origin. getSessionData is the child asking for the user blob we already have. The access token is not in that message — it’s in localStorage because we’re same origin.”

Full list: file **18** §5.

---

## 2. Snapshot — NUX writes **bare** `token` / `session`

`AuthStorageService` — most keys get `qa3::` prefix. **Auth keys must not**, or `/app` would not see them.

```typescript
// These keys are shared with legacy /app and /console — must stay bare
const SHARED_KEYS = new Set([
  'token',
  'session',
  'selectedTenantID',
  'selectedTenantContext',
  // …
]);

const TOKEN_STORAGE_KEY = 'token';
const SESSION_STORAGE_KEY = 'session';

setToken(token: IToken): void {
  this.setJson(TOKEN_STORAGE_KEY, token);   // localStorage['token']
}

private prefixed(key: string): string {
  if (SHARED_KEYS.has(key)) return key;     // skip qa3::
  return `${this.keyPrefix}${key}`;
}
```

NUX dashboard tenant pick uses a **prefixed** `dashboardSelectedTenantId` so the iframe cannot clobber it (IDMS-51288). Shared bare tenant keys still exist **for `/app`**.

---

## 3. Snapshot — `/app` reads the same keys and sets headers

Leftover app `AuthenticationService` (different Angular app, **same origin**):

```typescript
get token() {
  return this.localStorage.get('token') as IToken;   // same key NUX wrote
}

get authHeaders(): AuthHeaders {
  const headers: AuthHeaders = {
    Authorization: this.accessToken,          // 'bearer ' + access_token
  };
  if (this.session) {
    headers['session-key'] = this.session.session_id;
  }
  return headers;
}
```

No second login. Child interceptor just looks like the parent’s.

---

## 4. Snapshot — shell puts the page in the iframe

`nux-app-frame-adapter` — allowlisted routes only (`APP_FRAME_ROUTES`).

```html
<iframe
  #appIframe
  [src]="iframeSrc()"
  (load)="onIframeLoad()"
  allow="fullscreen"
  title="Application content"
></iframe>
```

**Order matters:** stamp storage **first**, then set `src`.

```typescript
private async prepareIframe(nextRoute: string, …): Promise<void> {
  await this.bridge.syncLegacyLocalStorage();   // IDMS blob + tenant
  this.iframeSrc.set(
    this.sanitizer.bypassSecurityTrustResourceUrl(
      this.bridge.buildIframeUrl(nextRoute),
    ),
  );
}

buildIframeUrl(appRoute: string): string {
  // Dev: NUX at /dashboard, leftover at /app
  // Prod swap: NUX at /app, leftover at /dashboard
  const embeddedBasePath = pathname.startsWith('/dashboard') ? '/app' : '/dashboard';
  return `${embeddedBasePath}/#${normalizeAppFrameRoute(appRoute)}`;
}
```

Hash route → iframe document is still **`https://idms-….netradyne.com`**. Same origin. Same `localStorage`.

On `load`: `registerIframe(contentWindow)` then `nuxContextInit`. Same feature, query change → `postMessage navigate`, **not** a full `src` reload.

---

## 5. Snapshot — warm the **`IDMS` blob** before boot

`/app` historically expected `localStorage.IDMS` (`TenantsService.selectedTenantID`, `UserService.sessionData`, language). Parent writes it so the child does not start empty.

```typescript
async syncLegacyLocalStorage(): Promise<void> {
  const legacyState = this.readLocalStorageObject('IDMS');
  legacyState['TenantsService'].selectedTenantID = selectedTenantId;
  legacyState['UserService'].sessionData = sessionPayload;  // if ready
  // language, pilot alerts, managed tenants, …
  if (JSON.stringify(legacyState) !== localStorage.getItem('IDMS')) {
    localStorage.setItem('IDMS', serialized);   // huge blob — only write if changed
  }
}
```

---

## 6. Snapshot — `postMessage` is **context**, origin-locked

**Parent** `IframeBridgeService.handleMessage`:

```typescript
if (event.origin !== window.location.origin) return;

switch (event.data.action) {
  case 'getSessionData': {
    const sessionData = await this.fetchSessionData();  // NUX UserContext cache
    this.reply(event.source, event.origin, 'setSessionData', sessionData);
    return;
  }
  case 'getHierarchyData':
  case 'getTenantGroups':
  case 'getTenantSettings':
  case 'getManagedTenants':
  case 'nuxSessionExpired':
  // nav, modals, bookmarks, …
}
```

**Child** `IdmsAdapterService` (so `/app` TenantsService does **not** re-hit REST):

```typescript
window.parent.postMessage({ action: request }, window.location.origin);
// wait for matching action, also origin-checked
```

Reply: `source.postMessage({ action, data }, origin)` — **exact origin**, not `*`.

---

## 7. Sequence (say this if they want steps)

```text
1. User already logged in on NUX
     localStorage token + session   (bare)
2. Click leftover mega-menu item → allowlisted /app route
3. syncLegacyLocalStorage() → IDMS blob
4. iframe.src = /app/#/dashboard/safety/…
5. /app boots, interceptor reads token → APIs work
6. Child: postMessage getSessionData
7. Parent: setSessionData from cache (no extra login)
```

---

## 8. Traps

| She might think | Truth |
|---|---|
| Iframe = MFE | **No.** Second document, second Angular. Federation = one runtime. |
| Token in `postMessage` | **No.** Same-origin storage. |
| Every leftover URL | **Allowlist** only. |
| Iframe is forever | Goes away when that domain is **native** (or a federation remote). |

**Honest tax:** tokens in `localStorage` are XSS-visible. That’s why **next** is kernel + HttpOnly ([24](./ONETRUST_MFE_AUTH.md) · [21](./ONETRUST_HTTPONLY_MFE_AUTH.md)). Iframe sharing is why we used bare keys **today**.

**~20s extra:** “We share login because same origin and unprefixed token/session. postMessage is for tenant/session **payload** so the old app doesn’t refetch. When that page is nativized, the iframe and this bridge go away.”
