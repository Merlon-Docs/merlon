# Agent Skill development

Zero-friction MDCP delivery for AI agents uses one portable Agent Skill. Upstream source of truth is [`skills/mdcp/SKILL.md`](../../skills/mdcp/SKILL.md). After install (or local dogfood in **this** monorepo), agents load it from `.agents/skills/mdcp/` — that path is this repo's vendor-managed dogfood layout, not the universal consumer install path (consumers get an agent-specific directory via `npx skills add`; see [Agent Skill](../features/agent-skill.md)). Task workflows (bootstrap, doc-only, design-architecture, feature-level, UX, doc review) live inside that skill under `skills/mdcp/references/workflows/`, so consumers install one skill. It is the only skill listed in [`skills.sh.json`](../../skills.sh.json) under **Documentation system**. Archetype skills (`skills/mdcp-arch-*`) are **not ready to release**: they carry `metadata.internal: true` and stay **out** of `skills.sh.json` until intentionally published. Maintainers can surface them locally with `INSTALL_INTERNAL_SKILLS=1`.

## Local dogfood

Author under `skills/`. Then refresh vendor-managed installs for agents:

```bash
pnpm skill:update
```

(`pnpm skill:install` is the same task — an alias kept for older docs and habits.)

That runs `npx skills add .` and refreshes dogfood installs under `.agents/skills/`
from the publishable packs in `skills/` (see `skills-lock.json`).

### Do not hand-edit `.agents/skills/`

Copies under `.agents/skills/` are **vendor-managed** installs (local dogfood /
agent load path). They are **not** the source of truth.

| Do                                                               | Do **not**                                                        |
| ---------------------------------------------------------------- | ----------------------------------------------------------------- |
| Edit publishable packs under `skills/<name>/`                    | Hand-edit `.agents/skills/<name>/` to “fix” or tweak guidance     |
| Run `pnpm skill:update` after skill edits so agents pick them up | Commit one-off edits that only exist under `.agents/`             |
| Propose lasting skill changes as PRs against `skills/`           | Treat `.agents/skills/mdcp*` as durable docs or authoring surface |

The skill and archetype dogfood trees (`.agents/skills/mdcp/`,
`.agents/skills/mdcp-arch-*`) are gitignored. Refresh them with
`pnpm skill:update` rather than editing files in place. Eval workspaces under
`.agents/skills/*-workspace/` stay gitignored; see [Live skill evals](./live-skill-evals.md).

Manual invoke (hosts that support slash skills): `/mdcp`. First-time consumer
bootstrap: `/mdcp help me get started`.

When changing skill instructions:

1. Edit `skills/mdcp/SKILL.md` (and `references/` as needed) — keep the activation body under 500 lines; put depth in `references/`. A new kind of task gets a workflow file under `references/workflows/` and a row in the skill's workflow table, not a new skill.
2. Do **not** invent new protocol in the skill — CLI and schemas stay in packages.
3. For archetypes (WIP), edit `skills/mdcp-arch-*` instead of growing the parent forever — do not highlight them in consumer install docs or `skills.sh.json` yet.
4. Run `pnpm skill:update` after skill edits so local agents pick up changes, then `pnpm skill:validate` and `pnpm docs:check`.

## Verification

