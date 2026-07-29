# CORS — Why Postman Works but the Browser Fails

Interview question:

> An API works in Postman but fails in the browser. Explain CORS, preflight, what the browser enforces, and what the frontend can/cannot control.

---

## 1. Spoken answer

> Postman isn’t constrained by the browser Same-Origin Policy, so it can call any URL. In a web page, the browser only lets JavaScript read a cross-origin response if the server opts in with CORS headers. For some requests the browser first sends an `OPTIONS` preflight. Frontend code cannot “turn off” CORS; the API (or a same-origin proxy) must allow your origin.

---

## 2. Same-Origin Policy (SOP)

Origin = `scheme + host + port`

```text
https://app.com      ≠  https://api.com
http://localhost:4200 ≠ http://localhost:3000
```

Without CORS, browser JS on `app.com` cannot read responses from `api.com`.

---

## 3. What CORS actually is

CORS = server tells browser: “this origin may read my response / send credentials.”

Common response headers:

```http
Access-Control-Allow-Origin: https://app.com
Access-Control-Allow-Methods: GET, POST, PUT
Access-Control-Allow-Headers: Content-Type, Authorization
Access-Control-Allow-Credentials: true
```

- Browser **enforces** whether JS can see the response  
- Server **declares** the policy via headers  

---

## 4. Simple request vs preflight

### Simple-ish requests (no preflight in common cases)

Examples often treated as “simple”: `GET`/`POST` with limited headers/content-types.

### Preflight (`OPTIONS`)

Browser asks first when request is “non-simple”, e.g.:

- custom headers (`Authorization`, `X-Request-Id`)
- methods like `PUT` / `DELETE` / `PATCH`
- `Content-Type: application/json` (commonly triggers preflight)

```text
Browser                     API
   |-- OPTIONS /users ------->|
   |<-- 204 + ACAO headers ---|
   |-- POST /users ---------->|
   |<-- 200 + ACAO headers ---|
```

If preflight fails → real request may never be usable by JS (you see a CORS error in console).

---

## 5. Why Postman works

| Client | SOP / CORS |
|---|---|
| Postman / curl | No browser SOP — shows raw response |
| Browser JS (`fetch`/XHR) | SOP + CORS enforced |

So “works in Postman” only proves the **API is reachable**, not that browser JS is allowed to read it.

---

## 6. What frontend can and cannot control

### Can

- Call same-origin backend/BFF that proxies to API  
- Avoid unnecessary custom headers if possible  
- Send `credentials: 'include'` **when** using cookie auth (and server must allow credentials + specific origin, not `*`)  
- Surface clear error UX when CORS fails  

### Cannot

- Bypass CORS from frontend securely  
- Fix missing `Access-Control-Allow-Origin` without server/proxy change  
- Use `*` with credentialed cookie requests  

---

## 7. Angular / frontend notes

```ts
this.http.get('https://api.com/data') // cross-origin → needs CORS
```

Dev proxy (`proxy.conf.json`) avoids CORS in local dev by making the browser talk to same origin; production still needs real CORS or a gateway.

---

## 8. Quick Q&A

**Q: Is CORS a security feature for the API server?**  
A: It’s a **browser** protection for users. Servers must still authenticate/authorize.

**Q: Who fixes CORS errors?**  
A: Usually backend/gateway. Frontend may use a proxy/BFF pattern.

**Q: What is preflight caching?**  
A: `Access-Control-Max-Age` lets browser reuse preflight result for a period.

---

## Practice checklist

- [ ] Explain SOP in one sentence  
- [ ] Why Postman ≠ browser  
- [ ] When OPTIONS preflight happens  
- [ ] What ACAO / credentials rules mean  
- [ ] What FE can vs cannot fix  
