# `router.navigate()` Internals — Interview Ready Guide

Prompt:

> What actually happens internally when `router.navigate()` is called?

---

## 1. One-liner

> `navigate()` builds a **UrlTree**, runs the router through **redirects → matcher → guards → resolvers → lazy load → activate/deactivate** components, updates the address bar, and emits navigation events. It’s async — navigation can be **cancelled** by a guard.

Deep dive on guard types / auth / roles: [ANGULAR_ROUTE_GUARDS.md](./ANGULAR_ROUTE_GUARDS.md).

---

## 2. High-level pipeline

```text
router.navigate(['/users', id], { queryParams: { tab: 'a' } })
        │
        ▼
1. Create UrlTree (commands + relativeTo + query/matrix params)
2. Scheduler starts Navigation (id, trigger)
3. Apply redirects (redirectTo in routes)
4. Recognize / match route config → ActivatedRoute snapshot tree
5. Run CanMatch / CanLoad (legacy) → then CanActivate / CanActivateChild
6. Resolve data (Resolve / resolve fns)
7. Lazy-load route chunk if loadChildren / loadComponent
8. Run CanDeactivate on leaving components
9. Activate new components / reuse if RouteReuseStrategy says so
10. Update Location (URL), scroll, emit NavigationEnd (or Cancel/Error)
```

Simplified story for interviews:

```text
URL tree → match routes → guards → resolvers → lazy import → render → update URL
```

---

## 3. Important pieces

| Piece | Role |
|---|---|
| **UrlTree** | Parsed target URL (not a string yet) |
| **RouterState** | Tree of `ActivatedRoute`s for current nav |
| **Guards** | Allow / deny / redirect (`CanActivate`, etc.) |
| **Resolvers** | Prefetch data before component loads |
| **lazy `import()`** | Dynamic chunk fetch for feature route |
| **Location** | Browser URL / History API update |
| **Events** | `NavigationStart`, `GuardsCheck`, `ResolveStart`, `NavigationEnd`, … |

---

## 4. Code shape

```ts
this.router.navigate(['/admin', 'users', id], {
  queryParams: { page: 1 },
  queryParamsHandling: 'merge',
  relativeTo: this.route, // optional
});

// or
this.router.navigateByUrl('/admin/users/5?page=1');
```

Returns `Promise<boolean>` — `false` if cancelled.

---

## 5. Guards order (say this)

```text
CanDeactivate (leaving) → CanMatch → CanActivate / CanActivateChild (entering)
```

Exact ordering can include `CanLoad` on older lazy modules. If any returns `false` / `UrlTree` redirect → navigation cancelled / redirected.

---

## 6. Events you can listen to

```ts
this.router.events.subscribe((e) => {
  if (e instanceof NavigationStart) { /* spinner on */ }
  if (e instanceof NavigationEnd) { /* spinner off */ }
  if (e instanceof NavigationCancel) { /* guard blocked */ }
  if (e instanceof NavigationError) { /* failed lazy load etc */ }
});
```

---

## 7. Related gotchas

| Gotcha | Note |
|---|---|
| Same URL navigate | May no-op unless `onSameUrlNavigation: 'reload'` |
| Guard redirect | Return `UrlTree` / `inject(Router).createUrlTree(...)` |
| Lazy fail | Network error → `NavigationError` |
| Absolute vs relative | Leading `/` = from root; else relative to `relativeTo` |

---

## 8. Spoken (45s)

> When I call `router.navigate`, Angular doesn’t just change the URL string. It builds a UrlTree, matches it against the route config, runs guards, runs resolvers, lazy-loads the feature chunk if needed, then activates the component tree and updates the browser location. The whole thing is a cancellable navigation lifecycle — I can tap `router.events` for spinners. FE guards are UX; real security still lives on the API.

---

## 9. Q&A

**Q: `navigate` vs `navigateByUrl`?**  
A: Commands array vs full URL string. Same pipeline after UrlTree exists.

**Q: Sync or async?**  
A: Async (`Promise` / observables under the hood). Don’t assume component exists on the next line.

**Q: Where do lazy chunks load?**  
A: After route match / canMatch, before activation — dynamic `import()` from `loadChildren` / `loadComponent`.

---

## 10. Practice checklist

- [ ] Draw URL tree → guards → resolve → activate  
- [ ] Name 3 navigation events  
- [ ] Explain guard cancel  
- [ ] Tie to lazy-loaded chunks  
