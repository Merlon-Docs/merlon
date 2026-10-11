# Config essentials

`mdcp.config.json` names the guides to compile and where their outputs go. This page covers the paths every command resolves from and a minimal config with its path layout. [Config reference](./config-reference.md) is the lookup material for every key.

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

The core library takes the same two bases, and [Config API](../client-core/api-config.md) says which one each function needs.

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
