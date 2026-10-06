# Project layout

## One subdirectory = one guide

Each folder directly under the docs root (`--docs-root`) is a [guide](../glossary/guide.md) when its name appears in `compileOrder`. The guide **`name`** in config matches the **directory name**.

| Piece                                           | Role                                                             |
| ----------------------------------------------- | ---------------------------------------------------------------- |
| Guide directory (`features/`, `client-cli/`, …) | One logical guide — human-edited shards only                     |
| `index.md` (or `shards.md`)                     | Human table of contents — **compile order** from link order here |
| `chapter-*.md` (typical)                        | One topic or chapter per file                                    |
| `about-this-guide.md`                           | Optional preamble shard                                          |

Support directories such as `styles/` for Vale are **not** guides unless listed in `compileOrder`. Compile doesn't write output for them. Shard markdownlint and Vale skip them too unless your config names them, as [In-scope guide fileset](./optional-linters.md#in-scope-guide-fileset) explains. A guide whose `compile.scopeRoot` points into one still stitches the shards it links, as the [shared glossary](./config-essentials.md#shared-glossary) does.

Compile writes compiled guides, the optional monolith, the [refs registry](../glossary/refs-registry.md) and opt-in backups under `outputDir`. A [publish output](../glossary/publish-output.md) goes where its `compile.outputFile` points, which can be outside `outputDir`. [Path layout](./config-essentials.md#path-layout) gives the defaults and path rules.

When a [manifest](../glossary/manifest.md) has preamble prose with example links, set `compile.sectionsHeading`. See [Manifest compile order](../features/manifest-compile-order.md).
