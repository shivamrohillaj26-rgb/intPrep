# OneTrust — OAuth, OAuth 1 vs 2, JWT, why session

**Separate from** login step-by-step ([ONETRUST_AUTH_REVISION.md](./ONETRUST_AUTH_REVISION.md) / [ONETRUST_AUTH_FLOW.md](./ONETRUST_AUTH_FLOW.md)). This file is the **concepts** round: “what is OAuth / JWT / why session.”

Say **OAuth** (not “oath”). We use **OAuth 2**.

---

## 0. 30s opener

> OAuth is a **protocol** for getting **tokens** without giving every API the password. JWT is a **format** for a token — three Base64 parts, signed. They are **not the same thing**. An OAuth access token **may** be a JWT or an **opaque** string in a server token store. IDMS NUX uses **OAuth 2** access + refresh from auth-server; those are **store-backed tokens**, not something the browser decodes as JWT `exp`. We **also** send a **session-key** because OAuth does not give us idle logout, 2FA half-login, or kick-this-device.

---

## What our auth microservice actually creates (NUX login)

**Yes — there is a dedicated auth service** (auth-server). NUX calls it for `/oauth/token`, `/session`, token-validate, 2FA.

**Dashboard login tokens are not JWTs.** We did not write a custom crypto format either. Spring **OAuth 2** `DefaultTokenServices` + **`NDJdbcTokenStore`**:

```text
POST /oauth/token  (password or refresh)
  → Spring mints access_token = UUID string  (e.g. 2ec37f53-7d20-47cf-…)
  → refresh_token = another random store value
  → serialize token object into table oauth_access_token
  → JSON back to FE: access_token, token_type=bearer, refresh_token, expires_in

There is no JwtAccessTokenConverter on that endpoint.
Token enhancer only STAMPS extra fields (tenant_id, created_on) onto the store object.
It does NOT wrap the value as header.payload.signature.
```

How APIs trust it: **look up the UUID** in the token store (and check `session-key`). Not “verify JWT signature on restserver.”

**`session_id`:** also **our row**, generated on `POST /session` (hash of username + time). Not a JWT.

**Where JWT *does* appear in that same service (do not mix with NUX Bearer):**

| JWT here | For |
|---|---|
| **Inbound SSO** (`JWTSSOService`) | IdP sent **us** a JWT. We **parse/verify** it, then mint a normal **UUID OAuth** access token. |
| **Outbound** `Jwts.builder()` in AuthController | **Data-platform / maps / analytics** style tokens for other backends. **Not** `localStorage['token']`. |

**Spoken ~20s:** “Auth-server is our OAuth 2 authorization server. Login access token is an opaque UUID in oauth_access_token, Bearer on the wire. We don’t decode JWT in the dashboard. SSO may consume an IdP JWT, then we still issue our store token. A few internal platforms get separate signed JWTs.”

---

## 1. What is OAuth?

**OAuth** = **Open Authorization**. A standard so an app can call APIs **as the user** (or as itself) **without** storing the user’s password on every service.

| It is | It is not |
|---|---|
| A **protocol**: how to **get** and **use** tokens (`/oauth/token`, grants, Bearer header) | A **token format** |
| **Authorization** (“this client may call these APIs”) | Full **identity** product by itself (OpenID Connect sits **on** OAuth 2 for “who is this user”) |
| Password / refresh / auth-code / client-credentials **grants** | “We put a JWT in localStorage” (that can be any homemade auth) |

**Our grant for dashboard login:** `POST /oauth/token` `grant_type=password` (SPA + auth-server). SSO later uses **authorization code**. Refresh uses `grant_type=refresh_token`.

```text
User password  →  auth-server  →  access_token + refresh_token
Every API      →  Authorization: Bearer <access_token>
```

**Spoken ~15s:** “OAuth is how we mint and refresh tokens. The password hits auth-server once. After that APIs see a bearer, not the password.”

### If they ask: “What is a protocol?”

A **protocol** is a **shared rulebook**: both sides agree *how* to talk so the other side can understand.

It is **not** GET vs POST. GET and POST are **methods** (verbs) **inside HTTP**.

Stack (bottom → top), all “protocols” at different jobs:

