# Docs dogfooding

This repo's documentation is sharded under [`docs/`](../../docs/). Shards are the **source of truth**. Compiled output is generated.

## Guide directories

| Directory      | Audience                         | Output                                            |
| -------------- | -------------------------------- | ------------------------------------------------- |
| `glossary/`    | Shared terms (cross-guide)       | One shard per term; scoped transitive stitch      |
| `features/`    | Tool capabilities, migration map | `docs/_build/guides.md` (gitignored local review) |
| `developer/`   | Contributing to this repo        | `DEVELOPERS.md` at repo root                      |
| `client-cli/`  | npm CLI consumers                | `packages/mdcp-cli/README.md`                     |
| `client-core/` | Programmatic API consumers       | `packages/mdcp-core/README.md`                    |
| `repo-readme/` | GitHub visitors, skill adopters  | `README.md` at repo root                          |

**Surface ownership:** `repo-readme/` = Agent Skill landing; `client-cli/` = CLI commands/config only; `client-core/` = library API/hooks only. Cross-link the other surfaces instead of duplicating skill, CLI, or API narrative across package READMEs.

Config: [`docs/mdcp.config.json`](../mdcp.config.json). Guides with `compile.outputFile` publish to a separate path and are **excluded** from the monolith. Coverage dogfood uses `scan.strict: true` with `standaloneGuides` / `scan.ignore` so tooling trees (`.worktrees`, `.cursor`, `.changeset`, tests, examples, …) never fail `mdcp check`; publishable skills under `skills/` are registered as standalone.

Publish landing style for root README: [Personas and priority tiers](../features/personas-and-priority-tiers.md#publish-landing-style).

### Agent Skill dogfood

Agent guidance for this repo lives under [`skills/`](../../skills/) (source of
truth). After editing skill files, refresh the vendor-managed dogfood installs:

```bash
pnpm skill:update
```

Do **not** hand-edit `.agents/skills/` — see
[Agent Skill development](./agent-skill.md#do-not-hand-edit-agentsskills).
(`pnpm skill:install` is an alias of `skill:update`.)
Manual invoke: `/mdcp`.

Shard `../` links rebase automatically at compile in every guide. Compile resolves each link from its shard file to an absolute path, then emits a path relative to the guide's [link base](../client-core/compile-hooks/publish-relative-links.md#when-it-runs). For a guide with `compile.outputFile` the link base is that file, such as `DEVELOPERS.md` or a package README. For `features` it is the monolith `docs/_build/guides.md`. You don't need per-guide path-prefix config.

Repo scripts use `--config docs/mdcp.config.json --docs-root docs`: the config path is resolved from the **repo root** (invocation directory), while `--docs-root docs` sets the shard tree root. See [Config essentials — `--config` vs `--docs-root`](../client-cli/config-essentials.md#--config-vs---docs-root).

The **features** compile (`docs/_build/guides.md`) is for reading through the stitched doc during review — edit shards, not the generated file. It is not committed.

## Edit workflow

1. Edit shard `.md` files under the relevant guide directory.
2. If you changed a guide's `index.md` link order, re-run compile — order is read from the manifest. See [Manifest compile order](../features/manifest-compile-order.md) when using `compile.sectionsHeading`.
3. Run `pnpm docs:compile:repo` then `pnpm docs:check:repo`.
4. Commit shard changes. Regenerated `docs/_build/` (monolith, per-guide outputs, `.caches/refs.json`) is gitignored — CI and `pnpm docs:check` compile locally. Commit [`DEVELOPERS.md`](DEVELOPERS.md) when `developer/` shards change; commit [`README.md`](README.md) when `repo-readme/` shards change; commit package READMEs when `client-cli/` or `client-core/` shards change.

## Comprehensive review when guides are involved

This is the guide-specific application of the [two-level review](../features/agent-skill.md#quality-assurance-qa-principles) QA principle (also [shard single responsibility and idea mitosis](../features/protocol/shard-srp-and-mitosis.md)). Review at two levels:

1. **In isolation** — review each changed idea or shard on its own for local correctness.
2. **Comprehensively** — review it against the other ideas, as a whole. This high-level pass catches duplication and surfaces organization improvements (shards to merge, split, or relocate), and — when a change touches a guide (a doc shard, a skill, or code whose behavior a guide documents) — drift between what a guide promises and what the change actually does.

Guides carry the intent behind the code, so a narrow diff review can miss this. Apply the comprehensive pass whenever:

- a shard changes and related code or a skill describes the same behavior,
- code or a skill changes and a guide documents that behavior, or
- a review spans more than one surface (for example a feature and its client guide, or a skill and its supporting guides).

Read the related guides alongside the diff and flag any drift (stale guidance, a promise the change breaks, or a guide that should change with it), duplication, or reorganization. A review is complete only when the change and its guides agree.

## Agent context

Prefer host search then read one shard under `docs/`. Compiled guides under `docs/_build/` are available when a broader read is intentional.

## Linting docs

- **markdownlint** — shard preset + compiled preset (includes `DEVELOPERS.md` and published README paths)
- **Vale** — prose lint on `glossary/`, `features/`, `developer/`, `client-cli/`, `client-core/`, `repo-readme/` (install [Vale](https://vale.sh/docs/vale-cli/installation/) on `PATH`; not an npm dependency)
- **Vale `MDCP` / `MDCP-PandocId`** — peer prose: unlinked heading mentions; dogfood: remove Pandoc IDs. Not `mdcp check` core steps — enable with `--require-vale`
- **link lint** — built-in validation runs on every `docs:check` with default `"error"` severity; publish guides set `compile.crossGuideLinks.ignoreGuides: ["features"]` so cross-guide links keep live `docs/features/` shard paths (publish-relative rebase only); see [Publish-only link policy](../features/link-validation.md#publish-only-link-policy)

Run `pnpm vale:sync` after cloning or when `.vale.ini` changes (requires Vale on `PATH`).
