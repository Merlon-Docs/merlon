# Agent Skill development

Zero-friction MDCP delivery for AI agents uses one portable Agent Skill. Upstream source of truth is [`skills/mdcp/SKILL.md`](../../skills/mdcp/SKILL.md). In **this** monorepo, agents load it from `.agents/skills/mdcp/`, a vendor-managed local install. A consumer's `npx skills add` picks an agent-specific directory instead ([Agent Skill](../features/agent-skill.md)). Task workflows (bootstrap, doc-only, design-architecture, feature-level, UX, doc review) live inside that skill under `skills/mdcp/references/workflows/`, so consumers install one skill. Archetype skills under `skills/mdcp-arch-*` are internal. [Publishing the skill pack](#publishing-the-skill-pack) says which skills are released.

## Local dogfood

Author under `skills/`. Then refresh vendor-managed installs for agents:

```bash
pnpm skill:update
```

(`pnpm skill:update` runs `pnpm skill:install`, and either name does the same task.)

That runs `npx skills add .` and refreshes dogfood installs under `.agents/skills/`
from the publishable packs in `skills/` (see `skills-lock.json`).

Cloud agent sessions install the skill on their own. The Claude Code session-start hook (`.claude/hooks/session-start.sh`) and the Cursor environment (`.cursor/environment.json`) both run `pnpm skill:dev`, which installs this checkout's `skills/mdcp` for Claude Code and Cursor with telemetry off. An agent working here therefore loads the skill as it stands on the branch, not a published release.

### Do not hand-edit `.agents/skills/`

Copies under `.agents/skills/` are **vendor-managed** installs (local dogfood /
agent load path). They are **not** the source of truth.

| Do                                                               | Do **not**                                                        |
| ---------------------------------------------------------------- | ----------------------------------------------------------------- |
| Edit publishable packs under `skills/<name>/`                    | Hand-edit `.agents/skills/<name>/` to “fix” or tweak guidance     |
| Run `pnpm skill:update` after skill edits so agents pick them up | Commit one-off edits that only exist under `.agents/`             |
| Land lasting skill changes in `skills/`                          | Treat `.agents/skills/mdcp*` as durable docs or authoring surface |

The skill and archetype dogfood trees (`.agents/skills/mdcp/`,
`.agents/skills/mdcp-arch-*`) are gitignored, and so are eval workspaces under
`.agents/skills/*-workspace/` ([Live skill evals](./live-skill-evals.md)).

Manual invoke (hosts that support slash skills): `/mdcp`.

When changing skill instructions:

1. Edit `skills/mdcp/SKILL.md` (and `references/` as needed) — keep the activation body under 500 lines; put depth in `references/`. A new kind of task gets a workflow file under `skills/mdcp/references/workflows/` and a row in the skill's workflow table, not a new skill.
2. Do **not** invent new protocol in the skill — CLI and schemas stay in packages.
3. Put archetype guidance in `skills/mdcp-arch-*` instead of growing the parent skill.
4. Run `pnpm skill:update` after skill edits so local agents pick up changes, then `pnpm skill:validate` and `pnpm docs:check`.
5. Add a changeset for the skill ([When to add a changeset](./versioning-and-releases.md#when-to-add-a-changeset)).

## Verification

The [Agent Skill acceptance criteria](../features/agent-skill.md#agent-skill-acceptance-criteria) say what a skill change must keep true.

| Command               | Purpose                                                                                                            |
| --------------------- | ------------------------------------------------------------------------------------------------------------------ |
| `pnpm skill:validate` | Frontmatter fence lint + [skills-ref](https://agentskills.io/specification) validate on all skills under `skills/` |
| `pnpm docs:check`     | Docs compile + lint gate after shard edits                                                                         |

`pnpm skill:validate` runs in local `pnpm check`, the land gate, PR CI, and during **`pnpm release:main`** after skill version sync (hard fail before the release commit / publish). It is not a [live skill eval](../glossary/live-skill-eval.md).

[Live skill evals](./live-skill-evals.md) covers the optional local loop, which grades agent runs with and without the skill and never runs in CI.

## Publishing the skill pack

`skills/mdcp/` is the only skill released to consumers. [Get started](../repo-readme/get-started.md) shows how they install it.

Archetype skills (`skills/mdcp-arch-*`) are not ready to release. Until one is released on purpose, its `SKILL.md` sets `metadata.internal: true`, and the skill stays out of [`skills.sh.json`](../../skills.sh.json) and out of consumer install docs. The `skills` CLI leaves internal skills out of its default discovery, so maintainers install them locally with `INSTALL_INTERNAL_SKILLS=1`. Releasing a skill removes `metadata.internal` and adds the skill's `name:` to the **Documentation system** group in `skills.sh.json`, in the same change.

Install telemetry refreshes the repo page on skills.sh ([Ecosystem publication](../features/agent-skill.md#ecosystem-publication)); an install with `DISABLE_TELEMETRY=1`, such as `pnpm skill:dev`, doesn't count. Skill versions and release notes follow [Versioning and releases](./versioning-and-releases.md).

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

The **Documentation system** group lists the skills that [Publishing the skill pack](#publishing-the-skill-pack) releases. Live eval suites never belong in this file ([Live skill evals](./live-skill-evals.md)). When the released skills or their names change, update this file in the same change.

Consumer-facing landing identity (badge, README install commands) stays in
[Agent Skill](../features/agent-skill.md#ecosystem-publication).