```text
TCP          — bytes arrive in order
TLS          — those bytes are encrypted  (HTTPS = HTTP over TLS)
HTTP         — request/response: URL, headers, body, status 200/401
               methods: GET (read), POST (create/submit), PUT, DELETE
OAuth 2      — extra rules ON TOP OF HTTP:
               POST this path with this form body, then send
               Authorization: Bearer … on later calls
```

**OAuth does not replace HTTP.** Login is still an **HTTP POST** to `/oauth/token`. Groups is still an **HTTP GET**. OAuth only says *which* POST, *which* fields (`grant_type`), *which* header (`Bearer`).

| They say | You say |
|---|---|
| “Is POST a protocol?” | **No.** POST is an **HTTP method**. Protocol here is **HTTP**. |
| “OAuth protocol?” | **Yes.** Rulebook for tokens. It **uses** HTTP. |
| “HTTPS protocol?” | HTTP + TLS. We need it so Bearer isn’t stolen on the wire. |

**Spoken ~15s:** “Protocol means agreed rules. HTTP is how the browser talks to the server. GET and POST are HTTP methods, not protocols. OAuth 2 is a rulebook that sits on HTTP: how we get a token and how we attach Bearer.”

### If they say: “Explain OAuth 2”

**Say this (~45s), then stop unless they ask 1 vs 2 or JWT:**

> OAuth 2 is an **authorization protocol**. The user does **not** type their password into every API. They prove themselves once to an **authorization server**. That server gives the app an **access token** — a string. The app then calls **resource servers** with `Authorization: Bearer <access>`. Possession of that string is enough; we rely on **HTTPS** so nobody sniffs it. Access is **short-lived**. A **refresh token** is a longer secret used only at the token endpoint to mint a new access token without the password. How you get the first tokens is a **grant**: we use **password** for dashboard login and **refresh_token** after 401; SSO uses **authorization code**. OAuth 2 is **not** a token format — the access value can be a UUID or a JWT. It is **not** HTTP; it **uses** HTTP POST/GET. It also does **not** define idle logout or kick-this-device — that’s why we add a **session**.

**Roles (if they want names):**

| Role | In IDMS |
|---|---|
| Resource owner | The portal user |
| Client | NUX SPA (`idms`) |
| Authorization server | **auth-server** (`/oauth/token`) |
| Resource server | restserver / Groups / Safety APIs |

**One paragraph (written):** OAuth 2.0 (RFC 6749) is a framework for delegated access: a client obtains tokens from an authorization server and uses a Bearer access token to call APIs over TLS, instead of sending the user’s password on every request. Grants (password, authorization code, refresh, client credentials) are just different ways to mint those tokens. Access tokens are short; refresh tokens mint new access tokens. The spec does not require JWT and does not define application session idle or 2FA.

---

## 2. OAuth 1 vs OAuth 2

We use **OAuth 2.0**. Not 1.0a.

| | **OAuth 1.0a** | **OAuth 2.0** (us) |
|---|---|---|
| How each API is trusted | **Sign** the request (HMAC of method + URL + params + secrets) | **Bearer** token over **HTTPS** — whoever has the string is the caller |
| Tokens | Request token → access token; no refresh grant like ours | **Access** (short) + **refresh** (long) |
| SPA | Painful (crypto in the browser) | POST `/oauth/token`, interceptor attaches Bearer |
| SSO | Awkward | Auth **code** + IdP (Okta, etc.) is normal |
| Assumption | Network might be hostile / no TLS | TLS is required; don’t leak the bearer |

**Difference in one line:** OAuth 1 **proves** every request with a signature. OAuth 2 **presents** a secret bearer and trusts HTTPS.

### OAuth 1 — what “sign the request” actually means

OAuth **1** is from a world where HTTP might be **plain**, so you **must not** put a reusable secret on the wire the way we put `Bearer <token>` today.

You still have secrets, but they **stay on the client and server**. Each call sends a **one-time signature** of *this* request. Steal the signature from one GET and you cannot replay it as a POST to another URL — the hash would not match.

**HMAC** = **Hash-based Message Authentication Code**. Plain English: **hash(message + secret)**.

- **Hash** (here usually **SHA-1** in OAuth 1: `HMAC-SHA1`): turns any string into a fixed fingerprint. Change one character → fingerprint changes. You cannot reverse it to get the secret.
- **Keyed:** both sides already share `consumer_secret` (app) and `token_secret` (user). They can recompute the same HMAC. An attacker who only sees the URL **cannot**, because they don’t have the secrets.

