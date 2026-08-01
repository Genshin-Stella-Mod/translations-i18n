# CLAUDE.md

This file provides guidance to Claude Code (claude.ai/code) when working with code in this repository.

## Project Overview

**Stella-Mod-Translations** is the central translation hub for the Stella Mod desktop apps. It used to be wired up to Crowdin; that's gone now - **translations are written and maintained by Claude directly in this repo**, then synced into the target repos.

It covers `apps/` - `.resx` translation files for the Stella Mod desktop apps (WinForms, .NET).

The [stella.sefinek.net](https://stella.sefinek.net) website is open source and keeps its own `locales/en` / `locales/pl` directly in its repo - it no longer syncs through here.

Source language is `en`. Supported translation locales (15):

```
ar, de, es, fr, id, it, ja, pl, pt-BR, ru, sv, tr, vi, zh-Hans, zh-Hant
```

## Commands

All translation scripts are `i18n:`-prefixed npm scripts that delegate to `scripts/*.js`:

| Command | What it does |
|---|---|
| `npm run i18n:pull` | Pulls **everything** from the sibling project repos: English source `.resx` → `apps/<name>/` **and** `*.<locale>.resx` translations → `apps/.translated/<name>/`. Run before translating. |
| `npm run i18n:missing` | Reports **Missing** and **Orphaned** keys for the apps (`.resx`) across all 15 locales. Read-only. |
| `npm run i18n:push` | Pushes `apps/.translated/**/*.<locale>.resx` back into the project repos (only when content differs). |
| `npm run i18n:cleanup` | Runs `resx-cleanup` against the project repos to strip unused resx entries. |
| `npm run i18n:full` | `git pull && npm run i18n:cleanup && npm run i18n:pull` - refresh everything. |

There is no test suite (`npm test` is a stub). `npm run m` updates dependencies (`ncu -u && npm install && npm update`).

## Architecture

### Sync scripts share one module

Every script is a thin wrapper over `scripts/common.js`, which is the single source of truth for:

- **Constants**: `LOCALES`, `APP_PROJECTS` (`{ name, repo }` pairs), `CLEANUP_DIRS`, and the in-repo dir paths (`APPS_DIR`, `TRANSLATED_DIR`).
- **Filename filters**: `isMainResx` (English source, e.g. `Default.resx`), `isTranslatedResx` (`Default.<locale>.resx`), `isResx` (any `.resx`). All three ignore `ImageResources.resx` and `Language.resx`.
- **Helpers**: `walk(dir, filter)` (recursive collect, guards missing dirs), `syncTree(src, dest, filter)` (copy-if-changed with CRLF normalization), `difference(a, b)`, and `createMissingReport()` (accumulates totals, prints `Missing`/`Orphaned`/`Total`).

`scripts/pull.js`, `push.js`, `cleanup-resx.js`, and `find-missing.js` contain only orchestration.

**The sync scripts use hardcoded absolute paths** (`D:/Projects/stella/...` in `common.js`). They require the sibling project repos to be checked out at those locations.

### Project → repo mapping

`apps/<name>/` mirrors the English source; `apps/.translated/<name>/` mirrors the translations, with the same relative paths (e.g. `apps/.translated/launcher/Forms/Default.pl.resx` ↔ `apps/launcher/Forms/Default.resx`).

| Folder here | Target repo (sibling under `D:/Projects/stella/`) |
|---|---|
| `apps/configuration-window` | `Genshin-Impact-ReShade/Stella.Configuration` |
| `apps/launcher` | `Genshin-Impact-ReShade/Stella.Launcher` |
| `apps/prepare-stella` | `Genshin-Impact-ReShade/Stella.Prepare` |
| `apps/info-before-start` | `Genshin-Impact-ReShade/Stella.Welcome` |
| `apps/fps-unlocker` | `Genshin-FPS-Unlocker/unlockfps_nc` |

`i18n:cleanup` operates on a **different, broader** set (`CLEANUP_DIRS`): it adds `Stella.Core` and uses the `Genshin-FPS-Unlocker` repo root (not `unlockfps_nc`).

## Workflow: apps/ (.resx)

1. `npm run i18n:pull` - get the latest source + translations from the project repos (translations are sometimes edited directly there, so this repo's copy can lag; skipping risks `i18n:push` overwriting newer translations with stale ones).
2. `npm run i18n:missing` - see what needs translating (Missing) and what to delete (Orphaned).
3. **Translate** - for each Missing entry, edit the matching `apps/.translated/<project>/**/*.<locale>.resx` (create it by copying the English source `.resx` if absent) and set the `<value>`. Remove Orphaned entries.
4. `npm run i18n:push` - sync back into the project repos.
5. Commit/PR the changes in the affected project repo(s).

### What Is Translatable (.resx)

Only `<data>` entries that are user-facing strings:

```xml
<data name="linkLabel1.Text" xml:space="preserve">
  <value>&gt;&gt; I am ready to continue &lt;&lt; </value>
</data>
```

- **Translatable**: `<data name="...">` has `xml:space="preserve"`, has **no** `type="..."` attribute, and the `name` does **not** start with `&gt;&gt;` (`>>`).
- **Leave untouched**: entries with a `type="..."` attribute (WinForms designer metadata: sizes, anchors, fonts, colors); entries whose `name` starts with `&gt;&gt;` (designer control metadata like `&gt;&gt;linkLabel1.Name`); and the `ImageResources.resx` / `Language.resx` files (never translated, ignored by all scripts).

When editing a `<value>`, change **only the text content** - keep the `<data name="..." xml:space="preserve"><value>...</value></data>` structure, attributes, and XML entity encoding (`&gt;`, `&lt;`, `&amp;`, `&quot;`, `&apos;`) exactly as-is.

### Translation Style Guidelines (.resx)

- Preserve placeholders exactly: `{0}`, `{1}`, `\n`, `\r\n`, and any `&gt;&gt;`/`&lt;&lt;` decoration.
- Match the tone/register of existing translations for that language across the same project (short UI strings: buttons, labels, titles, tooltips - keep concise).
- Keep punctuation/casing idiomatic for the target language (sentence vs. title case, spacing before `:` in French, etc.).
- Do not translate proper nouns/brand names (`Stella Mod`, `Genshin Impact`, `ReShade`, `Discord`, etc.) unless an existing translation in that file already does so consistently.
- `.resx` files are CRLF (`*.resx text eol=crlf`). The sync scripts normalize this, but a hand-created file copied from the English source should stay CRLF.

## Code Style

ESLint flat config (`eslint.config.mjs`): tabs, single quotes, semicolons, Node.js globals (CommonJS). Run `npx eslint scripts/`.
