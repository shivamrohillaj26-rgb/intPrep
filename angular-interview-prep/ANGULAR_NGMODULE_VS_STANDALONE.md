# NgModule (older) vs Standalone (latest) — Angular architecture

**Use this if they ask:** “What is NgModule?” · “What is standalone?” · “How is modern Angular different from the module-based app?” · “Do we still need AppModule?”

**Versions:** Standalone **introduced 14** · **`ng new` default 17** · generated comps **`standalone: true` by default 19**. NgModules **still work**. DI rules did not change.

**Related:** [ANGULAR_VERSION_FEATURES.md](./ANGULAR_VERSION_FEATURES.md) · [ANGULAR_APP_CONFIG_AND_ANGULAR_JSON.md](./ANGULAR_APP_CONFIG_AND_ANGULAR_JSON.md) · [ANGULAR_DEPENDENCY_INJECTION.md](./ANGULAR_DEPENDENCY_INJECTION.md)

---

## 0. 40s opener

> Older Angular is **NgModule-based**: every component is **declared** in a module. The compiler’s unit is the module — `declarations`, `imports`, `exports`, `providers`. You boot `AppModule` with `bootstrapModule`. Shared UI goes through a **SharedModule**. Lazy load means `loadChildren` → another **NgModule**.  
> Latest Angular is **standalone-based**: a component **declares its own imports** (`imports: [RouterLink, DatePipe]`). There is no required `AppModule`. You boot `bootstrapApplication(App, appConfig)`. Lazy load is `loadComponent` / `loadChildren` to a **routes array**. `app.config.ts` is the old `AppModule.providers`.  
> Same Ivy, same injectors. Standalone is **authoring + tree-shaking**, not a new runtime.

```text
OLD                         NEW
AppModule                   app.config.ts + App (standalone)
FeatureModule               feature.routes.ts + standalone comps
SharedModule                import the pipe/component directly
loadChildren → XxxModule    loadComponent / loadChildren → ROUTES
```

---

## 1. Timeline (say the majors)

| When | What |
|---|---|
| **2–13** | NgModules are **the** architecture. `NgModule`, `declarations`, Shared/Core pattern. |
| **14** | **Standalone components** optional. `bootstrapApplication` exists. |
| **15–16** | Standalone APIs mature (`provideRouter`, `provideHttpClient`). |
| **17** | **`ng new` is standalone.** `@if`/`@for`/`@defer`. esbuild application builder default. |
| **19** | New components **standalone by default** (`standalone: true` implicit in docs). |
| **Today** | New code = standalone. Legacy NgModules supported. Mix is legal. |

**NUX / IDMS:** Dashboard **grew as NgModules**. Conversion / new remotes = **standalone**. Don’t claim prod is fully migrated unless you know.

---

## 2. Older architecture — NgModule

### What an NgModule is

A **compiler + injector cookbook** for a slice of the app:

```ts
@NgModule({
  declarations: [HomeComponent, HighlightDirective, TruncatePipe], // THIS module owns them
  imports: [CommonModule, RouterModule.forChild(routes), SharedModule],
  exports: [HomeComponent, TruncatePipe], // what others may use
  providers: [HomeService],               // injector for this module (or root if providedIn)
  bootstrap: [AppComponent],              // root module only
})
export class HomeModule {}
```

| Field | Job |
|---|---|
| **`declarations`** | Components / directives / pipes that **belong here**. Each can be declared in **one** module only. |
| **`imports`** | Other modules whose **exports** you need in templates. |
| **`exports`** | Re-export declarations (or whole modules) so importers can use them. |
| **`providers`** | DI for this module’s injector (eager vs lazy — classic interview trap). |
| **`bootstrap`** | Root component; only `AppModule`. |

### App shape (draw this)

```text
main.ts
  platformBrowserDynamic().bootstrapModule(AppModule)

AppModule
  declarations: [AppComponent]
  imports: [BrowserModule, AppRoutingModule, CoreModule, SharedModule]
  bootstrap: [AppComponent]

AppRoutingModule
  { path: 'admin', loadChildren: () => import('./admin/admin.module').then(m => m.AdminModule) }

AdminModule
  declarations: [AdminPage]
  imports: [CommonModule, AdminRoutingModule, SharedModule]
```

**SharedModule:** `exports: [CommonModule, FormsModule, MyButton]` so every feature doesn’t re-import 20 things.  
**CoreModule:** singleton services, interceptors, `forRoot()`. Imported **once** in `AppModule`.

### Lazy loading (old)

`loadChildren` returns an **NgModule class**. Angular creates a **child injector** for that module. Services listed in `AdminModule.providers` (not `providedIn: 'root'`) are **per lazy chunk** — that’s `providedIn: 'any'` era / module scope.

### Pain (why we moved)

- **Indirection:** to use `TruncatePipe` you declare it, export it, import SharedModule.  
- **Barrels / SharedModule** pull unused pipes into a feature (worse tree-shake).  
- **Circular modules** (`A imports B imports A`).  
- Juniors: “which module declares this?”  
- `forRoot` / `forChild` mistakes → extra service instances.

---

## 3. Latest architecture — Standalone

A standalone component **is** its own NgModule-shaped metadata, on the class:

```ts
@Component({
  selector: 'app-home',
  standalone: true,          // default in current CLI
  imports: [RouterLink, DatePipe, SharedButton],
  template: `<a routerLink="/x">{{ date | date }} <shared-button /></a>`,
})
export class Home {}
```

