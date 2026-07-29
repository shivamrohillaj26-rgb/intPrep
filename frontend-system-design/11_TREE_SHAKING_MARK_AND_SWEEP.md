# Tree Shaking Under the Hood — Mark-and-Sweep on the Module Graph

**EM / senior question:**  
> “What algorithm powers tree shaking under the hood?”

Most engineers say: *“It removes unused code.”*  
That’s the **what**. This guide is the **how**.

---

## 1. Senior one-liner (memorize)

> Tree shaking is **Dead Code Elimination (DCE)** on a **Module Dependency Graph**, traversed with a **reachability algorithm** rooted in **Mark-and-Sweep** — the same idea as garbage collection, applied at module/AST level at build time.

| Layer | Name |
|---|---|
| Goal | Drop unused exports from the final bundle |
| Technique | Dead Code Elimination (DCE) |
| Data structure | Module Dependency Graph (directed) |
| Traversal | Reachability from entry (DFS/BFS) |
| Classic parallel | Mark-and-Sweep GC |

---

## 2. Why EMs ask this

| Junior answer | Senior answer |
|---|---|
| “Removes unused code” | Names **DCE + module graph + mark/sweep** |
| “Webpack does it” | Explains **ESM static imports** requirement |
| Stops at definition | Mentions **sideEffects**, CJS limits, minifier follow-up |

---

## 3. Step 1 — Build the Module Dependency Graph

Bundlers (Webpack, Rollup, esbuild, Rspack, Angular’s underlying tooling) parse `import` / `export` and build a **directed graph**:

```text
Node  = a module (file)
Edge  = “this module depends on that module / export”
```

```text
index.js ──imports──► utils.js
   │                      │
   │                      ├── export used()
   │                      └── export unused()
   └── imports──► button.js
```

### Why only ES Modules shake well

| | ES Modules (`import`/`export`) | CommonJS (`require`) |
|---|---|---|
| Resolution | **Static** — known at compile time | Often **dynamic** — can depend on runtime values |
| Graph | Fully buildable ahead of time | Incomplete / conservative |
| Tree shaking | ✅ Designed for this | ❌ Weak / often disabled |

```js
// ESM — bundler sees exactly what's needed
import { used } from './utils';

// CJS — path may be computed; hard to prove what's unused
const name = condition ? 'a' : 'b';
require(`./mods/${name}`);
```

**Say:**  
> Tree shaking needs a static module graph. ESM gives that; CommonJS usually doesn’t.

---

## 4. Step 2 — Mark phase (reachability traversal)

Starting from **entry points** (`main.ts`, `index.js`, each lazy-route entry):

1. Treat the entry as a **root** (like GC roots)  
2. Walk the graph with **DFS or BFS**  
3. **Mark** every module/export that is **reachable and actually referenced** by live code  

```text
Entry: index.js
  mark index.js
  → follows import { used } from './utils'
  → mark utils.js::used
  → does NOT mark utils.js::unused   (never referenced)
```

Unreferenced exports → **never marked**.

This is the **reachability** step of Mark-and-Sweep.

---

## 5. Step 3 — Sweep phase (eliminate dead code)

Everything never marked is **dead** and removed from the emitted bundle.

```js
// utils.js (source)
export function used() { return 1; }
export function unused() { return 2; } // swept out if unused + side-effect free

// index.js
import { used } from './utils';
console.log(used());
```

Final bundle conceptually contains `used`, not `unused`.

That’s **Dead Code Elimination** driven by the marks.

---

## 6. Why “Mark-and-Sweep” is the right analogy

| Garbage collection | Tree shaking |
|---|---|
| Heap objects | Modules / exports / AST nodes |
| GC roots (stacks, globals) | Bundle **entry points** |
| Mark reachable objects | Mark reachable imports/exports |
| Sweep unmarked → free memory | Sweep unmarked → omit from bundle |
| Runtime | **Build time** |

Same logic family; different stage of the program lifecycle.

---

## 7. Full pipeline (where tree shaking sits)

```text
Source files
  → Parse to AST
  → Build Module Dependency Graph (ESM)
  → Mark reachable from entries (DFS/BFS)
  → Sweep unmarked exports (DCE / tree shake)
  → (often) Minify — more DCE inside functions
  → Emit chunks → compress (gzip/brotli) on CDN
```

