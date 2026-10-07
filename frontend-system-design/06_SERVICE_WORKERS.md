# Service Workers — Frontend System Design Interview Guide

---

## 1. What Is A Service Worker?

A **Service Worker** is a special background script that sits between the web app and the network.

It can:

- intercept requests
- cache responses
- serve offline content
- handle background-ish capabilities (push notifications, background sync where supported)

Interview one-liner:

> A Service Worker is a programmable network proxy in the browser that enables caching, offline support, and faster repeat loads by intercepting fetch requests.

---

## 2. Web Worker vs Service Worker (Must Clear This First)

| Feature | Web Worker | Service Worker |
|---|---|---|
| Main purpose | CPU offloading | Network/caching/offline |
| DOM access | No | No |
| Runs in background thread | Yes | Yes |
| Intercepts HTTP requests | No | Yes (`fetch` event) |
| Tied to page lifetime | Mostly yes (page owns worker) | Can outlive page |
| Scope | Script usage | Origin + path scope |
| Typical use | heavy computation | PWA, offline, cache strategies |

They are related (both off main thread), but solve different problems.

---

## 3. Where Service Worker Sits

```text
Page (UI)
   |
   | fetch('/api/data')
   v
Service Worker (optional intercept)
   |
   +--> Cache Storage?
   |
   +--> Network
```

This is why service workers are powerful for performance and offline UX.

---

## 4. Lifecycle (Critical Interview Topic)

```text
1) Register
2) Install
3) Activate
4) Idle / fetch events
5) Update (new SW installs, then activates)
```

### 1) Register (from page)

```js
if ('serviceWorker' in navigator) {
  navigator.serviceWorker.register('/sw.js')
    .then((reg) => console.log('SW registered', reg.scope))
    .catch(console.error);
}
```

### 2) Install

Fired when browser installs SW (first time or update).

```js
self.addEventListener('install', (event) => {
  event.waitUntil(
    caches.open('static-v1').then((cache) => {
      return cache.addAll([
        '/',
        '/index.html',
        '/styles.css',
        '/app.js'
      ]);
    })
  );
});
```

### 3) Activate

Used for cleanup of old caches and taking control.

```js
self.addEventListener('activate', (event) => {
  event.waitUntil(
    caches.keys().then((keys) =>
      Promise.all(
        keys
          .filter((key) => key !== 'static-v1')
          .map((key) => caches.delete(key))
      )
    )
  );
});
```

Often also:

```js
self.clients.claim(); // control open pages immediately
```

And during install:

```js
self.skipWaiting(); // activate new SW faster
```

---

## 5. Intercepting Requests (`fetch` event)

```js
self.addEventListener('fetch', (event) => {
  event.respondWith(
    caches.match(event.request).then((cached) => {
      return cached || fetch(event.request);
    })
  );
});
```

This is the core offline/cache capability.

---

## 6. Common Caching Strategies

### A) Cache First

```text
Request -> Cache hit? return cache : network -> store -> return
```

Best for:

- static assets (hashed JS/CSS/images/fonts)

```js
event.respondWith(
  caches.match(event.request).then((cached) => {
    if (cached) return cached;

    return fetch(event.request).then((response) => {
      const copy = response.clone();
      caches.open('static-v1').then((cache) => cache.put(event.request, copy));
      return response;
    });
  })
);
```

### B) Network First

```text
Request -> Network success? return (+ maybe cache) : fallback to cache
```

Best for:

- API data that should be fresh
- HTML pages in many apps

### C) Stale-While-Revalidate

```text
Return cache immediately (if any)
AND fetch network in parallel to update cache
```

Best for:

- assets/content where instant response matters and slight staleness is ok

### D) Network Only / Cache Only

- Network only: sensitive/uncacheable requests
- Cache only: fully offline predetermined assets

Interview tip:

> Choose strategy by resource type. Static hashed assets = cache-first. API freshness = network-first. UX-speed with background update = stale-while-revalidate.

---

## 7. Offline Support Mental Model

With SW + Cache Storage:

1. First visit online: install caches shell/assets
2. Second visit / offline: SW serves cached shell
3. App can show offline page or cached data

App Shell pattern:

```text
Cache:
- index.html shell
- critical CSS/JS
- offline fallback page

Runtime:
- API data via network-first
```

---

## 8. HTTPS Requirement

Service Workers require **secure context**:

- HTTPS
- or `localhost` for development

Why? Because SW can intercept all requests in scope — powerful and sensitive.

---

## 9. Scope Rules

SW controls pages under its scope.

```text
/sw.js registered at root => scope usually /
/assets/sw.js => scope often /assets/ (limited)
```

Put service worker at root if it should control the whole app.

---

## 10. Updates And Versioning (Very Important)

Browsers update SW when `sw.js` changes.

Typical flow:

1. New SW downloads/installs in background
2. Old SW keeps controlling pages until all tabs close (unless skipWaiting/clients.claim)
3. New SW activates
4. Old caches deleted in activate handler

Always version caches:

```text
static-v1
static-v2
```

Never forget cache cleanup, or disk usage grows forever.

---

## 11. What Service Workers Are Good For

- Offline-first / PWA behavior
- Faster repeat visits (cache static assets)
- Precaching app shell
- Push notifications (with permission + backend)
- Background Sync (limited support/situational)
- Reducing network dependency for known static files

---

## 12. What They Are Not

- Not a Web Worker replacement for heavy CPU math
- Not direct DOM scripting
- Not magic for first visit if nothing cached yet
- Not always simple (cache invalidation is hard)

---

## 13. Safety / Pitfall Checklist

1. Caching POST/API responses incorrectly can show stale/private data
2. Forgetting cache version cleanup
3. Caching opaque/error responses blindly
4. Serving old HTML that points to deleted hashed assets
5. Aggressive cache-first on frequently changing APIs
6. Update UX: users stuck on old SW until refresh strategy is designed

HTML caching tip:

> Be careful cache-first caching `index.html` in SPAs. Wrong strategy can pin users to old app version.

Often:

- HTML: network-first
- hashed JS/CSS: cache-first

---

## 14. Minimal End-to-End Example

### register.js (in app)

```js
navigator.serviceWorker.register('/sw.js');
```

### sw.js

```js
const CACHE = 'app-v1';
const ASSETS = ['/', '/index.html', '/styles.css', '/app.js'];

self.addEventListener('install', (event) => {
  event.waitUntil(caches.open(CACHE).then((c) => c.addAll(ASSETS)));
  self.skipWaiting();
});

self.addEventListener('activate', (event) => {
  event.waitUntil(
    caches.keys().then((keys) =>
      Promise.all(keys.filter((k) => k !== CACHE).map((k) => caches.delete(k)))
    )
  );
  self.clients.claim();
});

self.addEventListener('fetch', (event) => {
  event.respondWith(
    caches.match(event.request).then((cached) => cached || fetch(event.request))
  );
});
```

---

## 15. Service Worker + Performance System Design

How it connects to other topics:

- **CRP**: cached CSS/JS can load instantly on repeat visits
- **Bundles**: hashed chunks are perfect cache-first candidates
- **HTTP/2 + CDN**: still useful for first fetch; SW improves subsequent loads/offline
- **Lazy loading**: cached lazy chunks make later navigations near-instant offline/online

Spoken combo answer:

> On first visit I optimize network and critical path. On repeat visits a Service Worker cache can serve static hashed assets instantly and provide offline fallback.

---

## 16. Push Notifications (High-Level Only)

If asked:

1. User grants notification permission
2. App subscribes via SW push manager
3. Backend sends push message
4. SW `push` event shows notification

Don’t go deep unless interviewer asks.

---

## 17. Common Interview Questions

**Q: What is a Service Worker?**  
A: Background proxy script that intercepts network requests and manages caches for offline/performance.

**Q: Difference between Service Worker and Web Worker?**  
A: Web Worker = CPU offload; Service Worker = network interception/caching/offline/PWA features.

**Q: Why HTTPS?**  
A: SW can intercept requests; secure context prevents man-in-the-middle abuse.

**Q: Explain install vs activate.**  
A: Install prepares caches; activate cleans old caches and takes control of clients.

**Q: Cache-first vs network-first?**  
A: Cache-first prioritizes speed/offline for static assets; network-first prioritizes freshness for dynamic data.

**Q: Biggest challenge?**  
A: Correct cache invalidation and update strategy.

---

## 18. Spoken Answer (60–90 sec)

> A Service Worker acts like a programmable middle layer between the app and the network. After registration, it installs and precaches assets, then activates and can intercept fetch requests. Depending on strategy, it can serve cache-first for hashed static files or network-first for APIs. That enables offline support and much faster repeat loads. Unlike Web Workers, service workers are about networking and caching, not heavy computation. The hard part is versioning caches and making sure users receive updates safely.

---

## 19. Cheat Sheet

```text
Service Worker = network proxy + cache + offline

Lifecycle: register -> install -> activate -> fetch
Needs HTTPS (or localhost)
No DOM access

Strategies:
- cache-first: static hashed assets
- network-first: HTML/API freshness
- stale-while-revalidate: fast + update in background

Version caches + delete old ones
skipWaiting + clients.claim for faster takeover

SW != Web Worker
```

---

## 20. Practice Checklist

- [ ] Explain SW vs Web Worker in 20 seconds
- [ ] Draw request flow through SW
- [ ] Describe install/activate/fetch lifecycle
- [ ] Choose strategy for JS/CSS vs API
- [ ] Mention HTTPS + cache versioning pitfalls
