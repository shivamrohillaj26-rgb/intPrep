# GOC — Job description (source of truth)

**Title:** Front-end Developer, Senior Specialist  
**Employer:** Google Operations Center (GOC)  
**Your copy:** 5–8 years FE; Angular; HTML5 / CSS3 / JS / TS; Webpack / Vite; Git; state management; Traditional + Headless CMS.

---

## Role overview (their words)

Develop **responsive, scalable, reusable** front-end components using modern JS frameworks while **optimizing performance** for speed and scalability across devices.

## Responsibilities → what they will probe

| JD line | They want to hear | Your repo file |
|---|---|---|
| Build reusable UI | Components, design-system thinking, inputs/outputs, not one-off CSS | Practice `/q6` button; Angular content/templates |
| Optimize performance | Diagnose **load vs interaction**; Core Web Vitals; CD, lazy routes, images, lists | [ANGULAR_OPTIMIZE_APPLICATION.md](../angular-interview-prep/ANGULAR_OPTIMIZE_APPLICATION.md), CRP + bundles |
| Work with UI/UX | Feasibility, tokens, a11y, “I don’t dump the Figma 1:1 if it kills perf” | Behavioral: designer conflict |
| Clean, testable, Google-standard reviews | TestBed, trackBy, no template-fn CD traps, PR comments you’d actually leave | [UNIT_TESTING.md](../angular-interview-prep/UNIT_TESTING.md), [ANGULAR_TEMPLATE_FUNCTIONS_CD.md](../angular-interview-prep/ANGULAR_TEMPLATE_FUNCTIONS_CD.md) |

## Minimum qualifications → honest mapping

| Must-have | You | How to say it |
|---|---|---|
| 5–8 years FE | Netradyne SSE + TCS | Years + **scale** (fleet dashboard, auth, tables), not just years |
| HTML5 / CSS3 / JS / TS | Strong | Flex/grid, box model, **pseudo-class vs element**, event loop, closures, TS types — [GOC_CSS.md](./GOC_CSS.md) |
| Angular | Daily | Lifecycle, DI, RxJS, signals, OnPush — pick depth, don’t list APIs |
| Webpack / Vite | Angular CLI / application builder | “CLI used Webpack historically; v17+ esbuild/Vite application builder” — [ANGULAR_BUILD_ESM_WEBPACK_ESBUILD.md](../angular-interview-prep/ANGULAR_BUILD_ESM_WEBPACK_ESBUILD.md) |
| Git | Daily | PR reviews, bisect, not “I know commit” |
| State management | NgRx / signals / RxJS | [ANGULAR_NGRX_DATA_FLOW.md](../angular-interview-prep/ANGULAR_NGRX_DATA_FLOW.md) |
| CMS (coupled + headless) | **Likely the gap** | Transferable story in [GOC_CMS_HEADLESS.md](./GOC_CMS_HEADLESS.md) — don’t fake Brightspot years |

## Preferred

- CS / IT degree — mention if you have it; skip if not.
- Hands-on Brightspot, AEM, Contentful, **or** Drupal — preferred, not a hard fail. Interviewers still ask **concepts**.

## What this role is *not*

- Not a pure Google L4 frontend loop (though some teams still throw JS DSA).
- Not “only React” — **this JD names Angular**. Other GOC FE teams *are* React (see L1 experience in [GOC_PREVIOUS_QUESTIONS.md](./GOC_PREVIOUS_QUESTIONS.md)). If they ask React: map Virtual DOM → Angular CD / Ivy; Redux slices → NgRx feature stores.

## Questions to ask *them* (shows you read the JD)

1. Is this team closer to **marketing/CMS sites** (Brightspot/AEM) or **internal Angular tools**?
2. What’s the split: new components vs maintaining existing properties?
3. How do you measure FE quality — Lighthouse, Web Vitals, a11y audits, design QA?
4. How do designers hand off — Figma tokens, Brightspot preview, Storybook?
