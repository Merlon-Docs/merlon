# Standalone guides

Specification for how compile and each check treat a [standalone guide](../glossary/standalone-guide.md). `standaloneGuides[]` registers the file, and the [coverage scan](./coverage-scan.md) then treats it as accounted for.

## Standalone guide behavior

A standalone guide is register-only:

- Compile doesn't write output for it. A guide still stitches it like any shard when the guide's manifest or `compile.scopeRoot` walk reaches it.
- Its headings stay out of the [refs registry](../glossary/refs-registry.md) unless a guide stitches it into a compiled output.
- Its outbound links are validated: `.md` and source-file targets must resolve on disk, and same-file `#fragment` anchors must match a heading. See [built-in link validation](./link-validation.md#standalone-guide-validation).
- `merlon prose` and `merlon check` run Vale over it, and a `.vale.ini` section opts one file out, as [Opt a standalone guide out of Vale](../client-cli/optional-linters.md#opt-a-standalone-guide-out-of-vale) shows.
- The markdownlint passes in `merlon lint` and `merlon check` lint it only when a shard lint path reaches it or the compiled config's globs list it. [In-scope guide fileset](../client-cli/optional-linters.md#in-scope-guide-fileset) lists the paths each pass reads.
- `merlon fix` runs `prettier --write .` from `--docs-root`, so it formats a standalone guide only when the file is under the docs root.

`standaloneGuides[]` accepts file paths or globs, such as `packages/*/README.md`, resolved from the scan root. It is also the canonical inventory of intentionally isolated files.

A `standaloneGuides[]` glob can match any file under the scan root, even a path that [the scan skips](./coverage-scan.md#what-the-scan-skips): `**/README.md` also matches the READMEs under `node_modules`. Link validation and Vale read every match, as does the [path probe](./path-resolution.md) when `lint.paths` is on. Keep the globs narrow. This rule is advisory, since `merlon check` reads every match, stray or intended. Whoever edits the config applies it, and the globs in the config diff are its evidence.
