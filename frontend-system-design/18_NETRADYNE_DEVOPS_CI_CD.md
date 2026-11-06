# Netradyne DevOps & CI/CD — Interview Ready Guide

Grounded in your local **`Desktop/Ternary`** repos (`cloud-front-end`, `cloud-front-end-app`, `cloud`).  
In interviews say **Netradyne IDMS**, not “Ternary.”

Related product HLD: [16_NETRADYNE_IDMS_PROJECT_HLD.md](./16_NETRADYNE_IDMS_PROJECT_HLD.md) · runtime env doc in repo: `cloud-front-end/dashboard/BUILD.md`

---

## 0. 60-second opener (memorize)

> Our delivery is **Jenkins-centric**. Frontend builds run on a `build-fleet` agent with Node pinned via nvm. We compile Angular once (or per pipeline design), **stamp each environment** (qa1–qa10, staging, demo, production), package as **ZIP or WAR**, and upload to **`s3://netradyne-artifacts`**. We do **not** use Angular `fileReplacements` for API hosts — runtime config goes through **`window.EnvironmentData` / `BUILD_ENV`**. GitHub Actions covers PR guardrails and quality builds; **release artifacts come from Jenkins**. Locally we use a **PM2 Node hosting/proxy** stack to point at different IDMS backends. Backend `cloud` pipelines build Java WARs/JARs the same S3 artifact pattern.

---

## 1. Repo map (what lives where)

| Local folder | GitHub (typical) | DevOps relevance |
|---|---|---|
| `Ternary/cloud-front-end` | `netradyne/cloud-front-end` | **NUX 2.0 dashboard** — Jenkins ZIP pipeline + GHA |
| `Ternary/cloud-front-end-app` | `netradyne/cloud-front-end-app` | **Angular `/app`** — Jenkins WAR + consoles |
| `Ternary/cloud` | `netradyne/cloud` | **Backend** Java services + legacy consoles + Docker |

```text
Developer push / Jenkins param BRANCH
        │
        ▼
┌──────────────── Jenkins agent: build-fleet ────────────────┐
│  Node 22.x (nvm) for FE │ Maven/Java for BE                 │
│  Build + package multi-env artifacts                         │
└────────────────────────────┬───────────────────────────────┘
                             ▼
              s3://netradyne-artifacts/jobs/<JOB>/<BUILD>/
                             │
                             ▼
              Deploy / promote (Tomcat / S3+CDN / ops process)
```

---

## 2. End-to-end FE delivery (draw this)

```text
1. Checkout branch (Jenkins param BRANCH)
2. npm ci / cached node_modules (md5 of package.json)
3. Angular production build (esbuild application builder)
4. Per-env STAMP
      - BUILD_ENV / EnvironmentData in index.html
      - CDN asset rewrite → cdn-<env>.netradyne.com
5. Package
      - dashboard: app-<env>.zip
      - app:       app-<env>.war  (+ env zip packs)
6. Upload → s3://netradyne-artifacts/jobs/<job>/<buildNumber>/
7. If BRANCH=release → write release_build_info/buildnumber.txt (pointer)
8. Runtime: browser loads SPA → nd-env-config resolves API hosts
```

**Spoken:**

> Build once, stamp many environments, store artifacts in S3, promote via release pointer / ops deploy. Hostname can still override env at runtime.

---

## 3. Environment matrix (must know)

| Env | Full Jenkins FE build | Hotfix | Typical hosts |
|---|---|---|---|
| `production` | yes | yes | `idms.netradyne.com`, `auth.netradyne.com`, `cdn-production.netradyne.com` |
| `staging` | yes | yes | `*-staging.netradyne.com` |
| `qa1` … `qa10` | yes | **no** | `*-qaN.netradyne.com` |
| `demo` | yes | no | `*-demo...` |
| Extra (app scripts) | `perf`, `devops`, `testing`, … | — | special / package scripts |

**Hotfix** (`HOTFIX_BUILD=true`): only **staging + production** artifacts — faster path when QA matrix isn’t needed.

---

## 4. Dashboard FE — `cloud-front-end`

### Jenkins job (primary)

**File:** `cloud-front-end/Jenkinsfile-app-dashboard-frontend`

| Stage | What happens |
|---|---|
| Validate & Initialize | Set `ENVS`; checkout `cloud-front-end` branch |
| setBuildName | AWS region from CLI/IMDS; display name |
| BuildComponents → buildApp | Node **v22.14.0** via nvm; npm cache; run build |
| Create Build Artifacts | `WebContent/buildinfo.txt` |
| Upload to S3 | `aws s3 cp` → `netradyne-artifacts` |

**Build command (preferred):**

```bash
node ci-build-all.js --zip-to "$WORKSPACE/WebContent" <envs...>
```

Fallback: loop `node custom-builder.js --configuration <env>` → zip `dist/...` → `app-<env>.zip`.

