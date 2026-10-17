# Project layout

## One subdirectory = one guide

Each folder directly under the docs root (`--docs-root`) is a [guide](../glossary/guide.md) when its name appears in `compileOrder`. The guide **`name`** in config matches the **directory name**.

| Piece                                                                 | Role                                                                                                                                                   |
| --------------------------------------------------------------------- | ------------------------------------------------------------------------------------------------------------------------------------------------------ |
| Guide directory (`features/`, `client-cli/`, …)                       | One logical guide, made of human-edited shards                                                                                                         |
| `index.md`, or the file `compile.manifest` names, such as `shards.md` | Human table of contents. Its link order sets the **compile order**, as [Manifest compile order](../features/manifest-compile-order.md) explains        |
| `chapter-*.md` (typical)                                              | One topic or chapter per file                                                                                                                          |
| `about-this-guide.md`                                                 | Optional preamble shard: compile drops its `# About this guide` heading and keeps the text. `compile.preambleSection` names another file for this role |

Support directories such as `styles/` for Vale are **not** guides unless listed in `compileOrder`. Compile doesn't write output for them. Shard markdownlint and Vale skip them too unless your config names them, as [In-scope guide fileset](./optional-linters.md#in-scope-guide-fileset) explains. A guide whose `compile.scopeRoot` points into one still stitches the shards it links, as the [shared glossary](./shared-glossary.md) does.

Compile writes compiled guides, the optional monolith, the [refs registry](../glossary/refs-registry.md) and opt-in backups under `outputDir`. A [publish output](../glossary/publish-output.md) goes where its `compile.outputFile` points, which can be outside `outputDir`. [Path layout](./config-essentials.md#path-layout) gives the defaults and path rules.

When a [manifest](../glossary/manifest.md) has preamble prose with example links, set `compile.sectionsHeading`. See [Manifest compile order](../features/manifest-compile-order.md).
