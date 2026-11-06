# NUX translations + glossary (from `cloud-front-end`)

**Code:** `Ternary/cloud-front-end/dashboard`  
**Use in OneTrust:** they care about **i18n / a11y / design-system**. This is how IDMS NUX actually does it — speak this, not “we use ngx-translate.”

Canonical docs in the product repo:

- `dashboard/docs/i18n/glossary-governance.md`
- `dashboard/docs/features/TRANSLATIONS.md`
- `dashboard/.cursor/rules/i18n-single-glossary.mdc`
- Tooling: `dashboard-tooling/i18n/`

---

## 0. 45s spoken

> In NUX we don’t put translated JSON in every component. Developers author **English only** — flat files `key → English phrase` under `src/app/i18n/source/*.en.json`. All other languages live in **one glossary**: `docs/i18n/glossary.json`. The glossary is keyed by the **English sentence**, not the key — so “Save” is translated once and reused. Translators work in a sibling `localisation-content` repo; we **import** that into the glossary with tooling. Build generates per-language runtime bundles. In the UI we use `I18nService` and `| t` (`TranslatePipe`). Brand names like Driveri™ are **protected terms** — they must survive translation. I never hand-edit `glossary.json`.

---

## 1. Two maps (this is the glossary idea)

| File | Key | Value |
|---|---|---|
| **English source** `*.en.json` | `alertsPlayer.pageTitle` | `"Alert Player"` |
| **Glossary** `glossary.json` | `"Alert Player"` (the phrase) | `{ "de-de": "Alarm-Player", "ja-jp": "…" }` |

```text
Component: {{ 'alertsPlayer.pageTitle' | t }}
                │
                ▼
         English source  →  "Alert Player"
                │
                ▼
         glossary.json["Alert Player"]["de-de"]  →  "Alarm-Player"
                │
                ▼
         generated runtime bundle for de-de
```

**Why key the glossary by English, not by `alertsPlayer.pageTitle`?**

- Same sentence in two features = **one** translation (glossary is a phrase dictionary).
- New language = add `es-es` under existing phrases, not a new folder tree.
- Missing `de-de` for one phrase is a **local gap**, not a missing file.

That is the **glossary concept**: English phrase is the stable identity for all locales.

**Keys** (`shell.videoAccess.…`) are for **code** — typed, namespaced, refactor-safe.  
**Phrases** are for **translators**.

---

## 2. What you edit vs what tooling owns

| Who | Touches |
|---|---|
| **You (dev)** | `src/app/i18n/source/*.en.json` only |
| **Docs / localisation team** | sibling `localisation-content` repo |
| **Tooling** | imports → `docs/i18n/glossary.json` |
| **CI / `i18n:generate`** | `public/console/i18n/**`, `public/dashboard/i18n/**`, `generated/bundles` |

**Never hand-edit:** `glossary.json`, `generated/bundles`, `public/**/i18n/**`.

```bash
cd dashboard
npm run i18n:prepare-commit   # import localisation-content + hydrate + regenerate
```

Dev-only langs (`bn-in`, `hi-in`) are **not** in committed glossary; `build-translations:dev` hydrates them.

---

## 3. Runtime (what the browser does)

| Piece | Role |
|---|---|
| `I18nService` | Current language, loads JSON bundles, `translateInstant(key, params)` |
| `TranslatePipe` (`\| t`) | Template; impure; re-renders on `dictionary$` (language switch) |
| `useTranslations(files)` | Mark which **split files** this screen needs (lazy i18n) |
| `EN_TRANSLATIONS` + `TranslationKey` | Generated types — wrong key is a **compile error** |
| Placeholders | `{count}` `{name}` — must match English exactly (`{{name}}` is banned) |

Language stored (prefixed) in storage; OAuth interceptor can send current language. RTL via `getLanguageDirection` (e.g. `ar`).

