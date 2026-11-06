# OneTrust — `package.json` vs `package-lock.json`

**One file for the question that keeps coming:**  
“What is package.json?” · “What is package-lock.json?” · **“Why do we need package.json if we already have the lock?”** · Can we use only one of them?

**Also:** SemVer `^` / `~`, `npm i` vs `npm ci`, Yarn/pnpm lockfiles, what CI does on NUX.

Deeper npm/Angular toolchain: `angular-interview-prep/ANGULAR_ECOSYSTEM_FUNDAMENTALS.md` §2–4. This file is the **complete spoken + trap** version so you don’t miss the follow-up.

---

## 0. 45s opener (say this first — the trap is in here)

> **`package.json` is the contract I write.** It names the app, **scripts** (`start`, `build`, `test`), **direct** dependencies with **ranges** (`rxjs: ~7.8.0`, `primeng: ^21.1.4`), engines, overrides. Humans and `npm install <pkg>` edit this.  
> **`package-lock.json` is the snapshot npm writes.** It records the **entire resolved tree** — every nested package, exact version, and **integrity hash**. CI uses it so laptop === Jenkins.  
> **You cannot drop `package.json`.** The lockfile is **generated from** it. npm **requires** `package.json` to know the project (name, scripts, which ranges are *intentional*). `npm ci` **fails** if the lock doesn’t match `package.json`. The lock also has **no scripts** — `npm run build` would not exist.  
> **You should not drop the lockfile** either: ranges would resolve to **new** minors/patches next month → “works on my machine.”  
> So: **intent vs freeze**. Both committed. Lock never hand-edited.

If they only ask “why lock?”:

> Ranges in `package.json` are *allowed* versions. The lock is *which* versions we actually installed, including transitives.

If they only ask “why json if lock has versions?”:

> The lock is a **machine dump**. `package.json` is what we **mean** to depend on, plus **scripts**, plus **ranges we still want** when we *choose* to upgrade. Without it, npm has no project metadata and no way to tell an intentional `rxjs` bump from noise.

---

## 1. Mental model (draw this)

```text
  package.json          = RECIPE / shopping LIST
  "I want Angular 21.x, RxJS 7.8.x, PrimeNG 21.x"
  + scripts: how to cook (ng serve, ng test, i18n)

  package-lock.json     = RECEIPT from THIS supermarket trip
  "You got @angular/core 21.2.12, rxjs 7.8.2,
   and 400 nested packages at these exact SHAs"

  node_modules          = the groceries (not committed)
```

| | `package.json` | `package-lock.json` |
|---|---|---|
| Who writes it | **You** (and `npm install lodash`) | **npm** (auto) |
| Size | Small, readable | Huge (NUX dashboard lock is **thousands** of lines) |
| Versions | Often **ranges** `^` `~` | **Exact** + nested tree |
| Scripts | **Yes** | No |
| Integrity hashes | No | **Yes** (`sha512-...`) |
| Hand-edit? | Yes | **Never** |
| Commit? | **Yes** | **Yes** (npm) |

Yarn → `yarn.lock`. pnpm → `pnpm-lock.yaml`. Same job, different format. NUX dashboard is **npm** (`lockfileVersion: 3`).

---

## 2. What `package.json` actually is (don’t under-sell it)

It is the **npm project manifest**. Not “a list of versions.”

Typical keys (IDMS NUX `dashboard` shape):

| Key | Why it exists — lock cannot replace this |
|---|---|
| `name` / `version` | Identity; publishing; workspaces |
| `scripts` | `start`, `build`, `test`, i18n, Playwright — **the lock has zero of this** |
| `dependencies` | Runtime libs the **app imports** (`@angular/core`, `rxjs`, `primeng`) |
| `devDependencies` | CLI, TypeScript, Vitest, Playwright — **not** shipped to users |
| `^` / `~` / exact | **Policy:** how far we allow npm to float *when we update* |
| `overrides` | Force a transitive (security: `ajv`, `undici`, …) — **intent** |
| `engines` (if present) | “Need Node 20+” |
| `private` / `type: module` | Publish / ESM flags |

**NUX examples you can say:**

- `"rxjs": "~7.8.0"` — stay on 7.8.x patches only  
- `"primeng": "^21.1.4"` — 21.x minors/patches OK, not 22  
- `"quill": "2.0.3"` — **pinned exact** (no caret) when we don’t want surprise  
- `overrides` block — security pins on transitives  
- Scripts: `ng test`, `vitest`, `playwright`, `i18n:generate`

