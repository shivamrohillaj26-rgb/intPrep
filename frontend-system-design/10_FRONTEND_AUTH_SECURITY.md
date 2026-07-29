# Frontend Auth Security — Cookies, Storage, XSS, CSRF, SameSite

Interview question:

> Authentication works, but the app is still vulnerable. What would you evaluate?

---

## 1. Spoken answer

> Login succeeding doesn’t mean the app is safe. I’d check where tokens live (HttpOnly cookie vs localStorage), XSS attack surface, CSRF if cookies are auto-sent, cookie flags (`Secure`, `HttpOnly`, `SameSite`), HTTPS only, and that APIs never trust the UI alone for authorization.

---

## 2. Cookies vs LocalStorage / SessionStorage

| | `localStorage` / `sessionStorage` | Cookie (esp. auth) |
|---|---|---|
| Sent automatically | No | Yes (to matching domain/path) |
| JS readable | Yes | Not if `HttpOnly` |
| XSS risk | High if token in storage (JS can steal) | Lower if HttpOnly (JS can’t read) |
| CSRF risk | Lower for bearer-in-header | Higher if cookie auto-sent — need CSRF defenses |
| Size / use | Convenient for non-secret UI state | Better for session cookies |

Common modern pattern:

- **Session cookie**: `HttpOnly` + `Secure` + `SameSite=Lax/Strict` (+ CSRF strategy if needed)  
- **Or** Bearer token in memory (harder UX on refresh) / BFF  

Avoid: long-lived access token in `localStorage` on XSS-prone apps.

---

## 3. XSS (Cross-Site Scripting)

Attacker injects JS into your page → runs as your origin → can:

- read `localStorage` tokens  
- call APIs as the user  
- rewrite DOM / phish  

Mitigations:

- Never put unsanitized user HTML into DOM (`innerHTML`)  
- Prefer text binding; sanitize if HTML needed  
- CSP (Content-Security-Policy)  
- Framework escaping defaults (Angular template binding helps; still careful with `bypassSecurityTrust*`)  
- HttpOnly cookies so stolen JS can’t read session cookie  

---

## 4. CSRF (Cross-Site Request Forgery)

Browser auto-sends cookies on requests to your site from another site’s page.

```text
evil.com → <form action="https://bank.com/transfer">
Browser includes bank.com cookies → unwanted action
```

Mitigations:

- `SameSite=Lax` / `Strict` cookies  
- Anti-CSRF tokens on state-changing requests  
- Prefer custom header / Bearer not auto-sent from foreign forms  
- Re-auth for sensitive actions  

If you use **Authorization header** from JS (not cookies), classic CSRF form attacks are weaker — but XSS becomes the bigger token-theft risk.

---

## 5. SameSite cookies

| Value | Behavior (simplified) |
|---|---|
| `Strict` | Cookie not sent on cross-site navigations |
| `Lax` | Sent on top-level GET navigations; blocks most CSRF POSTs from other sites |
| `None` | Cross-site allowed — **requires `Secure`** |

Interview line:

> `SameSite` reduces CSRF by controlling cross-site cookie sending. It’s not a full substitute for CSRF tokens on all architectures.

---

## 6. Checklist when “auth works”

- [ ] Where is the token/session stored?  
- [ ] `HttpOnly` / `Secure` / `SameSite` set?  
- [ ] XSS sinks reviewed? CSP?  
- [ ] CSRF model matches cookie vs bearer?  
- [ ] Logout clears server session + client state?  
- [ ] Refresh token rotation / expiry?  
- [ ] API authorizes every request (roles), not only FE route guards  

---

## 7. Quick Q&A

**Q: Is localStorage OK for JWT?**  
A: Convenient but XSS-stealable. Prefer HttpOnly cookie session or careful architecture.

**Q: Do route guards equal security?**  
A: No — they only hide UI. API must enforce authZ.

**Q: Cookie auth + SPA?**  
A: Works well with BFF/same-site API + SameSite + CSRF strategy.

---

## Practice checklist

- [ ] Compare storage XSS vs cookie CSRF tradeoff  
- [ ] Explain SameSite Lax vs Strict  
- [ ] Name 3 XSS mitigations  
- [ ] Name 2 CSRF mitigations  
- [ ] Say “FE guard ≠ backend authZ”  
