# 02 — HTTP and REST API design

**Goal:** design BookNest's API so another team can use it without asking you questions.

---

## 1. What REST actually means (simple)

REST = treat your data as **resources** with URLs, and use HTTP **methods** as verbs.

```text
Resource      URL
Books         /books
One book      /books/42
A user's orders  /users/7/orders
```

Nouns in URLs, verbs in methods. Not `/getBook?id=42`, not `/createOrder`.

---

## 2. Methods

| Method | Meaning | Body? | Safe? | Idempotent? |
|---|---|---|---|---|
| `GET` | Read | No | Yes | Yes |
| `POST` | Create, or "do an action" | Yes | No | **No** |
| `PUT` | Replace the whole thing | Yes | No | Yes |
| `PATCH` | Change some fields | Yes | No | Not guaranteed |
| `DELETE` | Remove | Usually no | No | Yes |

- **Safe** = does not change data.
- **Idempotent** = calling it 1 time or 10 times leaves the same final state.

Why idempotency matters: networks fail. A client sends `PUT /books/42 {price: 3999}`, the response is lost, the client retries. With `PUT` that is harmless. With `POST /orders` a retry creates a **second order**. Fix in section 8.

---

## 3. Status codes (the ones you will really use)

| Code | Use it when |
|---|---|
| **200 OK** | Read or update succeeded, body returned |
| **201 Created** | `POST` created something. Add a `Location: /orders/981` header |
| **202 Accepted** | Request accepted, work happens later (async job) |
| **204 No Content** | Success, nothing to return (often `DELETE`) |
| **400 Bad Request** | Malformed JSON, wrong types |
| **401 Unauthorized** | Not logged in, or token missing / expired |
| **403 Forbidden** | Logged in, but not allowed |
| **404 Not Found** | Resource does not exist (or you hide it from this user) |
| **409 Conflict** | State conflict: duplicate email, version mismatch |
| **422 Unprocessable Entity** | JSON is fine but fails business validation |
| **429 Too Many Requests** | Rate limited. Add `Retry-After` |
| **500 Internal Server Error** | Bug on your side |
| **502 / 503 / 504** | Upstream broken / service unavailable / upstream timeout |

**401 vs 403, said simply:** 401 = "who are you?", 403 = "I know who you are, and no."

**4xx vs 5xx:** 4xx means the client should change the request. 5xx means it is your problem. Clients should retry 5xx and 429 (with backoff), not most 4xx.

---

## 4. URL design rules

```text
GET    /books                    list
GET    /books/42                 one
POST   /books                    create
PATCH  /books/42                 update some fields
DELETE /books/42                 delete

GET    /users/7/orders           orders of user 7 (sub-resource)
GET    /books?author=martin&sort=-publishedAt&page=2   filter, sort, page
POST   /orders/981/cancel        an action that is not plain CRUD
```

Rules:

- Plural nouns, lowercase, hyphens: `/order-items`, not `/OrderItems`.
- Filters, sorting and paging go in the **query string**, not the path.
- Do not nest deeper than two levels. `/users/7/orders/981/items/3` → just `/order-items/3`.
- Actions that are not CRUD: a sub-resource verb (`/cancel`) is fine and common.

---

## 5. Request and response bodies

```json
POST /orders
{
  "items": [
    { "bookId": 42, "quantity": 1 },
    { "bookId": 7,  "quantity": 2 }
  ],
  "shippingAddressId": 3
}
```

```json
201 Created
Location: /orders/981
{
  "id": 981,
  "status": "PENDING_PAYMENT",
  "totalCents": 11997,
  "currency": "INR",
  "createdAt": "2026-11-06T10:15:30Z"
}
```

Rules that save you later:

- **Money as integers** (`totalCents`) plus a currency. Never floats (`0.1 + 0.2 != 0.3`).
- **Dates in ISO-8601 UTC** (`2026-11-06T10:15:30Z`). Convert to local time in the UI.
- **IDs:** numbers are fine internally. For public URLs many teams use UUIDs so people cannot guess `/orders/982`.
- Pick one naming style (camelCase is common for JSON) and never mix.
- Never return the database entity directly. Return a **DTO** so internal columns (password hash!) never leak.

---

## 6. Errors — one shape everywhere

Pick one format and use it in every service. The standard one is **Problem Details (RFC 9457)**:

```json
422 Unprocessable Entity
{
  "type": "https://api.booknest.com/errors/out-of-stock",
  "title": "Book out of stock",
  "status": 422,
  "detail": "Only 0 copies of book 42 left.",
  "instance": "/orders",
  "errors": [{ "field": "items[0].quantity", "message": "max 0" }],
  "requestId": "7f3c9a"
}
```

Spring Boot 3 has built-in support (`ProblemDetail`), shown in guide 05.

