# WebSockets — How They Work (Interview Deep Dive)

Full duplex, persistent connection between browser and server.  
This guide is the **how** (handshake, frames, lifecycle) plus frontend system design.

Related: high-frequency UI freezes → [../scenario-based-questions/05_WEBSOCKET_HIGH_FREQUENCY_UPDATES.md](../scenario-based-questions/05_WEBSOCKET_HIGH_FREQUENCY_UPDATES.md)  
SSE vs WS choice → [../scenario-based-questions/LICIOUS_MANAGERIAL_FRONTEND.md](../scenario-based-questions/LICIOUS_MANAGERIAL_FRONTEND.md) §1  

**NUX IDMS bell / push is not WebSockets** — it is **FCM + REST pull**. Details: [../onetrust/ONETRUST_NOTIFICATIONS_FCM.md](../onetrust/ONETRUST_NOTIFICATIONS_FCM.md).

---

## 1. One-liner

> A WebSocket starts as an **HTTP request that upgrades** to a long-lived TCP (or TLS) connection. After the handshake, **both sides can send messages anytime** without a new HTTP request/response per message.

```text
HTTP:  request → response → connection often done
WS:    handshake once → many messages both ways on same connection
```

---

## 2. Why WebSockets exist

Classic HTTP polling:

```text
Client: any news?  Server: no
Client: any news?  Server: no
Client: any news?  Server: yes — here
```

Problems: latency, wasted requests, headers repeated every time.

WebSocket:

```text
Connect once
Server pushes when something happens
Client can also send anytime (chat, presence, typing)
```

---

## 3. Lifecycle overview

```text
1. Client opens WebSocket URL (ws:// or wss://)
2. Browser sends HTTP Upgrade handshake
3. Server responds 101 Switching Protocols
4. Connection is now a WebSocket (not normal HTTP)
5. Either side sends frames (text/binary/control)
6. Close handshake → connection ends
7. App may reconnect with backoff
```

---

## 4. The handshake (what happens under the hood)

### Client → Server (HTTP request that asks to switch protocols)

```http
GET /live HTTP/1.1
Host: api.example.com
Connection: Upgrade
Upgrade: websocket
Sec-WebSocket-Version: 13
Sec-WebSocket-Key: dGhlIHNhbXBsZSBub25jZQ==
Origin: https://app.example.com
```

Important headers:

| Header | Role |
|---|---|
| `Connection: Upgrade` | “I want to change protocols” |
| `Upgrade: websocket` | Target protocol |
| `Sec-WebSocket-Key` | Random nonce (security / handshake proof) |
| `Sec-WebSocket-Version` | Protocol version (13 is standard) |
| `Origin` | Browser sends this — server should validate (CSRF-ish) |

### Server → Client (accept)

```http
HTTP/1.1 101 Switching Protocols
Connection: Upgrade
Upgrade: websocket
Sec-WebSocket-Accept: s3pPLMBiTxaQ9kYGzzhZRbK+xOo=
```

`Sec-WebSocket-Accept` = hash of client key + magic GUID (proves server understands WS).

After **101**, the TCP/TLS socket stays open and speaks **WebSocket frames**, not HTTP messages.

### URL schemes

| Scheme | Meaning |
|---|---|
| `ws://` | WebSocket, plain (like `http://`) |
| `wss://` | WebSocket over TLS (like `https://`) — **use in production** |

```js
const ws = new WebSocket('wss://api.example.com/live');
```

Browser API: you never write the handshake headers yourself — `new WebSocket(url)` does it.

---

## 5. After connect — frames (the message unit)

Data is sent as **frames**, not full HTTP requests.

```text
┌────────── Frame ──────────┐
│ opcode (text/binary/…)    │
│ payload length            │
│ payload bytes             │
└───────────────────────────┘
```

Common opcodes:

| Type | Use |
|---|---|
| **Text** | JSON strings (most web apps) |
| **Binary** | Protobuf, images, game state |
| **Ping / Pong** | Keepalive / liveness |
| **Close** | Graceful shutdown |

App-level mental model:

```js
ws.send(JSON.stringify({ type: 'chat', text: 'hi' })); // client → server
ws.onmessage = (e) => {
  const msg = JSON.parse(e.data); // server → client
};
```

Low overhead vs repeating HTTP headers on every poll.

---

## 6. Full duplex — what that means

```text
         Client                      Server
           │                           │
           │◄──── price update ────────┤  server can push
           │─── typing indicator ─────►│  client can send
           │◄──── ack / broadcast ─────┤
           │                           │
```

Compare:

| | Direction | Connection model |
|---|---|---|
| HTTP request/response | Client asks, server answers | Short-lived (usually) |
| SSE | Server → client only | Long-lived HTTP |
| WebSocket | **Both ways anytime** | Long-lived after upgrade |

---

## 7. Browser API — practical example

