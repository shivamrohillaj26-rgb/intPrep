# shared-auth

Shared library used by **shell + remotes**.

- `AuthService` — login / logout / user / token  
- `SessionContextService` — region filter (cross-MFE UI state)  
- `authGuard` / `adminGuard` — route gates  
- `authInterceptor` — Bearer header on host HttpClient  
- `getSharedSession()` — one tab-wide store (`globalThis`)

Imported as `import { AuthService } from 'shared-auth'`.
