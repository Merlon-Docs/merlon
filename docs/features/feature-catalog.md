# Feature catalog

Command and capability reference. For the end-to-end mental model (shards, monolith vs publish outputs, validation pipeline, code map), read [Overview](./overview.md) first.

## Compile (P0.1)

Stitch shard directories into canonical monoliths or publish outputs. Demotes headings, strips `about-this-guide` preamble, optional per-guide titles and publish paths. Injects source tags and a default warning banner. See [Source tags and default banner](./source-tags-and-banner.md).

```bash
mdcp compile --config mdcp.config.json --docs-root .
```

Guides compile to per-guide files under `outputDir` by default (`{name}.md`, or `guide.md` when alone). Set top-level `outputFile` for an optional stitched monolith. Path layout: [Config essentials](../client-cli/config-essentials.md#path-layout).

## Refs registry (P0.2)

Heading-slug **registry** for validation after compile — see [Refs registry path](./refs-registry-path.md). Discover shards with host search (`rg`); confirm `#` cross-links with `mdcp check`.

## Agent Skill

One Agent Skill at `skills/mdcp/SKILL.md` (install via `npx skills add` into your agent's skills directory). See [Agent Skill](./agent-skill.md).

The skill picks a workflow for each authoring job and loads only that file. Catalog and intake:
[Skill workflows](./protocol/skill-workflows.md). Hardened is/isn’t boundaries:
[Getting-started](./protocol/workflows/getting-started.md),
[Feature-level](./protocol/workflows/feature-level.md),
[Doc-only](./protocol/workflows/doc-only.md),
[Design-architecture](./protocol/workflows/design-architecture.md),
[UX](./protocol/workflows/ux.md),
[Doc-review](./protocol/workflows/doc-review.md).

```bash
npx skills add betsalel-williamson/mdcp --skill mdcp
```

Optional local with/without-skill grading for each workflow is maintainer work — see [Live skill evals](../developer/live-skill-evals.md). Not a CI gate.

## Check gate (P0.4)

Structural validation: orphans → compile → refs → **links**; peer linters optional. Built-in link validation catches dead internal `.md` paths and `#anchor` fragments — see [Link validation](./link-validation.md). Latency targets for large shard sets: [Performance goals and review](./protocol/performance.md).

```bash
mdcp check --require-lint
```

## Manifest link order (P1.1)

Compile order is derived from each guide's `index.md` or `shards.md` link order. When a manifest has policy prose with example links before an ordered section list, use `compile.sectionsHeading` — see [Manifest compile order](./manifest-compile-order.md).

## Shard split (P1.2)

Split monolith into shards via md-tree.

```bash
mdcp shard   # requires config.source
```

## Orphan check (P1.3)

Detect shards not in manifest or missing files.

## Peer Vale prose (not core)

en-US writing cues such as an unlinked "See Chapter…" mention, and dogfood warnings to remove Pandoc IDs (`{#…}` after a heading), live in Vale styles — not in `mdcp check`. They do not replace [Link validation](./link-validation.md) for GFM cross-refs. See [Locale and language boundary](./design-constraints/locale-and-language.md).

## Coverage scan (P1.5)

Report markdown files that no guide accounts for. Register single files as [standalone guides](../glossary/standalone-guide.md) or fold them into a compiled guide. Reported in `mdcp check`; fails the gate when `scan.strict: true`. See [Documentation coverage scan](./coverage-scan.md).

## Sprawl review

`mdcp review` reports documentation sprawl signals (oversized index groups, long shards, paragraphs duplicated across shards, and same-titled shards in one guide) without failing unless you pass `--strict`. See [Commands reference](../client-cli/commands-reference.md#sprawl-review).

## Peer linters (P2.1)

Orchestrate markdownlint-cli2, Vale, Prettier, markdown-link-check from host repo. Shard markdownlint and Vale prose only touch registered guide shard trees (`compileOrder`); optional `shardsGlobs` / `vale.scanGlobs` narrow scope further.

## Compile hooks (P2.2)

Per-shard assembly via built-in compile hooks on [authored GFM](../glossary/authored-gfm.md). Hooks run by default; opt out per hook when needed. See [Default compile hooks](./default-compile-hooks.md). Not a preprocessor or template engine — see [Preprocessor / templating (out of scope)](./design-constraints/preprocessor-templating.md#preprocessor--templating-out-of-scope).

Built-in hooks:

- **`stripAnchors`** — removes `{#anchor}` markers (also default via `compile.stripAnchors`)
- **`codeEvidence`** — rewrites repo source links to `#L` line fragments (symbol or line range in link text); rebases paths for the rendered output automatically. See [codeEvidence](../client-core/compile-hooks/code-evidence.md).
- **`inlineInserts`** — inlines captioned insert shards from shared libraries (`diagrams/`, `tables/`, `figures/`, `media/`); shard bodies may include tables, prose, or media (images, video, audio); numbered `####` headings per kind (`Table 1. …`); first mention per guide inlines, later references back-link. Optional `hooksConfig.inlineInserts.searchRoots`. See [inlineInserts](../client-core/compile-hooks/inline-inserts.md).

**Link rewriting at assembly time:** every compile builds a cross-guide link index from `compileOrder`, rewrites inter-guide `.md` links per shard, rebases remaining `../` file paths on publish outputs (`compile.outputFile`) via absolute-path resolution, then rewrites same-guide `./section.md` links to in-document `#anchor` links. Optional `compile.crossGuideLinks.ignoreGuides` keeps shard `.md` paths for listed guides (publish-relative still rebases them for publish files). See [Cross-guide link rewriting](../client-core/compile-hooks/cross-guide-links.md) and [Publish-relative link rewriting](../client-core/compile-hooks/publish-relative-links.md).

## Agent integration (consumer repo)

```json
{
  "scripts": {
    "docs:compile": "mdcp compile --config docs/mdcp.config.json --docs-root docs",
    "docs:check:mdcp": "mdcp check --config docs/mdcp.config.json --require-lint"
  }
}
```

## Design constraints (summary)

- [GFM](../glossary/gfm.md) only — no Pandoc IDs as authoring contract; heading recognition is an ATX subset today ([GFM scope](./design-constraints/gfm-scope.md#headings))
- md-tree for split only — custom compile
- Peer linters opt-in — `--require-lint` / `--require-vale` in CI
- No preprocessor / templating — see [Preprocessor / templating (out of scope)](./design-constraints/preprocessor-templating.md#preprocessor--templating-out-of-scope)

Details in [Design constraints](./design-constraints/index.md).
