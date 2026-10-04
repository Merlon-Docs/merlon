# Optional linters

These commands use tools installed in **your** repo (not bundled with mdcp):

| Command      | Peer tool                       | Purpose                                                                   |
| ------------ | ------------------------------- | ------------------------------------------------------------------------- |
| `mdcp lint`  | `markdownlint-cli2`             | Lint shards and compiled output (GFM / Markdown structure)                |
| `mdcp prose` | `vale` (install separately)     | Prose style lint (Vale style packages; Microsoft = US English)            |
| `mdcp links` | `markdown-link-check`           | Optional HTTP URL checks (peer; not built-in internal link validation)    |
| `mdcp fix`   | `prettier`, `markdownlint-cli2` | Run `prettier --write .` then `markdownlint-cli2 --fix` (no config paths) |

`mdcp fix` does not bundle formatters. Install **Prettier** and **markdownlint-cli2** in your repo first (`node_modules/.bin` or PATH). Each step is skipped with an info message if the peer is missing.

```bash
mdcp lint --require-lint          # fail if markdownlint-cli2 is missing
mdcp prose --require-vale         # fail if Vale is missing
mdcp check --require-lint --require-vale   # CI gate with markdownlint + Vale
mdcp check --skip-vale            # structural checks only
```

`mdcp check` runs **built-in** internal link validation by default (`lint.links.enabled`). Peer `markdown-link-check` runs only when **`lint.links.config`** is set and the peer is installed. `mdcp links` always skips quietly if the peer is missing.

Install npm peers with:

```bash
npm install -D prettier markdownlint-cli2 @bwilliamson/mdcp-presets
```

