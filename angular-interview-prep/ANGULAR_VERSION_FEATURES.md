# Angular Version → Features (living interview sheet)

**Update this file after every Angular major** (and when you upgrade NUX).  
Interviewer: *“What’s the latest version? What landed in 17 / 21 / 22?”* — answer from here.

| Field | Value | You change this |
|---|---|---|
| **Latest stable (say this)** | **Angular 22** (released **3 Jun 2026**) | After next `blog.angular.dev` major |
| **Last verified** | **7 Sep 2026** | Date you last checked the blog |
| **What I ship at work** | NUX on **Angular 21** (honest — not 22 yet) | When NUX upgrades |
| **LTS (as of last verify)** | 21 and 20 | [versions.dev / angular.dev](https://angular.dev) |
| **Check** | [blog.angular.dev](https://blog.angular.dev) · [angular.dev/events](https://angular.dev/events/v22) · `ng version` | — |

**How to update (10 min after a major):**

1. Set **Latest stable** + **Last verified** in the table above.  
2. Add a `### Angular NN` section (copy [§ template](#10-template-paste-for-the-next-major)).  
3. Add one row to [§1 cheat](#1-ultra-short-cheat-memorize-this-first) and any [§2 reverse](#2-feature--which-version-reverse-index) rows.  
4. Fix “What should a new app look like” if defaults changed (OnPush, zoneless, forms).  
5. Don’t invent APIs — if unsure, write “verify” and skip it in the spoken answer.

Pairs: [build](./ANGULAR_BUILD_ESM_WEBPACK_ESBUILD.md) · [Signals](./ANGULAR_SIGNALS.md) · [CD / zoneless](./ANGULAR_CHANGE_DETECTION_ONPUSH_ZONELESS.md) · [signal forms](./ANGULAR_SIGNAL_FORMS.md)

> Majors ~every **6 months**. Don’t bluff a minor API. Glance at the blog the morning of the interview.

---

## 0. Spoken opener

> Angular ships a major roughly every 6 months. The big arc since v9 is **Ivy**, then **standalone**, then **Signals + new control flow**, then **modern esbuild builder**, then **zoneless**. I’d map the headline features per major rather than memorizing every minor.

---

## 1. Ultra-short cheat (memorize this first)

| Version | Headline features |
|---|---|
| **9** | **Ivy default** |
| **13** | View Engine **removed**; IE11 gone |
| **14** | **Standalone** components (developer preview → usable); typed forms |
| **15** | Standalone APIs mature; directive composition; MDC-based Material direction |
| **16** | **Signals** (developer preview); required inputs; esbuild builder preview; better SSR hydration |
| **17** | **Signals stable**; **standalone default** for new apps; **`@if` / `@for` / `@defer`**; **application builder (esbuild) default**; new angular.dev |
| **18** | **Zoneless experimental**; Material 3 default; SSR / hydration polish |
| **19** | **Standalone default** for components/directives/pipes; signal inputs/outputs/queries stable push; incremental hydration direction |
| **20** | Stabilize more signal APIs (`effect`, `linkedSignal`, `toSignal`…); zoneless → developer preview; incremental hydration / route render modes stable-ish push |
| **21** | **Zoneless default for new apps**; signal forms experimental; Vitest direction |
| **22** | **Signal Forms + `resource` / `httpResource` stable**; **OnPush default** for new components (`Default` renamed **Eager**); HttpClient **Fetch** default; Angular Aria stable; TS 6 |

Deep guide: [ANGULAR_SIGNAL_FORMS.md](./ANGULAR_SIGNAL_FORMS.md).

---

## 2. Feature → “which version?” (reverse index)

Interviewers often ask this direction.

| Feature | Rough version | Notes |
|---|---|---|
| Ivy default | **9** | Old View Engine later removed in 13 |
| View Engine gone | **13** | Ivy-only world |
| Standalone components introduced | **14** | Optional at first |
| Standalone **default** for `ng new` | **17** | NgModules still work |
| Standalone default for generated comps | **19** | `standalone: true` by default |
| Signals preview | **16** | `signal`, `computed`, early `effect` |
| Signals **stable** (core) | **17** | Keep growing after |
| `input()` / `output()` / signal queries | **17–19** | Stabilize across these majors |
| `linkedSignal` / `resource` | **19–20** | Check stability flag in your version |
| New control flow `@if` `@for` `@switch` | **17** | Prefer over `*ngIf` / `*ngFor` in new code |
| `@defer` (deferrable views) | **17** | Lazy template blocks |
| esbuild builder preview | **16** | |
| **application builder default** | **17** | esbuild + Vite serve |
| Webpack `browser` builder deprecated | **recent** | Migrate to `@angular/build` |
| Experimental zoneless | **18** | `provideExperimentalZoneless…` |
| Zoneless stable API | **~20.2** | `provideZonelessChangeDetection()` |
| Zoneless **default new apps** | **21** | Opt into Zone if needed |
| `inject()` function style | **14+** | Widely used with standalone |
| `TakeUntilDestroyed` / destroy APIs | **16+** | Modern teardown |
| Non-destructive hydration | **16+** | SSR improvements |
| Incremental hydration | **19–20** | Stabilize across releases |
| Functional routers / `provideRouter` | **14–15** | Standalone bootstrap style |
| `bootstrapApplication` | **14+** | No root NgModule required |
| Zone.js optional path | **18→21** | Full story in CD guide |
| Signal Forms **stable** | **22** | Experimental in 21 |
| `resource` / `httpResource` **stable** | **22** | Async data as signals |
| OnPush **default** (new comps) | **22** | Old Default = `Eager` |
| HttpClient Fetch default | **22** | XHR path deprecated |

---

## 3. Major-by-major (interview depth)

### Angular 9 — Ivy era begins

- **Ivy** rendering/compiler **default**  
- Better debugging, tree-shaking foundation  
- Still had View Engine compatibility path for a while  

**Say:** “Ivy is the modern compiler/runtime; everything since builds on it.”

---

### Angular 13 — cleanup

- **View Engine removed**  
- IE11 support dropped  
- Dynamic theming / tooling modernizations  

**Say:** “From 13 on you’re Ivy-only.”

---

### Angular 14 — standalone + typed forms

- **Standalone components** (use without NgModule)  
- **Typed Reactive Forms**  
- More functional router APIs emerging  
- `inject()` ergonomics rise  

**Say:** “14 unlocked standalone; 17 made it the default authoring mode.”

---

### Angular 15 — standalone mature

- Standalone APIs broader (router, HttpClient providers style)  
- Directive composition API  
- Material moves toward MDC  

---

### Angular 16 — Signals + build preview

| Big item | Detail |
|---|---|
| **Signals** | Developer preview — fine-grained reactivity |
| Required inputs | `@Input({ required: true })` |
| esbuild builder | Preview for faster builds |
| SSR | Better hydration story |
| `DestroyRef` / takeUntilDestroyed style | Modern cleanup |

**Say:** “16 introduced Signals preview and the esbuild build direction.”

---

### Angular 17 — the “modern Angular” release (most asked)

Memorize this major cold.

| Feature | Why it matters |
|---|---|
| **Signals stable** | Production reactivity model |
| **Standalone default** | `ng new` without NgModules |
| **`@if` / `@for` / `@switch`** | Built-in control flow (faster, simpler) |
| **`@defer`** | Declarative deferred loading in templates |
| **Application builder default** | esbuild (+ Vite for serve) |
| New **angular.dev** docs | Docs reboot |

**Spoken 20s:**

> 17 is the big modern cut: stable Signals, standalone by default, new `@if`/`@for`/`@defer` control flow, and the esbuild application builder as default for new projects.

---

### Angular 18 — zoneless experiments + Material 3

- **Experimental zoneless** change detection  
- Material **3** as default direction  
- SSR / hydration improvements  
- Event replay / debugging polish around SSR  

**Say:** “18 started the official zoneless path.”

---

### Angular 19 — standalone everywhere + signal inputs

- Components / directives / pipes **standalone by default**  
- Signal-based `input()` / `output()` / queries pushed as standard  
- `linkedSignal`, resource-style async patterns emerging  
- Incremental hydration work  

---

### Angular 20 — stabilize reactivity + SSR

- More signal APIs marked **stable** (`effect`, `linkedSignal`, `toSignal`, etc. — per release notes)  
- Zoneless promoted toward **developer preview**  
- Incremental hydration / route-level render modes pushed forward  
- DX: schematics, less noisy file suffixes in CLI generation (per release notes)  

---

### Angular 21 — zoneless by default (new apps)

- **New `ng new` apps zoneless** (no Zone.js by default)  
- `provideZonelessChangeDetection` already stable earlier (~20.2); v21 makes opt-out of Zone the default posture  
- Signal forms / ARIA experiments may appear as experimental — verify if asked  

**Say:** “21 is when new apps stop shipping Zone.js by default.”

Deep: [ANGULAR_CHANGE_DETECTION_ONPUSH_ZONELESS.md](./ANGULAR_CHANGE_DETECTION_ONPUSH_ZONELESS.md)

---

### Angular 22 — current latest (Jun 2026) — **say this if they ask “latest”**

Memorize 4 bullets:

| Feature | Why it matters |
|---|---|
| **Signal Forms stable** | `form()` / `[formField]` production-ready ([guide](./ANGULAR_SIGNAL_FORMS.md)) |
| **`resource` / `rxResource` / `httpResource` stable** | Async data as signals, not only subscribe-in-`ngOnInit` |
| **OnPush default** for new components | Old `Default` is now called **`Eager`**. `ng update` can stamp `Eager` on legacy comps so they don’t silently flip |
| **HttpClient uses Fetch** by default | Better alignment with the platform; XHR `withXsrf` style APIs deprecated |

Also (confirm on blog if you quote them): Angular **Aria** stable; template ergonomics (e.g. arrows in templates — verify); DI helpers like `@Service` / `injectAsync` — **don’t lead with these** unless you’ve read the note that week; **TypeScript 6** required; Node 20 dropped.

**Spoken 20s — “What’s the latest Angular?”**

> Latest stable is **22**, June 2026. Headline is stabilization: Signal Forms and the resource APIs are production, new components are **OnPush by default**, HttpClient uses **Fetch**. I still work on **Angular 21** at Netradyne — zoneless new-app default, signal forms were still experimental there. I’d `ng update` one major at a time.

**Your honesty line:** NUX is **21**. Conversion / testing env — don’t claim the whole dashboard is already 22.

---

### Angular 23+ (empty — fill after the next blog)

_Not released as of last verified date. Paste the [template](#10-template-paste-for-the-next-major) here when it ships._

---

## 4. Parallel tracks (don’t mix them up)

Interviewers confuse these timelines — keep axes separate:

| Track | Arc |
|---|---|
| **Compiler** | View Engine → **Ivy** (9 default, 13 exclusive) |
| **App shape** | NgModules → **Standalone** (14 → 17 default → 19 default flags) |
| **Reactivity** | Zone.js CD → **Signals** (16 preview → 17 stable) → **Zoneless** (18 → 21 default) |
| **Templates** | `*ngIf`/`*ngFor` → **`@if`/`@for`/`@defer`** (17) |
| **Build** | Webpack → esbuild preview (16) → **application builder default** (17) → Webpack deprecated |

---

## 5. “What should a new app look like now?”

Assume current CLI (**22** if greenfield; **21** if that’s what you ship):

```text
✅ standalone bootstrapApplication + app.config.ts
✅ signal() / computed() for UI state; RxJS or httpResource for HTTP
✅ @if / @for / @defer in templates
✅ application builder (esbuild) in angular.json
✅ OnPush (default on 22 new comps; set it yourself on 21)
✅ zoneless on 21+ new apps (or provideZoneless on 20)
✅ provideRouter / provideHttpClient — functional providers
✅ Signal Forms if on 22 (or experimental on 21 — say which)
```

```text
🟡 NgModules — still supported for legacy; not preferred for new code
🟡 *ngIf / *ngFor — still work; new control flow preferred
🟡 Webpack browser builder — migrate off
🟡 Zone.js — legacy/default-old; not the future default
```

---

## 6. Version interview Q&A

**Q: When did Ivy become default?**  
> Angular **9**. View Engine removed in **13**.

**Q: When were standalone components introduced vs default?**  
> Introduced seriously in **14**; **default for new apps in 17**; generation defaults tightened in **19**.

**Q: When did Signals arrive?**  
> Preview in **16**, stable core in **17**, more APIs stabilized through **19–20**.

**Q: What’s special about Angular 17?**  
> Modern Angular package: stable Signals, standalone default, `@if`/`@for`/`@defer`, esbuild application builder default, new docs.

**Q: When zoneless?**  
> Experimental **18**, stable provider ~**20.2**, **default for new apps in 21**.

**Q: When new control flow?**  
> **17** — `@if`, `@for`, `@switch`, plus `@defer`.

**Q: Webpack or esbuild?**  
> Webpack historically; esbuild application builder default since **17**; Webpack deprecated — use `@angular/build`.

**Q: Do NgModules still work?**  
> Yes, for foreseeable future, but new features/docs assume standalone.

**NgModule vs standalone architecture (interview card):** [ANGULAR_NGMODULE_VS_STANDALONE.md](./ANGULAR_NGMODULE_VS_STANDALONE.md)

**Q: Signals replace RxJS?**  
> No. Signals for sync reactive state; RxJS for async streams/HTTP. Bridge with `toSignal` / `toObservable`.

**Signals vs RxJS card:** [ANGULAR_SIGNALS_VS_RXJS.md](./ANGULAR_SIGNALS_VS_RXJS.md)

**Q: What’s the latest version? What’s new?**  
> **22** (Jun 2026): Signal Forms + resources **stable**, OnPush **default**, Fetch HttpClient. I use **21** at work. 17 is still the “modern Angular” story if they only know the old exam sheet.

**Q: How do you upgrade safely?**  
> `ng update` major-by-major, read migrations, run tests, use official schematics (standalone, application builder, etc.).

---

## 7. Quick quiz (self-test)

1. Signals preview? → **16**  
2. `@defer`? → **17**  
3. Ivy-only (VE removed)? → **13**  
4. Zoneless experimental? → **18**  
5. Application builder default? → **17**  
6. Standalone introduced? → **14**  
7. Zoneless default new apps? → **21**  
8. Latest stable (as of last verify)? → **22**  
9. Signal Forms stable? → **22**  
10. OnPush default new comps? → **22**  

---

## 8. Spoken answers

### 45s — modern Angular arc

> Since Ivy in Angular 9, the framework moved to standalone in 14–17, Signals in 16–17, `@if`/`@for`/`@defer` and the esbuild application builder in 17, zoneless from 18 to default new apps in 21. **22** stabilizes Signal Forms and resources and makes **OnPush the default** for new components. I ship **21** today. NgModules and Zone still work for legacy.

### 20s — “What changed in 17?”

> 17 is the landmark: stable Signals, standalone by default, new control flow and `@defer`, and the esbuild application builder as the default for new projects.

---

## 9. Practice checklist

- [ ] Recite the §1 cheat table without looking  
- [ ] Answer “when Signals / standalone / zoneless / esbuild”  
- [ ] List 5 things in a “modern new app”  
- [ ] Separate compiler vs reactivity vs build tracks  
- [ ] Know 17 as the landmark modern release  

---

## Related deep guides

| Feature area | Guide |
|---|---|
| Signals | [ANGULAR_SIGNALS.md](./ANGULAR_SIGNALS.md) |
| OnPush / zoneless | [ANGULAR_CHANGE_DETECTION_ONPUSH_ZONELESS.md](./ANGULAR_CHANGE_DETECTION_ONPUSH_ZONELESS.md) |
| Build / ESM / Webpack | [ANGULAR_BUILD_ESM_WEBPACK_ESBUILD.md](./ANGULAR_BUILD_ESM_WEBPACK_ESBUILD.md) |
| Ecosystem / AOT | [ANGULAR_ECOSYSTEM_FUNDAMENTALS.md](./ANGULAR_ECOSYSTEM_FUNDAMENTALS.md) |
| DI / `inject()` | [ANGULAR_DEPENDENCY_INJECTION.md](./ANGULAR_DEPENDENCY_INJECTION.md) |

---

---

## 10. Template (paste for the next major)

```md
### Angular NN — (Month YYYY)

| Feature | Why it matters | Stability |
|---|---|---|
| … | … | stable / preview / experimental |

**Spoken 15s:** > …

Update: §0 latest table, §1 cheat row, §2 reverse rows, §5 new-app list.
```

---

*Living file — bump **Last verified** whenever you open the Angular blog.*
