# Angular DI — `providedIn`, providers array, recipes, InjectionToken

**You already have the deep guide:** [ANGULAR_DEPENDENCY_INJECTION.md](../angular-interview-prep/ANGULAR_DEPENDENCY_INJECTION.md)  
**NUX env / which API:** [ONETRUST_ENVIRONMENT_STORY.md](./ONETRUST_ENVIRONMENT_STORY.md)  
**This file:** what she asked in OneTrust R1 — short, spoken, don’t go blank.

---

## 0. 40s if she says “explain Angular services / DI”

> A service is a class Angular **creates and injects**. I don’t `new AuthService()`. I **provide** it, then `inject()` or constructor-inject it.  
>  
> Default: `@Injectable({ providedIn: 'root' })` — **one app-wide instance**, tree-shakeable if unused.  
> If I put it in a component’s `providers: [MyService]`, **that component tree gets a new instance** — useful for local form/wizard state.  
> The `provide` object is the **recipe**: `useClass`, `useValue`, `useFactory`, `useExisting`.  
> Classes are their own tokens. Config/interfaces need an **`InjectionToken`** because interfaces vanish at runtime.

---

## 1. How you use a service in a component (two ways)

```ts
@Injectable({ providedIn: 'root' })
export class AuthService {
  isLoggedIn() { return true; }
}

// Modern
export class Header {
  private readonly auth = inject(AuthService);
}

// Classic
export class Header {
  constructor(private auth: AuthService) {}
}
```

Same thing: “give me whatever is registered for token `AuthService`.”

You do **not** write `providers: [AuthService]` on the component if you want the **root singleton**.

---

## 2. `providedIn: 'root'` vs `providers: []`

| Where you provide | How many instances | When |
|---|---|---|
| `providedIn: 'root'` | **One** for the whole app | Auth, Http helpers, kernel, API |
| `appConfig.providers` / `bootstrap` | One (eager — **not** tree-shaken easily) | Router, HttpClient, `APP_CONFIG` |
| Component `providers: [X]` | **New** instance for that component **and its children** | Wizard draft, local table state |
| Route `providers: [X]` | One for that **route subtree** (injector often **cached** — leave/return can keep the same instance) | Feature facade, not available on other URLs |
| Not provided at all | `NullInjectorError` | Forgot `@Injectable` / token |

**Lookup:** child component injector → parents → route → root.  
**Local `providers` wins** over `providedIn: 'root'` for that subtree.

### If she asks: “What happens if I put it in the providers array?”

> Angular creates a **new injector entry** there. For a **component**, every time that component is created, it gets **its own** `MyService` (children share that one). The root singleton is **ignored** for that tree.  
> If I put the same class in `appConfig.providers` **and** `providedIn: 'root'`, I still typically have one root instance — but listing it eagerly can **stop tree-shaking**.  
> In tests I put `{ provide: AuthService, useValue: mock }` in `TestBed` to replace the real one.

**Don’t say:** “providers array means singleton.”  
**Do say:** “**Where** you provide sets **scope**.”

```ts
@Component({
  providers: [FormDraftService], // NEW instance for this widget + children
})
export class CheckoutForm {}
```

---

## 2b. `/q14` — five steps (same table as §2)

Open `http://localhost:4200/q14`. Each green “Expect” line on the page matches a row below.  
`#` means **which `new` ran**. Same # = same object.

Files:

| File | What |
|---|---|
| `di-scope.ts` | LoginService, ScratchPad, PageNotepad, VisitPad, BootStamp, FORGOTTEN |
| `di-providers-demo.ts` | Desk A / Desk B + the page |
| `app.config.ts` | `BootStamp` |
| `app.routes.ts` | `/q14` → `providers: [PageNotepad]` |

```
root (whole SPA)
  LoginService   providedIn: 'root'      Step 1  stays #1
  BootStamp      appConfig.providers     Step 4  stays #1

route /q14 (injector cached on the Route — Home → back keeps it)
  PageNotepad    route.providers         Step 3A  same # / ticks

page DiProvidersDemo (destroyed when you leave /q14)
  VisitPad       component providers     Step 3B  new #, ticks 0

Desk A injector
  ScratchPad                             Step 2  #1
Desk B injector
  ScratchPad                             Step 2  #2

FORGOTTEN — not on any map               Step 5  null / throw
```


Angular walks **up** until it finds the token: desk → page → route `/q14` → root → throw.

---

### Step 1 — `providedIn: 'root'` → LoginService (one login)

**On the screen:** “Logged in as Alex” + LoginService `#1`. Go Home, open Q14 again. Still `#1`.

```ts
@Injectable({ providedIn: 'root' })
export class LoginService {
  readonly instance = ++loginSeq;
  readonly name = 'Alex';
}

// page — do NOT add providers: [LoginService]
readonly login = inject(LoginService);
```

First `inject` in the app creates `#1` on **root** and keeps it. Header, guards, `/q9` would all see Alex.

If you put `providers: [LoginService]` on Desk A, that desk gets Login `#2`. Header still shows logged out. **Never re-provide auth on a widget.**

**Spoken:** one lazy app instance. Tree-shake if unused.

---

### `providedIn` — can it be something other than `'root'`?

Yes. The TypeScript type is roughly:

```ts
providedIn?: 'root' | 'platform' | 'any' | Type<any> | null
```

`/q14` only uses `'root'` (`LoginService`). The others exist. **You will almost never use them in a normal standalone app.** There is **no** `providedIn: 'component'` or `providedIn: 'route'` — those scopes are `providers: []` on the component or the route (Steps 2–3).

---

#### `'root'` — the one you use (Step 1)

```ts
@Injectable({ providedIn: 'root' })
export class LoginService {}
```

Registers on the **app** EnvironmentInjector (the same place `appConfig.providers` lands). One instance per `bootstrapApplication`. Tree-shakeable. Auth, API, kernel.

---

#### `'platform'` — above the app (rare)

```ts
@Injectable({ providedIn: 'platform' })
export class BrowserWideClock {
  readonly started = Date.now();
}
```

Lookup after you walk past **root** still finds this — platform is the **parent** of every app root on the page.

```
NullInjector
  └── PlatformInjector          providedIn: 'platform'
        └── App root (NUX)      providedIn: 'root'
        └── App root (other)    second bootstrapApplication on the same page
```

**When it matters:** two Angular apps (or Angular Elements + an app) on **one HTML page**. `'root'` = one instance **per app**. `'platform'` = **one instance for the whole page**.

