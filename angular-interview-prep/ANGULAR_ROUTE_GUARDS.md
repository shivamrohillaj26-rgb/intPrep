# Angular Route Guards (& friends) — Interview Ready

Everything interviewers mean by “route guards and all”: **auth**, **roles**, **leave confirm**, **lazy match**, **resolvers**, return types, and FE vs API security.

Practice: `prevonir-interview-practice` **`/q2`** (auth) · **`/q9`** (JWT + role).  
Navigate pipeline: [ANGULAR_ROUTER_NAVIGATE_INTERNALS.md](./ANGULAR_ROUTER_NAVIGATE_INTERNALS.md).

---

## 1. One-liner

> Route guards are functions (or classes) Angular runs during navigation to **allow**, **block**, or **redirect**. Auth/role are UX gates on the client; the **API must still enforce** permissions. Modern Angular prefers **functional guards** with `inject()`.

---

## 2. Guard types (memorize this table)

| Guard / API | When it runs | Typical use |
|---|---|---|
| **`CanMatch`** | Before a route (esp. lazy) is **chosen / loaded** | Feature flags, role → different lazy modules; skip downloading chunk |
| **`CanActivate`** | Before activating a route’s component | Login required, role check |
| **`CanActivateChild`** | Before activating **child** routes | Protect whole parent subtree once |
| **`CanDeactivate`** | Before leaving the current route | Unsaved form “Discard changes?” |
| **`CanLoad`** *(legacy)* | Before loading a lazy NgModule | Prefer **`CanMatch`** in modern apps |
| **`Resolve` / `resolve`** | After guards pass, before component create | Prefetch data so component starts ready |

Order (simplified — say this):

```text
URL matched
  → CanMatch (can we use / load this route config?)
  → CanDeactivate (leaving old page OK?)
  → CanActivate / CanActivateChild (entering OK?)
  → Resolve (prefetch)
  → Create / activate components
```

Exact internals also include redirects and lazy import timing — see navigate guide. For interviews, the table + “guards before component” is enough.

---

## 3. What a guard can return

```ts
boolean | UrlTree | Observable<boolean | UrlTree> | Promise<boolean | UrlTree>
```

| Return | Meaning |
|---|---|
| `true` | Allow navigation |
| `false` | Cancel (stay / fail nav) |
| **`UrlTree`** | Cancel + **redirect** (preferred over `router.navigate` inside guard) |
| Observable / Promise | Async check (token refresh, permission API) |

```ts
// ✅ redirect via UrlTree
return router.createUrlTree(['/login'], { queryParams: { returnUrl: state.url } });

// ⚠️ router.navigate() inside guard also works but UrlTree is the idiomatic cancel+redirect
```

---

## 4. Functional guards (modern — prefer this)

```ts
import { inject } from '@angular/core';
import { CanActivateFn, Router } from '@angular/router';

export const authGuard: CanActivateFn = () => {
  const auth = inject(AuthService);
  const router = inject(Router);

  if (auth.isLoggedIn()) return true;
  return router.createUrlTree(['/login']);
};
```

Route config:

```ts
{
  path: 'dashboard',
  canActivate: [authGuard],
  loadComponent: () => import('./dashboard').then((m) => m.Dashboard),
}
```

**Why functional?** Less boilerplate, works with `inject()`, tree-shake friendly, Angular docs default since ~15+.

### Class-based (legacy — still know for interviews)

```ts
@Injectable({ providedIn: 'root' })
export class AuthGuard implements CanActivate {
  constructor(private auth: AuthService, private router: Router) {}

  canActivate(): boolean | UrlTree {
    return this.auth.isLoggedIn() || this.router.createUrlTree(['/login']);
  }
}
// canActivate: [AuthGuard]
```

---

## 5. Auth guard + role guard (stack them)

Same pattern as practice **`/q9`**:

```ts
// jwt-auth.guard.ts
export const jwtAuthGuard: CanActivateFn = () => {
  const auth = inject(JwtAuthService);
  const router = inject(Router);
  if (auth.isLoggedIn()) return true;
  return router.createUrlTree(['/login']);
};

// role.guard.ts — roles from route.data
export const roleGuard: CanActivateFn = (route) => {
  const auth = inject(JwtAuthService);
  const router = inject(Router);

  if (!auth.isLoggedIn()) {
    return router.createUrlTree(['/login']);
  }

  const allowed = (route.data['roles'] as string[] | undefined) ?? [];
  if (allowed.length === 0 || auth.hasAnyRole(allowed)) return true;

  return router.createUrlTree(['/dashboard']); // logged in, wrong role
};
```

