# Scenario 6 — Gradual TypeScript / Angular modernization (no production freeze)

**Prompt (classic):** 200 JavaScript files, gradual TS, don’t stop shipping.  
**Angular reality:** Most Angular apps are **already `.ts`**. Interviewers still want **strangler + ratchet**. Map it to what you actually do: **JS leftovers, `strict`/`strictTemplates` off, NgModules → standalone, `any` APIs.**

---

## 1. Clarify

- Angular version / builder (esbuild vs Webpack)?  
- `allowJs`? `strictTemplates`?  
- Tests / CI `ng test` / `tsc`?  
- Appetite: `any` temporarily?

**Constraint:** no big-bang rewrite.

---

## 2. Two prompts, one strategy

| They said | You treat as |
|---|---|
| React 200 JS files | `allowJs` + rename to `.ts` + ratchet `strict` |
| Angular dashboard | Same **ratchet**: `strictTemplates`, standalone, typed `HttpClient`, kill `any` |

```
Side-by-side old + new
  → New code = modern standard
  → High-value files first (API models, shared utils)
  → Tighten tsconfig over time
  → Ban new legacy patterns
```

Never: freeze features for a quarter to convert everything.

---

## 3. Phase 0 — Foundation (Angular)

1. `tsconfig` already there — turn **`allowJs`: true** if `.js` remains  
2. Start with **pragmatic** flags:

```json
{
  "compilerOptions": { "strict": false, "noImplicitAny": false, "skipLibCheck": true },
  "angularCompilerOptions": { "strictTemplates": false, "strictInjectionParameters": false }
}
```

3. CI: `ng build` already typechecks; add **non-blocking** report, then gate  
4. **All new files `.ts`**, new components **standalone**

**Why not `strictTemplates: true` on day one:** Thousands of template errors → team ships `as any` everywhere.

---

## 4. Phase 1 — Boundaries that pay rent

| Priority | What | Why |
|---|---|---|
| P0 | API DTOs / `HttpClient` generics | Production bugs |
| P0 | Domain models (`Device`, `User`) | Used everywhere |
| P1 | `strictInjectionParameters` | DI mistakes |
| P1 | New features standalone + typed | Stops bleeding |
| P2 | Leaf components | Lower risk |
| P3 | God NgModules / legacy JS | Last; needs tests |

**AngularJS → Angular** (IDMS-shaped): strangler **iframe / hybrid** then nativize routes — that’s a **product** migration, not `allowJs`. Say it if they ask NUX; this scenario is **compiler + patterns**.

---

## 5. File pattern

1. Tests green (`ng test` / Vitest)  
2. Rename `foo.js` → `foo.ts`  
3. Compile only — **no** drive-by refactor  
4. Ticketed `any`  
5. Small PRs  

Optional JSDoc `@param` with `checkJs` before rename.

---

## 6. Angular-specific ratchets (order)

1. `noImplicitAny`  
2. `strictNullChecks`  
3. `strictInjectionParameters`  
4. **`strictTemplates`** (the Angular one they care about)  
5. Standalone + `loadComponent` instead of new NgModules  
6. `inject()` in new code; don’t rewrite all constructors in one PR  

**NgModule → standalone:** folder-by-folder; don’t convert the whole `AppModule` on a Friday.

---

## 7. Policy so you don’t regress

- ESLint: no new `.js`; no new `NgModule` in `src/app/features/**` once that area is standalone  
- CI: `ng build` + budgets  
- Boy scout: touch file → tighten types  

---

## 8. Why this over that

| Approach | Verdict |
|---|---|
| Big-bang branch | Merge hell |
| `strictTemplates` day one | `any` explosion |
| Only convert components, ignore HTTP types | Misses bugs |
| allowJs + ratchet + standalone for new code | **Chosen** |

---

## 9. 60-second spoken answer

> Angular is already TypeScript, so I’d run a **strangler ratchet**: keep shipping, **all new code** standalone + typed, and migrate **API models first**. If JS files exist, `allowJs` and rename in small PRs with no drive-by refactors. I’d turn on **`strictTemplates` and `strict` only after the error count is human** — not Monday morning. NgModules die feature-by-feature. CI `ng build` is the gate. Same story as a React JS→TS migrate: **no freeze-the-world rewrite**.

---

## Related

- [ANGULAR_UPGRADE_PLAYBOOK.md](../angular-interview-prep/ANGULAR_UPGRADE_PLAYBOOK.md)  
- Scenario 10 — `ng build` / budgets as gates
