# OneTrust — NUX auth flow (login, store, refresh, logout)

**Round 3 focus.** “How do you handle authentication?” — walk this file.  
**Revise from diagrams first:** [ONETRUST_AUTH_REVISION.md](./ONETRUST_AUTH_REVISION.md).  
**Grounded in** `cloud-front-end` / `dashboard`: `AuthenticationService`, `AuthStorageService`, `OAuthInterceptor`, `authGuard`.  
**Do not say** laptop folder names. URLs come from runtime env — see [ONETRUST_ENVIRONMENT_STORY.md](./ONETRUST_ENVIRONMENT_STORY.md).  
**Security tradeoff (HttpOnly vs localStorage):** [frontend-system-design/10_FRONTEND_AUTH_SECURITY.md](../frontend-system-design/10_FRONTEND_AUTH_SECURITY.md).

---

## 0. 45s opener (say this first)

> IDMS NUX is **OAuth2 password + refresh** against **auth-server**, plus an **auth-server session**. Login is `POST /authserver/api/v1/oauth/token` with `grant_type=password`, **client Basic** (`client_id:`), form body. That returns `access_token` + `refresh_token`. Then we `POST /session` with the **bearer** — that creates `session_id`. Fully logged in means **token + session_id** and **2FA not pending**.  
> We **persist** token and session in **`localStorage`** under bare keys `token` and `session` so **legacy `/app` and `/console` share the same login** (plus cookie **fallback read** for old console). Dashboard tenant selection has its **own prefixed** key so the iframe cannot clobber it. How the iframe is hosted and what `postMessage` carries (not the JWT): [ONETRUST_IFRAME_BRIDGE.md](./ONETRUST_IFRAME_BRIDGE.md).  
> Every API (rest, consoleapis, auth, …) goes through **`OAuthInterceptor`**: `Authorization: bearer …`, `session-key`, `X-Selected-Tenant-Id`, `Accept-Language`, `X-Dashboard-Type: APP`. On **401** we **single-flight refresh**: `grant_type=refresh_token`, then **PUT /session** to keep the same session id, then **retry once**. If refresh fails → clear storage → login.  
> Idle timeout mirrors the server: `session.expiry` is **inactivity seconds**; we **slide** a timer on click/keydown/mousemove. Not polling.  
> **SSO** is a different front door (username → **SSO check** → IdP or password), then the **same** session. Why each step: [ONETRUST_SSO.md](./ONETRUST_SSO.md).

---

## 1. Two credentials (don’t mix them)

| Piece | What it is | Where it lives |
|---|---|---|
| **Access token** | Short-lived OAuth access | `IToken.access_token` |
| **Refresh token** | Mint a new access token | `IToken.refresh_token` (password grant; SSO may omit until a refresh) |
| **Session** | Auth-server session (`session_id`, `expiry` as **idle seconds**) | `ISession` |
| **Client id** | Public OAuth client for the SPA | Runtime `EnvironmentData` — **Basic** on `/oauth/token` |

**Authenticated** (`isAuthenticated()`):

```text
(user access token exists) AND (session.session_id) AND (2FA not pending)
```

Guards use this. A token without a session (or 2FA pending) is **not** in the app.

### Why token **and** session — not token only

**OAuth** is the **protocol** to get tokens (`POST /oauth/token`: password / refresh / SSO authcode). That is **not** the whole login.

**Auth-server** is Netradyne’s **server** that (1) issues those OAuth tokens **and** (2) stores a **session row** (`ndsession`).  
**“Auth”** in the interview = both layers + FE interceptor/guard. Don’t say “OAuth 1 vs OAuth 2” unless they mean RFC — we use **OAuth 2**.

| Layer | What it is | On the wire | What it is **for** |
|---|---|---|---|
| **Access token** | OAuth **access** (short-lived) | `Authorization: bearer …` | “This request is allowed to hit APIs **right now**.” |
| **Refresh token** | OAuth **refresh** | Only on `POST /oauth/token` (body, not on every API) | Mint a **new access** without password. |
| **Session** | **Server row**: user, idle, 2FA state, bound access token, session-limit | `session-key: <session_id>` | “This **login** is still alive / idle / 2FA-complete / not kicked by another device.” |

**`ISession.access_token`:** a **copy** of the access token on the session JSON (legacy). Guard/interceptor can fall back if `localStorage['token']` is missing. It is **not** a second OAuth grant. Real session id is `session_id`.

**Why not access token only?**

| If we only had the access token | What we would lose |
|---|---|
| **Idle “walked away”** | JWT `exp` is **absolute** lifetime. Session `expiry` + `updated` is **inactivity**. Token-only cannot “30 min since last click” without a server row (or putting idle in every resource API). |
| **2FA** | Password grant can return a token while session is still **CREATED**. App must not be in until session is **ACTIVE**. Token-only would look logged in. |
| **Kick device / max sessions** | Tenant **session limit** inactivates **old session ids**. Token-only: you’d need a JWT denylist or accept many parallel logins. |
| **Bind refresh to this login** | After access refresh, **PUT /session** points **this** `session_id` at the **new** access token. Resource APIs send **both** headers so auth-server can reject a stolen bearer with a **dead** session-key. |
| **Revoke this login** | Logout / timeout sets session **EXPIRED**. Access JWT might still parse until `exp`. Session-key fails now. |
| **User blob for `/app` iframe** | `getSessionData` / `IDMS.UserService.sessionData` — product context, not just a JWT. |

**What it prevents (say this):**

- Stolen **access token** after idle or logout → APIs still send `session-key`; server says session dead → **401 logout**, not infinite refresh.  
- **Refresh token** without a live session → we **do not** treat idle as refresh (§8).  
- **2FA skip** → token exists, `twoFactorPending` / session state blocks the guard.  
- **Extra logins** beyond tenant cap → old `session_id` dies; PUT may fail then **POST** new session if refresh still good (§5 11b).

**Honest limit:** both live in **JS-readable `localStorage`** so `/app` + `/console` + NUX share one login. XSS can steal them. That is why the **next** story is HttpOnly.

### If she asks: “Why this auth? Why not JWT only?”

**~40s:**

