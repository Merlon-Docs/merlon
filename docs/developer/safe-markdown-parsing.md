# Safe markdown parsing (heading helpers)

Maintainer note for why `mdcp-core` parses headings and related markup with shared **language-agnostic** helpers instead of ad-hoc regular expressions, and which regexes remain in the package. [ADR 0005](../features/adr/0005-keep-ts-scanners-over-rg-peggy-rust.md) records how the rule came about and why the scanners stay in TypeScript.

## Why this is necessary

CodeQL's `js/polynomial-redos` rule flags a regex with overlapping or unbounded quantifiers that runs on library-controlled strings. Typical shapes are `\s*` next to `{#…}`, `\s+` before a greedy remainder, and a non-greedy `.*?` between braces. On a crafted input such a match takes time that grows faster than the input does, which is the [ReDoS](../glossary/redos.md) class of denial-of-service risk.

Everyday docs rarely hit the pathological case, but open alerts block a clean security dashboard. Compile, refs and links all parse headings and strip markers. Fixing those call sites one at a time lets the class come back in the next copy. The shared helpers give each of those jobs one parse path.

## Shared linear helpers

The helpers in `packages/mdcp-core/src/markdown/` run in linear time. They cover these jobs:

- parsing each heading line with `parseHeading` (ATX kind today; see [GFM scope](../features/design-constraints/gfm-scope.md#headings)) and writing it back as ATX with `formatHeadingAsAtx`
- stripping leftover Pandoc IDs (`{#…}`) when cleaning compiled output, as defensive cleanup (the Vale style `MDCP-PandocId` reports an error on a heading that has one)
- producing plain heading text for language-agnostic [heading slug](../glossary/heading-slug.md) generation
- tracking fenced code blocks line by line, masking non-prose regions and counting words for prose checks

Heading demotion in `compile/headings.ts` runs `parseHeading` and `formatHeadingAsAtx` on each line outside fenced blocks. It finds those blocks with `createCodeFenceScanner`, the same scan that the slug registry's heading reader runs, and that scan reads a CRLF line too. Demotion starts a new scan on each text it demotes, such as one shard, while the registry reads a whole guide with one scan. A shard that ends inside an open fence can make the two disagree about the shard after it.

The link passes, `codeEvidence`, broken-link marking and link lint find fenced code with `createQuotedFenceScanner` in `markdown/prose.ts`. It runs the scan behind `createCodeFenceScanner` on each line, and another one on the text of each blockquote up to ten deep, in time that grows linearly with the text. A `>` four or more columns past its container doesn't open a quote, since that scan reads the line as indented code or paragraph text.

Link validation finds broken-link markers with `findTemplateMatches`, a scanner in `locale/create-locale-pack.ts`. It splits the locale's `markerTemplate` at each variable but `markerLabel` and finds the parts in order, with no line terminator between two of them. It returns the markers that a pattern with a lazy `.*?` for each variable matches, and its time grows linearly with the length of the line. Compiled link lint asks about a line a fixed number of times, however many links it holds.

The manifest walk and the `inlineInserts` hook read a whole manifest or shard body with `scanMarkdownLinks` in `compile/link-scan.ts`, the scanner that [Link idioms](#link-idioms) describes. The walk also reads `](#slug)` links with `slugLinkTargets` in that file. It returns what the regex `\]\(#([^)]+)\)` matches, a target that can span lines, in time that grows linearly with the text.

`codeEvidence` reads line ranges such as `L6-L8` or `lines 12–15` with `lineRangeFromText`, an imperative scanner in `compile/hooks/line-range.ts`. It takes its words from the locale pack. The hook trims the backticks around a link label with a loop, and `shardLintPaths` uses one too, for the slashes at the end of a `shardsGlobs` entry that starts with `../`. Public package APIs keep their names, and call sites delegate to the helpers. Duration-budget tests in `packages/mdcp-core/test/redos-budget.test.ts` run the helpers and scanners on pump inputs, so a regex that brings the class back fails CI.

## Regex sites that remain

A regex in `packages/mdcp-core/src/` falls under this rule:

- **Keep** a pattern that is clearly linear.
- **Rewrite** a pattern next to the CodeQL class, such as `\s*` or overlapping optional groups next to digits, as a scanner with a duration-budget test.
- Leave prose and language opinion out of core, because it belongs in Vale.

### Kept (linear)

| Location                                                   | Pattern role                                                                                                                              | Rationale                                                                             |
| ---------------------------------------------------------- | ----------------------------------------------------------------------------------------------------------------------------------------- | ------------------------------------------------------------------------------------- |
| `compile/section-slug.ts`                                  | `FIND-N.md` and the `.md` suffix                                                                                                          | Anchored, or suffix only                                                              |
| `compile/section-manifest.ts`                              | The `##` heading that `compile.sectionsHeading` names                                                                                     | Escaped literal; anchored `^##\s+…\s*$`                                               |
| `links/validate.ts`, `links/validate-shards.ts`            | `https?://` prefix and `.md` suffix                                                                                                       | Anchored, or suffix only                                                              |
| `compile/hooks/inline-inserts.ts`                          | The `https?://` prefix and `.md` suffix of an insert path, the insert kind that starts a caption title, and the `.` or `:` after the kind | Anchored, or suffix only                                                              |
| `compile/assemble.ts`                                      | Collapse `\n{3,}`                                                                                                                         | One character with a minimum count; each newline run matches once                     |
| `shard/orchestrator.ts`                                    | Demote a leading H1 marker                                                                                                                | `#` and a space, at the start of a line                                               |
| `compile/hooks/code-evidence.ts` symbol search             | An escaped symbol alone, after a declaration keyword, or before `(`                                                                       | Literal words around at most one whitespace run                                       |
| `compile/hooks/code-evidence.ts` label and fragment checks | An identifier label, or an existing `#L6` or `#L6-L8` fragment                                                                            | Anchored at the start, and the identifier and range checks at the end too             |
| `validate/path-probe.ts`                                   | Backtick code spans, and tests on each span                                                                                               | One negated class between literal backticks; each test is anchored or one class       |
| `locale/create-locale-pack.ts`                             | `{name}` placeholders in locale messages, and the en-US heading-key pattern                                                               | A letter and a run of one class between literal braces; the en-US pattern is anchored |
| `compile/align-tables.ts`                                  | Delimiter cells, lines of spaces and quote markers, the block starts and HTML block starts that end a table                               | Anchored; tag attributes need a space between them, and each other run is one class   |
| `markdown/display-width.ts`                                | Zero-width, emoji and flag graphemes, and a printable-ASCII check                                                                         | Run on one grapheme, or one class over the text                                       |
| Path and glob helpers                                      | `./`, `../` and `.` prefixes, a leading `!`, `#` or `:`, and one trailing `/`                                                             | Anchored                                                                              |
| Adornment, escape and split helpers                        | `**` and emphasis markers, backslashes, regex and glob escaping, letter and number classes, whitespace and separator splits               | Literal or one character class                                                        |

## Link idioms

| Location                             | Links it reads                                                                                  | Input                                                         |
| ------------------------------------ | ----------------------------------------------------------------------------------------------- | ------------------------------------------------------------- |
| `links/extract.ts`                   | Links with a target of one character or more, but no images                                     | One line at a time, with code spans masked                    |
| `compile/publish-links.ts`           | Links and images whose targets the cross-guide, intra-guide and publish-relative passes rewrite | One line at a time, with code spans masked                    |
| `compile/hooks/code-evidence.ts`     | Links and images with a target of one character or more                                         | Each run of lines between fenced code, with code spans masked |
| `compile/link-scan.ts` `mdLinkPaths` | Links and images whose path ends in `.md`, for the manifest walk                                | A whole manifest or shard, code included                      |
| `compile/hooks/inline-inserts.ts`    | Links into an insert library, but no images                                                     | A whole shard body, code included                             |

Each of these finds links with `scanMarkdownLinks` in `compile/link-scan.ts`, which reads a label and a target as [Link passes](../client-core/compile-hooks/index.md#link-passes) says. A `]` closes the nearest `[` or `![` still open, and `\![a](x)` is a link after a literal `!`. Once a link closes, each `[` still open before it turns into text, while an open `![` can still close around it. In `[![Diagram](./d.png)](./page.md)` the scan gives the image and then the link around it, and each reader treats the image as it treats any image.

The scan ends a target at its line, so an unfinished link such as `[x](see` doesn't take in a link on the next line, and a label can wrap onto the next line where a reader reads more than one line at a time. The scan doesn't read reference-style links, code spans, autolinks or inline HTML, so a bracket inside one still counts, and the table says which readers mask code spans first.

[No placeholder links](../features/link-validation.md#no-placeholder-links) states the rule that link validation leaves an image's src unchecked. Neither built-in list behind `lint.codeExtensions` and `lint.dataExtensions` has an image extension, so a check of srcs would pass one with an image extension or an https: URL without reading the disk, and it would read a src such as `./x.md` as a page.

The scan stops only at a backslash, a `!` or a bracket, and a regex of one character class finds the next one, so it reads each index of its input a fixed number of times. Images nest, so on a line of nested images the alts add up to the square of the line's length. So `codeEvidence` reads a label without the links and images in it, both for a line range or a symbol and for the text that tells the links it rebased apart. Broken-link marking scans the label of each link for the images in it, and links don't nest, so it reads each index once. It then splices each marker into the body on its own, so marking takes time that grows with the number of marked links times the length of the body. Duration-budget tests run each reader on a line that repeats an unfinished link, and compile and `codeEvidence` on a line of nested images.

[ADR 0005](../features/adr/0005-keep-ts-scanners-over-rg-peggy-rust.md) keeps hand-written TypeScript scanners for the core micro-parsers, and these readers follow it. None of them is a regex now. CommonMark's bracket rule needs a stack of the brackets still open, and `scanMarkdownLinks` keeps one in a hand-written loop, so it doesn't meet the ADR's trigger for a grammar.

Link lint, broken-link marking, the link passes and `codeEvidence` mask code spans with `maskInlineCode` before they scan. It searches the rest of the line for the closer of each backtick run, and on a line of unmatched backtick runs whose lengths fall, its time grows faster than the line's length.

## Authoring implications

- Prefer the shared helpers for new heading or slug logic; do not add new polynomial-risk regexes for those jobs.
- Prefer imperative scanners when adding line-range style matchers (optional whitespace next to digits or overlapping alternatives). Authored **word** cues for line ranges belong in the locale pack; keep `L` / `:` forms and `#L…` output language-neutral in the scanner.
- Prefer GFM auto-slugs. Don't author Pandoc IDs on headings, since Vale reports an error on one in this repo. Compile still strips them from legacy content.
- Don't reintroduce `lintXrefs` or chapter-cue regexes in `mdcp-core`. Unlinked chapter and section cues in prose are Vale's job, as [Locale and language boundary](../features/design-constraints/locale-and-language.md) describes.
