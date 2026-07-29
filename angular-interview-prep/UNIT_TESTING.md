# Unit Testing — Interview Ready Guide (Jest · Jasmine · Karma · Angular)

Deep guide for frontend interviews. Focus: **Jest** (what you use day-to-day) + **Jasmine / Karma** (classic Angular default) + **Angular TestBed** patterns that interviewers expect.

---

## 1. What Unit Testing Really Means

A **unit test** verifies one small piece of logic in isolation:

- a pure function
- a service method
- a pipe
- a component’s behavior (with children/services mocked)

Interview one-liner:

> Unit tests prove that a single unit behaves correctly when its dependencies are controlled (mocked/stubbed), so failures point to that unit — not the whole app.

### Testing pyramid (say this in interviews)

```
        /\
       /E2E\          few, slow, real browser/user flows
      /------\
     /Integr. \       some, services + HTTP + a few components together
    /----------\
   / Unit tests \     many, fast, isolated
  /--------------\
```

| Type | Scope | Speed | Example |
|---|---|---|---|
| Unit | One function/class | Fastest | `formatDate()` returns correct string |
| Integration | Few units wired | Medium | Component + mocked HTTP |
| E2E | Full app in browser | Slowest | Login → dashboard with Playwright/Cypress |

**Rule of thumb:** many unit tests, fewer integration, few E2E.

---

## 2. The Three Layers People Confuse

Interviewers love this distinction:

| Layer | Role | Examples |
|---|---|---|
| **Test framework** | API to write tests + assertions + spies | Jasmine, Jest, Vitest |
| **Test runner** | Finds files, runs them, reports results | Karma, Jest (built-in), Vitest |
| **Environment** | Where DOM/JS executes | Real Chrome (Karma), jsdom (Jest) |

### Classic Angular stack (older / many enterprise apps)

```
Jasmine  = framework (describe / it / expect / spyOn)
Karma    = runner (launches real browser, watches files)
TestBed  = Angular’s DI + component harness (same with Jest)
```

### Modern common stack (what many teams use now)

```
Jest     = framework + runner + mocker + coverage (all-in-one)
jsdom    = fake browser DOM in Node
TestBed  = still Angular’s testing utility
```

### Angular direction (know for 2025–2026 interviews)

- Karma is **legacy / being phased out** of Angular tooling.
- Teams migrate to **Jest** or increasingly **Vitest**.
- Concepts stay the same: `describe` / `it` / `expect` / spies / TestBed.

---

## 3. Jasmine — Deep Explanation

**Jasmine** is a BDD (Behavior-Driven Development) testing framework.  
It does **not** launch browsers by itself — it only gives you the language of tests.

### Core API

```ts
describe('CartService', () => {
  // suite = group of related specs

  beforeEach(() => {
    // runs before EVERY it()
  });

  afterEach(() => {
    // cleanup after EVERY it()
  });

  it('should add an item and increase total', () => {
    // one spec / one behavior
    expect(total).toBe(100);
  });

  xit('skipped test', () => {}); // disabled
  fit('focused test', () => {}); // run only this (debug)
});
```

### Matchers (assertions)

```ts
expect(2 + 2).toBe(4);                 // === for primitives
expect({ a: 1 }).toEqual({ a: 1 });    // deep equality
expect(list).toContain(3);
expect(fn).toThrow();
expect(value).toBeTruthy();
expect(value).toBeNull();
expect(value).toBeUndefined();
expect(spy).toHaveBeenCalled();
expect(spy).toHaveBeenCalledWith(42);
```

**`toBe` vs `toEqual` (classic trap):**

```ts
expect(1).toBe(1);                       // OK
expect({ x: 1 }).toBe({ x: 1 });         // FAIL — different object refs
expect({ x: 1 }).toEqual({ x: 1 });      // OK — deep compare
```

### Spies (Jasmine’s mocking)

A **spy** wraps a function so you can:

