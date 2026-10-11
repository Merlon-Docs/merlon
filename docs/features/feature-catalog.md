# Feature catalog

Command and capability reference. For the end-to-end mental model, including how compiled guides relate to the optional monolith, read [Overview](./overview.md) first.

## Compile

Stitch shard directories into compiled guides. Compile demotes headings and handles the preamble shard as [Project layout](../client-cli/project-layout.md#one-subdirectory--one-guide) says. Per-guide titles and publish paths are optional. Compile injects source tags and a default warning banner. See [Source tags and default banner](./source-tags-and-banner.md).

```bash
merlon compile --config merlon.config.json --docs-root .
```

Guides compile to per-guide files under `outputDir` by default (`{name}.md`, or `guide.md` when alone). Set top-level `outputFile` for an optional stitched monolith. Path layout: [Config essentials](../client-cli/config-essentials.md#path-layout).

## Refs registry file

Heading-slug **registry** for validation after compile. See [Refs registry path](./refs-registry-path.md). Confirm `#` cross-links with `merlon check`. What refs are and are not for: [refs](../glossary/refs.md).

## Agent Skill and workflows

One Agent Skill at `skills/merlon-docs/SKILL.md`, installed into your agent's skills directory with [its install command](./agent-skill.md#install-surfaces). See [Agent Skill](./agent-skill.md).

The skill picks a workflow for each authoring job and loads only that file. Catalog and intake:
[Skill workflows](./system/skill-workflows.md). Hardened is/isn’t boundaries:
[Getting-started](./system/workflows/getting-started.md),
[Feature-level](./system/workflows/feature-level.md),
[Doc-only](./system/workflows/doc-only.md),
[Design-architecture](./system/workflows/design-architecture.md),
[UX](./system/workflows/ux.md),
[Doc-review](./system/workflows/doc-review.md).

[Live skill evals](../developer/live-skill-evals.md), which grade each workflow with and without the skill, are maintainer work.

## Validation gate

Run the validation stages in one command, and fail when any of them fails. [Check gate](./check-gate.md) specifies the stages and the exit status. Latency targets for large shard sets are in [Performance goals](./system/performance.md).

```bash
merlon check --require-lint
```

## Manifest link order

Compile order is derived from each guide's `index.md` or `shards.md` link order. When a manifest has policy prose with example links before an ordered section list, use `compile.sectionsHeading` — see [Manifest compile order](./manifest-compile-order.md).

## Shard split

Split a source document into shards via md-tree.

```bash
merlon shard   # requires config.source
```

## Orphan check

Report a shard that its guide's manifest doesn't link, and a manifest link to a missing file. [Orphan check scope](./manifest-compile-order.md#orphan-check-scope) in Manifest compile order specifies it.

## Peer Vale prose (not core)

en-US writing cues, such as an unlinked "See Chapter…" mention or a dated claim, live in the `MerlonDocs` Vale style in `@merlon-docs/merlon-docs-presets` rather than in Merlon Docs' core stages. [Preferred homes](./design-constraints/locale-and-language.md#preferred-homes) says which tool checks each prose rule. These cues do not replace [Link validation](./link-validation.md) for GFM cross-refs. `merlon check` runs them in its Vale stage, as [Check gate](./check-gate.md#check-gate-stages) says, when Vale is installed and the host's Vale config (`vale.config`, default `.vale.ini`) enables their styles. `--skip-vale` skips the stage.

## Coverage scan

Report markdown files that no guide accounts for. Register single files as [standalone guides](../glossary/standalone-guide.md) or fold them into a compiled guide. Reported in `merlon check`; fails the gate when `scan.strict: true`. See [Documentation coverage scan](./coverage-scan.md).

## Sprawl review

`merlon review` reports documentation sprawl signals (oversized index groups, long shards, paragraphs duplicated across shards, and same-titled shards in one guide) without failing unless you pass `--strict`. See [Commands reference](../client-cli/commands-reference.md#sprawl-review).

## Peer linter orchestration

Orchestrate markdownlint-cli2, Vale, Prettier, markdown-link-check from host repo. Shard markdownlint and Vale prose read the files [In-scope guide fileset](../client-cli/optional-linters.md#in-scope-guide-fileset) lists.

The peer commands are `merlon lint`, `merlon prose`, `merlon links` and `merlon fix`. The [command summary](../client-cli/commands-reference.md#command-summary) says what each one runs.

## Compile hooks

Per-shard assembly via built-in compile hooks on [authored GFM](../glossary/authored-gfm.md). Hooks run by default; opt out per hook when needed. See [Default compile hooks](./default-compile-hooks.md). Not a preprocessor or template engine — see [Preprocessor / templating (out of scope)](./design-constraints/preprocessor-templating.md#preprocessor--templating-out-of-scope).

Built-in hooks:

- [`stripAnchors`](../client-core/compile-hooks/strip-anchors.md) removes `{#id}` anchor markers.
- [`codeEvidence`](../client-core/compile-hooks/code-evidence.md) adds `#L` line fragments to links to source files.
- [`inlineInserts`](../client-core/compile-hooks/inline-inserts.md) inlines captioned insert shards at their first link.

**Link rewriting at assembly time:** after the hooks, the [link passes](./compile-pipeline/link-passes.md) rewrite each shard's links to files. [Compile pipeline](./compile-pipeline/index.md) specifies them with table re-alignment, and the rules those steps share with the hooks.

## Agent integration (consumer repo)

[Repo-root npm scripts](../client-cli/config-essentials.md#repo-root-npm-scripts) in Config essentials gives the `docs:compile` and `docs:check` scripts for a consumer repository. Both pass `--docs-root docs`, because the docs root defaults to the directory the command runs in.

## Design constraints (summary)

Each limit and its one-line summary are on the [Design constraints](./design-constraints/index.md) page.
