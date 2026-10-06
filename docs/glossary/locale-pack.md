# Locale pack

A **locale pack** is MDCP’s compile-time bundle of natural-language data that is **not** GFM protocol shape. It covers:

- **Generated wording**: text such as US-English insert captions (`Table 1. …`) and `BROKEN LINK` marker copy
- **Locale-specific patterns**: optional heading-key patterns for semantic refs
- **Parse-input word cues**: authored words a compile hook may recognize (such as en-US `line` / `lines` for [codeEvidence](../client-core/compile-hooks/code-evidence.md) line ranges)
- **Preamble heading title**: a title such as en-US `About this guide` for strip/promote defaults (`aboutThisGuideTitle`)

Default `en-US` (one BCP 47 JSON file per locale under `src/locale/locales/`). Language-neutral markup forms and GitHub-style `#L…` fragment **output** stay outside the pack.
