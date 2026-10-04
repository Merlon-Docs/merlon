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

MDCP knows the **full fileset** it manages. The guides in `compileOrder` resolve via `guides[].path` or `{docsRoot}/{name}/`, and `standaloneGuides` registers the [standalone guides](../glossary/standalone-guide.md). Shard markdownlint lints the guide directories. Vale prose lints the guide directories and the standalone guides, because a file that never compiles still reaches readers as written. Both linters skip markdown that the config does not name, such as legacy flat `.md` files or unregistered sibling folders under `--docs-root`.

| Command                                        | Default scope                                     | Out of scope (skipped)                                  |
| ---------------------------------------------- | ------------------------------------------------- | ------------------------------------------------------- |
| Shard markdownlint (`mdcp lint`, `mdcp check`) | `compileOrder` guide directories                  | Legacy flat docs, unrelated subdirs under `--docs-root` |
| Vale prose (`mdcp prose`, `mdcp check`)        | Guide directories plus `standaloneGuides` files   | Same                                                    |
| Compiled markdownlint                          | Compiled outputs listed in `compiledConfig` globs | Shard trees (covered by the shard pass)                 |

Optional overrides replace the guide directories with the paths you list, so scope never reaches past what the config names:

| Config field                    | Purpose                                                                                          |
| ------------------------------- | ------------------------------------------------------------------------------------------------ |
| `lint.markdownlint.shardsGlobs` | Shard markdownlint paths relative to `--docs-root` (default: compileOrder guide dirs)            |
| `vale.scanGlobs`                | Vale prose paths relative to `--docs-root` in place of the guide dirs; standalone guides stay in |

Vale lints each standalone guide once, even when it is inside a scanned directory or two `standaloneGuides` entries match it. The exception is a guide that a scanned directory also reaches through a symlinked subdirectory. Vale follows that link when it walks the directory, so it lints the file under both names.

Vale does not expand globs, so each `vale.scanGlobs` entry must be a file or directory that exists. Given more than one path, Vale stops with a runtime error on a missing one, and the `mdcp check` hint then points at the config. When a missing path is the only one Vale gets, Vale reads it as literal text, so that run passes without linting any file.

The `@bwilliamson/mdcp-presets` shard config supplies **rules and exclusions** (`!**/index.md`, `!guides.md`). **Scope always comes from the CLI** — not from preset globs.

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