**When it does not:** a normal SPA / one `bootstrapApplication`. Same practical result as `'root'` (one instance), but the injector sits one level higher. Interviewers almost never need you to pick `'platform'`.

**MFE caution:** Native Federation remotes usually share **one** Angular runtime and **one** root (singleton `shared`). That is **not** `'platform'`. Don’t say “we use platform for MFE.”

---

#### `'any'` — deprecated, don’t volunteer it

Old NgModule world: each **lazy-loaded module** that injected the service got **its own** instance.

```ts
@Injectable({ providedIn: 'any' }) // avoid
export class LegacyPerLazyService {}
```

Deprecated. In standalone + route providers you do this with **route `providers`** (Step 3), not `'any'`.

If she asks: “there used to be `'any'` for per-lazy-module; we don’t use it now.”

---

#### `providedIn: SomeModule` — old NgModule style

```ts
@Injectable({ providedIn: UserModule })
export class UserApi {}
```

Tree-shakeable if `UserModule` is never imported. Replaced by **standalone + route/component `providers`**. Don’t write new code this way.

---

#### Omit `providedIn` / `null` — `/q14` ScratchPad, PageNotepad, BootStamp, VisitPad

```ts
@Injectable() // no providedIn
export class ScratchPad {}
```

Angular does **not** register the class. You **must** list it in `providers` (component, route, or `appConfig`) or you get Step 5.

`providedIn: null` is the explicit form of the same thing (used in some libs).

---

#### Side-by-side

| `providedIn` | Where the recipe lives | How many instances | Use? |
|---|---|---|---|
| `'root'` | App EnvironmentInjector | One per app | **Default** — Login, Auth |
| `'platform'` | PlatformInjector (above root) | One per **page**, shared by multiple Angular apps | Almost never |
| `'any'` | Each lazy NgModule | One per lazy module | **Deprecated** |
| `UserModule` | That NgModule | One per imported module | Legacy |
| omitted / `null` | Nowhere until `providers: []` | Whatever that array’s scope is | Local / route / eager boot |

**InjectionToken** can use the same field:

```ts
export const PAGE_SIZE = new InjectionToken<number>('PAGE_SIZE', {
  providedIn: 'root', // or 'platform'
  factory: () => 25,
});
```

---

#### Spoken if she asks “only root?”

> The one I use is `'root'`. `'platform'` is one level up — same page, two Angular apps. `'any'` and `providedIn: SomeModule` are old NgModule. There is no `providedIn: 'component'`; for a widget I use `providers: [X]` on the component.

---

### Step 2 — component `providers` → ScratchPad (one pad per desk)

**On the screen:** Add pen on A, stapler on B. A is pad `#1`, B is pad `#2`. Pen does not appear on B.

```ts
@Injectable() // no providedIn — must be listed on the desk
export class ScratchPad {
  readonly instance = ++padSeq;
  items: string[] = [];
  add(item: string) { this.items = [...this.items, item]; }
}

@Component({
  selector: 'app-desk-a',
  providers: [ScratchPad], // THIS desk only
  template: `pad #{{ pad.instance }} … {{ pad.items }}`,
})
export class DeskA {
  readonly pad = inject(ScratchPad);
}

@Component({
  selector: 'app-desk-b',
  providers: [ScratchPad], // a second new()
})
export class DeskB {
  readonly pad = inject(ScratchPad);
}
```

Two `<app-desk-*>` = two injectors = two pads. Login from Step 1 is still one object (desks do not provide LoginService).

If you move `providers: [ScratchPad]` to the **page**, both desks share `#1` — pen shows on B.

**Spoken:** new instance for that widget and its children. Siblings do not share.

---

### Step 3 — who is allowed to `inject`? (your question)

**Yes — that is exactly it.**

`PageNotepad` is only:

```ts
@Injectable() // no providedIn: 'root'  — Angular does NOT register it on the app
export class PageNotepad { ... }
```

With **no** `providedIn`, that class is **not** in the root map. `inject(PageNotepad)` only works if **some injector above you** listed it in a `providers` array.

We listed it **only** here:

```ts
{ path: 'q14', component: DiProvidersDemo, providers: [PageNotepad] }
```

So:

| Who | `inject(PageNotepad)`? | Why |
|---|---|---|
| `/q14` page (`DiProvidersDemo`) | **Yes** | Walks up → route injector has the recipe |
| Child **components** on that page (Desk A, a toolbar, …) | **Yes** | Same walk: child → page → **route** |
| Child **routes** e.g. `/q14/more` | **Yes** | Same route injector (or a child of it) |
| Home, `/q13`, `/q9` | **No** | Their chain is page → root. Root has no `PageNotepad` → `NullInjectorError` |

You do **not** need to put `PageNotepad` on the **component** `providers` for `/q14` to inject it. The **route** array is enough. The page finds it by walking **up**.

If you also skip the route array (no `providedIn`, no `appConfig`, no component `providers`) → nobody can inject it. That is Step 5 / `FORGOTTEN`.

**Same rule, any service:**

```
Have providedIn: 'root'?     → whole app can inject (LoginService)
Only in appConfig.providers? → whole app can inject (BootStamp)
Only on a component?         → that component + its children (ScratchPad, VisitPad)
Only on a route?             → that route’s component + children + child routes (PageNotepad)
Nowhere?                     → NullInjectorError
```

`providedIn` and `providers: []` are two ways to **register** the recipe. If you do neither, there is no recipe.

---

### Step 3 continued — route injector does **not** reset (you already proved this)

What you saw is correct. The guide was wrong before.

Angular stores `Route.providers` on the **route config** (`route._injector`). First visit to `/q14` creates `PageNotepad` `#1`. Leave Home, come back — **same injector**, same `#`, same ticks.

That is **not** the same as “destroyed when the URL changes.”

**What route providers *do* mean**

- Only `/q14` (and its child routes) can `inject(PageNotepad)`. Home’s chain is Home → root — **no** notepad. If Home did `inject(PageNotepad)` it would throw.
- Child routes of `/q14` would share this **same** object (feature facade).
- It is **not** app-wide like LoginService. Other URLs cannot see it. It is **not** reset like a page-level provider.

```ts
// app.routes.ts — cached for the life of the router
{ path: 'q14', component: DiProvidersDemo, providers: [PageNotepad] }
```

**If you want ticks to reset** (leave the page → new state), put the service on the **routed component**, not on the route:

```ts
@Component({
  providers: [
    VisitPad, // dies when DiProvidersDemo is destroyed
    // …
  ],
})
export class DiProvidersDemo {
  readonly notepad = inject(PageNotepad); // 3A — stays
  readonly visit = inject(VisitPad);      // 3B — resets
}
```

**On `/q14` now**

| Box | After Home → Q14 |
|---|---|
| **A** `PageNotepad` (route) | Same `#`, ticks **kept** |
| **B** `VisitPad` (this page) | New `#`, ticks **0** |

**Spoken:**  
> Route providers scope a service to that URL tree. Angular usually **keeps** that injector when I navigate away and come back — so my Step 3 ticks stayed. If I need state to die with the page, I put it in the **component** `providers`. I still don’t put auth on either of those — auth is `providedIn: 'root'`.

---

### Step 4 — `appConfig.providers` → same count as root, **not** tree-shakeable

**On `/q14`:** BootStamp `#1`, same as Login `#1`. Home → back: both stay `#1`.  
Instance count is **not** the difference. **Bundle / tree-shaking** is.

---

#### Same injector, two registration styles

```ts
// Step 1 — recipe lives ON THE CLASS
@Injectable({ providedIn: 'root' })
export class LoginService { ... }

// Step 4 — class has NO providedIn; recipe lives in the boot file
@Injectable()
export class BootStamp { ... }

// app.config.ts — imported from main.ts on every boot
import { BootStamp } from './q14-di-providers/di-scope';

export const appConfig: ApplicationConfig = {
  providers: [
    provideRouter(routes),
    provideHttpClient(...),
    BootStamp, // = { provide: BootStamp, useClass: BootStamp }
  ],
};
```

Both end up on the **root EnvironmentInjector**. Any screen can `inject` them. First `inject` still `new`s once and caches.

| | `LoginService` | `BootStamp` |
|---|---|---|
| How many instances? | 1 | 1 |
| Where does `inject` find it? | Root | Root |
| When is `new` called? | First `inject` (lazy) | First `inject` (also lazy) |
| Is the **class** always in `main` JS? | **Only if something imports it** | **Yes** — `app.config.ts` always imports it |

Tree-shaking is about **bytes in the JS file**, not about when `new` runs.

---

#### What “tree-shaken” actually means

The bundler (esbuild / webpack) builds a **graph of imports**.

```
main.ts
  └── app.config.ts          ← always downloaded
        ├── provideRouter
        ├── provideHttpClient
        └── BootStamp        ← hard import. Always in the graph.
              └── di-scope.ts (or at least BootStamp’s class)

LoginService is NOT imported by main.ts / app.config.ts.
It is only imported by di-providers-demo.ts (the /q14 page).
```

**Mark-and-sweep (interview 20s):** start at `main.ts`. Follow every `import` and every value used in a `providers` array / template. Anything never reached is **dead**. Drop it from the bundle.

---

#### Why `providedIn: 'root'` **can** be shaken

Angular compiles

```ts
@Injectable({ providedIn: 'root' })
export class LoginService {}
```

into something like: “if this class is in the program, also register it on root.”

The **registration travels with the class**. There is **no** line in `app.config.ts` that mentions `LoginService`.

So if you imagine a service nobody imports:

```ts
// unused-audit.ts — no file in the app imports this
@Injectable({ providedIn: 'root' })
export class UnusedAuditService {
  log() { ... }
}
```

- No `import { UnusedAuditService }` anywhere.
- Bundler never reaches the file.
- Class + its `providedIn` recipe are **deleted** from the output.
- You never pay for that service in `main.js`.

`LoginService` in **this** practice app is imported by `/q14`, so it stays. The rule is: **no importer → can shake.**

If `LoginService` were only imported by a **lazy** route you never open, it can live in that lazy chunk instead of `main`. Still not forced into boot.

---

#### Why `appConfig.providers` **cannot** be shaken

```ts
// app.config.ts — always part of the boot graph
import { BootStamp } from './q14-di-providers/di-scope';

providers: [ BootStamp ]
```

That `import` is a **live reference** from a file that **always loads**.

Even if you delete every `inject(BootStamp)` on `/q14`:

1. `main.ts` still loads `appConfig`.
2. `appConfig` still imports `BootStamp`.
3. The `providers` array still **mentions** the class (the bundler cannot prove it is unused).
4. `BootStamp` (and often the rest of that file) **stays in the main bundle**.

That is “eager” / “not tree-shakeable”: **hard-wired from boot**, not “`new` runs at startup.”

Same for old `NgModule.providers` on an always-imported `AppModule`.

**Real things that belong here:** `provideRouter`, `provideHttpClient`, `APP_CONFIG` / `EnvironmentData`. The platform **must** have them when the app starts. You accept they sit in `main.js`.

---

#### Thought experiment (say this if she asks “prove it”)

1. Add `UnusedAuditService` with `providedIn: 'root'`. Import it from **nowhere**. Production build — class is gone (or never in `main`).
2. Add `DeadStamp` with **no** `providedIn`, list it in `appConfig.providers`, but never `inject(DeadStamp)`. Production build — class is **still** in `main.js` because `app.config.ts` imports it.
3. Move `DeadStamp` to `providedIn: 'root'` and **remove** it from `appConfig` + remove the import. Now it can shake if unused.

**Don’t do this:** import `LoginService` in `app.config.ts` “just in case.” That **kills** tree-shaking for login even with `providedIn: 'root'`. The import is the problem.

**Don’t do this:** put every feature service in `appConfig.providers`. You bloat `main` the same way a giant `AppModule.providers` did.

---

#### How this looks next to the other `/q14` services

| Service | Registered how | In `main.js` if unused? |
|---|---|---|
| `LoginService` | `providedIn: 'root'` | **No** (no import → shake) |
| `BootStamp` | `appConfig.providers` | **Yes** (boot file imports it) |
| `ScratchPad` / `VisitPad` | Component `providers` | Only if that component’s file is in the graph (e.g. `/q14` chunk) |
| `PageNotepad` | Route `providers` | `app.routes.ts` mentions it → usually in the router graph |
| `FORGOTTEN` | Nowhere | Token object only if a file imports it |

`PageNotepad` is listed in `app.routes.ts`, and routes are imported by `app.config` → that class is also a **hard reference** from boot (the route table). Feature facades on **lazy** `loadChildren` / `loadComponent` can stay out of `main` until that URL loads.

---

#### Spoken 30s

> Root and `appConfig` are the same injector — one instance. `providedIn: 'root'` is tree-shakeable because the recipe sits on the class; if nothing imports the class, the bundler drops it. `appConfig.providers` is a hard import from `main`, so that class stays in the bundle even if I never inject it. I put Router and Http there on purpose. I do not dump Auth, analytics, or feature services there.