> We didn’t pick “JWT vs session” as a fashion. IDMS is a **fleet dashboard**: idle logout, **2FA**, **cap concurrent logins**, and **kill this login now** without waiting for JWT `exp`. A **self-contained JWT** is great for stateless APIs; it is **bad** at inactivity and revoke. So auth-server issues **OAuth 2 access + refresh** (stateless-ish call auth) **and** a **server session** (`session-key`) for **login lifecycle**. FE sends **both**. We store them in **localStorage** only because **three UIs** on the same origin must share one login. That’s a **legacy constraint**, not the security ideal. I’d move **refresh** to **HttpOnly** cookies next.

**Use cases (the “why club them” list):**

1. **Idle vs token lifetime** — Driver walks away from a safety dashboard. JWT `exp` might still be 20 minutes. Session idle (tenant `timeout.seconds`) kills the **login** on next API + FE timer. Token-only = desk stays “logged in” until `exp`.
2. **2FA** — Token can exist while session is not fully ACTIVE. Guard needs **both**.
3. **Admin / tenant policy** — “Max 2 IDMS sessions.” New phone login inactivates old `session_id`. JWT-only would need a **denylist** (then you’re not stateless anymore).
4. **Logout / stolen laptop** — Expire **session row** now. Bearer might still parse; **session-key** fails.
5. **Refresh** — New access token must attach to **this** login (`PUT /session`). Token-only refresh just mints JWT; you don’t know **which device** you kicked.

### Compare three designs (memorize)

| | **A. JWT / access token only** | **B. What we have** (OAuth token **+** session, **localStorage**) | **C. HttpOnly cookies** (target) |
|---|---|---|---|
| **What FE stores** | JWT (often localStorage) | `token` + `session` JSON | Refresh (and maybe sid) **cookie**; access in **memory** |
| **Every API** | `Authorization: Bearer` | Bearer **and** `session-key` | Cookie auto-sent and/or short Bearer from memory |
| **Idle logout** | Weak (`exp` only) unless every API tracks last-seen | **Yes** — session `updated` + FE timer | **Yes** — server session/cookie still a **row** |
| **Revoke now / max devices** | Hard (denylist / short `exp` only) | **Session row** EXPIRED / inactivated | **Same** if cookie is a **session id**; harder if cookie **is** the JWT |
| **2FA half-login** | Easy to get wrong | Session state + `twoFactorPending` | Session cookie state |
| **XSS steals secret?** | **Yes** if JWT in JS storage | **Yes** (both secrets in JS) | **Refresh: no** (HttpOnly). XSS can still **use** the cookie (drive the browser), not **exfiltrate** it as easily |
| **CSRF** | Weak (attacker can’t set `Authorization` easily) | Weak (same — we set headers) | **Real** — cookie auto-attaches. Need **SameSite** + maybe CSRF token |
| **Share login `/app` iframe** | If localStorage JWT | **Yes** — same origin keys | **Yes** — same-site cookies **without** JS sharing the JWT |
| **Stateless scale** | Best | Auth-server **must** read `ndsession` | Session store or Redis for sid |
| **Our reason to choose B** | — | Product needs **idle + revoke + 2FA + three apps** | Better **theft** story; **CSRF** work; auth-server cookie flags |

**HttpOnly is not “instead of session.”** It is a **better envelope** for the **same two jobs**: short access + **server-side login**. You still want a **session** (or BFF session). You stop putting **refresh** in `localStorage`.

**Trade-off one-liner:**  
Token+header → **CSRF-safer, XSS-worse**. HttpOnly cookie → **XSS-theft-safer, CSRF-worse**. We picked B because of **legacy sharing + login lifecycle**; we want C for **XSS**.

### OAuth 1 vs OAuth 2 (if she says “OAuth 1 / OAuth 2”)

We use **OAuth 2**. Not OAuth 1.0a.

| | **OAuth 1.0a** | **OAuth 2.0** (us) |
|---|---|---|
| Signature | Every request: HMAC of method + URL + params + secrets | **Bearer** access token on the request (HTTPS assumed) |
| Tokens | Request token → access token; **no** refresh grant as we know it | **Access** (short) + **refresh** (long) |
| FE complexity | Crypto on the client; painful in SPA | SPA posts to `/oauth/token`, stores tokens |
| When it’s “worth it” | Old Twitter-style APIs, no TLS trust | Almost all modern SPAs, mobile, SSO |

**Worth OAuth 1:** untrusted HTTP, prove the request wasn’t tampered without putting a bearer in JS. **Not** our dashboard.  
**Worth OAuth 2:** TLS, SSO (auth code), refresh, SPA interceptor. **That’s us.**  
Then we **add a session** on top of OAuth 2 because OAuth 2 **does not** define idle / 2FA / max devices.

### Which design is **worth it** (say a verdict)

| Situation | Worth choosing | Why |
|---|---|---|
| Public API, millions of calls, no “kick this laptop” | **JWT / token only** | Stateless, cheap |
| Enterprise dashboard: idle, 2FA, session cap, revoke now | **OAuth 2 token + server session** (us) | Login is a **row**, not only a string |
| Same, but greenfield / no AngularJS share | **OAuth 2 + session, refresh in HttpOnly cookie** | Same lifecycle, less XSS theft |
| Highest lock-down | **BFF** + HttpOnly session to BFF only | Page never sees tokens |

**Worth 1 — token only:** scale and simplicity. **Not worth it for IDMS** — we’d fake idle/revoke with a denylist and then we’ve built a session anyway.  
**Worth 2 — token + session:** **our product**. Cost: extra header, extra DB hit, two blobs in storage.  
**Worth next — HttpOnly:** same **worth 2** model, better envelope. Cost: CSRF, cookie domain/`Path`, `/app` + console must send cookies.

---

---

**Today (truth):** Bearer + `session-key` from **localStorage** because **three same-origin UIs** (NUX, `/app` iframe, console) must share login without a BFF. Cookie **read** is only a **legacy fallback**.

**Target (what I would build / we are moving toward):** keep **OAuth 2** (short access + refresh). Stop putting **refresh** (and ideally access) in `localStorage`. MFE kernel plan: [ONETRUST_HTTPONLY_MFE_AUTH.md](./ONETRUST_HTTPONLY_MFE_AUTH.md).

```text
Today:     JS reads token + session → Authorization + session-key
Tomorrow:  Browser holds HttpOnly cookies → JS cannot document.cookie them
           Access: memory (minutes) OR short HttpOnly access cookie
           Refresh: HttpOnly + Secure + SameSite cookie, Path=/authserver
```

**Why:** XSS should **not** steal refresh. Same-origin `/app` iframe **still gets cookies automatically** (same site) — we do **not** need `localStorage['token']` for that. CSRF becomes the new tax: **SameSite=Lax** + refresh URL only on auth host + optional CSRF token.