```ts
{
  path: 'admin',
  canActivate: [jwtAuthGuard, roleGuard], // runs in order; all must pass
  data: { roles: ['admin'] },
  component: AdminPage,
}
```

**Say:** First guard = authentication (who are you?). Second = authorization (are you allowed?). Fail auth → login. Fail role → safe landing page, not a blank cancel.

---

## 6. `CanActivateChild` — protect a shell

```ts
{
  path: 'app',
  canActivateChild: [authGuard], // every child checked
  children: [
    { path: 'home', component: Home },
    { path: 'settings', component: Settings },
  ],
}
```

vs putting `canActivate: [authGuard]` on every child — same idea, less repetition.

---

## 7. `CanDeactivate` — unsaved changes

```ts
export interface CanLeave {
  canLeave: () => boolean | Observable<boolean>;
}

export const unsavedGuard: CanDeactivateFn<CanLeave> = (component) => {
  if (!component.canLeave || component.canLeave()) return true;
  return confirm('Discard unsaved changes?');
};

// route
{ path: 'edit', component: EditForm, canDeactivate: [unsavedGuard] }
```

Component:

```ts
export class EditForm implements CanLeave {
  dirty = false;
  canLeave() {
    return !this.dirty;
  }
}
```

---

## 8. `CanMatch` — don’t even load the lazy chunk

```ts
export const adminMatch: CanMatchFn = () => {
  return inject(AuthService).hasRole('admin');
};

{
  path: 'admin',
  canMatch: [adminMatch],
  loadChildren: () => import('./admin.routes').then((m) => m.ADMIN_ROUTES),
},
{
  path: 'admin',
  canMatch: [() => !inject(AuthService).hasRole('admin')],
  component: AccessDenied, // alternate match for same path
}
```

**Why it matters:** `CanActivate` runs after the lazy module may already be downloading. `CanMatch` can prevent selecting that route config → **no unnecessary chunk fetch**.

`CanLoad` was the old NgModule-only cousin — mention, prefer `CanMatch`.

---

## 9. Resolvers (not a guard — often asked together)

```ts
export const userResolver: ResolveFn<User> = (route) => {
  return inject(UserApi).getById(route.paramMap.get('id')!);
};

{
  path: 'users/:id',
  canActivate: [authGuard],
  resolve: { user: userResolver },
  component: UserDetail,
}

// in component
readonly user = inject(ActivatedRoute).snapshot.data['user'] as User;
// or route.data observable
```

| | Guard | Resolver |
|---|---|---|
| Job | Allow / deny / redirect | Prefetch data |
| Fail | Cancel nav | Error → nav error (handle carefully) |
| When | Before resolve | After guards pass |

---

## 10. Async guards (token refresh example)

```ts
export const authGuard: CanActivateFn = () => {
  const auth = inject(AuthService);
  const router = inject(Router);

  if (auth.isLoggedIn()) return true;

  return auth.tryRefresh().pipe(
    map((ok) => (ok ? true : router.createUrlTree(['/login']))),
    catchError(() => of(router.createUrlTree(['/login']))),
  );
};
```

Don’t forget: long-running Observables should **complete** (HTTP does). Infinite streams hang navigation.

---

## 11. Guards vs HTTP interceptors vs backend

| Layer | Job |
|---|---|
| **Route guard** | Don’t show a page / don’t download a feature |
| **HTTP interceptor** | Attach `Authorization` header; catch 401 → logout/refresh |
| **API / server** | Real security — reject unauthorized calls |

**Always say:**

> Frontend guards are UX and bundle control. Anyone can bypass the UI. Authorization must be enforced on the API.

### Small interceptor example (Bearer token)

Functional interceptor (modern — same idea as practice `/q9`):

```ts
import { HttpInterceptorFn } from '@angular/common/http';
import { inject } from '@angular/core';
import { AuthService } from './auth.service';

export const authInterceptor: HttpInterceptorFn = (req, next) => {
  const token = inject(AuthService).getToken();
  if (!token) return next(req);

  // HttpRequest is immutable — clone + set header
  return next(
    req.clone({
      setHeaders: { Authorization: `Bearer ${token}` },
    }),
  );
};
```

Register once in `app.config.ts`:

```ts
import { provideHttpClient, withInterceptors } from '@angular/common/http';

export const appConfig: ApplicationConfig = {
  providers: [
    provideHttpClient(withInterceptors([authInterceptor])),
  ],
};
```

