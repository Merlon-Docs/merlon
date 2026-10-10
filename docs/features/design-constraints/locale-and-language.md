# Locale and language boundary

MDCP treats **authored [GFM](../../glossary/gfm.md)** as the format contract: **headings** (ATX subset today — see [GFM scope](./gfm-scope.md#headings)) and **[cross-links](../../glossary/cross-link.md)** (ordinary `[]()` markdown links). It does not model chapters/sections as protocol concepts.

Natural-language **static analysis** belongs with **[Vale](https://vale.sh/) style packages**, not as durable gates in the core compile/check API. Core may hold a small **[locale pack](../../glossary/locale-pack.md)** for compile-time generated wording (captions, broken-link markers), locale-specific heading-key patterns, and compile **parse-input** word cues where natural language is not protocol vocabulary.

## Preferred homes

- **GFM cross-refs** (`[label](./shard.md#slug)`) → **mdcp-core / CLI**. First-class [link validation](../link-validation.md) and [refs](../../glossary/refs.md). This is the compile/check job.
- **Unlinked prose mentions** (en-US examples: "See Chapter…", bare `Ch. N`, "Section N" with no markdown link) → peer **Vale** style `MDCP` in `@bwilliamson/mdcp-presets` (`vale/MDCP`). Language-specific writing cues — not MDCP protocol vocabulary. Other languages need their own Vale styles.
- **Dated claims** (en-US cues: `as of` or `until` before an ISO date) → peer **Vale** rule `MDCP.DatedClaim` in the same `MDCP` style. The cue words are Vale-style data, not locale-pack data: no compile code reads them, so they stay out of the locale pack.
- **Pandoc IDs** (`{#…}` after a heading) → a peer **Vale** rule that the host adds, since the `MDCP` style in `@bwilliamson/mdcp-presets` has none. [GFM scope](./gfm-scope.md#headings) states the rule against authoring them. Core may strip leftovers for cleanup, and that is not an authoring feature.
- **GFM / Markdown shape** → peer **markdownlint**.
- **Generated caption / marker copy** (`Table 1. …`, `BROKEN LINK`) → compile-time locale pack (default `en-US`).
- **codeEvidence line-range word cues** (en-US examples: `line 42`, `lines 12–15`) → compile-time locale pack (`lineRangeWords`). Language-neutral forms (`L6-L8`, `:10-20`) and GitHub-style **`#L…` fragment output** stay in core as protocol shape — not localized. See [codeEvidence](../../client-core/compile-hooks/code-evidence.md#codeevidence-line-ranges).
- **About-this-guide preamble title** (en-US: `About this guide`) → compile-time locale pack (`aboutThisGuideTitle`) for strip matching and shard preamble promotion defaults. The filename `about-this-guide.md` stays an English path identifier.

```text
# Illustrative — Vale MDCP (prose mention without a GFM link):
See Chapter 2 for details.

# Illustrative, Vale MDCP.DatedClaim: a claim pinned to a date
As of 2026-07-27 the cache is warm.

# Illustrative, a host Vale rule against Pandoc IDs (remove the ID):
## Details {#…}
```

Vale does not replace link validation: Vale asks prose mentions to become links, and a host Vale rule can ask authors to drop Pandoc IDs. Core checks that authored `.md` paths and `#anchor` fragments resolve.

## Default and extension

Compile-time locale packs default to **`en-US`** (one BCP 47 JSON file per locale + shared formatters).

Vale keeps one Markdown parser for every language, and a `.vale.ini` glob or path section gives each set of files its style packages ([BasedOnStyles](https://vale.sh/docs/keys/basedonstyles)). Prose lint for another language takes a Vale style and a `.vale.ini` section, and the GFM helpers and the check pipeline stay as they are.

In Vale terms, a tree with more than one language splits shared rules from language-specific ones, so English files take a shared `General` style beside an `En` style, and a translation section such as `[*.{de,fr}.md]` takes `General` alone or beside its own language style. A language's dictionary comes from its spelling rules, which select Hunspell files such as `en_US.dic` and `en_US.aff` under `config/dictionaries/` in the `StylesPath`. [Opt a standalone guide out of Vale](../../client-cli/optional-linters.md#opt-a-standalone-guide-out-of-vale) shows how a path section matches the absolute paths that mdcp passes to Vale. <!-- mdcp-paths: illustrative -->

GFM helpers and heading **slugify** stay language-agnostic: they operate on Unicode heading text and GitHub-style slug rules, not on English chapter vocabulary.

Insert **library directory names** (`diagrams/`, `tables/`, …) and default preamble **filenames** (`about-this-guide.md`) stay English path identifiers for now. User-visible caption and marker **wording**, compile parse-input **word cues** such as code-evidence `line`/`lines`, and the about-this-guide **heading title** go through the locale pack.

## Related

- [GFM scope](./gfm-scope.md) — format limits (no Pandoc/LaTeX/wikilinks)
- [Peer linters](./peer-linters.md) — markdownlint and Vale stay opt-in peers
- [Optional linters](../../client-cli/optional-linters.md) — CLI wiring and scan scope
- [Link validation](../link-validation.md) — first-class internal target checks (not Vale)
- Vale docs: [BasedOnStyles](https://vale.sh/docs/keys/basedonstyles), [spelling / dictionaries](https://vale.sh/docs/checks/spelling), [Hunspell](https://vale.sh/docs/guides/hunspell)