**Phased shift (say this as a plan, not “already done”):**

1. Auth-server `Set-Cookie` on login / refresh (HttpOnly refresh). FE still sends bearer until APIs accept cookie.  
2. Interceptor: `withCredentials: true` on auth + API; stop writing `refresh_token` to localStorage.  
3. Drop bare `token` key once `/app` + console are on cookies (or NUX-only native). Session idle can stay a **server session cookie** (`sid`) instead of `session-key` header.  
4. MFE remotes: **same site** cookies; no `inject` of refresh token.

**Refresh with HttpOnly (draw this):**

```text
1. Access in memory dies → product API 401
2. POST /oauth/token  grant_type=refresh_token
   credentials: include
   Browser attaches refresh cookie  (JS never saw the value)
   Server rotates refresh cookie (Set-Cookie again)
   Body: { access_token } only  (or access also in cookie)
3. FE puts new access in memory (or cookie)
4. Retry original HttpClient call  (same interceptor / Subject as today)
```

**No** `localStorage['token'].refresh_token`. **No** putting refresh on `refreshTokenSubject` as a stolen string — Subject can still hold “refresh done” / new access in memory.

**Idle:** still **server** `updated` + cookie/session row. FE timer can stay as UX. Logout = server clears cookie (`Set-Cookie Max-Age=0`).

**If they ask BFF:** even better — browser only has a **session cookie to our BFF**; auth-server tokens never touch the page. Bigger change; cookie-on-auth-server is the smaller step.

---

## 2. End-to-end diagram (draw this)

```text
index.html  →  EnvironmentData (auth origin)
               (where URLs are joined + where *Api paths live: ONETRUST_ENVIRONMENT_STORY.md)
bootstrap   →  AuthenticationService hydrates localStorage
              OAuthInterceptor registered on HttpClient

── Password login ─────────────────────────────────────────
Login page
  POST {auth}/oauth/token
       grant_type=password
       username, password, optional fleet_id
       Authorization: Basic base64(client_id:)
  ← access_token, refresh_token, expires_in, token_type
  save token → localStorage['token']  (+ in-memory)

  POST {auth}/session   (empty body; interceptor adds bearer)
  ← session_id, expiry (idle seconds), user, branding
  save session → localStorage['session']
  seed tenant if none selected; FCM init; inactivity timer

  (if 2FA) twoFactorPending = true → TOTP / QR
  else authGuard lets you in; permissions load; landing page

── Every API call ─────────────────────────────────────────
  interceptor adds:
    Authorization, session-key, X-Selected-Tenant-Id,
    X-Selected-Tenant-Unique-Name, Accept-Language,
    X-Dashboard-Type: APP

── 401 ────────────────────────────────────────────────────
  if no access token → logout
  if another tab already refreshed → retry with new token
  else single-flight refresh:
    POST /oauth/token  grant_type=refresh_token
    PUT  /session      { sessionId }   (attach new access to same session)
    if PUT fails (multi-device) → POST /session again
    retry original request once
  refresh fail → notifySessionTimeout → login

── Idle ───────────────────────────────────────────────────
  timer = session.expiry * 1000 (fallback 30 min)
  user activity resets timer
  fire → same logout path
```

Auth origin: `https://auth-{env}.netradyne.com/authserver/api/v1` (prod: `auth.netradyne.com`). Paths **don’t** change per QA.

---

## 3. Getting the token (login)

**Service:** `AuthenticationService.login(username, password, fleetId?)`.

1. Clear previous auth (`removeSessionData`, keep 2FA flag if mid-enrollment).  
2. **`getAccessToken`**: `application/x-www-form-urlencoded` POST to `/oauth/token`.  
3. **`createSession`**: `POST /session` with bearer already in interceptor.  
4. On success: persist session, language from user payload, branding, **inactivity timer**, **Firebase** `initialize(true)`.

**SSO (same tokens at the end):**

1. `POST /auth/sso/status` (username, optional fleet) — **no user bearer**; interceptor uses **client Basic**.  
2. Redirect to IdP; we stash `state` in **sessionStorage** (+ legacy localStorage keys for `/console` parity).  
3. Callback: hash router may miss query on `/app?code=` — **`authGuard`** copies `code`/`state` onto the **login** route.  
4. Exchange `authcode` → token (or program/account picker) → **`createSession`**.

**2FA:** see **§3b** below. Session can exist while `twoFactorPending`. QR / TOTP / skip use bearer **+ `session-key`**. Interceptor **must not** treat their 401 as “refresh and logout” during enrollment.

**Fleet ID:** duplicate usernames across fleets → extra `fleet_id` on token / SSO.

---

## 3b. Two-factor (2FA / TOTP) — what NUX actually does

**2FA** here is **not** SMS. It is **TOTP**: a 6–8 digit code from an **authenticator app** (Google Authenticator, etc.). Password (or SSO on the IdP) is factor 1. The code is factor 2.

**Use case:** a portal user whose **role/user** has 2FA on (`twofa_status`). Fleet admin turns it on in **Portal Users** (`enable_twofactor`). So a stolen password is not enough to open Safety/alerts.

**User flags** (from session `user` after `POST /session`):

| `twofa_status` | Meaning | Login UI |
|---|---|---|
| **0** | Off | No 2FA step. `twoFactorPending` → **false**. Enter app. |
| **1** **ASSIGNED** | Must **enroll** | Show **QR** (`GET /auth/twofactor/qr-image`) + code box. First-time setup. |
| **2** **ACTIVE** | Already enrolled | Code box only (no QR). |

**`twoFactorPending` (FE boolean, in-memory only — not localStorage):**

| When | Value |
|---|---|
| Password submit **starts** | **true** immediately so `authGuard` cannot treat token+session as “in the app” mid-login |
| Password/token **fails** | **false** |
| Session user `twofa_status === 0` | **false** → `completeLogin$` |
| Status 1 or 2 | Stays **true**; login step = `two-factor` |
| `POST /auth/twofactor/totp/validate` `{ totp }` **200** | **false** → enter app |
| `POST /auth/twofactor/twofa/skip` **200** | **false** → enter app |
| **SSO** (`viaSsoLogin`) | FE **skips** TOTP (legacy parity). IdP was the second factor. |

**Skip** is allowed only if `twofa_grace_period` is a date **in the future** (admin gave days to enroll). After grace, skip is hidden; must TOTP.