So “sign” ≠ putting your name on a PDF. It means: **run HMAC on a canonical copy of the request; send the result as `oauth_signature`.** Server does the same math. Equal → you knew the secrets **and** the request was not tampered.

**What goes into that HMAC** (the “method + URL + params” line):

```text
1. Collect a string that describes THIS call (signature base string):

   HTTP_METHOD  &  percent-encoded URL  &  sorted params

   Example pieces:
     method = GET
     url    = https://api.example.com/1.1/statuses/home_timeline.json
     params = oauth_consumer_key, oauth_nonce, oauth_timestamp,
              oauth_token, oauth_signature_method=HMAC-SHA1,
              plus any query/body fields  (all sorted, encoded)

2. Signing key (the HMAC secret — NEVER sent):

     consumer_secret  &  token_secret

3. oauth_signature = Base64( HMAC-SHA1(base_string, signing_key) )

4. Send Authorization: OAuth oauth_consumer_key="…", oauth_token="…",
                         oauth_nonce="…", oauth_timestamp="…",
                         oauth_signature="…"
   Secrets themselves are not in the header.
```

| Piece | Why |
|---|---|
| **Method** (GET vs POST) | Attacker cannot reuse a signed GET as a delete |
| **URL** | Signature is for **this** endpoint |
| **Params** (including nonce + timestamp) | Tamper a query field → hash breaks. Nonce/time stop **replay** of the same signature |
| **Secrets** (only as HMAC **key**) | Prove you are the app + user without shipping the secrets |

**Tiny story:** You and the bank share a stamp ink (secret). Each letter (request) you stamp a unique seal made from the letter’s text. The bank stamps the same text. Seals match → genuine letter. A thief who photocopies one seal cannot write a new letter — the text would not match the seal.

**Why SPAs hate OAuth 1:** every interceptor must collect params, sort, encode, HMAC. Secrets in JS = XSS steals them anyway. With TLS, OAuth 2’s Bearer is enough for “this caller holds the token.”

**OAuth 2 we use:** no HMAC per Groups call. Header is `Authorization: Bearer <access>`. HTTPS protects the pipe. Session-key is our extra login id, not an OAuth 1 signature.

### Same API, two worlds (toy example)

You want: **`GET https://idms.example/alerts?vehicle=12`**

**OAuth 1 — prove this exact call**

```text
Shared secrets (NEVER sent):  app_secret = "APP"   user_secret = "USER"

Build one string from THIS request:
  GET
  & https://idms.example/alerts
  & oauth_nonce=n1 & oauth_timestamp=1710000000 & vehicle=12  (sorted)

HMAC-SHA1( that string , key="APP&USER" )  →  pretend result  "SIG9"

Wire:
  GET /alerts?vehicle=12
  Authorization: OAuth oauth_token="t1", oauth_nonce="n1",
                       oauth_timestamp="1710000000", oauth_signature="SIG9"
```

Server already has APP and USER. It rebuilds the same string and HMAC. **SIG9 matches → OK.**

| Attack | What happens |
|---|---|
| Change `vehicle=12` to `99` | Server HMAC ≠ SIG9 → **reject** |
| Copy SIG9 onto `DELETE /alerts` | Method in the string changed → **reject** |
| Replay same SIG9 later | Timestamp/nonce old → **reject** |
| Sniff SIG9 on HTTP | Useless for a *different* call. Still bad for **this** call until nonce expires |

You never send `APP` or `USER`. You send a **seal of this letter**.

**OAuth 2 — show the key card (what we do)**

```text
Login once: POST /oauth/token  →  access_token = "2ec37f53-7d20-47cf-9539-1d0c5f6f8c9b"
            (looks like a UUID — not a JWT; no two dots)

Every call:
  GET /alerts?vehicle=12
  Authorization: Bearer 2ec37f53-7d20-47cf-9539-1d0c5f6f8c9b
  session-key: <login id>     ← our extra header, not OAuth 1

No HMAC. No nonce. HTTPS hides the Bearer. Auth-server looks the UUID up in oauth_access_token.
```

If someone **steals** that UUID, they can call **any** API until we delete the row or the session. That is the Bearer deal. OAuth 1 made stealing one signature less useful for other URLs; OAuth 2 assumes **TLS + short access + refresh + (for us) session**.

