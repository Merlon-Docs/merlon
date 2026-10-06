# GFM scope

Authored docs use [GFM](../../glossary/gfm.md) ([spec](https://github.github.com/gfm/)). No Pandoc, LaTeX, or wikilinks as the authoring contract.

A shard doesn't need anything beyond GFM. mdcp doesn't require front matter or a section template, and a guide's structure comes from its manifest and ordinary headings. [ADR 0003](../adr/0003-do-not-adopt-okf.md) records why a stricter knowledge format was declined.

MDCP’s compile, refs, and link checks implement a **subset** of GFM for headings today. Prefer ATX in authored shards (peer markdownlint `MD003: atx` matches that).

## Headings

GFM defines two heading forms ([ATX](https://github.github.com/gfm/#atx-headings) and [setext](https://github.github.com/gfm/#setext-headings)).

| Form                                                               | GFM | MDCP today                                                                |
| ------------------------------------------------------------------ | --- | ------------------------------------------------------------------------- |
| ATX (`#` … `######` + title)                                       | Yes | **Supported** for recognition, demotion, refs, and `#fragment` validation |
| Setext (text + `===` / `---` underline)                            | Yes | **Not yet** — invisible to demotion, refs, and fragment checks            |
| ATX edge cases (0–3 space indent, closing `#` sequence, empty ATX) | Yes | **Not yet** — current parser is a practical ATX subset                    |
| Emit / rewrite after demote or compile title                       | —   | Always **ATX** lines                                                      |

[Heading slugs](../../glossary/heading-slug.md) use the GitHub algorithm on recognized heading text after compile. Do not author Pandoc IDs (`{#…}`); see [Heading references](./heading-references.md).

Shared helpers live under `packages/mdcp-core/src/markdown/` (`parseHeading` / ATX kind today). See [Packages and tests](../../developer/packages-and-tests.md) and [Safe markdown parsing](../../developer/safe-markdown-parsing.md).
