# Config essentials

## `--config` vs `--docs-root`

These two global options answer different questions:

| Option            | Resolved from                                                                       | Purpose                            |
| ----------------- | ----------------------------------------------------------------------------------- | ---------------------------------- |
| **`--config`**    | **Invocation directory**, where you run the command (repo root in most npm scripts) | Locates `mdcp.config.json` on disk |
| **`--docs-root`** | **Invocation directory**, which is also the docs root when you omit the option      | Root of guide directories          |

`--config` is never prefixed with `--docs-root`. A command run from the repository root without `--docs-root` treats the root as the docs root, so repo-root scripts pass `--docs-root docs`. [Path layout](#path-layout) describes the docs root.

### Repo-root npm scripts

```json
{
  "scripts": {
    "docs:compile": "mdcp compile --config docs/mdcp.config.json --docs-root docs",
    "docs:check": "mdcp check --config docs/mdcp.config.json --docs-root docs --require-lint"
  }
}
```

### When you are already inside `docs/`

```bash
cd docs
mdcp compile
mdcp compile --config mdcp.config.json --docs-root .
```

### Programmatic API

The core library takes the same two bases, and [API Config](../client-core/api-config.md) says which one each function needs.

## Minimal config

Step 1 of [Quick start](./install-and-quick-start.md#quick-start) shows a minimal `mdcp.config.json` for two guides, `overview` and `admin-guide`. The fields it leaves out take their defaults, so that config writes `overview.md` and `admin-guide.md` to `_build/` under the docs root and builds no monolith. [Path layout](#path-layout) gives each default and says how each path resolves.

| Field                | Purpose                                                             |
| -------------------- | ------------------------------------------------------------------- |
| `compileOrder`       | Guide directories to compile, in stitch order for optional monolith |
| `guides`             | Per-guide options (hooks, manifests, publish paths)                 |
| `outputDir`          | Generated output root (relative to `--docs-root`)                   |
| `outputFile`         | Optional stitched monolith                                          |
| `refs.registryFile`  | Refs registry file (default `.caches/refs.json`)                    |
| `sourceTags`         | Wrap shards in HTML comments with relative paths (default `true`)   |
| `banner`             | Global banner prepended to outputs (has default warning text)       |
| `compile.outputFile` | Override per-guide output path                                      |
| `compile.scopeRoot`  | Shared tree (relative to the docs root) that guide links pull from  |
| `compile.sourceTags` | Per-guide override of the global `sourceTags` setting               |

## Path layout

Two roots (NPM-style):

| Root            | CLI / config                   | Role                                             |
| --------------- | ------------------------------ | ------------------------------------------------ |
| **Docs root**   | `--docs-root`                  | Human shard trees — one subdirectory = one guide |
| **Output root** | `outputDir` (default `_build`) | Generated markdown and cache — safe to delete    |

**One rule for generated paths:** `compile.outputFile`, top-level `outputFile` and `refs.registryFile` are relative to `outputDir` unless they are absolute. The exception is a relative value that, read from the docs root, already lands inside `outputDir`: compile then uses that docs-root path. With `outputDir: "_build"`, `refs.registryFile: "_build/refs.json"` names `docs/_build/refs.json`, the same file as `"refs.json"`, and not `docs/_build/_build/refs.json`. A relative `backup.dir` or `--backup-dir` is read from `outputDir` with no docs-root exception, and an absolute one is used as is.

```text
docs/                          ← --docs-root
  mdcp.config.json
  features/                    ← guide "features" (shards)
  client-cli/                  ← guide "client-cli"
  styles/                      ← support dir (not in compileOrder)
  _build/                      ← outputDir (generated; gitignore it)
    features.md
    client-cli.md
    guides.md                  ← optional monolith (when outputFile set)
    .caches/
      refs.json
      backups/                 ← opt-in prior output (--backup)
```

### Resolution bases

[Project layout](./project-layout.md) says which directories are guides. Omit `guides[].path` unless a guide's shards live somewhere other than the directory of the same name.

| Config field          | Resolved from | Example (`--docs-root docs`)        |
| --------------------- | ------------- | ----------------------------------- |
| Default guide shards  | `docsRoot`    | `docs/features/`                    |
| `guides[].path`       | `docsRoot`    | `docs/features/`                    |
| `outputDir`           | `docsRoot`    | `docs/_build/`                      |
| Per-guide output      | `outputDir`   | `docs/_build/features.md`           |
| Monolith `outputFile` | `outputDir`   | `docs/_build/guides.md` (opt-in)    |
| `refs.registryFile`   | `outputDir`   | `docs/_build/.caches/refs.json`     |
| `compile.outputFile`  | `outputDir`   | `../../DEVELOPERS.md` from `_build` |

Delete `_build/` to clean everything compile writes under `outputDir`. A publish output outside it, such as `../../DEVELOPERS.md`, stays where it is. `.caches/` holds derived state (refs registry) and, when `--backup` is used, prior compile output at the paths [Backup path layout](../features/compile-output-backup.md#backup-path-layout) gives.

### Default per-guide outputs

When `compile.outputFile` is omitted:

| Guides in `compileOrder` | Default file under `outputDir` |
| ------------------------ | ------------------------------ |
| 1                        | `guide.md`                     |
| 2+                       | `{name}.md` per guide          |

When `compile.outputFile` is set, that guide writes only to that path (for example npm README publish via `../../packages/foo/README.md`) and is excluded from an optional monolith. <!-- mdcp-paths: illustrative -->

### Optional monolith

Set top-level `outputFile` (such as `"guides.md"`) to also stitch guides **without** explicit `compile.outputFile` into one file under `outputDir`. See [monolith](../glossary/monolith.md).

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
| `compileOrder`, `guides[].name`, `guides[].path`, `outputDir`, `outputFile`, `refs.registryFile`, `compile.outputFile` | [Minimal config](#minimal-config) and [Path layout](#path-layout) on this page                                                                                 |
| `compile.scopeRoot`                                                                                                    | [Shared glossary](#shared-glossary) on this page                                                                                                               |
| `review.*`                                                                                                             | [Review thresholds](#review-thresholds) on this page                                                                                                           |
| `protocolVersion`, `refs.slugAlgorithm`                                                                                | [Schema-only fields](#schema-only-fields) on this page                                                                                                         |
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

## Shared glossary

A glossary directory can feed several guides without its own entry in `compileOrder`. Set `compile.scopeRoot` on each guide that should include glossary terms. The value is a directory relative to the docs root:

```json
{
  "name": "developer",
  "compile": { "scopeRoot": "glossary" }
}
```

Compile follows `.md` links from that guide's shards into the glossary tree and stitches each linked term shard into the output. Link `../glossary/index.md` from the guide manifest to publish the full glossary table of contents. A lean guide can skip that link and link individual terms. Compile also follows links from term to term. The output contains the linked terms plus every term reachable from them.

A large glossary can move groups of term links into sub-index files that `index.md` links. The `scopeRoot` walk follows those links too.

To publish the glossary as its own file, add `glossary` to `compileOrder` and set `compile.outputFile`. That guide's `index.md` must link every term shard in the directory directly, because the orphan check reports a term that only a sub-index links. The term shards then belong to the glossary guide. Guides that keep `compile.scopeRoot: glossary` still stitch the terms they link, but their term links point at the glossary's output file instead of the copy in their own output.

## Review thresholds

`mdcp review` reads optional thresholds from a top-level `review` object. Each value is a positive integer; omitted keys keep their defaults.

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

`mdcp review` also honors `scan.ignore` and `scan.root`, so paths the coverage scan skips stay out of the review. Signal definitions: [Commands reference](./commands-reference.md#sprawl-review).

## Schema-only fields

| Field                | Notes                                             |
| -------------------- | ------------------------------------------------- |
| `refs.slugAlgorithm` | Informational only — only `github` is implemented |
| `protocolVersion`    | Defaults to `0.5.0.0`, and no command reads it    |

## Full schema and sample config

[`mdcp.config.schema.json`](../../packages/mdcp-core/mdcp.config.schema.json), a file in the mdcp repository that the npm packages leave out, is the JSON Schema for every key. The [sample guides' config](../../examples/sample-guides/mdcp.config.json) is a longer example. Its paths resolve only from the mdcp repository root, so copy single keys from it.
