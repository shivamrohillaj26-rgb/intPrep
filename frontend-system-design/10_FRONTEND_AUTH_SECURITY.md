# Frontend Auth Security — Interview Ready Guide

Token storage · cookies / HttpOnly · XSS · CSRF · what to recommend in production

Related: [09_CORS.md](./09_CORS.md) · **all attack types** → [17_CYBERATTACKS_FRONTEND_INTERVIEW.md](./17_CYBERATTACKS_FRONTEND_INTERVIEW.md) · practice demo [`/q9` JWT](../prevonir-interview-practice/src/app/q9-jwt-auth/JWT_RBAC.md) (uses `localStorage` on purpose — call out the tradeoff)

---

## 1. The interview question

> Where should we store the JWT / session?  
> HttpOnly cookie vs `localStorage` — which is better and why?  
> How do you design auth so it’s not easy to attack?

They want: **storage choice + attack tradeoff + a clear production recommendation** — not buzzwords.

---

## 2. One-liner

> Auth is not “login works.” It’s **where credentials live**, **how they travel**, and **what happens if XSS or CSRF hits**. Prefer short-lived access + **HttpOnly Secure SameSite** refresh/session cookie; never trust FE route guards alone.

---

## 3. Terms (10 seconds)

| Term | Meaning |
|---|---|
| **AuthN** | Who are you? (login / token valid) |
| **AuthZ** | What may you do? (roles / permissions) — **API must enforce** |
| **Access token** | Short-lived; used on every API call |
| **Refresh token** | Longer-lived; only to mint new access tokens |
| **Session cookie** | Opaque id; server holds the real session |

---

## 4. Where can FE store credentials?

| Store | Reload safe? | JS can read? | Auto-sent on HTTP? | For secrets? |
|---|---|---|---|---|
| Memory (service variable) | No | Yes | No (you set header) | OK for **short access** |
| `sessionStorage` | Tab only | Yes | No | Weak (XSS) |
| `localStorage` | Yes | Yes | No | Weak (XSS) — demos only |
| Cookie (no HttpOnly) | Yes | Yes | Yes | **Bad** (XSS + CSRF) |
| Cookie **`HttpOnly`** | Yes | **No** | Yes | **Best** for refresh/session |
| BFF session | Yes | No | Cookie to BFF | Excellent |

**Ranking to say out loud:**

```text
Best  → HttpOnly + Secure + SameSite cookie (session or refresh)
Good  → access in memory + refresh in HttpOnly cookie
Weak  → JWT in localStorage / sessionStorage
Bad   → long-lived token in localStorage, no XSS hardening
```

---

## 5. Cookie vs HttpOnly (must nail this)

HttpOnly is **not a different cookie type**. It is a **flag**.

```http
Set-Cookie: refresh=abc; HttpOnly; Secure; SameSite=Lax; Path=/auth; Max-Age=604800
```

| Flag | One-line meaning |
|---|---|
| `HttpOnly` | JS **cannot** read it (`document.cookie` won’t show it) |
| `Secure` | Sent only on **HTTPS** |
| `SameSite=Lax` | Blocks most cross-site POSTs → cuts CSRF |
| `SameSite=Strict` | Even stricter (can break “link from email → logged in”) |
| `SameSite=None` | Cross-site allowed — **requires** `Secure` |
| `Path` / `Domain` | Limit where cookie is sent (narrow is better) |

Interview line:

> HttpOnly stops XSS from *stealing* the cookie value. The browser still *auto-sends* it — so CSRF is the tradeoff you must handle.

### Dry run — cookie session

```text
1. POST /login { user, pass }
2. Server → Set-Cookie: sid=...; HttpOnly; Secure; SameSite=Lax
3. JS cannot read sid
4. GET /api/orders → browser attaches Cookie automatically
5. Server validates sid → returns data
```

### Dry run — Bearer + localStorage (demo style)