---

### Step 5 — not provided → `NullInjectorError` (or `null` if optional)

**On `/q14`:** the red box shows **`null`**. The page did **not** crash because we used `{ optional: true }`.  
Without that flag, the same token **throws** and Angular never finishes creating the page.

This row is the opposite of Steps 1–4: those all **registered a recipe**. Step 5 is a key with **no recipe anywhere**.

---

#### What we created (and what we did *not*)

```ts
// di-scope.ts — a key exists. That is not a provider.
export const FORGOTTEN = new InjectionToken<string>('FORGOTTEN');
```

`new InjectionToken(...)` only makes a **bracelet** (see §4). It does **not** put a value in any injector.

We never wrote any of these:

```ts
{ provide: FORGOTTEN, useValue: 'hello' }   // page / route / appConfig
@Injectable({ providedIn: 'root' })         // would be a class, not this token
```

So the map has **no** `FORGOTTEN` entry.

---

#### The walk (this is the whole error)

`inject(X)` does **not** search the whole app. It walks **parents only**:

```
Desk A / Desk B
  → DiProvidersDemo (page)     VisitPad, API_URL, Logger, …   — no FORGOTTEN
    → route /q14               PageNotepad                    — no FORGOTTEN
      → root                   LoginService, BootStamp        — no FORGOTTEN
        → NullInjector         always throw
```

**NullInjector** is the parent of root. It has one job: if you got here, nobody registered `X`.

| Token | Found at | Result |
|---|---|---|
| `LoginService` | root (`providedIn`) | Alex `#1` |
| `BootStamp` | root (`appConfig`) | `#1` |
| `PageNotepad` | route `/q14` | ticks box A |
| `VisitPad` | page component | ticks box B |
| `ScratchPad` | Desk A or B | two different pads |
| `API_URL` | page `useValue` | Part B string |
| `FORGOTTEN` | **nowhere** | throw, or `null` if optional |

Same walk as “Home cannot inject `PageNotepad`” — Home’s chain never includes the `/q14` route. `FORGOTTEN` is worse: **no** chain includes it.

---

#### Two ways to `inject` — same failure

```ts
export class DiProvidersDemo {
  // what /q14 actually does — page stays up
  readonly forgotten = inject(FORGOTTEN, { optional: true });
  // forgotten === null
}

// what a real bug looks like
readonly forgotten = inject(FORGOTTEN);
// ERROR NullInjectorError: R3InjectorError(...)[FORGOTTEN -> FORGOTTEN]:
//   NullInjectorError: No provider for FORGOTTEN!
```

Constructor style is the same rule:

```ts
constructor(forgotten: string) {}                    // cannot — string is not a token
constructor(@Inject(FORGOTTEN) forgotten: string) {} // throws unless provided
constructor(@Optional() @Inject(FORGOTTEN) forgotten: string | null) {} // null
```

`@Optional()` ≡ `{ optional: true }`.

The name `FORGOTTEN` in the error is the **debug string** from `new InjectionToken('FORGOTTEN')`, not a magic lookup.

---

#### `{ optional: true }` is not a provider

Optional means: “if the walk fails, give me `null` instead of throwing.”

It does **not** create a value. It does **not** register `FORGOTTEN` on root.

Use it when the dependency is **really optional** (plugin, extra logger, feature that may be absent).  
Do **not** hide a missing Auth service with `optional` — you want that crash in tests.

`/q14` uses optional only so you can **see** the failure without a white screen.

---

#### Same crash with a **class** (more common in interviews)

`FORGOTTEN` is a token so it is obvious. Juniors hit this with a service:

```ts
@Injectable() // no providedIn
export class ReportService {}

export class Dashboard {
  readonly report = inject(ReportService);
  // NullInjectorError: No provider for ReportService
}
```

Fixes (pick **one** place — this is Steps 1–4):

```ts
@Injectable({ providedIn: 'root' })          // whole app
export class ReportService {}

// or
export const appConfig = { providers: [ReportService] };

// or
@Component({ providers: [ReportService] })   // this widget + children

// or
{ path: 'reports', providers: [ReportService] }
```

`ScratchPad` without `providers: [ScratchPad]` on the desk is this same error. We listed it on purpose in Step 2 so the desk works.

---

#### Why Angular throws instead of `new` itself

If `inject(ReportService)` auto-`new`ed every missing class, you would get a **new instance per inject**, skip constructor deps, and never share Auth. DI’s job is: **only construct what you registered**, at the **scope** you chose.

No recipe → refuse. That is a feature.

---

#### How you debug `NullInjectorError` in 20s

1. Read the token name in the error (`FORGOTTEN`, `HttpClient`, `ReportService`).
2. Ask: is it `providedIn: 'root'`? In `appConfig`? On this component? On this route?
3. If it is on a **sibling** or **another URL**, this injector cannot see it (Home vs `/q14` notepad).
4. `HttpClient` missing → you forgot `provideHttpClient()` in `appConfig` (Step 4).
5. Tests: `TestBed` must `provide` the same token, or you get the same error.

**MFE / OneTrust:** remote `inject(API_URL)` and host never `{ provide: API_URL, useValue: ... }` → same `NullInjectorError` at runtime in the remote. Token exists; recipe does not.

---

#### Fix `/q14` Step 5 on purpose (then undo)

Add on the page (or route, or `appConfig`):

```ts
{ provide: FORGOTTEN, useValue: 'I exist now' }
```

Reload: the red box would show that string, not `null`. Remove the line: back to `null` / throw.

---

#### Spoken 25s

> If I never register a token — no `providedIn`, no `providers` array — `inject` walks child → page → route → root and hits the NullInjector, which throws `No provider for X`. `{ optional: true }` or `@Optional()` returns `null` instead. Creating an `InjectionToken` is not providing it. I fix it by providing at the scope I want, same as Steps 1–4.

---

### Part B on the same page (recipes — “how”, not “where”)

At the bottom of `/q14`:

| Recipe | What you see |
|---|---|
| `useValue` | API_URL string |
| `useClass` | Logger is `ConsoleLogger` |
| `useFactory` | Analytics mode `dev` (reads that URL) |
| `useExisting` | OldLogger **yes** same object as Logger |

Code: `di-recipes.ts` + `providers` on `DiProvidersDemo`. Recipes → §3. **Why `API_URL` is an InjectionToken → §4.**

