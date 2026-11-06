# NUX iframes — how we embed `/app`, exchange data, share auth

**Prefer the snapshot + spoken card:** [ONETRUST_IFRAME_AUTH.md](./ONETRUST_IFRAME_AUTH.md). This file is the long bridge catalog.

**Say:** IDMS / NUX dashboard / leftover Angular `/app` / AngularJS console. **Do not say** laptop repo names.  
**Grounded in:** NUX `AppFrameAdapter`, `IframeBridgeService`, `APP_FRAME_ROUTES`, `AuthStorageService`; `/app` `IdmsAdapterService`.  
**Related:** [ONETRUST_AUTH_FLOW.md](./ONETRUST_AUTH_FLOW.md) · [ONETRUST_RESUME_MFE_STORY.md](./ONETRUST_RESUME_MFE_STORY.md) § journey · [ONETRUST_MFE_SENIOR_ROUND.md](./ONETRUST_MFE_SENIOR_ROUND.md) (iframe ≠ federation)

This is **strangler embedding**, not Module Federation. Federation remotes share one Angular runtime. An iframe is a **second document** (second Angular app) with its own router, DI, and HttpClient.

---

## 0. Memorize — if she asks “how do you iframe leftover pages / share login?”

### ~50s

> NUX is the **shell**. Pages we have not nativized yet still live in the **older Angular `/app`**. The shell puts that page in an **iframe** so the user sees one chrome — nav, tenant picker, language — not two products.  
>  
> Parent and child are **same origin** (`idms-qa3.netradyne.com/app` vs `/dashboard`). That is why **auth is shared without posting the JWT through `postMessage`**. Login writes **bare** `localStorage` keys `token` and `session`. The iframe is the same origin, so `/app`’s interceptor reads the **same** keys and sends the same `Authorization` + `session-key`. Before we set `iframe.src` we also stamp a legacy **`IDMS` blob** (selected tenant, language, cached session payload) so `/app` boots with the parent’s tenant, not a stale one.  
>  
> **Product data** (session user blob, hierarchy, groups, tenant settings, managed fleets) is **not** re-fetched blindly by the iframe. The child `postMessage`s `getSessionData` / `getHierarchyData` / …; the parent answers `set*` from **already-loaded** NUX services. All messages are **origin-locked**. Navigation, modals, language, and session expiry also go over that bridge. We only embed **allowlisted** `/app` routes.

### ~15s extra if she asks MFE

> Iframe stays until that domain is **nativized** or peeled as a **federation remote**. Remotes will `inject` kernel auth — **not** `postMessage`. Don’t call today’s iframe “the MFE.”

---

## 1. Why an iframe at all (draw the three apps)

```
┌─ AngularJS console ─┐     historical parent
│  iframe → /app or NUX │
└──────────────────────┘

┌─ NUX dashboard (Angular 21) ──── shell, native pages ─┐
│  header / mega menu / tenant / language                 │
│  ┌─ iframe ─────────────────────────────────────────┐   │
│  │  /app  (Angular 17→19)  leftover feature pages     │   │
│  └──────────────────────────────────────────────────┘   │
└─────────────────────────────────────────────────────────┘
```

Journey you already tell: AngularJS → handwritten `/app` **inside** console iframes → NUX greenfield as the **new parent**; leftovers still iframe `/app`.

**Rules:**

- Not every `/app` URL is embeddable. **Allowlist** `APP_FRAME_ROUTES` (feature key → `/app` path). Arbitrary `/app/*` is out of scope.
- Once a page is **native** in NUX, we drop the iframe for the customer path. Dual-surface (`…/embedded`) exists for QA during transition.
- **Geotab / Store catalog** are other iframes (third-party or catalog). Different contract. Don’t mix with the `/app` bridge.

---

## 2. How we “post the page” in the iframe (cold load)

User clicks a leftover item in the NUX mega menu → dashboard route for that `featureKey` → shell renders **`nux-app-frame-adapter`**.

```
Dashboard hash URL
        │
        ▼
APP_FRAME_ROUTES          featureKey → /dashboard/safety/gz-scores  (allowlist)
        │
        ▼
AppFrameAdapter
  1. syncLegacyLocalStorage()     stamp IDMS blob + language keys
  2. iframe.src = buildIframeUrl(appRoute)
       local:   /app/#/dashboard/safety/gz-scores
       after path swap: /dashboard/#/…  (NUX lives at /app in prod; old app at /dashboard)
  3. iframe load → registerIframe(contentWindow)
  4. nuxContextInit (v2) if child is ready
```

