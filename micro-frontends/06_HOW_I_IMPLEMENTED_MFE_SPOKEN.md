# “How did you implement micro frontends?” — Spoken (cloud-front-end)

**Ground truth plan:** [08_CLOUD_FRONT_END_MFE_SPLIT_FOOLPROOF.md](./08_CLOUD_FRONT_END_MFE_SPLIT_FOOLPROOF.md)  
**Assume:** You **implemented** this on `cloud-front-end/dashboard` (NUX).

---

## 90s DEFAULT (use this)

> On Netradyne IDMS **cloud-front-end** NUX I implemented a **micro frontend host/remote architecture**. The NUX shell is the **host** — OAuth, Bearer interceptor, tenant context, permission guards, megamenu, and the federation manifest.  
>  
> We split native product domains into **Module Federation remotes** (Native Federation on our Angular esbuild builder — same MF model). First we shipped **two apps**: the shell host and one big federated remote packing native islands — video access, Greenzone, safety dashboard, fleet maps, HOS, native settings. Then we domain-split that remote into Safety/Video, Fleet, Compliance, Settings. Remotes **expose route trees**; the host `loadChildren`s them behind **canMatch**. Shared singletons are Angular, RxJS, PrimeNG, NDS, auth/tenant; HLS and Mapbox stay inside Safety/Fleet.  
>  
> **Some pages still come from iframes** — Reports, Device Action Center, coaching tasks, all-configurations, subscriptions — those are `embedded-only` leftovers in our AppFrame map, composed with a typed postMessage bridge. Iframe is the strangler lane, not the main pattern. Most UX is host + MF remotes.  
>  
> **DevOps:** separate Jenkins pipelines per host/remote, multi-env stamp, S3 artifacts, `cdn-<env>`, short-cached **manifest** for remote versions — rollback by pointing the manifest at the previous remote SHA.

---

## 30s

> Host = NUX shell. Remotes = Module Federation for native domains (started as shell + one big remote, then Safety/Fleet/HOS/Settings). Leftover unfinished pages still iframe via AppFrame. Separate pipelines, CDN, manifest rollback.

---

## “We split into 2 apps” (specific ask)

> Yes. First cut was **two deployables**: **idms-shell** (host) and **mfe-nux-domains** (one federated remote with all nativized features). The transitional app remains only to serve **iframe leftovers**. After that was stable we split the big remote into domain remotes without changing the host contract.

---

## Deep follow-ups (short)

| Ask | Answer |
|---|---|
| What’s host? | Auth, tenant, permissions, menu, manifest, AppFrame for leftovers |
| What’s remote? | Exposed `./Routes` on CDN — Safety/Video first, then Fleet, HOS, Settings |
| Why iframe still? | Only `embedded-only` keys not nativized yet |
| Connected how? | MF loadRemote + shared singletons; iframe + postMessage for leftovers |
| Shared deps? | Angular/RxJS/PrimeNG/NDS/auth; not HLS/maps |
| Deploy? | Jenkins per app → stamp → S3 → cdn-<env> → manifest |
| Rollback? | Previous remote version in manifest |

---

## Cheat card

```text
IMPLEMENTED on cloud-front-end/dashboard
HOST: shell
MF:   native domains (2-app first → domain remotes)
IFRAME: leftovers only (reports, DAC, coaching tasks, configs…)
DEVOPS: Jenkins + stamp + S3 + cdn-<env> + manifest
```