```js
const ws = new WebSocket('wss://api.example.com/orders/live');

ws.onopen = () => {
  console.log('connected');
  ws.send(JSON.stringify({ type: 'subscribe', orderId: 'A1' }));
};

ws.onmessage = (event) => {
  // event.data is string (text frame) or Blob/ArrayBuffer (binary)
  const data = JSON.parse(event.data);
  if (data.type === 'status') updateUI(data.status);
};

ws.onerror = (err) => console.error('ws error', err);

ws.onclose = (event) => {
  console.log('closed', event.code, event.reason);
  // usually: scheduleReconnect()
};

// later
ws.close(1000, 'client leaving page');
```

### Ready states

```text
CONNECTING = 0
OPEN       = 1  ← only send when OPEN
CLOSING    = 2
CLOSED     = 3
```

```js
if (ws.readyState === WebSocket.OPEN) ws.send(...);
```

---

## 8. Auth — how do you secure a socket?

Browsers **cannot set custom headers** on the WebSocket constructor (unlike `fetch`).

Common patterns:

| Pattern | How |
|---|---|
| **Cookie session** | `wss://` same-site; cookie sent on handshake |
| **Token in query** (less ideal) | `wss://api/live?token=…` — leaks via logs/Referer risk |
| **First message auth** | Connect → send `{ type:'auth', token }` → server validates |
| **Short-lived ticket** | HTTP `POST /ws-ticket` → connect with one-time ticket |

**Say in interview:**  
> Prefer cookie/`wss` same-site or a short-lived ticket. Don’t put long-lived JWTs in query strings.

Also validate `Origin` on the server.

---

## 9. Reconnect, heartbeats, backpressure (production FE)

Real networks drop. Your design must include:

### Reconnect with exponential backoff + jitter

```js
function connect() {
  const ws = new WebSocket(url);
  ws.onclose = () => {
    const delay = Math.min(30_000, base * 2 ** attempt) + Math.random() * 500;
    setTimeout(connect, delay);
  };
}
```

### Heartbeat

- Server or client sends **ping**; expect **pong**  
- If silent too long → close and reconnect  
- Detects half-open connections (WIFI went away)

### Resume / sync after reconnect

```text
On reconnect:
  send lastSeenEventId / cursor
  server sends missed events OR client refetches snapshot via HTTP
```

Don’t assume the in-memory stream had no gaps.

### Backpressure (high frequency)

If server sends 1000 msgs/sec:

- Coalesce on client (`rAF`, last-write-wins per id)  
- Or server sends snapshots / rooms / subscriptions only for visible data  

See scenario 5 for UI freeze fixes.

---

## 10. Frontend architecture patterns

### A) Thin socket service + domain handlers

```text
WsService (connect, reconnect, auth)
   │
   ├── on('order.status', …)
   ├── on('chat.message', …)
   └── send('chat.send', …)
```

Use a tiny event bus or RxJS `Subject` so components don’t each open a socket.

### B) One socket per app (usual)

```text
❌ 20 components × 20 WebSockets
✅ 1 shared connection, multiplex message types
```

```json
{ "type": "order.status", "payload": { "id": "A1", "status": "OUT" } }
{ "type": "notif", "payload": { … } }
```

### C) Rooms / channels

```js
send({ type: 'join', room: 'order:A1' });
send({ type: 'leave', room: 'order:A1' });
```

Server only fans out relevant events → less traffic.

### D) Hybrid with HTTP

```text
Initial state:  GET /orders/A1          (reliable snapshot)
Live updates:   WS subscribe order:A1   (deltas)
Mutations:      POST /orders/A1/cancel  (or WS command + ack)
```

HTTP for critical writes is often simpler (retries, status codes, idempotency).

---

## 11. Scaling WebSockets on the backend (FE should know)

| Challenge | Approach |
|---|---|
| Many open connections | Sticky sessions or shared pub/sub (Redis) |
| Multi-instance servers | Publish event to Redis → all nodes with that user’s socket emit |
| Load balancer | Support Upgrade / idle timeouts tuned for WS |
| Fan-out storms | Rooms, filter server-side, don’t broadcast everything |

```text
User A connected to Server 1
Order service publishes "status=OUT" to Redis channel order:A1
Server 1 subscribed → writes WS frame to User A
```

**Interview line:**  
> WebSockets move complexity to connection management and horizontal fan-out — that’s why we don’t use them for every notification if SSE or polling is enough.

---

## 12. WebSocket vs HTTP vs SSE vs polling

| | Polling | Long poll | SSE | WebSocket |
|---|---|---|---|---|
| Direction | C→S ask | C→S ask | S→C | **Both** |
| Overhead | High | Medium | Low-medium | Lowest per msg after connect |
| Binary | Yes (HTTP) | Yes | Text events | Yes |
| Reconnect | DIY | DIY | Built into `EventSource` | DIY |
| Proxies/CDN | Easy | Medium | Easier | Harder |
| Best for | Rare updates | Semi-live | Server push feeds | Chat, games, collab, duplex |

### When WebSockets are right

- Chat / multiplayer / collaborative editing  
- Client sends high-frequency input (cursor, trading orders)  
- Custom binary protocols  
- True bidirectional channels  

