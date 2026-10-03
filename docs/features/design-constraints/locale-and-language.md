# Locale and language boundary

MDCP treats **authored [GFM](../../glossary/gfm.md)** as the format contract: **headings** (ATX subset today — see [GFM scope](./gfm-scope.md#headings)) and **[cross-links](../../glossary/cross-link.md)** (ordinary `[]()` markdown links). It does not model chapters/sections as protocol concepts.

Natural-language **static analysis** belongs with **[Vale](https://vale.sh/) style packages**, not as durable gates in the core compile/check API. Core may hold a small **[locale pack](../../glossary/locale-pack.md)** for compile-time generated wording (captions, broken-link markers), locale-specific heading-key patterns, and compile **parse-input** word cues where natural language is not protocol vocabulary.

## Preferred homes

- **GFM cross-refs** (`[label](./shard.md#slug)`) → **mdcp-core / CLI**. First-class [link validation](../link-validation.md) and [refs](../../glossary/refs.md). This is the compile/check job.
- **Unlinked prose mentions** (en-US examples: "See Chapter…", bare `Ch. N`, "Section N" with no markdown link) → peer **Vale** style `MDCP` in `@bwilliamson/mdcp-presets` (`vale/MDCP`). Language-specific writing cues — not MDCP protocol vocabulary. Other languages need their own Vale styles.
- **Pandoc IDs** (`{#…}` after a heading) → peer **Vale** (dogfood style `MDCP-PandocId` warns authors to **remove** them). Core may strip leftovers for cleanup; not an authoring feature.
- **GFM / Markdown shape** → peer **markdownlint**.
- **Generated caption / marker copy** (`Table 1. …`, `BROKEN LINK`) → compile-time locale pack (default `en-US`).
- **codeEvidence line-range word cues** (en-US examples: `line 42`, `lines 12–15`) → compile-time locale pack (`lineRangeWords`). Language-neutral forms (`L6-L8`, `:10-20`) and GitHub-style **`#L…` fragment output** stay in core as protocol shape — not localized. See [codeEvidence](../../client-core/compile-hooks/code-evidence.md#codeevidence-line-ranges).
- **About-this-guide preamble title** (en-US: `About this guide`) → compile-time locale pack (`aboutThisGuideTitle`) for strip matching and shard preamble promotion defaults. The filename `about-this-guide.md` stays an English path identifier.

```text
# Illustrative — Vale MDCP (prose mention without a GFM link):
See Chapter 2 for details.

# Illustrative — Vale MDCP-PandocId (Pandoc ID after heading; remove it):
## Details {#…}
```

Vale does not replace link validation: Vale asks prose mentions to become links, or asks authors to drop Pandoc IDs. Core checks that authored `.md` paths and `#anchor` fragments resolve.

## How Vale handles multiple languages (model we follow)

[Vale](https://vale.sh/) (see [errata-ai/vale](https://github.com/errata-ai/vale) and [styles](https://github.com/errata-ai/styles)) does **not** fork its Markdown engine per language. Multi-language docs repos use three pieces:

1. **Markup / format engine** — scopes, ignores, and format parsers stay language-neutral. That maps to MDCP’s heading/link helpers (`src/markdown/`, slugify, links) and peer markdownlint.
2. **Style packages** — folders of YAML rules under `StylesPath`. Maintainer guidance for mixed-language trees is to split **shared** rules from **language-specific** ones (for example `General` + `En`), then assign them with `.vale.ini` **glob sections**:

   ```ini
   StylesPath = styles
   MinAlertLevel = suggestion

   # English (or default) docs: shared + English grammar/style
   [*.md]
   BasedOnStyles = General, En

   # Translations: shared only (or General + Fr, …)
   [*.{de,es,fr,it,ja,ru}.md]
   BasedOnStyles = General
   ```

   Path sections work the same way (`[en/docs/*.md]`, `[fr/docs/*.md]`). Official packages such as **Microsoft** are English style-guide implementations — another language gets another style package, not a different Markdown parser. An MDCP-owned prose style (unlinked heading mentions) is the same kind of package.

3. **Locale-named dictionaries** — Hunspell-compatible `en_US.{dic,aff}` under `styles/config/dictionaries/`, selected from `spelling` rules. <!-- mdcp-paths: illustrative -->

## Default and extension

Compile-time locale packs default to **`en-US`** (one BCP 47 JSON file per locale + shared formatters). Prose lint for other languages is a Vale style + `.vale.ini` section — not new branches inside GFM helpers or the check pipeline.

GFM helpers and heading **slugify** stay language-agnostic: they operate on Unicode heading text and GitHub-style slug rules, not on English chapter vocabulary.

Insert **library directory names** (`diagrams/`, `tables/`, …) and default preamble **filenames** (`about-this-guide.md`) stay English path identifiers for now. User-visible caption and marker **wording**, compile parse-input **word cues** such as code-evidence `line`/`lines`, and the about-this-guide **heading title** go through the locale pack.

## Related

- [GFM scope](./gfm-scope.md) — format limits (no Pandoc/LaTeX/wikilinks)
- [Peer linters](./peer-linters.md) — markdownlint and Vale stay opt-in peers
- [Optional linters](../../client-cli/optional-linters.md) — CLI wiring and scan scope
- [Link validation](../link-validation.md) — first-class internal target checks (not Vale)
- Vale docs: [BasedOnStyles](https://vale.sh/docs/keys/basedonstyles), [spelling / dictionaries](https://vale.sh/docs/checks/spelling), [Hunspell](https://vale.sh/docs/guides/hunspell)