**Params you’ll mention:**

- `BRANCH` — which git branch  
- `HOTFIX_BUILD` — staging/prod only  
- Agent label: **`build-fleet`**

### Key scripts

| File | Role |
|---|---|
| `dashboard/ci-build-all.js` | One Angular build → stamp/copy per env → ZIP |
| `dashboard/custom-builder.js` | Build + inject env meta / CDN rewrite |
| `dashboard/s3-sync-deploy.sh` | Direct sync to a testing bucket + optional CloudFront invalidation |
| `dashboard/BUILD.md` | **Source of truth** for runtime vs compile config |

### GitHub Actions (not prod deploy)

| Workflow | Role |
|---|---|
| `build-dashboard.yml` | Build on main/PR |
| `reusable-dashboard-build.yml` | Shared `npm ci` → i18n → build |
| `ci-guardrails.yml` | Changed-files policy, lint |
| `security-guardrails.yml` | dependency-review, CodeQL |
| `release-pr-quality.yml` | PRs into `release` must pass dashboard build |

**Interview line:**

> Actions keep the main branch healthy. Jenkins still owns the multi-env release zips in our artifact bucket.

### Runtime config (critical talking point)

From `dashboard/BUILD.md`:

| Kind | Use for | Mechanism |
|---|---|---|
| **Runtime deployment config** | API origins, CDN, storage prefix, Faro on/off | `window.EnvironmentData` |
| **Compile-time fileReplacements** | test / storybook only | `angular.json` |

**Do not** say “we have a different Angular build per QA via fileReplacements for API URLs.”  
**Do** say: stamp `BUILD_ENV` / inject env block; at runtime `index.html` `nd-env-config` can also resolve from **hostname** or `localStorage`.

Resolution order (conceptually):

```text
1) Host / origin detection (idms-qa3… → qa3)
2) BUILD_ENV stamped at build time
3) localStorage override (dev convenience)
4) development defaults (local proxy)
```

---

## 5. App FE — `cloud-front-end-app`

### Jenkins

**File:** `cloud-front-end-app/Jenkinsfile`

Broader than dashboard-only:

1. Checkout **app** + often nested **`cloud`** (for authclient / consoles)  
2. Parallel components: Angular **app** WARs, console v1 grunt, console-v2, etc.  
3. `create-wars` / env zip packs  
4. Upload to same **`s3://netradyne-artifacts/jobs/<JOB>/<BUILD>/`**

Hotfix excludes `*-qa*` uploads.

Also: `Jenkinsfile-console-beta`, `jenkinsfile-sonar-app-projects` (Sonar lint/scan).

### Packaging

| Script | Output |
|---|---|
| `app/custom-builder.js` | Base dist → copy per env → inject `#env-data` / `EnvironmentData` |
| `app/create-wars.sh` | `app-<env>.war` (+ SPA `web.xml` fallback to index) |
| `app/create-zips.sh` | `dashboard-<env>.zip` style packs |

**Why WAR?** Historical Tomcat hosting — SPA still works with 404→`index.html` rewrite.

### Hosted buckets (ops docs)

`app-scripts/s3-buckets/` describes product FE layouts under prefixes like  
`s3://idms-v2/cloud-front-end/{app,console,...}/` and hostnames `app[-env].netradyne.com`.

---

## 6. Local / shared Node hosting (PM2)

Not “production Kubernetes for SPA” in these repos — **dev & shared FE host**:

| Piece | Role |
|---|---|
| `ecosystem.config.cjs` / `ecosystem.config.js` | PM2 process list |
| `stub/node-server/nd-front-end-hosting` (and app sibling) | Express: **static builds** + **API reverse-proxy** to chosen IDMS env |
| Admin UI (~`:3000`) | Upload builds, manage ports |
| Docker (`stub/node-server/Dockerfile`) | Node+PM2 image for the hosting stack |

**Spoken:**

> Locally I don’t hit production APIs blindly. The Node host proxies to staging/qa backends and can serve an uploaded zip/build, or forward to `ng serve` for hot reload.

---

## 7. Backend DevOps (`cloud/`) — FE-engineer depth

Enough to sound credible; don’t claim you own Java deploys unless you do.

### Pattern

```text
Jenkins (Build-Cloud / variants)
  → DB upgrade step (credentials) where applicable
  → Maven build: authserver, restserver, mapserver, task-processor, …
  → Console FE WARs sometimes in same pipeline
  → JUnit / Jacoco
  → Upload s3://netradyne-artifacts/jobs/Build-Cloud/<build>/
```

**Files to name:** `cloud/Jenkinsfile`, `JenkinsPipeline`, `JenkinsHotfix*`, `Jenkins-QA-PR-Build`, Sonar Jenkinsfiles.

### Docker (local stack)

