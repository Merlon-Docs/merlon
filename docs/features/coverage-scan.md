# Documentation coverage scan

Specification for the repository-wide markdown coverage scan and the [standalone guide](../glossary/standalone-guide.md) concept. The scan reports every markdown file that no guide accounts for, so authors either fold the file into a compiled guide or register it as standalone.

## Two document concepts

MDCP tracks two kinds of authored markdown:

| Concept          | Compiled | Source of truth          | Declared in                     |
| ---------------- | -------- | ------------------------ | ------------------------------- |
| Guide            | Yes      | Shards under a directory | `guides[]` (via `compileOrder`) |
| Standalone guide | No       | The file itself          | `standaloneGuides[]`            |

A guide compiles a list of shards into one output. A [standalone guide](../glossary/standalone-guide.md) is a single markdown file that is already whole — for example a hand-authored package `README.md` or a top-level `SECURITY.md`. The scan treats both as accounted for.

## Coverage and the captured set

[Coverage](../glossary/coverage.md) is the set of markdown files MDCP can account for. A file is **captured** when it is one of:

- a markdown file inside a guide directory (a guide listed in `compileOrder`),
- a markdown file inside a guide's `compile.scopeRoot` (shared trees such as a glossary),
- a guide output target (`compile.outputFile`, or the top-level `outputFile`), or
- a `standaloneGuides[]` entry.

Manifest membership inside a guide directory is the [orphan check](./feature-catalog.md#orphan-check-p13)'s job, so the coverage scan treats a whole guide directory as accounted for and does not double-report its shards.

The scan walks the scan root for `*.md`, removes ignored vendor paths, then subtracts the captured set. Whatever remains is **uncaptured** and reported.

### Compiled guides are captured, not standalone

A compiled guide's output file is captured automatically as an output target, so generated files such as `README.md`, `DEVELOPERS.md`, and the package READMEs never appear as uncaptured. **Do not list a compiled guide output in `standaloneGuides[]`** — it is already accounted for, and `standaloneGuides[]` is only for files that no compile step produces.

The two sets are distinct: a file compiled from shards belongs to the guide output set, while `standaloneGuides[]` holds hand-authored single files. A compiled guide is never a standalone guide.

## Standalone guide behavior

A standalone guide is register-only:

- Compile never stitches or rewrites it, and never emits it.
- Its headings register into [refs](../glossary/refs.md) so other guides can link into it.
- Its outbound links are validated: `.md` and source-file targets must resolve on disk, and same-file `#fragment` anchors must match a heading. See [built-in link validation](./link-validation.md#standalone-guide-validation).
- Peer tools (markdownlint, Vale, Prettier) still process the file normally.

`standaloneGuides[]` accepts file paths or globs (for example `packages/*/README.md`), resolved from the scan root. It doubles as the canonical inventory of intentionally isolated shards.

## What the scan skips

The scan honors the repository `.gitignore` by default, so paths already excluded from version control (for example `node_modules`, `dist`, `build`, `_build`, `.caches`, `coverage`) are skipped with no extra config. When `scan.root` is nested below the repository root, the scan locates the enclosing git working tree (a `.git` entry) and applies that repository's `.gitignore` — it never climbs past the git root. If `scan.root` is not inside a git working tree, only a `.gitignore` at `scan.root` itself is honored (parent directories are not searched). A small built-in default always skips `.git`, `node_modules`, and `.agents`, even when `.gitignore` does not list them.

`scan.ignore` extends what is skipped, `scan.gitignore: false` turns off `.gitignore` honoring, and `scan.root` overrides the walk root (default: the invocation directory).

## Check surface

`mdcp check` runs the coverage scan and prints each uncaptured path (`uncaptured: …`) plus any `standaloneGuides[]` entries that match no file (`missing-standalone: …`). When gaps exist, it also prints a one-line `coverage:` summary.

By default the report is non-fatal. Set `scan.strict: true` so `mdcp check` exits `1` on uncaptured files or missing standalone entries — use that in dogfood CI once the inventory is registered.

Machine-readable inventory (captured / uncaptured / standalone / missing) is available from core via `computeCoverage`.

| Condition                        | `mdcp check` exit contribution |
| -------------------------------- | ------------------------------ |
| No gaps                          | none                           |
| Gaps, `scan.strict` false/absent | none (warning lines only)      |
| Gaps, `scan.strict: true`        | fails check                    |

## Relationship to the orphan check

The coverage scan does not replace the [orphan check](./feature-catalog.md#orphan-check-p13). They cover different mistakes:

| Check         | Scope                                                       | Severity                                   |
| ------------- | ----------------------------------------------------------- | ------------------------------------------ |
| Orphan check  | A shard inside a guide directory missing from its manifest  | Error (fails `mdcp check`)                 |
| Coverage scan | Any markdown file under the repo that no guide accounts for | Warning, or error when `scan.strict: true` |

The orphan check stays a hard error because a shard in a guide directory is clearly meant to compile. The coverage scan is a warning because an uncaptured file may be intentional until registered as standalone.

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

| Knob               | Default                                    | Role                                                              |
| ------------------ | ------------------------------------------ | ----------------------------------------------------------------- |
| `standaloneGuides` | `[]`                                       | Files or globs registered as standalone (captured)                |
| `scan.gitignore`   | `true`                                     | Honor repo-root `.gitignore` inside git; scan-root only otherwise |
| `scan.ignore`      | built-in `.git`, `node_modules`, `.agents` | Extra directories or globs to skip                                |
| `scan.root`        | invocation directory                       | Root the scan walks for markdown files                            |
| `scan.strict`      | `false`                                    | Fail `mdcp check` on coverage gaps                                |

## Coverage scan acceptance criteria

- A shard in a compiled guide is captured.
- A guide `compile.scopeRoot` tree is captured.
- A guide output target (`compile.outputFile` and top-level `outputFile`) is captured.
- A `standaloneGuides[]` entry is captured, including glob matches.
- A markdown file outside every guide and outside `standaloneGuides[]` is reported as uncaptured.
- The scan honors `.gitignore` by default (repo-root `.gitignore` when inside a git working tree; `scan.root` `.gitignore` only when not); `scan.gitignore: false` disables it.
- Built-in defaults (`.git`, `node_modules`, `.agents`) are always skipped; `scan.ignore` extends them.
- A `standaloneGuides[]` entry matching no file is reported as missing.
- `mdcp check` prints uncaptured and missing-standalone paths; with `scan.strict: true` those gaps fail the gate.
- The existing orphan check behavior is unchanged.

## Coverage scan related

- [Standalone guide](../glossary/standalone-guide.md)
- [Coverage](../glossary/coverage.md)
- [Coverage in check](../client-cli/coverage.md)
- [Commands reference](../client-cli/commands-reference.md)
- [Feature catalog](./feature-catalog.md)
