# OneTrust — MVC vs MVVM (what Angular / NUX actually uses)

**One file for:** “What is MVC?” · “What is MVVM?” · “Which one does Angular use?” · “What do you use in NUX?”

**Source of truth:** Angular component architecture as used in `cloud-front-end` / `dashboard` (standalone components, templates, injectable services).  
**Do not say** folder names like Ternary. Don’t claim we run a Java Spring MVC controller in the browser.

---

## 0. 30s opener (say this first)

> **MVC** is Model–View–**Controller**: the controller takes user input, mutates the model, and picks/updates the view. Classic web: a server controller returns HTML.  
> **MVVM** is Model–View–**ViewModel**: the view is **declarative** and **bound** to a ViewModel. User clicks update the ViewModel; the ViewModel updates the Model; bindings refresh the view. You don’t write “find this DOM node and set innerText.”  
> **Angular 2+ is closer to MVVM**, not classic MVC. The **template** is the View, the **component class** is the ViewModel, **services / APIs / stores** are the Model. Angular also gives you **DI**, **router**, **change detection** — that’s more than a textbook diagram.  
> On **IDMS NUX** we don’t have a separate “Controller.ts”. A feature is `groups.html` + `groups.ts` + `groups-api.ts`. That’s **MVVM-shaped**: template binds to signals on the component; the component calls injected APIs.

If they push “Angular is MVC”:

> AngularJS 1 had **controllers + `$scope`** and people called it MVC. **Angular 2+ dropped that.** Officially it’s a **component** framework. Mapping it to MVVM is the honest senior answer.

---

## 1. MVC (Model–View–Controller)

```text
  User click / HTTP request
           │
           ▼
     ┌─────────────┐
     │ Controller  │  ──►  decides what to do
     └──────┬──────┘
            │ updates
            ▼
     ┌─────────────┐
     │    Model    │  data, rules, API
     └──────┬──────┘
            │ controller also
            │ chooses / pushes
            ▼
     ┌─────────────┐
     │    View     │  what the user sees
     └─────────────┘
```

| Piece | Job | Classic example |
|---|---|---|
| **Model** | State + business rules + persistence | User entity, DB, REST payload |
| **View** | Display only. Should not talk to the DB | HTML / JSP / Blade / Razor |
| **Controller** | Glue. Input → Model. Then refresh or select View | Spring `@Controller`, Rails controller, ASP.NET MVC |

**Flow:** View is often **passive**. Controller **imperatively** updates it (“set this label”). Tight coupling: controller knows the view.

**Good for:** server-rendered pages, simple request/response.

**Pain in SPA:** lots of DOM code in the controller; hard to test UI logic without a browser.

---

## 2. MVVM (Model–View–ViewModel)

```text
  User click
       │  binding (event)
       ▼
┌──────────────┐     calls      ┌─────────┐
│     View     │◄──────────────►│  Model  │
│  (template)  │   via VM only  │ (data)  │
└──────▲───────┘                └────▲────┘
       │ binding (state)             │
       │                             │
       └──────────► ViewModel ◄──────┘
                    (component class)
                    properties + commands
```

| Piece | Job | In Angular |
|---|---|---|
| **Model** | Data + APIs + domain. No HTML | `GroupsApi`, `HttpClient`, models, kernel stores |
| **View** | Markup + bindings. No HTTP | `groups.html` — `{{ }}`, `[ngModel]`, `(click)`, `@if` |
| **ViewModel** | **State the view can bind to** + **commands** (methods) | `groups.ts` — `signal()`, `computed()`, methods like `saveGroup()` |

**The idea:** the ViewModel **does not** grab `document.getElementById`. The View **declares** “show `treeSearchText()` here.” When the signal changes, Angular CD / signals update the DOM.

**Two-way binding** (`[(ngModel)]`, signal + `ngModelChange`) is the MVVM trademark. MVC controllers usually don’t auto-sync both ways.

**MVP** (sometimes asked): Presenter talks to a **View interface**. Angular templates aren’t that; skip unless they name it.

---

## 3. Angular mapping (whiteboard)

```text
  groups.html          →  VIEW
  groups.ts            →  VIEWMODEL  (component)
  GroupsApi / models   →  MODEL
  inject(...)          →  how VM gets Model (DI)
```

Tiny example (same shape as NUX Groups search):

```ts
// VIEWMODEL — component class
@Component({
  selector: 'app-groups',
  templateUrl: './groups.html',
  changeDetection: ChangeDetectionStrategy.OnPush,
  providers: [GroupsApi],
})
export class Groups {
  private readonly api = inject(GroupsApi); // Model

  treeSearchText = signal('');              // state for the View
  groups = signal<TenantGroup[]>([]);

  async load(): Promise<void> {
    this.groups.set(await this.api.list());
  }

  onSearch(q: string): void {
    this.treeSearchText.set(q);             // command from the View
  }
}
```