Install **Vale** separately so `vale` is on your `PATH` — see [Vale installation](https://vale.sh/docs/vale-cli/installation/) (Homebrew, Chocolatey, Snap, or GitHub release). After adding a `.vale.ini`, run `vale sync` in that directory.

Wire preset paths in `mdcp.config.json` under `lint.markdownlint`. See `@bwilliamson/mdcp-presets` on npm.

A [locale pack](../glossary/locale-pack.md) is MDCP compile-time wording, not a Vale style. The **`MDCP` Vale style** in `@bwilliamson/mdcp-presets` (`vale/MDCP/`) holds the en-US prose cues. Its rules flag a numbered heading mention with no link, and `MDCP.DatedClaim` flags `as of` or `until` before an ISO date. See [Locale and language boundary](../features/design-constraints/locale-and-language.md).

## Vale alert level

`mdcp prose` passes no alert level to Vale, so the `MinAlertLevel` in your `.vale.ini` sets what it shows. `mdcp prose --strict` and `mdcp check` pass `--minAlertLevel` from `vale.strictMinAlertLevel`, which defaults to `error`. To show warnings in those runs too:

```json
{
  "vale": {
    "strictMinAlertLevel": "warning"
  }
}
```

Of Vale's alerts, only error-level ones fail `mdcp prose` or `mdcp check`, so a lower `vale.strictMinAlertLevel` adds warnings or suggestions to the output and leaves the exit code as it was. A Vale runtime error, such as a missing style, also fails both commands. To make a rule fail the check, set its level to `error` in `.vale.ini`. A rule set to `warning`, such as `MDCP.DatedClaim = warning`, no longer fails `mdcp check`, and `mdcp prose` still shows it when the `.vale.ini` `MinAlertLevel` is `warning` or lower.

## In-scope guide fileset

MDCP knows the **full fileset** it manages. The guides in `compileOrder` resolve via `guides[].path` or `{docsRoot}/{name}/`, and `standaloneGuides` registers the [standalone guides](../glossary/standalone-guide.md). Shard markdownlint lints the Markdown files in the guide directories. Vale prose lints the guide directories and the standalone guides, because a file that never compiles still reaches readers as written. Both linters skip markdown that the config does not name, such as legacy flat `.md` files or unregistered sibling folders under `--docs-root`.

| Command                                        | Default scope                                     | Out of scope (skipped)                                  |
| ---------------------------------------------- | ------------------------------------------------- | ------------------------------------------------------- |
| Shard markdownlint (`mdcp lint`, `mdcp check`) | Markdown in `compileOrder` guide directories      | Legacy flat docs, unrelated subdirs under `--docs-root` |
| Vale prose (`mdcp prose`, `mdcp check`)        | Guide directories plus `standaloneGuides` files   | Same                                                    |
| Compiled markdownlint                          | Compiled outputs listed in `compiledConfig` globs | Shard trees (covered by the shard pass)                 |

Optional overrides replace the guide directories with the paths you list, so scope never reaches past what the config names:

| Config field                    | Purpose                                                                                               |
| ------------------------------- | ----------------------------------------------------------------------------------------------------- |
| `lint.markdownlint.shardsGlobs` | Shard markdownlint paths relative to `--docs-root` (default: the Markdown in compileOrder guide dirs) |
| `vale.scanGlobs`                | Vale prose paths relative to `--docs-root` in place of the guide dirs; standalone guides stay in      |

Both markdownlint passes run with the docs root as their cwd. For each guide directory, mdcp passes the shard pass a glob for the `.md` and `.markdown` files in it, such as `features/**/*.{md,markdown}`, so an image or text file beside the shards stays out of the shard pass. For a guide under the docs root, the glob is relative to the docs root and leaves the checkout path out. A relative or absolute `--docs-root` then lints the same shards, even under a directory whose name has glob characters, such as `repo (copy)`. A guide outside the docs root gets an absolute glob. With it, the shard preset's exclusions still apply to the guide, and markdownlint-cli2 still finds the guide under a symlinked docs root. mdcp escapes the glob characters and quotes in each path it puts in a glob.

A `lint.markdownlint.shardsGlobs` entry goes to markdownlint-cli2 as written, and markdownlint-cli2 resolves it against the docs root. The exceptions are `.`, which mdcp passes as `**`, and an entry that starts with `../`, negated or not, which mdcp makes absolute for the same reasons as a guide outside the docs root. Given `.` as its only path, markdownlint-cli2 would lint the Markdown files at the top of the docs root and nothing below them. It lints every file under any other directory entry, and an entry that starts with `!` or `#` excludes the files it matches. The compiled pass gets only `--config` from mdcp, and markdownlint-cli2 resolves the `globs` in `compiledConfig` against its cwd, the docs root.

Vale lints each standalone guide once, even when it is inside a scanned directory or two `standaloneGuides` entries match it. The exception is a guide that a scanned directory also reaches through a symlinked subdirectory. Vale follows that link when it walks the directory, so it lints the file under both names.

Vale does not expand globs, so each `vale.scanGlobs` entry must be a file or directory that exists. Given more than one path, Vale stops with a runtime error on a missing one, and the `mdcp check` hint then points at the config. When a missing path is the only one Vale gets, Vale reads it as literal text, so that run passes without linting any file.

The shard config in `@bwilliamson/mdcp-presets` supplies **rules and exclusions** (`!**/index.md`, `!guides.md`, `!_build/**`). **Scope always comes from the CLI**, not from preset globs. `!guides.md` and `!_build/**` keep the compiled outputs out of the shard pass when a guide at `.` or a `.` entry in `shardsGlobs` reaches the whole docs root. Any other compiled output, such as one under another `outputDir`, needs its own exclusion in a copy of the preset.

The `@bwilliamson/mdcp-presets` compiled config lists `_build/guides.md` and `guides.md`: a monolith named `guides.md` under the default `outputDir` or under `outputDir: "."`. A glob that matches no file is skipped without an error. With no monolith, or a monolith with another name or path, the compiled pass lints 0 files and passes, so copy the preset and point its `globs` at your compiled outputs. The preset also lints a `guides.md` that an earlier `outputDir: "."` layout left at the docs root. Compile doesn't update that file under the default `outputDir`, so delete it when you move to `_build`.

The compiled config keeps every rule setting of the shard config and also turns on `MD052` and `MD053`, which check reference links and their definitions across the monolith. A rule the shard pass turns off stays off on the monolith, so a heading that two guides share doesn't fail `MD024` there. Link fragments (`MD051`) stay off in both, because the [built-in link validation](../features/link-validation.md) in `mdcp check` checks them when `lint.links` is enabled, as it is by default.

`mdcp fix` is out of band: it runs `prettier --write .` and `markdownlint-cli2 --fix` from the docs root and is not part of mdcp's guide fileset gate. It reaches a standalone guide only when the file is under `--docs-root`.

### Opt a standalone guide out of Vale

To keep Vale off one standalone guide, such as vendored text, give it a section at the end of `.vale.ini`, after every section that matches the file, such as `[*.md]` or `[*.{md,mdx}]`:

```ini
[*.md]
BasedOnStyles = MDCP
MDCP.DatedClaim = warning

; Last, after every section that matches the file: the last match wins.
[**/CODE_OF_CONDUCT.md]
BasedOnStyles =
MDCP.DatedClaim = NO
```

Vale matches a section against the path it is given, and `mdcp prose` and `mdcp check` pass absolute paths. Start the section with `**/` to match them. A section such as `[CODE_OF_CONDUCT.md]` never matches. `**/` matches the file name at any depth, and adding parent directories, as in `[**/legal/CODE_OF_CONDUCT.md]`, narrows it.

Vale takes `BasedOnStyles` from the last matching section that sets it, and a rule's level from the last matching section that sets that rule. Put the opt-out section last, after every section that matches the file, and its empty `BasedOnStyles` turns every style off. A rule that an earlier section sets by name, such as `MDCP.DatedClaim = warning`, stays on until the opt-out section sets it to `NO`.

The file stays a standalone guide, so coverage and link validation still check it.