**Auth-server:** 2FA users get session state **CREATED** until TOTP/skip, then **ACTIVE**. Resource APIs want ACTIVE. QR/validate/skip are special URLs: bearer + `session-key`, **no** 401→refresh/logout.

**QR is not a scan event.** `GET /auth/twofactor/qr-image` only returns a PNG of the shared secret. We never know if the authenticator scanned it. Proof is `POST /auth/twofactor/totp/validate` `{ totp }` matching that secret → `twofa_status` 1→2. Diagrams: [ONETRUST_AUTH_REVISION.md](./ONETRUST_AUTH_REVISION.md) §10.

**Spoken ~25s:** “2FA is TOTP after password. User twofa_status 0 skip, 1 enroll QR, 2 enter code. twoFactorPending true until validate or skip. Guard needs it false. SSO skips our TOTP. Grace period can skip enroll.”

---

## 4. Saving (persistence)

**`AuthStorageService`** — this is the interview “where do you store JWT?” answer for **our** product.

| Key | Prefixed by env? | Why |
|---|---|---|
| `token`, `session` | **No (bare)** | Shared with legacy `/app` + `/console` |
| `selectedTenantID`, `userId`, … | Bare (shared) | Same three-app handshake |
| `dashboardSelectedTenantId` | **Yes** (`qa3::…`) | Dashboard’s real selection — iframe must **not** overwrite (IDMS-51288) |
| FCM / branding / other | Prefixed | Don’t leak across QA/prod tabs |

**Write path:** `AuthenticationService` setters → in-memory **and** `localStorage.setItem`. Reload: constructor **`hydrateFromPersistedAuth()`**.

**Cookie:** we **read** shared keys from **document.cookie** if localStorage is empty (old console). On logout we **expire** those cookies on `.netradyne.com`. We are **not** an HttpOnly-cookie SPA — XSS can read `token`. Say that honestly: **legacy sharing forced localStorage**; greenfield would be **HttpOnly refresh + short access**.

**Cross-tab:** `storage` event — other tab refresh → we **adopt** new token/session. Token/session **removed** → logout. **Different `user_id`** in session → logout. Hidden tab: timeout may **defer** login redirect until visible, then re-check auth (other tab may have restored).

---

## 5. Refreshing (the 401 path) — every step

**Not** a timer. **Not** the idle session path (§8). This is: **a product API came back 401** (usually **access token** dead / rejected), and the error is **not** “session idle / logout-only.”

Two HTTP calls can happen, **in order**:

1. **Always first:** `POST /oauth/token` (`grant_type=refresh_token`) — mint a **new access token** (and usually a new refresh token in the same JSON).  
2. **Then:** `PUT /session` `{ sessionId }` — tell auth-server: **this same session** now belongs to the **new** access token.  
3. **Only if that PUT fails** (400/401/403): **`POST /session`** — create a **new** session id (other device killed the old row; refresh token still good).  
4. **Then:** interceptor **retries the original Groups/Safety/… request once** with the new bearer.

`PUT` is **not** “refresh the session because it expired.” Idle-expired session skips this whole flow and logs out.

### Step-by-step (happy path)

Imagine `GET /restserver/api/v1/settings/{tenant}/subTenantDetails` returns **401**.

```
0. You are logged in.
   localStorage['token']    = { access_token: A, refresh_token: R, expires_in, … }
   localStorage['session']  = { session_id: S, expiry: idle seconds, … }

1. Feature service calls HttpClient.get(url).

2. OAuthInterceptor clones the request:
   Authorization: bearer A
   session-key: S
   X-Selected-Tenant-Id, Accept-Language, X-Dashboard-Type: APP
   (It also remembers tokenUsedForRequest = A.)

3. Backend: access token A is dead / invalid → HTTP 401.
   (If body is session_timeout / SESSION_EXPIRED → STOP. Logout. Do not refresh.
    See §8. That is idle session, not this flow.)

4. Interceptor handleError, status === 401, URL is NOT /oauth/token:
   a. 2FA pending + 2FA URL? → just fail, no refresh.
   b. No access_token in storage? → logout.
   c. Current access_token !== A? (other tab already refreshed) → retry original with new token. STOP.
      How: A is a **string snapshot at request start**. “Current” is `localStorage['token']` **read now** on 401.
      Other tab **did** update localStorage (same origin). This tab **can** read it immediately.
      We still compare because this **in-flight** request used **old A** on the wire.
   d. invalid credentials OR shouldLogout? → logout.
   e. Else → tryRefreshAccessToken (this request).

5. Single-flight:
   If refresh already running → this request WAITS on refreshTokenSubject, then retries original. STOP this branch.
   Else set refreshTokenInProgress = true.

6. AuthenticationService.refreshAccessToken():
   a. Read R from token.refresh_token. Missing → logout.
   b. Read S from session.session_id. Missing → logout.

7. TOKEN CALL (same URL as login, different grant):
   POST {auth}/authserver/api/v1/oauth/token
   Content-Type: application/x-www-form-urlencoded
   Authorization: Basic base64("idms:")     ← CLIENT, not bearer A
   body: client_id=idms
         grant_type=refresh_token
         refresh_token=R

   Interceptor does NOT attach bearer A to this call.
   If THIS call 401s → do NOT refresh again (loop). Logout.

8. Auth-server returns new IToken:
   { access_token: A2, refresh_token: R2, expires_in, … }

9. Setter this.token = tokenResponse
   → localStorage['token'] overwritten with the whole new object (A2 + R2).
   Session row S is still the old one. session_id unchanged so far.

10. SESSION CALL — PUT (same session id):
    PUT {auth}/authserver/api/v1/session
    body: { sessionId: S }
    Interceptor: this PUT is allowed through during refresh (not queued).
    Headers: bearer A2 (already saved) + session-key S.

    Why: auth-server session row still pointed at access token A.
    PUT attaches A2 to S so later APIs with session-key S match the new token.

11a. PUT 200 → same S, now tied to A2. Go to step 12.

11b. PUT 400/401/403 — `updateTokenBySessionId` updated **0 rows** (S gone / inactive).
     This is **not** the idle-logout path. We **already** have A2 from step 8.
     session = null
     POST {auth}/authserver/api/v1/session   (empty body, bearer A2)
     ← new session_id S2
     Typical cause: another device logged in, tenant **max sessions** inactivated S.
     Idle `session_timeout` never gets here — interceptor already logged out at step 3d.
     (Do NOT copy default tenant over a fleet the user already selected.)

12. refreshTokenSubject.next(new token)
    refreshTokenInProgress = false

13. Retry ORIGINAL request once:
    GET …/subTenantDetails
    Authorization: bearer A2
    session-key: S (or S2)

14. 200 → UI continues. User never saw login.
    If retry 401s again → we do not infinite-loop forever; failed refresh / logout path applies.
```