```html
<!-- VIEW — no HttpClient here -->
<input
  [ngModel]="treeSearchText()"
  (ngModelChange)="treeSearchText.set($event)"
/>
@for (g of groups(); track g.id) {
  <span>{{ g.name }}</span>
}
```

```ts
// MODEL — Injectable, HTTP, no template
@Injectable()
export class GroupsApi {
  private readonly http = inject(HttpClient);
  list() { return firstValueFrom(this.http.get<TenantGroup[]>('/groups')); }
}
```

**Why this is MVVM, not MVC:**

- The template **binds** to `treeSearchText()` — Controller would have done `input.value = …`.
- The class exposes **state + methods**, not “render HTML string.”
- HTTP lives in **`GroupsApi`**, not in the `.html`.

**What Angular adds on top of MVVM:**

- **Change detection** (Default / OnPush) and **signals** — when the VM changes, the View updates.
- **DI** — ViewModel doesn’t `new GroupsApi()`.
- **Router** — which component (VM+View) is on screen.
- **Pipes** (`| t` i18n) — View-side formatters, still not Model.

---

## 4. What NUX / IDMS actually uses

We **do not** have a repo doc titled “we chose MVVM.” We use **Angular’s component architecture**, which **maps to MVVM**.

| NUX file (example: Groups) | Role |
|---|---|
| `groups.html` | View — PrimeNG table, `data-testid`, `[ngModel]`, `@if` |
| `groups.ts` | ViewModel — `signal` / `computed` / `effect`, `OnPush`, `inject(...)` |
| `groups-api.ts` | Model — `HttpClient`, RxJS, tenant scope |
| `groups.models.ts` | Model types |
| `groups-*.utils.ts` | Pure Model/helpers — easy unit tests |
| `UserContextService`, `PermissionsService` | Shared Model (auth / tenant) |
| Kernel (`AuthService`, `TenantStore`, `KernelStore`) | Cross-MFE Model — still not a Controller |

**Patterns you’ll see:**

- **Standalone** `@Component` + `templateUrl` + `styleUrl`.
- **OnPush** — ViewModel must use **immutable updates / signals**, not mutate nested objects silently.
- **Feature folder** = one screen’s View + VM + API, not a global `controllers/` folder.
- Some screens have extra **\*Store** / **\*DataService** — still **Model** (or a second ViewModel if it only holds UI state). Don’t call that MVC.

**Not what we use:**

- AngularJS 1 `$scope` + `ng-controller`
- Server MVC returning NUX HTML
- A dedicated `GroupsController` class that paints the DOM

**Spoken 20s for “what architecture in your Angular app?”**

> Component-based, **MVVM-style**. Template is the view, component class is the view-model with signals, services are the model. Features like Groups keep HTTP in `GroupsApi` so the template stays declarative. Shared session lives in auth services / kernel, not in every component.

---

## 5. MVC vs MVVM vs “what Angular is” (trap table)

| Question | Weak answer | Strong answer |
|---|---|---|
| Angular is MVC? | Yes | **AngularJS ~MVC. Angular 2+ ≈ MVVM / components.** |
| Where is the controller? | `app.component.ts` | We don’t have one. **Component class = ViewModel.** |
| Is the service the controller? | Yes | **Service = Model** (data). Controller would orchestrate the View. |
| Two-way binding? | MVC | **MVVM.** `[(ngModel)]` / signal + `ngModelChange`. |
| Why not put HTTP in the component? | Style | Keeps **Model** testable; ViewModel stays UI state + orchestration. Fat components = leaked Model. |

**Fat ViewModel (anti-pattern we try to avoid):** 2000-line `groups.ts` that also parses HTTP errors, builds trees, and talks to five APIs. Interview: “I’d pull more into `utils` + `*Api` — same MVVM, thinner VM.”

---

## 6. Q bank (say out loud)

**Q: Difference MVC vs MVVM in one sentence?**  
MVC: controller **pushes** the view. MVVM: view **binds** to a ViewModel.

**Q: What do we use in Angular?**  
MVVM mapping: template / component / services. Plus Angular runtime (CD, DI, router).

**Q: Is React MVVM?**  
React is **View + state** (often Flux/Redux). Not MVC. Hooks/components ≈ ViewModel if you’re mapping, but don’t force it.

**Q: Where does NgRx fit?**  
**Model** (or a global Model). Components stay ViewModels that `select` / `dispatch`. NUX Groups is **service + signals**, not a global NgRx store for that page.

**Q: Draw it.**  
Three boxes: View (html) ↔ ViewModel (ts) ↔ Model (api). Arrows: events down, bindings up, HTTP only from Model.

---

## 7. Don’t mix with other OneTrust topics

- **MFE / kernel** = how apps share the Model (auth), not a fourth MVC letter. See `ONETRUST_MFE_SENIOR_ROUND.md`.
- **DI** = how the ViewModel gets the Model. See `ONETRUST_ANGULAR_DI_PROVIDERS.md`.
- **Tests** = unit-test the Model (`GroupsApi`, utils) and ViewModel methods; Playwright hits the View. See `ONETRUST_TESTING_JEST_E2E.md`.