Template (simplified):

```html
<iframe
  #appIframe
  [src]="iframeSrc()"
  (load)="onIframeLoad()"
  allow="fullscreen"
  title="Application content"
></iframe>
```

`iframeSrc` is a `SafeResourceUrl` from `DomSanitizer.bypassSecurityTrustResourceUrl` — **only** after the route is allowlisted and built by `buildIframeUrl`. We do **not** let a feature paste an arbitrary URL into `src`.

```typescript
buildIframeUrl(appRoute: string): string {
  const { pathname } = window.location;
  // Pre-swap: NUX at /dashboard, leftover app at /app.
  // Post-swap prod: NUX at /app, leftover app at /dashboard.
  const embeddedBasePath = pathname.startsWith('/dashboard') ? '/app' : '/dashboard';
  return `${embeddedBasePath}/#${normalizeAppFrameRoute(appRoute)}`;
}
```

**Same origin** is intentional: hash routing inside `/app/#/...` so the iframe document is still `https://idms-….netradyne.com`. Cross-origin would break shared `localStorage` and force a token-in-postMessage design we do **not** want.

**Not every click resets `src`.** Same feature, tab/query change → `postMessage({ action: 'navigate', … })` so `/app`’s router moves. Reloading `src` would re-bootstrap Angular and storm `getSessionData` again.

---

## 3. Two channels — don’t mix them

| Channel | What it carries | Why |
|---|---|---|
| **Same-origin `localStorage`** | OAuth `token`, auth-server `session`, some tenant keys, legacy `IDMS` JSON blob | `/app` HttpClient can attach bearer **without** the parent sending the JWT over `postMessage` |
| **`postMessage` bridge** | Session **payload for `/app` services**, hierarchy, groups, settings, nav, modals, locale, expiry | Child must not duplicate `/users/user` / tenant APIs; chrome must stay in sync |

Auth **credentials** ≈ storage. Auth **user/tenant context for the old app’s services** ≈ `getSessionData` / `setSessionData` (and the `IDMS.UserService.sessionData` seed).

Dashboard’s own tenant pick is **`dashboardSelectedTenantId` (env-prefixed)**. Shared bare tenant keys **are** written for `/app` / console, but NUX must **not** treat those as source of truth — the iframe used to clobber a deliberate NUX selection (IDMS-51288).

---

## 4. How auth is shared (the interview core)

### 4a. Login happens once — in NUX

NUX `AuthenticationService` already did `POST /oauth/token` + `POST /session` ([ONETRUST_AUTH_FLOW.md](./ONETRUST_AUTH_FLOW.md)). It writes:

```text
localStorage['token']    // IToken — BARE key, not qa3::token
localStorage['session']  // ISession — BARE
```

`/app` is a **different Angular application** (own `main.ts`, own interceptors) but **same origin**, so it reads those keys on bootstrap. Its HTTP interceptor attaches `Authorization: bearer …` and `session-key` the same way. **No second password prompt** inside the iframe.

Cookie **read** exists if localStorage is empty (old console). Logout expires `.netradyne.com` cookies. Honest: this is **legacy sharing**, XSS-visible tokens — greenfield would be HttpOnly refresh.

### 4b. Warm the legacy blob **before** `iframe.src`

`/app` historically expected an `IDMS` localStorage object (`TenantsService.selectedTenantID`, `UserService.sessionData`, language, pilot-alerts flag, …). Parent `syncLegacyLocalStorage()` writes that **before** the iframe loads so the child does not boot on tenant 0 / empty session.

```typescript
async syncLegacyLocalStorage(): Promise<void> {
  // selected tenant + scope from NUX UserContext
  legacyState['TenantsService'].selectedTenantID = selectedTenantId;
  legacyState['UserService'].sessionData = sessionPayload; // if ready
  // language, includePilotAlerts, managed tenants, …
  localStorage.setItem('IDMS', JSON.stringify(legacyState));
  // also write shared selectedTenant* via AuthStorage (encoded), without
  // publishing dashboardSelectedTenantId to the iframe
}
```

Writes are **diffed** against the current `IDMS` string — the blob can be huge; every write fires a `storage` event **inside** the iframe.

### 4c. Child still asks the parent for session (authoritative cache)

On embed, `/app` `IdmsAdapterService` **prefetches** from parent so `TenantsService` does **not** fall through to REST:

```
Child                         Parent IframeBridgeService
  getSessionData      →         fetchSessionData() from UserContext cache
  setSessionData      ←         (wait until payload ready, ~5s poll)
  getHierarchyData    →         parent cache / TenantScopeBootstrap
  getTenantGroups     →
  getTenantSettings   →
  getManagedTenants   →         (NUX parent only; old console may skip)
```

