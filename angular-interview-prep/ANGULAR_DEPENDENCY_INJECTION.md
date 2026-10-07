# Angular Dependency Injection (DI) — Interview Master Guide

This is everything you need when an interviewer asks:

> What is Dependency Injection in Angular? How does it work?

You’ll get:

- A spoken answer you can say out loud
- How DI works under the hood (simple mental model)
- `@Injectable`, `providedIn`, providers
- Hierarchical injectors (Element vs Environment)
- `inject()` vs constructor injection
- Tokens, `useClass` / `useValue` / `useFactory` / `useExisting`
- Resolution modifiers (`optional`, `self`, `skipSelf`, `host`)
- `providers` vs `viewProviders`
- Real usage patterns + common mistakes + Q&A

---

## 1. What to say in the interview (30–45 seconds)

> Dependency Injection means a class does **not create** its own dependencies with `new`. Instead, it **declares what it needs**, and Angular’s **injector** creates and supplies those dependencies.
>
> In Angular, I usually mark a service with `@Injectable({ providedIn: 'root' })` so it’s a **tree-shakeable app singleton**. Components/services request it via the constructor or `inject()`.
>
> Angular DI is **hierarchical**: it first looks in the component’s **ElementInjector** (and parents), then falls back to the **EnvironmentInjector** (`root` / app config). That lets me share one instance globally, or create a **new instance per component/route** when I provide the service locally.
>
> Benefits: loose coupling, easy testing with mocks, and clear lifetime/scoping of services.

Memorize that paragraph. Then expand only if they ask “how / hierarchy / providers”.

---

## 2. Why DI exists (simple story)

### Without DI (bad)

```ts
class CartComponent {
  api = new ProductApi(); // tightly coupled, hard to test
}
```

Problems:

- Can’t easily swap `ProductApi` with a mock in tests
- Hard to share one instance across the app
- Component owns creation + lifetime

### With DI (Angular way)

```ts
@Injectable({ providedIn: 'root' })
export class ProductApi {
  getAll() { /* http */ }
}

@Component({ /* ... */ })
export class CartComponent {
  private api = inject(ProductApi); // Angular gives the instance
}
```

You ask for `ProductApi` → Angular finds a **provider** → returns an instance.

---

## 3. Core vocabulary

| Term | Meaning |
|---|---|
| **Dependency** | Something a class needs (service, config, HttpClient…) |
| **Consumer** | Class that needs the dependency (component/service) |
| **Token** | Key used to look up a dependency (often the class itself) |
| **Provider** | Recipe: “for this token, create/return X” |
| **Injector** | Container that stores providers and creates/caches instances |
| **Injection** | Act of giving the dependency to the consumer |

```text
Consumer asks for Token
        ↓
   Injector looks up Provider
        ↓
   Creates / reuses Instance
        ↓
   Returns Instance to Consumer
```

---

## 4. How Angular DI works (mental model)

1. You **provide** a service somewhere (`providedIn: 'root'`, `providers: []`, route providers…)
2. You **inject** it (`constructor(private api: Api)` or `inject(Api)`)
3. At runtime, Angular’s injector:
   - looks up the token
   - creates the instance once for that injector scope (unless configured otherwise)
   - caches and reuses it for later requests in that same scope

### Caching / singleton behavior

- Provided in `root` → **one instance for the whole app**
- Provided on a component → **one instance per that component injector** (each component instance gets its own if each provides it)
- Provided on a lazy route → often **one instance for that route subtree**

---

## 5. Creating and providing a service

### Standard service (most common)

```ts
import { Injectable } from '@angular/core';

@Injectable({
  providedIn: 'root', // register in root EnvironmentInjector
})
export class AuthService {
  isLoggedIn = false;
}
```

Why `providedIn: 'root'` is preferred:

- App-wide singleton
- **Tree-shakeable** (unused service can be dropped from bundle)
- No need to list it in `app.config` providers for normal cases

Other `providedIn` values (you almost never need them):

