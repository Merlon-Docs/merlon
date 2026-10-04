# API — Compile

| Export                                            | Purpose                                                 |
| ------------------------------------------------- | ------------------------------------------------------- |
| `compileGuides`, `compileGuideResults`            | Stitch shards into compiled guide text                  |
| `writeCompiledGuides`                             | Write compiled guides and the optional monolith to disk |
| `compiledOutputDocuments`                         | Each file compile writes, with the text written there   |
| `writeOutputFile`, `resolveBackupPath`            | Opt-in backup before overwrite; backup path resolver    |
| `resolveBackupOptions`                            | Merge config and CLI backup settings                    |
| `WriteOutputBackupOptions`                        | Backup options type                                     |
| `sectionFiles`, `processSection`, `assembleGuide` | Lower-level assemble pipeline                           |
| `formatCompileTitle`, `extractFirstHeading`, …    | Optional `compile.title` injection and deduplication    |
| `demoteHeadings`, `stripAboutThisGuideHeading`, … | Heading transforms                                      |
| `registerCompileHook`, `applyCompileHooks`        | Extension hooks (`stripAnchors`, `inlineInserts`, …)    |

`compileGuideResults` returns one result per guide. Its `text` is the guide's compiled guide, with links and source tags relative to that file. A guide in the monolith is assembled a second time for the monolith, and its result stores that copy in `monolithText`, with paths and section slugs as the monolith has them.

A result's `knownSlugs` lists the slugs a `#fragment` in `text` may name besides its headings: the slug of each section `text` stitches, such as a `FIND-*` finding id or a declared `{#id}`. Broken-link marking took that set, and `lintLinks` checks a fragment in `text` against it. A shard in the guide's directory that the guide doesn't stitch adds none. `monolithKnownSlugs` does the same for `monolithText`, with the section slugs of every copy in the monolith. Each copy there takes that one set. A fragment on a link from another output has to match a heading, so neither set counts there.

`compiledOutputDocuments(results, options)` returns each file that compile writes from the same results and options: every compiled guide in `compileOrder`, then the monolith when the config sets top-level `outputFile` and at least one guide is stitched into it. The monolith's path is the config's `outputFile` under `outputDir`, the path that `resolveOutputPath` gives and the CLI passes to `writeCompiledGuidesFromResults`. Each entry has the absolute `path` and the `text` written there, banner included, so a line number in the text is a line of the file. A compiled guide's entry names its result in `guide`. The monolith's entry lists each guide's copy in `copies`, with the line the copy starts on. `lintLinks` reads the outputs through it.

When top-level `outputFile` is set, `compileGuides` returns the monolith text, which leaves out guides with `compile.outputFile`. Otherwise it returns every compiled guide joined in the order of `compileOrder`. `compileGuidesFromResults` does the same from results, and it stitches the monolith from each result's `monolithText`. `writeCompiledGuides` writes each compiled guide to its output path. It also writes the monolith when you pass its path and at least one guide has no `compile.outputFile`.

`writeOutputFile` writes compile targets. Default: overwrite. When `backup.enabled` is true, moves an existing file to `{outputDir}/{backupDir}/{docsRoot-relative-key}{ext}` before writing. Pass `backup` on `CompileOptions` or resolve via `resolveBackupOptions(config, cliOverrides)`.

When `compile.title` is set, `assembleGuide` injects a `##` heading followed by a blank line before the first section. See [API — Config](./api-config.md) for per-guide compile fields and top-level `backup` config.

Full spec: [Compile output backup](../features/compile-output-backup.md).