`cloud/docker/docker-compose.yml` — DB + Tomcat/restserver-style services + helpers. Good for “how do you run cloud locally?”

### Config

BE often uses JVM `-Denvironment=...` style flags — different from FE `EnvironmentData`.

### Observability adjacent to CI

- Jacoco coverage  
- Hotfix may pull JMX exporter jar from artifacts S3  
- Sentry DSN often blanked in CI builds  
- Notify SSD on some hotfix pipelines  

---

## 8. Artifact & promotion model

```text
Every successful job
  └── s3://netradyne-artifacts/jobs/<JOB_NAME>/<BUILD_NUMBER>/
        ├── app-staging.zip / app-qa3.zip / app-production.zip …
        ├── buildinfo.txt
        └── (WARs for app/console pipelines)

When BRANCH == release
  └── …/release_build_info/buildnumber.txt   ← “what’s the release build?”
```

| Mode | What gets uploaded |
|---|---|
| Full | All envs in `ENVS` (qa1–qa10 + staging + demo + prod) |
| Hotfix | staging + production (dashboard); exclude `*-qa*` (app) |

**Spoken promotion:**

> We don’t rebuild differently for “which QA” at last mile only — we produce the env matrix up front. Release branch publishes a build-number pointer ops/deploy can consume. Hotfix skips the QA fan-out when we need staging/prod fast.

---

## 9. Build structure (Angular FE)

```text
Source (TS, templates, i18n)
    → ng build (application builder / esbuild)
    → dist/... hashed JS/CSS
    → custom-builder / ci-build-all
         • stamp BUILD_ENV / EnvironmentData
         • rewrite asset URLs to CDN
         • write build-info.json (version / buildTime)
    → zip or war
    → S3 artifacts
```

**New build available UX:** app can poll `build-info` / buildTime and prompt refresh (mentioned in BUILD.md) — good “how do you avoid stale SPA?” answer.

---

## 10. CDN & caching (talking points)

Deep theory + SPA examples: [20_CDN.md](./20_CDN.md).

- Hashed static assets → long cache on `cdn-<env>.netradyne.com`  
- `index.html` → short cache / revalidate (so new deploys pick up new hashes)  
- Direct sync script can invalidate CloudFront when used  

---

## 11. Quality gates around DevOps

| Gate | Where |
|---|---|
| Lint / changed-file policy | GHA `ci-guardrails` |
| Security (CodeQL, dependency-review) | GHA `security-guardrails` |
| Release PR must build | GHA `release-pr-quality` |
| Sonar | `jenkinsfile-sonar-*` / cloud Sonar jobs |
| Playwright / Leica | automation + monorepo tooling (parity during migration) |

---

## 12. Secrets & credentials (how to say it safely)

> Jenkins uses stored **Git SSH credentials** and the build agent’s **AWS IAM/role** for `aws s3 cp`. We don’t commit secrets; Mixpanel/public analytics tokens may be selected per env at stamp time. Local OpenSearch/proxy secrets stay in ignored env files. API auth tokens are runtime user sessions — not baked into the zip.

Never paste credential IDs or tokens in an interview.

---

## 13. Diagram — who does what

```text
┌──────────── GitHub ────────────┐
│ PR → Actions (lint/build/sec)  │
│ release PR quality gate        │
└───────────────┬────────────────┘
                │ merge / trigger
                ▼
┌──────────── Jenkins ───────────┐
│ build-fleet agent              │
│ multi-env FE ZIP/WAR           │
│ cloud BE WARs/JARs             │
└───────────────┬────────────────┘
                ▼
┌──── s3://netradyne-artifacts ──┐
│ jobs/<job>/<build>/…           │
│ release_build_info pointer     │
└───────────────┬────────────────┘
                ▼
┌──── Runtime environments ──────┐
│ qaN / staging / demo / prod    │
│ Tomcat and/or S3+CDN SPA       │
│ auth.* + idms.* + cdn-*        │
└────────────────────────────────┘

Dev laptop → PM2 node-server → proxy to qa/staging APIs
```

---

## 14. Interview Q&A bank

**Q: Walk me through how frontend gets to production.**  
A: Jenkins dashboard/app job on `build-fleet` → Angular build → stamp production env → `app-production.zip` or WAR → S3 artifacts → deploy/promote pipeline or ops sync to prod hosts/CDN. Hotfix can skip QA matrix. Release branch updates buildnumber pointer.

**Q: How do you handle 10 QA environments without 10 codebases?**  
A: One codebase, multi-env stamp. Same bundles, different `EnvironmentData` / CDN/API hosts. Runtime hostname can still select env.

**Q: Why not `environment.prod.ts` fileReplacements for each QA?**  
A: API hosts are deployment config. fileReplacements don’t scale to qa1–qa10 cleanly and mix compile with deploy. We inject/stamp runtime config instead (`BUILD.md` rule).