**`dependencies` vs `devDependencies`:** production Docker/CI can `npm ci --omit=dev` (or equivalent) so Playwright isn’t in the runtime image. The lock still lists both; **which set to install** is a `package.json` + npm flag decision.

---

## 3. What `package-lock.json` actually is

Auto-generated. **`lockfileVersion: 3`** (npm 7+). Nested `packages` map:

- Root `""` mirrors your direct deps  
- Every other key is a package path with **exact version**, **resolved URL**, **integrity** hash  

That hash is why a **compromised** or **wrong tarball** fails install — lock is a **supply-chain** artifact, not just versions.

It also records **transitives**: you never listed `faye-websocket` in NUX `package.json`; it can still appear in the lock as something else’s dependency. (That’s how you answer “we don’t use WebSockets for notifications” — it was a **lock transitive**, not our code.)

**Rule:** commit it. Don’t `.gitignore` it for apps. Don’t edit JSON by hand — `npm install` / `npm update` / `npm audit fix`.

---

## 4. The trap: “Why package.json if we have the lock?”

**Wrong answer:** “We don’t need it.” / “Lock is enough.”

**Right answer — five reasons you cannot live on lock only:**

1. **npm’s entry file is `package.json`.** `npm ci`, `npm run`, `npm publish` all start there. No manifest → not a package.  
2. **Scripts live only in `package.json`.** Lock doesn’t know `ng serve` or `ng test`.  
3. **Lock is a *result*, not *intent*.** Next time you *want* Angular 22, you change the **range** in `package.json` and regenerate the lock. The lock is not the place you express “we depend on PrimeNG.”  
4. **`npm ci` verifies they match.** If someone edits `package.json` (`"rxjs": "^8"`) and doesn’t update the lock, **CI fails**. That’s a feature. Lock-only would skip that contract.  
5. **Readable review.** PRs: you review `package.json` (“we added Playwright”). You glance at lock (“tree changed”). Reviewing 16k lock lines as the *source of truth* is how mistakes hide.

**Could you theoretically install from lock alone?** npm does **not** support “delete package.json, keep lock.” Some tools can replay a lock, but **that is not how Node projects work**, and you’d lose scripts/metadata.

---

## 5. The other trap: “Why lock if package.json has versions?”

**Wrong answer:** “Lock is redundant.”

`package.json` versions are **ranges**:

```text
^21.1.4  →  >=21.1.4 <22.0.0
~7.8.0   →  >=7.8.0  <7.9.0
```

Without a lock:

```text
Monday   npm i  →  primeng 21.1.4
Next month       →  primeng 21.9.0  (still matches ^)
                   + new nested deps
                   → CI green, prod subtle bug
```

**If the lock is already committed, `npm i` does not float to 21.9.0.** It installs the **locked** exact version. `package.json` still says `"^21.1.4"` — that string is **not** edited.

With lock + **`npm ci`**: same tree every time until someone **intentionally** changes `package.json` and commits a new lock.

**Transitives:** even exact `"quill": "2.0.3"` does not freeze *quill’s* dependencies. Only the lock does.

---

## 6. `npm install` vs `npm ci` (they will ask)

| | `npm install` | `npm ci` |
|---|---|---|
| Lockfile | Creates/updates | **Must exist**; **must match** `package.json` |
| `node_modules` | Mutates | Deletes, clean install |
| Use | Local: add a lib, pull latest allowed by range | **Jenkins / GitHub Actions / prod build** |
| Deterministic | Weaker | **Strong** |

> Locally `npm install`. Pipeline **`npm ci`** so we don’t silently rewrite the lock on the build agent.

If `package.json` and lock **disagree**, `npm ci` **exits non-zero**. That’s the pairing: **both files required**.

NUX/IDMS pipelines: dashboard build uses **`npm ci`** (see DevOps story). Don’t say “we npm install on Jenkins” unless you know they do.

---

## 7. Can we “work around” and use only one?

| Workaround | What happens |
|---|---|
| Commit only `package.json` | Installs **drift**; flaky prod; audit hell |
| Commit only lock | **Not a valid npm project**; no scripts; `npm ci` won’t run as designed |
| Don’t commit lock, generate on CI | Each CI run can pick **new** versions → unreproducible artifacts |
| Commit `node_modules` | Huge, OS-specific binaries, merge hell — **don’t** |
| Delete lock when deps “feel stuck” | Last resort locally; **never** as policy; regenerate and **test** |

