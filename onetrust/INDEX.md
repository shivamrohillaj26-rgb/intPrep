# OneTrust — interview prep (all files here)

Open this folder first. Don’t hunt in `scenario-based-questions/`.

| # | File | Use when |
|---|---|---|
| 1 | [ONETRUST_ANGULAR_FRONTEND_PREP.md](./ONETRUST_ANGULAR_FRONTEND_PREP.md) | Process, what they test, 5-day plan, consent-UI answers |
| 2 | [ONETRUST_RESUME_MFE_STORY.md](./ONETRUST_RESUME_MFE_STORY.md) | Resume grill, IDMS journey, MFE conversion, CI/CD, juniors |
| 3 | [ONETRUST_NUX_I18N_GLOSSARY.md](./ONETRUST_NUX_I18N_GLOSSARY.md) | How NUX translations + **glossary** work (`cloud-front-end`) |
| **4** | **[ONETRUST_MFE_SENIOR_ROUND.md](./ONETRUST_MFE_SENIOR_ROUND.md)** | **“How are you implementing MFE?”** — **§2b Module Federation vs Native Federation**, Nx, deploy, Q bank |
| **5** | **[ONETRUST_NX_MONOREPO.md](./ONETRUST_NX_MONOREPO.md)** | **What is Nx / why / how it helps the build** |
| **6** | **[ONETRUST_ANGULAR_DI_PROVIDERS.md](./ONETRUST_ANGULAR_DI_PROVIDERS.md)** | **R1 miss:** `providedIn`, providers array, useClass/Factory/Existing, InjectionToken |
| **7** | **[ONETRUST_ENVIRONMENT_STORY.md](./ONETRUST_ENVIRONMENT_STORY.md)** | **Env + APIs** — **§1b file-to-file** (`nd-env-config`, stamp, `getAuthRuntimeConfig`) |
| **8** | **[ONETRUST_WEBPACK_ESM.md](./ONETRUST_WEBPACK_ESM.md)** | **“What is Webpack / ES modules?”** — bundler vs ESM, why Native Federation isn’t Webpack MF |
| **9** | **[ONETRUST_TESTING_JEST_E2E.md](./ONETRUST_TESTING_JEST_E2E.md)** | **Unit (Vitest/`ng test`) + Playwright E2E + write-a-test + kernel** |
| **10** | **[ONETRUST_MVC_MVVM.md](./ONETRUST_MVC_MVVM.md)** | **MVC vs MVVM** — Angular mapping, what NUX actually uses |
| **11** | **[ONETRUST_NOTIFICATIONS_FCM.md](./ONETRUST_NOTIFICATIONS_FCM.md)** | **Bell / push** — FCM, not WebSocket, not interval polling |
| **12** | **[ONETRUST_PACKAGE_JSON_LOCK.md](./ONETRUST_PACKAGE_JSON_LOCK.md)** | **`package.json` vs `package-lock.json`** — why both, trap Qs |
| **13** | **[ONETRUST_INFINITE_VIRTUAL_SCROLL.md](./ONETRUST_INFINITE_VIRTUAL_SCROLL.md)** | **Infinite scroll + CDK virtual scroll** — NUX what we use |
| **14** | **[ONETRUST_CURSOR_SKILLS_RULES.md](./ONETRUST_CURSOR_SKILLS_RULES.md)** | **Cursor `SKILL.md` vs rules vs `AGENTS.md`** — agent entry point |
| **15** | **[ONETRUST_AUTH_FLOW.md](./ONETRUST_AUTH_FLOW.md)** | **R3 AuthFlow** — token + session why both, 401 refresh, guards, HttpOnly shift story (deep dump) |
| **16** | **[ONETRUST_BUILD_DEPLOY_ENVS.md](./ONETRUST_BUILD_DEPLOY_ENVS.md)** | **R3 Build / Jenkins / multi-env / MFE S3** |
| **17** | **[ONETRUST_SSO.md](./ONETRUST_SSO.md)** | **R3 SSO** — status check, redirect, `state`, authcode (FE only) |
| **18** | **[ONETRUST_IFRAME_BRIDGE.md](./ONETRUST_IFRAME_BRIDGE.md)** | **Iframe leftover `/app`** — how we embed, postMessage catalog, shared auth |
| **19** | **[ONETRUST_AUTH_REVISION.md](./ONETRUST_AUTH_REVISION.md)** | **Auth revision** — diagrams + Q&A branches (start here before file 15) |
| **20** | **[ONETRUST_OAUTH_JWT_SESSION.md](./ONETRUST_OAUTH_JWT_SESSION.md)** | **OAuth vs 1 vs 2 vs JWT vs why session** — concepts only, not the login walkthrough |
| **21** | **[ONETRUST_HTTPONLY_MFE_AUTH.md](./ONETRUST_HTTPONLY_MFE_AUTH.md)** | **HttpOnly cookies on MFE** — plan for kernel auth, refresh, session, CSRF |
| **22** | **[ONETRUST_JENKINS_ENV_DEPLOY.md](./ONETRUST_JENKINS_ENV_DEPLOY.md)** | Deep Jenkins CI vs CD / env zips (long) |
| **23** | **[ONETRUST_CICD.md](./ONETRUST_CICD.md)** | **START HERE CI/CD** — Jenkins build/deploy + `nd-env-config` + `BUILD_ENV` (one picture) |
| **24** | **[ONETRUST_MFE_AUTH.md](./ONETRUST_MFE_AUTH.md)** | **START HERE MFE auth** — host vs kernel vs remote; POC vs HttpOnly next |
| **25** | **[ONETRUST_IFRAME_AUTH.md](./ONETRUST_IFRAME_AUTH.md)** | **START HERE iframe auth** — leftover `/app`, snapshots, how to present |
| **26** | **[ONETRUST_ESM_IMPORT_MAPS.md](./ONETRUST_ESM_IMPORT_MAPS.md)** | **START HERE ESM / import maps / Webpack vs NF** |
| **27** | **[ONETRUST_CICD_NX_MFE.md](./ONETRUST_CICD_NX_MFE.md)** | **“Explain current CI/CD” + how it looks with Nx + MFE** (diagrams + spoken) |
| **28** | **[ONETRUST_ANGULAR_OPTIMIZATION.md](./ONETRUST_ANGULAR_OPTIMIZATION.md)** | **R3 “optimize the Angular app”** — load / bundle / CD / lists / MFE vs Nx |
| **29** | [ANGULAR_NGMODULE_VS_STANDALONE.md](../angular-interview-prep/ANGULAR_NGMODULE_VS_STANDALONE.md) | **NgModule vs standalone** (old vs latest Angular architecture) |
| **30** | [ANGULAR_SIGNALS_VS_RXJS.md](../angular-interview-prep/ANGULAR_SIGNALS_VS_RXJS.md) | **Signals vs RxJS** — not alternatives |
| **31** | **[ONETRUST_HM_ROUND.md](./ONETRUST_HM_ROUND.md)** | **Hiring Manager (30 min)** — after R3: fit, STAR, why OneTrust, traps |

