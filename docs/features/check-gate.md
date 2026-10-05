# Check gate

Specification for `mdcp check`, the validation gate a change passes locally and in CI before it merges. Tests in `packages/mdcp-cli/test/cli.smoke.test.ts` and `packages/mdcp-cli/test/coverage.smoke.test.ts` map to the sections below.

## Check gate stages

`mdcp check` runs its stages in the order of this table. When a stage that stops the run fails, `mdcp check` exits 1 right after that stage's diagnostics. Continuing stages record a failure and let the run go on to the next stage. So one run reports each continuing stage that fails.

| Stage                   | Runs when                                                  | Checks                                                                                                                                                                        | On failure                                                          |
| ----------------------- | ---------------------------------------------------------- | ----------------------------------------------------------------------------------------------------------------------------------------------------------------------------- | ------------------------------------------------------------------- |
| Orphans                 | Always                                                     | That each top-level shard is in its guide's manifest, and that each manifest link points at a file that exists. A missing guide directory or an unreadable manifest fails too | Stops the run                                                       |
| Compile                 | Always                                                     | Writes every compiled output, as `mdcp compile` does                                                                                                                          | Stops the run                                                       |
| Refs                    | Always                                                     | Writes `refs.json` from this compile, then verifies it against the compile                                                                                                    | Stops the run                                                       |
| Built-in links          | `lint.links.enabled` isn't `false`                         | Links and `#fragment` anchors in the compiled outputs, which contain every shard a guide stitches. In the standalone guides, links and same-file `#fragment` anchors          | Continues, and fails only at severity `error`                       |
| markdownlint (shards)   | `lint.markdownlint.shardsConfig` is set                    | Markdown structure of the guide shards                                                                                                                                        | Continues                                                           |
| markdownlint (compiled) | `lint.markdownlint.compiledConfig` is set                  | Markdown structure of the compiled outputs that the `compiledConfig` globs match                                                                                              | Continues                                                           |
| markdown-link-check     | `lint.links.config` is set and the peer is installed       | Links in `lint.links.target`, or else in the monolith, external URLs included                                                                                                 | Continues                                                           |
| Vale                    | `--skip-vale` isn't given                                  | Prose of the scanned shards and the standalone guides                                                                                                                         | Continues                                                           |
| Paths                   | `lint.paths.severity` is `warn` or `error` (default `off`) | Backtick paths in prose that resolve nowhere                                                                                                                                  | Continues, and fails only at severity `error`                       |
| Coverage                | Always                                                     | Markdown files that no guide captures, and `standaloneGuides` entries that match no file                                                                                      | Stops the run under `scan.strict: true`, and only reports otherwise |

Built-in links reads a shard's links only where an output stitches the shard. So the stage doesn't read an unlinked file in a guide subdirectory or under `compile.scopeRoot` until the guide's manifest or a stitched shard links to it. The orphan and coverage stages don't flag such a file either.

Peer linters aren't bundled. [Peer linters](./design-constraints/peer-linters.md) says where `mdcp check` looks for each tool, and [In-scope guide fileset](../client-cli/optional-linters.md#in-scope-guide-fileset) lists the files that markdownlint and Vale read in a run. When markdownlint-cli2 or Vale is missing, its stage prints an info line and passes. With `--require-lint` a missing markdownlint-cli2 is a continuing failure instead, and so is a missing Vale with `--require-vale`. A missing markdown-link-check skips its stage without a line. The stage is also skipped when it has nothing to check, and no flag makes it required. Vale fails on an error-level alert or a runtime error, and [Vale alert level](../client-cli/optional-linters.md#vale-alert-level) says which alerts it prints.

## Check failure summary

When a continuing stage fails, `mdcp check` runs the stages after it and then ends with a failure summary on stderr, unless coverage stops the run first under `scan.strict: true`. A peer that passes prints its own success lines after the earlier failure. The summary then says why the run still exits 1. This run had a shard link to a page that doesn't exist and a list that markdownlint flags:

```text
mdcp check failed:
  - built-in links: 1 issue(s) (see `link:` lines above)
    → missing publish path: link a published guide outputFile, or list the target guide in compile.crossGuideLinks.ignoreGuides when shard paths are intentional. Do not link durable docs to pending .changeset/*.md files.
  - markdownlint (shards): peer exited non-zero (see markdownlint output above)
    → Fix flagged shard markdown, or run `mdcp fix` when Prettier/markdownlint fix is configured.

Resolve the diagnostics above, then re-run: mdcp check
```

| Summary part | Role                                                                                                                                                       |
| ------------ | ---------------------------------------------------------------------------------------------------------------------------------------------------------- |
| Step name    | The continuing stage that failed: `built-in links`, `markdownlint (shards)`, `markdownlint (compiled)`, `markdown-link-check`, `vale` or `path resolution` |
| Detail       | How many issues, or where the peer's own output is                                                                                                         |
| Hint         | A next action, on a line that starts with `→`. Built-in links give one for each kind of link issue in the run                                              |

The summary lists continuing stages only, and a stage that stops the run exits without one. The orphan and refs stages print their own `mdcp check failed:` line after their diagnostics, in place of the summary, and so does coverage under `scan.strict: true`. An error in compile ends the run with that error's message. Coverage stops the run after every continuing stage has run, so a run that also has a continuing failure prints that stage's own diagnostics and the coverage lines, with no summary.

A run in which every stage passes ends with `mdcp check passed` on stdout.

## Check gate exit status

`mdcp check` exits 0 when every stage passes. It exits 1 when a stage stops the run or a continuing stage fails. Some stages report a problem and still pass:

- Built-in links in warn mode, set by `--warn-broken-links` or `lint.links.severity: "warn"`, print `link-warn:` lines. [Exit codes](./link-validation.md#exit-codes) has the link rules.
- Paths at severity `warn` print their findings, as [Path resolution config](./path-resolution.md#path-resolution-config) describes.
- Coverage gaps fail the run only under `scan.strict: true`. See [Check surface](./coverage-scan.md#check-surface).
- A missing markdownlint-cli2 or Vale passes unless `--require-lint` or `--require-vale` asks for it. markdown-link-check has no such flag.

## Check gate acceptance criteria

- Stages run in the order of the stage table
- An orphan exits 1 with its `orphan:` lines, before compile runs and without a failure summary
- When a continuing stage fails, the run goes on through the later stages. Unless coverage stops the run, it ends with a stderr failure summary that lists each failed step in stage order with its remediation hints
- A broken internal link exits 1 by default, and the summary gives a hint for each kind of link issue
- Coverage gaps print `uncaptured:` lines and exit 0 by default. They exit 1 when `scan.strict` is `true`, after the continuing stages have run and with no failure summary
- A run in which every stage passes prints `mdcp check passed` and exits 0

## Check gate related

- [Built-in link validation](./link-validation.md)
- [Documentation coverage scan](./coverage-scan.md)
- [Path resolution in prose](./path-resolution.md)
- [Optional linters](../client-cli/optional-linters.md)
- [Commands reference](../client-cli/commands-reference.md)
