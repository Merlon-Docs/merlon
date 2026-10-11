# Compile output backup

Specification for opt-in backup of existing compile targets before overwrite. The [Spec-to-test map](../developer/packages-and-tests.md#spec-to-test-map) names the tests behind this spec.

## Purpose

Compile output paths can target existing files — monolith `outputFile` and per-guide `compile.outputFile`. In a git-tracked repo, overwrite is the expected workflow: `git diff` is the safety net.

For operators working **outside version control**, or who want a recoverable copy before a risky overwrite of a publish path such as `README.md`, opt-in backup moves the prior file into the backup root, which by default is `backups/` in the gitignored cache tree under `outputDir`. The backup of a publish output outside the docs root can land outside the backup root, as [Backup path layout](#backup-path-layout) shows.

## Overwrite default

`mdcp compile` **overwrites** existing output files with no backup. No existence check, no sibling `.bak` files next to tracked publish targets.

## Opt-in backup

Enable with:

- **CLI:** global `--backup` (plus optional `--backup-dir`, `--backup-ext`)
- **Config:** top-level `backup.enabled: true` (CLI flags override config)

When enabled and the target file already exists:

1. Move the existing file to `{outputDir}/{backupDir}/{docsRoot-relative-key}{backupExt}`
2. Write the new content to the target path
3. Log `backed up → {backupPath}`

When the target does not exist, write directly — no backup directory created.

### Backup path layout

| Piece           | Default                          | Resolved from                                                               |
| --------------- | -------------------------------- | --------------------------------------------------------------------------- |
| Backup root     | `.caches/backups`                | `outputDir` ([Path layout](../client-cli/config-essentials.md#path-layout)) |
| Backup file key | docsRoot-relative path to target | e.g. `_build/guides.md`, `../packages/mdcp-cli/README.md`                   |
| Extension       | `''`                             | `backup.ext` or `--backup-ext`                                              |

With `--docs-root docs`, the default `outputDir` and two compile targets, `_build/guides.md` and the publish output `../packages/mdcp-cli/README.md`:

```text
docs/_build/                       ← outputDir
  guides.md                        ← compile target
  .caches/
    refs.json                      ← refs registry (always)
    backups/                       ← backup root
      _build/guides.md             ← prior guides.md (key _build/guides.md)
    packages/mdcp-cli/README.md    ← prior publish output (key ../packages/mdcp-cli/README.md)
```

The backup of a publish output outside the docs root climbs out of the backup root, one directory for each `../` at the start of its key. With the default `backup.dir`, a key with one `../` puts the backup under `.caches/`, beside `backups/`. With a one-level `backup.dir` such as `archive`, that backup lands under `outputDir`, at `docs/_build/packages/mdcp-cli/README.md`, and a key with two `../` segments puts it outside `outputDir`, in the docs root.

Delete `_build/` to clean generated output and the backups under it. When `outputDir` is `.`, list `.caches/` in `.gitignore`, because the cache tree then sits in the docs root itself.

## Config

```json
{
  "backup": {
    "enabled": false,
    "dir": ".caches/backups",
    "ext": ""
  }
}
```

| Field     | Default           | Role                               |
| --------- | ----------------- | ---------------------------------- |
| `enabled` | `false`           | Enable backup for compile writes   |
| `dir`     | `.caches/backups` | Relative to `outputDir`            |
| `ext`     | `''`              | Suffix appended to backup filename |

Resolution order: explicit CLI flag > config > built-in default.

## CLI flags

Global options (all commands that write compile output):

| Flag                  | Role                                                                 |
| --------------------- | -------------------------------------------------------------------- |
| `--backup`            | Enable backup (overrides `backup.enabled`)                           |
| `--backup-dir <path>` | Backup directory relative to `outputDir` (default `.caches/backups`) |
| `--backup-ext <ext>`  | Suffix on backup filename (default none)                             |

Commands affected: `compile`, `refs-gen`, `lint`, `links`, `check`.

## Backup acceptance criteria

- Default overwrite — new file written; no backup directory created
- Default overwrite — existing file replaced; no backup created
- Opt-in backup — existing file moved to cache mirror path; new content at target
- Backup path uses the docsRoot-relative key: the backup of a publish output under the docs root goes into the backup tree, not beside the tracked file
- Custom `backup.dir` and `backup.ext` respected
- Config `backup` object parses with defaults (`enabled: false`, `dir: '.caches/backups'`, `ext: ''`)
- CLI `mdcp compile --backup` creates cache backup on re-compile

## Related

- [Config essentials — path layout](../client-cli/config-essentials.md#path-layout)
- [Compile API](../client-core/api-compile.md)
