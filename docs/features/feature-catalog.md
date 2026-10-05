# Feature catalog

Command and capability reference. For the end-to-end mental model, including how compiled guides relate to the optional monolith, read [Overview](./overview.md) first.

## Compile

Stitch shard directories into compiled guides. Demotes headings, strips `about-this-guide` preamble, optional per-guide titles and publish paths. Injects source tags and a default warning banner. See [Source tags and default banner](./source-tags-and-banner.md).

```bash
mdcp compile --config mdcp.config.json --docs-root .
```

Guides compile to per-guide files under `outputDir` by default (`{name}.md`, or `guide.md` when alone). Set top-level `outputFile` for an optional stitched monolith. Path layout: [Config essentials](../client-cli/config-essentials.md#path-layout).

## Refs registry file

Heading-slug **registry** for validation after compile. See [Refs registry path](./refs-registry-path.md). Confirm `#` cross-links with `mdcp check`. What refs are and are not for: [refs](../glossary/refs.md).

## Agent Skill and workflows

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

Structural validation: orphans → compile → refs → **links**. Peer linters are optional. Built-in link validation catches dead internal `.md` paths and `#anchor` fragments, as [Link validation](./link-validation.md) describes. Latency targets for large shard sets are in [Performance goals](./protocol/performance.md).

```bash
mdcp check --require-lint
```

## Manifest link order

Compile order is derived from each guide's `index.md` or `shards.md` link order. When a manifest has policy prose with example links before an ordered section list, use `compile.sectionsHeading` — see [Manifest compile order](./manifest-compile-order.md).

## Shard split

Split a source document into shards via md-tree.

```bash
mdcp shard   # requires config.source
```

## Orphan check (P1.3)

Detect shards not in manifest or missing files.

## Peer Vale prose (not core)

en-US writing cues such as an unlinked "See Chapter…" mention, and dogfood warnings to remove Pandoc IDs (`{#…}` after a heading), live in Vale styles — not in `mdcp check`. They do not replace [Link validation](./link-validation.md) for GFM cross-refs. See [Locale and language boundary](./design-constraints/locale-and-language.md).

## Coverage scan

Report markdown files that no guide accounts for. Register single files as [standalone guides](../glossary/standalone-guide.md) or fold them into a compiled guide. Reported in `mdcp check`; fails the gate when `scan.strict: true`. See [Documentation coverage scan](./coverage-scan.md).

## Sprawl review

`mdcp review` reports documentation sprawl signals (oversized index groups, long shards, paragraphs duplicated across shards, and same-titled shards in one guide) without failing unless you pass `--strict`. See [Commands reference](../client-cli/commands-reference.md#sprawl-review).

## Peer linter orchestration

Orchestrate markdownlint-cli2, Vale, Prettier, markdown-link-check from host repo. Shard markdownlint touches only the registered guide shard trees (`compileOrder`). Vale prose touches those trees and the [standalone guides](../glossary/standalone-guide.md). `shardsGlobs` and `vale.scanGlobs` replace the guide trees with the paths they list, and the standalone guides stay in Vale's scope.

The peer commands are `mdcp lint`, `mdcp prose`, `mdcp links` and `mdcp fix`. The [command summary](../client-cli/commands-reference.md#command-summary) says what each one runs.

## Compile hooks

Per-shard assembly via built-in compile hooks on [authored GFM](../glossary/authored-gfm.md). Hooks run by default; opt out per hook when needed. See [Default compile hooks](./default-compile-hooks.md). Not a preprocessor or template engine — see [Preprocessor / templating (out of scope)](./design-constraints/preprocessor-templating.md#preprocessor--templating-out-of-scope).

Built-in hooks:

- **`stripAnchors`** — removes `{#anchor}` markers (also default via `compile.stripAnchors`)
- **`codeEvidence`** — rewrites repo source links to `#L` line fragments (symbol or line range in link text); rebases paths for the rendered output automatically. See [codeEvidence](../client-core/compile-hooks/code-evidence.md).
- **`inlineInserts`** — inlines captioned insert shards from shared libraries (`diagrams/`, `tables/`, `figures/`, `media/`); shard bodies may include tables, prose, or media (images, video, audio); numbered `####` headings per kind (`Table 1. …`); first mention per guide inlines, later references back-link. Optional `hooksConfig.inlineInserts.searchRoots`. See [inlineInserts](../client-core/compile-hooks/inline-inserts.md).

**Link rewriting at assembly time:** every compile builds a cross-guide link index from `compileOrder`, then rewrites each shard's links to files in the [link passes](../client-core/compile-hooks/index.md#link-passes). Optional `compile.crossGuideLinks.ignoreGuides` keeps shard `.md` paths in links to listed guides, except in the cases that [its config section](../client-core/compile-hooks/cross-guide-links.md#compilecrossguidelinksignoreguides) points to. Once links are rewritten and broken ones marked, compile re-aligns each aligned table whose links changed width. See [Tables after link rewriting](../client-core/compile-hooks/index.md#tables-after-link-rewriting).

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

Each limit and its one-line summary are on the [Design constraints](./design-constraints/index.md) page.