| Value | Meaning |
|---|---|
| `'root'` | App EnvironmentInjector — **use this** |
| `'platform'` | Parent of root; one instance for the whole page if two Angular apps share it |
| `'any'` | Deprecated — one instance per lazy NgModule |
| `SomeModule` | Legacy NgModule scope |
| omit / `null` | Not registered; you must use a `providers` array |

There is no `providedIn: 'component'` or `'route'`. Full examples: [ONETRUST_ANGULAR_DI_PROVIDERS.md](../onetrust/ONETRUST_ANGULAR_DI_PROVIDERS.md) (after Step 1).

### Provide in application config

```ts
// app.config.ts
export const appConfig: ApplicationConfig = {
  providers: [
    provideHttpClient(),
    AuthService, // or { provide: AuthService, useClass: AuthService }
  ],
};
```

Use this for:

- setup APIs (`provideRouter`, `provideHttpClient`)
- multi-providers / interceptors
- non-class tokens / factories

### Provide at component level (new instance scope)

```ts
@Component({
  selector: 'app-chat',
  providers: [ChatStateService], // ElementInjector for this component
  template: `...`,
})
export class ChatBot {
  private state = inject(ChatStateService);
}
```

Each `ChatBot` instance gets its **own** `ChatStateService` (not shared with the whole app).

---

## 5b. Tree-shakable vs non-tree-shakable services

Interviewers often ask: *“When is a service tree-shakeable?”*

### Tree-shakable (preferred default)

```ts
@Injectable({ providedIn: 'root' })
export class AnalyticsService { /* ... */ }
```

- Registered via `providedIn` on the class itself.
- If **no one imports/injects** this service, the bundler can **drop the whole class** from the final JS.
- Still an **app singleton** when it *is* used.

Also tree-shakeable-ish: `providedIn: 'platform'` / feature patterns that keep the provider next to the class (not a hard-wired NgModule list).

### Non-tree-shakable (classic / “eager” provide)

You register the service in a **providers array** that the app always loads:

```ts
// ❌ Not tree-shakeable in the Angular sense
// Even if nothing injects UnusedService, listing it here can keep it in the graph
@NgModule({
  providers: [UnusedService],
})
export class AppModule {}

// same idea in standalone app config — anything listed is part of the app graph
export const appConfig: ApplicationConfig = {
  providers: [
    UnusedService, // referenced from entry → harder / impossible to shake away
  ],
};
```

Older style (also non-tree-shakeable when the module is always imported):

```ts
@Injectable() // no providedIn
export class LegacyService {}

@NgModule({
  providers: [LegacyService], // must list it; module import pulls it in
})
export class SharedModule {}
```

| Style | Tree-shakeable? | When unused |
|---|---|---|
| `@Injectable({ providedIn: 'root' })` | **Yes** | Can be removed from bundle |
| Listed in `NgModule.providers` / always-loaded `appConfig.providers` | **No** (eager) | Stays reachable via that providers array |
| Provided only on a **lazy** route/component that never loads | Effectively unused at runtime | Code for that chunk may never download |

**Say in interview:**

> `providedIn: 'root'` is tree-shakeable because the provider lives with the service class — if nothing references the class, the compiler/bundler can drop it. Putting the service in a module or app `providers` array creates a hard reference from code that always loads, so it won’t shake out even if never injected.

### What tree shaking can remove vs cannot (Angular + bundle)

Tree shaking = **dead code elimination** on the module graph (see [11_TREE_SHAKING…](../frontend-system-design/11_TREE_SHAKING_MARK_AND_SWEEP.md)).

| Often **can** be shaken | Usually **cannot** / stays |
|---|---|
| Unused `providedIn: 'root'` service never imported | Service listed in eager `providers` |
| Unused exported functions/classes with no importers | Side-effect imports (`import './polyfill'`) |
| Unused named ESM exports from a lib (`sideEffects: false`) | CommonJS `require` / dynamic hard-to-analyze code |
| Dead branches after build knows they’re unused | Anything referenced from `main.ts` / routes you always load |
| Optional feature service only imported by lazy route you never open | Strings/templates that reference a pipe/component (Angular keeps them if declared in a loaded component) |

