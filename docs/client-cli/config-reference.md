# Config reference

This page is the lookup material for `merlon.config.json`. It gives the feature keys' defaults and the page that documents each key, then the `review` thresholds, the schema-only fields and the JSON Schema file. [Config essentials](./config-essentials.md) covers the minimal config and the paths every command resolves from.

## Feature settings

Each feature's spec defines its config keys and what they do. This table gives their defaults, and [Config key map](#config-key-map) links each spec.

| Key                        | Default           |
| -------------------------- | ----------------- |
| `compile.links.markBroken` | `true`            |
| `lint.links.enabled`       | `true`            |
| `lint.links.severity`      | `"error"`         |
| `lint.links.config`        | none              |
| `lint.links.target`        | none              |
| `lint.codeExtensions`      | `[]`              |
| `lint.dataExtensions`      | `[]`              |
| `lint.paths.severity`      | `"off"`           |
| `lint.paths.searchRoots`   | `[]`              |
| `lint.paths.generated`     | `[]`              |
| `lint.paths.vocabulary`    | `[]`              |
| `backup.enabled`           | `false`           |
| `backup.dir`               | `.caches/backups` |
| `backup.ext`               | `""`              |

## Config key map

This table links the page that documents each key:

| Key                                                                                                                    | Documented in                                                                                                                                                  |
| ---------------------------------------------------------------------------------------------------------------------- | -------------------------------------------------------------------------------------------------------------------------------------------------------------- |
| `compileOrder`, `guides[].name`, `guides[].path`, `outputDir`, `outputFile`, `refs.registryFile`, `compile.outputFile` | [Minimal config](./config-essentials.md#minimal-config) and [Path layout](./config-essentials.md#path-layout)                                                  |
| `compile.scopeRoot`                                                                                                    | [Shared glossary](./shared-glossary.md)                                                                                                                        |
| `review.*`                                                                                                             | [Review thresholds](#review-thresholds) on this page                                                                                                           |
| `standardVersion`, `protocolVersion`, `refs.slugAlgorithm`                                                             | [Schema-only fields](#schema-only-fields) on this page                                                                                                         |
| `source`, `guides[].source`, `guides[].splitLevel`                                                                     | [Consumer migration](./consumer-migration.md#map-the-document-to-guides)                                                                                       |
| `compile.preambleSection`                                                                                              | [Project layout](./project-layout.md)                                                                                                                          |
| `banner`, `sourceTags`, `compile.includeBanner`, `compile.sourceTags`                                                  | [Source tags and banner](../features/source-tags-and-banner.md)                                                                                                |
| `compile.manifest`, `compile.sectionsHeading`                                                                          | [Manifest compile order](../features/manifest-compile-order.md)                                                                                                |
| `compile.title`                                                                                                        | [Compile API](../client-core/api-compile.md)                                                                                                                   |
| `compile.hooks`, `compile.hooksConfig`                                                                                 | [Default compile hooks](../features/default-compile-hooks.md), and the core [Compile hooks](../client-core/compile-hooks/index.md) index for the hook pipeline |
| `compile.stripAnchors`                                                                                                 | [stripAnchors](../client-core/compile-hooks/strip-anchors.md)                                                                                                  |
| `compile.crossGuideLinks`                                                                                              | [Cross-guide link rewriting](../features/compile-pipeline/cross-guide-links.md)                                                                                |
| `compile.links.*`, `lint.links.enabled`, `lint.links.severity`, `lint.codeExtensions`, `lint.dataExtensions`           | [Built-in link validation](../features/link-validation.md)                                                                                                     |
| `lint.paths.*`                                                                                                         | [Path resolution in prose](../features/path-resolution.md)                                                                                                     |
| `lint.links.config`, `lint.links.target`, `lint.markdownlint.*`, `vale.*`                                              | [Optional linters](./optional-linters.md)                                                                                                                      |
| `scan.*`                                                                                                               | [Documentation coverage scan](../features/coverage-scan.md#config)                                                                                             |
| `standaloneGuides`                                                                                                     | [Coverage in check](./coverage.md)                                                                                                                             |
| `backup.*` and the `--backup` flags                                                                                    | [Compile output backup](../features/compile-output-backup.md)                                                                                                  |

## Review thresholds

`merlon review` reads optional thresholds from a top-level `review` object. Each value is a positive integer, and omitted keys keep their defaults.

```json
{
  "review": {
    "maxIndexEntries": 12,
    "maxShardWords": 2500,
    "minDuplicateWords": 25
  }
}
```

| Field                      | Default | Role                                                                                  |
| -------------------------- | ------- | ------------------------------------------------------------------------------------- |
| `review.maxIndexEntries`   | `12`    | Most shard links one index group lists before `index-size` fires                      |
| `review.maxShardWords`     | `2500`  | Most prose words one shard holds before `long-shard` fires                            |
| `review.minDuplicateWords` | `25`    | Fewest words a paragraph needs before `duplicate-paragraph` compares it across shards |

`merlon review` also honors `scan.ignore` and `scan.root`, so paths the coverage scan skips stay out of the review. [Sprawl review](./commands-reference.md#sprawl-review) in Commands reference defines each signal.

## Schema-only fields

| Field                | Notes                                                                                                                                                     |
| -------------------- | --------------------------------------------------------------------------------------------------------------------------------------------------------- |
| `refs.slugAlgorithm` | Informational; only `github` is implemented                                                                                                               |
| `standardVersion`    | The version of the Merlon Docs standard the repository conforms to. Defaults to `0.5.0.0`, and no command reads it                                        |
| `protocolVersion`    | Former name of `standardVersion`, read until 2.0.0. Its value fills `standardVersion` when that key is absent, and loading fails when the two keys differ |

## Full schema and sample config

[`merlon.config.schema.json`](../../packages/merlon-docs-core/merlon.config.schema.json), a file in the Merlon Docs repository that the npm packages leave out, is the JSON Schema for every key. The [sample guides' config](../../examples/sample-guides/merlon.config.json) is a longer example. Its paths resolve only from the Merlon Docs repository root, so copy single keys from it.
