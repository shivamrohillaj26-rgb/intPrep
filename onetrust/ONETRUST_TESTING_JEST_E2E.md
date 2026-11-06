# OneTrust — NUX testing (unit + E2E) + kernel

**One file for:** “What test framework?” · “Write a test” · “How do you do E2E?” · “What’s the kernel?”

**Source of truth:** `cloud-front-end` (NUX dashboard), plus MFE kernel in the conversion workspace.  
**Do not say** folder names like Ternary / POC.

---

## 0. 45s opener (say this first)

> On **IDMS NUX** (`cloud-front-end` / `dashboard`), **unit tests** are Angular **`ng test`** — builder `@angular/build:unit-test`. Specs are `describe` / `it` / `expect`, mocks with **`vi.fn()`** — that’s **Vitest**, not a Jest CLI. A slice also runs **`vitest run`** (integrations). **E2E / UI / visual** is **Playwright** under **Leica** (`leica/engines/visual`) — real Chromium, `data-testid`, login/recovery, provisioning, alerts. There’s also a **platform Playwright** suite for IDMS (smoke/regression).  
> **Kernel** is the **shared MFE library**: auth, tenant, `KernelStore` — **one singleton** in the tab so remotes don’t each log in.  
> If they say “write it in Jest”: same test shape; I’d swap `vi.fn()` → `jest.fn()`.

---

## 1. What we actually use (don’t guess Jest)

| Layer | Tool | Where | Command |
|---|---|---|---|
| Unit (dashboard) | Angular **unit-test** builder + **Vitest** API | `dashboard/**/*.spec.ts` | `cd dashboard && npm test` (`ng test`) |
| Unit (one feature) | **Vitest** directly | e.g. integrations | `npm run test:integrations` |
| UI / E2E / screenshots | **Playwright** | `leica/engines/visual/tests/*.ui.spec.ts` | `dashboard:test:*` / `npx playwright test` |
| Platform E2E | **Playwright** | `cloud/automation/playwrightautomation` | smoke `@smoke`, regression |

**Not the main unit runner:** Jest CLI, Karma, Cypress, Protractor.

**Why people say Jest:** `describe` / `it` / `expect` look identical. **Jest** = Facebook’s runner (`jest.fn()`). **Vitest** = Vite-era runner (`vi.fn()`), Jest-compatible API. **Jasmine** = classic Angular + Karma. Our **new** Angular 21 specs use **`vi.fn()`** (Vitest). Some older specs still use `jasmine.clock()`.

**If they insist “you use Jest”:**

> The **language** of the tests is Jest-like. The **process** is `ng test` / Vitest. I can write Jest on a whiteboard in 2 minutes.

---

## 2. What is Jest? (and how it maps)

**Jest** is a **JavaScript test runner**: finds `*.spec.ts` / `*.test.ts`, runs `describe`/`it`, asserts with `expect`, mocks with `jest.fn()` / `jest.mock()`. Fast, isolated, good for Node + jsdom.

| Jest | Vitest (what NUX specs use) | Meaning |
|---|---|---|
| `describe` / `it` | same | suite / case |
| `expect(x).toBe(1)` | same | assert |
| `beforeEach` | same | setup |
| `jest.fn()` | `vi.fn()` | spy / mock function |
| `jest.spyOn` | `vi.spyOn` | spy on method |

**Pyramid (always say this):**

```text
        few E2E     Playwright — real browser, slow
       more UI      Playwright visual / flows
    many unit      ng test / Vitest — functions, validators, TestBed
```

---

## 3. What is the kernel? (MFE — say this here)

**Kernel** is **not** the OS. It is our **shared Angular library** (`@nux-mfe/kernel` / `@idms/kernel` in interview). Host + every remote **import the same singleton**.

| Piece | Job |
|---|---|
| `AuthService` / `authGuard` | Login, session, route guard |
| `TenantStore` | Current fleet/tenant |
| `KernelStore` | Cross-remote bits (e.g. `selectedDeviceId`) |
| `provideKernel()` | Wire it in `app.config` **once** |

**Rules:** remotes **do not** import each other. They talk to **kernel + APIs**. Two copies of kernel = two logins = broken. Federation `shareAll({ singleton: true })`.

**Prod today:** one NUX dashboard zip. **Conversion:** host + kernel + remotes on test CDN. Kernel is a **lib**, not a website — version bump, consumers rebuild.

---

## 4. Write unit tests (whiteboard)

Same structure for **Jest or Vitest**. Annotate the mock.

### A — Pure function (validators — we have lots of these)

```ts
// Jest: jest.fn()   Vitest: vi.fn()   — assertions identical

describe('emailRequired', () => {
  function emailRequired(useMobile: boolean, email: string): boolean {
    if (!useMobile) return true;
    return email.trim().length === 0;
  }

  it('requires email when mobile app is off', () => {
    expect(emailRequired(false, '')).toBe(true);
  });

  it('does not require email when mobile is on and email empty (label-only case)', () => {
    expect(emailRequired(true, '')).toBe(true);
  });
});
```

Real NUX style: `manage-driver-accounts-form-validators.spec.ts` — `FormGroup` + `expect(form.get('email')?.hasError('required'))`.

### B — Service with HTTP (TestBed) — they often ask this

