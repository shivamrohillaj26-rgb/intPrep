# OneTrust — NUX build, multi-env stamp, deploy (today vs MFE on S3)

**Prefer the short card:** [ONETRUST_CICD.md](./ONETRUST_CICD.md). This file is the longer R3 card + MFE S3.

**Round 3.** “How do you build and deploy?” · “How do you handle QA1…N?” · “How will that work in micro-frontends / S3?”

**Grounded in:** `cloud-front-end` Jenkins (`Jenkinsfile-app-dashboard-frontend`), `dashboard/ci-build-all.js`, `custom-builder.js`, `s3-sync-deploy.sh`.  
**MFE POC:** Native Federation host + remotes → **S3 + CloudFront** prefixes (`/mfe/<remote>/`), not a second Tomcat app.  
**Do not say** laptop folder names, AWS profile names, or treat the POC as production.

**Related:** **big Jenkins build-vs-deploy diagrams** → [ONETRUST_JENKINS_ENV_DEPLOY.md](./ONETRUST_JENKINS_ENV_DEPLOY.md) · [ONETRUST_ENVIRONMENT_STORY.md](./ONETRUST_ENVIRONMENT_STORY.md) (runtime URLs) · [ONETRUST_MFE_SENIOR_ROUND.md](./ONETRUST_MFE_SENIOR_ROUND.md) §4 · [frontend-system-design/18_NETRADYNE_DEVOPS_CI_CD.md](../frontend-system-design/18_NETRADYNE_DEVOPS_CI_CD.md)

If they say “six environments”: **Jenkins stamps qa1–qa10 + staging + demo + production** (hotfix = staging+prod only). **Six** in the MFE story is **six remotes** (devices, safety, video, fleet, provisioning, admin) — not six backends.

---

## 0. 45s opener

> **Today’s NUX dashboard is one Angular app.** Jenkins on **`build-fleet`**, Node **22**, `npm` install cached by `package.json` hash. We **`ng build` once** (esbuild application builder), then **`ci-build-all.js` copies that dist and stamps each env** — `BUILD_ENV`, commit meta, CDN rewrite of hashed JS/CSS in `index.html` — and zips **`app-qa3.zip`**, **`app-staging.zip`**, … Upload to **`s3://netradyne-artifacts/jobs/<job>/<build>/`**. Ops/CDN serving is **promote that zip**, not a new compile. GitHub Actions is **PR quality**, not the release train.  
> **APIs are not baked per QA via `fileReplacements`.** The zip for qa3 has `BUILD_ENV='qa3'`; in the browser, **`nd-env-config`** still resolves **idms / auth / api / cdn** hosts. On a real IDMS hostname, **origin wins**.  
> **MFE conversion** is already on a **testing S3/CDN prefix**, isolated from live `/dashboard/`. Host + `federation.manifest.json`; remotes under **`/mfe/devices/`** etc. so **S3 path ≠ Angular route**. We can **sync one remote** without rebuilding the world. Same **EnvironmentData** for APIs; **manifest URLs** differ per CDN. Company rule: **build once, promote the same digest** QA → staging → prod.

---

## 1. How the build happens (cloud-front-end today)

### Local

```text
cd dashboard
npm ci / npm i          ← lockfile
npm run i18n:generate   ← often prestart / prebuild
ng serve  :4500 /app    ← through localhost:8080 proxy for auth
ng test / Playwright
```

`prebuild` runs i18n + template validators. Production-shaped: `ng build` / `custom-builder.js`.

### Jenkins (what you name)

| Piece | Fact |
|---|---|
| Job | Dashboard frontend pipeline, agent **`build-fleet`** |
| Param | **`BRANCH`**, **`HOTFIX_BUILD`** |
| Node | **v22.14.0** (nvm) |
| Cache | `node_modules` keyed off dashboard `package.json` md5 |
| Happy path | `node ci-build-all.js --zip-to WebContent <envs>` |
| Fallback | Loop `custom-builder.js --configuration <env>` (rebuild each — slower) |

### `ci-build-all.js` (the important idea)

```text
1. ONE Angular production build  →  dist/.../browser  (hashed JS/CSS)
2. For each env in the list:
     copy dist → dist/ci/<env>/
     patch index.html:
       BUILD_ENV = 'qa3' | 'staging' | …
       BUILD_TIME, commit hash/msg
       rewrite script/link tags → cdn-<env>.netradyne.com
     write build-info.json
     validate EnvironmentData / AUTH_SERVER_ORIGIN present
     zip → WebContent/app-<env>.zip
```

**Spoken:** “Compile once, stamp many. Stamping is seconds; the expensive part is `ng build`.”

Default env list in script (same as full Jenkins, not hotfix):

`staging`, `qa1`…`qa10`, `demo`, `production`

**Hotfix:** only **`staging` + `production`** zips — skip the QA matrix.

---

## 2. How it gets deployed (today)

```text
GitHub PR  →  Actions (lint, quality build)     ← does not ship customers
     │
     ▼
Jenkins    →  app-qa3.zip, app-staging.zip, …
     │
     ▼
s3://netradyne-artifacts/jobs/<JOB_NAME>/<BUILD_NUMBER>/
     │
     ▼
If BRANCH=release → write release_build_info/buildnumber.txt  (pointer)
     │
     ▼
Ops / CDN  →  unpack onto the env’s static host
             (cdn-qa3… / idms-qa3…  — same zip family)
```

**Artifact bucket ≠ the user-facing CDN.** Jenkins stores **zips**. Live pages are **CDN / IDMS origin** after promote.

