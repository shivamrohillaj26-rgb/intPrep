# HTTP/1.1 vs HTTP/2 & Network Optimizations — Interview Guide

---

## 1. Why Frontend Engineers Care About HTTP Versions

Frontend performance is not only JS/CSS code quality.

Network waterfalls dominate real-user experience:

- DNS lookup
- TCP/TLS handshake
- request queueing
- download time
- resource prioritization

Interview one-liner:

> HTTP/1.1 and HTTP/2 differ mainly in how multiple resources are requested over connections; HTTP/2’s multiplexing removes many HTTP/1.1 workarounds and improves parallel loading efficiency.

---

## 2. Quick Networking Path For A Page

```text
Type URL
-> DNS resolve
-> TCP connect
-> TLS handshake (HTTPS)
-> HTTP request
-> server response
-> browser parses and requests more assets (CSS/JS/images/fonts)
-> repeat for dependent resources
```

Critical idea: first HTML discovery starts a chain of more requests.

---

## 3. HTTP/1.1 — How It Works (Frontend View)

### Characteristics

- text-based headers
- one request/response at a time per TCP connection (response must finish before next on that connection)
- browsers open multiple parallel connections per origin (historically ~6)
- head-of-line blocking at HTTP connection level

### Practical consequence

If one slow response holds a connection, other requests waiting on that same connection are delayed.

To load many small files, browsers use several connections, but there is still overhead and limits.

---

## 4. HTTP/1.1 Workarounds Frontend Teams Used

Because many small files performed poorly on HTTP/1.1:

1. **Concatenation**  
   Combine many JS/CSS files into fewer files.

2. **Image sprites**  
   Combine many icons into one image.

3. **Domain sharding**  
   Split assets across `static1.example.com`, `static2.example.com` to get more parallel connections.

4. **Inlining small assets**  
   Put tiny CSS/images directly into HTML.

These were optimizations for protocol limitations, not always ideal for caching/modularity.

---

## 5. HTTP/2 — How It Improves Things

### Major features

| Feature | Meaning |
|---|---|
| Binary framing | more efficient parsing than text protocol |
| Multiplexing | many requests/responses in parallel on **one** connection |
| Header compression (HPACK) | less overhead for repeated headers |
| Stream prioritization | browser can prioritize critical resources |
| Server push (optional/rare now) | server could push predicted assets (mostly declined in practice) |

### Multiplexing (the headline feature)

```text
HTTP/1.1 (one connection):
req1 ------>
<------ res1
req2 ------>
<------ res2

HTTP/2 (one connection):
req1 ------>
req2 ------>
req3 ------>
<--res interleaved frames--
```

Many streams share one TCP connection concurrently.

---

## 6. HTTP/1.1 vs HTTP/2 Comparison

| Topic | HTTP/1.1 | HTTP/2 |
|---|---|---|
| Parallel requests per connection | effectively one at a time | many multiplexed streams |
| Connections per origin | many (~6) | usually one (or few) |
| Header cost | repeated heavy headers | compressed |
| Small file loading | costly, often concatenated | much better natively |
| Domain sharding | sometimes helpful | usually harmful/unnecessary |
| Prioritization | limited | better stream priority support |

Interview tip:

> Many HTTP/1.1 best practices (sharding, aggressive concatenation) are less necessary or counterproductive on HTTP/2.

---

## 7. Important Caveat: TCP Head-Of-Line Blocking

HTTP/2 removes HTTP-level HOL blocking via multiplexing, but still runs over TCP.

If a TCP packet is lost, it can delay the whole connection (all multiplexed streams).

This is one motivation for **HTTP/3 (QUIC/UDP)**:

- independent stream recovery characteristics
- better on lossy networks

For interviews: mention HTTP/3 as evolution if asked “what’s next?”

---

## 8. Network Optimizations Frontend Should Still Do

Protocol upgrade is not enough. Optimize resource strategy.

### A) Reduce bytes

- minify + compress (Brotli/Gzip)
- modern image formats (WebP/AVIF)
- responsive images (`srcset`)
- subset fonts
- tree-shake JS

### B) Reduce request waterfalls

- discover critical assets early (preload)
- avoid deep chain: HTML → JS → late CSS discovery if possible
- inline critical CSS for first paint when useful

### C) Reduce round trips / latency impact

- use CDN close to users
- HTTP keep-alive / persistent connections (default modern)
- TLS session resumption / modern stacks
- fewer cross-origin critical dependencies (each may need new connection + CORS/TLS)

### D) Cache aggressively and correctly

```text
Hashed assets: Cache-Control: public, max-age=31536000, immutable
HTML: short cache / revalidate
```

Caching often beats micro-optimizations.

### E) Prioritize critical resources

```html
<link rel="preload" href="hero.webp" as="image" />
<link rel="preload" href="main.css" as="style" />
<script src="main.js" defer></script>
```

### F) Lazy-load non-critical resources