**Hotel picture:** OAuth 1 = every door needs a **wax seal that matches that door**. OAuth 2 = one **key card**; the hallway is a locked tunnel (HTTPS).

### Why OAuth 2 existed

OAuth 1 **worked** but teams hated it: clocks must match, percent-encoding bugs, HMAC in every client (especially **JavaScript and mobile**), no clean **refresh**, ugly for **SSO**. By ~2012 **HTTPS was normal**, so “don’t put a bearer on the wire” was less of a reason. OAuth 2 made the common case **one header** and added **grants** (password, auth code, refresh, client credentials). Cost: if the bearer leaks, it is reusable — so we use TLS, 3-hour access, refresh, **and** `session-key`.

| | OAuth 1 | OAuth 2 |
|---|---|---|
| **Advantage** | Request can’t be silently edited; secrets not sent; OK-ish on HTTP | Simple for SPAs; refresh; SSO; we actually ship this |
| **Disadvantage** | Hard, slow, secrets still in the client app | Stolen Bearer works until revoke; **must** have HTTPS |
| **We pick** | No | **Yes** + session row |

**Spoken ~25s:** “OAuth 1 HMAC-signs method, URL, and params so the server knows this exact call wasn’t changed. OAuth 2 just sends Bearer over HTTPS. 2 won because 1 was too hard for browsers and HTTPS became the default. IDMS is OAuth 2.”

**When OAuth 1 was worth it:** old public HTTP APIs (classic Twitter). **Not** a fleet dashboard SPA.

### Is OAuth 1 still used? Do I need to have shipped it?

**You have not used OAuth 1 at work.** IDMS NUX is **OAuth 2**. Say that. Then show you know the history so you don’t freeze.

| When | What |
|---|---|
| **2007–2010** | OAuth 1.0 / **1.0a** (1.0a patched a session-fixation hole). Default for “login with Twitter / Flickr.” |
| **2012** | **OAuth 2.0** RFC 6749. New platforms standardize on 2. |
| **~2012+** | Google and most IdPs **drop** OAuth 1. SPAs/mobile go Bearer + HTTPS. |
| **Today** | **New work = OAuth 2 / OpenID Connect.** OAuth 1 is **legacy**, not dead. |

**Who still talks OAuth 1.0a (HMAC-SHA1):**

- **X / Twitter** — still documents 1.0a (request token → authorize → access token, sign every call). API v2 also has **OAuth 2**. Some endpoints even **forbid** 1.0a and want Bearer 2.  
- **Flickr** — public API still **OAuth 1.0a**.  
- **Old enterprise / commerce APIs** — some NetSuite / Magento-era / partner integrations. You meet it as **“sign this request with HMAC”** in a vendor SDK, not as a greenfield SPA.

You will **not** see OAuth 1 on a modern Okta/Auth0/Azure AD dashboard login. Those are **OAuth 2 + OIDC**.

**If they ask “have you used OAuth 1?”**

> I haven’t implemented it in production. Our product is OAuth 2 Bearer plus a session. OAuth 1 was the 2007–2012 Twitter/Flickr style: HMAC-sign method, URL, and params so you didn’t send a reusable Bearer on HTTP. OAuth 2 took over once HTTPS was normal and clients got too hard. X and Flickr still offer 1.0a; if I had to call them I’d use a signing library, not hand-roll HMAC. I wouldn’t pick 1 for a new Angular app.

Don’t pretend you shipped Twitter OAuth 1. Knowing **why** 2 replaced it is enough.

**When OAuth 2 is worth it:** TLS, SPAs, mobile, SSO, refresh. **That’s IDMS.**

OAuth 2 still does **not** define: idle “walked away,” TOTP enrollment, max parallel browsers, kill this laptop **now**. That is why we add a **session**.

---

## 3. What is a JWT?

**JWT** = **JSON Web Token** (RFC 7519). It is a **token format** — how a string is shaped — **not** a login protocol. OAuth 2 can *use* a JWT as the access token; it does not have to. **We don’t** for NUX login (we use a UUID in a store).

### If they say: “What is JWT? Explain JWT.”

**Say this (~40–50s):**

