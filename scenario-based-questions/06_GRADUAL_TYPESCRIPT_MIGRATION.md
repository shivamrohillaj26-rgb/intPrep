# Scenario 6 — Gradual JavaScript → TypeScript Migration (200 Files)

**Prompt:** A legacy React application contains 200 JavaScript files. Management wants a gradual TypeScript migration without disrupting production. What strategy would you follow?

---

## 1. Clarify

- React version / bundler (CRA, Vite, Next, Webpack)?  
- Existing tests? CI?  
- Strictness appetite (`strict: true` now vs ratchet later)?  
- Do we allow `any` temporarily?

**Key management constraint:** **no big-bang rewrite, no production drama.**

---

## 2. Strategy overview — “strangler + ratchet”

```
Allow JS + TS side by side
  → Rename/migrate high-value files first
  → Tighten compiler options over time
  → Ban new JS
  → Delete JS when coverage complete
```

Never: “stop feature work for 3 months to convert everything.”

---

## 3. Phase 0 — Foundation (week 1, low risk)

1. Add TypeScript toolchain (`typescript`, `@types/react`, `@types/react-dom`)  
2. Ensure bundler compiles `.ts`/`.tsx` **and** still builds `.js`  
3. Add `tsconfig.json` with **pragmatic** initial settings:

```json
{
  "compilerOptions": {
    "allowJs": true,
    "checkJs": false,
    "strict": false,
    "noImplicitAny": false,
    "skipLibCheck": true,
    "jsx": "react-jsx",
    "isolatedModules": true,
    "esModuleInterop": true
  },
  "include": ["src"]
}
```

4. CI: `tsc --noEmit` **non-blocking** at first (report only), then gating  
5. Editor: team uses TS language service  

**Why `allowJs: true`:** Mixed codebase is the whole point of gradual migration.  
**Why not `strict: true` on day one:** 10,000 errors → team ignores TS or blocks shipping. Ratchet later.

---

## 4. Phase 1 — Boundaries & types that pay rent

Migrate / create types at **edges** first:

| Priority | What | Why |
|---|---|---|
| P0 | API response types / Zod schemas | Runtime bugs + contract clarity |
| P0 | Shared domain models (`User`, `Cart`) | Used everywhere |
| P1 | Utility modules (pure functions) | Easy wins, high reuse |
| P1 | New features **TS-only** policy | Stops bleeding |
| P2 | Leaf presentational components | Lower risk |
| P3 | Hairy legacy containers | Last; needs tests |

**Why types at API boundary before random components:**  
Wrong API shapes cause production bugs; typing `Button` props helps less initially.

**Optional force multiplier:** Zod/io-ts parse at boundary → types inferred, runtime guard.

---

## 5. Phase 2 — File migration pattern (repeatable)

For each file:

1. Ensure tests or add a thin characterization test if critical  
2. Rename `Foo.js` → `Foo.tsx` (or `.ts`)  
3. Fix only what’s needed to compile  
4. Prefer accurate types; allow **local** escape hatches:

```ts
// temporary, ticketed
// eslint-disable-next-line @typescript-eslint/no-explicit-any
const legacy: any = data;
```

5. Export typed public API; keep internals looser if needed  
6. PR small (1–5 files), ship  

**JSDoc as bridge (optional):**

```js
// checkJs can use JSDoc types before rename
/** @param {string} id */
export function getUser(id) {}
```

**Why rename+ship over parallel `Foo.ts` + delete later:**  
Two files diverge. Rename in place with `allowJs` neighbors.

---

## 6. Phase 3 — Policy so you don’t regress

- **ESLint:** `no-js-files` in `src/features/**` once a area is done  
- **CI rule:** new files under `src/` must be `.ts`/`.tsx`  
- **CODEOWNERS** / template: “TS for all new code”  
- Track progress: `% of LOC in TS` dashboard  

---

## 7. Phase 4 — Ratchet strictness

Order of tightening (typical):

1. `noImplicitAny`  
2. `strictNullChecks`  
3. full `strict`  
4. `noUncheckedIndexedAccess` (advanced)  

Turn on per-package or with `%` error budgets. Fix errors in burndown sprints interleaved with features.

**Why ratchet over “strict from the start”:** Psychological + delivery safety. Strictness without migration path creates `as any` everywhere — worse than gradual honesty.

---

## 8. Testing & production safety

- Keep **existing Jest/RTL** green on each PR  
- Add type tests for critical generics if needed (`expectTypeOf`)  
- Canary deploy; TS compile is build-time — runtime risk is logic changes during cleanup, not “TS itself”  
- Avoid drive-by refactors in migration PRs (“while I’m here…”) — that’s how you disrupt production  

**Why separate “convert” from “refactor”:** Reviewers can focus; bisectability if bugs escape.

---

## 9. Team / process model

| Model | Use when |
|---|---|
| **Boy scout** — touch file → convert | Steady, low coordination |
| **Dedicated % capacity** (e.g. 20%) | Management wants visible progress |
| **Vertical slices** (Checkout flow fully TS) | Domain cohesion |

I’d combine: **policy for new code** + **20% capacity** + **boy scout on touched files**.

---

## 10. Why this over that

| Approach | Why avoid / choose |
|---|---|
| Big-bang rewrite in a branch | Diverges from main; merge hell; high risk |
| `// @ts-nocheck` on everything forever | Fake migration |
| `strict` day one | Noise; `any` explosion |
| Only migrate components, ignore API types | Misses highest bug ROI |
| CheckJS everywhere first | Can work; slower UX than just renaming hot files |
| Mixed allowJs + ratchet | **Chosen** — production-safe |

---

## 11. Sample timeline (200 files, illustrative)

| Week | Outcome |
|---|---|
| 1 | TS pipeline, allowJs, new code = TS |
| 2–3 | Domain types + API layer |
| 4–8 | Convert utils + shared components |
| ongoing | Feature folders strangler |
| later | Enable `strict`, delete `allowJs` when 0 JS left |

---

## 12. 60-second spoken answer

> I’d run a **gradual strangler migration**: enable TypeScript beside JS with `allowJs`, keep production shipping, and mandate **all new code in TS**. I’d type **API/domain boundaries first**, then convert files in small PRs without drive-by refactors, using temporary `any` only with a ratchet plan. Progress is enforced by lint/CI, and we tighten `strict` options over time once error count is manageable. The goal is continuous delivery the whole way—not a freeze-the-world rewrite.

---

## Related

- Scenario 10 — CI gates for `tsc`  
- Scenario 9 — migrations coexist with scaling work
