# 10 — Auth and security (server side)

**Goal:** build BookNest login properly, protect every endpoint, and avoid the mistakes that cause breaches.

The browser side is in `frontend-system-design/10_FRONTEND_AUTH_SECURITY.md`. This guide is what the **server** must do.

---

## 1. Two different questions

| Word | Question | Fails with |
|---|---|---|
| **Authentication (authn)** | Who are you? | 401 |
| **Authorization (authz)** | Are you allowed to do this? | 403 |

Every request needs both. "Logged in" is not "allowed."

---

## 2. Passwords

**Never store passwords. Store a slow, salted hash.**

```java
PasswordEncoder encoder = new BCryptPasswordEncoder(12);   // cost factor 12

String hash = encoder.encode("hunter2");                  // $2a$12$...  (salt is inside)
boolean ok  = encoder.matches("hunter2", hash);
```

- Use **bcrypt**, **scrypt** or **Argon2**. Never MD5, SHA-1 or plain SHA-256 (too fast to brute-force).
- The **salt** (random per user) makes identical passwords hash differently and kills rainbow tables.
- Same error message for "no such user" and "wrong password" (do not reveal which emails exist).
- Rate-limit login attempts per account and per IP. Lock or add delay after repeated failures.
- Check new passwords against breached-password lists and enforce a minimum length, not silly character rules.

---

## 3. Sessions vs tokens

### Server session (stateful)

```text
POST /login  → server creates session row/Redis key "s_91ab" → user 7
             ← Set-Cookie: SESSION=s_91ab; HttpOnly; Secure; SameSite=Lax
GET /orders  → cookie sent automatically → server looks up s_91ab → user 7
```

- ✅ Logout or revoke = delete the session. Instant.
- ✅ Idle timeout is easy (update "last seen").
- ❌ Every request reads the session store (use Redis so all servers share it).

### JWT access token (stateless)

```text
POST /login  ← { "accessToken": "eyJhbGciOiJSUzI1NiJ9.eyJzdWIiOiI3Iiwicm9sZXMiOlsiVVNFUiJdLCJleHAiOjE3...}" }
GET /orders  → Authorization: Bearer eyJ...
             → server verifies the signature and expiry, no DB lookup
```

A JWT has three base64 parts: **header.payload.signature**.

```json
{ "sub": "7", "roles": ["USER"], "iss": "https://auth.booknest.com", "aud": "booknest-api",
  "iat": 1762400000, "exp": 1762400900 }
```

- ✅ Any service can verify it without calling the auth server (with the public key).
- ❌ You cannot revoke it before `exp`. Keep it **short** (5–15 minutes).
- ❌ The payload is **readable by anyone** (base64, not encrypted). No secrets inside.

### What real systems do: both

```text
short access token (JWT, 10 min)      → sent on every API call
long refresh token (opaque, days)     → only sent to /token/refresh, stored server-side, can be revoked
session row (optional)                → idle timeout, "log out other devices", max devices
```

Refresh **rotation:** each refresh returns a new refresh token and invalidates the old one. If an old one is used again, someone stole it → revoke the whole family.

---

## 4. Verifying a JWT correctly (server checklist)

```java
Jws<Claims> jws = Jwts.parser()
    .verifyWith(publicKey)                       // RS256: verify with the auth server's public key
    .requireIssuer("https://auth.booknest.com")
    .requireAudience("booknest-api")
    .clockSkewSeconds(30)
    .build()
    .parseSignedClaims(token);                   // throws if signature, exp, iss, aud are wrong

long userId = Long.parseLong(jws.getPayload().getSubject());
```

Must check: **signature**, **algorithm** (reject `alg: none`, do not let the token pick the algorithm), **exp**, **iss**, **aud**.

- **HS256:** one shared secret signs and verifies. Every service that verifies can also *forge* tokens.
- **RS256 / ES256:** private key signs (only the auth server), public key verifies (everyone). Prefer this. Publish keys at a **JWKS** URL and rotate them with a `kid` header.

---

## 5. OAuth 2.0 — the flows you need

OAuth 2 is about **delegated access**: an app gets a token to call an API on behalf of a user.

Roles: **resource owner** (user), **client** (your app), **authorization server** (issues tokens), **resource server** (your API).

### Authorization Code + PKCE (browser and mobile apps — the default today)

```text
1. App → browser to  https://auth.booknest.com/authorize?
          response_type=code&client_id=web&redirect_uri=...&scope=openid orders
          &state=xyz&code_challenge=SHA256(verifier)
2. User logs in at the auth server
3. Auth server → redirect_uri?code=abc&state=xyz
4. App checks state == xyz  (stops CSRF on the login flow)
5. App → POST /token  code=abc + code_verifier   (PKCE proves it is the same app)
6. ← access_token (+ refresh_token, + id_token if OIDC)
```