```typescript
// child
window.parent.postMessage({ action: 'getSessionData' }, window.location.origin);
// listen for setSessionData, origin must match

// parent
if (event.origin !== window.location.origin) return;
if (registeredSource && event.source !== registeredSource) return;
case 'getSessionData':
  this.reply(source, origin, 'setSessionData', await this.fetchSessionData());
```

**The JWT is not the `setSessionData` payload’s job.** That payload is the **user/session object `/app` services already understood** (so the iframe doesn’t call `/users/user` again). HTTP still uses `localStorage.token`.

### 4d. Expiry is parent-owned

If `/app` session dies inside the iframe, child posts **`nuxSessionExpired`**. Parent runs `AuthenticationService.notifySessionTimeout()` → **whole NUX** goes to login. We do **not** show `/app/login` only inside the iframe (user would think they are still in NUX).

### 4e. What is **not** shared via iframe

- NUX `qa3::` prefixed keys (dashboard tenant id, some UI).
- Federation kernel store (that’s MFE, different document model).
- Cross-origin third-party iframes (Geotab) — they do **not** get `token` via this bridge.

---

## 5. Full `postMessage` catalog (what we “exchange”)

All actions are typed in `iframe-bridge.models.ts`. Target origin is always **`window.location.origin`** (not `*`).

### 5a. Request / response (child asks, parent answers)

| Child → | Parent → | Data |
|---|---|---|
| `getSessionData` | `setSessionData` | Cached session user blob for `/app` |
| `getHierarchyData` | `setHierarchyData` | Hierarchy levels |
| `getTenantGroups` | `setTenantGroups` | Groups |
| `getTenantSettings` | `setTenantSettings` | Tenant settings object |
| `getManagedTenants` | `setManagedTenants` | Managed fleets (NUX parent) |
| `getQueryParams` | `getQueryParams` | Current query map (same action name both ways — quirk) |
| `getGZVersion` | `setGZVersion` | `'V3'` |

Parent answers from **NUX services already warm**, not a second login.

### 5b. v2 context (avoid reload)

| Direction | Action | Meaning |
|---|---|---|
| Child → parent | `nuxBridgeReady` | Capabilities: `context:init`, `locale:update`, maybe `context:update` / `theme:update` |
| Parent → child | `nuxContextInit` | Tenant, scope, locale, theme, query, `contextVersion` |
| Parent → child | `nuxContextUpdate` | Language (no iframe reload). Full scope update only if child advertised `context:update` |
| Child → parent | `nuxContextApplied` | Ack version |
| Child → parent | `nuxEmbeddedPageContext` | Nested page context (e.g. configurations category) |

If the child **cannot** apply group/hierarchy live, parent **reloads** the iframe after stamping storage (old path). True **tenant switch** often remounts the iframe because `/app` rebuilds tenant-scoped services.

### 5c. Navigation and chrome

| Action | Who | Effect |
|---|---|---|
| `idmsNavigate` | Child | Parent mirrors URL: **same feature** → `Location.replaceState()` (do **not** reset `iframe.src`). **Different feature** → `Router.navigateByUrl()` |
| `navigate` | Parent | Child router goes to mapped `/app` path (in-app tab) |
| `modalOpenedInNUX` / `modalClosedInNUX` | Child | Parent paints shell **scrim** over NUX header so iframe modal looks like one app (`stackDepth` for stacked dialogs) |
| `internalClick` | Child | Parent synthesizes document click so NUX menus close (iframe clicks don’t bubble) |
| `startCurrentPageSiteTour` | Parent | Child `SiteTourService` |
| `nuxBookmarksUpdated` / `nuxBookmarkToggleRequest` | both | Favorites stay in sync without reload |
| `nuxSetupWizardRedoRequested` | Child | Parent opens Setup Wizard (UI lives in NUX) |
| `openVideoPlayer` | Child | Some video surfaces (allowlisted handlers) |
| `nuxBuildUpdateAvailable` | Child | One shell toast, not two |
| `removeQueryParams` | Child | Parent clears query |
| `nuxSessionExpired` | Child | Parent logout |

Some leftover pages (SAM video, DMS) historically used **custom** extra actions. Dashboard only enables those after an `APP_FRAME_ROUTES` entry **and** handlers. Standard coaching/safety/fuel pages use **only** `IdmsAdapterService`.

---

## 6. Sequence to draw on a whiteboard

