# Native Federation vs Module Federation — Interview Ready

Same **micro frontend mental model** (host, remote, expose, shared, runtime load).  
Different **runtime + bundler** underneath.

Related: [01 overview](./01_MICRO_FRONTENDS_OVERVIEW.md) · [04 NUX plan](./04_NUX_MODULE_FEDERATION_SPLIT_PLAN.md)

---

## 1. One-liner (say this first)

> **Module Federation** is the Webpack 5 feature that loads separately built remotes at runtime and shares dependencies. **Native Federation** is the same idea implemented with **browser-native ESM + import maps**, so it works with Angular’s **esbuild application builder** without a Webpack runtime. Vocabulary is the same; the plumbing differs.

---

## 2. Side-by-side table (memorize)

| | **Module Federation (Webpack MF)** | **Native Federation** |
|---|---|---|
| **Origin** | Webpack 5 (`ModuleFederationPlugin`) | `@angular-architects/native-federation` (MF mental model on web standards) |
| **Bundler** | Webpack / Rspack | Angular **application builder / esbuild** (Vite-friendly ecosystem) |
| **How remotes load** | Webpack runtime + `remoteEntry.js` | **ESM** + **import maps** + federation manifest |
| **Shared deps** | `shared: { singleton, requiredVersion }` in webpack config | Same *concept* via `federation.config` / `shareAll` — prepared as ESM |
| **Config API** | `exposes`, `remotes`, `shared` | Intentionally **same mental API** (host/remote/expose/shared) |
| **Shell overhead** | Includes webpack federation runtime | Often **smaller** — no full webpack runtime in host |
| **Build speed** | Webpack-typical | Usually **faster** with esbuild |
| **Angular 17+ default** | Works, but fights default esbuild path if you must stay on Webpack | **Aligned** with modern Angular CLI |
| **SSR / hydration** | Possible with extra setup | Supported in modern Native Federation + Angular versions (verify for your major) |
| **Best when** | Existing Webpack MF estate, Rspack shops | **New Angular MFE**, already on application builder |
| **JD says “Module Federation”** | Name they often use generically | You clarify: “MF **model**, Native Federation **implementation** on esbuild” |

---

## 3. Same architecture (don’t confuse interviewers)

Both give you:

```text
HOST                          REMOTE
load remote at runtime   ←──  exposes ./Routes
shared Angular singleton ←──  declares shared peers
independent deploy       ←──  own CI → CDN
```

**Changing Native ↔ Webpack MF does not change:**

- Domain split (safety / devices / …)  
- Auth in shell  
- Manifest + CDN rollback story  
- “Don’t share a global NgRx across remotes”

It **does** change how `remoteEntry` / import map is produced and loaded.

---

## 4. How each loads a remote (intuition)

### Module Federation (Webpack)

```text
Host webpack runtime
  → fetch remoteEntry.js (webpack glue)
  → resolve shared modules from webpack share scope
  → getExposedModule('./Routes')
  → render in router outlet
```

### Native Federation

```text
Host boots Native Federation runtime
  → read federation.manifest.json (remote → URL)
  → import maps tell browser where shared ESM lives
  → dynamic import() of exposed ESM module
  → render in router outlet
```

**Interview line:**

> Webpack MF shares through the bundler runtime. Native Federation shares through **ESM + import maps** — the browser’s module graph.

---

## 5. Conceptual config (look the same on purpose)

```js
// Webpack Module Federation — remote
new ModuleFederationPlugin({
  name: 'mfeSafety',
  filename: 'remoteEntry.js',
  exposes: { './Routes': './src/safety.routes.ts' },
  shared: {
    '@angular/core': { singleton: true, strictVersion: true, requiredVersion: '^21.0.0' },
    rxjs: { singleton: true, requiredVersion: '~7.8.0' },
  },
});
```

```ts
// Native Federation — same mental model (federation.config)
export default withNativeFederation({
  name: 'mfeSafety',
  exposes: { './Routes': './src/safety.routes.ts' },
  shared: {
    ...shareAll({ singleton: true, strictVersion: true, requiredVersion: 'auto' }),
  },
});
```

Host route usage is the same idea either way:

```ts
loadChildren: () =>
  loadRemoteModule('mfeSafety', './Routes').then((m) => m.SAFETY_ROUTES)
```

---

## 6. Which should you pick? (decision)

| Situation | Choose |
|---|---|
| Greenfield Angular 17+ / 19 / 21, **esbuild** app builder | **Native Federation** |
| Already deep into Webpack MF remotes in prod | Stay on **Webpack MF** (or migrate gradually) |
| Org standard is Rspack MF | Webpack-family MF |
| JD says “Module Federation” only | Answer with **MF concepts**, then say you’d implement with **Native Federation** on modern Angular unless they standardize on Webpack |
| Need max isolation / different Angular majors | **Iframe remotes** (not either federation) — we use this on IDMS transitional `/app` |

---

## 7. IDMS / NUX talking point

> Our NUX shell is on Angular’s **application builder**. For federated in-DOM remotes I’d implement the **Module Federation architecture** using **Native Federation** so we don’t force Webpack. Transitional remotes still use **iframe composition** where we need separate Angular versions during strangler migration. Same host/remote product design either way; DevOps (per-remote CDN + manifest) stays the same.

---

## 8. Spoken answers

### 20s

> Module Federation is Webpack’s runtime remote loading. Native Federation is the same host/remote/shared model using ESM and import maps for esbuild-era Angular. Same architecture, different engine.

### 45s

> Both solve micro frontends: host loads remotes at runtime and shares singletons like Angular. Webpack Module Federation does that with `ModuleFederationPlugin` and a webpack share scope. Native Federation keeps the same exposes/shared API but emits ESM and uses import maps, so it fits Angular’s default application builder and usually builds faster with less webpack runtime in the shell. On IDMS I’d describe Module Federation as the architecture and Native Federation as the implementation on our esbuild pipeline.

### If they push “Have you used Module Federation?”

> Yes — we designed and run a **Module Federation-style** micro frontend system: host, remotes, shared platform deps, independent CDN deploys. On modern Angular the implementation path is **Native Federation**; we also compose transitional remotes via **iframe** where isolation mattered. I’m fluent in MF vocabulary either way.

---

## 9. Common confusions

| Myth | Truth |
|---|---|
| Native Federation ≠ micro frontends | It **is** MFE — different transport |
| You must say Webpack to mean MF | JD “Module Federation” often means the **pattern** |
| Native Federation has no shared deps | It has shared — via ESM prep / import maps |
| Iframe = Native Federation | No — iframe is another composition style |

---

## 10. Cheat card

```text
Module Federation     = Webpack (or Rspack) runtime remotes
Native Federation     = ESM + import maps, same MF mental model
SAME: host, remote, expose, shared, CDN, independent deploy
DIFF: bundler + how remoteEntry / shares are wired
Angular esbuild today → prefer Native Federation
JD says "Module Federation" → answer pattern, name Native as impl
```

---

## Practice checklist

- [ ] 20s difference without notes  
- [ ] Name ESM + import maps vs webpack share scope  
- [ ] Say when you’d pick each  
- [ ] Tie to NUX: esbuild → Native; iframe for isolation  
