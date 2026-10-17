# Publish-relative link rewriting

Specification for assembly-time rebasing of shard-relative file links to each guide's [link base](#when-it-runs). The [Spec-to-test map](../../developer/packages-and-tests.md#spec-to-test-map) names the tests behind this spec.

## Shard-relative paths

Shards are authored with paths relative to the shard's own directory in the guide tree:

- `../features/foo.md` from `docs/developer/` <!-- merlon-paths: illustrative -->
- `../../features/foo.md` from `docs/client-core/compile-hooks/` <!-- merlon-paths: illustrative -->
- `../../.nvmrc` from `docs/developer/` (repo root)

Those paths work while readers open shards under `docs/`. They break when the content compiles to a **publish output** in another directory, such as `DEVELOPERS.md` at the repo root or `packages/merlon-docs-cli/README.md`.

A stitched document doesn't record which shard each `../` hop came from. Nested shards use different `../` depths, and publish outputs sit in different directories, such as the repo root and `packages/*/`. String substitution after stitch can't rebase those paths. The pass resolves and rebases each one **per shard**, before stitch:

1. Resolve the link to an **absolute** target path, in the order [Path lookup order](./path-lookup-order.md) gives for this pass
2. Emit `relative(dirname(linkBase), absoluteTarget)` in the compiled body, where `linkBase` is the guide's [link base](#when-it-runs)

Rebasing doesn't need path-prefix config. The geometry comes from `sourceFile` and the guide's link base, resolved against the filesystem.

## When it runs

A guide's **link base** is the file being assembled, and the guide's paths rebase relative to it. Compile assembles a guide for the files in this table:

| File being assembled       | Path                                                                                                                                   | Guides it holds                          |
| -------------------------- | -------------------------------------------------------------------------------------------------------------------------------------- | ---------------------------------------- |
| The guide's compiled guide | `compile.outputFile` when set (a publish output), otherwise `{name}.md` under `outputDir`, or `guide.md` when the config has one guide | Every guide                              |
| The optional monolith      | Top-level `outputFile` under `outputDir`                                                                                               | Every guide without `compile.outputFile` |