**If she only asks MFE:** file **4** first. **If she asks MFE auth / where is login / remotes share session:** file **24**.  
**If she asks iframe / leftover pages / how auth works in iframe:** file **25** (snapshots) then **18** if she wants the full bridge catalog.  
**If she asks auth / login / refresh / JWT storage:** file **19** (diagrams) then **15** if you need the long walkthrough.  
**If she asks HttpOnly / cookies / MFE auth migration:** file **24** (placement) then **21** (cookie flags).  
**If she asks SSO / SSO check / Okta redirect:** file **17**.  
**If she asks CI vs CD / Jenkins / env zip / nd-env-config / BUILD_ENV:** file **23** first. Deep: **22**, **7**, **16**.  
**If he asks “explain your CI/CD” and “how does it change with Nx / MFE”:** file **27**.  
**If they ask optimize / bundle size / dashboard slow / OnPush / lazy / MFE performance:** file **28**.  
**If they ask NgModule vs standalone / AppModule / bootstrapApplication:** file **29**.  
**If they ask Signals vs RxJS / do signals replace Observables:** file **30**.  
**Hiring Manager / 30 min / why OneTrust / STAR / notice:** file **31**. Do **not** restudy R3 auth/CI.  
**If she asks ESM / import maps / Webpack vs Native Federation:** file **26** first. Deep: **8**.  
**If she asks tests / Jest / E2E:** file **9**.  
**If she asks MVC / MVVM / Angular architecture:** file **10**.  
**If she asks notifications / polling / WebSocket push:** file **11**.  
**If she asks package.json / lockfile:** file **12**.  
**If she asks infinite scroll / virtualization / CDK:** file **13**.  
**If she asks Cursor / skills.md / how the agent starts:** file **14**.  
**Study order (R3):** **`20` OAuth/JWT/session concepts** → **`19` Auth revision diagrams** → **`15` AuthFlow** if a follow-up goes deep → **`25` iframe auth** → **`23` CI/CD** → **`27` CI/CD vs Nx+MFE** if they ask the conversion pipeline → **`24` MFE auth** → **`4` + `26`** MFE / ESM+import maps → **`28` optimize Angular** if they go architecture/perf → rest as needed.  
**Older study order:** `4` → **`8` Webpack/ESM if they go tooling** → **`12` package.json/lock** → **`9` tests** → **`10` MVC/MVVM** → **`11` notifications** → **`13` infinite/virtual scroll** → **`14` Cursor skills** → `2` §0 journey → `2` §8 CI/CD → **`7` env** → `1` → `3` → `6`

Angular/JS deep dives stay in their folders; OneTrust files **link out**.
