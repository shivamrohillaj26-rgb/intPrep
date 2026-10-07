# Micro Frontends — Interview Prep Index

All MFE / Module Federation guides live in this folder.

**Study order for a Module Federation JD (e.g. 1finity / Fujitsu):**  
**Run** [`../mfe-separate-repos/`](../mfe-separate-repos/) → **`13` (understand the demo)** → `12` (IDMS) → `10` / `11` → `08` → `06` → `07`

---

## Guides

| # | Topic | File |
|---|---|---|
| 01 | Micro frontends overview (host/remote, Native vs Webpack MF, when not to) | [01_MICRO_FRONTENDS_OVERVIEW.md](./01_MICRO_FRONTENDS_OVERVIEW.md) |
| 02 | Deep NUX IDMS breakup (domains, connection layers, migration) | [02_MICRO_FRONTENDS_DEEP_NUX_BREAKUP.md](./02_MICRO_FRONTENDS_DEEP_NUX_BREAKUP.md) |
| 03 | Interview story — shell + iframe today, federation next | [03_MFE_INTERVIEW_STORY_NUX_IDMS.md](./03_MFE_INTERVIEW_STORY_NUX_IDMS.md) |
| 04 | **NUX Module Federation split plan** (“what we’re planning”) | [04_NUX_MODULE_FEDERATION_SPLIT_PLAN.md](./04_NUX_MODULE_FEDERATION_SPLIT_PLAN.md) |
| 05 | Scenario: Product / Checkout / User teams | [05_MODULE_FEDERATION_THREE_TEAMS_SCENARIO.md](./05_MODULE_FEDERATION_THREE_TEAMS_SCENARIO.md) |
| 06 | **“How did you implement MFE?”** spoken + **DevOps** (foolproof) | [06_HOW_I_IMPLEMENTED_MFE_SPOKEN.md](./06_HOW_I_IMPLEMENTED_MFE_SPOKEN.md) |
| 07 | **Native Federation vs Module Federation** | [07_NATIVE_VS_MODULE_FEDERATION.md](./07_NATIVE_VS_MODULE_FEDERATION.md) |
| 08 | **cloud-front-end MFE split FOOLPROOF** (real routes/AppFrame map) | [08_CLOUD_FRONT_END_MFE_SPLIT_FOOLPROOF.md](./08_CLOUD_FRONT_END_MFE_SPLIT_FOOLPROOF.md) |
| 09 | **Running Angular MFE demo walkthrough** | [09_MFE_ANGULAR_DEMO_WALKTHROUGH.md](./09_MFE_ANGULAR_DEMO_WALKTHROUGH.md) |
| 10 | **File-by-file study path** (which files to open, in order) | [10_MFE_DEMO_FILE_BY_FILE.md](./10_MFE_DEMO_FILE_BY_FILE.md) |
| 11 | **Polyrepo hands-on** (separate folders = separate repos) | [11_MFE_POLYREPO_HANDSON.md](./11_MFE_POLYREPO_HANDSON.md) |
| 12 | **Create your own for IDMS** (demo step → real env / npm registry) | [12_IDMS_MFE_CREATE_YOUR_OWN.md](./12_IDMS_MFE_CREATE_YOUR_OWN.md) |
| 13 | **Understand the demo we built** (deep walkthrough) | [13_MFE_DEMO_UNDERSTANDING.md](./13_MFE_DEMO_UNDERSTANDING.md) |

**Runnable demos:**  
- Monorepo: [`../mfe-angular-demo/`](../mfe-angular-demo/) (`npm run start:all`)  
- Polyrepo: [`../mfe-separate-repos/`](../mfe-separate-repos/) (`./scripts/start-all.sh`)

---

## Related (outside this folder)

| Topic | Path |
|---|---|
| IDMS project HLD | [../frontend-system-design/16_NETRADYNE_IDMS_PROJECT_HLD.md](../frontend-system-design/16_NETRADYNE_IDMS_PROJECT_HLD.md) |
| CDN (host remoteEntry) | [../frontend-system-design/20_CDN.md](../frontend-system-design/20_CDN.md) |
| DevOps / env stamp | [../frontend-system-design/18_NETRADYNE_DEVOPS_CI_CD.md](../frontend-system-design/18_NETRADYNE_DEVOPS_CI_CD.md) |
| Route guards / CanMatch | [../angular-interview-prep/ANGULAR_ROUTE_GUARDS.md](../angular-interview-prep/ANGULAR_ROUTE_GUARDS.md) |
| Shared Angular library | [../angular-interview-prep/ANGULAR_SHARED_LIBRARY.md](../angular-interview-prep/ANGULAR_SHARED_LIBRARY.md) |

---

## Quick openers

**What are MFEs?** Independently built/deployed UIs composed at runtime by a host.  
**How connected?** remoteEntry/manifest load + shared framework singletons + URL/API + platform auth.  
**NUX today?** Shell + iframe strangler; federation is the planned next step — see `03` + `04`.