1. track whether it was called
2. track arguments
3. optionally fake the return value

```ts
const api = {
  fetchUser: () => ({ id: 1, name: 'Ada' }),
};

spyOn(api, 'fetchUser').and.returnValue({ id: 2, name: 'Grace' });

const user = api.fetchUser();
expect(api.fetchUser).toHaveBeenCalled();
expect(user.name).toBe('Grace');
```

Common Jasmine spy patterns:

```ts
spyOn(svc, 'save').and.callThrough();          // real impl still runs
spyOn(svc, 'save').and.returnValue(true);      // stub return
spyOn(svc, 'save').and.callFake((x) => x * 2); // custom fake
spyOn(svc, 'save').and.throwError('boom');
spyOn(svc, 'save').and.resolveTo({ ok: true }); // promise resolve
spyOn(svc, 'save').and.rejectWith('fail');

const spy = jasmine.createSpy('logger');
const obj = jasmine.createSpyObj('UserService', ['get', 'save']);
obj.get.and.returnValue({ id: 1 });
```

### Async in Jasmine

```ts
it('waits for promise (modern)', async () => {
  const data = await service.load();
  expect(data).toEqual([1, 2]);
});

it('uses done callback (older style)', (done) => {
  service.load().then((data) => {
    expect(data.length).toBe(2);
    done();
  });
});
```

---

## 4. Karma — Deep Explanation

**Karma** is a **test runner**, not a framework.

What it does:

1. Starts a web server
2. Launches real browsers (Chrome, Firefox, …)
3. Loads your bundled specs into that browser
4. Executes Jasmine (or Mocha) there
5. Streams results back to the terminal
6. Watches files and re-runs (watch mode)

```
Terminal ──► Karma ──► Chrome / Firefox
                │
                └── runs Jasmine specs inside the browser
```

### Why Angular used Karma historically

Angular apps run in browsers. Karma answered:

> “Run unit tests in a **real** browser so DOM / Zone / change detection behave like production.”

### Karma config (conceptual)

```js
// karma.conf.js (simplified mental model)
module.exports = function (config) {
  config.set({
    frameworks: ['jasmine', '@angular-devkit/build-angular'],
    browsers: ['Chrome'],
    reporters: ['progress', 'coverage'],
    singleRun: false, // watch mode
  });
};
```

### Pros / cons (interview answer)

| Pros | Cons |
|---|---|
| Real browser fidelity | Slow (browser startup) |
| Debug with DevTools | Heavier CI setup |
| Official Angular CLI default for years | Extra tools for mocks/snapshots |
| Catches some browser-only bugs | Karma ecosystem aging; teams moving off |

**Interview one-liner:**

> Karma runs tests in real browsers; Jasmine is the assertion/spy language those tests are written in. Together they were Angular’s default unit-testing stack.

---

## 5. Jest — Deep Explanation (Your Daily Tool)

**Jest** is an all-in-one toolkit from Meta (Facebook):

| Built-in | What it replaces |
|---|---|
| Test runner | Karma |
| Framework API | Jasmine-like `describe`/`it`/`expect` |
| Mocking | `jest.fn`, `jest.spyOn`, auto-mocks |
| Fake timers | `jest.useFakeTimers` |
| Snapshot testing | extra libs in Jasmine |
| Coverage | Istanbul/nyc setup |
| Parallel workers | often custom with Karma |

### Where Jest runs

```
Node.js process
   └── jsdom (fake window/document)
         └── your component / DOM assertions
```

**Not a real browser.** No layout/paint. Fine for ~95% of unit/component tests.  
Layout / visual / cross-browser → Playwright/Cypress E2E.

### Basic Jest anatomy

```ts
describe('sum', () => {
  test('adds two numbers', () => {   // test === it
    expect(sum(2, 3)).toBe(5);
  });
});
```

### Matchers you must know