> A JWT is a compact, **signed** string made of **three Base64url parts** separated by dots: **header.payload.signature**. The **header** says the algorithm, for example HS256 or RS256. The **payload** is JSON **claims** — subject, issuer, expiry `exp`, issued-at `iat`, maybe roles. That payload is **not encrypted** by default: anyone who has the token can **decode** it and read the claims. The **signature** is HMAC or RSA over header+payload with a key only the issuer has. An API that has the public key (or shared secret) can **verify** the signature and trust `exp` **without a database lookup**. That’s why people like it for stateless APIs. The downside: until `exp`, you **cannot kill** that token unless you keep a denylist — then you’re not stateless anymore. XSS is bad if the JWT sits in JavaScript storage. Our dashboard access token is **not** this shape; it’s an opaque UUID. SSO IdPs often send **us** a JWT, which we verify, then we mint our store token.

**Shape:**

```text
eyJhbGciOiJSUzI1NiIsInR5cCI6IkpXVCJ9.   ← header  { "alg": "RS256", "typ": "JWT" }
eyJzdWIiOiIxMjMiLCJleHAiOjE3MTAwMH0.     ← payload { "sub": "123", "exp": 1710000000 }
SflKxwRJSMeKKF2QT4fwpMeJf36POk6yJV_adQssw5c   ← signature
```

| Part | What’s inside | Secret? |
|---|---|---|
| Header | `alg`, `typ` | No — readable |
| Payload | Claims: `sub`, `exp`, `iat`, `iss`, `aud`, custom | **No** — readable. Don’t put passwords here. |
| Signature | Proof issuer signed those two parts | Verify with **key**. Tamper payload → signature fails. |

**Signed ≠ encrypted.** Signed = “not forged.” Encrypted (JWE) = “cannot read.” Default JWT = **JWS** (signed only).

**vs what we ship:** JWT = self-contained. Ours = **pointer** (UUID) + DB row. Same OAuth 2 Bearer header either way.

**Spoken short (~15s) if they only want a definition:** “JWT is a signed JSON blob in three Base64 parts. Claims include exp. APIs verify the signature. Readable, not encrypted. We don’t use that format for NUX access tokens.”


---

## 4. Token formats besides JWT — yes

JWT is **one** way a token can look. OAuth 2 does **not** require JWT. The spec only says: an access token is a **string** the client sends as Bearer.

| Format | What it looks like | How the API trusts it | Interview when |
|---|---|---|---|
| **Opaque / reference** (us) | Random id (UUID / hex). **Not** `a.b.c`. | Auth-server **looks up** the row (token store). Revoke = **delete row**. | “Do we decode JWT on FE?” **No.** |
| **JWT / JWS** | `header.payload.signature` | Verify **signature** + `exp`. No DB if you accept delayed revoke. | Stateless microservices, Okta/Auth0 access JWTs |
| **JWE** | Encrypted JWT (still JWT family) | Decrypt then read claims. Hides payload from the client. | Sensitive claims in the token |
| **CWT** | JWT idea, **CBOR** binary | IoT / small devices | Rare in SPAs |
| **PASETO** | Versioned signed/encrypted blob | Same job as JWT, stricter defaults | “JWT alternatives” trivia |
| **SAML assertion** | **XML**, signed | SSO between enterprises | IdP login, **not** our Bearer on Groups APIs |
| **Session cookie id** | Opaque cookie, not in `Authorization` | Server session store | HttpOnly story — envelope, still often opaque |

**Two families to remember:**

1. **Reference (opaque)** — token is a **pointer**. Server is source of truth. Easy **revoke now**. Extra lookup.  
2. **Self-contained (JWT / CWT / PASETO)** — token **is** the truth until `exp`. Fast. Hard to kill early.

IDMS access/refresh: **opaque, store-backed.** `session_id` is a **second** opaque id for the **login row**, not a JWT.

**Spoken ~20s:** “JWT isn’t the only format. Ours are opaque OAuth tokens in a store — random strings, validate by lookup. JWT is self-contained and signed. SAML is XML for SSO. Cookie session ids are opaque too, just in a cookie.”

---

## 5. Is a JWT the same as an OAuth token?

**No. Orthogonal.**

```text
OAuth  = how you GET the token (protocol)
JWT    = how the token LOOKS (format)

OAuth access token  ──┬── JWT / JWE (self-contained)
                      ├── opaque reference (IDMS token store)
                      └── (rare) CWT / PASETO
```

| Phrase people mix up | Accurate |
|---|---|
| “OAuth token” | Whatever auth-server returned as `access_token` / `refresh_token` |
| “JWT token” | Token **encoded as** JWT |
| “We use JWT” | Only true if access tokens **are** JWTs |

