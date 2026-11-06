# `app.config.ts` vs `angular.json` (Interview)

Prompt:

> What is `app.config`? What is `angular.json`? What’s the difference?

**Already in the repo (don’t duplicate those deep dives):**  
`angular.json` in the **build** story — [ANGULAR_BUILD_ESM_WEBPACK_ESBUILD.md](./ANGULAR_BUILD_ESM_WEBPACK_ESBUILD.md) §11  
`angular.json` vs `package.json` — [ANGULAR_ECOSYSTEM_FUNDAMENTALS.md](./ANGULAR_ECOSYSTEM_FUNDAMENTALS.md) §2b  
`app.config` **providers** — [ONETRUST_ANGULAR_DI_PROVIDERS.md](../onetrust/ONETRUST_ANGULAR_DI_PROVIDERS.md)  
NUX env + `getAuthRuntimeConfig()` in `app.config` — [ONETRUST_ENVIRONMENT_STORY.md](../onetrust/ONETRUST_ENVIRONMENT_STORY.md)

This file is the **side-by-side** + spoken answers.

---

## 0. One sentence each

| File | When it runs | Job |
|---|---|---|
| **`angular.json`** | **CLI / CI** (`ng serve`, `ng build`) | How to **compile and serve** the workspace: projects, builder, `main.ts`, styles, assets, budgets, ports |
| **`app.config.ts`** | **Browser** (after JS loads) | How to **boot Angular**: router, HttpClient, interceptors, `APP_INITIALIZER`, extra DI |

```text
angular.json  →  ng build/serve  →  dist/ + index.html + JS
main.ts       →  bootstrapApplication(App, appConfig)
app.config.ts →  root injector recipes (runtime)
```

They are **not** interchangeable. `angular.json` never registers `HttpClient`. `app.config.ts` never picks the esbuild builder.

---

## 1. Memorize (~30s)

> `angular.json` is **workspace / build** config for the CLI — entry file, output folder, budgets, which builder. It runs on my machine and Jenkins, not in the user’s tab.  
> `app.config.ts` is the **standalone bootstrap** object I pass to `bootstrapApplication`. That’s the **root injector**: `provideRouter`, `provideHttpClient`, interceptors, initializers. That’s the replacement for `AppModule`’s `imports` / `providers`.  
> API hosts in our dashboard are **not** a `fileReplacements` block in `angular.json` — we stamp `EnvironmentData` and `app.config` **reads** it.

---

## 2. `angular.json` — what you point at

CLI reads this **before** TypeScript runs.

```json
{
  "projects": {
    "dashboard": {
      "sourceRoot": "src",
      "architect": {
        "build": {
          "builder": "@angular/build:application",
          "options": {
            "browser": "src/main.ts",
            "outputPath": "dist/dashboard",
            "index": "src/index.html",
            "polyfills": ["zone.js"],
            "tsConfig": "tsconfig.app.json",
            "assets": ["src/assets"],
            "styles": ["src/styles.css"]
          },
          "configurations": {
            "production": {
              "budgets": [{ "type": "initial", "maximumError": "1mb" }],
              "outputHashing": "all"
            }
          }
        },
        "serve": { "builder": "@angular/build:dev-server", "options": { "port": 4200 } }
      }
    }
  }
}
```

| Key | Meaning |
|---|---|
| `projects` | Apps/libs in the workspace (NUX dashboard is one project) |
| `builder` | **application** = esbuild (modern). Old `browser` = Webpack |
| `browser` / `main` | JS **entry** (`main.ts`) |
| `index` | HTML shell (`nd-env-config` lives here in NUX — not in `app.config`) |
| `styles` / `assets` | Global CSS, images copied to `dist` |
| `polyfills` | e.g. `zone.js` — zoneless new apps may omit it |
| `configurations.production` | Optimize, hash filenames, **budgets**, optional `fileReplacements` |
| `serve.port` | `ng serve` |

**It does not:** start the router, add interceptors, or pick `qa3` API URLs (in our product).