```ts
expect(value).toBe(3);
expect(obj).toEqual({ a: 1 });
expect(obj).toStrictEqual({ a: 1 }); // stricter (no undefined props mismatch)
expect(arr).toContain(2);
expect(str).toMatch(/hello/i);
expect(fn).toThrow('error');
expect(n).toBeCloseTo(0.3);          // floats
expect(promise).resolves.toBe(1);
expect(promise).rejects.toThrow();
```

### Mocking in Jest (most asked)

#### 1) `jest.fn()` — create a mock function

```ts
const onSave = jest.fn();
onSave({ id: 1 });

expect(onSave).toHaveBeenCalledTimes(1);
expect(onSave).toHaveBeenCalledWith({ id: 1 });
expect(onSave.mock.calls[0][0]).toEqual({ id: 1 });
```

#### 2) `jest.spyOn` — spy on existing method

```ts
const math = { add: (a: number, b: number) => a + b };
const spy = jest.spyOn(math, 'add').mockReturnValue(99);

expect(math.add(1, 2)).toBe(99);
expect(spy).toHaveBeenCalledWith(1, 2);

spy.mockRestore(); // put original back
```

#### 3) Mock return / resolve / reject

```ts
const getUser = jest.fn()
  .mockReturnValue({ id: 1 })                 // sync
  .mockResolvedValue({ id: 1 })               // Promise resolve
  .mockRejectedValue(new Error('network'));   // Promise reject
```

#### 4) Module mock

```ts
// __mocks__/api.ts or inline:
jest.mock('./api', () => ({
  fetchUsers: jest.fn().mockResolvedValue([{ id: 1 }]),
}));
```

#### 5) Partial mock + `jest.requireActual`

```ts
jest.mock('./utils', () => ({
  ...jest.requireActual('./utils'),
  heavyFn: jest.fn(() => 'stub'),
}));
```

### Fake timers (debounce / throttle interviews)

```ts
jest.useFakeTimers();

const fn = jest.fn();
const debounced = debounce(fn, 300);

debounced('a');
debounced('ab');
expect(fn).not.toHaveBeenCalled();

jest.advanceTimersByTime(300);
expect(fn).toHaveBeenCalledWith('ab');

jest.useRealTimers();
```

### Snapshot testing

```ts
expect(renderTree).toMatchSnapshot();
// First run writes snapshot file; later runs compare.
// Good for stable UI trees; brittle if overused.
```

### Jest config mental model

```js
// jest.config.js (simplified)
module.exports = {
  testEnvironment: 'jsdom',
  setupFilesAfterEnv: ['<rootDir>/setup-jest.ts'],
  collectCoverageFrom: ['src/**/*.{ts,tsx}'],
  moduleNameMapper: {
    '^@app/(.*)$': '<rootDir>/src/app/$1',
  },
};
```

### AAA pattern (how seniors write tests)

```ts
it('increments count when button clicked', () => {
  // Arrange — setup
  const { getByRole } = render(<Counter />);

  // Act — do the thing
  fireEvent.click(getByRole('button', { name: /inc/i }));

  // Assert — check outcome
  expect(getByRole('status')).toHaveTextContent('1');
});
```

---

## 6. Jest vs Jasmine vs Karma — Comparison Table

| Topic | Jasmine | Karma | Jest |
|---|---|---|---|
| What it is | Framework | Runner | Framework + runner |
| Browser | Needs Karma/browser | Real browser | jsdom (Node) |
| Speed | Depends on runner | Slower | Usually much faster |
| Spies | `spyOn`, `createSpyObj` | n/a | `jest.fn`, `jest.spyOn` |
| Snapshots | Not built-in | n/a | Built-in |
| Mock modules | Manual / helpers | n/a | `jest.mock` excellent |
| Angular default (classic) | Yes | Yes | No (popular alternative) |
| Parallelism | Via runner config | Limited historically | Worker processes |
| Watch mode | Via Karma | Yes | Excellent (`jest --watch`) |

