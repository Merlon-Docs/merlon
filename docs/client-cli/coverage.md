# Coverage in check

`mdcp check` reports markdown files that no guide accounts for, so nothing drifts out of your documentation set unnoticed. By default the report is non-fatal. Set `scan.strict: true` when CI should fail on gaps.

## What it reports

- **Uncaptured**: files under the scan root that no guide, `compile.scopeRoot`, or `standaloneGuides[]` entry covers (`uncaptured: <path>`).
- **Missing standalone**: `standaloneGuides[]` entries that match no file on disk (`missing-standalone: <path>`). An entry whose path is a symlink is reported here too, as [Check surface](../features/coverage-scan.md#check-surface) explains.
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

`standaloneGuides` accepts file paths or globs. [What the scan skips](../features/coverage-scan.md#what-the-scan-skips) lists the paths the scan leaves out and the `scan.*` keys that change them. [Standalone guide behavior](../features/standalone-guides.md#standalone-guide-behavior) says what compile, link validation and the linters do with a registered file, and what a broad glob matches. Don't list a compiled guide's output, such as a generated `README.md`, because [compiled guides are already captured](../features/coverage-scan.md#compiled-guides-are-captured-not-standalone).