---

### Drill this table out loud

| She points at | You say (and point at `/q14`) |
|---|---|
| `providedIn: 'root'` | Login `#1` never resets. Auth. |
| `appConfig.providers` | BootStamp `#1` like login, but **always in main.js** (hard import). Router / Http. |
| Component `providers` | Desk A pad ≠ Desk B pad. |
| Route `providers` | Notepad ticks **stay**. Home cannot inject it. Reset = component `VisitPad`. |
| Missing | Walk hits NullInjector. Optional → `null`. Token ≠ provider. |

---
## 3. The provider object — `provide` + recipe

```ts
{ provide: TOKEN, useClass: SomeClass }
{ provide: TOKEN, useValue: someObject }
{ provide: TOKEN, useFactory: () => ..., deps?: [...] }
{ provide: TOKEN, useExisting: OtherToken }
```

**`provide`** = the **key** (what you inject).  
**`use*`** = **how to create** the value.

Shorthand `providers: [AuthService]` = `{ provide: AuthService, useClass: AuthService }`.

---

### `useClass` — “inject token A, `new` class B”

```ts
{ provide: Logger, useClass: ConsoleLogger }
// /q14 Part B → logger.kind === 'ConsoleLogger'
```

Angular constructs `ConsoleLogger` (and injects *its* constructor deps). Components still `inject(Logger)`. Swap the class, **zero** callers change.

**Use cases**

| Situation | Example |
|---|---|
| Swap implementation by env / Storybook | `{ provide: ConsentApi, useClass: HttpConsentApi }` in prod; `useClass: MockConsentApi` in Storybook |
| Tests | `{ provide: AuthService, useClass: FakeAuthService }` in `TestBed` |
| Interface-like API, one real class | `provide: PaymentGateway, useClass: StripeGateway` (later `PaypalGateway`) |
| Default shorthand | `providers: [ScratchPad]` = `{ provide: ScratchPad, useClass: ScratchPad }` |

**Not for:** a string/config (no class to `new`) → `useValue`. An alias to an object that **already exists** → `useExisting`. Branching on `window.EnvironmentData` → `useFactory`.

**Trap:** `{ provide: OldLogger, useClass: ConsoleLogger }` creates a **second** logger. If you wanted the same instance, that is `useExisting`.

---

### `useValue` — “here is the finished value, don’t `new`”

```ts
{ provide: API_URL, useValue: 'https://api-dev.example.com' }
// /q14 Part B prints that exact string
```

No constructor. The injector stores **the object/string you passed**.

**Use cases**

| Situation | Example |
|---|---|
| Env / base URL / tenant | `{ provide: API_URL, useValue: EnvironmentData.api }` (NUX stamp, MFE host) |
| Feature flags object | `{ provide: APP_CONFIG, useValue: { featureX: true, pageSize: 25 } }` |
| OneTrust | `{ provide: CONSENT_API_URL, useValue: 'https://…' }` per env |
| Test / Storybook mock object | `{ provide: AuthService, useValue: { isLoggedIn: () => true } }` — no fake class |
| Constants | `{ provide: PAGE_SIZE, useValue: 50 }` on one page to override default |
| Step 5 fix | `{ provide: FORGOTTEN, useValue: 'I exist now' }` |

**Not for:** “build this from other injectables + if/else” → `useFactory`. “Construct a real class with deps” → `useClass`.

**Trap:** `useValue: { … }` passes **that one object**. Mutating it mutates the shared config. Prefer a new object per env file, not a mutable singleton you poke at runtime.

---

### `useFactory` — “run this function, I decide how to build it”

```ts
export function analyticsFactory(): Analytics {
  return new Analytics(inject(API_URL));
}
{ provide: Analytics, useFactory: analyticsFactory }
// /q14 → mode 'dev' because the URL has no 'prod'
```

Factory runs on **first inject**, in an **injection context** (`inject()` works). You can `if`, read `window`, read other tokens.

**Use cases**

| Situation | Example |
|---|---|
| Value depends on another token | Analytics reads `API_URL` (this is `/q14`) |
| NUX / Jenkins stamp | `useFactory: () => parseEnvironmentData(window['EnvironmentData'])` |
| Branch prod vs mock | `inject(API_URL).includes('prod') ? new RealA() : new NoopA()` |
| Optional browser-only | `useFactory: () => typeof worker !== 'undefined' ? new WorkerLog() : new NoopLog()` |
| `APP_INITIALIZER`-style setup | Factory returns a Promise / function Angular will call (platform APIs use this pattern) |
| Need `new MyClass(plainString)` | `Analytics` constructor takes a `string` — Angular cannot `inject(string)`, so factory `inject(API_URL)` then `new` |

**vs `useClass`:** class = Angular calls the constructor and fills class tokens. Factory = **you** write `new` and the `if`.

**vs `useValue`:** value is ready now. Factory runs later (lazy) and can read the injector.

**Trap:** calling `inject()` **outside** a factory / constructor / field initializer → “inject() must be called from an injection context.” Keep logic **inside** the factory function.

---

### `useExisting` — “second doorbell, same house”

```ts
{ provide: Logger, useClass: ConsoleLogger }       // creates L#1
{ provide: OldLogger, useExisting: Logger }        // alias → L#1
// /q14: logger === oldLogger → yes
```

Does **not** `new`. `inject(OldLogger)` follows the arrow to whatever is already registered for `Logger`.

**Use cases**

| Situation | Example |
|---|---|
| Rename a service, old imports still compile | `{ provide: AuthService, useExisting: SessionService }` until 40 files migrate |
| Two abstract names, one impl | `Logger` and `LegacyLogger` on `/q14` |
| Public token vs internal class | `{ provide: ConsentApi, useExisting: HttpConsentApi }` after `HttpConsentApi` is already `providedIn: 'root'` |
| Don’t want two HttpClients / two Auths | Never `useClass` a second time for the same singleton — alias instead |

**Not for:** a **different** fake in tests (`useClass` / `useValue`). A brand-new object (`useClass`).

**Trap:** `useExisting: Logger` **before** `Logger` itself is provided → walk fails. Provide the real one first (or `providedIn` on that class).

```
useClass     Logger ──► new ConsoleLogger()  = L#1
useExisting  OldLogger ──► Logger ──► L#1     same object
useClass     OldLogger ──► new ConsoleLogger() = L#2  WRONG if you meant alias
```

---

### Pick one (say this)