```text
1. POST /login → { accessToken }
2. localStorage.setItem('token', accessToken)
3. Interceptor: Authorization: Bearer <token>
4. XSS on page → attacker reads localStorage → steals account
```

---

## 6. Two main flows (draw in interview)

### A) Bearer in header (storage = XSS risk)

```text
SPA saves token → attaches Authorization → API trusts JWT/session lookup
CSRF: weaker (evil form can’t easily set your header)
XSS:  stronger risk if token is in localStorage
```

### B) Cookie session / refresh (auto-send = CSRF risk)

```text
Browser stores HttpOnly cookie → auto-sent → API trusts cookie
XSS:  can’t read cookie (good)
CSRF: evil site may trigger requests with cookie (must mitigate)
```

**Tradeoff table (memorize):**

| | `localStorage` + Bearer | HttpOnly cookie |
|---|---|---|
| XSS steals token? | Yes | Hard (can’t read) |
| CSRF via foreign form? | Hard | Easier — need SameSite / CSRF token |
| Survives refresh? | Yes | Yes |
| Good for production secrets? | Usually no | Yes |

---

## 7. What to recommend as “best” (production SPA)

**Default answer for Angular / enterprise FE:**

```text
Access token  → short TTL (minutes), keep in memory
Refresh token → HttpOnly + Secure + SameSite=Lax cookie
On app load   → silent /auth/refresh (cookie auto-sent) → new access in memory
On logout     → server revokes + clears cookie
Extras        → HTTPS, CSP, refresh rotation, API authZ
```

```text
┌────────── SPA ──────────┐         ┌────────── API ──────────┐
│ access in memory        │ Bearer▶ │ validate access         │
│ reload → silent refresh │         │                         │
│ via HttpOnly cookie     │ ◀────── │ Set-Cookie refresh      │
└─────────────────────────┘         └─────────────────────────┘
```

**Enterprise upgrade — BFF:**

```text
Browser ←→ BFF (same site, HttpOnly session cookie) ←→ Auth / APIs
Tokens live on server; page never sees JWT
```

**Machine coding (`/q9`):** `localStorage` is fine — say you’d upgrade storage for prod.

---

## 8. Attacks (name + mitigate)

### XSS — attacker runs JS on your site

| Token location | What attacker does |
|---|---|
| `localStorage` / memory / readable cookie | Steal token, call APIs, exfiltrate |
| HttpOnly only | Can’t read cookie; can still drive requests *as you* until logout |

Mitigate XSS:

1. No `innerHTML` with user data; Angular text binding  
2. CSP  
3. Avoid `bypassSecurityTrust*` unless audited  
4. Short sessions + HttpOnly for refresh  

### CSRF — attacker’s site triggers your API with your cookies

```text
evil.com → POST https://api.you.com/transfer
Browser includes your session cookie → unwanted action
```

Mitigate CSRF (cookie auth):

1. `SameSite=Lax` or `Strict`  
2. Anti-CSRF token on POST/PUT/DELETE  
3. Verify `Origin` / `Referer`  
4. Step-up auth for sensitive actions  

### Other (quick)

| Attack | Fix |
|---|---|
| MITM | HTTPS + `Secure` + HSTS |
| Stolen refresh replay | Rotate refresh; revoke on reuse |
| Tokens in URL | Never — leaks via logs/referrer |
| FE-only RBAC | API must check roles every time |

```text
canActivate → hides /admin     ✅ UX
API without role check         ❌ not secure
```

---

## 9. Access vs refresh (say this clearly)

| | Access | Refresh |
|---|---|---|
| Lifetime | Minutes | Hours–days |
| Used for | Every API call | Only `/refresh` |
| Store | Memory (ideal) | HttpOnly cookie |
| If stolen | Limited window | Dangerous → rotate + revoke |

**Silent refresh dry run:**

```text
User reloads SPA
→ access gone from memory
→ POST /auth/refresh (HttpOnly cookie auto-sent)
→ new access in memory
→ user still “logged in”
```

