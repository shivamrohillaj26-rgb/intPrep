# OneTrust — Auth revision (diagrams + Q&A)

**Use this to revise.** Deep dump stays in [ONETRUST_AUTH_FLOW.md](./ONETRUST_AUTH_FLOW.md). SSO: [ONETRUST_SSO.md](./ONETRUST_SSO.md). Iframe: [ONETRUST_IFRAME_BRIDGE.md](./ONETRUST_IFRAME_BRIDGE.md).

Say **IDMS NUX + auth-server**. Do not name laptop folders.

---

## Cheat sheet (numbers)

| Clock | What | Value |
|---|---|---|
| Access token | Absolute life from issue | **10800 s = 3 hours** (`idms` client). FE has **no timer**. Next API **401** → refresh. |
| Refresh token | Absolute life | **2147483647 s** ≈ 68 years. **Not a real TTL.** Dies on **revoke / logout / missing store row**. |
| Session idle | Inactivity | Tenant `timeout.seconds`. Global seed **86400 s = 24 h**. FE fallback if missing: **30 min**. |
| Session `updated` write | DB throttle | **30 min** (`session.update.threshold`). Not the logout clock. |
| Max parallel sessions | Concurrent browser logins | **`-1` = unlimited**. Tenant can set e.g. 2 → oldest sessions deleted. |

**Sliding idle:** keep using the app → `updated` slides → **idle does not fire**. Walk away 24 h → next validate + FE timer → **logout**. Refresh does **not** revive idle.

**Not JWT in the browser.** Dashboard tokens are **OAuth2 token-store** strings + `expires_in`. UI does not decode `exp`.

---

## 1. Whole map (start here)

```mermaid
flowchart TD
  A[Login page] --> B{SSO fleet?}
  B -->|yes| C[SSO check then IdP then same session]
  B -->|no| D["POST /oauth/token password"]
  D --> E[Save token in localStorage]
  E --> F["POST /session empty body + bearer"]
  F --> G{2FA pending?}
  G -->|yes| H[TOTP QR or code]
  H --> I[Guard: token AND session_id AND 2FA false]
  G -->|no| I
  I --> J[In app: Groups Safety APIs]
  J --> K[Interceptor: bearer + session-key]
  K --> L[Backend token-validate with session-key]
  L --> M{Idle?}
  M -->|yes| N[401 session timeout → logout]
  M -->|no| O[Maybe bump updated]
  O --> P{Access token OK?}
  P -->|yes| Q[API 200]
  P -->|no| R[401 not idle]
  R --> S[Refresh branch]
```

SSO detail: file **17**. This file is password + session + 401.

---

## 2. Login branch

```mermaid
flowchart TD
  A["POST /oauth/token grant_type=password Basic client_id"] --> B{200?}
  B -->|no| C[Stay on login]
  B -->|yes| D["IToken: access A, refresh R, expires_in"]
  D --> E["localStorage token = whole object"]
  E --> F["POST /session {} + bearer A"]
  F --> G["Server makes session_id S copies idle seconds onto expiry"]
  G --> H["localStorage session"]
  H --> I[Start FE idle timer = expiry seconds]
  I --> J{twofa_status}
  J -->|0 off| K[Enter app]
  J -->|1 ASSIGNED| L[QR + TOTP]
  J -->|2 ACTIVE| M[TOTP only]
  L --> N["POST totp/validate or skip if grace"]
  M --> N
  N --> K
```

**Q: Token then session — is that right?**  
Yes. Token first. Session second. Interceptor then puts **both** on every product call.

**Q: Who invents `session_id`?**  
**Auth-server**, not the FE. Hash of username + time. FE only stores what POST returns.

**Q: Same access token on another device?**  
**No.** Each login mints **its own** A and R. Devices share **user**, not tokens. Max-sessions can **kill old S**, not clone A.

---

## 3. Does every API call the session API?

**No `POST /session` on every Groups/Safety call.**  
POST = create login. PUT = after **access refresh**, bind new A to S.

**Yes, almost every dashboard API hits session *check*:**

