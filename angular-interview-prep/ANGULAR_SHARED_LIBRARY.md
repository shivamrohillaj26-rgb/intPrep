# Shared Angular Library (Logging example) — Interview Ready Guide

Optum-style prompts:

> Multiple Angular apps need the same logging. How avoid duplication?  
> How develop, package, and distribute a reusable logging library?

Related: MF shared libs → [../micro-frontends/01_MICRO_FRONTENDS_OVERVIEW.md](../micro-frontends/01_MICRO_FRONTENDS_OVERVIEW.md) · peerDeps → [ANGULAR_ECOSYSTEM_FUNDAMENTALS.md](./ANGULAR_ECOSYSTEM_FUNDAMENTALS.md)

---

## 1. One-liner

> Extract a **versioned Angular library** (`@org/logging`) with a small API (`LoggerService`), set Angular as **peerDependency**, build with **ng-packagr** / CLI library schematic, publish to a **private npm registry**, and consume from each app — one implementation, many apps.

---

## 2. Why not copy-paste

| Copy into each app | Shared library |
|---|---|
| Drift / bug fixed 3 times | Fix once |
| Inconsistent formats | One contract |
| Hard upgrades | SemVer releases |

---

## 3. Design the API (keep tiny)

```ts
export abstract class Logger {
  abstract info(message: string, ctx?: Record<string, unknown>): void;
  abstract error(message: string, err?: unknown, ctx?: Record<string, unknown>): void;
}

@Injectable({ providedIn: 'root' })
export class ConsoleLogger extends Logger {
  info(m: string, ctx?: Record<string, unknown>) {
    console.info(m, ctx);
  }
  error(m: string, err?: unknown, ctx?: Record<string, unknown>) {
    console.error(m, err, ctx);
  }
}

// Optional: HttpLogger that POSTs to /telemetry
```

Apps inject `Logger` (or provide alternate impl for tests).

---

## 4. Package & distribute

```text
1. ng generate library logging   (workspace)  OR  separate repo
2. Implement public API via public-api.ts
3. peerDependencies: @angular/core (and common/rxjs as needed)
4. dependencies: only what must ship with the lib (keep minimal)
5. Build: ng-packagr → dist/logging (FESM/ESM)
6. Publish: npm publish --registry=https://npm.mycompany.com
7. Apps: npm i @org/logging@^1.2.0
```

**peerDependencies rule:**

> Angular stays a peer so the app doesn’t bundle two Angular copies.

---

## 5. Alternatives (when asked)

| Approach | When |
|---|---|
| Private npm lib | Multiple repos / clear SemVer — **default answer** |
| Nx / monorepo path import | Same org monorepo |
| Module Federation `shared` | Runtime share across MFEs (version alignment critical) |
| Git submodule / `file:` | Short-term only |

---

## 6. Versioning & governance

- SemVer: breaking API → major  
- Changelog  
- CI publish on tag  
- Don’t log secrets (PII redaction)  

---

## 7. Practical create + consume example

**Library (`libs/logging` → publish `@org/logging`):**

```ts
// public-api.ts
export * from './lib/logger';
export * from './lib/provide-logging';
```

```ts
// app (consumer) — after: npm i @org/logging
import { provideLogging, Logger } from '@org/logging';

export const appConfig: ApplicationConfig = {
  providers: [provideLogging({ level: 'info' })],
};

@Component({...})
export class Home {
  private logger = inject(Logger);
  ngOnInit() {
    this.logger.info('Home opened', { route: '/' });
  }
}
```

```json
// library package.json (sketch)
{
  "name": "@org/logging",
  "version": "1.2.0",
  "peerDependencies": {
    "@angular/core": "^19.0.0"
  }
}
```

---

## 8. Design factors for reusable libs (Optum Q)

| Factor | Why |
|---|---|
| **Tiny public API** | Easier SemVer; less breakage |
| **peerDeps on Angular** | One framework copy per app |
| **No app-specific env** | Inject config (`provideLogging(options)`) |
| **Tree-shakeable ESM** | Side-effect free entry |
| **Tests + changelog** | Consumers trust upgrades |
| **SemVer discipline** | Breaking change → major |
| **Avoid god-libs** | Prefer `@org/logging`, `@org/auth-utils` over `@org/kitchen-sink` |
| **SSR-safe** | Guard `window` / `document` |
| **i18n / theming** | Don’t hard-code app strings/colors if UI lib |

---

## 9. Two independent projects — data / integration patterns

Not everything should be a shared npm lib.

| Need | Pattern |
|---|---|
| Same UI/util/logger code | **Shared library** (this guide) |
| Same business data | **Backend API** (source of truth) |
| Auth session across apps | Cookie/BFF / SSO — not `localStorage` bus |
| Loose UI events (iframe/MFE) | `postMessage`, CustomEvent, URL params |
| Independently deployed MFEs | Federation **shared** for framework; **avoid** shared global Redux |
| Async integration | Events/queue on server (webhooks) |

**Spoken:**

> For code reuse I publish a library. For runtime data I prefer the API or URL. Across MFEs I don’t sync a giant client store — host owns session; remotes call APIs.

MF version/dependency sharing → [../micro-frontends/01_MICRO_FRONTENDS_OVERVIEW.md](../micro-frontends/01_MICRO_FRONTENDS_OVERVIEW.md) (singleton `shared`, `requiredVersion`, governance).

---

## 10. Angular beyond UI (bonus Optum Q)

> Angular isn’t only screens. Same platform builds **libraries**, **schematics**, **SSR** apps, tooling with CLI. A logging package is an Angular library consumed by UI apps — still “Angular ecosystem,” not only components.

---

## 11. Spoken (45s)

> I’d create an `@org/logging` Angular library with a tiny Logger API, mark `@angular/core` as a peerDependency, build with the library schematic / ng-packagr, and publish to our private registry. Each app installs one version instead of copying services. In an MFE world I might also expose it as a shared singleton carefully — but a published package is the clean default for independently deployed apps. For live data between apps I use APIs or URL/state, not a shared mutable store.

---

## 12. Practice checklist

- [ ] Name peerDependency reason  
- [ ] Steps: generate lib → build → private registry → install  
- [ ] Show consume via `inject(Logger)`  
- [ ] List 5 library design factors  
- [ ] Contrast code-share vs data-share  
- [ ] Point to MF singleton version rules  