**Angular-specific gotchas**

1. **Components/pipes/directives in a template** are referenced by the compiler → kept.  
2. **Providers arrays** are references → kept.  
3. **Barrel files** (`index.ts` re-export everything) can accidentally pull unused services into the graph.  
4. Tree shaking ≠ “service not a singleton.” Scoping (root vs component) is **runtime DI**; tree shaking is **build-time** removal.

---

## 5c. New service instance for a component (not the root singleton)

Goal: *this component (and its children) get their own instance*, separate from `providedIn: 'root'`.

### Pattern 1 — provide on the component (most common)

```ts
@Injectable() // or keep providedIn:'root' — local providers still win for this subtree
export class FormDraftService {
  draft = '';
}

@Component({
  selector: 'app-checkout',
  providers: [FormDraftService], // ← NEW ElementInjector entry
  template: `<app-checkout-step />`, // child can inject same instance
})
export class CheckoutComponent {
  private draft = inject(FormDraftService); // instance A
}

@Component({
  selector: 'app-checkout-step',
  template: `...`,
})
export class CheckoutStepComponent {
  private draft = inject(FormDraftService); // same instance A (child of Checkout)
}
```

Open **two** `<app-checkout>` on one page → **two** `FormDraftService` instances.

### Pattern 2 — override a root service for one component only

```ts
@Injectable({ providedIn: 'root' })
export class Logger {
  log(m: string) { console.log('root', m); }
}

@Component({
  providers: [
    { provide: Logger, useClass: Logger }, // new instance for this component tree
  ],
})
export class IsolatedWidget {
  private logger = inject(Logger); // NOT the root singleton
}
```

Lookup hits the **component ElementInjector first**, so local provider wins over root.

### Pattern 3 — route-level instance (feature scope)

```ts
export const CHECKOUT_ROUTES: Routes = [
  {
    path: 'checkout',
    providers: [CheckoutFacade], // one instance for this route subtree
    children: [/* ... */],
  },
];
```

### Pattern 4 — don’t do this for DI scoping

```ts
// ❌ bypasses DI — hard to test, not the Angular way
const s = new FormDraftService();
```

### Quick decision

| Need | Do this |
|---|---|
| One shared app instance + shake if unused | `providedIn: 'root'` |
| New instance per component | `providers: [MyService]` on that `@Component` |
| New instance per feature/route | Route `providers: [MyService]` |
| Force non-shakeable global register | List in `appConfig.providers` / NgModule (usually avoid) |

---

## 6. How to inject (two styles)

### A) Modern: `inject()`

```ts
import { Component, inject } from '@angular/core';
import { AuthService } from './auth.service';

@Component({ /* ... */ })
export class Header {
  private auth = inject(AuthService);
}
```

Pros:

- Clean with standalone + field initializers
- Works well in functions / `provideX` factories (inside injection context)
- Easy with `DestroyRef`, `Router`, etc.

### B) Constructor injection (classic, still fine)

```ts
constructor(private auth: AuthService) {}
```

### Injection context (important)

`inject()` must run in an **injection context**:

- field initializers of an injectable class
- constructor
- factory functions for providers
- some framework APIs

Not valid later in a random click handler (unless you use `runInInjectionContext` with an injector).

```ts
send() {
  // ❌ usually wrong
  // const api = inject(Api);
}
```

---

## 7. Hierarchical injectors (the “how it works” deep part)

Angular has **two hierarchies**:

### 1) ElementInjector (component/directive tree)

- Created for DOM elements / components
- Configured by `@Component({ providers / viewProviders })`
- Search goes **up the component tree**

### 2) EnvironmentInjector (app / route / platform)

- Configured by `providedIn: 'root' | 'platform'` and `ApplicationConfig.providers`
- Lazy routes can get their own environment injector scope
- Fallback after element injectors

### Lookup order (say this clearly)

When a component asks for a dependency:

```text
1. Current component ElementInjector
2. Parent component ElementInjectors (up the tree)
3. EnvironmentInjector hierarchy (route → root → platform…)
4. If not found → error (NullInjectorError)
```