**Languages (prod glossary):** `ar-ae`, `de-de`, `es-es`, `es-mx`, `fr-ca`, `ja-jp`, `nl-nl` (+ `en-us` from source).

---

## 4. Protected terms

`src/app/i18n/protected-terms.json` — exact strings that **must remain** in every locale:

`Netradyne`, `Driveri™` / `Driver·i` / `Driver•i`, `GPS Insight`, partner brands, etc.

Validator **fails** if German drops `Netradyne` from a phrase that had it in English.

**OneTrust parallel:** legal/product names in a consent UI (OneTrust, cookie categories) stay untranslated the same way.

---

## 5. Pipeline (draw if they ask)

```text
source/*.en.json          localisation-content
        │                         │
        │ extract                 │ i18n:import-localisation-content
        ▼                         ▼
   English metadata          docs/i18n/glossary.json
   (committed types)              │
        │                    hydrate fallbacks / OAI if needed
        └──────────┬──────────────┘
                   ▼
          i18n:generate
                   ▼
     public/.../i18n/<lang>/*.json   ← browser (not committed)
```

| Rule | Block build? |
|---|---|
| Missing translation for a language | **No** — gap report |
| Placeholder `{count}` mismatch | **Yes** |
| Empty target string | **Yes** |
| Dropped protected term | **Yes** |
| Broken HTML / whitespace fragment keys | **Yes** if still required |

English source **wins** if it disagrees with glossary; next `prepare-commit` adds the phrase / reports the gap.

---

## 6. Older `/app` vs NUX (journey tie-in)

| | Transitional `/app` (Angular 17/19) | NUX dashboard |
|---|---|---|
| Style | `nd-translate`, many files, legacy glossary scripts | **One** `glossary.json` |
| Authoring | Mixed / older helper-scripts | English source + import |
| Iframe | Still serves leftover pages | Shell `| t` + same product langs |

If they ask “did you invent this?”: *I work inside this system — add English keys, run prepare-commit, never fork a second glossary.*

---

## 7. Interview Q&A

**Q: What is a glossary here?**  
> A single JSON map: **English phrase → { locale: translation }**. Not ngx-translate’s “one JSON per language keyed by id.” We reuse translations when the English is identical.

**Q: Why not key glossary by `shell.save`?**  
> Then “Save” on two screens would be translated twice and drift. Phrase-keyed glossary is the reuse layer; dotted keys are the code layer.

**Q: How do placeholders work?**  
> `{count}` in English and every locale. Same names. We interpolate at runtime. Mismatch fails CI.

**Q: How does the user switch language?**  
> `I18nService.setLanguage` → persist → reload dictionaries → pipe marks views dirty. Bundles fetched for that locale.

**Q: Split files?**  
> Screens declare `useTranslations(['shell', …])` so we don’t download every i18n file on first paint.

**Q: Backend `alertType` labels?**  
> Server often sends `alertTypeLabel` already localized. Some keys are **safety-net only** — don’t treat raw `alertType` as an i18n key.

**Q: MFE?**  
> Kernel/host should share the **same i18n contract** (same keys or shared English source). Remotes must not invent a second glossary. Conversion env can start with host-owned i18n.

---

## 8. OneTrust mapping

| OneTrust cares | NUX answer |
|---|---|
| Multi-locale compliance UI | Same: source English, glossary locales, RTL for `ar` |
| Legal names | `protected-terms.json` |
| Don’t ship untranslated prod blindly | Gap report; missing doesn’t crash; placeholders do |
| Design system copy | NDS strings go through the same source files |

---

## 9. Cheat card

```text
DEV:   source/*.en.json   key → English
GLOSS: glossary.json      English → { de-de, ja-jp, … }
RUN:   I18nService + | t  + generated TranslationKey
NEVER: hand-edit glossary or public/i18n
IMPORT: localisation-content via i18n:prepare-commit
PROTECT: Driveri™ / Netradyne
{name} not {{name}}
```