### Syntax mapping (migrate Jasmine → Jest)

| Jasmine | Jest |
|---|---|
| `it` / `describe` | same (`test` also ok) |
| `expect(...).toBe` | same |
| `spyOn(o, 'm').and.returnValue(x)` | `jest.spyOn(o, 'm').mockReturnValue(x)` |
| `jasmine.createSpy('name')` | `jest.fn()` |
| `jasmine.createSpyObj('S', ['a','b'])` | `{ a: jest.fn(), b: jest.fn() }` |
| `.and.resolveTo(v)` | `.mockResolvedValue(v)` |
| `.and.rejectWith(e)` | `.mockRejectedValue(e)` |
| `jasmine.clock` | `jest.useFakeTimers()` |
| `beforeAll` / `afterAll` | same |

**Interview soundbite:**

> Jasmine writes the tests; Karma runs them in a real browser. Jest does both in Node with jsdom — faster feedback, great mocks, slightly less browser fidelity.

---

## 7. Pure JS Unit Test Examples (Jest)

### Example A — pure function (easiest, always start here)

```ts
// tax.ts
export function calcTax(amount: number, rate = 0.18): number {
  if (amount < 0) throw new Error('amount must be >= 0');
  return Number((amount * rate).toFixed(2));
}
```

```ts
// tax.spec.ts
import { calcTax } from './tax';

describe('calcTax', () => {
  it('computes 18% tax by default', () => {
    expect(calcTax(100)).toBe(18);
  });

  it('supports custom rate', () => {
    expect(calcTax(200, 0.1)).toBe(20);
  });

  it('rejects negative amount', () => {
    expect(() => calcTax(-1)).toThrow('amount must be >= 0');
  });
});
```

### Example B — class with dependency (mock collaborator)

```ts
// user.service.ts
export class UserService {
  constructor(private http: { get: (url: string) => Promise<any> }) {}

  async getDisplayName(id: string): Promise<string> {
    const user = await this.http.get(`/users/${id}`);
    return `${user.first} ${user.last}`.trim();
  }
}
```

```ts
// user.service.spec.ts
describe('UserService', () => {
  it('builds display name from API user', async () => {
    const http = {
      get: jest.fn().mockResolvedValue({ first: 'Ada', last: 'Lovelace' }),
    };
    const svc = new UserService(http);

    await expect(svc.getDisplayName('9')).resolves.toBe('Ada Lovelace');
    expect(http.get).toHaveBeenCalledWith('/users/9');
  });
});
```

**Why this is a good unit test:**  
`UserService` is under test; HTTP is a **stub**. No network. Failure means service logic broke.

### Example C — debounce (fake timers)

```ts
export function debounce<T extends (...args: any[]) => void>(fn: T, wait: number) {
  let t: ReturnType<typeof setTimeout> | undefined;
  return (...args: Parameters<T>) => {
    clearTimeout(t);
    t = setTimeout(() => fn(...args), wait);
  };
}
```

```ts
describe('debounce', () => {
  beforeEach(() => jest.useFakeTimers());
  afterEach(() => jest.useRealTimers());

  it('calls fn once after quiet period', () => {
    const fn = jest.fn();
    const d = debounce(fn, 200);

    d('a');
    d('ab');
    d('abc');
    expect(fn).not.toHaveBeenCalled();

    jest.advanceTimersByTime(200);
    expect(fn).toHaveBeenCalledTimes(1);
    expect(fn).toHaveBeenCalledWith('abc');
  });
});
```

---

## 8. Angular Unit Testing — TestBed Deep Dive

Angular apps need **DI + templates + change detection**.  
That’s why Angular gives you **`TestBed`** — a testing module that wires a mini Angular app for one test.

### Mental model

```
TestBed.configureTestingModule({ ... })
        │
        ├── creates testing NgModule / providers
        ├── compiles components (template → view)
        └── lets you create ComponentFixture / inject services
```