```text
[Child Component] → [Parent Component] → ... → [App Environment / root]
```

### Why this matters

- Same service class can be:
  - **one global instance** (`providedIn: 'root'`)
  - **or per-feature/component instance** (local `providers`)
- A child can override a parent provider by providing the same token again

---

## 8. `providers` vs `viewProviders`

Both register on the component’s ElementInjector, but visibility differs for **projected content**.

| | Available to component + its template children | Available to projected `<ng-content>` |
|---|---|---|
| `providers` | Yes | Yes |
| `viewProviders` | Yes | **No** |

Use `viewProviders` when you want an internal service **hidden** from content projected by the parent.

```ts
@Component({
  selector: 'app-card',
  viewProviders: [CardInternalService],
  template: `
    <ng-content></ng-content>
    <app-card-body></app-card-body>
  `,
})
export class Card {}
```

Projected content cannot inject `CardInternalService`; view children can.

---

## 9. Provider recipes (`provide` configurations)

### `useClass`

```ts
{ provide: Logger, useClass: ConsoleLogger }
```

Token `Logger`, actual class `ConsoleLogger`.

### `useExisting` (alias)

```ts
{ provide: OldLogger, useExisting: Logger }
```

Same instance, two tokens.

### `useValue`

```ts
{ provide: API_URL, useValue: 'https://api.example.com' }
```

Good for config strings/objects.

### `useFactory`

```ts
{
  provide: Config,
  useFactory: () => loadConfig(),
  deps: [HttpClient], // older style; or use inject() inside factory in injection context
}
```

Create dependency with custom logic.

### Minimal examples

```ts
export const API_URL = new InjectionToken<string>('API_URL');

export const appConfig: ApplicationConfig = {
  providers: [
    { provide: API_URL, useValue: 'https://api.example.com' },
    { provide: AuthService, useClass: AuthService },
  ],
};
```

```ts
private apiUrl = inject(API_URL);
```

---

## 10. `InjectionToken` (non-class dependencies)

Use when the dependency is not a class:

```ts
import { InjectionToken } from '@angular/core';

export interface AppConfig {
  apiUrl: string;
  featureX: boolean;
}

export const APP_CONFIG = new InjectionToken<AppConfig>('app.config');
```

```ts
providers: [
  {
    provide: APP_CONFIG,
    useValue: { apiUrl: '/api', featureX: true },
  },
]
```

Interview line:

> Classes can be their own tokens. For interfaces/config, we use `InjectionToken` because interfaces disappear at runtime.

### Why not a `const`? (they will push this)

A constant **does** work for a frozen magic number:

```ts
export const DEFAULT_PAGE_SIZE = 25; // fine — never mocked, never per-env
```

`InjectionToken` is for values that must be **provided at the edge** (bootstrap, host, TestBed, one route) while the **feature only `inject()`s**.

**Story 1 — MFE / NUX (use this):**

Devices is a **remote**, built **once**. API host is `idms-qa3` vs `idms` production, filled at **runtime** from `window.EnvironmentData` on the **host**.

```ts
// ❌ constants.ts inside Devices (or a shared file baked at ng build)
export const REST_API = 'https://idms-qa3.netradyne.com';
this.http.get(`${REST_API}/devices`);
```

What breaks:

- Same Devices **SHA** cannot serve qa3 and prod — URL is **compiled in**.  
- Remote must import host `environment.ts` → **illegal coupling** (and often a different repo).  
- Tests hit the real farm unless you Jest-mock the module.

```ts
// ✅ kernel
export const REST_API_BASE = new InjectionToken<string>('REST_API_BASE');

// host app.config (reads nd-env-config / EnvironmentData)
{ provide: REST_API_BASE, useFactory: () => window.EnvironmentData.idmsHost }

// devices (any env)
private readonly api = inject(REST_API_BASE);
this.http.get(`${this.api}/devices`);
```

Host **provides**; Devices **injects**. One remote artifact, every farm. That is the justification.

**Story 2 — two strings (why `inject(string)` is impossible):**

```ts
inject(String); // which string? API? CDN? timeout as number vs url?
```