Every `HttpClient` call then goes: **request → interceptor(s) → network**.  
Guard = “may I open `/admin`?” · Interceptor = “attach JWT on the API call.”

---

## 12. Wiring in `app.routes.ts` (full sketch)

```ts
export const routes: Routes = [
  { path: 'login', component: Login },
  {
    path: '',
    canActivate: [authGuard],
    children: [
      { path: 'home', component: Home },
      {
        path: 'admin',
        canActivate: [roleGuard],
        data: { roles: ['admin'] },
        loadComponent: () => import('./admin').then((m) => m.Admin),
      },
      {
        path: 'edit/:id',
        component: EditForm,
        canDeactivate: [unsavedGuard],
        resolve: { item: itemResolver },
      },
    ],
  },
  { path: '**', redirectTo: 'home' },
];
```

---

## 13. Common mistakes

1. Using `router.navigate` and also returning `false` inconsistently — prefer **`UrlTree`**  
2. Forgetting guards run on **direct URL paste**, not only menu clicks  
3. Role check without auth check (or wrong order)  
4. Treating guards as security instead of UX  
5. Async guard that never completes  
6. Putting heavy API permission calls on every child without caching  
7. Expecting `CanActivate` to stop lazy download → use **`CanMatch`**  
8. Storing JWT only in memory and losing auth on refresh without a restore strategy  

---

## 14. Interview Q&A

**Q: What are route guards?**  
> Hooks in the router lifecycle that decide if navigation may proceed, be cancelled, or redirected.

**Q: Functional vs class guards?**  
> Functional `CanActivateFn` + `inject()` is the modern default; classes with `implements CanActivate` still work.

**Q: `CanActivate` vs `CanMatch`?**  
> Activate = may I show this route’s component? Match = may this route config even be selected/loaded (better for lazy + feature flags)?

**Q: How do you pass roles to a guard?**  
> `data: { roles: ['admin'] }` on the route; read `route.data` in the guard.

**Q: Can guards return Observables?**  
> Yes — boolean or UrlTree; must complete.

**Q: Difference guard vs resolver?**  
> Guard = permission/navigation; resolver = load data before activation.

**Q: Are guards enough for security?**  
> No — API must authorize.

---

## 15. Spoken answers

### 30s

> Guards run during navigation to allow, block, or redirect. I use functional `canActivate` for login, stack a role guard with `route.data`, `canDeactivate` for dirty forms, and `canMatch` so unauthorized users don’t even download a lazy admin chunk. They’re UX — the API still enforces access.

### 60s

> When the router navigates, after matching it runs CanMatch, then deactivate/activate guards, then resolvers, then creates components. Auth guard checks a token or session and returns true or a UrlTree to login. Role guard reads allowed roles from route data. For unsaved edits I use CanDeactivate. For large lazy features I prefer CanMatch so we don’t fetch the chunk. Interceptors attach JWT on HTTP; guards don’t replace server-side authorization.

---

## 16. Practice checklist

- [ ] Name all guard types + one use each  
- [ ] Write functional `authGuard` returning `UrlTree`  
- [ ] Stack auth + role with `data.roles`  
- [ ] Explain `CanMatch` vs `CanActivate` for lazy routes  
- [ ] Sketch `CanDeactivate` for dirty form  
- [ ] Say FE guard ≠ security  
- [ ] Demo `/q2` and `/q9` in practice app  

---

## 17. Cheat card

```text
CanMatch     → may this route config / lazy chunk apply?
CanActivate  → may I enter?
CanActivateChild → may I enter children?
CanDeactivate → may I leave?
Resolve      → prefetch after guards

Return: true | false | UrlTree | async of those
Modern: export const g: CanActivateFn = () => { inject(...) }
Stack:  canActivate: [authGuard, roleGuard]
Security: API always; guards = UX + chunk control
```

---

## Related

| Topic | File |
|---|---|
| `navigate()` pipeline | [ANGULAR_ROUTER_NAVIGATE_INTERNALS.md](./ANGULAR_ROUTER_NAVIGATE_INTERNALS.md) |
| Auth storage / XSS / CSRF | [../frontend-system-design/10_FRONTEND_AUTH_SECURITY.md](../frontend-system-design/10_FRONTEND_AUTH_SECURITY.md) |
| Practice JWT + roles | `prevonir-interview-practice` `/q9` + `JWT_RBAC.md` |
| Practice basic auth | `/q2` |