### Service test (preferred: often no TestBed needed)

If the service is a plain class, **construct it yourself**:

```ts
describe('AuthService', () => {
  it('stores token after login', () => {
    const http = { post: jest.fn().mockReturnValue(of({ token: 'abc' })) } as any;
    const svc = new AuthService(http);

    svc.login('u', 'p').subscribe();
    expect(svc.token).toBe('abc');
  });
});
```

Use TestBed when you want Angular’s injector / providedIn / interceptors:

```ts
TestBed.configureTestingModule({
  providers: [
    AuthService,
    { provide: HttpClient, useValue: httpMock },
  ],
});
const svc = TestBed.inject(AuthService);
```

### Component test skeleton (Jest style)

```ts
import { ComponentFixture, TestBed } from '@angular/core/testing';
import { CounterComponent } from './counter.component';

describe('CounterComponent', () => {
  let fixture: ComponentFixture<CounterComponent>;
  let component: CounterComponent;

  beforeEach(async () => {
    await TestBed.configureTestingModule({
      imports: [CounterComponent], // standalone
    }).compileComponents();

    fixture = TestBed.createComponent(CounterComponent);
    component = fixture.componentInstance;
    fixture.detectChanges(); // run CD → update DOM
  });

  it('renders initial count 0', () => {
    const el: HTMLElement = fixture.nativeElement;
    expect(el.textContent).toContain('0');
  });

  it('increments on button click', () => {
    const btn = fixture.nativeElement.querySelector('button') as HTMLButtonElement;
    btn.click();
    fixture.detectChanges();
    expect(fixture.nativeElement.textContent).toContain('1');
  });
});
```

### Why `fixture.detectChanges()` is mandatory

Angular does **not** auto-run change detection between your test lines the way the browser zone might in the app.

```
set component.count = 5   →  model changed
detectChanges()           →  template updates
query DOM                 →  see "5"
```

Forget `detectChanges()` → DOM still shows old value → flaky/wrong test.

### `ComponentFixture` cheat sheet

| API | Meaning |
|---|---|
| `fixture.componentInstance` | TS class instance |
| `fixture.nativeElement` | host DOM element |
| `fixture.debugElement` | Angular wrapper (query by directive) |
| `fixture.detectChanges()` | run change detection |
| `fixture.whenStable()` | wait for async tasks (promises, etc.) |

### Mocking a service in Angular (Jest)

```ts
const userServiceMock = {
  getUser: jest.fn().mockReturnValue(of({ name: 'Ada' })),
};

await TestBed.configureTestingModule({
  imports: [ProfileComponent],
  providers: [{ provide: UserService, useValue: userServiceMock }],
}).compileComponents();
```

Jasmine equivalent:

```ts
const userServiceMock = jasmine.createSpyObj('UserService', ['getUser']);
userServiceMock.getUser.and.returnValue(of({ name: 'Ada' }));
```

### HTTP testing with `HttpClientTestingModule`

```ts
import { HttpClientTestingModule, HttpTestingController } from '@angular/common/http/testing';

let httpMock: HttpTestingController;

beforeEach(() => {
  TestBed.configureTestingModule({
    imports: [HttpClientTestingModule],
    providers: [UserApi],
  });
  httpMock = TestBed.inject(HttpTestingController);
});

afterEach(() => httpMock.verify()); // no leftover requests

it('GETs /users', () => {
  const api = TestBed.inject(UserApi);
  let result: any;

  api.list().subscribe((r) => (result = r));

  const req = httpMock.expectOne('/users');
  expect(req.request.method).toBe('GET');
  req.flush([{ id: 1 }]);

  expect(result).toEqual([{ id: 1 }]);
});
```

**Interview point:** `HttpTestingController` never hits the network. You assert the request and **flush** a fake response.

### Async helpers in Angular

