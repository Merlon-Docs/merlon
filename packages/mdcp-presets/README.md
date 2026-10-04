# @bwilliamson/mdcp-presets

Starter **markdownlint-cli2** configs and a **Vale** style package (`MDCP`) for MarkDown Context Protocol consumer repos.

Install alongside `@bwilliamson/mdcp-cli` when you want `mdcp lint` / `mdcp prose` (or `mdcp check --require-lint` / `--require-vale`) without writing lint configs from scratch.

## Requirements

- Node.js **>= 18.0.0**
- `markdownlint-cli2` for structure lint
- [Vale](https://vale.sh/) on `PATH` for prose lint (peer binary; not an npm dependency)

## Install

```bash
npm install -D @bwilliamson/mdcp-presets markdownlint-cli2 @bwilliamson/mdcp-cli
```

## Markdownlint presets

| File                                            | Targets                                       | Intent                                                                                  |
| ----------------------------------------------- | --------------------------------------------- | --------------------------------------------------------------------------------------- |
| `markdownlint-shards.markdownlint-cli2.jsonc`   | Registered guide shard trees (scope from CLI) | Relaxed rules for shard authoring — each shard starts with `#`, duplicates are expected |
| `markdownlint-compiled.markdownlint-cli2.jsonc` | `guides.md` only                              | Stricter link rules (`MD052`, `MD053`) on the compiled monolith                         |

### Shard preset highlights

- ATX headings (`#`), 2-space list indent
- `MD001`, `MD013` (line length), `MD024` (duplicate headings), `MD041` (first line H1) disabled — mdcp compile handles structure
- `MD025` front-matter title disabled

### Compiled preset highlights

- Validates fragment and reference link integrity on `guides.md`
- Line-length and duplicate-heading rules stay relaxed (compile output differs from shard layout)

## Vale style (`MDCP`)

English (en-US) prose cues when docs **mention** a numbered heading (`Chapter` / `Section` / `Ch.` / `Sec.`) without a GFM markdown link, or pin a claim to a date. MDCP itself only models headings and links. This style is language-specific static analysis. Keep [mdcp-core](https://www.npmjs.com/package/@bwilliamson/mdcp-core) on compile and protocol validation (including link targets). See [Locale and language boundary](../../docs/features/design-constraints/locale-and-language.md).

| Path                 | Role                                            |
| -------------------- | ----------------------------------------------- |
| `vale/package/`      | Vale Packages-compatible layout for `vale sync` |
| `vale/MDCP/`         | Source Vale style rules                         |
| `vale/mdcp.vale.ini` | Sample `.vale.ini` snippet for consumers        |

| Rule                      | Flags                                                                                |
| ------------------------- | ------------------------------------------------------------------------------------ |
| `MDCP.BareChapterRef`     | `Chapter 2`, `Ch. 2` or `Chapters 2 and 3` with no link                              |
| `MDCP.BareSectionRef`     | `Section 2`, `Sec. 2` or `Sections 2 and 3` with no link                             |
| `MDCP.UnlinkedSeeChapter` | `See Chapter 2` with no link                                                         |
| `MDCP.UnlinkedSeeSection` | `See Section 2` with no link                                                         |
| `MDCP.DatedClaim`         | `as of` or `until` before an ISO date, such as `as of 2026-07-27`, headings included |

Every rule is error level, so `mdcp check --require-vale` fails on it. `MDCP.DatedClaim` asks for what is true now: a dated reason belongs in a dated record such as an ADR or CHANGELOG entry, linked from the shard. It flags every dated claim whatever its age, because a Vale rule can't compare a date with today.

The `TokenIgnores` pattern skips each inline link from its label to its closing parenthesis, so a dated label such as `[as of 2026-07-27](./snapshot.md)` passes. A label may contain one level of brackets, as in `[Chapter 2 [draft]](./draft.md)`. A backslash-escaped bracket in a label counts as text. The rule still flags a reference-style label such as `[as of 2026-07-27][ref]`. It can miss a claim split by emphasis markers, such as `as of **2026-07-27**`.

### Enable with Vale Packages

Use `Packages` when consuming the MDCP Vale style as a release zip:

```ini
StylesPath = styles
MinAlertLevel = suggestion
Packages = https://github.com/betsalel-williamson/mdcp/releases/download/<tag>/mdcp-presets-vale.zip

[*.{md,mdx}]
BasedOnStyles = MDCP
TokenIgnores = \[(?:\\.|[^\[\]\\]|\[(?:\\.|[^\[\]\\])*\])*\]\([^)]*\)
```

Then run:

```bash
vale sync
```

The package config enables `MDCP` and ignores already-linked GFM markdown tokens so labels such as `[Section 2](./other.md#section-2)` do not false-positive. Vale 3.15.1 syncs local directory packages such as `./node_modules/@bwilliamson/mdcp-presets/vale/package` as style files but moves the package `.vale.ini`, so use the fallback below for npm-directory installs in this version.

Merge with other Vale packages by listing each package and combining styles:

```ini
StylesPath = styles
MinAlertLevel = suggestion
Packages = Microsoft, https://github.com/betsalel-williamson/mdcp/releases/download/<tag>/mdcp-presets-vale.zip

[*.{md,mdx}]
BasedOnStyles = Microsoft, MDCP
TokenIgnores = \[(?:\\.|[^\[\]\\]|\[(?:\\.|[^\[\]\\])*\])*\]\([^)]*\)
```

The heading-mention rules use `scope: ~heading` so ATX heading titles (which may contain the words Chapter/Section) are not matched. `MDCP.DatedClaim` keeps the default scope, so a dated heading is flagged too. The mdcp repo's local `MDCP-PandocId` style uses `scope: heading` for Pandoc IDs (`{#…}`).

Run prose checks with:

```bash
mdcp prose --require-vale
# or
mdcp check --require-vale
```

If your Vale setup cannot use `Packages`, or you are using the npm directory path on Vale 3.15.1, copy or symlink `node_modules/@bwilliamson/mdcp-presets/vale/MDCP` into your `StylesPath` and merge the `TokenIgnores` example from `vale/package/.vale.ini`.

## Wire markdownlint into `mdcp.config.json`

Point `lint.markdownlint` at the installed preset files:

```json
{
  "lint": {
    "markdownlint": {
      "shardsConfig": "node_modules/@bwilliamson/mdcp-presets/markdownlint-shards.markdownlint-cli2.jsonc",
      "compiledConfig": "node_modules/@bwilliamson/mdcp-presets/markdownlint-compiled.markdownlint-cli2.jsonc"
    }
  }
}
```

Then run:

```bash
mdcp lint --require-lint
# or
mdcp check --require-lint
```

`mdcp lint` runs the shards config first, recompiles, then runs the compiled config.

Shard lint scope comes from `compileOrder` guide directories (or `lint.markdownlint.shardsGlobs` in config) — the preset supplies rules and exclusions only, not file scope.

## Package exports

```text
@bwilliamson/mdcp-presets/markdownlint-shards.markdownlint-cli2.jsonc
@bwilliamson/mdcp-presets/markdownlint-compiled.markdownlint-cli2.jsonc
@bwilliamson/mdcp-presets/vale/mdcp.vale.ini
@bwilliamson/mdcp-presets/vale/MDCP/*
@bwilliamson/mdcp-presets/vale/package/.vale.ini
@bwilliamson/mdcp-presets/vale/package/styles/MDCP/*
```

markdownlint-cli2 expects a filesystem path in `--config`, so the `node_modules/...` form above is the usual approach. Vale can sync the packaged MDCP style from `node_modules/@bwilliamson/mdcp-presets/vale/package`.

## Customizing

Copy a preset into your repo and edit it, or extend via markdownlint-cli2's `extends` pattern / Vale rule toggles (`MDCP.BareChapterRef = NO`). The shipped presets are a starting point — tune rules to match your style guide.

Set a rule's level in `.vale.ini`. `MDCP.DatedClaim = warning` keeps the alert but stops it failing `mdcp check`, and a path section turns it off for files that are dated by design, such as research records:

```ini
[*.{md,mdx}]
BasedOnStyles = MDCP
MDCP.DatedClaim = warning

[**/research/*.md]
MDCP.DatedClaim = NO
```

`mdcp prose` and `mdcp check` pass Vale absolute paths, so start a path section with `**/`. A section such as `[research/*.md]` matches only when Vale runs on a relative path.

To exempt one passage, wrap it in Vale comments:

```markdown
<!-- vale MDCP.DatedClaim = NO -->

As of 2026-07-27 the runner image is pinned to this digest.

<!-- vale MDCP.DatedClaim = YES -->
```

## Related packages

| Package                                                                          | Use                                                 |
| -------------------------------------------------------------------------------- | --------------------------------------------------- |
| [`@bwilliamson/mdcp-cli`](https://www.npmjs.com/package/@bwilliamson/mdcp-cli)   | Runs these configs via `mdcp lint` and `mdcp check` |
| [`@bwilliamson/mdcp-core`](https://www.npmjs.com/package/@bwilliamson/mdcp-core) | Core compile and validation library                 |

## Example

See [examples/sample-guides/mdcp.config.json](../../examples/sample-guides/mdcp.config.json) in the mdcp repo (paths differ in the monorepo vs. a consumer install).

## License

MIT
