# Coverage in check

`mdcp check` reports markdown files that no guide accounts for, so nothing drifts out of your documentation set unnoticed. By default the report is non-fatal. Set `scan.strict: true` when CI should fail on gaps (this repository dogfoods that).

## What it reports

- **Uncaptured**: files under the scan root that no guide, `compile.scopeRoot`, or `standaloneGuides[]` entry covers (`uncaptured: <path>`).
- **Missing standalone**: `standaloneGuides[]` entries that match no file on disk (`missing-standalone: <path>`). The scan does not follow symbolic links, so an entry whose path is a symlink is reported here. Register the file it points to instead.
- **Summary**: when gaps exist, a one-line `coverage:` count.

```bash
mdcp check --config docs/mdcp.config.json --docs-root docs
```

The full captured / standalone inventory lives in core (`computeCoverage`); use that API when you need a machine-readable result. For the capability contract, see [Documentation coverage scan](../features/coverage-scan.md).

## Registering standalone files

When a file is intentionally standalone — a hand-authored README or a top-level policy file — list it under `standaloneGuides[]` so the scan treats it as captured:

```json
{
  "standaloneGuides": ["packages/*/README.md", "SECURITY.md"],
  "scan": {
    "ignore": ["legacy"],
    "strict": true
  }
}
```

`standaloneGuides` accepts file paths or globs. The scan honors your `.gitignore` by default, so it skips the paths that version control ignores, such as `node_modules` and `dist`. Set `scan.gitignore: false` to turn that off. A built-in default always skips `.git`, `node_modules`, and `.agents`. `scan.ignore` extends what is skipped, and `scan.root` overrides the walk root (default: the invocation directory). A `standaloneGuides` glob also matches the paths that these ignores skip, so `**/README.md` matches the READMEs under `node_modules` too. Link validation and Vale read every match, so keep the globs narrow.

Standalone files are register-only: compile doesn't write output for them, and their outbound links are validated. `mdcp prose` and `mdcp check` run Vale over them, and a `.vale.ini` section keeps Vale off one file, as [Opt a standalone guide out of Vale](./optional-linters.md#opt-a-standalone-guide-out-of-vale) shows. A guide still stitches a standalone file like any shard when the guide's manifest or `compile.scopeRoot` walk reaches it.

Do not list a compiled guide's output (a generated file such as `README.md` or `DEVELOPERS.md`) in `standaloneGuides`. Those outputs are already captured as guide output targets and are never flagged as uncaptured, so they stay out of the standalone set.