| I need to… | Recipe |
|---|---|
| `new` a class, maybe swap the class later | `useClass` |
| Hand over a string / config / mock object | `useValue` |
| `if` / env / `inject` another token first | `useFactory` |
| Two tokens, **one** instance (rename / alias) | `useExisting` |

| Recipe | New instance? | `/q14` | Typical use case |
|---|---|---|---|
| `useClass` | Yes (in that injector) | `Logger` → `ConsoleLogger` | Real vs mock API class |
| `useValue` | You pass it | `API_URL` string | Env URL, flags, test stub |
| `useFactory` | You return it | `Analytics` from URL | `EnvironmentData`, branching |
| `useExisting` | **No** | `OldLogger` === `Logger` | Deprecate old service name |

---

## 4. `InjectionToken` — what it is, what it is for, when, how

`/q14` uses **two** tokens that are not classes:

| Token | File | Provided? | On screen |
|---|---|---|---|
| `API_URL` | `di-recipes.ts` | Yes — page `useValue` | Part B shows the string |
| `FORGOTTEN` | `di-scope.ts` | **No** | Step 5 shows `null` |

---

### What `new InjectionToken` **is**

DI is a dictionary: **key → how to get a value**.

When the value is a **class instance**, Angular already has a unique runtime key: the class itself.

```ts
inject(LoginService)
// key = the LoginService function/class (exists after tsc)
```

When the value is a **string**, **number**, **boolean**, **config object**, or you only have a TypeScript **interface**, there is **no** unique class to use as the key.

```ts
inject('https://api.example.com')  // nonsense — not a key
inject(string)                     // TypeScript type, gone at runtime
inject(AppConfig)                  // interface — also gone after tsc
```

`InjectionToken` is a **small object you create** that *does* exist at runtime. You use **that object** as the dictionary key. Angular then stores whatever value you `provide` under it.

```ts
import { InjectionToken } from '@angular/core';

export const API_URL = new InjectionToken<string>('API_URL');
//               ↑ unique object in memory     ↑ label for errors only
```

Think: **locker number**, not the jacket inside.

| Piece | Role |
|---|---|
| `new InjectionToken(...)` | Makes the locker (the key) |
| `<string>` | TypeScript: `inject(API_URL)` is typed as `string`. Erased at runtime. |
| `'API_URL'` | Name printed in `NullInjectorError`. **Not** the lookup key. |
| `const API_URL = ...` | You export this object. Every file must import **this same const**. |
| `{ provide: API_URL, useValue: 'https://…' }` | Puts a jacket in the locker |
| `inject(API_URL)` | Opens **that** locker |

```ts
const A = new InjectionToken<string>('API_URL');
const B = new InjectionToken<string>('API_URL');
// A !== B
// provide(A) does not fill B. Same sticker on the door, two lockers.
```

**Hospital picture:** you do not identify people by the word `"patient"`. Each person gets a bracelet. `new InjectionToken` is the bracelet.

It is **not** a service. It does not `new` anything. It does not call HTTP. Creating the token **does not provide** a value (Step 5: `FORGOTTEN`).

---

### What it is **for**

You need a token whenever you want DI to hand out something that **is not “construct this class.”**

| You want to inject | Why a class key fails | Use |
|---|---|---|
| API base URL (`string`) | `string` is not unique | `InjectionToken<string>` |
| Page size / timeout (`number`) | same | `InjectionToken<number>` |
| Feature flags / env config (`interface`) | interface erased | `InjectionToken<AppConfig>` |
| A function (`(id) => url`) | not a constructable service | `InjectionToken<Fn>` |
| Two different strings (dev vs “which CDN”) | cannot `inject(string)` twice | **two** tokens: `API_URL`, `CDN_URL` |

**What it is not for:** `LoginService`, `HttpClient`, `ScratchPad`. Those **are** classes. `inject(LoginService)` is enough.

**Logger on `/q14`:** we used an **abstract class** as the key + `useClass: ConsoleLogger`. That is still a class token, not an `InjectionToken`. Use `InjectionToken` when there is **no** class for the value (a string). Use an abstract class when the value **is** an object you `new`.

---

### When you use it (interview + real app)

**Use `InjectionToken` when:**

1. **Config / env** — URL, tenant id, `EnvironmentData`, flags. Components should not `import { environment } from '…'` from a host package.
2. **MFE** — host provides `API_URL` / `TENANT_ID`; remotes only `inject(API_URL)`.
3. **Tests / Storybook** — `{ provide: API_URL, useValue: 'http://localhost' }` without subclassing.
4. **Optional extras** — `FORGOTTEN`-style: token exists, host may or may not provide (`optional: true`).
5. **Several values of the same type** — `API_URL` vs `CDN_URL` are both strings; two tokens keep them apart.

**Do not use it when:** you can `inject(SomeService)` and that service reads `environment` internally (also fine). Token is better when **many** callers need the raw string/config, or remotes must not import the host env file.

**OneTrust line:** consent API base URL + flags as tokens, `useValue` per env.  
**NUX line:** stamp `EnvironmentData` once on the host; remotes `inject(API_URL)`.

---

### How you use it (always three steps)

**1. Create once, export the const**

```ts
// tokens.ts  (or di-recipes.ts on /q14)
export const API_URL = new InjectionToken<string>('API_URL');

export interface AppConfig {
  apiUrl: string;
  featureX: boolean;
}
export const APP_CONFIG = new InjectionToken<AppConfig>('app.config');
```

Put this in a **small shared file**. Host and remotes import the **same** `API_URL` object (same package). If each repo does `new InjectionToken('API_URL')`, you have two lockers.

**2. Provide a value** (pick a scope — same table as Steps 1–4)

```ts
// whole app — usual for env
export const appConfig = {
  providers: [
    { provide: API_URL, useValue: 'https://api.example.com' },
    { provide: APP_CONFIG, useValue: { apiUrl: '/api', featureX: true } },
  ],
};

// one page only — what /q14 does
@Component({
  providers: [{ provide: API_URL, useValue: 'https://api-dev.example.com' }],
})

// factory — value depends on something else
{
  provide: APP_CONFIG,
  useFactory: () => ({
    apiUrl: inject(API_URL),
    featureX: location.hostname.includes('prod'),
  }),
}

// default on the token itself (like providedIn root)
export const PAGE_SIZE = new InjectionToken<number>('PAGE_SIZE', {
  providedIn: 'root',
  factory: () => 25,
});
```

**3. Inject the same const**

```ts
readonly url = inject(API_URL);           // string
readonly cfg = inject(APP_CONFIG);        // AppConfig
readonly maybe = inject(FORGOTTEN, { optional: true }); // string | null
```