**IDMS dashboard (`idms` client):** access/refresh live in the **OAuth token store**. FE does **not** decode three-part JWT `exp`. We treat `expires_in` as a number we **store**, and we refresh on **401**. So: **OAuth tokens, not “the UI parses a JWT.”** Interviewers still say “JWT” loosely — answer: “OAuth 2 bearer; ours are store-backed, not a JWT we decode on the client.”

**Checked in NUX + auth-server:** Spring **`NDJdbcTokenStore`** (table `oauth_access_token`). Token enhancer only adds extra fields (`tenant_id`, `created_on`) onto that store object — it does **not** turn the access token into a JWT. Default access value is a **UUID** (tests look like `2ec37f53-7d20-…`). A JWT would be `xxxxx.yyyyy.zzzzz` (two dots). Dashboard `IToken` is `access_token` + `token_type: bearer` + `refresh_token` + `expires_in` — **no** jwt field, **no** `atob` of three parts.

**JWTs do exist elsewhere on the platform** (e.g. signed tokens for **data-platform / maps / analytics** internal callers). That is **not** what NUX puts in `localStorage['token']` after login. Do not mix them in the interview.

You **can** implement OAuth 2 **with** JWT access tokens (many cloud IdPs do). Then OAuth token **is** a JWT. Still two layers: protocol vs format.

**Refresh token** is almost never something the SPA decodes; it is a secret to mint a new access token.

---

## 6. Why OAuth token **and** session id? Why not token only?

OAuth access = **“this HTTP call is allowed right now.”**  
**Session id** (`session-key`) = **“this browser login is still the live login.”**

Token-only (even if the token is a JWT) gives you **call auth**. It does **not** give you **login lifecycle**.

| Need | Token / JWT only | Token **+** session row |
|---|---|---|
| Call Groups/Safety | Bearer | Bearer **and** `session-key` |
| Access dies after 3h | `exp` / store expiry → 401 → refresh | Same refresh, then **PUT** session binds **new** access to **same** login |
| User walked away (idle) | JWT `exp` may still be 20 min | `updated` + idle seconds; **logout**, no refresh |
| 2FA after password | Token already looks “logged in” | Session stays **CREATED** until TOTP; guard uses `twoFactorPending` |
| Max 2 browsers | Need denylist of JWTs | Inactivate **old `session_id`** |
| Logout / steal token | JWT valid until `exp` | Session **EXPIRED** → next API fails **now** even if access string still exists |

**Purpose of `session_id`:** a **server primary key** for one login. Auth-server generates it on `POST /session`. FE stores it and sends it. Backend can **idle-slide**, **expire**, **delete oldest** on cap, **bind** a new access token after refresh.

Without it you would reinvent the same row (last-seen, 2FA state, device cap) inside every API or a JWT denylist. Then you have a session **anyway**, just worse.

```text
Worth token-only:    public API, huge scale, no “kick this laptop”
Worth token+session: IDMS dashboard (idle, 2FA, cap, revoke-now)  ← us
Worth next:          same session model, refresh in HttpOnly cookie
```

**Honest:** both token and session sit in **localStorage** so NUX + `/app` + console share one login. XSS can steal both. Session still wins for **lifecycle**; HttpOnly is the **envelope** fix, not a reason to drop the session.

**Spoken ~25s:** “OAuth 2 gives us access and refresh. We add a session id because the product needs inactivity logout, 2FA before the app opens, and kicking another device. A JWT exp cannot do those. Session-key is that login’s id on auth-server.”

### “Token expires → refresh → new token. Why session?”

That loop is **correct for access lifetime** (3 hours). It is **not** a login policy.

Our **refresh is ~forever** (Integer.MAX_VALUE). If we **only** did Bearer + refresh:

```text
You walk away 2 days. Access dies → 401 → refresh → new access.
You never re-type the password. Desk stays “logged in” forever.
```

**Session idle (24h default)** is the rule: *no activity → this login is dead.* Interceptor **must not** refresh that 401. Logout. Token-only cannot say “last click” unless every API writes last-seen — that **is** a session row.

Other things refresh **cannot** do:

