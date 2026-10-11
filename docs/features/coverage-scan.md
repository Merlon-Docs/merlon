# Documentation coverage scan

Specification for the repository-wide markdown coverage scan. The scan reports every markdown file that nothing in the config accounts for, and authors then either add the file to a compiled guide or register it as a [standalone guide](../glossary/standalone-guide.md).

## Two document concepts

MDCP tracks two kinds of authored markdown:

| Concept          | Compiled | Source of truth          | Declared in                     |
| ---------------- | -------- | ------------------------ | ------------------------------- |
| Guide            | Yes      | Shards under a directory | `guides[]` (via `compileOrder`) |
| Standalone guide | No       | The file itself          | `standaloneGuides[]`            |

A guide compiles a list of shards into one output, and a [standalone guide](../glossary/standalone-guide.md) is one file that is already whole, such as a hand-authored package `README.md`. The scan treats both as accounted for. [Standalone guides](./standalone-guides.md) specifies how compile and each check treat a registered file.

## Coverage and the captured set

[Coverage](../glossary/coverage.md) is the set of markdown files MDCP can account for. A file is **captured** when it is one of:

- a markdown file inside a guide directory (a guide listed in `compileOrder`),
- a markdown file inside a guide's `compile.scopeRoot` (shared trees such as a glossary),
- a guide output target: a [compiled guide](../glossary/compiled-guide.md) or the [monolith](../glossary/monolith.md), or
- a `standaloneGuides[]` entry.

Manifest membership inside a guide directory is the [orphan check](./manifest-compile-order.md#orphan-check-scope)'s job. So the coverage scan treats a whole guide directory as accounted for and reports none of its shards.

The scan walks the scan root for `*.md`, removes ignored vendor paths, then subtracts the captured set. Whatever remains is **uncaptured** and reported.

### Compiled guides are captured, not standalone

A compiled guide's output file is captured automatically as an output target, and generated files such as `README.md`, `DEVELOPERS.md` and the package READMEs don't appear as uncaptured. **Do not list a compiled guide output in `standaloneGuides[]`.** It is already accounted for, and `standaloneGuides[]` is only for files that no compile step produces. This rule is advisory, applied by whoever edits the config, and the `standaloneGuides[]` entries in the config diff are its evidence. A duplicate entry is captured like any other, and `merlon check` passes with it.

The two sets are distinct: a file compiled from shards belongs to the guide output set, while `standaloneGuides[]` holds hand-authored single files. A compiled guide is never a standalone guide.

## What the scan skips

The scan honors the repository `.gitignore` by default, so paths already excluded from version control (for example `node_modules`, `dist`, `build`, `_build`, `.caches`, `coverage`) are skipped with no extra config. When `scan.root` is nested below the repository root, the scan locates the enclosing git working tree (a `.git` entry) and applies that repository's `.gitignore` — it never climbs past the git root. If `scan.root` is not inside a git working tree, only a `.gitignore` at `scan.root` itself is honored (parent directories are not searched). A small built-in default always skips `.git`, `node_modules`, and `.agents`, even when `.gitignore` does not list them.

`scan.ignore` extends what is skipped, `scan.gitignore: false` turns off `.gitignore` honoring, and `scan.root` overrides the walk root (default: the invocation directory).

## Check surface

`merlon check` runs the coverage scan and prints each uncaptured path (`uncaptured: …`) plus any `standaloneGuides[]` entries that match no file (`missing-standalone: …`). When gaps exist, it also prints a one-line `coverage:` summary.

The scan doesn't follow symbolic links, so a `standaloneGuides[]` entry whose path is a symlink is reported as `missing-standalone`. Register the file the link points to instead.

By default the report is non-fatal. Set `scan.strict: true` so `merlon check` exits `1` on uncaptured files or missing standalone entries. Turn it on in CI once every file is registered.

Machine-readable inventory (captured / uncaptured / standalone / missing) is available from core via `computeCoverage`.

| Condition                        | `merlon check` exit contribution |
| -------------------------------- | -------------------------------- |
| No gaps                          | none                             |
| Gaps, `scan.strict` false/absent | none (warning lines only)        |
| Gaps, `scan.strict: true`        | fails check                      |

## Relationship to the orphan check

The coverage scan does not replace the [orphan check](./manifest-compile-order.md#orphan-check-scope). They cover different mistakes:

| Check         | Scope                                                                                                  | Severity                                   |
| ------------- | ------------------------------------------------------------------------------------------------------ | ------------------------------------------ |
| Orphan check  | A top-level shard in a guide directory missing from its manifest, or a manifest link to a missing file | Error (fails `merlon check`)               |
| Coverage scan | Any markdown file under the repo that no guide accounts for                                            | Warning, or error when `scan.strict: true` |

The orphan check stays a hard error because a shard in a guide directory is clearly meant to compile. The coverage scan is a warning because an uncaptured file may be intentional until registered as standalone.

[Orphan check scope](./manifest-compile-order.md#orphan-check-scope) says which files the orphan check reads. The coverage scan treats each guide directory and each `compile.scopeRoot` tree as captured. A shard in a guide subdirectory or under a scope root that nothing links, such as a term in the shared glossary, passes both checks and never compiles.

## Config

```json
{
  "standaloneGuides": ["packages/*/README.md", "SECURITY.md"],
  "scan": {
    "gitignore": true,
    "ignore": ["legacy"],
    "root": ".",
    "strict": true
  }
}
```

| Knob               | Default              | Role                                                              |
| ------------------ | -------------------- | ----------------------------------------------------------------- |
| `standaloneGuides` | `[]`                 | Files or globs registered as standalone (captured)                |
| `scan.gitignore`   | `true`               | Honor repo-root `.gitignore` inside git; scan-root only otherwise |
| `scan.ignore`      | `[]`                 | Extra directories or globs to skip, added to the built-in skips   |
| `scan.root`        | invocation directory | Root the scan walks for markdown files                            |
| `scan.strict`      | `false`              | Fail `merlon check` on coverage gaps                              |

## Coverage scan acceptance criteria

- A shard in a compiled guide is captured.
- A guide `compile.scopeRoot` tree is captured.
- A guide output target (`compile.outputFile` and top-level `outputFile`) is captured.
- A `standaloneGuides[]` entry is captured, including glob matches.
- A markdown file outside every guide and outside `standaloneGuides[]` is reported as uncaptured.
- The scan honors `.gitignore` by default (repo-root `.gitignore` when inside a git working tree; `scan.root` `.gitignore` only when not); `scan.gitignore: false` disables it.
- Built-in defaults (`.git`, `node_modules`, `.agents`) are always skipped; `scan.ignore` extends them.
- A `standaloneGuides[]` entry matching no file is reported as missing.
- `merlon check` prints uncaptured and missing-standalone paths; with `scan.strict: true` those gaps fail the gate.
- The coverage scan doesn't change what the orphan check reports.

## Coverage scan related

- [Standalone guide](../glossary/standalone-guide.md)
- [Coverage](../glossary/coverage.md)
- [Coverage in check](../client-cli/coverage.md)
- [Commands reference](../client-cli/commands-reference.md)
- [Feature catalog](./feature-catalog.md)