Or constructor:

```ts
constructor(@Inject(API_URL) private url: string) {}
```

`inject(API_URL)` without `@Inject` works; `inject` already takes the token. Constructor parameters need `@Inject(API_URL)` because a `string` param is not a key.

---

LoginService / ScratchPad do **not** need an InjectionToken. The **class** is the key: `inject(LoginService)`.

---

### Why a class is not enough

Angular’s injector is a map: **key → recipe**.

```
key LoginService  →  { useClass: LoginService }   // providedIn: 'root'
key ScratchPad    →  { useClass: ScratchPad }     // Desk A / Desk B
key API_URL       →  { useValue: 'https://…' }    // must be a real runtime object
```

`LoginService` exists at runtime (it is a `function` / class). You can use it as the map key.

These do **not** exist at runtime after `tsc`:

```ts
export interface AppConfig { apiUrl: string }
export type ApiUrl = string;

inject(AppConfig); // ❌ AppConfig is erased — not a value
inject(string);    // ❌ every string in the app would collide
```

So for a **string**, **number**, **config object**, or **interface**, you create a bracelet that **does** exist at runtime:

```ts
import { InjectionToken } from '@angular/core';

export const API_URL = new InjectionToken<string>('API_URL');
```

- `API_URL` (the **const**) = the key. Two files must import **this same object**.
- `'API_URL'` (the **string** in the constructor) = **debug name** only. It shows up in `NullInjectorError: No provider for API_URL`. It is **not** how Angular looks the value up.
- `<string>` = TypeScript only. Helps `inject(API_URL)` know it returns a `string`. Erased at runtime.

```ts
const A = new InjectionToken<string>('API_URL');
const B = new InjectionToken<string>('API_URL');
// A !== B  — two keys, same label on the error message
```

**Hospital picture:** you do not identify people by the word `"patient"`. Each person gets a bracelet. `new InjectionToken(...)` is the bracelet.

---

### Example 1 — `API_URL` on `/q14` (provided + used)

**Create the token** (`di-recipes.ts`):

```ts
export const API_URL = new InjectionToken<string>('API_URL');
```

**Register a recipe** on the page (`di-providers-demo.ts`):

```ts
@Component({
  providers: [
    { provide: API_URL, useValue: 'https://api-dev.example.com' },
    { provide: Logger, useClass: ConsoleLogger },
    { provide: Analytics, useFactory: analyticsFactory },
    { provide: OldLogger, useExisting: Logger },
  ],
})
export class DiProvidersDemo {
  readonly apiUrl = inject(API_URL);
  //                    ↑ same object as `provide: API_URL`
}
```

**What happens**

1. Page injector gets a map entry: key = the `API_URL` object, value = that exact string. No `new`. (`useValue`)
2. `inject(API_URL)` walks to the page → finds it → `'https://api-dev.example.com'`.
3. Template Part B prints that string.

**Factory reads the same token** (`di-recipes.ts`):

```ts
export class Analytics {
  readonly mode: string;
  constructor(url: string) {
    this.mode = url.includes('prod') ? 'prod' : 'dev';
  }
}

export function analyticsFactory(): Analytics {
  return new Analytics(inject(API_URL));
}
```

`inject(API_URL)` inside the factory works because Angular runs factories in an **injection context**. URL has no `'prod'` → `mode = 'dev'` on `/q14`.

Change only the recipe:

```ts
{ provide: API_URL, useValue: 'https://api-prod.example.com' }
```

`inject(API_URL)` and `analytics.mode` both flip. No component rewrite. That is the interview sentence: **token ≠ value**.

You cannot write `{ provide: 'API_URL', useValue: '…' }` and then `inject('API_URL')` as a habit — string keys collide and are easy to typo. Use the token object.

---

### Example 2 — `FORGOTTEN` on `/q14` Step 5 (token with no recipe)

```ts
// di-scope.ts
export const FORGOTTEN = new InjectionToken<string>('FORGOTTEN');

// page
readonly forgotten = inject(FORGOTTEN, { optional: true });
// → null  (green box on Step 5)
```

Same kind of key as `API_URL`. Nobody listed `{ provide: FORGOTTEN, … }` on desk, page, route, or root.

Walk: desk → page → route → root → **NullInjector**.

- `{ optional: true }` → `null` (demo does this so the page stays up).
- `inject(FORGOTTEN)` → `NullInjectorError: No provider for FORGOTTEN`.

That error text uses the debug string `'FORGOTTEN'`. Fix: provide it, or do not inject it.

```ts
{ provide: FORGOTTEN, useValue: 'I exist now' }
```

---

### Example 3 — config object (what she often wants you to write)

Same idea as `API_URL`, but the value is an object. Interfaces still cannot be the key.

```ts
export interface AppConfig {
  apiUrl: string;
  featureX: boolean;
}

export const APP_CONFIG = new InjectionToken<AppConfig>('app.config');

// app.config.ts (or host MFE)
providers: [
  {
    provide: APP_CONFIG,
    useValue: { apiUrl: '/api', featureX: true },
  },
]

private readonly cfg = inject(APP_CONFIG);
// cfg.apiUrl, cfg.featureX — typed, not hardcoded in the component
```

**NUX / MFE:** host `{ provide: API_URL, useValue: EnvironmentData.api }`. Remotes `inject(API_URL)`. Remotes do not import the host `environment.ts`.

**OneTrust:** consent API base URL / feature flags as `InjectionToken` + `useValue` per env.

---

### Token with a default (`providedIn` on the token)

```ts
export const PAGE_SIZE = new InjectionToken<number>('PAGE_SIZE', {
  providedIn: 'root',
  factory: () => 25,
});

inject(PAGE_SIZE); // 25, no providers array needed
```

Override on a page: `{ provide: PAGE_SIZE, useValue: 50 }` — local wins, same as ScratchPad vs root.

`/q14` does **not** use this. `API_URL` is provided on the page; `FORGOTTEN` has no factory (on purpose).

---

### Class token vs InjectionToken (say this)

| Need to inject | Key | `/q14` |
|---|---|---|
| A service class you `new` | The class | `LoginService`, `ScratchPad` |
| A string / number / config / interface | `InjectionToken` | `API_URL`, `FORGOTTEN` |
| “I want Logger, give me ConsoleLogger” | Abstract **class** as token + `useClass` | `Logger` (still a class, not InjectionToken) |

`Logger` is a class token. `API_URL` cannot be a class because the value is a string.

