# Publish-relative link rewriting

<!-- mdcp-paths: illustrative -->

Specification for assembly-time rebasing of shard-relative file links when a guide publishes outside the shard tree. Tests in `packages/mdcp-core/test/publish-links.test.ts` and `packages/mdcp-core/test/links.test.ts` map to the sections below.

## Why this pass exists

Shards are authored with paths relative to **where the file lives** in the guide tree:

- `../features/foo.md` from `docs/developer/`
- `../../features/foo.md` from `docs/client-core/compile-hooks/`
- `../../package.json` from `docs/developer/` (repo root)

That works while readers open shards under `docs/`. It breaks when the same content compiles to a **publish output** elsewhere — for example `DEVELOPERS.md` at the repo root or `packages/mdcp-cli/README.md`.

**Problem:** a single stitched document no longer knows which shard each `../` hop came from, so post-stitch string substitution cannot reliably rebase paths. Nested shards use different `../` depth; publish targets sit at different locations (`repo root`, `packages/*/`).

**Solution:** resolve and rebase **per shard**, before stitch:

1. Resolve the link from `dirname(sourceFile)` to an **absolute** target path
2. Emit `relative(dirname(publishOutputFile), absoluteTarget)` in the compiled body

No `stripParentSegments`, `oneLevelPrefix`, or other publish-path config — geometry comes from `sourceFile`, `compile.outputFile`, and the filesystem.

## When it runs

| Condition                                       | Publish-relative rewrite                                 |
| ----------------------------------------------- | -------------------------------------------------------- |
| Guide has `compile.outputFile` set              | **Yes** — per shard, after cross-guide rewrite           |
| Guide outputs only to `_build/{name}.md`        | **No** — shard-relative paths stay as authored           |
| Optional monolith (`outputFile` at config root) | **No** for guides without their own `compile.outputFile` |

Implementation: `rewritePublishRelativeLinks` in `packages/mdcp-core/src/compile/publish-links.ts`, invoked from `assembleGuide` when `publishOutputFile` is set.

## Division of labor (three link passes)

Assembly applies specialized passes instead of one generic rewriter:

| Pass                 | Scope                                         | Input links                                | Output                                               |
| -------------------- | --------------------------------------------- | ------------------------------------------ | ---------------------------------------------------- |
| **Cross-guide**      | Indexed `.md` in another guide                | `../other-guide/shard.md`                  | `{outputFile}#slug` or unchanged when `ignoreGuides` |
| **Publish-relative** | Remaining `../` file links on publish outputs | `../features/foo.md`, `../../package.json` | Path relative to publish file                        |
| **Intra-guide**      | Same-guide section shards                     | `./section.md`                             | `#anchor` in assembled body                          |

Cross-guide runs first and uses the **guide link index**. Publish-relative handles everything else that still starts with `../` — config files, `package.json`, and shard paths left unchanged by `ignoreGuides`.

## Publish-relative matching

A link is rewritten when **all** of the following hold:

- Standard markdown link syntax: `[label](path)`
- Target starts with one or more `../` segments (not `./` — see exclusions)
- Target is not `http://`, `https://`, `mailto:`, or `#…`
- Target resolves to an existing file from the shard directory (then guide directory, then `compile.scopeRoot`)
- Resolved path is **not** a same-guide indexed shard (intra-guide pass owns those)
- Resolved path is **not** another guide's `compile.outputFile` (cross-guide already rebased)

## Publish-relative resolution

Path lookup order (same as cross-guide shard resolution):

1. `resolve(dirname(sourceFile), filePart)`
2. `resolve(guideDir, filePart)`
3. `compile.scopeRoot` when set

Then:

```text
relative(dirname(publishOutputFile), resolvedAbsolute) + optional #fragment
```

`publishOutputFile` is the absolute path from `resolveGuideLinkBase` for the guide's `compile.outputFile`.

## Publish-relative exclusions

The pass **does not** transform:

- External URLs
- Same-document `#fragment` links
- `./section.md` and other `./` paths (cross-guide or intra-guide handle `.md`; publish-relative only matches `../`)
- Links cross-guide already rewrote to `{otherPublishOutput}#slug`
- Unresolvable paths (left unchanged)

## Repo dogfood examples

Config: [`docs/mdcp.config.json`](../../mdcp.config.json) — `developer`, `client-cli`, and `client-core` use `compile.outputFile`.

**`developer` → `DEVELOPERS.md` (repo root)**

| Shard input (`docs/developer/…`) | Compiled in `DEVELOPERS.md`        |
| -------------------------------- | ---------------------------------- |
| `../../package.json`             | `package.json`                     |
| `../features/feature-catalog.md` | `docs/features/feature-catalog.md` |
| `../mdcp.config.json`            | `docs/mdcp.config.json`            |

**`client-cli` → `packages/mdcp-cli/README.md`**

| Shard input (`docs/client-cli/…`) | Compiled in README                       |
| --------------------------------- | ---------------------------------------- |
| `../features/feature-catalog.md`  | `../../docs/features/feature-catalog.md` |

**`client-core/compile-hooks/` → `packages/mdcp-core/README.md`**

Nested shards use more `../` segments in source; per-shard resolution still yields the correct publish-relative path:

| Shard input                                                    | Compiled in README                                                  |
| -------------------------------------------------------------- | ------------------------------------------------------------------- |
| `../../features/design-constraints/preprocessor-templating.md` | `../../docs/features/design-constraints/preprocessor-templating.md` |

## `ignoreGuides` interaction

When `compile.crossGuideLinks.ignoreGuides` keeps a cross-guide link as a shard `.md` path, publish-relative still rebases that path for the publish file. Example: `client-cli` with `ignoreGuides: ["features"]` compiles `../features/feature-catalog.md` to `../../docs/features/feature-catalog.md` in the package README.

Link validation accepts those shard paths when the target guide is listed in `ignoreGuides` on the compiling guide. See [Link validation](../../features/link-validation.md#publish-only-link-policy).

## Related

- [Cross-guide link rewriting](./cross-guide-links.md) — indexed `.md` between guides
- [Compile hooks — overview](./index.md) — assembly pipeline
- [API — Config](../api-config.md) — `compile.outputFile`
- [codeEvidence](./code-evidence.md) — separate path rebase for repo source evidence links