```ts
export const API_URL = new InjectionToken<string>('API_URL');
export const CDN_URL = new InjectionToken<string>('CDN_URL');
```

Same TypeScript type; **two lockers**. A const file can export two consts, but you **cannot override one in TestBed / one route** without DI.

**Story 3 — TestBed:**

```ts
TestBed.configureTestingModule({
  providers: [{ provide: REST_API_BASE, useValue: 'http://localhost:8080' }],
});
```

You cannot `provide` a `const`. You mock the **module**, which is brittle.

**Spoken 25s:**

> A const is fine for `PAGE_SIZE = 25`. For API base I use an InjectionToken because the **value is chosen at the edge** — host env script, TestBed, maybe one tenant route — and features only `inject(REST_API_BASE)`. On NUX the remote is built once; qa3 vs prod is `EnvironmentData` on the host. If Devices imported a constant, we’d bake one URL and rebuild per env. Token is “depend on a key, provide the value.” Interfaces also need a token because they vanish at runtime.

---

## 11. Resolution modifiers

Used with `inject()` or `@Optional()` / `@Self()` / `@SkipSelf()` / `@Host()`.

| Modifier | Meaning |
|---|---|
| `optional: true` | If missing, return `null` instead of throwing |
| `self: true` | Only look in current injector |
| `skipSelf: true` | Skip current, start from parent |
| `host: true` | Stop at host component boundary |

```ts
private logger = inject(Logger, { optional: true });
private parentState = inject(State, { skipSelf: true });
```

Classic decorator style:

```ts
constructor(
  @Optional() private logger: Logger | null,
  @SkipSelf() private parent: ParentService,
) {}
```

---

## 12. Real-world usage patterns

### Pattern A — Shared app service (most common)

```ts
@Injectable({ providedIn: 'root' })
export class CartService {
  items: Product[] = [];
  add(p: Product) { this.items.push(p); }
}
```

Any component injecting `CartService` shares the same cart.

### Pattern B — Component-scoped state (chat, wizard)

```ts
@Component({
  providers: [ChatStore],
})
export class ChatBot {
  store = inject(ChatStore);
}
```

Two chat widgets on one page → two stores.

### Pattern C — Route-level providers (feature scope)

```ts
export const routes: Routes = [
  {
    path: 'admin',
    providers: [AdminFacade],
    loadChildren: () => import('./admin.routes'),
  },
];
```

`AdminFacade` lives with that route subtree.

### Pattern D — Testing with DI

```ts
TestBed.configureTestingModule({
  providers: [
    { provide: AuthService, useValue: { isLoggedIn: true } },
  ],
});
```

This is a big reason DI exists — swap real services with fakes.

---

## 13. DI vs just importing a class

| Import class & `new` | Angular DI |
|---|---|
| Tight coupling | Loose coupling |
| Manual lifetime | Framework-managed lifetime |
| Hard to mock | Easy to mock via providers |
| No hierarchy/scoping | Hierarchical scoping |

Interviewers love hearing: **testability + decoupling + scoping**.

---

## 14. Common mistakes

1. Forgetting `@Injectable()` on a service that injects other things  
2. Providing the same service in many places accidentally → **multiple instances**, “state not shared” bugs  
3. Expecting `providedIn: 'root'` singleton but also adding it again in component `providers` → child gets a **new** instance  
4. Calling `inject()` outside injection context  
5. Trying to inject an **interface** directly (use `InjectionToken`)  
6. Circular dependency between services (A needs B, B needs A) — redesign or use `Injector` lazily

---

## 15. NullInjectorError — what it means

```text
NullInjectorError: No provider for X!
```

Meaning: Angular searched the hierarchy and found **no provider** for token `X`.

Fixes:

- Add `@Injectable({ providedIn: 'root' })`
- Or add to `providers` in `appConfig` / component / route
- Or mark optional if it truly may be missing

---

## 16. Standalone apps (modern Angular)

In standalone apps (Angular 15+ style):

- Bootstrap with `bootstrapApplication(App, appConfig)`
- Global providers go in `appConfig.providers`
- Services still commonly use `providedIn: 'root'`
- NgModules are optional; DI concepts stay the same