**Q: What’s the difference between Jenkins and GitHub Actions here?**  
A: Actions = PR quality and security. Jenkins = official multi-env artifacts to `netradyne-artifacts`.

**Q: ZIP vs WAR?**  
A: Dashboard CI emits ZIPs for static/S3-style delivery. App pipeline historically emits WARs for Tomcat with SPA fallback. Same Angular app idea, different packaging.

**Q: How do you test against qa3 locally?**  
A: Point Node hosting proxy / env selector at qa3 backends, or use stamped build / localStorage env override — not by changing source constants.

**Q: Hotfix?**  
A: `HOTFIX_BUILD=true` → only staging + production packages/uploads so we don’t wait on the full QA fan-out.

**Q: Where do artifacts live?**  
A: `s3://netradyne-artifacts/jobs/<jenkinsJob>/<buildNumber>/`.

**Q: Backend deploy in one sentence?**  
A: `cloud` Jenkins builds Java services (and some consoles), runs tests/coverage, uploads WARs/JARs to the same artifacts bucket under Build-Cloud-style jobs; runtime env via JVM flags; local docker-compose for stack pieces.

**Q: How do you know a new FE build is out?**  
A: `build-info.json` / build timestamp stamped at build; client can detect and prompt reload.

**Q: CDN role?**  
A: Hashed assets served from `cdn-<env>.netradyne.com`; builders rewrite index references at stamp time.

**Q: What would you improve?**  
A: Clearer deploy automation visibility from zip→live, stronger env parity tests, maybe fewer env copies if runtime config-only deploy becomes fully dynamic — but multi-stamp is proven for our QA matrix.

---

## 15. Spoken scripts

### 45s — “Tell me about DevOps on your project”

> Frontend ships through Jenkins on a dedicated build fleet. We build the Angular app, stamp qa through production configs without separate fileReplacement matrices for APIs, package zip or war, and land everything in an S3 artifacts bucket. Hotfix narrows to staging and prod. GitHub Actions gates PRs. Locally a PM2 Node host proxies APIs and serves builds. Backend cloud pipelines follow the same artifact-to-S3 idea with Maven WARs.

### 90s — deeper FE path

> For NUX dashboard, `Jenkinsfile-app-dashboard-frontend` checks out the branch, uses Node 22 via nvm, prefers `ci-build-all.js` to produce `app-<env>.zip` for staging, qa1–qa10, demo, and production, then uploads to `s3://netradyne-artifacts`. Environment isn’t Angular fileReplace for hosts — `BUILD.md` defines runtime `EnvironmentData`, and the index bootstrap can also resolve from hostname. CDN URLs get rewritten per env. The older app repo still produces WARs via `create-wars` and can build consoles alongside by checking out `cloud`. That’s how we keep one codebase across many IDMS environments.

---

## 16. Cheat card (glance before call)

```text
CI owner:     Jenkins (build-fleet) > Actions (PR quality)
FE repos:     cloud-front-end (dashboard ZIP) · cloud-front-end-app (WAR)
BE repo:      cloud (Maven + Docker compose local)
Envs:         qa1–qa10 · staging · demo · production
Hotfix:     staging + production only
Artifacts:    s3://netradyne-artifacts/jobs/<job>/<build>/
Release ptr:  release_build_info/buildnumber.txt
Config:       EnvironmentData / BUILD_ENV — NOT fileReplace for APIs
CDN:          cdn-<env>.netradyne.com
Local:        PM2 node-server proxy + static builds
Builders:     ci-build-all.js · custom-builder.js · create-wars.sh
Doc:          dashboard/BUILD.md
```

---

## 17. Practice checklist

- [ ] Draw Git → Jenkins → S3 → env hosts  
- [ ] Explain stamp vs fileReplacements  
- [ ] Name ENVS + hotfix difference  
- [ ] Name Jenkinsfile for dashboard  
- [ ] Explain ZIP vs WAR  
- [ ] Explain Node PM2 host purpose  
- [ ] One sentence on `cloud` backend pipeline  
- [ ] Deliver 45s DevOps opener without notes  

---

## 18. Files to reopen if you forget details

| Topic | Path under `Desktop/Ternary` |
|---|---|
| Dashboard Jenkins | `cloud-front-end/Jenkinsfile-app-dashboard-frontend` |
| Runtime config rules | `cloud-front-end/dashboard/BUILD.md` |
| CI build all | `cloud-front-end/dashboard/ci-build-all.js` |
| App Jenkins | `cloud-front-end-app/Jenkinsfile` |
| WARs | `cloud-front-end-app/app/create-wars.sh` |
| PM2 / host | `cloud-front-end/ecosystem.config.cjs`, `stub/node-server/...` |
| BE Jenkins | `cloud/Jenkinsfile` |
| Env list helper | `cloud/build-envs.js` |