So a guide in the monolith is assembled twice. Its own [compiled guide](../../glossary/compiled-guide.md) rebases each path relative to the compiled guide, and its copy in the monolith rebases each path relative to the monolith. Both copies resolve, whichever directory the monolith is in. Source tags and code evidence links follow the same rule. [Cross-guide resolution](./cross-guide-links.md#cross-guide-resolution) says where each copy's links to other guides point.

The pass runs per shard for every guide, after the other per-shard [link passes](./link-passes.md). It is named for [publish outputs](../../glossary/publish-output.md), but it rebases links in every compiled guide and in the monolith.

Code: `rewritePublishRelativeLinks` in `packages/merlon-docs-core/src/compile/publish-links.ts`, invoked from `assembleGuide` with the guide's link base as `publishOutputFile`.

## Publish-relative matching

A link is rewritten when **all** of the following hold:

- Standard markdown link syntax: `[label](path)`
- Target starts with one or more `../` segments (a `./` path is one of the [exclusions](#publish-relative-exclusions))
- Target is not `http://`, `https://`, `mailto:`, or `#…`
- Target resolves to an existing file or directory, or to an output of the run, in the order [Path lookup order](./path-lookup-order.md) gives for this pass
- Resolved path is **not** a same-guide indexed shard (the cross-guide pass rewrites those)
- The link is outside fenced code and code spans (see [Link passes](./link-passes.md))

A target made only of `../` segments, such as `../` or `../../`, points at a directory and rebases in every compiled guide. From `docs/developer/` into `DEVELOPERS.md`, the target `../` compiles to `docs`. The target `../../` resolves to the directory that contains `DEVELOPERS.md`, so it compiles to `./`. The rebased path drops any trailing slash, so `../../skills/` compiles to `skills`.

A link the shard writes to an output of the run, such as `../../README.md`, is a shard-relative path like any other, and the pass rebases it. The rebased path leads to the output from a link base at any depth. [Path lookup order](./path-lookup-order.md) says which outputs count as existing before compile writes them, and why the pass treats a path to the monolith as missing when every guide sets `compile.outputFile`.

## Publish-relative resolution

The pass finds the target in the order [Path lookup order](./path-lookup-order.md) gives for the publish-relative rewrite, then emits:

```text
relative(dirname(linkBase), resolvedAbsolute) + optional #fragment
```

An empty relative path means the target is the directory that contains the link base, and the pass writes `./` for it. That covers a `../`-only target and a named one, such as `../../pkg/` from `docs/pkg/` compiled into `pkg/README.md`. <!-- merlon-paths: illustrative -->

`linkBase` is the absolute path of the guide's [link base](#when-it-runs).

## Publish-relative exclusions

The pass **does not** transform:

- External URLs
- Same-document `#fragment` links
- Link syntax in fenced code or in a code span
- `./section.md` and other `./` paths (cross-guide or intra-guide handle `.md`; publish-relative only matches `../`)
- A link that the cross-guide pass rewrote, whose path is already relative to the link base, such as `../../README.md#setup` in a guide published to `packages/a/README.md` <!-- merlon-paths: illustrative -->
- A link that [`codeEvidence`](../../client-core/compile-hooks/code-evidence.md) rebased, whose path is relative to the link base too. From the shard's directory, the path can lead to another file with the same name.
- Unresolvable paths (left unchanged)

## Examples from this repository

Config: [`docs/merlon.config.json`](../../merlon.config.json). Every guide except `features` sets `compile.outputFile`, and the examples below show two of them. [`ignoreGuides` interaction](#ignoreguides-interaction) shows a third.

**`developer` → `DEVELOPERS.md` (repo root)**

| Shard input (`docs/developer/…`)   | Compiled in `DEVELOPERS.md`    |
| ---------------------------------- | ------------------------------ |
| `../../.nvmrc`                     | `.nvmrc`                       |
| `../features/agent-skill.md`       | `docs/features/agent-skill.md` |
| `../../packages/merlon-docs-site/` | `packages/merlon-docs-site`    |

**`client-core/compile-hooks/` → `packages/merlon-docs-core/README.md`**

Nested shards use more `../` segments in source, and per-shard resolution gives each one the right path from the README:

| Shard input                                                    | Compiled in README                                                  |
| -------------------------------------------------------------- | ------------------------------------------------------------------- |
| `../../features/design-constraints/preprocessor-templating.md` | `../../docs/features/design-constraints/preprocessor-templating.md` |

## `ignoreGuides` interaction

When `compile.crossGuideLinks.ignoreGuides` keeps a cross-guide link as a shard `.md` path, publish-relative still rebases that path relative to the compiling guide's link base. Example: `client-cli` with `ignoreGuides: ["features"]` compiles `../features/feature-catalog.md` to `../../docs/features/feature-catalog.md` in the package README.

The intra-guide run on the stitched body leaves the rebased path alone, even when the compiling guide stitches the shard. So a guide in the monolith links the shard file in both documents, each path relative to its own link base.

A kept `./` link takes another route, because this pass only matches `../`. When the compiling guide stitches the shard, the per-shard intra-guide pass rewrites a `./` or bare link to it as `#slug`. So one compiled guide can link a shard by its path from a `../` link and by its anchor from a `./` link.

Link validation accepts those shard paths when the target guide is listed in `ignoreGuides` on the compiling guide. See [Link validation](../link-validation.md#publish-only-link-policy).

## Related

- [Cross-guide link rewriting](./cross-guide-links.md): links to indexed `.md` shards between guides
- [Compile pipeline](./index.md): the other assembly steps and the rules they share
- [Compile hooks](../../client-core/compile-hooks/index.md): the hooks overview, with a diagram of each assembly step
- [Config API](../../client-core/api-config.md): `compile.outputFile`
- [codeEvidence](../../client-core/compile-hooks/code-evidence.md): a separate path rebase for links to repo source