| Use case | Token + refresh only | `session_id` |
|---|---|---|
| **Idle / walked away** | Refresh keeps you in | `updated` vs idle seconds → logout |
| **2FA** | Password already returned a live access token | Session **CREATED** until TOTP; app stays out |
| **Kick other browser / max sessions** | Old UUID still works until you denylist it | Delete **that** `session_id`; new phone login wins |
| **Logout now** | Access still valid up to 3h | Session EXPIRED → APIs fail **now** |
| **Refresh binds to this laptop** | New UUID, no “which device” | **PUT /session** points **this** S at A2 |

**Auth vs session (don’t mix words):**  
Bearer = **this request is authenticated**. Permissions / tenant headers = **authorization** (can I open Safety?). **`session_id` is not RBAC.** It is **which login** is still allowed to exist.

Without `session_id` you would still store last-seen, 2FA state, and device cap **somewhere**. We put that on **`ndsession`** and send `session-key`.

### Which is better — JWT auth vs what we do?

**Neither is always better.** Split two questions or you will mix them.

**1) Login model:** JWT-**only** (no session) vs **OAuth token + session** (us).  
**2) Access-token shape:** JWT vs **opaque UUID** (us). You can do JWT **and** still have a session.

| | **JWT-only** (typical SPA blog answer) | **What we do** (opaque OAuth + `session_id`) |
|---|---|---|
| Best for | Public APIs, lots of services, no “kick this laptop” | Fleet **dashboard**: idle, 2FA, max browsers, logout **now** |
| Validate | Signature + `exp` — cheap, no DB | Lookup token store **and** session row |
| Idle 24h | **Weak** — `exp` is not last-click; refresh keeps you in | **Strong** — session `updated` |
| Revoke / other device | Hard until `exp` unless denylist (= a session anyway) | Delete/expire **that** `session_id` |
| 2FA half-login | Easy to get wrong (token already “valid”) | Session **CREATED** until TOTP |
| Scale | **Better** at the edge | Auth-server hit on validate |

**Verdict for IDMS:** **ours is better for this product.** JWT-only would fail idle and kick-device unless we rebuild a session. I would **not** say “JWT is more modern so it’s better.”

**If we rebuilt tomorrow:** keep **OAuth 2 + session**. Optional: make access a **short JWT** so some APIs skip token-store lookup — **session-key still required**. Better envelope: **HttpOnly refresh**, not “drop session and go JWT-only.”

**Spoken ~20s:** “JWT-only is better for stateless public APIs. For our dashboard, token plus session is better — idle, 2FA, and kicking a device. JWT as a format is optional; a session is not, for us. Next step is HttpOnly cookies, not JWT-only.”

---

## 7. Tiny diagram

```mermaid
flowchart LR
  subgraph Protocol["OAuth 2 protocol"]
    G[password / refresh / auth code] --> T[access + refresh]
  end
  subgraph Format["Token format — pick one"]
    T --> J[JWT or JWE]
    T --> O[opaque store id — us]
    T --> X[SAML XML on SSO only]
  end
  subgraph Login["Login lifecycle — not in OAuth spec"]
    T --> S[session_id row]
    S --> I[idle / 2FA / kick]
  end
```

IDMS NUX: **OAuth 2** + **opaque-style store tokens** + **session row**.

---

## 8. Why “Bearer”? What is a bearer token?

**Yes — it is a standard**, not a homemade word.

OAuth 2 resource calls use the HTTP **`Authorization`** header (this header itself is older HTTP: Basic, Digest, Negotiate…). OAuth 2 picked a **scheme name**: **`Bearer`**. Spec: **RFC 6750** (“Bearer Token Usage”).

```text
Authorization: Bearer <access_token>
```

Our FE often sends `bearer` lowercase (`token_type` from `/oauth/token` is usually `bearer`). HTTP schemes are **case-insensitive**. Same thing.

**Bearer** = **whoever bears (holds) this string is treated as the user.** Possession **is** the proof. No extra HMAC on the request (that was OAuth 1 / MAC tokens). That is why HTTPS matters: if someone steals the token, they **are** you until we revoke the store row / session.

| Scheme on `Authorization` | Meaning |
|---|---|
| **`Bearer <access>`** | User access token on Groups/Safety APIs |
| **`Basic base64(client_id:)`** | **App** identity on `/oauth/token` — not the user. Empty password after `:` is our public SPA client. |

Two different uses of the **same** header. Token endpoint = **Basic** (client). Product APIs = **Bearer** (user).