**Tree shaking ≠ minification**

| | Tree shaking | Minification |
|---|---|---|
| Level | Modules / unused exports | Tokens, names, local dead code |
| Needs | Static ESM graph | AST inside kept files |
| Example drop | Entire unused `export function` | Rename `used` → `a`, drop dead `if (false)` |

Both reduce size; seniors name both.

---

## 8. What breaks or limits tree shaking

| Limit | Why |
|---|---|
| **Side effects** | Top-level code may must run even if no export is used (`import './polyfill'`) |
| Missing `"sideEffects": false` | Bundler keeps whole packages to be safe |
| **CommonJS** dependencies | No reliable static graph |
| Dynamic `import(path)` with variables | Edge can’t be resolved |
| Fat barrel files | `export * from './a'; export * from './b'` can pull too much if used poorly |
| `/* #__PURE__ */` missing on some libs | Harder for minifiers to drop pure calls |

```json
// package.json of a library — helps Webpack
{
  "sideEffects": false
}
```

---

## 9. Concrete walkthrough (whiteboard)

```text
entry: app.js
app.js imports { debounce } from 'lodash-es'
lodash-es/debounce.js imports a few helpers

MARK:
  app.js ✓
  lodash-es/debounce ✓
  its small helper chain ✓
  lodash-es/merge ✗ never marked
  lodash-es/cloneDeep ✗ never marked

SWEEP:
  merge, cloneDeep omitted from bundle
```

Contrast with:

```js
import _ from 'lodash'; // often pulls a large CJS/UMD surface — weak shaking
```

---

## 10. Interview Q&A

**Q: What algorithm powers tree shaking?**  
> Dead Code Elimination on a Module Dependency Graph via Mark-and-Sweep-style reachability from the entry point.

**Q: Is it literally DFS or BFS?**  
> Either works for reachability; bundlers implement a graph walk from entries. Naming **reachability / mark-and-sweep** matters more than DFS vs BFS.

**Q: Why doesn’t it work with require()?**  
> `require` can be dynamic; the full graph isn’t known at compile time, so the bundler must be conservative and keep more code.

**Q: Same as GC?**  
> Same *family of idea* (mark reachable, discard the rest). GC runs at runtime on objects; tree shaking runs at build time on modules/exports.

**Q: How do you verify it worked?**  
> Bundle analyzer — unused library paths shouldn’t appear; also check import style (`lodash-es` named imports).

---

## 11. Spoken answers

### 20 seconds (what → how)

> Tree shaking isn’t magic deletion — it’s DCE on the module graph. The bundler builds a directed dependency graph from static ESM imports, marks everything reachable from the entry with a graph walk, and sweeps unmarked exports out of the bundle — Mark-and-Sweep at build time.

### 45 seconds (add constraints)

> …That only works well with ES modules because imports are static. CommonJS and side-effectful modules force the bundler to keep more code. After shaking, the minifier can still remove dead code inside kept functions. I validate with a bundle analyzer and prefer named ESM imports plus `sideEffects: false` in libraries.

### Contrast line (use early)

> Most people say it removes unused code — that’s the *what*. The *how* is mark-and-sweep reachability on the module dependency graph.

---

## 12. Practice checklist

- [ ] Say **DCE + Module Dependency Graph + Mark-and-Sweep** without notes  
- [ ] Explain why **ESM > CJS** for shaking  
- [ ] Draw entry → mark → sweep on a 3-file example  
- [ ] Mention **sideEffects** and barrel-file pitfalls  
- [ ] Separate tree shaking from minification  

---

## Related

| Topic | File |
|---|---|
| Bundle optimize / split / lazy | [02_BUNDLE_OPTIMIZATION_CODE_SPLITTING_LAZY_LOADING.md](./02_BUNDLE_OPTIMIZATION_CODE_SPLITTING_LAZY_LOADING.md) |
| Licious managerial pack | [../scenario-based-questions/LICIOUS_MANAGERIAL_FRONTEND.md](../scenario-based-questions/LICIOUS_MANAGERIAL_FRONTEND.md) |
| ESM vs CJS (Angular ecosystem) | [../angular-interview-prep/ANGULAR_ECOSYSTEM_FUNDAMENTALS.md](../angular-interview-prep/ANGULAR_ECOSYSTEM_FUNDAMENTALS.md) |