```mermaid
flowchart TD
  A[Browser GET restserver Groups] --> B[OAuthInterceptor adds bearer + session-key]
  B --> C[Restserver AuthnInterceptor]
  C --> D["POST auth-server token/validate same bearer + session-key"]
  D --> E{Session row}
  E -->|missing| F[401]
  E -->|idle: now - updated greater than expiry seconds| G[Mark EXPIRED 401 session_timeout]
  E -->|ok| H{Last updated older than 30 min?}
  H -->|yes| I["SET updated = now"]
  H -->|no| J[No DB write]
  I --> K[Real Groups handler]
  J --> K
```

**Q: Does every API update `updated`?**  
**Checks** almost always. **Writes** only if last bump is older than **~30 minutes**.

**Q: How does backend know expired?**  
**Lazy.** Next validate. No cron. Formula: `updated` older than `now - expiry seconds`.

**Q: Mouse vs API idle?**  
FE timer slides on **mouse/keyboard**. Server slides on **validate**. Mouse-only, no APIs: FE may logout while server `updated` is stale until the next call (that call would also fail idle).

---

## 4. Two clocks (do not mix)

```mermaid
flowchart LR
  subgraph Access["Access token — 3 hours"]
    A1[Issued] --> A2[APIs work]
    A2 --> A3[Dead]
    A3 --> A4[401 → refresh]
  end
  subgraph Idle["Session idle — 24h default"]
    B1[updated slides while you work] --> B2[Walk away]
    B2 --> B3[next validate or FE timer]
    B3 --> B4[Logout — NO refresh]
  end
```

| Field | Object | FE uses it? |
|---|---|---|
| `expires_in` | Token | **Stored only.** No `setTimeout`. Backend 401. |
| `session.expiry` | Session | **Yes.** `setTimeout(expiry * 1000)` → logout. Slide on activity. |
| `session.updated` | Session | **Server** idle. FE does not compute from it. |

**Q: Keep updating — does session still expire?**  
**Idle: no**, if you keep using it. **Still can die:** logout, max sessions, refresh revoked.

**Q: Session expired — refresh it?**  
**No.** Login again. PUT session is **not** “revive idle.”

---

## 5. 401 — first branch (the important fork)

```mermaid
flowchart TD
  A[Product API 401] --> B{Body session_timeout / SESSION_EXPIRED?}
  B -->|yes| C[Logout — idle]
  B -->|no| D{2FA pending on 2FA URL?}
  D -->|yes| E[Fail — no refresh]
  D -->|no| F{Have access token?}
  F -->|no| C
  F -->|yes| G{Storage token !== snapshot A?}
  G -->|yes| H[Other tab already refreshed — retry original]
  G -->|no| I{Refresh already in progress?}
  I -->|yes| J[Wait on refreshTokenSubject then retry]
  I -->|no| K[This call owns refresh]
```

Idle 401 **never** goes to `/oauth/token` refresh.

---

## 6. Refresh branch (access dead, session still alive)

```mermaid
flowchart TD
  K[Owner: refreshTokenInProgress true] --> L["POST /oauth/token grant_type=refresh_token R + Basic client NOT bearer A"]
  L --> M{200?}
  M -->|no| N[Logout]
  M -->|yes| O[Save A2 R2 over localStorage token]
  O --> P["PUT /session body sessionId S bearer A2"]
  P --> Q{PUT 200?}
  Q -->|yes| R[Same S bound to A2]
  Q -->|400/401/403| S["S gone — often max sessions"]
  S --> T["session = null"]
  T --> U["POST /session empty body bearer A2"]
  U --> V[Server returns NEW S2]
  R --> W[refreshTokenSubject.next token]
  V --> W
  W --> X[Each waiting HttpClient retries ITS own request]
  X --> Y[200 — user stays in app]
```

**Q: After 401 which APIs run again?**  
Not a global URL list. Each HttpClient Observable **stayed open**. Interceptor **retries that `HttpRequest`**. Two 401s = two retries after **one** token POST.

**Q: What is `refreshTokenSubject`?**  
A **doorbell** (`BehaviorSubject`), not a queue of URLs. Waiters: `filter(token != null)`, `take(1)`, then retry.

**Q: PUT failed — you said logout, now POST?**  
Idle timeout = logout. **PUT 0 rows after a successful refresh** = old S inactivated, **A2 is already good** → **POST new session**. Different branch.

**Q: What do we send on that POST?**  
**Empty body.** Bearer **A2**. Server generates **S2**. We do not invent the id.