**Not** `X-Authorization`. Putting the token on a custom `X-*` header would work if **our** servers read it, but then you fight caches, CORS preflight, every gateway, and you leave the HTTP standard. Interoperability is why everyone uses `Authorization: Bearer`.

**Spoken ~15s:** “Bearer is RFC 6750. Authorization is the standard HTTP header. Bearer means possession of the token is enough. We use Basic only on the token URL for the client id.”

---

## 9. Do we send `X-Authorization` / `X-Session`?

**No.** Those are **not** our auth headers. Easy mix-up with `X-*` tenant headers.

| Header | Standard? | What we send | Why |
|---|---|---|---|
| **`Authorization`** | **Yes** (HTTP + RFC 6750) | `Bearer <access>` or `Basic …` on token URL | Access / client. One header, one scheme. |
| **`session-key`** | **Our product** (not in OAuth) | `session_id` | Second credential: **this login**. Cannot stuff it into `Authorization` without inventing a non-standard scheme (`Bearer` is already the access token). Gateways already know `Authorization`; session stays a **named custom header** auth-server documented. |
| **`X-Selected-Tenant-Id`** / **`X-Selected-Tenant-Unique-Name`** | Custom `X-` | Which fleet you are acting as | **Not auth.** AuthZ scope after you are logged in. |
| **`X-Dashboard-Type: APP`** | Custom `X-` | Which UI (NUX vs others) | Routing / product, not login. |
| **`Accept-Language`** | Standard | Locale | i18n |

**Why `X-` on tenant / dashboard type?** Old convention: “this is not in the HTTP spec, it’s ours.” Newer RFCs say **don’t** mint public `X-` names (RFC 6648), but internal APIs still do. Tenant is `X-` because it is **not** a standard auth field.

**Why not `X-Session`?** Historical name on auth-server is **`session-key`**. Same idea as a custom session header; we did not use the `X-` prefix on that one.

**Spoken ~20s:** “We don’t use X-Authorization. Access goes on the standard Authorization Bearer header. Session is a separate session-key header because OAuth Bearer is only the access token. X-Selected-Tenant-Id is which fleet, not who you are.”

---

## Q card (say these)

**Explain OAuth 2?** See **§1 “Explain OAuth 2.”** Password once at auth-server → Bearer access on APIs + refresh to mint new access. Not JWT. Not GET/POST. Uses HTTP. We add session on top.

**What is OAuth?** Protocol to get tokens so APIs don’t take the password. **OAuth 2** is the version we use (RFC 6749).

**What is a protocol?** Agreed rules for how two sides talk. HTTP is a protocol. GET/POST are **HTTP methods**, not protocols. OAuth 2 is a protocol **on top of** HTTP.

**OAuth 1 vs 2?** 1 HMAC-seals **this** GET/URL/params. 2 sends **Bearer UUID** over HTTPS. 2 exists because 1 was too hard and TLS became normal. We use **2** + opaque store tokens, **not** JWT for NUX login.

**Still used OAuth 1?** Not at our job. Peak ~2007–2012. Today leftover: **X/Twitter** (also has OAuth 2), **Flickr**, some old vendor APIs. New IdPs = OAuth 2.

**What is HMAC?** Hash with a **secret key**. Server recomputes; match means you knew the secret and the request wasn’t edited.

**JWT better than us?** **No, not for IDMS.** JWT-only is better for stateless public APIs. We need session for idle/2FA/kick. Optional later: short JWT **plus** session, or HttpOnly refresh — not JWT-only.

**OAuth token = JWT?** **No.** NUX access token = **UUID in JDBC store**, minted by Spring OAuth 2 on auth-server. Not `aaa.bbb.ccc`. JWT only for IdP inbound / some internal platforms.

**Other formats besides JWT?** Yes — see **§4**. We use **opaque** store tokens. JWT is self-contained; opaque is a lookup id.

**Why session with OAuth?** Idle, 2FA CREATED vs ACTIVE, max devices, revoke now. Token = this **request**. Session id = this **login**.

**Why Bearer?** RFC 6750. `Authorization: Bearer <token>` = possession is proof. Standard, not homemade.

**X-Authorization / X-Session?** **We don’t send those.** Access = `Authorization`. Login = `session-key`. `X-Selected-Tenant-Id` / `X-Dashboard-Type` are **fleet/UI**, not the token.
