# Commands reference

## Global options

Every command accepts:

| Option                | Default            | Purpose                                                                          |
| --------------------- | ------------------ | -------------------------------------------------------------------------------- |
| `-c, --config <path>` | `mdcp.config.json` | Config file path, resolved from the **invocation directory** (not `--docs-root`) |
| `--docs-root <path>`  | current directory  | Docs root — one subdirectory per guide shard tree                                |
| `--warn-broken-links` | off                | Report broken internal links but exit 0 (overrides `lint.links.severity`)        |

**Repo-root npm scripts** typically use both flags:

```bash
mdcp compile --config docs/mdcp.config.json --docs-root docs
```

`--config` locates the file from where the command runs; `--docs-root` sets the shard tree root. These bases are independent — see [Config essentials](./config-essentials.md#--config-vs---docs-root).

## Daily workflow

```bash
# Regenerate the monolith from shards (link order from each guide's index.md / shards.md)
mdcp compile

# Full validation gate (orphans → compile → refs → links; optional peer linters)
mdcp check
```

`mdcp compile` and `mdcp check` exit **1** when broken internal links are found (default). Use `--warn-broken-links` to surface `link-warn:` diagnostics without failing CI. See [Link validation](../features/link-validation.md).

When `mdcp check` fails after continuing through peer linters, it prints a stderr **failure summary** (which steps failed and how to fix them) so CI logs are not only peer “0 errors” lines plus a bare exit code.

## Command summary

| Command          | When you need it                                                                                   |
| ---------------- | -------------------------------------------------------------------------------------------------- |
| `mdcp compile`   | Regenerate compiled outputs and `refs.json` under `outputDir` (exits 1 on broken links by default) |
| `mdcp check`     | Full gate: orphans → compile → refs → links; optional peer linters; non-fatal coverage report      |
| `mdcp review`    | Report documentation sprawl signals across guide shards (report-only; `--strict` to fail)          |
| `mdcp shard`     | Split a monolith into shards (requires `config.source`)                                            |
| `mdcp refs-list` | List heading slugs from `refs.json` as JSON                                                        |
| `mdcp lint`      | markdownlint-cli2 on shards and compiled output (peer, if installed)                               |
| `mdcp prose`     | Vale prose lint (peer, if installed)                                                               |
| `mdcp links`     | markdown-link-check on compiled output (peer, if installed)                                        |
| `mdcp fix`       | Prettier + markdownlint `--fix` (install peers in host repo first)                                 |

## Sprawl review

`mdcp review` reads every shard compile reads for the guides in `compileOrder`, including nested shards and each guide manifest (`index.md` by default), and reports signals that a shard or index needs a human or agent to look at it. It never writes files and skips paths matched by `scan.ignore`. The signals point at [idea mitosis](../glossary/idea-mitosis.md) candidates; deciding whether to split, merge, or regroup stays with the reviewer (see [Shard single responsibility and idea mitosis](../features/protocol/shard-srp-and-mitosis.md)).

```bash
mdcp review --config docs/mdcp.config.json --docs-root docs
mdcp review --config docs/mdcp.config.json --docs-root docs --json
mdcp review --config docs/mdcp.config.json --docs-root docs --guide client-cli
```

| Signal                | Fires when                                                                                                                                                              | Fix                                                                               |
| --------------------- | ----------------------------------------------------------------------------------------------------------------------------------------------------------------------- | --------------------------------------------------------------------------------- |
| `index-size`          | One group of an index lists more than `review.maxIndexEntries` shard links. A group is the links under one `##` or deeper heading, or the links before any such heading | Group entries under headings named for the reader's task                          |
| `long-shard`          | A shard holds more than `review.maxShardWords` prose words                                                                                                              | Check whether it serves two audiences or jobs; split it if so (idea mitosis)      |
| `duplicate-paragraph` | The same paragraph of at least `review.minDuplicateWords` words appears in two or more shards                                                                           | Keep the paragraph in the shard that owns the rule and link to it from the others |
| `similar-titles`      | Two shards in one guide have the same first `#` heading                                                                                                                 | Merge the shards, or retitle them so each title names its one job                 |

Prose words exclude fenced code, front matter, HTML comments, and link targets. Table cell text and headings count as prose. Paragraphs and titles compare after folding case and whitespace and dropping emphasis markers and link targets; titles also drop punctuation. Each list item is its own paragraph.

Text output groups findings by signal and lists docs-root-relative paths. `--json` prints an array of `{ signal, severity, files, detail, fix }` objects, where `severity` is always `"warning"`. A duplicate paragraph's `detail` names every `path:line` location.

| Option           | Effect                                                                                      |
| ---------------- | ------------------------------------------------------------------------------------------- |
| `--json`         | Print findings as a JSON array                                                              |
| `--strict`       | Exit 1 when there is at least one finding                                                   |
| `--guide <name>` | Review one guide from `compileOrder`; keep findings that involve at least one of its shards |

With `--guide`, a duplicate paragraph is reported when any copy sits in that guide, so duplication across guides still shows up. The shard count covers that guide only. An unknown guide name exits 1 and lists the guide names.

Without `--strict`, `mdcp review` exits 0. Thresholds live under `review` in config; see [Config essentials](./config-essentials.md#review-thresholds).

## Refs subcommands

| Command           | Purpose                                                                    |
| ----------------- | -------------------------------------------------------------------------- |
| `mdcp refs gen`   | Generate `refs.json` from compiled output                                  |
| `mdcp refs check` | Verify `refs.json` matches compiled output                                 |
| `mdcp refs-list`  | List heading slugs from `refs.json` (run `mdcp check` or `refs gen` first) |

Discover shards with host search (`rg`, IDE search). Validate fragment links with `mdcp check`; use `mdcp refs-list` when you need to inspect registry slugs.

## Agent context

```bash
# Full structural gate (includes refs + link validation)
mdcp check

# Optional: inspect registry headings after compile or check
mdcp refs list
```

Discover shards with host search, then read **one** file. Prefer that over pasting a full compiled monolith.