| Helper | Use when |
|---|---|
| `async/await` + `fixture.whenStable()` | Promises / microtasks |
| `fakeAsync` + `tick()` | Control time (timers) with Zone |
| `waitForAsync` | Older Angular async wrapper |
| Jest fake timers | Debounce etc. outside Zone-heavy paths |

```ts
it('loads users', fakeAsync(() => {
  component.ngOnInit();
  tick();                 // flush timers/microtasks Zone knows about
  fixture.detectChanges();
  expect(component.users.length).toBe(2);
}));
```

> Note: zoneless Angular / some Jest setups prefer `async/await` + `whenStable` over `fakeAsync`. Mention both in interviews.

### Pipe test (simple — no TestBed)

```ts
describe('TruncatePipe', () => {
  const pipe = new TruncatePipe();

  it('truncates long text', () => {
    expect(pipe.transform('hello world', 5)).toBe('hello…');
  });
});
```

### Shallow vs deep component testing

| Style | How | When |
|---|---|---|
| **Shallow** | Stub/mock child components | Default — isolate unit |
| **Deep** | Real children render | Rare — interaction matters |

```ts
// shallow: replace child
TestBed.configureTestingModule({
  imports: [ParentComponent],
  // or schemas: [NO_ERRORS_SCHEMA] to ignore unknown child tags (use sparingly)
});
```

---

## 9. What Good Unit Tests Look Like (Interview Rubric)

### FIRST principles

| Letter | Meaning |
|---|---|
| **F**ast | milliseconds |
| **I**solated | no real network/DB/filesystem |
| **R**epeatable | same result every run |
| **S**elf-validating | pass/fail, no manual check |
| **T**imely | written with / right after code |

### Test behavior, not implementation

```ts
// ❌ brittle — tied to private method names / call order
expect(component['buildQuery']).toHaveBeenCalled();

// ✅ stable — assert user-visible / public contract
expect(screen.getByText('No results')).toBeTruthy();
```

### One behavior per `it`

Bad: “loads user, formats name, handles error, updates UI”  
Good: three focused specs.

### Name tests like requirements

```ts
it('disables submit when email is invalid', () => {});
it('shows error toast when API returns 500', () => {});
```

---

## 10. Coverage — What Interviewers Expect

Coverage tools (Istanbul via Jest `--coverage`) measure:

| Metric | Meaning |
|---|---|
| Line | lines executed |
| Branch | if/else paths |
| Function | functions called |
| Statement | statements hit |

**Trap answer to avoid:** “100% coverage means bug-free.”  
**Better answer:** Coverage finds **untested code**, not **correct** code. Prefer meaningful assertions over chasing 100%.

Typical team targets: **70–80%** on critical business logic; UI chrome less important.

---

## 11. E2E vs Unit (don’t mix them up)

| | Unit / Component | E2E |
|---|---|---|
| Tools | Jest / Jasmine+Karma | Playwright, Cypress (Protractor deprecated) |
| Browser | jsdom or Karma browser | Real browser automation |
| Speed | Fast | Slow |
| Flakiness | Low if isolated | Higher (network, timing) |
| Goal | Logic correctness | Critical user journeys |

---

## 12. Full Angular Example — Login Form (Jest + TestBed)

```ts
// login.component.ts (idea)
@Component({
  standalone: true,
  imports: [ReactiveFormsModule],
  template: `
    <form [formGroup]="form" (ngSubmit)="submit()">
      <input formControlName="email" />
      <input formControlName="password" type="password" />
      <button type="submit" [disabled]="form.invalid">Login</button>
      @if (error) { <p class="error">{{ error }}</p> }
    </form>
  `,
})
export class LoginComponent {
  error = '';
  form = new FormGroup({
    email: new FormControl('', [Validators.required, Validators.email]),
    password: new FormControl('', Validators.required),
  });

  constructor(private auth: AuthService) {}

  submit() {
    if (this.form.invalid) return;
    const { email, password } = this.form.getRawValue();
    this.auth.login(email!, password!).subscribe({
      next: () => (this.error = ''),
      error: () => (this.error = 'Invalid credentials'),
    });
  }
}
```

