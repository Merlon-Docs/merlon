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
| `markdownlint-compiled.markdownlint-cli2.jsonc` | `_build/guides.md` and `guides.md`            | Shard rules plus reference-link rules (`MD052`, `MD053`) on the compiled monolith       |

### Shard preset highlights

- ATX headings (`#`), 2-space list indent
- `MD001`, `MD013` (line length), `MD024` (duplicate headings), `MD041` (first line H1) disabled — mdcp compile handles structure
- `MD025` front-matter title disabled
- Excludes the `index.md` manifests and the compiled outputs under the default `outputDir` (`_build/**`) or in a `guides.md` at the docs root, so a guide at `.` doesn't lint the compiled outputs. Exclude any other compiled output in a copy of the preset

### Compiled preset highlights

- Checks reference links and their definitions (`MD052`, `MD053`) across the monolith. Link fragments (`MD051`) stay off, because the built-in link validation in `mdcp check` covers them when `lint.links` is enabled (the default)
- Keeps every other rule as the shard preset sets it, so a rule the shard pass turns off, such as line length (`MD013`) or duplicate headings (`MD024`), stays off on the monolith
- Targets a monolith named `guides.md`: `_build/guides.md` under the default `outputDir`, or `guides.md` with `outputDir: "."`. markdownlint-cli2 resolves the globs against its cwd, which `mdcp lint` and `mdcp check` set to `--docs-root`
- Lints 0 files and passes when there is no monolith, or the monolith has another name or path, so copy the preset and point its `globs` at your compiled outputs
- Lints a `guides.md` left at the docs root by an earlier `outputDir: "."` layout too, so delete that file when you move to `_build`

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

Every rule is error level, so `mdcp check --require-vale` fails on it. `MDCP.DatedClaim` asks for what is true now. The history behind a rule that still holds moves to an ADR that the doc links, and a temporary note moves to the tracker. Text that only describes removed behavior is deleted, and the release notes give its notice. An ADR keeps the rule on and writes each date on its own, without `as of` or `until`. The rule flags every dated claim whatever its age, because a Vale rule can't compare a date with today.

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

Shard lint scope comes from the Markdown files in the `compileOrder` guide directories, or from `lint.markdownlint.shardsGlobs` in config. The preset supplies rules and exclusions only, not file scope.

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

Set a rule's level in `.vale.ini`. `MDCP.DatedClaim = warning` keeps the alert but stops it failing `mdcp check`. A plain `mdcp prose` shows the warning, and `mdcp check` shows it once `vale.strictMinAlertLevel` is `warning` (see [Vale alert level](../../docs/client-cli/optional-linters.md#vale-alert-level)). A path section turns the rule off for files that are dated by design, such as research records:

```ini
[*.{md,mdx}]
BasedOnStyles = MDCP
MDCP.DatedClaim = warning

[**/research/*.md]
MDCP.DatedClaim = NO
```

Put that section last, after every section that matches the same files, because a later section that sets the rule turns it back on. `mdcp prose` and `mdcp check` pass Vale absolute paths, so start a path section with `**/`. A section such as `[research/*.md]` matches only when Vale runs on a relative path.

To exempt one passage, such as a measurement in a research record, wrap it in Vale comments:

```markdown
<!-- vale MDCP.DatedClaim = NO -->

As of 2026-07-27 the median build took 41 seconds on the reference runner.

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