**Optional testing path:** `s3-sync-deploy.sh` syncs a **built dist** to a **testing S3 bucket** + optional CloudFront invalidation. Same bucket can host several prefixes; **backend still comes from `BUILD_ENV` / hostname**, not from “which bucket.” Don’t mix this with **prod Jenkins zips**.

**GHA vs Jenkins:** Actions keep `main`/`release` PRs green. **Release artifacts = Jenkins.**

---

## 3. Multiple environments (how we handle 1…N)

### What an “environment” is

| Layer | What changes |
|---|---|
| **Backend** | `idms-qa3`, `auth-qa3`, `api-qa3`, `cdn-qa3` (prod has **no** `-qaN` on idms/auth/api; CDN is `cdn-production`) |
| **API paths** | **Same** (`/authserver/api/v1`, `/restserver/api/v1`, …) |
| **Stamp** | `BUILD_ENV` in that env’s **zip** + CDN asset host |
| **Runtime** | `window.EnvironmentData` from `index.html` script **before Angular** |
| **localStorage** | `{env}::` prefix for most keys; **bare** `token`/`session` shared with legacy apps |

**On a real IDMS host, origin wins** — opening `idms-qa3.netradyne.com` is qa3 even if someone left `BUILD_ENV` weird. Stamp still matters on **CloudFront/S3 origins** that are not IDMS hostnames, and for **CDN chunk URLs**.

### Matrix (say the real list)

| Kind | Names |
|---|---|
| QA | **qa1 – qa10** |
| Shared | **staging**, **demo**, **production** |
| Local | **development** — empty origins, Node **proxy** |
| Extra | **testing** (and similar) on some scripts / testing S3 |

We do **not** maintain 13 Angular `environment.qa7.ts` files for API URLs.

### If she says “we have six environments”

> If she means **QA lanes**, we actually have **ten QAs** plus staging/demo/prod — Jenkins full build stamps **all of them** from one compile.  
> If she means **MFE**, the POC has **six independently deployable remotes**, still talking to **whatever backend the host’s EnvironmentData says**.

---

## 4. Micro-frontends + S3 (conversion — not prod yet)

**Prod today:** still **one zip**, whole dashboard.  
**POC:** static files on **S3 + CloudFront**. Angular is not “running on EC2.” EC2 is for APIs.

```text
s3://<testing-bucket>/nux-poc-…/     ← isolated from live /dashboard and /app
  index.html                         HOST
  federation.manifest.json           name → remoteEntry URL
  main-*.js
  mfe/
    devices/remoteEntry.json + chunks
    safety/
    video/
    fleet/
    provisioning/
    admin/
```

**Why `/mfe/devices/` not `/devices/`:** Angular route `#/devices` vs S3 folder. Refresh must load **host** `index.html`, not a missing `devices/index.html`. Hash routing is the static-hosting fix.

**Independent deploy (already scripted):**

```text
build + sync only mfe/admin/     → host + devices files untouched
build + sync host + manifest     → remotes unchanged
```

**Environments in MFE (this is the punchline):**

| Concern | Monolith today | MFE target |
|---|---|---|
| **Which API?** | Stamp + hostname → `EnvironmentData` | **Same.** Host runs `nd-env-config`, **provides tokens**; remotes `inject(API_URL)`. **Do not rebuild remotes per QA.** |
| **Which JS?** | One `app-qa3.zip` (same JS, stamped HTML/CDN) | **Per app SHA folder** `mfe/devices/<sha>/` |
| **How QA vs prod differ** | Different **zip stamp** + **CDN** + **promote** | **Same digest** promoted; **host manifest** on qa3 CDN points at qa3 prefixes; prod manifest points at prod prefixes |
| **Team ships devices** | Rebuilds **entire** dashboard | Ship **devices** artifact; bump **one manifest key** |

```text
devices pipeline  →  devices:<git-sha>  →  s3 …/mfe/devices/<sha>/
host pipeline     →  host:<sha> + federation.manifest.json
                         "devices": ".../mfe/devices/<sha>/remoteEntry.json"

QA smoke → promote SAME objects to staging/prod CDNs
Rollback → manifest previous SHA (one remote)
```

**Kernel** is a **library**, not an S3 site: version bump, consumers rebuild.

**Nx:** `affected` so a devices PR doesn’t rebuild safety. Federation is **runtime**; Nx is **CI graph**.

---

## 5. Draw this if they want one picture

```text
                 ┌─ ng build (once)
                 │
         Jenkins ┤─ stamp qa1…qa10, staging, prod  →  zips  →  artifacts S3
                 │
                 └─ (hotfix) stamp staging+prod only

Browser on idms-qa3
  origin → EnvironmentData → auth-qa3 / api-qa3
  JS from cdn-qa3

──────── conversion ────────
Host index + manifest on CDN
Remotes /mfe/<name>/<sha>/
Same EnvironmentData for APIs
Independent remote sync
```

---

## 6. Q bank

**Q: Different Angular build per QA?**  
No. **One compile**, many stamps. APIs from **runtime** `EnvironmentData`.

**Q: Where do artifacts go?**  
Jenkins → **`netradyne-artifacts`**. Users hit **CDN/IDMS**, not that bucket.

**Q: GitHub Actions deploy?**  
No. **Quality gate.** Jenkins ships zips.

**Q: MFE = 13 builds of devices?**  
No. **One devices digest**; host/env **manifest + EnvironmentData** choose API and URLs.

**Q: Why S3 for MFE?**  
Static `index.html` + JS. Independent prefixes. CloudFront cache. EC2 for **APIs**, not as the UI CDN.

**Q: Hotfix?**  
Skip QA matrix; **staging + production** only.

---

## 7. Don’t mix

- Runtime URL resolution detail → file **7**.  
- Native Federation vs Webpack MF → file **4**.  
- Auth tokens after deploy → file **15**.