**Q: Cross-tab — 401 body send A2?**  
**No.** Other tab wrote **localStorage**. This tab `getItem` sees A2. Compare to snapshot A taken at request start → retry, do not second-refresh (R may have rotated). `storage` event is **other documents only**; same-tab read is just `getItem`.

---

## 7. Max parallel sessions

```mermaid
flowchart TD
  A["POST /session new login"] --> B{Limit == -1?}
  B -->|yes| C[Keep all sessions]
  B -->|no| D[Count ACTIVE for this user]
  D --> E{Count >= limit?}
  E -->|yes| F["Delete oldest ORDER BY updated ASC"]
  F --> G[Those session_ids fail PUT/validate]
  E -->|no| C
```

Default **unlimited**. If tenant sets 2: third login kills least-recently-updated.

---

## 8. Auth guard (not 401)

```mermaid
flowchart TD
  A[Route] --> B["isAuthenticated"]
  B --> C{access_token?}
  C -->|no| L["/login?redirectUrl="]
  C -->|yes| D{session.session_id?}
  D -->|no| L
  D -->|yes| E{twoFactorPending === false?}
  E -->|no| L
  E -->|yes| F[AuthN pass]
  F --> G[routePermissionGuard AuthZ]
```

Guard does **not** decode JWT `exp`, does **not** call `/oauth/token`, does **not** check idle `updated`. Permissions are a **second** guard.

---

## 9. Why token + session (one picture)

```mermaid
flowchart TD
  Need[Need] --> Idle[Idle logout while access still valid]
  Need --> TFA[2FA CREATED vs ACTIVE]
  Need --> Kick[Kick device / max sessions]
  Need --> Revoke[Kill this login now]
  JWT[Token only] -.->|bad at those| Need
  Both[OAuth access+refresh AND session-key] --> Need
```

**Worth it for IDMS:** B (token + session). JWT-only is for stateless public APIs. **Next:** HttpOnly refresh cookie (XSS tax today because **three UIs** share `localStorage`). CSRF is the cookie tax.

OAuth **2**, not 1.

---

## 10. 2FA — UI, APIs, “is the QR scanned?”

**Not SMS.** TOTP: 6–8 digit code from Google Authenticator (etc.). Password is factor 1. Code is factor 2. Admin turns it on in **Portal Users**.

**We never get a “QR scanned” callback.** The phone app is offline. The only proof is: user types a code that matches the **shared secret**. First success: `twofa_status` 1 → **2**, session **CREATED → ACTIVE**.

### After password — which UI?

`POST /session` returns `user.twofa_status`. Login page reads that (not a separate “is 2FA on?” API).

```mermaid
flowchart TD
  P["Password OK. Token saved. POST /session"] --> S["Session row: CREATED if 2FA on else ACTIVE"]
  S --> U{twofa_status}
  U -->|0 off| APP[Enter app. twoFactorPending false]
  U -->|1 ASSIGNED first time| ENROLL[Stay on login step two-factor]
  U -->|2 ACTIVE already enrolled| CODE[Stay on login step two-factor]
  ENROLL --> QR["GET /auth/twofactor/qr-image"]
  QR --> UI1[UI: helper + QR image + code box + Skip if grace]
  CODE --> UI2[UI: code box only — no QR]
  UI1 --> V[User types 6-8 digits]
  UI2 --> V
  UI1 --> SK{Skip visible?}
  SK -->|grace date in the future| SKIP["POST /auth/twofactor/twofa/skip"]
  SK -->|no| V
  V --> VAL["POST /auth/twofactor/totp/validate totp"]
  VAL --> OK{200?}
  OK -->|no| ERR[Stay on login — wrong code / maybe lock]
  OK -->|yes| GO[twoFactorPending false. Session ACTIVE. Enter app]
  SKIP --> GO
```

**SSO password-skip:** after IdP, FE sets `viaSsoLogin` and **does not** show this step (legacy). IdP was the other factor.

### What we send / get (all three 2FA URLs)

Same headers as other auth calls: **`Authorization: bearer A`** + **`session-key: S`**. Session is still **CREATED**. These three URLs are allowlisted: interceptor does **not** 401→refresh/logout on them. Groups/Safety would fail — guard never lets you there yet.