| Command               | Purpose                                                                                                            |
| --------------------- | ------------------------------------------------------------------------------------------------------------------ |
| `pnpm skill:validate` | Frontmatter fence lint + [skills-ref](https://agentskills.io/specification) validate on all skills under `skills/` |
| `pnpm docs:check`     | Docs compile + lint gate after shard edits                                                                         |

`pnpm skill:validate` runs in local `pnpm check`, PR CI, and during **`pnpm release:main`** after skill version sync (hard fail before the release commit / publish). It is not a [live skill eval](../glossary/live-skill-eval.md).

## Live skill evals (optional, local)

Qualitative with/without-skill grading is documented in [Live skill evals](./live-skill-evals.md) (suite inventory, layout contract, tooling). The glossary term is [live skill eval](../glossary/live-skill-eval.md). That loop is local-only — do **not** require Claude CLI or `skill-creator` in CI.

## Acceptance criteria

1. The skill is a valid Agent Skills package (`name: mdcp` matches folder under `skills/`).
2. Install documents the one skill via `npx skills add` (complementary archetype skills stay unpublished in consumer docs until ready).
3. The skill encodes bootstrap / smallest-context / hard rules for docs-as-code agents and routes each task to one workflow file.
4. Skill is host-agnostic — no Marketplace-only required steps.
5. `pnpm skill:validate` ([skills-ref](https://github.com/agentskills/agentskills/tree/main/skills-ref)) passes locally and in CI for changes under `skills/`.
6. [`skills.sh.json`](../../skills.sh.json) lists `mdcp` in the **Documentation system** group — not WIP `mdcp-arch-*` packs.

## Publishing the skill pack

Ship `skills/mdcp/` as the consumer entrypoint and the only consumer install:

```bash
npx skills add betsalel-williamson/mdcp --skill mdcp
```

Complementary `skills/mdcp-arch-*` packs remain WIP (`metadata.internal: true`) — keep them off consumer get-started copy **and** out of [`skills.sh.json`](../../skills.sh.json) until ready to release. Maintainers can install them with `INSTALL_INTERNAL_SKILLS=1`.

There is no skills.sh submit API. The [repo page](https://skills.sh/betsalel-williamson/mdcp) appears from install telemetry after consumers (or maintainers) run an install without `DISABLE_TELEMETRY=1`. Skill versions sync from private carriers under `packages/skill-<id>/` into `skills/<id>/SKILL.md` `metadata.version` at release — see [Versioning and releases](./versioning-and-releases.md). Do not put `package.json` or `CHANGELOG.md` under `skills/` (pollutes `npx skills add`). Add a changeset targeting `@bwilliamson/skill-<id>` when `skills/<id>/` changes; release notes land on GitHub Releases.

Documented consumer install path: your agent's skills directory ([Supported Agents](https://github.com/vercel-labs/skills#supported-agents)). Avoid Cursor-only or Marketplace-only packaging for this work.

## `skills.sh.json` (repo page layout)

Repo-root [`skills.sh.json`](../../skills.sh.json) controls **how** the
[skills.sh repo page](https://skills.sh/betsalel-williamson/mdcp) groups skills
for humans browsing the catalog. Upstream reference:
[Customize repo pages](https://www.skills.sh/docs/customize).

### What it is (and is not)

| Does                                                                          | Does **not**                                         |
| ----------------------------------------------------------------------------- | ---------------------------------------------------- |
| Curate section titles, descriptions, and skill order on the skills.sh page    | Change how `npx skills add` installs skills          |
| Decide which skills appear in named groups vs **Other skills** (`notGrouped`) | Replace `metadata.internal`, CI gates, or live evals |
| Match skill names/slugs from `skills/*/SKILL.md` `name:`                      | Act as a publish/submit registry                     |

Invalid or missing JSON falls back to the default installs-sorted list. Skills.sh
picks up edits after the repo is seen again by install telemetry; pages are
cached, so updates can lag.

### How it fits this repo

```text
skills/                     publishable Agent Skill packs (source of truth)
skills.sh.json              display groupings for the skills.sh repo page
tests/skills/*/evals/       optional live eval fixtures (not on skills.sh)
pnpm skill:validate         CI/static gate on skills/ (not on skills.sh.json)
```

Current policy:

1. **One release-ready skill** — the **Documentation system** grouping lists
   `mdcp` only. Its workflows are files inside the skill, not separate skills.
2. **Omit WIP archetypes** — `skills/mdcp-arch-*` keep `metadata.internal:
true` and stay **out** of `skills.sh.json` until intentionally published.
   Maintainers use `INSTALL_INTERNAL_SKILLS=1` to install them locally.
3. **When adding a release-ready skill under `skills/`** — add its `name:` to
   the Documentation system `skills` array in the same PR. Do not add packs
   that still carry `metadata.internal: true`.
4. **Live evals are separate** — suite inventory and skill-creator loops live
   under [Live skill evals](./live-skill-evals.md). They never belong in
   `skills.sh.json`.

When changing skill surface area, update this file in the same PR, and follow
the skills.sh step in the
[release checklist](./versioning-and-releases.md#release-checklist-maintainers).

Consumer-facing landing identity (badge, README install commands) stays in
[Agent Skill](../features/agent-skill.md#ecosystem-publication).