**Both files, plus `node_modules` gitignored.** That’s the industry default for npm apps.

---

## 8. How an upgrade actually works (so you sound senior)

```text
1. Human: change package.json  (npm i primeng@21.2.0  or bump range)
2. npm:   resolve tree, rewrite package-lock.json
3. Human: run tests, commit BOTH files in one PR
4. CI:    npm ci  →  exact lock tree → ng build
```

If you commit `package.json` without the lock, **the next `npm ci` fails** (mismatch) or the next `npm i` on a teammate’s laptop **rewrites** the lock — noisy diffs, fights.

**`npm update`:** walks ranges in `package.json`, may bump **lock** within those ranges (`^` → latest 21.x). **Does not rewrite** the range text in `package.json` (`"^21.1.4"` stays). Still not “delete json.”

---

## 8b. Does `npm i` edit `package.json` for minor/patch?

**No** — not for a plain `npm install` with an existing lock.

`^` / `~` are **permission** (“if we resolve, this far is OK”). They are **not** “every `npm i` bumps the file.”

| Command | `package.json` | `package-lock.json` |
|---|---|---|
| `npm i` (lock present, in sync) | **unchanged** | usually unchanged; installs **exact** lock versions |
| `npm i` (no lock) | **unchanged** (`^21.1.4` stays) | **created**; picks latest allowed by `^` |
| `npm update` | **unchanged** (range stays `^21.1.4`) | **may bump** 21.1.4 → 21.9.0 |
| `npm i primeng` / `npm i primeng@21.2.0` | **yes** — writes/updates that dependency line | **yes** |
| `npm uninstall primeng` | **yes** | **yes** |
| You edit `"primeng": "^21.2.0"` by hand | you | next `npm i` rewrites lock |

**Spoken (~15s):**

> `package.json` only changes when I **add, remove, or retarget** a package — `npm i lodash`, a version pin, uninstall. A normal `npm i` with a lockfile does **not** bump `^` to the new minor. The caret only matters when there is **no** lock, or I run **`npm update`**, which updates the **lock**, not the range string. CI uses **`npm ci`** so even that float cannot happen on Jenkins.

---

## 9. Related files (don’t mix)

| File | Job |
|---|---|
| `package.json` | npm manifest |
| `package-lock.json` | npm freeze |
| `angular.json` | **CLI build** (projects, budgets, assets) — **not** npm versions |
| `tsconfig.json` | TypeScript compile |
| `.npmrc` | registry, `legacy-peer-deps`, etc. |

> `angular.json` is not a third lockfile.

---

## 10. Q bank (practice out loud)

**Q: What is package.json?**  
Project manifest: identity, scripts, direct deps with SemVer ranges, overrides.

**Q: What is package-lock.json?**  
npm’s exact install tree + integrity hashes for every package including transitives. Auto-generated.

**Q: Why both?**  
Json = **what we intend** + **how to run**. Lock = **what we got**. CI replays the lock.

**Q: Why json if lock has every version?**  
Lock is generated; no scripts; `npm ci` matches against json; humans declare ranges and upgrades in json.

**Q: Why lock if json has versions?**  
Json uses **ranges**; transitives aren’t listed; without lock, Monday ≠ next month.

**Q: Do you commit the lock?**  
Yes, for applications.

**Q: Edit the lock?**  
No.

**Q: `npm i` vs `npm ci`?**  
Install may update lock. **ci** is clean + lock-strict — use in CI.

**Q: Yarn?**  
Same idea, `yarn.lock`. Don’t mix lockfiles in one repo.

**Q: `^` vs `~`?**  
`^` minor+patch same major. `~` patch same minor. Exact = no float.

**Q: Does `npm i` edit `package.json` when a minor/patch is allowed?**  
No. Caret is permission for **resolve**, not a rewrite. Lock present → install exact lock. `npm update` may bump the **lock**; range in json stays `^…`. Json changes on `npm i primeng@…` / uninstall / hand edit.

**Q: Production vs devDependencies?**  
Runtime vs tools. Lock contains both; install flags omit dev in prod.

**Q: Security override?**  
`overrides` in **package.json** (intent) → lock updates to those versions.

---

## 11. Don’t mix with other OneTrust topics

- MFE / shared versions → still **package.json** (or catalog) + **lock per app**. File **4**.  
- Webpack/ESM → bundler, not npm lock. File **8**.  
- Tests (`ng test` / Vitest) are **scripts** in `package.json`. File **9**.