```ts
bootstrapApplication(App, {
  providers: [provideRouter(routes), provideHttpClient()],
});
```

---

## 17. Quick comparison table (memorize)

| Provide where | Instance scope | Typical use |
|---|---|---|
| `providedIn: 'root'` | App singleton | Auth, API, Cart |
| `appConfig.providers` | App singleton | Router/Http setup, tokens |
| Route `providers` | That route subtree | Feature facade |
| Component `providers` | That component instance | Local UI state |
| Component `viewProviders` | View only (not projected) | Internal widget services |

---

## 18. Interview Q&A pack

### Q: What is DI?

A: A design pattern where dependencies are provided from outside instead of created inside the class. Angular has a built-in hierarchical DI system.

### Q: What is an injector?

A: An object that holds providers and is responsible for creating/caching and returning dependencies.

### Q: What is a provider?

A: Configuration that tells the injector how to create a dependency for a token (`useClass`, `useValue`, `useFactory`, `useExisting`).

### Q: Why `providedIn: 'root'`?

A: Registers the service in the root injector as a singleton and keeps it tree-shakeable.

### Q: How do you make a non-tree-shakable service?

A: Provide it eagerly in `NgModule.providers` or always-loaded `appConfig.providers` without relying on `providedIn`. That creates a hard reference from code that always boots, so the bundler won’t drop it even if nothing injects it. Prefer `providedIn: 'root'` unless you have a reason.

### Q: How do you get a new service instance for one component?

A: Add the service to that component’s `providers` (or `viewProviders`). Angular creates an ElementInjector entry for that component instance; children reuse it, sibling components get their own if they also provide it. Local provider beats `providedIn: 'root'` in the lookup order.

### Q: Constructor injection vs `inject()`?

A: Both ask the injector for a dependency. `inject()` is modern and convenient in fields/factories; constructor injection is classic and still valid.

### Q: How does hierarchical DI work?

A: Lookup starts at the local ElementInjector, walks up component parents, then checks EnvironmentInjectors (root/app). First provider found wins.

### Q: How do you get a new instance per component?

A: Add the service to that component’s `providers` array.

### Q: Why is my shared service state not shared?

A: You probably provided it again at component/route level, creating another instance.

### Q: What is `InjectionToken`?

A: A runtime token for non-class values (config, interfaces), since TypeScript interfaces don’t exist at runtime.

### Q: `providers` vs `viewProviders`?

A: Both provide to the component view; only `providers` is visible to projected content.

---

## 19. Tiny demo you can rewrite from memory

```ts
// auth.service.ts
@Injectable({ providedIn: 'root' })
export class AuthService {
  user: string | null = null;
  login(name: string) { this.user = name; }
}

// header.ts
@Component({
  selector: 'app-header',
  standalone: true,
  template: `<p>{{ auth.user }}</p>`,
})
export class Header {
  auth = inject(AuthService);
}

// login.ts
@Component({
  selector: 'app-login',
  standalone: true,
  template: `<button (click)="go()">Login</button>`,
})
export class Login {
  private auth = inject(AuthService);
  go() { this.auth.login('Shivam'); }
}
```

Both components share one `AuthService` instance because of `providedIn: 'root'`.

---

## 20. Final spoken closer (if they say “anything else?”)

> I’d choose the provider scope intentionally: `root` for shared services, component/route providers for isolated state, `InjectionToken` for config, and mocks via providers in tests. Understanding the ElementInjector → EnvironmentInjector lookup order helps debug `NullInjectorError` and accidental multiple instances.

---

## Practice checklist

- [ ] Say the 30–45s DI answer without notes
- [ ] Explain token / provider / injector
- [ ] Draw ElementInjector then EnvironmentInjector lookup
- [ ] Know when to use `providedIn: 'root'` vs component `providers`
- [ ] Explain `useClass` / `useValue` / `useFactory` / `InjectionToken`
- [ ] Know `optional` / `skipSelf` at a high level
- [ ] Explain why DI helps testing
