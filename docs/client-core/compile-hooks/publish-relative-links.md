# Publish-relative link rewriting

<!-- mdcp-paths: illustrative -->

Specification for assembly-time rebasing of shard-relative file links to each guide's [link base](#when-it-runs). Tests in `packages/mdcp-core/test/publish-links.test.ts`, `packages/mdcp-core/test/links.test.ts` and `packages/mdcp-core/test/guide-output-path.test.ts` map to the sections below.

## Why this pass exists

Shards are authored with paths relative to **where the file lives** in the guide tree:

- `../features/foo.md` from `docs/developer/`
- `../../features/foo.md` from `docs/client-core/compile-hooks/`
- `../../package.json` from `docs/developer/` (repo root)

That works while readers open shards under `docs/`. It breaks when the same content compiles to a **publish output** elsewhere — for example `DEVELOPERS.md` at the repo root or `packages/mdcp-cli/README.md`.

**Problem:** a single stitched document no longer knows which shard each `../` hop came from, so post-stitch string substitution cannot reliably rebase paths. Nested shards use different `../` depth; publish targets sit at different locations (`repo root`, `packages/*/`).

**Solution:** resolve and rebase **per shard**, before stitch:

1. Resolve the link to an **absolute** target path, in the order [Path lookup order](./index.md#path-lookup-order) gives for this pass
2. Emit `relative(dirname(publishOutputFile), absoluteTarget)` in the compiled body

Rebasing doesn't need path-prefix config. The geometry comes from `sourceFile` and the guide's [link base](#when-it-runs), resolved against the filesystem.

## When it runs

A guide's **link base** is the file being assembled, and the guide's paths rebase relative to it. Compile assembles a guide for the files in this table:

| File being assembled       | Path                                                                                                                                   | Guides it holds                          |
| -------------------------- | -------------------------------------------------------------------------------------------------------------------------------------- | ---------------------------------------- |
| The guide's compiled guide | `compile.outputFile` when set (a publish output), otherwise `{name}.md` under `outputDir`, or `guide.md` when the config has one guide | Every guide                              |
| The optional monolith      | Top-level `outputFile` under `outputDir`                                                                                               | Every guide without `compile.outputFile` |

So a guide in the monolith is assembled twice. Its own [compiled guide](../../glossary/compiled-guide.md) rebases each path relative to the compiled guide, and its copy in the monolith rebases each path relative to the monolith. Both copies resolve, whichever directory the monolith is in. Source tags and code evidence links follow the same rule. [Cross-guide resolution](./cross-guide-links.md#cross-guide-resolution) says where each copy's links to other guides point.

The pass runs per shard for every guide, after the other per-shard [link passes](./index.md#link-passes). It is named for [publish outputs](../../glossary/publish-output.md), but it rebases links in every compiled guide and in the monolith.

Code: `rewritePublishRelativeLinks` in `packages/mdcp-core/src/compile/publish-links.ts`, invoked from `assembleGuide` with the guide's link base as `publishOutputFile`.

## Publish-relative matching

A link is rewritten when **all** of the following hold:

- Standard markdown link syntax: `[label](path)`
- Target starts with one or more `../` segments (not `./` — see exclusions)
- Target is not `http://`, `https://`, `mailto:`, or `#…`
- Target resolves to an existing file or directory, in the order [Path lookup order](./index.md#path-lookup-order) gives for this pass
- Resolved path is **not** a same-guide indexed shard (the cross-guide pass rewrites those)
- Resolved path is **not** the `outputFile` of an entry in the [guide link index](./cross-guide-links.md#cross-guide-purpose)

A target made only of `../` segments, such as `../` or `../../`, points at a directory and rebases in every compiled guide. From `docs/developer/` into `DEVELOPERS.md`, the target `../` compiles to `docs`. The target `../../` resolves to the directory that contains `DEVELOPERS.md`, so it compiles to `./`. The rebased path drops any trailing slash, so `../../skills/` compiles to `skills`.

## Publish-relative resolution

The pass finds the target in the order [Path lookup order](./index.md#path-lookup-order) gives for the publish-relative rewrite, then emits:

```text
relative(dirname(publishOutputFile), resolvedAbsolute) + optional #fragment
```

An empty relative path means the target is the directory that contains the link base, and the pass writes `./` for it. That covers a `../`-only target and a named one, such as `../../pkg/` from `docs/pkg/` compiled into `pkg/README.md`.

`publishOutputFile` is the absolute path of the file being assembled (see [When it runs](#when-it-runs)).

## Publish-relative exclusions

The pass **does not** transform:

- External URLs
- Same-document `#fragment` links
- `./section.md` and other `./` paths (cross-guide or intra-guide handle `.md`; publish-relative only matches `../`)
- A link that the cross-guide pass rewrote to another output's path plus `#slug`, when this pass's lookup finds an output at that path or doesn't find a file
- A link the shard writes to an output named in the guide link index, such as `../../README.md`
- Unresolvable paths (left unchanged)

The pass looks up a target that the cross-guide pass wrote as if the shard had written it, though that target is relative to the link base. When the lookup finds some other file at that path, the pass rewrites the link to point at it.

In the guide link index, each entry's `outputFile` is the owner's publish output when the owner sets `compile.outputFile`. Otherwise it is the monolith when the config has one, and the owner's compiled guide when it doesn't. A link the shard writes to one of these outputs keeps its shard-relative path, because neither pass rebases it. That path resolves in a compiled guide only when it also leads from the link base to the output. The compiled guide of a guide in the monolith isn't one of them, and the pass rebases a link to it like any other file.

## Repo dogfood examples

Config: [`docs/mdcp.config.json`](../../mdcp.config.json). Every guide except `features` sets `compile.outputFile`, and the examples below show three of them.

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

When `compile.crossGuideLinks.ignoreGuides` keeps a cross-guide link as a shard `.md` path, publish-relative still rebases that path relative to the compiling guide's link base. Example: `client-cli` with `ignoreGuides: ["features"]` compiles `../features/feature-catalog.md` to `../../docs/features/feature-catalog.md` in the package README.

Link validation accepts those shard paths when the target guide is listed in `ignoreGuides` on the compiling guide. See [Link validation](../../features/link-validation.md#publish-only-link-policy).

## Related

- [Cross-guide link rewriting](./cross-guide-links.md) — indexed `.md` between guides
- [Compile hooks — overview](./index.md) — assembly pipeline
- [API — Config](../api-config.md) — `compile.outputFile`
- [codeEvidence](./code-evidence.md) — separate path rebase for repo source evidence links
