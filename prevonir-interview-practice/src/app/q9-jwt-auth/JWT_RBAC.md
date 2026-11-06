# JWT + Role-Based Access — Interview Cheat Sheet

Practice route: `/q9`

---

## What to build in interviews

1. Login → receive/store JWT  
2. Decode payload (roles, exp)  
3. `authGuard` — must be logged in  
4. `roleGuard` — must have required role(s) via `route.data`  
5. HTTP interceptor — `Authorization: Bearer <token>`  
6. Hide nav links by role (UX only — guards still required)

---

## Demo users

| User | Password | Roles |
|---|---|---|
| `john` | `John@123` | `user` |
| `admin` | `Admin@123` | `admin`, `user` |

---

## Route setup (memorize)

```ts
{
  path: 'q9',
  component: JwtShell,
  children: [
    { path: '', pathMatch: 'full', redirectTo: 'login' },
    { path: 'login', component: JwtLogin },
    {
      path: 'dashboard',
      component: JwtDashboard,
      canActivate: [jwtAuthGuard],
    },
    {
      path: 'admin',
      component: JwtAdmin,
      canActivate: [jwtAuthGuard, roleGuard],
      data: { roles: ['admin'] },
    },
  ],
}
```

---

## Guard order

```text
jwtAuthGuard → not logged in? → /login
roleGuard    → missing role?  → /dashboard (or /forbidden)
```

Always put **auth before role**.

---

## Spoken answers

**JWT?**  
> Compact token: header.payload.signature. Payload carries claims (sub, roles, exp). Server signs it; client sends it on requests. This demo fakes signature with `btoa` — real apps verify on backend.

**Where store token?**  
> Interview tradeoff: `localStorage` (XSS risk) vs HttpOnly cookie (CSRF considerations). Demo uses localStorage for simplicity.  
> Deep dive: [10_FRONTEND_AUTH_SECURITY.md](../../../frontend-system-design/10_FRONTEND_AUTH_SECURITY.md)

**FE role hide vs guard?**  
> Hiding Admin link is UX. Real protection is `canActivate` + **API authorization**. Never trust UI alone.

**Interceptor?**  
> Clones each request and sets `Authorization` header when token exists.

---

## Practice checklist

- [ ] Login creates token with roles + exp  
- [ ] Refresh page still logged in (localStorage)  
- [ ] Expired token treated as logged out  
- [ ] john cannot open `/q9/admin`  
- [ ] admin can open admin  
- [ ] Explain interceptor + both guards aloud  
