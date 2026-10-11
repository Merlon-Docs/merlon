# GFM scope

Authored docs use [GFM](../../glossary/gfm.md) ([spec](https://github.github.com/gfm/)). No Pandoc, LaTeX, or wikilinks as the authoring contract.

A shard doesn't need anything beyond GFM. Merlon Docs doesn't require front matter or a section template, and a guide's structure comes from its manifest and ordinary headings. [ADR 0003](../adr/0003-do-not-adopt-okf.md) records why a stricter knowledge format was declined.

Merlon Docs’ compile, refs and link checks recognize a **subset** of GFM headings. Prefer ATX in authored shards (peer markdownlint `MD003: atx` matches that).

## Headings

GFM defines two heading forms ([ATX](https://github.github.com/gfm/#atx-headings) and [setext](https://github.github.com/gfm/#setext-headings)).

| Form                                                  | GFM | In Merlon Docs                                                                                                    |
| ----------------------------------------------------- | --- | ----------------------------------------------------------------------------------------------------------------- |
| ATX (`#` … `######` + title)                          | Yes | **Supported** for recognition, demotion, refs, and `#fragment` validation                                         |
| Setext (text + `===` / `---` underline)               | Yes | **Not recognized**: invisible to demotion, refs and fragment checks                                               |
| ATX heading indented one to three spaces              | Yes | **Not recognized** by demotion, refs and fragment checks                                                          |
| ATX heading with a closing `#` sequence (`## Foo ##`) | Yes | **Recognized**: the closing sequence stays in the title, so the slug is `foo-` and a `#foo` link is marked broken |
| Empty ATX heading                                     | Yes | **Partial**: a bare `#` isn't recognized, and `#` followed by a space is demoted like a heading but takes no slug |
| Emit / rewrite after demote or compile title          | n/a | Always **ATX** lines                                                                                              |

[Heading slugs](../../glossary/heading-slug.md), part of [refs](../../glossary/refs.md), use the GitHub algorithm on recognized heading text after compile. Do not author Pandoc IDs (`{#…}`). This rule is advisory, because Merlon Docs' own checks and the `MerlonDocs` Vale style pass a Pandoc ID. Authors and reviewers apply it, and the headings in a change's diff are its evidence. The host can add a Vale rule that fails on one, as [Preferred homes](./locale-and-language.md#preferred-homes) says.

Shared helpers live under `packages/merlon-docs-core/src/markdown/` (`parseHeading`, which recognizes the ATX kind). See [Packages and tests](../../developer/packages-and-tests.md) and [Safe markdown parsing](../../developer/safe-markdown-parsing.md).

Part of [Design constraints](./index.md).