- **No `declarations` array** elsewhere.  
- Template can only use what you **`imports`** (or what’s standalone and imported).  
- You **import the component/pipe/directive**, not a wrapping module (unless the lib still ships a module).

### App shape (draw this)

```text
main.ts
  bootstrapApplication(App, appConfig)

app.config.ts
  providers: [
    provideRouter(routes),
    provideHttpClient(withInterceptors([authInterceptor])),
    provideAnimationsAsync(),
  ]

app.routes.ts
  { path: 'admin', loadComponent: () => import('./admin/admin').then(m => m.Admin) }
  { path: 'fleet', loadChildren: () => import('./fleet/fleet.routes').then(m => m.FLEET_ROUTES) }
```

`app.config.ts` = old **`AppModule` `providers` + `imports` that were only for providers** (`HttpClientModule` → `provideHttpClient()`).

### Lazy loading (new)

| Old | New |
|---|---|
| `loadChildren` → `AdminModule` | `loadComponent` → one component |
| Feature `RoutingModule` | `admin.routes.ts` exporting `Routes` |
| `RouterModule.forChild` | `provideRouter` only at root; children are data |

```ts
export const ADMIN_ROUTES: Routes = [
  { path: '', component: AdminHome },
  { path: ':id', component: AdminDetail },
];
```

Host MFE remotes expose **`./Routes`** the same way — standalone-native.

### Shared UI now

No mandatory SharedModule. Import `NdButton` where you use it. Optional **barrel** `@idms/ui` still OK if it’s **tree-shakeable** (lean exports). A fat SharedModule that `imports`/`exports` everything is the old smell.

---

## 4. Side-by-side (memorize)

| | NgModule app | Standalone app |
|---|---|---|
| Boot | `bootstrapModule(AppModule)` | `bootstrapApplication(App, appConfig)` |
| Root providers | `AppModule.providers` + `imports: [HttpClientModule]` | `app.config.ts` `provideHttpClient()` |
| “I need DatePipe” | `imports: [CommonModule]` on the **module** | `imports: [DatePipe]` on the **component** |
| Feature boundary | `XxxModule` | folder + `*.routes.ts` |
| Lazy | `loadChildren` → module | `loadComponent` / `loadChildren` → routes |
| Shared UI | SharedModule | Direct imports (or small UI lib) |
| Tree-shake | Weaker if SharedModule is a blob | Better — graph starts at the component |
| Mix | — | Standalone can `imports: [SomeLegacyModule]` |

**DI:** `providedIn: 'root'` works in **both**. Eager `providers` on `AppModule` vs `appConfig` — same “won’t shake” trap.

---

## 5. Why standalone helps (interview)

1. **Local reasoning** — open the component, see every template dependency.  
2. **Tree-shaking** — unused SharedModule exports aren’t pulled because you never imported them.  
3. **Lazy is obvious** — `loadComponent` is one file.  
4. **Less ceremony** — no `declarations` / `exports` ping-pong.  
5. **Fits MFE** — remotes export routes, not `RemoteModule`.  
6. **Same runtime** — Ivy still compiles templates; this is not React.

**Why not “NgModules are wrong”:** Huge NUX-style apps still have them. Migration is **strangler**: new routes standalone, `imports: [OldModule]` until peeled. `ng generate @angular/core:standalone` schematic exists.

---

## 6. Migration (strangler — 20s)

> Don’t rewrite AppModule on Friday. New features **standalone**. Lazy route: `loadComponent` beside old `loadChildren`. A standalone component can **import an NgModule** to use old declarations. When a feature is fully standalone, delete the module. `providedIn: 'root'` services stay.

---

## 7. Mini Q&A

**Q: Is standalone a different change-detection model?**  
> No. OnPush/signals/zoneless are separate. Standalone is how we **declare dependencies**.

**Q: Can I mix?**  
> Yes. Standalone `imports: [SharedModule]`. NgModule can declare only non-standalone (legacy) and import standalone components in newer versions.

**Q: Where did HttpClientModule go?**  
> `provideHttpClient()` in `appConfig`. Same interceptor story.

**Q: SharedModule vs standalone imports?**  
> Tiny SharedModule still OK. A 40-export SharedModule imported everywhere is why `main.js` grew.

**Q: `standalone: true` required?**  
> Current CLI defaults standalone. Older code sets it explicitly. Don’t memorize the flag; memorize **component `imports` vs module `declarations`**.

**Q: Routing `forRoot`?**  
> Once at bootstrap: `provideRouter(routes)`. No `RouterModule.forRoot` in AppModule.

---

## 8. Spoken 60s

> Module-based Angular means **NgModules own declarations**. App boots `AppModule`; features are modules; SharedModule re-exports pipes; lazy load pulls a module and its injector. Standalone, from 14 and default at 17, means the **component lists its own imports** and we boot **`bootstrapApplication` + `app.config`**. Lazy is a **route file**, not AdminModule. Tree-shaking and readability get better; DI and CD are the same. I’d migrate feature-by-feature. NUX is historically modules; new MFE remotes I’d write standalone.

---

## Cheat card

```text
NgModule     = declarations + imports + exports + providers
Standalone   = component.imports[] ; no AppModule required
Boot old     = bootstrapModule(AppModule)
Boot new     = bootstrapApplication(App, appConfig)
Lazy old     = loadChildren → Module
Lazy new     = loadComponent / ROUTES
Http         = HttpClientModule  →  provideHttpClient()
14 optional, 17 default ng new, 19 default generated
Mix OK       = standalone imports NgModule
Not CD       = still OnPush / signals separately
```