- below-the-fold images `loading="lazy"`
- route-level JS chunks
- third-party scripts delayed

---

## 9. Resource Hints Cheat Sheet

```html
<link rel="preconnect" href="https://cdn.example.com" />
<link rel="dns-prefetch" href="https://cdn.example.com" />
<link rel="preload" href="/font.woff2" as="font" crossorigin />
<link rel="prefetch" href="/next-page.js" as="script" />
```

| Hint | Use |
|---|---|
| `dns-prefetch` | resolve DNS early |
| `preconnect` | DNS + TCP + TLS early |
| `preload` | current-page critical asset |
| `prefetch` | likely next navigation asset |

`preconnect` is stronger/more expensive than dns-prefetch; use for known critical origins.

---

## 10. Waterfall Thinking (Interview Storytelling)

Bad waterfall:

```text
HTML
 -> blocking CSS
 -> blocking JS in head
 -> JS requests API
 -> API returns
 -> JS requests more JS chunk late
 -> images start late
```

Optimized:

```text
HTML (+ critical CSS inline)
 -> preload font/hero
 -> deferred JS
 -> async non-critical third parties
 -> lazy images below fold
 -> HTTP/2 multiplexed asset download
```

Speak in waterfalls during system design answers.

---

## 11. How This Changes Bundle Strategy

### On HTTP/1.1

- fewer larger files often better
- concatenation made sense

### On HTTP/2/HTTP/3

- many smaller modular chunks are more acceptable
- fine-grained caching can improve repeat visits
- still avoid hundreds of tiny ultra-fragmented files (compression/priority/overhead realities remain)

Balanced modern approach:

- split by route/feature
- don’t over-shard into tiny noise files
- keep critical path lean

---

## 12. CDN And Edge Delivery

CDN benefits:

- lower latency
- offload origin
- better parallel throughput globally
- edge caching of static hashed assets

Frontend checklist:

- static assets on CDN
- correct cache headers
- compression enabled
- HTTP/2 or HTTP/3 enabled on CDN

---

## 13. Third-Party Network Costs

Third parties (analytics, chat widgets, A/B tools):

- extra DNS/TLS
- contention with first-party bandwidth
- main-thread execution cost after download

Mitigations:

- load async/defer after idle/timeout
- self-host when possible
- strict third-party budget
- facades (load chat only on click)

---

## 14. Measuring Network Performance

Tools:

- Chrome Network panel (waterfall, priority, protocol column)
- Lighthouse
- WebPageTest
- Performance panel + network timing

Check:

- protocol (`h2`, `h3`, `http/1.1`)
- priority of LCP image/CSS
- long chains of critical requests
- compression (`br`/`gzip`)
- cache hits on reload

---

## 15. Common Interview Questions

**Q: Key difference between HTTP/1.1 and HTTP/2?**  
A: HTTP/2 multiplexes many streams over one connection; HTTP/1.1 effectively handles one request at a time per connection and relies on multiple connections.

**Q: Is domain sharding still recommended?**  
A: Generally no on HTTP/2; extra connections/TLS can hurt.

**Q: Does HTTP/2 mean I should never concatenate?**  
A: Not never, but aggressive concatenation is less necessary; split by logical caching units and critical path needs.

**Q: What network optimizations still matter most?**  
A: Fewer critical bytes, better caching, CDN, preload critical assets, reduce waterfalls, lazy-load non-critical resources.

**Q: What is HTTP/3’s main advantage?**  
A: Runs over QUIC/UDP and improves performance under packet loss by reducing connection-level blocking issues seen with TCP.

---

## 16. Spoken Answer (60–90 sec)

> In HTTP/1.1, each connection handles one request at a time, so browsers open multiple connections and teams used concatenation and sharding. HTTP/2 adds multiplexing, header compression, and better prioritization, so many assets can load efficiently over one connection and sharding becomes unnecessary. Even with HTTP/2, I still optimize the network path: compress and cache assets, use a CDN, preload critical resources, cut request waterfalls, and lazy-load non-critical JS/images. I’d verify the protocol and waterfall in DevTools and Lighthouse.

---

## 17. Cheat Sheet

```text
HTTP/1.1:
- one req/res at a time per connection
- ~6 connections/origin
- concat/sprites/sharding workarounds

HTTP/2:
- multiplexed streams
- header compression
- better prioritization
- usually one connection
- avoid domain sharding

Still optimize:
- bytes (compress/minify/images)
- caching + CDN
- preload critical
- reduce waterfalls
- lazy non-critical
- watch third parties

Next: HTTP/3 / QUIC
```

---

## 18. Practice Checklist

- [ ] Explain HTTP/1.1 connection limitation
- [ ] Explain HTTP/2 multiplexing
- [ ] Say why sharding is outdated on h2
- [ ] List 6 network optimizations
- [ ] Explain preload vs prefetch vs preconnect
- [ ] Mention HTTP/3 at high level
