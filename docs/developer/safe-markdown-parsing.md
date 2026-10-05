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

Heading demotion in `compile/headings.ts` runs `parseHeading` and `formatHeadingAsAtx` on each line outside fenced blocks, but it finds those blocks with `FENCE_RE`, which [Not linear on crafted input](#not-linear-on-crafted-input) lists.

Link validation finds broken-link markers with `findTemplateMatches`, a scanner in `locale/create-locale-pack.ts`. It splits the locale's `markerTemplate` at each variable but `markerLabel` and finds the parts in order, with no line terminator between two of them. It returns the markers that a pattern with a lazy `.*?` for each variable matches, and its time grows linearly with the length of the line. Compiled link lint asks about a line a fixed number of times, however many links it holds.

`codeEvidence` reads line ranges such as `L6-L8` or `lines 12–15` with `lineRangeFromText`, an imperative scanner in `compile/hooks/line-range.ts`. It takes its words from the locale pack. Public package APIs keep their names, and call sites delegate to the helpers. Duration-budget tests in `packages/mdcp-core/test/redos-budget.test.ts` run the helpers and scanners on pump inputs, so a regex that brings the class back fails CI.

## Regex sites that remain

A regex in `packages/mdcp-core/src/` falls under this rule:

- **Keep** a pattern that is clearly linear.
- **Rewrite** a pattern next to the CodeQL class, such as `\s*` or overlapping optional groups next to digits, as a scanner with a duration-budget test.
- **Keep** the Markdown link idioms as regexes, and fix any `js/polynomial-redos` alert on one with a scanner.
- Leave prose and language opinion out of core, because it belongs in Vale.

[Not linear on crafted input](#not-linear-on-crafted-input) lists the sites in the rewrite case that are still regexes.

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
| Path and glob helpers                                      | `./`, `../` and `.` prefixes, a leading `!`, `#` or `:`, and one trailing `/`                                                             | Anchored                                                                              |
| Adornment, escape and split helpers                        | `**` and emphasis markers, backslashes, regex and glob escaping, letter and number classes, whitespace and separator splits               | Literal or one character class                                                        |

### Not linear on crafted input

| Location                                           | Pattern role                                                                                                                                                                                                                                                                                                                                                           |
| -------------------------------------------------- | ---------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- |
| `compile/headings.ts` `FENCE_RE`                   | Finds fence open and close markers on each line that heading demotion reads. The regex has no `m` flag, so on a line that ends in a carriage return `$` fails after `.*`, and the engine gives the backtick or tilde run back one character at a time. For the same reason it doesn't match a fence line in a CRLF shard, so demotion reads that fenced block as prose |
| `config/load.ts` `shardsGlobPath`                  | Trims trailing slashes with `/\/+$/` from a `shardsGlobs` entry whose path starts with `../`, with or without a leading `!` or `#`                                                                                                                                                                                                                                     |
| `compile/hooks/code-evidence.ts` `symbolFromLabel` | Trims backticks from both ends of a link label with ``^`+`` and `` `+$ ``                                                                                                                                                                                                                                                                                              |

On a crafted input, each of these takes time that grows faster than the input does, which puts it in the rule's rewrite case. `FENCE_RE` and the two trims grow with the square of the length of the text they read. They stay regexes until someone rewrites them. Each reads text that the repository being compiled supplies, so a slow input has to be committed there first. A rewrite replaces the regex with a scanner and adds a duration-budget test.

### Link idioms

| Location                                           | Pattern role                                              | Input                                                                                               |
| -------------------------------------------------- | --------------------------------------------------------- | --------------------------------------------------------------------------------------------------- |
| `links/extract.ts` `MD_LINK_RE`                    | Non-image `[label](target)`                               | One line at a time, with code spans masked                                                          |
| `compile/publish-links.ts`                         | Cross-guide, intra-guide and publish-relative link shapes | One line at a time, with code spans masked                                                          |
| `compile/hooks/code-evidence.ts` `MD_LINK_RE`      | `[label](target)` for evidence links                      | The whole shard body                                                                                |
| `compile/hooks/inline-inserts.ts` `INSERT_LINK_RE` | Links into an insert library directory                    | The whole shard body, or one path through `isInsertLibraryPath`                                     |
| `compile/section-manifest.ts` `FILE_LINK_RE`       | `.md` links                                               | The manifest, from the `compile.sectionsHeading` heading on when set, and each shard the walk reads |
| `compile/section-manifest.ts` `SLUG_LINK_RE`       | `](#slug)` links                                          | The manifest only, from the `compile.sectionsHeading` heading on when set                           |

Each of these matches the `[label](target)` form, or its `](#slug)` tail, with negated character classes. They aren't linear either. On a crafted input the time grows at least with the square of the input's length. `FILE_LINK_RE` and `INSERT_LINK_RE` grow with its cube: the `[^)]` run before `.md` can end at each `.md` in the target, and after each `.md#` the optional fragment reads on to the next `)`. The Input column says which length counts. A negated class such as `[^)]` crosses line breaks, so short lines don't limit a regex that reads the whole text. The package has no Markdown link parser to replace them with, so link extract and rewrite keep these regexes. If CodeQL opens `js/polynomial-redos` on one of these sites, fix it with a linear scanner and a duration-budget test.

## Authoring implications

- Prefer the shared helpers for new heading or slug logic; do not add new polynomial-risk regexes for those jobs.
- Prefer imperative scanners when adding line-range style matchers (optional whitespace next to digits or overlapping alternatives). Authored **word** cues for line ranges belong in the locale pack; keep `L` / `:` forms and `#L…` output language-neutral in the scanner.
- Prefer GFM auto-slugs. Don't author Pandoc IDs on headings, since Vale reports an error on one in this repo. Compile still strips them from legacy content.
- Don't reintroduce `lintXrefs` or chapter-cue regexes in `mdcp-core`. Unlinked chapter and section cues in prose are Vale's job, as [Locale and language boundary](../features/design-constraints/locale-and-language.md) describes.