### Two APIs 401 at once — slow walkthrough (CloudFront NUX today)

There is **no array** `[url1, url2]` we push 401s into. Angular already has two **separate** HttpClient subscriptions. Each one is still **open** (spinner). The interceptor is a **function that ran twice**, each time with a **different** `request` in memory (a closure). That is the “tracking.”

**Example:** Safety page fires two calls in parallel (same access token A):

- Call **G** = `GET .../restserver/.../subTenantDetails` (groups)
- Call **L** = `GET .../restserver/.../getVisibleAlerts` (listing)

```
Time 0
  G interceptor: remember A, send GET groups  with bearer A
  L interceptor: remember A, send GET listing with bearer A
  refreshTokenInProgress = false
  refreshTokenSubject = (whatever last token was, ignore)

Time 1  both servers return 401

Time 1.1  G's catchError runs first (JS is single-threaded; one handleError at a time)
  refreshTokenInProgress === false
  → THIS call is the owner
  → refreshTokenInProgress = true
  → refreshTokenSubject.next(null)     // doorbell: "not ready"
  → POST /oauth/token  (refresh)  then PUT /session     // only once

Time 1.2  L's catchError runs
  refreshTokenInProgress === true
  → L does NOT call /oauth/token
  → L's Observable becomes:
       refreshTokenSubject.pipe(
         wait until value is NOT null,   // filter
         take(1),                         // one doorbell ring
         then send GET listing AGAIN with whatever token is in localStorage now
       )
  L is "queued" only as: this RxJS subscription waiting on the Subject.
  We did not push L's URL into a list.

Time 2  token + session succeed, localStorage has A2
  owner G: refreshTokenSubject.next(A2)   // doorbell rings
            then G retries GET groups with bearer A2
  waiter L: filter sees A2 → take(1) done → retries GET listing with bearer A2

Time 3  both 200. Two spinners stop. We never "ran all APIs in the app."
```

**What `refreshTokenSubject` actually is**

```typescript
private refreshTokenInProgress = false;
private refreshTokenSubject = new BehaviorSubject<IToken | null>(null);
```

| Piece | Meaning |
|---|---|
| `refreshTokenInProgress` | Boolean lock. First 401 becomes **owner** and calls refresh. Everyone else **waits**. |
| `refreshTokenSubject` | `BehaviorSubject<IToken \| null>`. **Not** a list of APIs. It only holds: `null` = refresh running, or the **new token object** when done. |
| Wait | `filter(token => token != null) + take(1)` = “wake me when doorbell is a real token.” |
| Then | `switchMap(() => next.handle(addAuthenticationToken(request)))` — **`request` is still G’s or L’s own HttpRequest** from the closure. |

**“Queuing”** = each failed call’s Observable sits on that `pipe`. When `next(A2)` runs, **every waiter** gets the same A2 and each retries **itself**. Order is “whoever subscribed,” not a priority queue.

**Third call that starts while refresh is still running** (not even sent yet): `intercept()` sees `refreshTokenInProgress` **before** sending, parks the **same way** on the Subject, then sends **once** with A2 (never uses dead A). Same Subject, still not a URL list.

**If refresh fails:** owner `notifySessionTimeout()`. Waiters error too. Login. Nobody retries.

**CloudFront / NUX today:** this **is** the mechanism (`OAuthInterceptor`). There is no extra “replay service.”

---

### What each call is for (say this if she asks)
|---|---|---|
| Original product API | User action | Failed with 401 — that **starts** refresh |
| `POST /oauth/token` refresh grant | After we decide “refresh, don’t logout” | New **access** (and refresh) tokens |
| `PUT /session` | After token succeeds | Same **session id**, new access token on that row |
| `POST /session` | Only if PUT failed | **New** session id |
| Original API **retry** | After the above | Same Groups/Safety URL, new headers |

### Interceptor notes (same as before)

1. Skip waiting-for-refresh on: `/oauth/token`, public SSO, 2FA-created-session URLs, **PUT /session**.  
2. **401 on `/oauth/token` itself:** do **not** recurse — logout.  
3. After refresh we do **not** blindly overwrite selected tenant with session default tenant.

### Refer later — “is this right?” Q&A (401 / refresh token)

**Q: If any API gives 401, then we refresh?**  
**Yes** — for authenticated product APIs. Refresh is **reactive**, not a timer every N minutes. Idle timeout (`session.expiry` inactivity) is a **different** path; it logs out, it does not mint a new access token.

**Q: What API do we call to refresh?**  
Same token URL as login, **different grant**:

1. `POST {auth}/authserver/api/v1/oauth/token`  
   - `grant_type=refresh_token`  
   - form body: `client_id`, `grant_type`, `refresh_token=<saved>`  
   - `Authorization: Basic` (OAuth **client**, not the expired bearer)  
   - `Content-Type: application/x-www-form-urlencoded`  
2. Then **`PUT {auth}/authserver/api/v1/session`** `{ sessionId }` so the **same** `session_id` tracks the **new** access token.  
3. If that PUT is 400/401/403 → **`POST /session`** again (old session id died; refresh token can still be good).  
4. Interceptor **retries the original request once** with the new access token.

**Q: Did we save the refresh token? Separate key?**  
**Saved, not a separate key.** Login (password grant) returns one `IToken` JSON: `access_token` + `refresh_token` + `expires_in` + …. `AuthenticationService` setter writes the **whole object** to `localStorage['token']` (bare) **and** in-memory. Getter `refreshToken` reads `this.token.refresh_token` from that object. Reload hydrates the same blob. There is **no** `localStorage['refreshToken']`.

**Q: What if it is not saved / missing?**  
`refreshAccessToken()` throws `'Refresh token not found'` → **`notifySessionTimeout()`** → login. Some **SSO** token responses **omit** `refresh_token` until a later refresh is issued — then a 401 cannot refresh and we logout. Also logout if there is **no access token** or **no `session_id`**.

