# Config essentials

## `--config` vs `--docs-root`

> **Link target:** On GitHub, this section's anchor is `#--config-vs---docs-root` (not `#config-vs-docs-root`).

These two global options answer different questions:

| Option            | Resolved from                                                                        | Purpose                                                     |
| ----------------- | ------------------------------------------------------------------------------------ | ----------------------------------------------------------- |
| **`--config`**    | **Invocation directory** — where you run the command (repo root in most npm scripts) | Locates `mdcp.config.json` on disk                          |
| **`--docs-root`** | N/A (you pass the shard tree root explicitly)                                        | Root of guide directories — see [Path layout](#path-layout) |

`--config` is never prefixed with `--docs-root`.

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

`loadConfig(configPath, configBase)` mirrors the CLI: pass the invocation directory as `configBase`, and the docs root as `docsRoot` when resolving guide paths. See [API — Config](../client-core/api-config.md).

## Path layout

Two roots (NPM-style):

| Root            | CLI / config                   | Role                                             |
| --------------- | ------------------------------ | ------------------------------------------------ |
| **Docs root**   | `--docs-root`                  | Human shard trees — one subdirectory = one guide |
| **Output root** | `outputDir` (default `_build`) | Generated markdown and cache — safe to delete    |

**One rule for all generated paths:** values are **relative to `outputDir`**, unless **absolute**.

```text
docs/                          ← --docs-root
  mdcp.config.json
  features/                    ← guide "features" (shards)
  client-cli/                  ← guide "client-cli"
  styles/                      ← support dir (not in compileOrder)
  _build/                      ← outputDir (generated)
    features.md
    client-cli.md
    guides.md                  ← optional monolith (when outputFile set)
    .caches/
      refs.json
      backups/                 ← opt-in prior output (--backup)
```

### Guide = one subdirectory

Each guide is a **folder** directly under the docs root. The guide **`name`** matches the **directory name**. Omit `guides[].path` unless shards live elsewhere.

Only directories listed in `compileOrder` are compiled and linted. Support folders (for example `styles/`) stay on disk but are out of scope.

| Config field          | Resolved from | Example (`--docs-root docs`)        |
| --------------------- | ------------- | ----------------------------------- |
| Default guide shards  | `docsRoot`    | `docs/features/`                    |
| `guides[].path`       | `docsRoot`    | `docs/features/`                    |
| `outputDir`           | `docsRoot`    | `docs/_build/`                      |
| Per-guide output      | `outputDir`   | `docs/_build/features.md`           |
| Monolith `outputFile` | `outputDir`   | `docs/_build/guides.md` (opt-in)    |
| `refs.registryFile`   | `outputDir`   | `docs/_build/.caches/refs.json`     |
| `compile.outputFile`  | `outputDir`   | `../../DEVELOPERS.md` from `_build` |

Delete `_build/` to clean all generated output. `.caches/` holds derived state (refs registry) and, when `--backup` is used, prior compile output under `backups/`. See [Compile output backup](../features/compile-output-backup.md).

### Opt-in output backup

Default: compile commands **overwrite** existing files (git is the safety net). Enable backup when working outside version control:

```json
{
  "backup": { "enabled": true }
}
```

Or pass `--backup` on the CLI (overrides config). Optional `backup.dir` (default `.caches/backups`) and `backup.ext`. Full spec: [Compile output backup](../features/compile-output-backup.md).

### Link validation

Built-in internal link validation is on by default. Broken links emit **`BROKEN LINK`** markers in compiled output and fail `mdcp compile` / `mdcp check` (exit **1**). See [Link validation](../features/link-validation.md).

```json
{
  "compile": { "links": { "markBroken": true } },
  "lint": {
    "links": {
      "enabled": true,
      "severity": "error"
    }
  }
}
```

| Field                      | Default   | Role                                                  |
| -------------------------- | --------- | ----------------------------------------------------- |
| `compile.links.markBroken` | `true`    | Replace broken links with BROKEN LINK prose in output |
| `lint.links.enabled`       | `true`    | Run built-in link validation                          |
| `lint.links.severity`      | `"error"` | `"warn"` exits 0; use `--warn-broken-links` on CLI    |
| `lint.links.config`        | —         | Peer `markdown-link-check` config only                |

---

Minimal `mdcp.config.json`:

```json
{
  "compileOrder": ["overview", "admin-guide"],
  "guides": [{ "name": "overview" }, { "name": "admin-guide" }]
}
```

Defaults: `outputDir` `_build`, per-guide outputs `overview.md` and `admin-guide.md`, refs at `.caches/refs.json`. No monolith unless you set top-level `outputFile`.

| Field                | Purpose                                                              |
| -------------------- | -------------------------------------------------------------------- |
| `compileOrder`       | Guide directories to compile, in stitch order for optional monolith  |
| `guides`             | Per-guide options (hooks, manifests, publish paths)                  |
| `outputDir`          | Generated output root (relative to `--docs-root`)                    |
| `outputFile`         | Optional stitched monolith (relative to `outputDir`)                 |
| `refs.registryFile`  | Cross-link lookup table (default `.caches/refs.json`)                |
| `sourceTags`         | Wrap shards in HTML comments with relative paths (default `true`)    |
| `banner`             | Global banner prepended to outputs (has default warning text)        |
| `compile.outputFile` | Override per-guide output path (relative to `outputDir` or absolute) |
| `compile.sourceTags` | Per-guide override of the global `sourceTags` setting                |

### Default per-guide outputs

When `compile.outputFile` is omitted:

| Guides in `compileOrder` | Default file under `outputDir` |
| ------------------------ | ------------------------------ |
| 1                        | `guide.md`                     |
| 2+                       | `{name}.md` per guide          |

When `compile.outputFile` is set, that guide writes only to that path (for example npm README publish via `../../packages/foo/README.md`) and is excluded from an optional monolith. <!-- mdcp-paths: illustrative -->

### Optional monolith

Set top-level `outputFile` (for example `"guides.md"`) to also stitch guides **without** explicit `compile.outputFile` into one file under `outputDir`.

### `sectionsHeading`

When a manifest has preamble prose with example inline links before an ordered `## Sections` list, set `compile.sectionsHeading`. See [Manifest compile order](../features/manifest-compile-order.md).

```json
{
  "name": "glossary",
  "compile": {
    "title": "Compound glossary",
    "sectionsHeading": "Sections",
    "outputFile": "glossary.md"
  }
}
```

## Schema-only fields

| Field                | Notes                                             |
| -------------------- | ------------------------------------------------- |
| `refs.slugAlgorithm` | Informational only — only `github` is implemented |

Full schema and examples: [mdcp.config.json in sample-guides](../../examples/sample-guides/mdcp.config.json).
