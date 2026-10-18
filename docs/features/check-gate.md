# Check gate

Specification for `merlon check`, the validation gate a change passes locally and in CI before it merges. The [Spec-to-test map](../developer/packages-and-tests.md#spec-to-test-map) names the tests behind this spec.

`merlon check` does **not** review whether documentation content is accurate or complete for the product. It enforces structural integrity: shards are captured, compile succeeds, links and anchors resolve, and optional linters run. **`merlon compile`** produces the compiled guides people review as single files. Whether the prose matches the product still depends on agents following the skill and on **human review** in pull requests ([Documentation and software reliability](./documentation-and-reliability.md#where-merlon-docs-fits)).

## Check gate stages

`merlon check` runs its stages in the order of this table. When a stage that stops the run fails, `merlon check` exits 1 right after that stage's diagnostics. Continuing stages record a failure and let the run go on to the next stage. So one run reports each continuing stage that fails.

| Stage                   | Runs when                                                  | Checks                                                                                                                                                                                        | On failure                                          |
| ----------------------- | ---------------------------------------------------------- | --------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- | --------------------------------------------------- |
| Orphans                 | Always                                                     | That each top-level shard is in its guide's manifest, and that each manifest link points at a file that exists. A missing guide directory or an unreadable manifest fails too                 | Stops the run                                       |
| Compile                 | Always                                                     | Writes every compiled output, as `merlon compile` does                                                                                                                                        | Stops the run                                       |
| Refs                    | Always                                                     | Writes `refs.json` from this compile, then verifies it against the same compile. [Stale registry check](./refs-registry-path.md#stale-registry-check) says which command catches a stale file | Stops the run                                       |
| Built-in links          | `lint.links.enabled` isn't `false`                         | Links and `#fragment` anchors in the compiled outputs, which contain every shard a guide stitches. In the standalone guides, links and same-file `#fragment` anchors                          | Continues, and fails only at severity `error`       |
| markdownlint (shards)   | `lint.markdownlint.shardsConfig` is set                    | Markdown structure of the guide shards                                                                                                                                                        | Continues                                           |
| markdownlint (compiled) | `lint.markdownlint.compiledConfig` is set                  | Markdown structure of the compiled outputs that the `compiledConfig` globs match                                                                                                              | Continues                                           |
| markdown-link-check     | `lint.links.config` is set and the peer is installed       | Links in `lint.links.target`, or else in the monolith, external URLs included                                                                                                                 | Continues                                           |
| Vale                    | `--skip-vale` isn't given                                  | Prose of the scanned shards and the standalone guides                                                                                                                                         | Continues                                           |
| Paths                   | `lint.paths.severity` is `warn` or `error` (default `off`) | Backtick paths in prose that resolve nowhere                                                                                                                                                  | Continues, and fails only at severity `error`       |
| Coverage                | Always                                                     | Markdown files that no guide captures, and `standaloneGuides` entries that match no file                                                                                                      | Continues, and fails only under `scan.strict: true` |

Built-in links reads a shard's links only where an output stitches the shard. So the stage doesn't read an unlinked file in a guide subdirectory or under `compile.scopeRoot` until the guide's manifest or a stitched shard links to it. The orphan and coverage stages don't flag such a file either, as [Relationship to the orphan check](./coverage-scan.md#relationship-to-the-orphan-check) says.

Peer linters aren't bundled. [Peer linters](./design-constraints/peer-linters.md) says where `merlon check` looks for each tool, and [In-scope guide fileset](../client-cli/optional-linters.md#in-scope-guide-fileset) lists the files that markdownlint and Vale read in a run. When markdownlint-cli2 or Vale is missing, its stage prints an info line and passes. With `--require-lint` a missing markdownlint-cli2 is a continuing failure instead, and so is a missing Vale with `--require-vale`. A missing markdown-link-check skips its stage without a line. The stage is also skipped when it has nothing to check, and no flag makes it required. Vale fails on an error-level alert or a runtime error, and [Vale alert level](../client-cli/optional-linters.md#vale-alert-level) says which alerts it prints.

## Check failure summary

When a continuing stage fails, `merlon check` runs the stages after it and then ends with a failure summary on stderr. When any stage emits non-fatal warnings (`link-warn:`, `path-warn:`, non-strict `coverage`, or Vale warnings), `merlon check` also prints a `merlon check warnings` summary block before the failure summary (or before the final pass line) so warnings are never lost in earlier output. This run had a shard link to a page that doesn't exist and a list that markdownlint flags:

```text
merlon check failed:
  - built-in links: 1 issue(s) (see `link:` lines above)
    → missing publish path: link a published guide outputFile, or list the target guide in compile.crossGuideLinks.ignoreGuides when shard paths are intentional. Do not link durable docs to pending .changeset/*.md files.
  - markdownlint (shards): peer exited non-zero (see markdownlint output above)
    → Fix flagged shard markdown, or run `merlon fix` when Prettier/markdownlint fix is configured.

Resolve the diagnostics above, then re-run: merlon check
```

| Summary part | Role                                                                                                                                                                             |
| ------------ | -------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- |
| Step name    | The continuing stage that failed or warned: `built-in links`, `markdownlint (shards)`, `markdownlint (compiled)`, `markdown-link-check`, `vale`, `path resolution` or `coverage` |
| Detail       | How many issues, or where the peer's own output is                                                                                                                               |
| Hint         | A next action, on a line that starts with `→`. Built-in links give one for each kind of link issue in the run                                                                    |

The summary lists continuing stages only, and a stage that stops the run exits without one. The orphan and refs stages print their own `merlon check failed:` line after their diagnostics, in place of the summary. An error in compile ends the run with that error's message. Coverage under `scan.strict: true` records its failure in the summary alongside any earlier continuing failures.

When `--diagnostics-dir`, `--errors-file`, `--warnings-file`, or the `diagnostics` config object is set, `merlon check` writes error diagnostics and warning diagnostics to separate files (`errors.txt` and `warnings.txt` by default) and prints `errors_file:` and `warnings_file:` paths in the summary.

A run in which every stage passes ends with `merlon check passed` on stdout (or `merlon check passed with warning(s) (N step(s))` when non-fatal warnings were reported).

## Check gate exit status

`merlon check` exits 0 when every stage passes. It exits 1 when a stage stops the run or a continuing stage fails. Some stages report a problem and still pass:

- Built-in links in warn mode, set by `--warn-broken-links` or `lint.links.severity: "warn"`, print `link-warn:` lines. [Exit codes](./link-validation.md#exit-codes) has the link rules.
- Paths at severity `warn` print their findings, as [Path resolution config](./path-resolution.md#path-resolution-config) describes.
- Coverage gaps fail the run only under `scan.strict: true`. See [Check surface](./coverage-scan.md#check-surface).
- A missing markdownlint-cli2 or Vale passes unless `--require-lint` or `--require-vale` asks for it. markdown-link-check has no such flag.

## Check gate acceptance criteria

- Stages run in the order of the stage table
- An orphan exits 1 with its `orphan:` lines, before compile runs and without a failure summary
- When a continuing stage fails, the run goes on through the later stages and ends with a stderr failure summary that lists each failed step in stage order with its remediation hints
- Non-fatal warnings from continuing stages are summarized in a `merlon check warnings` block at the end of the run, and split diagnostic files are written when `--diagnostics-dir`, `--errors-file`, `--warnings-file` or `diagnostics` config is set
- A broken internal link exits 1 by default, and the summary gives a hint for each kind of link issue
- Coverage gaps print `uncaptured:` lines and exit 0 by default. They exit 1 when `scan.strict` is `true`, and appear in the failure summary alongside any earlier continuing failures
- A run in which every stage passes prints `merlon check passed` (with warning step count when warnings occurred) and exits 0

## Check gate related

- [Built-in link validation](./link-validation.md)
- [Documentation coverage scan](./coverage-scan.md)
- [Path resolution in prose](./path-resolution.md)
- [Optional linters](../client-cli/optional-linters.md)
- [Commands reference](../client-cli/commands-reference.md)