| Call | When | Body | Response | What UI does |
|---|---|---|---|---|
| `GET …/auth/twofactor/qr-image` | Only status **1** | none. `Accept: image/png` | **200** PNG as **base64 bytes** (arraybuffer) | Convert to `data:image/png;base64,…` and show `<img>`. Loading / error / **Retry** if GET fails. |
| `POST …/auth/twofactor/totp/validate` | Submit code | `{ "totp": 123456 }` number 6–8 digits | **200** success message. **400** wrong code (or account locked after max attempts) | 200 → pending **false**, enter app. 400 → stay on 2FA, show error. |
| `POST …/auth/twofactor/twofa/skip` | Skip button | `{}` | **200** if `twofa_grace_period` **after now**. Else 400 | Same as success: pending **false**, session **ACTIVE**. User is still **ASSIGNED** until a later TOTP enroll. |

**QR GET does not mean enrolled.** It only paints the secret as a QR (`otpauth://` for the authenticator). Scanning happens **on the phone**. We never hear about the scan.

### How we “know” it is scanned / enrolled

```mermaid
flowchart TD
  Q[QR shown] --> P1[User may or may not scan — we cannot see it]
  P1 --> T[User submits code]
  T --> Svr[Auth-server verifyTOTP against twofa_shared_key]
  Svr -->|match| D[session ACTIVE + twofa_status = 2]
  Svr -->|no match| W[400 — QR still on screen]
  D --> Next[Next login: status 2 — no QR, code only]
```

If they scanned but never typed the code: still **ASSIGNED**, still **CREATED**, still on login. Scan is invisible to us.

### `twoFactorPending` (memory only)

Password click → **true** immediately so `authGuard` cannot treat token+session as “in the app” mid-login. Validate/skip **200** → **false**. Password fail → **false**. Not stored in `localStorage`.

### Spoken ~30s

> After password we already have a token and a session, but if twofa_status is 1 or 2 the session is CREATED and the guard stays out. Status 1 we GET a QR image with bearer and session-key — we do not know if they scanned it. They type the TOTP, we POST validate, server checks the shared secret, flips session ACTIVE and status 2. Status 2 next time is just the code box. Skip exists only during grace. SSO skips our TOTP.

---

## Q index (your questions → one line)

| You asked | Answer |
|---|---|
| How do we get / save / refresh? | Token POST → save → session POST → save. Refresh **only on 401**, not a timer. |
| Is refresh_token saved? | **Inside** `localStorage['token']`. No separate key. |
| What does auth guard check? | Token **and** `session_id` **and** not 2FA pending. |
| Do we use token/session expiry dates on FE? | Token `expires_in`: **no timer**. Session `expiry`: **idle setTimeout**. |
| What does auth-server do with `updated`? | Idle check + maybe slide timestamp on validate. |
| Session expired — refresh session? | **Logout.** |
| 401 step by step? | Fork idle vs refresh. Refresh = token POST then PUT session then retry. |
| PUT 400 then POST — vs logout? | After **successful** token refresh if S is gone. Idle never gets here. |
| How do we get new session id? | **POST /session** empty + A2. Server returns S2. |
| Other tab already refreshed? | Snapshot A vs `getItem` now. Retry. Don’t double-refresh. |
| How do we know which APIs to replay? | Each Observable retries **itself**. Subject is a doorbell. |
| Two APIs 401? | First owns refresh. Second waits. Both retry. |
| Why not JWT only? | Idle, 2FA, kick device, revoke-now. |
| OAuth 1 vs 2? | We use **OAuth 2**. |
| Token same on other device? | **No.** |
| Every API POST session? | **No.** Validate + throttled `updated`. |
| Session limit / keep updating? | Idle **24h** default, slides. Parallel default **-1**. |
| JWT / refresh expiry? | Access **3h**. Refresh **~never** unless revoked. |
| 2FA UI / QR scanned? | Status 1: GET QR + code. Status 2: code only. **No scan webhook** — only TOTP validate proves it. |

---

## Spoken 45s (open with this)

> OAuth2 password grant, then POST session. We send bearer and session-key on every dashboard API. Access lives three hours — 401 then refresh token, PUT session, retry. Idle is a separate 24-hour inactivity window on the session row; we do not refresh that, we log out. Parallel sessions default unlimited. Refresh token is practically non-expiring until revoke.