### Client Credentials (service → service, no user)

```text
Order service → POST /token  grant_type=client_credentials, client_id, client_secret
             ← access token with scopes like "payments:charge"
```

### Refresh Token

```text
POST /token  grant_type=refresh_token&refresh_token=...
```

### Flows to avoid

- **Password grant** (app collects the password and sends it to `/token`): deprecated in OAuth 2.1. Still found in older first-party apps.
- **Implicit grant** (token in the URL fragment): deprecated. Use code + PKCE.

---

## 6. SSO: OpenID Connect and SAML

**Single sign-on:** log in once with the company's identity provider (Okta, Azure AD, Google), get into many apps.

| | OpenID Connect (OIDC) | SAML 2.0 |
|---|---|---|
| Built on | OAuth 2 | XML |
| Proof of login | **ID token** (a JWT about the user) | Signed XML **assertion** |
| Common in | Modern apps, mobile | Older enterprise apps |
| Endpoints | `/.well-known/openid-configuration`, JWKS | IdP metadata XML, ACS URL |

SAML flow, simply:

```text
User → your app (Service Provider) → redirect to IdP with an AuthnRequest
IdP logs the user in → browser POSTs a signed SAMLResponse to your ACS URL
Your app verifies the XML signature, issuer, audience, time window → creates its own session
```

SAML security traps: always verify the signature over the **assertion you use**, check `NotOnOrAfter`, reject replays, and use a maintained library (XML signature bugs are classic).

**Multi-tenant SSO:** many companies, each with their own IdP. Look up the tenant (by email domain or a tenant slug), then redirect to *that* tenant's IdP. Match the returned user to the right tenant only.

---

## 7. Multi-factor authentication (TOTP)

```text
Enroll: server generates a secret → shows a QR (otpauth://totp/BookNest:a@b.com?secret=...)
        user scans with an authenticator app → types a 6-digit code → server verifies → enabled
Login:  password OK → session is "half logged in" → user types code → server checks → full session
```

The code = HMAC(secret, current 30-second window). Accept ±1 window for clock drift. Store backup codes hashed. Do not let a half-logged-in session call normal APIs.

---

## 8. Authorization models

**RBAC (roles):**

```java
@PreAuthorize("hasRole('ADMIN')")
@DeleteMapping("/books/{id}")
void delete(@PathVariable long id) { ... }
```

**Ownership / ABAC (attributes) — the check people forget:**

```java
@GetMapping("/orders/{id}")
OrderResponse get(@PathVariable long id, @AuthenticationPrincipal Jwt jwt) {
    Order order = repo.findById(id).orElseThrow(NotFoundException::new);
    if (!order.getUserId().equals(Long.valueOf(jwt.getSubject()))) {
        throw new NotFoundException();       // 404, so we do not even confirm the order exists
    }
    return OrderResponse.from(order);
}
```

Skipping this is **IDOR / Broken Object Level Authorization** — the number one API vulnerability. User 7 changes the URL to `/orders/982` and reads someone else's order.

**Multi-tenant authorization:** every query filters by tenant (`WHERE tenant_id = :currentTenant`). Get the tenant from the verified token, never from a header the client controls without checking.

---

## 9. Spring Security as a resource server (JWT)

```yaml
spring:
  security:
    oauth2:
      resourceserver:
        jwt:
          issuer-uri: https://auth.booknest.com
          audiences: booknest-api
```

```java
@Configuration
@EnableMethodSecurity
class SecurityConfig {
    @Bean
    SecurityFilterChain api(HttpSecurity http) throws Exception {
        http
            .csrf(csrf -> csrf.disable())                         // OK: bearer tokens, no cookies
            .sessionManagement(s -> s.sessionCreationPolicy(SessionCreationPolicy.STATELESS))
            .authorizeHttpRequests(auth -> auth
                .requestMatchers("/actuator/health/**", "/v1/books/**").permitAll()
                .requestMatchers(HttpMethod.POST, "/v1/books").hasRole("ADMIN")
                .anyRequest().authenticated())
            .oauth2ResourceServer(o -> o.jwt(Customizer.withDefaults()));
        return http.build();
    }
}
```

How it runs: a chain of servlet filters. The bearer-token filter reads `Authorization`, validates the JWT, and puts an `Authentication` in the `SecurityContext` (a ThreadLocal) for the rest of the request.

Quarkus equivalent: `quarkus-oidc` or `quarkus-smallrye-jwt`, `@RolesAllowed("ADMIN")`, `@Authenticated`.

---

## 10. Cookies, CSRF and CORS (server settings)

If you use **cookies** for auth, the browser sends them automatically — including on requests triggered by a malicious site. That is **CSRF**.

Cookie flags:

| Flag | Effect |
|---|---|
| `HttpOnly` | JavaScript cannot read it (XSS cannot steal it) |
| `Secure` | HTTPS only |
| `SameSite=Lax` | Not sent on cross-site POSTs (blocks most CSRF) |
| `SameSite=Strict` | Never cross-site (can break login redirects) |
| `Path=/auth/refresh` | Send the refresh cookie only to that path |

Add a CSRF token (double-submit or synchronizer token) for cookie-auth APIs with unsafe methods.

**CORS** is set on the server, enforced by the browser:

```java
@Bean
CorsConfigurationSource cors() {
    var c = new CorsConfiguration();
    c.setAllowedOrigins(List.of("https://booknest.com"));       // never "*" with credentials
    c.setAllowedMethods(List.of("GET", "POST", "PATCH", "DELETE"));
    c.setAllowedHeaders(List.of("Authorization", "Content-Type", "Idempotency-Key"));
    c.setAllowCredentials(true);
    var source = new UrlBasedCorsConfigurationSource();
    source.registerCorsConfiguration("/**", c);
    return source;
}
```

CORS is **not** security against attackers using curl. It only controls which websites' JavaScript may read your responses.

---

## 11. OWASP Top 10 for APIs — what each means for you

| Risk | Plain meaning | Defense |
|---|---|---|
| Broken object level authz (IDOR) | `/orders/982` works for the wrong user | Ownership check on every object |
| Broken authentication | Weak tokens, no rate limit on login | Standard libraries, short tokens, rate limits, MFA |
| Broken property-level authz | Client sends `"role":"ADMIN"` and it is saved | Separate request DTOs, never bind raw JSON to entities (mass assignment) |
| Unrestricted resource use | `?size=1000000`, huge uploads | Max page size, body limits, rate limits, timeouts |
| Broken function-level authz | Admin endpoints reachable by users | Deny by default, role checks per endpoint |
| Sensitive business flows | Bots buy all stock | Rate limits, captcha, per-user caps |
| **SSRF** | Server fetches a URL the user gave (`http://169.254.169.254/` → cloud credentials) | Allow-list hosts, block internal ranges, no redirects |
| Misconfiguration | Debug endpoints, stack traces, open buckets | Hardened defaults, no `env`/`heapdump` exposed |
| Improper inventory | Old `/v0` still running unpatched | Track and retire versions |
| Unsafe consumption of APIs | Trusting a partner API's data blindly | Validate input from third parties too |

Plus the classics:

- **SQL injection:** never build SQL with string concatenation. Use parameters (`WHERE id = ?`). ORMs and `JdbcClient.param` do this.
- **XSS:** escape output, set a Content-Security-Policy, return JSON with the right `Content-Type`.
- **Deserialization:** never deserialize untrusted Java-serialized objects. Use JSON with fixed DTO types.
- **Path traversal:** `../../etc/passwd` in file names. Never use user input as a path directly.

---

## 12. Secrets and data protection

- Secrets (DB passwords, API keys, signing keys) come from a **secrets manager** (AWS Secrets Manager, Vault) or environment variables. Never in git, never in logs.
- Encrypt in transit (TLS everywhere) and at rest (RDS / S3 encryption, KMS keys).
- Log **no** passwords, tokens, full card numbers or personal data. Mask them.
- Hash or tokenize data you only need to compare.
- Audit log for security events: login, password change, role change, data export.

---

## 13. Rate limiting login and APIs

```text
key = "login:" + email     → max 5 attempts / 15 min
key = "api:"   + userId    → max 100 requests / minute
store counters in Redis (INCR + EXPIRE) so all servers share them
```

Algorithms (token bucket, sliding window) are in guide 20.

---

## Common mistakes

| Mistake | Fix |
|---|---|
| Long-lived JWTs with no revoke | Short access + revocable refresh / session |
| Secrets or PII in JWT payload | Only IDs and roles |
| Trusting `alg` from the token | Fix the algorithm on the server |
| Only checking "logged in" | Check ownership / tenant on every object |
| Binding JSON straight onto entities | Request DTOs with only allowed fields |
| `allowedOrigins("*")` with credentials | Exact origin list |
| Fetching user-supplied URLs | Allow-list + block internal IPs (SSRF) |
| Different errors for "no user" / "bad password" | One generic message |

---

## Spoken answer (50s)

> Authentication proves who you are, authorization decides what you may do, and both run on every request. Passwords are stored as bcrypt or Argon2 hashes with rate-limited login. I use short-lived signed access tokens — RS256 with JWKS, checking signature, issuer, audience and expiry — plus a revocable, rotating refresh token, and a server session when I need idle timeout, MFA state or device limits. Browsers use authorization code with PKCE, services use client credentials, and enterprise SSO is OIDC or SAML per tenant. On every object I check ownership and tenant, because IDOR is the top API risk, and I use parameterized SQL, request DTOs against mass assignment, SSRF allow-lists, exact CORS origins, and secrets from a secrets manager.