```
NUX user opens Safety Action Center (still /app)
  AppFrameAdapter.prepareIframe
    syncLegacyLocalStorage()     token/session already in localStorage from login
    iframe.src = /app/#/dashboard/safety/gz-scores

/app bootstraps (second Angular app)
  interceptor reads localStorage.token  →  APIs authenticated
  IdmsAdapterService.prefetch:
    postMessage getSessionData, getHierarchyData, …

NUX IframeBridge
  origin check + registered iframe window
  setSessionData / setHierarchyData from UserContext cache

  nuxBridgeReady ← child
  nuxContextInit → child
  nuxContextApplied ← child

User clicks a tab inside iframe
  child router navigates
  idmsNavigate → parent replaceState (src unchanged)

User changes language in NUX header
  stamp language keys + nuxContextUpdate
  child loads new i18n JSON  (no reload)

User’s session dies in iframe
  nuxSessionExpired → NUX login page
```

---

## 7. Code snapshots (sanitized)

**Allowlist (excerpt):**

```typescript
export const APP_FRAME_ROUTES: readonly AppFrameRoute[] = [
  {
    featureKey: 'safety-action-center',
    appRoute: '/dashboard/safety/gz-scores',
    nativeDashboardPath: '/safety/dashboard',
    navigationMode: 'embedded-only',
  },
  // report-central, coaching, HOS, configurations, …
];
```

**Child request (origin lock):**

```typescript
getDataFromIdms(request: 'getSessionData' /* | … */) {
  window.addEventListener('message', listener); // ignore if event.origin !== location.origin
  window.parent.postMessage({ action: request }, window.location.origin);
}
```

**Parent dispatch (origin + registered source):**

```typescript
if (event.origin !== window.location.origin) return;
if (this.registeredSource && event.source !== this.registeredSource) return;
```

**Shared storage keys (must stay unprefixed):**

```typescript
const SHARED_KEYS = new Set([
  'token', 'session',
  'selectedTenantID', 'selectedUserTenantID', 'selectedTenantId',
  'selectedTenantContext', 'tenant_unique_name', 'selectedTenantUniqueName',
  'userId',
]);
// dashboardSelectedTenantId is NOT in this set — prefixed, iframe must not own it
```

---

## 8. Contrast: iframe vs MFE (if she pivots)

| | Iframe `/app` | Federation remote |
|---|---|---|
| Document | Two | One |
| Angular | Two copies | Shared runtime |
| Auth | Same-origin `localStorage` + `getSessionData` | Kernel `inject(AuthService)` / interceptor |
| Cross-feature data | `postMessage` / `IDMS` blob | Kernel store |
| Deploy | Two zips (`/app` + `/dashboard`) | Host + remoteEntry on CDN |
| Goal | Strangler leftover | Domain peel |

---

## 9. Drill

**Q: How do you show an old page inside NUX?**  
> Allowlisted feature → `AppFrameAdapter` → same-origin `iframe.src` `/app/#/…` after `syncLegacyLocalStorage`.

**Q: How is auth shared if it’s a different app?**  
> Same origin, bare `token`/`session`. Child interceptor reads them. Parent also answers `getSessionData` from cache so `/app` services don’t re-login. Prefixed dashboard tenant key is **not** shared.

**Q: Do you postMessage the JWT?**  
> No. JWT stays in `localStorage`. postMessage carries **session/hierarchy/settings** objects and chrome events.

**Q: Why origin lock?**  
> Anyone can `postMessage`. We only accept `event.origin === location.origin` and the registered iframe `contentWindow`.

**Q: Why not reload the iframe on every click?**  
> Cold load reboots Angular + `get*` storm. Same-feature nav uses `navigate` / `replaceState`.

**Q: Session timeout in the iframe?**  
> `nuxSessionExpired` → parent logout, not a nested login form.

**Q: Is this MFE?**  
> No. Transitional strangler. MFE is shared Angular + tokens from host stamp.

---

## 10. Don’t say

| Don’t | Do |
|---|---|
| We pass the token in postMessage | Same-origin localStorage; postMessage is context + chrome |
| Every `/app` URL can be iframed | Allowlist `APP_FRAME_ROUTES` |
| Iframe is our MFE | Strangler leftover; federation is the peel |
| Two logins | One NUX login, shared keys |
| Parent URL always `router.navigate` on child clicks | Same feature uses `replaceState` so `src` stays |
| Paste internal ticket dumps / repo paths | IDMS, NUX, `/app`, allowlist, bridge |
| Geotab uses the same `getSessionData` protocol | Different embed; don’t invent |