Do not: return `200` with `{"success": false}`. Clients, caches and monitoring all rely on the status code.

---

## 7. Pagination

Never return "all orders". Always page.

### Offset pagination

```text
GET /books?page=3&size=20      →  SQL: LIMIT 20 OFFSET 40
```

Easy, lets you jump to page 50. Problems: slow at large offsets (the DB still walks the skipped rows), and rows shift if data is inserted while you page.

### Cursor (keyset) pagination

```text
GET /orders?limit=20
→ { "data": [...], "nextCursor": "eyJpZCI6OTYxfQ" }

GET /orders?limit=20&cursor=eyJpZCI6OTYxfQ
→ SQL: WHERE id < 961 ORDER BY id DESC LIMIT 20
```

Fast at any depth, stable while data changes. Cannot jump to page 50. Use it for feeds and big tables.

The cursor is just the last row's sort key, base64-encoded so clients treat it as opaque.

---

## 8. Idempotency keys (safe retries for POST)

Problem: the client calls `POST /payments`, times out, retries. Did we charge twice?

```http
POST /payments
Idempotency-Key: 5b1e8c40-2a4f-4b5e-9a37-0e2f7c1d9a11
```

Server logic:

```text
1. Look up the key in a table / Redis.
2. Not found → do the work, save (key → response), return it.
3. Found     → return the saved response. Do NOT charge again.
4. Same key with a different body → 422.
```

```java
@PostMapping("/payments")
ResponseEntity<PaymentResponse> pay(
        @RequestHeader("Idempotency-Key") String key,
        @RequestBody @Valid PaymentRequest req) {
    return idempotencyStore.find(key)
        .map(saved -> ResponseEntity.ok(saved))
        .orElseGet(() -> {
            PaymentResponse res = paymentService.charge(req);
            idempotencyStore.save(key, res, Duration.ofHours(24));
            return ResponseEntity.status(201).body(res);
        });
}
```

Real code must also handle two requests with the same key arriving at the same moment (use a unique constraint on the key so only one insert wins).

---

## 9. Versioning

You will break the API one day. Options:

| Way | Example | Notes |
|---|---|---|
| URL | `/v1/books` → `/v2/books` | Most common, obvious, easy to route |
| Header | `Accept: application/vnd.booknest.v2+json` | Cleaner URLs, harder to test in a browser |

Rules: adding a field is **not** breaking. Removing or renaming a field, changing a type, or changing meaning **is** breaking. Run v1 and v2 side by side and announce a sunset date.

---

## 10. Caching headers

```http
Cache-Control: public, max-age=300     # anyone may cache for 5 minutes
Cache-Control: private, no-store       # never cache (personal data)
ETag: "b7c1"                           # version of this response
```

Next request: `If-None-Match: "b7c1"` → server answers `304 Not Modified` with no body. Saves bandwidth.

**ETags also prevent lost updates:**

```text
GET   /books/42           → ETag "v5"
PATCH /books/42  If-Match: "v5"   → OK, now "v6"
Another admin PATCH with If-Match: "v5" → 412 Precondition Failed
```

---

## 11. Other things a good API has

- **Rate limiting:** return 429 + `Retry-After`. Details in guide 20.
- **CORS:** the browser only lets `booknest.com` call `api.booknest.com` if the API sends `Access-Control-Allow-Origin`. This is a browser rule. Server-to-server calls ignore it.
- **Documentation:** OpenAPI (Swagger). Generate it from code so it never goes stale.
- **Request ID:** accept or create `X-Request-Id`, return it, log it. Support can find the exact log line.
- **Long jobs:** return `202 Accepted` + `Location: /jobs/55`, and the client polls `GET /jobs/55` (or gets a webhook).

---

## 12. REST vs GraphQL vs gRPC (one table)

| | REST | GraphQL | gRPC |
|---|---|---|---|
| Shape | Many URLs | One URL, client asks for exact fields | Methods defined in `.proto` |
| Format | JSON | JSON | Binary Protobuf |
| Best for | Public APIs, simple CRUD | Many clients needing different shapes | Fast service-to-service calls |
| Weak at | Over/under-fetching | Caching, complexity, expensive queries | Browsers (need a proxy) |

gRPC is guide 14.

---

## Spoken answer (40s)

> I model resources as plural nouns and use methods for intent: GET reads, POST creates, PUT replaces, PATCH changes fields, DELETE removes. Status codes carry meaning — 201 with a Location header on create, 401 versus 403 for auth, 409 for conflicts, 422 for business validation, 429 for rate limits — and every error uses one Problem Details shape with a request ID. Lists are always paginated, cursor-based for large or changing data. POSTs that move money take an idempotency key so retries are safe. Money is integer cents, dates are UTC ISO strings, I return DTOs not entities, and I version in the URL when I have to break something.