```ts
import { TestBed } from '@angular/core/testing';
import { provideHttpClient } from '@angular/common/http';
import { HttpTestingController, provideHttpClientTesting } from '@angular/common/http/testing';

describe('AlertsService', () => {
  let http: HttpTestingController;
  let svc: AlertsService;

  beforeEach(() => {
    TestBed.configureTestingModule({
      providers: [
        AlertsService,
        provideHttpClient(),
        provideHttpClientTesting(),
      ],
    });
    svc = TestBed.inject(AlertsService);
    http = TestBed.inject(HttpTestingController);
  });

  afterEach(() => http.verify()); // no leftover calls

  it('GET /alerts maps the list', () => {
    let result: string[] | undefined;
    svc.load().subscribe((rows) => (result = rows));

    const req = http.expectOne('/api/alerts');
    expect(req.request.method).toBe('GET');
    req.flush({ data: [{ id: '1' }] });

    expect(result).toEqual(['1']);
  });
});
```

**Say:** “I don’t hit a real API. `HttpTestingController` captures the request. `flush` is the fake response.”

### C — Component + mock (NUX uses `vi.fn()`)

```ts
const i18n = { translateInstant: vi.fn((k: string) => k) }; // Jest: jest.fn()

beforeEach(async () => {
  await TestBed.configureTestingModule({
    imports: [MyWidget],
    providers: [{ provide: I18nService, useValue: i18n }],
  }).compileComponents();
});

it('renders the title', () => {
  const fixture = TestBed.createComponent(MyWidget);
  fixture.detectChanges();
  expect(fixture.nativeElement.textContent).toContain('TITLE_KEY');
});
```

**Checklist when they say “write tests”:** happy path · empty · error · one mock · `afterEach` verify HTTP.

---

## 5. E2E — how we do it (good answer)

**Spoken 40s:**

> Unit tests don’t prove login or a driver form in a real browser. For that we use **Playwright**. Specs live in **Leica visual** — `*.ui.spec.ts`. They hit the dashboard through the **local proxy** (`localhost:8080` → `/app`) or a QA URL. We use **`data-testid`** (example: `auth-login-username-input`), seed **localStorage** for stale auth, **`page.route`** to mock REST when we don’t want a live backend. Projects: Chromium desktop / tablet / **mobile**. Failures get screenshot, trace, sometimes video. That’s how we certified login unauthorized recovery (IDMS-51237), provisioning drivers, alerts player, etc.  
> Separately, QA has a **Playwright automation** repo for IDMS smoke/regression against environments. I don’t duplicate every flow in unit tests — E2E is **critical paths**; units are **logic**.

**What Playwright is:** Node drives a real Chromium. `test()` + `expect(locator).toBeVisible()`. Not jsdom.

**Tiny E2E they might ask you to write:**

```ts
import { test, expect } from '@playwright/test';

test('login shows username field', async ({ page }) => {
  await page.goto('/app/#/login');
  await expect(page.getByTestId('auth-login-username-input')).toBeVisible();
});
```

**NUX extras (name if they probe):** visual snapshots (`toHaveScreenshot`), headed review, sitewide cert across viewports, `PLAYWRIGHT_SKIP_WEBSERVER=1` when the app is already up.

**Don’t say:** “We only use Jest for E2E.” Jest is not a browser driver.

---

## 6. How I’d test the **kernel** (if they connect MFE + tests)

| Kernel bit | Unit | E2E |
|---|---|---|
| `authGuard` | `TestBed` + fake `AuthService` logged in/out | Playwright: hit `#/devices` without token → login |
| `TenantStore` | set tenant → signal/value | Playwright: tenant switcher |
| `KernelStore.selectedDeviceId` | set in devices remote test double → safety reads it | Optional: two routes same tab |

Kernel tests are **unit-first** (fast). E2E proves **one session** across remotes once conversion is on a test CDN.

---

## 7. Q bank

**Q: Jest or Jasmine?**  
> Specs look like Jest/Jasmine. Runner is Angular **unit-test / Vitest**. I write `describe`/`it`/`expect`. Mocks: `vi.fn()` here, `jest.fn()` if your repo is Jest.

**Q: Why not only E2E?**  
> Slow, flaky, expensive. Validators and HTTP mapping belong in unit tests.

**Q: How do you mock HTTP?**  
> `provideHttpClientTesting` + `HttpTestingController`.

**Q: Cypress?**  
> Not what NUX uses. We standardized on Playwright.

**Q: Coverage?**  
> Units on logic we own; Playwright on user journeys we broke before (auth recovery, drivers, alerts).

---

## 8. Cheat card

```text
UNIT     ng test  →  @angular/build:unit-test  →  Vitest (vi.fn)
SLICE    vitest run  (integrations)
E2E/UI   Playwright  leica/engines/visual  +  IDMS playwrightautomation
JEST     same DSL; not our CLI
KERNEL   shared auth/tenant/store singleton — not the OS
WRITE    describe/it/expect + TestBed + HttpTestingController
E2E WRITE  page.goto + getByTestId + expect visible
```

Deeper Angular TestBed: [../angular-interview-prep/UNIT_TESTING.md](../angular-interview-prep/UNIT_TESTING.md).  
MFE kernel architecture: [ONETRUST_MFE_SENIOR_ROUND.md](./ONETRUST_MFE_SENIOR_ROUND.md).