**Q: Many APIs 401 at once?**  
**Single-flight:** one `refreshAccessToken()`. Others wait on `refreshTokenSubject`, then retry with the new token. Other tab already refreshed (`access_token` changed mid-flight) → **retry only**, don’t refresh again.

**Q: Step 4c — how do we know “current token” vs A? Other tab updated localStorage — why doesn’t this tab already have it?**  
The 401 body does **not** return the new access token. We never learn A2 from the failed API.

```
Tab B (or iframe) refreshes → setItem('token', { access_token: A2, … })
Tab A: request already on the wire with bearer A
```

| Name | Where it comes from |
|---|---|
| **A** | Snapshot **before** `next.handle`: `tokenUsedForRequest = this.authenticationService.token?.access_token` |
| **Current** | On 401, **read again**: `this.authenticationService.token` → `storage.getToken()` → **same** `localStorage['token']` |

Same-origin tabs **share one localStorage**. Tab B’s `setItem` is **immediately visible** to Tab A’s `getItem`. So at 401 time, current **is** A2. It **is** reflecting.

What is **stale** is only this **request**: it left with **A**, server 401’d **A**. Angular `inMemoryToken` / `authState$` may still be A until the `storage` **event** (that event fires in **other** documents, not in the tab that wrote). The interceptor does **not** wait for that event — it **reads localStorage** on 401.

If we ignored the mismatch and called `refresh_token` again with **old R**, many servers **rotate refresh tokens** (R already used by Tab B → R2). Second refresh **fails** → this tab **logs the user out** even though Tab B is fine. So: **retry original with A2, do not refresh again.**

Same idea as two requests in **one** tab: first 401 starts refresh; second 401 waits on `refreshTokenSubject`. 4c is the **other document** version (no shared `refreshTokenInProgress` flag across tabs).

**Q: After refresh, how do you know which APIs to run again? A Subject of URLs?**  
**No list.** Each HttpClient call is its own Observable. The interceptor **closes over that `HttpRequest`**. On 401 we `next.handle` **the same request** with new headers, or wait on **`refreshTokenSubject`** (doorbell for the new token, not a URL queue) and then retry **that** request. Calls that already succeeded are not replayed. See **§5 How we know which APIs to run again**.

**Q: 401 on the token API itself?**  
**Do not** refresh again (loop). Logout.

**Q: PUT /session 400/401/403 then POST /session — didn’t you say dead session = logout?**  
Two different “session died” stories. **Not a contradiction.**

| | Idle / `session_timeout` (§8) | PUT fails **after** a **successful** token refresh (this step 11b) |
|---|---|---|
| What died | This login’s **idle session** (user walked away). Auth-server marked EXPIRED. | The **row for id S** is gone or not updatable (`updateTokenBySessionId` count = 0). Common: **another device logged in** and tenant **session limit** inactivated the old session (`inValidateExcessSessions`). Or S was already invalid. |
| Did we mint a new access token first? | **No.** Interceptor sees logout code → **never** calls `refresh_token`. | **Yes.** `POST /oauth/token` with **R already succeeded**. We have **A2**. OAuth says the user is still allowed. |
| What we do | **Logout.** Password/SSO again. | **`POST /session`** with bearer **A2** → **new** `session_id` S2. Stay in the app. |

**Why PUT can fail while refresh still works:** OAuth **refresh_token** and auth-server **session row** are two stores. Session limit / logout-on-other-device can delete **S** without always killing **R**. Refresh grant proves the user; `POST /session` is a **new** session, not “undelete idle S.”

**If idle expired, we would not be here.** We never reach PUT. The interceptor already logged out at step 3d.

**Spoken:** “Idle dead session → login. After a successful token refresh, if PUT can’t update the old session id (often another device), we POST a new session with the new access token. Refresh token good, old session id gone — new session, not logout.”

**Q: PUT failed — what do we send on POST? How do we get the new session id?**  
We do **not** invent or send a new id. **PUT** was “update row **S**.” **POST** is “**create** a row,” same as first login.

1. `this.session = null` so the interceptor does **not** send the **dead** `session-key: S`.  
2. `POST {auth}/authserver/api/v1/session`  
   - body: **`{}`** (empty JSON)  
   - `Authorization: bearer A2` (the access token we **just** got from refresh)  
3. Auth-server reads **user from A2**, **generates** `session_id` (hash of username + time), **inserts** `ndsession`, returns `{ session: { session_id: S2, expiry, … }, user: { … } }`.  
4. FE `this.session = sessionData.session` → `localStorage['session']` is **S2**.  
5. Retry original product API with `session-key: S2` + bearer A2.

We never “look up the id that replaced S.” That old row is gone. **S2 is in the POST response.**

**Q: Is the access token the same as the other device’s login?**  
**No.** Each password/SSO login mints a **new** access + refresh pair. Phone login ≠ laptop’s A. Excess-session cleanup **deletes old session rows**; it does not mean both devices share one bearer. Our POST binds **this tab’s A2** (from **this** refresh) to **new S2**. The other device keeps **its own** access token on **its** session.

---

## 6. What goes on every request

`buildApiRequestHeaders` (HttpClient **and** MapLibre tiles that skip HttpClient):

| Header | Meaning |
|---|---|
| `Authorization` | `bearer <access>` (or Basic on token/SSO public calls) |
| `session-key` | `session_id` |
| `X-Selected-Tenant-Id` | Fleet/tenant scope |
| `X-Selected-Tenant-Unique-Name` | Unique name |
| `Accept-Language` | Dashboard locale |
| `X-Dashboard-Type` | `APP` |
| `clusterId` | If present |

Callers can **pin** `X-Selected-Tenant-Id` per request (bulk edit child tenant) so interceptor doesn’t overwrite and cause a fake 401 → logout.

---

## 7. Routing / AuthZ vs AuthN

Your login sequence is **correct**:

1. `POST /oauth/token` (`grant_type=password`) → token object  
2. Save whole object → `localStorage['token']`  
3. `POST /session` → save `localStorage['session']`  
4. Interceptor on later calls: `Authorization: bearer …`, `session-key`, tenant, language, `X-Dashboard-Type`

**401 is not the guard.** Interceptor = HTTP. Guard = **can this route activate?** (client-side, from storage we already have).

