# API — Compile

| Export                                            | Purpose                                                 |
| ------------------------------------------------- | ------------------------------------------------------- |
| `compileGuides`, `compileGuideResults`            | Stitch shards into compiled guide text                  |
| `writeCompiledGuides`                             | Write compiled guides and the optional monolith to disk |
| `writeOutputFile`, `resolveBackupPath`            | Opt-in backup before overwrite; backup path resolver    |
| `resolveBackupOptions`                            | Merge config and CLI backup settings                    |
| `WriteOutputBackupOptions`                        | Backup options type                                     |
| `sectionFiles`, `processSection`, `assembleGuide` | Lower-level assemble pipeline                           |
| `formatCompileTitle`, `extractFirstHeading`, …    | Optional `compile.title` injection and deduplication    |
| `demoteHeadings`, `stripAboutThisGuideHeading`, … | Heading transforms                                      |
| `registerCompileHook`, `applyCompileHooks`        | Extension hooks (`stripAnchors`, `inlineInserts`, …)    |

When top-level `outputFile` is set, `compileGuides` returns the monolith text, which leaves out guides with `compile.outputFile`. Otherwise it returns every compiled guide joined in the order of `compileOrder`. `writeCompiledGuides` writes each compiled guide to its output path. It also writes the monolith when you pass its path and at least one guide has no `compile.outputFile`.

`writeOutputFile` writes compile targets. Default: overwrite. When `backup.enabled` is true, moves an existing file to `{outputDir}/{backupDir}/{docsRoot-relative-key}{ext}` before writing. Pass `backup` on `CompileOptions` or resolve via `resolveBackupOptions(config, cliOverrides)`.

When `compile.title` is set, `assembleGuide` injects a `##` heading followed by a blank line before the first section. See [API — Config](./api-config.md) for per-guide compile fields and top-level `backup` config.

Full spec: [Compile output backup](../features/compile-output-backup.md).
