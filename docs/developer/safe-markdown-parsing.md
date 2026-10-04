# Safe markdown parsing (heading helpers)

Maintainer note for why `mdcp-core` centralizes heading parsing and related cleanup in shared **language-agnostic** helpers instead of ad-hoc regular expressions, and how remaining package regexes were audited for [ReDoS](../glossary/redos.md) risk.

CodeQL surfaces these findings. Prose chapter-cue lint lives in Vale; see [Locale and language boundary](../features/design-constraints/locale-and-language.md).

## Why this is necessary

GitHub CodeQL’s `js/polynomial-redos` rule flagged several `mdcp-core` paths that parse headings and strip leftover `{#…}` markers. The patterns used overlapping or unbounded quantifiers (`\s*` next to `{#…}`, `\s+` with a greedy remainder, non-greedy `.*?` between braces) on library-controlled strings. On adversarial input those matches can take time that grows badly with length — a [ReDoS](../glossary/redos.md) class of denial-of-service risk.

Even when everyday docs never hit the pathological case, the open alerts block a clean security dashboard, and the same regex shapes were copied across compile, refs, and links. Fixing call sites one-by-one without a shared parse path invites the class to return.

## What we do instead (Phase A)

Phase A introduces shared **linear** helpers for:

- recognizing headings via `parseHeading` (ATX kind today; see [GFM scope](../features/design-constraints/gfm-scope.md#headings))
- demoting recognized headings (rewrite emits ATX)
- stripping leftover Pandoc IDs (`{#…}`) when cleaning compiled output (defensive cleanup — authoring opinion to avoid them is Vale `MDCP-PandocId`)
- producing plain heading text for language-agnostic [heading slug](../glossary/heading-slug.md) generation

Public package APIs keep their existing names; call sites delegate to the helpers. Duration-budget regression tests exercise the known CodeQL pump classes so a future regex reintroduction fails CI.

See [Packages and tests](./packages-and-tests.md) for where the helper module lives under `mdcp-core`.

## Phase B inventory (remaining regexes)

Phase B inventories remaining regexes in `packages/mdcp-core/src/` after Phase A **and** after prose chapter-cue lint moved to [Vale](https://vale.sh/) (`@bwilliamson/mdcp-presets` `vale/MDCP`, [#230](https://github.com/betsalel-williamson/mdcp/pull/230)). Decision rule: **keep** when the shape is clearly linear; **rewrite** when polynomial-adjacent (`\s*` / overlapping optional groups next to digits, or the CodeQL class); **dismiss** when a conservative checker flags a standard markdown-link idiom that stays empirically linear; **out of scope** when the concern is language/prose opinion (belongs in Vale, not core).

Duration-budget tests cover rewritten paths. Link extract/rewrite patterns stay as regexes with the dismissals below — not a full parser purge. Alternatives such as ripgrep, Peggy, or Rust for these scanners are declined for now; see [ADR 0005](../features/adr/0005-keep-ts-scanners-over-rg-peggy-rust.md).

### Rewritten (linear scanners)

| Location                         | Former risk shape                                    | Disposition                                                                           |
| -------------------------------- | ---------------------------------------------------- | ------------------------------------------------------------------------------------- |
| `compile/hooks/code-evidence.ts` | `LINE_RANGE_RE` optional `L`/`lines?` + `\s*` + alts | Imperative `lineRangeFromText`; word cues from the locale pack (not hardcoded)        |
| `compile/headings.ts` About H1   | `^#\s+About…\s*$` (safe but heading-regex sprawl)    | `parseHeading` + locale `aboutThisGuideTitle` (case-insensitive; not hardcoded en-US) |

### Moved out of core (Vale)

| Former core concern                       | Home now                                                                    |
| ----------------------------------------- | --------------------------------------------------------------------------- |
| Bare / unlinked “See Chapter…” prose cues | `@bwilliamson/mdcp-presets` Vale style `MDCP` ([vale.sh](https://vale.sh/)) |
| Pandoc heading-ID authoring opinion       | Dogfood Vale `MDCP-PandocId`                                                |

Do **not** reintroduce `lintXrefs` or chapter-cue regexes in `mdcp-core`.

### Kept (clearly linear)

| Location                         | Pattern role                   | Rationale                                       |
| -------------------------------- | ------------------------------ | ----------------------------------------------- |
| `compile/headings.ts` `FENCE_RE` | Fence open/close markers       | Anchored; `` `{3,}` `` / `~{3,}` then remainder |
| `refs/slugs.ts` slug cleanup     | `[^a-z0-9]+`, trim dashes      | Single character-class replace                  |
| `export/protocol-version.ts`     | `mdcp.v…llms.txt` filenames    | Anchored filename; `[\d.]+` is linear           |
| `compile/section-slug.ts`        | `FIND-N.md`, `.md` suffix      | Anchored / suffix only                          |
| `compile/section-manifest.ts`    | Dynamic `##` sections heading  | Escaped literal; anchored `^##\s+…\s*$`         |
| `links/validate.ts`              | `https?://`, `.md` suffix      | Anchored / suffix                               |
| `compile/assemble.ts`            | Collapse `\n{3,}`              | Bounded quantifier on one character             |
| `shard/orchestrator.ts`          | Demote leading H1 marker       | Fixed two-character `#` + space prefix          |
| Misc adornment / path trims      | Bold stars, inline ticks, `./` | Literal or single-class                         |

### Dismissed (link idioms — keep regex)

| Location                                      | Pattern role                      | Rationale                                                                                       |
| --------------------------------------------- | --------------------------------- | ----------------------------------------------------------------------------------------------- |
| `links/extract.ts` `MD_LINK_RE`               | Non-image `[label](target)`       | Standard GFM link extract; character-class stars; line-scoped; empirically linear at 40k+ chars |
| `code-evidence.ts` link match                 | `[…](…)` rewrite                  | Same class; simpler `[^)]*` form already passes conservative checkers                           |
| `compile/section-manifest.ts` file/slug links | Manifest `.md` / `#slug` links    | Same link idiom; used on small manifests                                                        |
| `compile/publish-links.ts` rewrite REs        | Intra/cross-guide / publish paths | Nested lookarounds + `.md` suffix; conservative checkers may flag; V8 timings stay linear       |
| `compile/hooks/inline-inserts.ts`             | Insert-library link match         | Same as publish-links; library-dir alternation is fixed                                         |

These dismissals are intentional: Phase B does **not** replace every regex with parsers. If CodeQL later opens `js/polynomial-redos` on a dismissed site, treat that alert as a new fix ticket (same TDD pattern as Phase A).

## Authoring implications

- Prefer the shared helpers for new heading or slug logic; do not add new polynomial-risk regexes for those jobs.
- Prefer imperative scanners when adding line-range style matchers (optional whitespace next to digits or overlapping alternatives). Authored **word** cues for line ranges belong in the locale pack; keep `L` / `:` forms and `#L…` output language-neutral in the scanner.
- Prefer GFM auto-slugs; do not author Pandoc IDs on headings (Vale warns in this repo). Compile stripping stays available for legacy content.
- Unlinked chapter/section prose cues are Vale’s job — not a new `mdcp-core` lint path.