| Guard | Job |
|---|---|
| **`authGuard`** | **AuthN only** — “are you fully logged in?” If no → `/login?redirectUrl=…`. SSO `code` on pathname → login with query. |
| **`loginRedirectGuard`** | On **login page**: if already authenticated → wait permissions + tenant → landing (or `redirectUrl`). |
| **`routePermissionGuard`** | **AuthZ** — allowed routes / permission keys. Runs **after** authGuard on many features. |
| **`unauthorizedRedirectGuard`** | Logged in but **no** allowed route. |

### What `authGuard` actually checks

It does **not** call `/oauth/token`, does **not** look at 401, does **not** decode JWT expiry, does **not** check roles.

```typescript
export const authGuard: CanActivateFn = (_, state) => {
  if (authenticationService.isAuthenticated()) {
    return true; // allow the route
  }
  // SSO callback with ?code= on /app or /dashboard (hash router missed it)
  //   → UrlTree to /login?code=&state=&redirectUrl=
  // else → UrlTree to /login?redirectUrl=<this url>
};
```

`isAuthenticated()` is **all three** (AND):

```text
(has access_token on token OR session)
AND (session.session_id)
AND (twoFactorPending === false)
```

| Check | Pass | Fail (kick to login) |
|---|---|---|
| Access token | `localStorage['token'].access_token` (or session copy) | Empty storage / logged out |
| Auth-server session | `localStorage['session'].session_id` | Token only, no session yet |
| 2FA | Not pending | Password ok but TOTP not done — **not** treated as in-app |

So: **token + session + 2FA done** → `true`. Anything less → login, with `redirectUrl` so we bounce back after login.

**Permissions are the next guard** (`routePermissionGuard`): `PermissionsService.accessDecision$(permissionKeys)` after `/users/user/` (and similar) loaded. AuthGuard can let you in; you can still be sent to fallback / unauthorized if you lack the feature permission.

**Spoken ~20s:** “Auth guard is AuthN only. It calls isAuthenticated: access token, session id, 2FA not pending — all from storage we hydrated after login. If that fails we send login plus redirectUrl. SSO code on the pathname is copied onto the login route. 401 refresh is the interceptor. Can I open Safety vs Settings is routePermissionGuard.”

---

## 8. Logout / timeout / what “expiry” actually does

Two different numbers. **Do not treat them as calendar dates.** `authGuard` checks **neither**.

| Field | On which object | What it is | Does the **frontend** use it? |
|---|---|---|---|
| **`expires_in`** | Token (`IToken`) | OAuth **lifetime of the access token in seconds** (auth-server / spec) | **No timer.** We **store** it with the token JSON. We do **not** `setTimeout(expires_in)` and we do **not** refresh proactively. When the access token is dead, **APIs return 401** → interceptor refresh (§5). Enforcement is **backend**. |
| **`session.expiry`** | Session (`ISession`) | **Idle timeout in seconds** (configured inactivity window), **not** an epoch / “expires at 5pm” | **Yes.** `resetSessionInactivityTimer()` → `setTimeout(expiry * 1000)` → `notifySessionTimeout()`. Click / keydown / mousemove / touch / scroll **slides** the timer. Missing/invalid → fallback **30 min**. |
| **`session.updated` / `created`** | Session | Server timestamps | Server uses **`updated`** to decide idle. FE does **not** compute timeout from `updated`; we **mirror** idle with the sliding timer. |

```typescript
// AuthenticationService — session idle only
private resetSessionInactivityTimer(): void {
  const inactivityMs = session.expiry > 0 ? session.expiry * 1000 : 30 * 60 * 1000;
  this.sessionInactivityTimer = window.setTimeout(() => {
    this.notifySessionTimeout(); // same logout as failed refresh
  }, inactivityMs);
}
```

**Why both exist:** Access token is **short-lived** (resource APIs). Refresh + 401 keep you working without re-typing the password. Session idle is **“user walked away”** — even a still-valid access token must not leave the dashboard open.

### What auth-server does with `session.updated` (the server idle check)

Auth-server is **not** a clock that pushes logout to the browser. It stores a row: `expiry` = tenant config `timeout.seconds` (copied at `POST /session`), `updated` = last time this session was **touched**.

**Every Groups/Safety API does *not* call `POST /session`.** That POST is only **create login**. `PUT /session` is only **bind new access token after refresh**.

What happens on **every product API**:

```text
Browser  GET /restserver/...   (bearer + session-key)
    → restserver interceptor
    → POST /authserver/.../token/validate   (same bearer + session-key)
    → validateAndGetSession:
         idle? → EXPIRED + 401
         else maybe SET updated = now
    → restserver continues the real API
```

`updated` is **not** written on every single call. `shouldUpdateSession`: only if last `updated` is older than a **minutes** threshold (sysconfig). Clicking 20 APIs in 10 seconds ≈ **one** DB bump.

Backend “knows” expiry **lazily**: compare `now - updated > expiry seconds` on **that validate**. No cron required.

---

```text
now - session.updated  >  session.expiry seconds  ?
  YES → mark session EXPIRED, reject (session timeout / 401)
  NO  → allow; if last DB bump is older than a threshold (minutes),
        SET updated = CURRENT_TIMESTAMP  (slide idle on the server)
```

Same formula as `SessionUtil.isSessionTimedout`: `updated` is **before** (`now` minus `expiry` seconds).

So: **if no request that carries this session-key happens for `expiry` seconds**, the **next** API that checks the session fails idle — not a background “kick everyone at 12:00.” Value is **whatever that tenant configured** (FE 30 min is only the **fallback** if `expiry` is missing on the client).

**Not identical to the FE timer:**

| | Browser | Auth-server |
|---|---|---|
| What slides idle | Mouse / keyboard / scroll (`recordSessionActivity`) | **API** that validates `session-key` (and then only if past update threshold, so not every request writes DB) |
| When logout happens | `setTimeout` fires → we navigate login | Next authenticated call sees timed-out session → 401 / session-timeout; we then `notifySessionTimeout` |
| Wiggling mouse, no APIs | FE may log you out | Server `updated` stays old until a call; that call would also fail idle |

FE timer exists so we don’t sit on a live dashboard until the user clicks something that hits an API. Server check exists so a stolen token + stale session-key cannot keep calling APIs after idle.

**How long is the session? Does sliding `updated` mean it never dies?**

There is **no calendar “this login dies at 5pm”** and **no hard max from `created`**. Idle check is only `now - updated > expiry seconds`. If you keep using the dashboard (APIs that validate `session-key`, and mouse/keyboard for the FE timer), **`updated` slides and idle never fires**. Leave it idle for that window → next validate + FE timer log you out.