```ts
// login.component.spec.ts
describe('LoginComponent', () => {
  let fixture: ComponentFixture<LoginComponent>;
  const auth = {
    login: jest.fn(),
  };

  beforeEach(async () => {
    auth.login.mockReset();
    await TestBed.configureTestingModule({
      imports: [LoginComponent],
      providers: [{ provide: AuthService, useValue: auth }],
    }).compileComponents();

    fixture = TestBed.createComponent(LoginComponent);
    fixture.detectChanges();
  });

  it('keeps submit disabled when form invalid', () => {
    const btn: HTMLButtonElement = fixture.nativeElement.querySelector('button');
    expect(btn.disabled).toBe(true);
  });

  it('calls AuthService on valid submit', () => {
    auth.login.mockReturnValue(of({ token: 't' }));
    const c = fixture.componentInstance;
    c.form.setValue({ email: 'a@b.com', password: 'secret' });
    fixture.detectChanges();

    (fixture.nativeElement.querySelector('button') as HTMLButtonElement).click();
    expect(auth.login).toHaveBeenCalledWith('a@b.com', 'secret');
  });

  it('shows error when login fails', () => {
    auth.login.mockReturnValue(throwError(() => new Error('401')));
    const c = fixture.componentInstance;
    c.form.setValue({ email: 'a@b.com', password: 'bad' });
    c.submit();
    fixture.detectChanges();

    expect(fixture.nativeElement.querySelector('.error').textContent)
      .toContain('Invalid credentials');
  });
});
```

This is interview gold: **arrange → act → assert**, mock collaborator, assert UI + interaction.

---

## 13. Common Mistakes (call these out)

1. **Testing private methods** — test through public API / template.
2. **Real HTTP in unit tests** — use mocks / `HttpTestingController`.
3. **Forgetting `detectChanges()`** — DOM never updates.
4. **Shared mutable state between tests** — reset in `beforeEach`.
5. **Over-mocking** — mock boundaries (HTTP, storage), not every helper.
6. **Huge snapshots** — become noise; prefer targeted assertions.
7. **Asserting call order of internals** — brittle; assert outcomes.
8. **Mixing E2E concerns into unit tests** — “open Chrome and login” is not a unit test.

---

## 14. Interview Q&A (Ready Answers)

### Q1. What is unit testing?

> Testing the smallest testable piece of code in isolation with controlled dependencies, so we can verify behavior quickly and localize failures.

### Q2. Jasmine vs Karma?

> Jasmine is the testing framework (suites, specs, matchers, spies). Karma is the runner that executes those specs inside real browsers and reports results.

### Q3. Jest vs Jasmine/Karma?

> Jest is all-in-one: runner + assertions + mocks + coverage, runs in Node/jsdom → usually faster. Jasmine+Karma is the classic Angular pair with real browser execution. APIs are similar; mocking APIs differ (`jest.fn` vs `jasmine.createSpyObj`).

### Q4. What is TestBed?

> Angular’s testing utility that creates a lightweight testing module: configure declarations/imports/providers, create components, and inject services with the same DI rules as the app.

### Q5. Why `fixture.detectChanges()`?

> Component property changes don’t automatically update the template in tests. `detectChanges()` runs change detection so the DOM reflects the current state.

### Q6. How do you mock a dependency?

> Provide a fake via `{ provide: RealService, useValue: mock }` in TestBed, or construct the class with a `jest.fn()` collaborator. Spy on methods and set `mockReturnValue` / `mockResolvedValue`.

### Q7. How do you test HTTP?

> Use `HttpClientTestingModule` + `HttpTestingController`: subscribe to the call, `expectOne(url)`, assert method/body, `flush(fakeData)`, then `verify()` no outstanding requests.

