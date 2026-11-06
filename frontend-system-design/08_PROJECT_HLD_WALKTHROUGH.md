# HLD — Explain Your Own Frontend Project (Interview Script)

Prompt:

> Walk me through the HLD of a frontend system / project you built.

Use this structure every time (8–10 minutes).

---

## 1. Opening (30–45s)

> I built **[Project Name]** — a **[one-line purpose]**.  
> Users can **[top 2–3 jobs]**.  
> Stack: **Angular**, TypeScript, RxJS/signals, **[API/auth/state]**.

Example:

> I built an internal loan ops dashboard. Users review applications, filter queues, and update statuses. Angular + REST APIs + role-based auth.

---

## 2. Draw the boxes (modules)

```text
App Shell
  Auth (login/guard)
  Feature modules (lazy)
    Queue / List
    Detail
    Settings
  Shared UI (buttons, table, modal)
  Core services (API, auth, logging)
Backend APIs
  Auth service
  Domain APIs
CDN / static assets
```

Say:

> Shell loads first. Features are lazy-loaded by route. Shared UI is presentational. Core services are singletons.

---

## 3. Component hierarchy (one feature deep-dive)

Pick **one** important screen:

```text
QueuePage
  FilterBar
  ApplicationTable
    Row actions
  Pagination / Infinite scroll
  SideDrawer / Detail route
```

Explain props/data:

- Container page fetches data  
- Children receive `@Input` / `input()`  
- Actions emit `@Output` / `output()` or call a facade service  

---

## 4. API contracts

Be concrete:

```ts
GET /api/applications?status=PENDING&cursor=abc&limit=20
→ { items: Application[], nextCursor: string | null }

PATCH /api/applications/:id
body: { status: 'APPROVED' }
```

Mention:

- DTO vs view model mapping in a service  
- Error shape handling  
- Auth header / interceptor  

---

## 5. State & caching

Say what you actually used:

| Kind | Example |
|---|---|
| Local UI state | filters, open modal |
| Server state | list/detail from API |
| Cross-page | auth user, permissions |

Patterns:

- `providedIn: 'root'` auth/session service  
- feature service with signals  
- HTTP interceptor for token  
- cache list until filter changes / explicit refresh  

---

## 6. Performance choices (must mention 3+)

Pick real ones:

1. Lazy routes for admin/heavy features  
2. `trackBy` / `@for (...; track id)` on tables  
3. OnPush or signals  
4. Debounced search typeahead  
5. Pagination instead of loading all rows  
6. Virtual scroll for huge tables  
7. Avoid heavy work in templates  

---

## 7. Security / quality (short)

- Route guards for auth/roles  
- Don’t trust only UI hiding — API enforces roles  
- Sanitize if rendering HTML  
- Environment configs for API base URLs  

---

## 8. Tradeoffs (interview gold)

Always give one tradeoff:

> We used client-side filtering for small queues for speed, but moved to server filters when data grew.  
> Or: signals/service over NgRx because domain state was simple; would use a store if many cross-feature interactions appeared.

---

## 9. Questions they ask next (prep answers)

| Question | Direction |
|---|---|
| How do you handle loading/error? | skeletons + retry + toast |
| How do you test? | service unit tests + component smoke + e2e critical path |
| How do you deploy? | CI build → static host/CDN → API env |
| Biggest bug you fixed? | CD / timezone / race on search — have one story |
| What would you improve? | virtualize table, better observability, design system |

---

## 10. Template script (fill blanks)

1. Problem & users  
2. Architecture diagram  
3. One feature component tree  
4. API contracts  
5. State/caching  
6. Perf + security  
7. Tradeoff + next improvement  

Practice out loud once with your real project before the interview.

**Filled for Netradyne IDMS (from `Desktop/Ternary`):** [16_NETRADYNE_IDMS_PROJECT_HLD.md](./16_NETRADYNE_IDMS_PROJECT_HLD.md)