| Number | What | Default in product (tenant can change) |
|---|---|---|
| **`session.expiry` / `timeout.seconds`** | **Idle** window | Auth-server copies tenant `session.idle.timeout.timeout.seconds` onto the row at `POST /session`. Global `ndsysconfig` (`tenant_id = -1`) seed: **86400 s = 24 h**. No later SQL in-repo changes that number. Tenant can override. FE fallback if missing: **30 min**. Local mock/e2e JSON sometimes shows **604800 = 7 days** — that is **not** the backend default. |
| **`session.update.threshold`** | How often DB writes `updated` | Global **30 minutes**. Not the logout clock. |
| **Access `expires_in`** | OAuth access token (dashboard client `idms`) | **`access_token_validity` = 10800 s = 3 hours.** Absolute from issue. FE does not timer it; next API 401 → refresh. Independent of idle. These are **OAuth2 token-store tokens**, not a JWT the browser decodes. |
| **Refresh token** | Same `idms` client | **`refresh_token_validity` = 2147483647 s** (`Integer.MAX_VALUE` ≈ **68 years**). Effectively **does not expire on a clock** for dashboard. Spring still *can* expire a refresh token if that number is smaller (other clients do). Logout / revoke / missing row in token store → refresh **fails** even if the clock is fine. Default `reuseRefreshToken` left **true** (same R reused). |
| **Max parallel sessions** | Cap concurrent browser logins per user | Tenant `MaxParallel.DashboardSessions.PerUser`. Global seed **`-1` = unlimited**. If set to e.g. **2**, `POST /session` inactivates excess **oldest** active sessions so the new login fits. Missing key → same **-1**. |

**Still dies even if you keep clicking:** logout, admin revoke / status not ACTIVE, **max sessions** on another device, **refresh token** invalid (then 401 refresh fails → logout). Idle sliding does **not** mint a forever session if OAuth refresh is dead.

Access-token `expires_in` is still a **different** clock (OAuth token store). Idle session can die while the access token is still valid → 401 on session, not “refresh forever.”

### When the session is expired — we do **not** refresh it

**Idle-expired session ≠ access-token 401.** You do **not** call `grant_type=refresh_token` to revive an idle session. User must **log in again** (`POST /oauth/token` password/SSO + **new** `POST /session`).

**Path A — FE timer fires first** (mouse idle for `session.expiry` seconds):

```text
setTimeout → notifySessionTimeout()
  → clear token + session (localStorage + memory)
  → sessionTimedOut$ 
  → /login?hardRedirect=true
  → window reload (rebuild tenant/permission streams)
```

No refresh API. Guard will fail `isAuthenticated()` because storage is empty.

**Path B — next API hits auth-server first** (session already EXPIRED in DB):

```text
API 401 + code like session_timeout / SESSION_EXPIRED
  → normalizeAuthError.shouldLogout = true
  → interceptor does NOT tryRefreshAccessToken
  → notifySessionTimeout()  (same as Path A)
```

`session_timeout` is a **logout code**, not a refresh-eligible code (`invalid_token` is refresh).

**Path C — iframe `/app`:** child posts `nuxSessionExpired` → parent same `notifySessionTimeout()` (not nested `/app/login`).

**What `PUT /session` is (do not mix this in):** that runs **after a successful access-token refresh**, to attach the **new** access token to the **same still-alive** `session_id`. If that PUT fails (other device killed the id) we **`POST /session`** and get a **new** session — still only because **refresh token worked**. That is **not** the idle-timeout path.

**Spoken ~20s:** “If the session is idle-expired we don’t refresh it. We clear storage and send login. Token refresh is only when the access token 401s and the session is still valid — then we PUT the same session id. Idle means log in again.”

---

- Clear in-memory + `clearAuthData()` (`token`, `session`, tenant context, `userId`)  
- Clear Geotab embed session, GDPR flags  
- Stop idle timer  
- Tear down FCM  
- Navigate login (`hardRedirect`) + **reload** so tenant/permission streams rebuild  

---

## 9. Files to name (no paths to a private clone)

| Class | Role |
|---|---|
| `AuthenticationService` | login, token, session, refresh, idle, storage events |
| `AuthStorageService` | localStorage / cookie read, shared vs prefixed keys |
| `OAuthInterceptor` | headers + 401 single-flight refresh |
| `SsoLoginService` | IdP redirect + authcode |
| `authGuard` / `loginRedirectGuard` | route AuthN |
| `getAuthRuntimeConfig()` | auth/API origins |

---

## 10. Q bank (practice out loud)

**Q: JWT in cookie or localStorage?**  
We use **localStorage** (shared with AngularJS console / `/app`). Cookie is **legacy fallback**. I would **not** recommend that on a greenfield app; we did it for **one login across three UIs**. XSS is the cost. **Next:** HttpOnly refresh cookie — see **§1 Why token and session**.

**Q: Why session + OAuth token, not token only?**  
OAuth access = “this request.” Session = **this login** (idle, 2FA, kick device, bind new access after refresh). Token-only loses idle and revoke-now. See **§1**.

**Q: How do you refresh? Is refresh_token saved?**  
See **§5 “Refer later”**. Short: **401** (not a timer). Refresh token lives **inside** `localStorage['token']` (`IToken.refresh_token`), not its own key. Call **`POST /oauth/token` `grant_type=refresh_token`** (client Basic) → **`PUT /session`** → retry original once. Missing refresh token / failed refresh → logout. Concurrent 401s wait on one in-flight refresh. Idle ≠ 401 refresh.

**Q: Session expired — do we refresh the session?**  
**No.** Idle/expired session → **logout** (`notifySessionTimeout`), not `refresh_token`. User logs in again. `PUT /session` only after **access-token** refresh, same `session_id`. See **§8 When the session is expired**.

**Q: Silent refresh on load?**  
Hydrate from storage. Don’t POST `/session` just to set language (that used to force extra refresh — IDMS-51291).

**Q: MFE?**  
Same tokens, **one** auth singleton (kernel) so remotes don’t each login. Host interceptor or shared `AuthService`. See MFE story.

**Q: CSRF?**  
Bearer in header (not cookie-as-credential for APIs) reduces classic cookie CSRF. Still XSS-sensitive because JS can read the token.

---

## 11. Don’t mix

- Env / which host → file **7**.  
- FCM after `createSession` → file **11**.  
- DI `providedIn: 'root'` for auth services → file **6**.