### Q8. `fakeAsync` vs `async/await`?

> `fakeAsync` + `tick` lets you control virtual time for timers under Zone. `async/await` with `whenStable()` waits for real async completion. Prefer clarity; know both.

### Q9. What is a spy / mock / stub / fake?

| Term | Meaning |
|---|---|
| **Stub** | Replaces method with canned return |
| **Mock** | Pre-programmed + verifies interactions |
| **Spy** | Wraps real/fake fn and records calls |
| **Fake** | Lightweight working alternate (e.g. in-memory DB) |

In practice people say “mock” loosely for all of these.

### Q10. Shallow vs deep testing?

> Shallow isolates the component (children stubbed). Deep renders real children. Prefer shallow for unit tests; deep/integration when collaboration matters.

### Q11. Why is Jest faster than Karma?

> No real browser launch; runs in Node with jsdom; parallel workers; lighter startup. Tradeoff: less real-browser fidelity.

### Q12. Can Jest replace Jasmine in Angular?

> Yes. Many teams use Jest with Angular (presets like `jest-preset-angular`). TestBed APIs stay the same; spy syntax changes to Jest’s.

### Q13. What makes a flaky test?

> Reliance on real time/network, shared state, race conditions, order-dependent suites, or asserting on timing instead of deterministic fakes (`flush`, fake timers).

### Q14. Unit test vs integration test?

> Unit = one unit + mocks. Integration = several real units together (e.g. component + real service + HTTP testing controller). Still not a full browser E2E.

### Q15. How do you test Observables?

```ts
it('emits users', (done) => {
  service.getUsers().subscribe((users) => {
    expect(users.length).toBe(2);
    done();
  });
});

// or marble / firstValueFrom
const users = await firstValueFrom(service.getUsers());
expect(users.length).toBe(2);
```

---

## 15. Quick Cheat Sheet (memorize)

```ts
// Jest
jest.fn()
jest.spyOn(obj, 'method').mockReturnValue(x)
jest.spyOn(obj, 'method').mockResolvedValue(x)
jest.mock('./module')
jest.useFakeTimers(); jest.advanceTimersByTime(300);

// Jasmine
spyOn(obj, 'method').and.returnValue(x)
jasmine.createSpyObj('Svc', ['a', 'b'])

// Angular
TestBed.configureTestingModule({ imports, providers })
TestBed.createComponent(Cmp)
fixture.detectChanges()
TestBed.inject(Service)
HttpTestingController.expectOne(url).flush(data)
```

### Arrange → Act → Assert

Every good answer in a live coding test should follow AAA.

---

## 16. Practice Checklist (before interview)

- [ ] Write a Jest test for a pure function (incl. error case)
- [ ] Mock a dependency with `jest.fn` / `jest.spyOn`
- [ ] Use fake timers on debounce
- [ ] Explain Jasmine vs Karma vs Jest in 30 seconds
- [ ] Create Angular component test with TestBed + `detectChanges`
- [ ] Mock a service via `providers: [{ provide, useValue }]`
- [ ] Write an `HttpTestingController` test
- [ ] Explain coverage limits + testing pyramid
- [ ] Know `toBe` vs `toEqual`
- [ ] Know shallow vs deep component tests

---

## Related

| Topic | Where |
|---|---|
| DI (why mocking providers works) | [ANGULAR_DEPENDENCY_INJECTION.md](./ANGULAR_DEPENDENCY_INJECTION.md) |
| Debounce/throttle to test with timers | `../javascript-interview-prep/DEBOUNCE_THROTTLE.md` |
| Promises / async | `../javascript-interview-prep/PROMISES.md` |
| Observables vs Promises | `../javascript-interview-prep/PROMISES_VS_OBSERVABLES.md` |

---

*Next if you want:* a twin guide with **Playwright E2E** + **Angular Testing Library** query style (`getByRole`) examples matched to your `prevonir-interview-practice` components.
