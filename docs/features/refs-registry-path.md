# Refs registry path

Specification for where `mdcp compile` writes the [refs registry](../glossary/refs-registry.md) (`refs.json`). Parent concept: [refs](../glossary/refs.md). Regression tests live in `packages/mdcp-cli/test/cli.smoke.test.ts`.

## Purpose

The refs registry is derived state under `outputDir`, not co-located with per-guide publish outputs. It catalogs compiled [heading slugs](../glossary/heading-slug.md) so [cross-links](../glossary/cross-link.md) can be checked after stitch. Consumers run `mdcp compile` then `mdcp check` (and optionally `mdcp refs-list`). Commands that read the registry must agree on the on-disk path.

## Path resolution

`refs.registryFile` resolves relative to **`outputDir`** only — the same rule as `resolveRefsPath` in `@bwilliamson/mdcp-core`. Per-guide `compile.outputFile` values (including subdirectory prefixes such as `compiled/guide-a.md`) do not change the registry base. <!-- mdcp-paths: illustrative -->

| Config                                                                   | Resolved path (`--docs-root docs`)                |
| ------------------------------------------------------------------------ | ------------------------------------------------- |
| `outputDir: "_build"`, `refs.registryFile: ".caches/refs.json"`          | `docs/_build/.caches/refs.json`                   |
| `outputDir: "_build"`, guide `compile.outputFile: "compiled/guide-a.md"` | Registry still at `docs/_build/.caches/refs.json` |

## Compile behaviour

`mdcp compile` regenerates the refs registry after writing compiled guide outputs, using the same compiled text as `mdcp check` and `mdcp refs gen`.

## Acceptance criteria

1. After `mdcp compile` with nested `compile.outputFile` paths, `refs.json` exists at `{docsRoot}/{outputDir}/{registryFile}`.
2. The registry is **not** written beside per-guide outputs (for example `docs/_build/compiled/refs.json`).
3. `mdcp refs-list` succeeds immediately after `mdcp compile` without `mdcp refs gen`.