---

## 10. Angular shape (45 sec)

```text
AuthService     → login / logout / hold access + user
HttpInterceptor → Authorization header; on 401 → refresh once → retry
AuthGuard       → UI only (redirect if no session)
RoleGuard       → UI only (hide admin); API still enforces
```

Cross-origin cookie APIs need `withCredentials: true` + CORS credentials rules → [09_CORS.md](./09_CORS.md).

---

## 11. Common mistakes

1. “Guards make the app secure” → **no**, API must authZ  
2. JWT in `localStorage` forever → XSS jackpot  
3. JWT in cookie **without** HttpOnly → XSS + CSRF  
4. HttpOnly without SameSite/CSRF plan → CSRF open  
5. No logout revoke → stolen refresh still works  
6. `Allow-Origin: *` with cookies → browsers reject / insecure  

---

## 12. Common interview Q&A

**Q: Is localStorage OK for JWT?**  
A: Convenient for demos. Production: XSS can steal it. Prefer HttpOnly refresh/session.

**Q: Is HttpOnly enough?**  
A: Stops exfiltration of the cookie value. Attacker script can still act as the user until session ends. Still need XSS hardening + short TTL.

**Q: Cookie auth vs Bearer — which is safer?**  
A: Neither alone. Cookie → fight CSRF. Bearer-in-storage → fight XSS. Best combo is short access + HttpOnly refresh.

**Q: SameSite enough for CSRF?**  
A: Strong default, not always complete. Sensitive apps add CSRF tokens.

**Q: Why not put JWT in a normal (readable) cookie?**  
A: Worst of both worlds — JS can steal it and browser auto-sends it.

**Q: Access in memory is lost on refresh — bad UX?**  
A: Silent refresh with HttpOnly refresh cookie on bootstrap.

**Q: Do route guards equal security?**  
A: No — UX only. Backend authorizes.

---

## 13. Spoken answers

**30s — where to store**

> I wouldn’t put long-lived access tokens in `localStorage` because XSS can steal them. I’d keep a short access token in memory and put the refresh token in an HttpOnly, Secure, SameSite cookie — or use a BFF session. FE guards only hide UI; the API enforces auth.

**45s — HttpOnly vs localStorage**

> `localStorage` is JS-readable, so XSS equals token theft, but CSRF is weaker because evil sites can’t set our Authorization header. HttpOnly cookies aren’t readable by JS, which is great against theft, but the browser auto-sends them, so we need SameSite and often CSRF tokens. Production preference is HttpOnly for the long-lived credential.

**60s — full design**

> HTTPS everywhere. Short-lived access token, refresh in HttpOnly Secure SameSite cookie with rotation. Silent refresh on app load. CSP and safe rendering against XSS. CSRF strategy if cookies authenticate mutations. Logout revokes server-side. Roles checked on API, not only in Angular guards.

---

## 14. What to say / draw first in interview

1. Draw **two boxes**: SPA vs API  
2. Show **two options**: Bearer+storage vs HttpOnly cookie  
3. Table: **XSS vs CSRF** tradeoff  
4. Recommend: **memory access + HttpOnly refresh**  
5. Close: **API authZ + HTTPS + CSP**

---

## 15. Practice checklist

- [ ] Explain all cookie flags in one line each  
- [ ] Dry-run cookie login + Bearer login  
- [ ] XSS vs CSRF tradeoff without notes  
- [ ] Recommend production pattern in 60s  
- [ ] Say why `/q9` localStorage is demo-only  
- [ ] Say “FE guard ≠ security”  

---

## 16. Cheat card

```text
localStorage JWT     → XSS steals
HttpOnly             → JS can’t read; CSRF risk remains
Secure               → HTTPS only
SameSite=Lax/Strict  → reduces CSRF
Best SPA             → short access (memory) + HttpOnly refresh + rotation
Always               → HTTPS, CSP, API authZ, revoke on logout
Never                → trust UI-only role checks
```