### When to skip WebSockets

- Order status every few seconds → **SSE** or short polling  
- Mostly request/response CRUD → **HTTP**  
- Need simple CDN caching of responses → HTTP  

---

## 13. Angular / React usage sketch

### React

```tsx
useEffect(() => {
  const ws = new WebSocket(url);
  ws.onmessage = (e) => setStatus(JSON.parse(e.data).status);
  return () => ws.close(); // cleanup on unmount
}, [orderId]);
```

Prefer a context/store owning the socket so Strict Mode double-mount doesn’t open 2 sockets carelessly (guard with ref/singleton).

### Angular

```ts
@Injectable({ providedIn: 'root' })
export class LiveService {
  private ws?: WebSocket;
  readonly messages$ = new Subject<unknown>();

  connect(url: string) {
    this.ws = new WebSocket(url);
    this.ws.onmessage = (e) => this.messages$.next(JSON.parse(e.data));
  }
}
```

Unsubscribe / `close()` on `DestroyRef`.

---

## 14. Close codes (handy)

| Code | Meaning |
|---|---|
| 1000 | Normal close |
| 1001 | Going away (page navigation) |
| 1006 | Abnormal close (no close frame — network) |
| 1008 | Policy violation (auth) |
| 1011 | Server error |

Use `onclose` code to decide retry vs logout.

---

## 15. Security checklist

- [ ] `wss://` in production  
- [ ] Validate `Origin`  
- [ ] Auth before subscribing to sensitive rooms  
- [ ] Rate-limit messages per connection  
- [ ] Don’t trust client payloads — validate schema  
- [ ] Sanitize anything rendered from messages (XSS)  

---

## 16. Common interview questions

**Q: How does a WebSocket connection start?**  
> As HTTP with `Upgrade: websocket`. Server returns `101 Switching Protocols`, then both sides speak WebSocket frames on that TCP/TLS connection.

**Q: Is it still HTTP after connect?**  
> No. HTTP is only used for the upgrade handshake. After 101 it’s the WebSocket protocol.

**Q: Why wss?**  
> Encrypts the persistent channel (TLS), same reason as HTTPS.

**Q: Can I set Authorization header in browser WS?**  
> Not via the WebSocket API. Use cookies, ticket query, or auth as first message.

**Q: SSE vs WebSocket?**  
> SSE = one-way server push over HTTP, auto-reconnect. WS = duplex, binary, more ops complexity.

**Q: What breaks at scale?**  
> Idle timeouts, sticky sessions, fan-out across nodes — solve with Redis pub/sub and careful room design.

**Q: Why did the UI freeze with WS?**  
> Too many messages → main-thread parse + React render. Coalesce, virtualize, subscribe less. (Scenario 5.)

---

## 17. Spoken answers

### 30s — How do WebSockets work?

> The browser starts with an HTTP request that includes `Upgrade: websocket`. If the server agrees, it responds **101** and the same connection becomes a full-duplex WebSocket channel. After that, either side can push frames anytime without a new HTTP request. We use `wss` in production, handle reconnect/heartbeat ourselves, and usually multiplex many event types on one socket.

### 20s — When do you use them?

> When we need low-latency bidirectional messaging — chat, live collaboration, client streaming input. For server-only push I’d prefer SSE; for normal CRUD, HTTP.

---

## 18. Mini system design — live order tracking

```text
App
  → HTTP GET /orders/A1          (snapshot)
  → WSS connect + {subscribe: A1}
  → on message status → update UI
  → on reconnect → resubscribe + HTTP refresh if gap

Server
  → Order service emits domain event
  → Pub/Sub → WS gateway → user's socket
```

Licious-style: tracking can be **SSE** if the client never needs to talk on that channel; use **WS** if driver app / chat / live map needs duplex.

---

## 19. Practice checklist

- [ ] Explain Upgrade → 101 handshake  
- [ ] Draw full-duplex vs SSE  
- [ ] Write connect / onmessage / cleanup  
- [ ] Explain reconnect + heartbeat + resume  
- [ ] Name one auth pattern without custom WS headers  
- [ ] Say when Redis pub/sub appears in the design  

---

## Related

| Topic | File |
|---|---|
| WS UI freezes / coalescing | [../scenario-based-questions/05_WEBSOCKET_HIGH_FREQUENCY_UPDATES.md](../scenario-based-questions/05_WEBSOCKET_HIGH_FREQUENCY_UPDATES.md) |
| SSE vs WS managerial | [../scenario-based-questions/LICIOUS_MANAGERIAL_FRONTEND.md](../scenario-based-questions/LICIOUS_MANAGERIAL_FRONTEND.md) |
| HTTP/1 vs HTTP/2 | [04_HTTP1_VS_HTTP2_NETWORK_OPTIMIZATIONS.md](./04_HTTP1_VS_HTTP2_NETWORK_OPTIMIZATIONS.md) |
| Auth cookies / XSS | [10_FRONTEND_AUTH_SECURITY.md](./10_FRONTEND_AUTH_SECURITY.md) |
