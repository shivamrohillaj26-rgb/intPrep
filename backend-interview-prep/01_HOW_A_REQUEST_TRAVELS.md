# 01 — How a request travels (click → JSON)

**Goal:** you can explain, step by step, what happens when the BookNest app calls `GET https://api.booknest.com/books/42`.

This is the foundation. Every other guide is one of these steps in more detail.

---

## 0. The short version (memorize)

```text
1. DNS        name  → IP address
2. TCP        open a reliable pipe to that IP
3. TLS        encrypt the pipe (the "S" in HTTPS)
4. HTTP       send "GET /books/42" + headers
5. LB         load balancer picks one healthy server
6. Server     web server hands the request to your code (a thread)
7. Your code  filter → controller → service → repository → database
8. Response   JSON + status code travel back the same pipe
```

---

## 1. DNS — finding the address

Computers talk using IP addresses (`13.35.20.10`), not names. DNS is the phone book.

```text
Browser: "Who is api.booknest.com?"
  → browser cache? OS cache? no
  → your ISP's resolver asks the root servers → ".com" servers → booknest's DNS
  → answer: 13.35.20.10   (cached for TTL seconds, e.g. 300)
```

**Why a backend dev cares:**

- When you move a server, old IPs stay cached until the TTL runs out. Lower the TTL **before** a migration.
- AWS load balancers have changing IPs, so you point DNS at the load balancer name (a CNAME / alias), never at a raw IP.

## 2. TCP — a reliable pipe

TCP gives you "bytes arrive in order, and lost bytes are re-sent."

```text
Client → SYN          "can we talk?"
Server → SYN-ACK      "yes"
Client → ACK          "great"
```

That is the **three-way handshake**. It costs one round trip before any data moves.

**Why you care:** opening a connection is slow. That is why servers use **connection pools** (to the database, to other services) and why HTTP keep-alive reuses one connection for many requests.

## 3. TLS — encryption

TLS turns the pipe into an encrypted pipe and proves the server is really `api.booknest.com`.

- The server sends a **certificate** signed by a trusted authority.
- Client and server agree on a secret key, then all data is encrypted.
- TLS 1.3 needs one extra round trip (or zero when resuming).

**Where TLS ends in real systems:** usually at the **load balancer** ("TLS termination"). Traffic from the load balancer to your app may be plain HTTP inside a private network, or re-encrypted if the rules require it.

## 4. HTTP — the actual message

```http
GET /books/42 HTTP/1.1
Host: api.booknest.com
Authorization: Bearer eyJhbGciOi...
Accept: application/json
X-Request-Id: 7f3c9a
```

The server answers:

```http
HTTP/1.1 200 OK
Content-Type: application/json
Cache-Control: max-age=60

{"id":42,"title":"Clean Code","priceCents":3999}
```

Status codes, methods and headers are guide 02.

## 5. Load balancer — picking a server

You run the same app on 3 machines so one crash does not take the site down.

```text
                 ┌──► server A (healthy)
Client ──► LB ───┼──► server B (healthy)
                 └──► server C (failed health check → skipped)
```

- **Health check:** the LB calls `GET /health` every few seconds. Failures are removed from rotation.
- **Algorithms:** round robin, least connections.
- **L4 vs L7:** L4 balances raw TCP. L7 (AWS ALB) reads HTTP, so it can route `/books/*` to the book service and `/orders/*` to the order service.
- **Sticky sessions:** sending one user to the same server always. Avoid it. Keep servers **stateless** so any server can handle any request (session data goes in Redis or a token).

## 6. The server process — threads

Inside one Java server (Tomcat, which Spring Boot embeds):

```text
Request arrives
  → a worker thread is taken from a pool (e.g. 200 threads)
  → that thread runs your code until the response is written
  → thread goes back to the pool
```

If all 200 threads are stuck waiting on a slow database, request 201 waits in a queue. That is how "the database got slow" turns into "the whole site is down." Guide 04 covers threads. Node.js does this differently with one event loop (guide 19).

## 7. Your code — the layers

```text
Filter / interceptor   check the token, add request id, log
     ▼
Controller             read the URL and JSON, call the service
     ▼
Service                business rules ("can this user buy this?")
     ▼
Repository             talk to the database
     ▼
Database               run SQL, return rows
```

Minimal Spring Boot version of `GET /books/42`:

```java
@RestController
@RequestMapping("/books")
class BookController {
    private final BookService service;

    BookController(BookService service) {
        this.service = service;
    }

    @GetMapping("/{id}")
    BookResponse get(@PathVariable long id) {
        return service.getBook(id);
    }
}

@Service
class BookService {
    private final BookRepository repo;

    BookService(BookRepository repo) {
        this.repo = repo;
    }

    BookResponse getBook(long id) {
        Book book = repo.findById(id)
            .orElseThrow(() -> new NotFoundException("Book " + id + " not found"));
        return new BookResponse(book.getId(), book.getTitle(), book.getPriceCents());
    }
}
```

Guide 05 builds this fully.

## 8. The response trip back

The JSON goes back through the same layers, the same TLS pipe, to the client. Then:

- the connection may stay open (keep-alive) for the next request,
- the browser may cache the response if `Cache-Control` allows it.

---

## Where time goes (latency numbers to remember)

| Thing | Rough time |
|---|---|
| Read from memory | 100 nanoseconds |
| Read from Redis in the same data center | 0.5 ms |
| Simple indexed SQL query | 1–5 ms |
| Call another service in the same region | 2–20 ms |
| Round trip India ↔ US | 200–250 ms |
| Full table scan on a large table | seconds |

**Lesson:** the network and the database are where time goes, almost never your Java `for` loop.

---

## Common mistakes

| Mistake | Why it hurts | Fix |
|---|---|---|
| Opening a new DB connection per request | TCP + auth every time | Connection pool (HikariCP) |
| Storing login state in server memory | LB sends the user to another server and they are "logged out" | Stateless token, or session in Redis |
| No timeout on outgoing calls | One slow service freezes all your threads | Always set connect + read timeouts |
| Health check that only returns 200 | Server says healthy while the DB is down | Check critical dependencies (carefully, see guide 17) |

---

## Spoken answer (45s)

> When the client calls an API, DNS turns the name into an IP, TCP opens a connection, and TLS encrypts it. The HTTP request reaches a load balancer that picks a healthy server, usually terminating TLS. Inside the server a worker thread runs a filter that checks the token, then the controller parses the request, the service applies business rules, and the repository queries the database through a connection pool. The JSON goes back the same way. Most latency is network and database, so I focus on pooling, timeouts, indexes and caching, and I keep servers stateless so the load balancer can send any request anywhere.
