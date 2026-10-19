# @merlon-docs/merlon-docs-presets

Starter **markdownlint-cli2** configs and a **Vale** style package (`MerlonDocs`) for Merlon Docs consumer repos.

Install alongside `@merlon-docs/merlon-docs-cli` when you want `merlon lint` / `merlon prose` (or `merlon check --require-lint` / `--require-vale`) without writing lint configs from scratch.

## Requirements

- Node.js **>= 20.19.0**
- `markdownlint-cli2` for structure lint
- [Vale](https://vale.sh/) on `PATH` for prose lint (peer binary; not an npm dependency)

## Install

```bash
npm install -D @merlon-docs/merlon-docs-presets markdownlint-cli2 @merlon-docs/merlon-docs-cli
```

## Markdownlint presets

| File                                            | Targets                                       | Intent                                                                                  |
| ----------------------------------------------- | --------------------------------------------- | --------------------------------------------------------------------------------------- |
| `markdownlint-shards.markdownlint-cli2.jsonc`   | Registered guide shard trees (scope from CLI) | Relaxed rules for shard authoring — each shard starts with `#`, duplicates are expected |
| `markdownlint-compiled.markdownlint-cli2.jsonc` | `_build/guides.md` and `guides.md`            | Shard rules plus reference-link rules (`MD052`, `MD053`) on the compiled monolith       |

### Shard preset highlights

- ATX headings (`#`), 2-space list indent
- `MD001`, `MD013` (line length), `MD024` (duplicate headings), `MD041` (first line H1) disabled — merlon compile handles structure
- `MD025` front-matter title disabled
- Excludes the `index.md` manifests and the compiled outputs under the default `outputDir` (`_build/**`) or in a `guides.md` at the docs root, so a guide at `.` doesn't lint the compiled outputs. Exclude any other compiled output in a copy of the preset

### Compiled preset highlights

- Checks reference links and their definitions (`MD052`, `MD053`) across the monolith. Link fragments (`MD051`) stay off, because the built-in link validation in `merlon check` covers them when `lint.links` is enabled (the default)
- Keeps every other rule as the shard preset sets it, so a rule the shard pass turns off, such as line length (`MD013`) or duplicate headings (`MD024`), stays off on the monolith
- Targets a monolith named `guides.md`: `_build/guides.md` under the default `outputDir`, or `guides.md` with `outputDir: "."`. markdownlint-cli2 resolves the globs against its cwd, which `merlon lint` and `merlon check` set to `--docs-root`
- Lints 0 files and passes when there is no monolith, or the monolith has another name or path, so copy the preset and point its `globs` at your compiled outputs
- Lints a `guides.md` left at the docs root by an earlier `outputDir: "."` layout too, so delete that file when you move to `_build`

## Vale style (`MerlonDocs`)

English (en-US) prose cues when docs **mention** a numbered heading (`Chapter` / `Section` / `Ch.` / `Sec.`) without a GFM markdown link, or pin a claim to a date. Merlon Docs itself only models headings and links. This style is language-specific static analysis. Leave compile and structural validation, including link targets, to [merlon-docs-core](https://www.npmjs.com/package/@merlon-docs/merlon-docs-core). See [Locale and language boundary](../../docs/features/design-constraints/locale-and-language.md).

| Path                   | Role                                            |
| ---------------------- | ----------------------------------------------- |
| `vale/package/`        | Vale Packages-compatible layout for `vale sync` |
| `vale/MerlonDocs/`     | Source Vale style rules                         |
| `vale/merlon.vale.ini` | Sample `.vale.ini` snippet for consumers        |

| Rule                            | Flags                                                                                |
| ------------------------------- | ------------------------------------------------------------------------------------ |
| `MerlonDocs.BareChapterRef`     | `Chapter 2`, `Ch. 2` or `Chapters 2 and 3` with no link                              |
| `MerlonDocs.BareSectionRef`     | `Section 2`, `Sec. 2` or `Sections 2 and 3` with no link                             |
| `MerlonDocs.UnlinkedSeeChapter` | `See Chapter 2` with no link                                                         |
| `MerlonDocs.UnlinkedSeeSection` | `See Section 2` with no link                                                         |
| `MerlonDocs.DatedClaim`         | `as of` or `until` before an ISO date, such as `as of 2026-07-27`, headings included |

Every rule is error level, so `merlon check --require-vale` fails on it. `MerlonDocs.DatedClaim` asks for what is true now. The history behind a rule that still holds moves to an ADR that the doc links, and a temporary note moves to the tracker. Text that only describes removed behavior is deleted, and the release notes give its notice. An ADR keeps the rule on and writes each date on its own, without `as of` or `until`. The rule flags every dated claim whatever its age, because a Vale rule can't compare a date with today.

The `TokenIgnores` pattern skips each inline link from its label to its closing parenthesis, so a dated label such as `[as of 2026-07-27](./snapshot.md)` passes. A label may contain one level of brackets, as in `[Chapter 2 [draft]](./draft.md)`. A backslash-escaped bracket in a label counts as text. The rule still flags a reference-style label such as `[as of 2026-07-27][ref]`. It can miss a claim split by emphasis markers, such as `as of **2026-07-27**`.

### Enable with Vale Packages

Use `Packages` when consuming the MerlonDocs Vale style as a release zip:

```ini
StylesPath = styles
MinAlertLevel = suggestion
Packages = https://github.com/Merlon-Docs/merlon/releases/download/<tag>/merlon-docs-presets-vale.zip

[*.{md,mdx}]
BasedOnStyles = MerlonDocs
TokenIgnores = \[(?:\\.|[^\[\]\\]|\[(?:\\.|[^\[\]\\])*\])*\]\([^)]*\)
```

Then run:

```bash
vale sync
```

The package config enables `MerlonDocs` and ignores already-linked GFM markdown tokens so labels such as `[Section 2](./other.md#section-2)` do not false-positive. Vale 3.15.1 syncs local directory packages such as `./node_modules/@merlon-docs/merlon-docs-presets/vale/package` as style files but moves the package `.vale.ini`, so use the fallback below for npm-directory installs in this version.

Merge with other Vale packages by listing each package and combining styles:

```ini
StylesPath = styles
MinAlertLevel = suggestion
Packages = Microsoft, https://github.com/Merlon-Docs/merlon/releases/download/<tag>/merlon-docs-presets-vale.zip

[*.{md,mdx}]
BasedOnStyles = Microsoft, MerlonDocs
TokenIgnores = \[(?:\\.|[^\[\]\\]|\[(?:\\.|[^\[\]\\])*\])*\]\([^)]*\)
```

The heading-mention rules use `scope: ~heading` so ATX heading titles (which may contain the words Chapter/Section) are not matched. `MerlonDocs.DatedClaim` keeps the default scope, so a dated heading is flagged too. The Merlon Docs repository's local `MerlonDocs-PandocId` style uses `scope: heading` for Pandoc IDs (`{#…}`).

Run prose checks with:

```bash
merlon prose --require-vale
# or
merlon check --require-vale
```

If your Vale setup cannot use `Packages`, or you are using the npm directory path on Vale 3.15.1, copy or symlink `node_modules/@merlon-docs/merlon-docs-presets/vale/MerlonDocs` into your `StylesPath` and merge the `TokenIgnores` example from `vale/package/.vale.ini`.

## Wire markdownlint into `merlon.config.json`

Point `lint.markdownlint` at the installed preset files:

```json
{
  "lint": {
    "markdownlint": {
      "shardsConfig": "node_modules/@merlon-docs/merlon-docs-presets/markdownlint-shards.markdownlint-cli2.jsonc",
      "compiledConfig": "node_modules/@merlon-docs/merlon-docs-presets/markdownlint-compiled.markdownlint-cli2.jsonc"
    }
  }
}
```

Then run:

```bash
merlon lint --require-lint
# or
merlon check --require-lint
```

`merlon lint` runs the shards config first, recompiles, then runs the compiled config.

Shard lint scope comes from the Markdown files in the `compileOrder` guide directories, or from `lint.markdownlint.shardsGlobs` in config. The preset supplies rules and exclusions only, not file scope.

## Package exports

```text
@merlon-docs/merlon-docs-presets/markdownlint-shards.markdownlint-cli2.jsonc
@merlon-docs/merlon-docs-presets/markdownlint-compiled.markdownlint-cli2.jsonc
@merlon-docs/merlon-docs-presets/vale/merlon.vale.ini
@merlon-docs/merlon-docs-presets/vale/MerlonDocs/*
@merlon-docs/merlon-docs-presets/vale/package/.vale.ini
@merlon-docs/merlon-docs-presets/vale/package/styles/MerlonDocs/*
```

markdownlint-cli2 expects a filesystem path in `--config`, so the `node_modules/...` form above is the usual approach. Vale can sync the packaged MerlonDocs style from `node_modules/@merlon-docs/merlon-docs-presets/vale/package`.

## Customizing

Copy a preset into your repo and edit it, or extend via markdownlint-cli2's `extends` pattern / Vale rule toggles (`MerlonDocs.BareChapterRef = NO`). The shipped presets are a starting point — tune rules to match your style guide.

Set a rule's level in `.vale.ini`. `MerlonDocs.DatedClaim = warning` keeps the alert but stops it failing `merlon check`. A plain `merlon prose` shows the warning, and `merlon check` shows it once `vale.strictMinAlertLevel` is `warning` (see [Vale alert level](../../docs/client-cli/optional-linters.md#vale-alert-level)). A path section turns the rule off for files that are dated by design, such as research records:

```ini
[*.{md,mdx}]
BasedOnStyles = MerlonDocs
MerlonDocs.DatedClaim = warning

[**/research/*.md]
MerlonDocs.DatedClaim = NO
```

Put that section last, after every section that matches the same files, because a later section that sets the rule turns it back on. `merlon prose` and `merlon check` pass Vale absolute paths, so start a path section with `**/`. A section such as `[research/*.md]` matches only when Vale runs on a relative path.

To exempt one passage, such as a measurement in a research record, wrap it in Vale comments:

```markdown
<!-- vale MerlonDocs.DatedClaim = NO -->

As of 2026-07-27 the median build took 41 seconds on the reference runner.

<!-- vale MerlonDocs.DatedClaim = YES -->
```

## Related packages

| Package                                                                                        | Use                                                     |
| ---------------------------------------------------------------------------------------------- | ------------------------------------------------------- |
| [`@merlon-docs/merlon-docs-cli`](https://www.npmjs.com/package/@merlon-docs/merlon-docs-cli)   | Runs these configs via `merlon lint` and `merlon check` |
| [`@merlon-docs/merlon-docs-core`](https://www.npmjs.com/package/@merlon-docs/merlon-docs-core) | Core compile and validation library                     |

## Example

See [examples/sample-guides/merlon.config.json](../../examples/sample-guides/merlon.config.json) in the Merlon Docs repository (paths differ in the monorepo vs. a consumer install).

## License

MIT
