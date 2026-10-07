# Scenario Questions — Interview Cheat Sheet (Angular)

One-screen revision. Depth in `01`–`10`. All answers assume **Angular** unless they explicitly ask React.

---

## Answer skeleton

1. Clarify constraints & metrics  
2. Diagnose (CD, Zone, HttpClient, store — not just “React re-renders”)  
3. Layered redesign  
4. **Why A over B**  
5. Strangler rollout  
6. Success metrics  

---

## Chosen approaches (one line each)

| # | Choose this | Over that |
|---|---|---|
| 1 | Visibility + `HttpClient`/`resource`/`shareReplay` + BFF/SSE; OnPush widgets | 50 `interval`s; dump widgets into NgRx |
| 2 | State-by-type: HTTP/`resource` server; **one** NgRx **or** signal store; router URL; reactive forms | NgRx + Cart `BehaviorSubject` forever |
| 3 | Native Federation; singleton Angular/RxJS/kernel; host `loadRemoteModule`; SHA manifest | Duplicate `@angular/core`; mega shared NgRx |
| 4 | `resource`/HttpClient cache + thin NgRx | 100 `loadXSuccess` reducers |
| 5 | WS **outside NgZone**; rAF coalesce; per-symbol signals; CDK virtual | `quotes = [...]` every tick; Zone per message |
| 6 | `allowJs`/ratchet `strictTemplates`; standalone for new code | Big-bang rewrite; `strict` Monday |
| 7 | Prerender marketing; CSR dashboard; `@angular/ssr` if per-request | CSR-only brochure; SSR the IDMS app |
| 8 | Server cursor + CDK virtual + OnPush `track` | `*ngFor` 100k rows |
| 9 | CDN/lazy/BFF + Nx modular monolith; MFE when teams need it | Federation “because 5M users” |
| 10 | PR `ng build`+budgets; SHA artifact; runtime/stamp env; Nx affected on **build** | Laptop deploy; Nx on S3 sync |

---

## 60-second pitches (Angular)

**1 — Widgets**  
Shared `HttpClient`/`resource` + `shareReplay`, poll only visible + tab-active, BFF/SSE, OnPush per widget, `takeUntilDestroyed`.

**2 — Mixed state**  
Server = HTTP/resource. One global client store. Facades. Router for shareable filters. Reactive forms.

**3 — MFE**  
Host + remotes expose `./Routes`. Singleton Angular. Manifest SHA. Nx compiles; Federation loads.

**4 — Store bloat**  
Stop putting GET bodies in NgRx. `resource` + GC with the view. Thin `selectSignal`.

**5 — WS freeze**  
`runOutsideAngular`, rAF batch, per-id signals, CDK virtual, pause when hidden.

**6 — TS / modernize**  
Strangler, API types first, ratchet `strictTemplates`, no feature freeze.

**7 — SEO**  
Curl HTML. Prerender marketing. CSR `/app`. Meta at prerender time.

**8 — 100k rows**  
Server page/cursor. CDK virtual. OnPush + `track`. Export on server.

**9 — 5M**  
CDN/lazy/BFF first. Nx boundaries. Native Federation for **teams**, not traffic.

**10 — CI/CD**  
Lockfile CI, budgets, SHA on CDN, build once, rollback pointer. Nx on Actions/BUILD, not deploy sync.

---

## Tradeoff phrases

- “That’s an org-scaling tool, not a traffic-scaling tool.” (MFE)  
- “Server state vs client state.” (NgRx vs HttpClient)  
- “Nx compiles; Federation loads.”  
- “Build once, promote many.”  
- “Run the socket outside Zone.”  
- “Google *can* render JS; marketing still wants HTML.”  

---

## Licious punchlines (answer Angular)

Full: [LICIOUS_MANAGERIAL_FRONTEND.md](./LICIOUS_MANAGERIAL_FRONTEND.md)

| Topic | Say |
|---|---|
| SSE vs WS | Push-only → SSE (`EventSource`); duplex → WebSocket (`runOutsideAngular`) |
| Bundles | `ng build` + source-map-explorer + **budgets**; `loadChildren` / `@defer`; lean imports |
| gRPC | Browser via BFF/gRPC-Web |
| SSR SEO | `@angular/ssr` / prerender; CSR for auth app |
| Tree-shaking | DCE Mark-and-Sweep on ESM; secondary entry `material/button` |
| BFF | Aggregate for `HttpClient` |
