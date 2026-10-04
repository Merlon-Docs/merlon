# Docs dogfooding

This repo's documentation is sharded under [`docs/`](../../docs/). Shards are the **source of truth**. Compiled output is generated.

## Guide directories

| Directory                 | Audience                            | Output                                                                                       |
| ------------------------- | ----------------------------------- | -------------------------------------------------------------------------------------------- |
| `glossary/`               | Shared terms (cross-guide)          | One shard per term; scoped transitive stitch                                                 |
| `features/`               | Tool capabilities, migration map    | `docs/_build/features.md` and the monolith `docs/_build/guides.md` (gitignored local review) |
| `developer/`              | Contributing to this repo           | `DEVELOPERS.md` at repo root                                                                 |
| `client-cli/`             | npm CLI consumers                   | `packages/mdcp-cli/README.md`                                                                |
| `client-core/`            | Programmatic API consumers          | `packages/mdcp-core/README.md`                                                               |
| `repo-readme/`            | Repository visitors, skill adopters | `README.md` at repo root                                                                     |
| `presentation-la-devops/` | Meetup talk audience                | `presentations/la-devops-2026.md`                                                            |

**Surface ownership:** `repo-readme/` = Agent Skill landing; `client-cli/` = CLI commands/config only; `client-core/` = library API/hooks only. Cross-link the other surfaces instead of duplicating skill, CLI, or API narrative across package READMEs.

Config: [`docs/mdcp.config.json`](../mdcp.config.json). Guides with `compile.outputFile` publish to a separate path and are **excluded** from the monolith. Coverage dogfood uses `scan.strict: true` with `standaloneGuides` / `scan.ignore` so tooling trees (`.worktrees`, `.cursor`, `.changeset`, tests, examples, …) never fail `mdcp check`; publishable skills under `skills/` are registered as standalone.

Publish landing style for root README: [Personas and priority tiers](../features/personas-and-priority-tiers.md#publish-landing-style).

Compile rebases each shard's `../` links to its guide's [link base](../client-core/compile-hooks/publish-relative-links.md#when-it-runs): the publish output above, or the monolith for `features`. Repo scripts pass `--config docs/mdcp.config.json --docs-root docs`, and [Config essentials](../client-cli/config-essentials.md#--config-vs---docs-root) says how each option resolves.

## Edit workflow

1. Edit shard `.md` files under the relevant guide directory.
2. If you changed a guide's `index.md` link order, re-run compile — order is read from the manifest. See [Manifest compile order](../features/manifest-compile-order.md) when using `compile.sectionsHeading`.
3. Run `pnpm docs:compile:repo` then `pnpm docs:check:repo`.
4. Review the change at both levels of [two-level review](../features/protocol/shard-srp-and-mitosis.md#two-level-review): each shard on its own, then against the guides, skills, and code that describe the same behavior. To review the docs as a set, run the [doc-review workflow](../features/protocol/workflows/doc-review.md).
5. Commit shard changes. Regenerated `docs/_build/` (monolith, per-guide outputs, `refs.json`) is gitignored. CI and `pnpm docs:check` compile it locally. Every other output in the guide table is committed, in the same commit as the shard change that regenerates it.

## Agent context

Prefer host search then read one shard under `docs/`. Compiled guides under `docs/_build/` are available when a broader read is intentional.

## Linting docs

- **markdownlint**: the shard preset on the shards, then the repo's own compiled config, [`docs/compiled-lint.markdownlint-cli2.jsonc`](../compiled-lint.markdownlint-cli2.jsonc), on the monolith, `DEVELOPERS.md` and the published READMEs. That config turns off fewer rules than the compiled preset in `@bwilliamson/mdcp-presets`, which the examples use.
- **Vale**: prose lint on the `vale.scanGlobs` directories in the config, which are `glossary/`, `features/`, `developer/`, `client-cli/`, `client-core/`, `repo-readme/` and `presentation-la-devops/`, plus every `standaloneGuides` file. `docs/.vale.ini` opts `CODE_OF_CONDUCT.md` out, because its text is the vendored Contributor Covenant. Vale is not an npm dependency, so install it on `PATH` as [Local setup](./local-setup.md#requirements) describes.
- **Vale `MDCP` / `MDCP-PandocId`**: peer prose rules for unlinked heading mentions and dated claims, plus this repo's local rule against Pandoc IDs. They are not `mdcp check` core steps; enable them with `--require-vale`
- **link lint** — built-in validation runs on every `docs:check` with default `"error"` severity; publish guides set `compile.crossGuideLinks.ignoreGuides: ["features"]` so cross-guide links keep live `docs/features/` shard paths (publish-relative rebase only); see [Publish-only link policy](../features/link-validation.md#publish-only-link-policy)

Run `pnpm vale:sync` after cloning or when `.vale.ini` changes (requires Vale on `PATH`).