**Spoken:**  
> I’d open `angular.json` for “how do we build” — application builder, `main.ts`, budgets, assets. Webpack vs esbuild is the `builder` string.

---

## 3. `app.config.ts` — what you point at

Loaded **with** `main.ts` in the **browser**.

```ts
// main.ts
bootstrapApplication(App, appConfig);

// app.config.ts
export const appConfig: ApplicationConfig = {
  providers: [
    provideRouter(routes, withHashLocation()),
    provideHttpClient(withInterceptorsFromDi()),
    { provide: HTTP_INTERCEPTORS, useClass: OAuthInterceptor, multi: true },
    { provide: APP_INITIALIZER, multi: true, useFactory: () => { /* branding */ } },
    // NUX: getAuthRuntimeConfig() reads window.EnvironmentData — not angular.json
  ],
};
```

| You put here | Why |
|---|---|
| `provideRouter` / `provideHttpClient` | Platform services (eager — in `main.js`) |
| Interceptors, `APP_INITIALIZER` | Run at startup |
| `InjectionToken` + `useValue` / `useFactory` | Env, flags (MFE host) |
| `provideZonelessChangeDetection()` | Runtime CD mode |

**It does not:** choose esbuild, set `outputPath`, or list `src/assets`.

This **is** the `appConfig.providers` row in the DI table — one root injector, **not** tree-shakeable if you list a class here.

**Old world:** `AppModule` `@NgModule({ imports, providers })`. Same job, different file. Full architecture compare: [ANGULAR_NGMODULE_VS_STANDALONE.md](./ANGULAR_NGMODULE_VS_STANDALONE.md).

---

## 4. Same app, two files (NUX-shaped)

| Question | File |
|---|---|
| Which builder / `dist/` folder? | `angular.json` |
| Hash JS for cache bust? | `angular.json` production |
| Fail CI if `main` > 1MB? | `angular.json` budgets |
| Hash routing? | `app.config` → `withHashLocation()` |
| Attach Bearer token? | `app.config` → interceptor |
| Load branding before first paint? | `app.config` → `APP_INITIALIZER` |
| `qa3` vs prod API host? | `index.html` stamp → `getAuthRuntimeConfig()` used **from** `app.config` / services |

---

## 5. Drill

**Q: Is `app.config` the same as `angular.json`?**  
> No. CLI vs runtime bootstrap.

**Q: Where did `AppModule` go?**  
> Standalone: `bootstrapApplication(App, appConfig)`. Providers that were on the module live in `app.config.ts`.

**Q: Where do I add an interceptor?**  
> `app.config` `providers`, not `angular.json`.

**Q: Where do I add a global stylesheet?**  
> `angular.json` `styles` (or `styleUrl` on a component).

**Q: `fileReplacements` vs EnvironmentData?**  
> CLI *can* swap `environment.ts` at build via `angular.json`. We resolve farms at **runtime** in HTML — [env story](../onetrust/ONETRUST_ENVIRONMENT_STORY.md).

**Q: Why does listing `BootStamp` in `app.config` kill tree-shaking?**  
> `app.config` is always imported from `main.ts` — hard reference. [DI Step 4](../onetrust/ONETRUST_ANGULAR_DI_PROVIDERS.md).

---

## 6. Where else in this repo

| Topic | File |
|---|---|
| Build pipeline, read `angular.json` | [ANGULAR_BUILD_ESM_WEBPACK_ESBUILD.md](./ANGULAR_BUILD_ESM_WEBPACK_ESBUILD.md) §11 |
| `package.json` vs lock vs `angular.json` | [ANGULAR_ECOSYSTEM_FUNDAMENTALS.md](./ANGULAR_ECOSYSTEM_FUNDAMENTALS.md) §2b |
| Providers in `app.config` | [ONETRUST_ANGULAR_DI_PROVIDERS.md](../onetrust/ONETRUST_ANGULAR_DI_PROVIDERS.md) |