---

### Common mistakes

| Mistake | What happens |
|---|---|
| `new InjectionToken` in two files | Two keys. Provide in host, remote injects the other → `NullInjectorError` |
| Think `'API_URL'` string is the key | Lookup uses the **object**. The string is error text only |
| Token created, never `provide`d | Step 5 — throw / `null` |
| `inject(AppConfig)` on an interface | No runtime key |
| `{ provide: 'API_URL', useValue: '…' }` | String tokens collide; avoid |
| Put env class in remotes instead of a token | Remotes couple to host `environment.ts` |

---

### Memorize — “What is an InjectionToken? What is it used for?” (~40s)

> An InjectionToken is a **runtime DI key** for something that is **not a class**.  
> `inject(AuthService)` works because the class exists at runtime. A TypeScript **interface** is erased, and `string` is not a unique key, so I cannot `inject(AppConfig)` or `inject(string)`.  
> I create `const API_URL = new InjectionToken<string>('API_URL')` — that **object** is the locker. The string in the constructor is only the error name.  
> I **provide** a value (`useValue` / `useFactory`) and components **`inject(API_URL)`**.  
> I use it for **config**: API URL, tenant id, feature flags, `EnvironmentData` — anything I want to **swap** in tests, per env, or from an MFE **host**, without the feature importing a constants file.

---

### If she says: “Why not `constants.ts` / `environment.ts`?”

**Honest first line:**  
> For a value that is compile-time, never mocked, never different per app — a const is fine. I don’t token everything.

**Then why we still use a token for API URL:**

A `export const API_URL = 'https://…'` in `constants.ts` is **baked in at build**. Every `import { API_URL }` is a hard couple to that file.

| Const file | InjectionToken |
|---|---|
| One value for whoever imported that file | Same `inject(API_URL)`, **different** `useValue` at the edge |
| Tests import prod URL or need path hacks | `TestBed`: `{ provide: API_URL, useValue: 'http://localhost' }` |
| MFE remote **builds** with its own env | Host **provides** URL at runtime; remote never imports host `environment.ts` |
| Whole app stuck with one URL | One route/tenant can `{ provide: API_URL, useValue: other }` |
| Lib cannot import `src/environments` | Lib only `inject(API_URL)`; app provides it |

**The use case that wins interviews (MFE / NUX):**  
> Remotes are built once. The API host is stamped at deploy (`EnvironmentData`). If the remote imported `constants.ts`, we’d rebuild the remote for every env. Host does `{ provide: API_URL, useValue: EnvironmentData.api }`. Safety/fleet only `inject(API_URL)`.

**Story to tell if they say “we already have a const”:**

> Devices must call `idms-qa3` on qa3 and `idms` on prod. If I `export const REST_API = 'https://idms-qa3…'` in a shared file, that URL is **inside the JS we shipped**. Same Devices SHA cannot be promoted. Host already knows the farm from `#nd-env-config`. So host **provides** `REST_API_BASE`; the remote only `inject`s it. A const cannot be swapped at bootstrap; a token can. I still use a const for `DEFAULT_PAGE_SIZE = 25` — that never changes per env.

**Tests:**  
> I don’t want `HttpClient` hitting the real consent API. I override the token in `TestBed`. I cannot override an `import { API_URL } from './constants'` without Jest module mocks.

**Spoken 20s (const vs token):**  
> Const is fine for a frozen magic number. For API URL I use a token so the **edge** of the app — bootstrap, host, TestBed — can supply the value. Features depend on the token, not on a file. That’s the same idea as `providedIn` vs hardcoding: **depend on a key, provide the value**.

---

### Drill

**Q: Why not `inject(AppConfig)` if AppConfig is an interface?**  
> Interfaces are erased. No runtime key. Use `InjectionToken<AppConfig>`.

**Q: Is `'API_URL'` the key?**  
> No. The **object** `API_URL` is the key. The string is for `NullInjectorError`.

**Q: `API_URL` vs `FORGOTTEN`?**  
> Same mechanism. One has a `useValue` on the page. One does not — optional → null, otherwise throw.

**Q: Why not put the URL in `constants.ts`?**  
> Const is baked at compile time. Token lets host / env / TestBed **provide** the URL. Remotes and libs `inject` it and do not import `environment.ts`.

---

## 5. Tiny story (all four recipes)

```ts
export const API_URL = new InjectionToken<string>('API_URL');

class ConsoleLogger { log(m: string) { console.log(m); } }
class Logger {} // token class / abstract

providers: [
  { provide: API_URL, useValue: 'https://api.example.com' },
  { provide: Logger, useClass: ConsoleLogger },
  { provide: Analytics, useFactory: () => (inject(API_URL).includes('prod') ? new RealA() : new NoopA()) },
  { provide: LegacyLogger, useExisting: Logger }, // same ConsoleLogger instance
]
```

---

## 6. Drill (say out loud)

**Q: `providedIn: 'root'`?**  
> App singleton, tree-shakeable, don’t add to component providers unless you want a **second** instance.

**Q: Component `providers: [X]`?**  
> New `X` for that component tree. Isolates state.

**Q: `useClass`?**  
> Token A, construct class B.

**Q: `useExisting`?**  
> Token A **is** the instance already registered for token B. Alias.

**Q: `useFactory`?**  
> Function creates the dependency — env, flags, `inject()` inside.

**Q: `InjectionToken`?**  
> Runtime key for strings / config / interfaces. Class is enough for `LoginService`. `/q14`: `API_URL` is provided; `FORGOTTEN` is not. Constructor string is debug-only.

**Q: `NullInjectorError`?**  
> Nothing provided that token in the injector chain.

---

## 7. Playground files

The old long dump (SessionService / carts / Facade) is gone. `/q14` is only the five steps in §2b.

| File | Role |
|---|---|
| `prevonir-interview-practice/src/app/q14-di-providers/di-scope.ts` | Login, pad, notepad, boot stamp, FORGOTTEN |
| `…/di-providers-demo.ts` + `.html` | Steps 1–5 UI |
| `…/di-recipes.ts` | Part B recipes |
| `app.config.ts` | `BootStamp` |
| `app.routes.ts` | `providers: [PageNotepad]` |

---

## Related

| File | Depth |
|---|---|
| [ANGULAR_DEPENDENCY_INJECTION.md](../angular-interview-prep/ANGULAR_DEPENDENCY_INJECTION.md) | Hierarchy, tree-shake, `viewProviders`, modifiers |
| Practice `/q14` | Click carts + recipes |
