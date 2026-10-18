# Agent Skill

Merlon Docs ships as one portable **documentation system** Agent Skill so projects inherit docs-as-code guardrails without a host-specific IDE extension. People install that one skill; it picks the workflow for each task (bootstrap, docs-only, design, feature, UX, doc review) and loads only that workflow's file.

## Why Agent Skills

Packaging Merlon Docs as an Agent Skill gives:

- **Lower friction**, with zero-install in the repo or `npx skills add`
- **Host interoperability** across Cursor, Copilot, Claude Code, VS Code, and CLI hosts
- **Simpler maintenance**, because agents load markdown skill directories from the repo
- **Composition** in one skill with task workflows inside it ([Skill workflows](./system/skill-workflows.md) lists them, and `system/workflows/` sets each workflow's boundaries)
- **Reviewable instructions**, vendored in your agent's skills directory and committed with the project

## The skill and complementary skills

**Upstream source** (this repository, publishable):

- [`skills/merlon-docs/`](../../skills/merlon-docs/) holds the documentation system skill and its workflows, the supported consumer install.
- `skills/merlon-docs-arch-*/` holds the internal archetype skills that [Extensions and archetypes](./system/extensions-and-archetypes.md) lists. [Publishing the skill pack](../developer/agent-skill.md#publishing-the-skill-pack) says when one is released.

**Consumer install target** after `npx skills add`: the **agent-specific** skills directory the [`skills` CLI](https://www.skills.sh/docs/cli) chooses (`--agent` or auto-detect) — vendored into your repo. Per-agent paths: [Supported Agents](https://github.com/vercel-labs/skills#supported-agents).

## Format and location

- **Format:** `SKILL.md` per the [Agent Skills](https://agentskills.io) open standard (progressive disclosure, with a lean activation body and depth in `references/`).
- **Upstream path:** [`skills/merlon-docs/SKILL.md`](../../skills/merlon-docs/SKILL.md).
- **Install path:** your agent's skills directory after `npx skills add` (not one universal folder — the CLI maps each host to its own tree; see [Supported Agents](https://github.com/vercel-labs/skills#supported-agents)).
- **Frontmatter:** `license`, `compatibility` (Node.js 18+ / `@merlon-docs/merlon-docs-cli`), and `metadata.version` (independent per skill, and synced from `packages/skill-<id>/` at release). Internal skills also set `metadata.internal: true`, and [Publishing the skill pack](../developer/agent-skill.md#publishing-the-skill-pack) says what that flag does.

The skill calls the Merlon Docs CLI directly, without skill scripts. [`skills/merlon-docs/references/cli-and-scripts.md`](../../skills/merlon-docs/references/cli-and-scripts.md) says what **compile** (build docs), **check** (validate the tree) and **refs** (cross-link registry) mean, and why that logic stays in the CLI.

## Versioning Strategy (Vendoring)

Merlon Docs skills are **vendored**: skill files live in the project and are versioned with Git.

1. **Commit to Git:** When you run `npx skills add`, the skill's files are copied into your agent's skills directory and tracked in your own source control.
2. **Docs-as-code Evolution:** The skill version is tied to the commit in your repository. Agent instruction changes are reviewable in Pull Requests alongside the code or configuration changes they support.
3. **Upgrading:** To upgrade a skill, re-run `npx skills add` (or manually copy the updated folder), review the resulting `git diff`, and commit the changes.

[Versioning and releases](../developer/versioning-and-releases.md#release-schedule-release-pr-from-develop-to-main) says how maintainers release skill versions.

## Install surfaces

[Path A: install the Agent Skill](../repo-readme/get-started.md#path-a-install-the-agent-skill) in the README walks through the install. Its command is:

```bash
npx skills add Merlon-Docs/merlon --skill merlon-docs
```

Then start bootstrap:

```text
/merlon-docs help me get started
```

Zero-install: copy `skills/merlon-docs/` from this repository into the skills directory your host discovers ([Supported Agents](https://github.com/vercel-labs/skills#supported-agents)).

Grading agent runs with the skill and without it is the maintainer-side work of [live skill evals](../developer/live-skill-evals.md).

## Skill security

A skill runs with the same permissions as the user. Treat third-party skills as untrusted. Each Agent Skill is an isolated, independent entity.

## Quality Assurance (QA) Principles

The skill states its QA principles once, in
[`skills/merlon-docs/SKILL.md`](../../skills/merlon-docs/SKILL.md#quality-assurance-qa-principles),
because that file travels with every install and an agent in another repository
has no copy of these docs. They cover referencing shards before work spreads,
small batches, [atomic commit groups](../glossary/atomic-commit-groups.md),
current docs only, [shard single responsibility](../glossary/shard-single-responsibility.md),
[idea mitosis](../glossary/idea-mitosis.md), two-level review, no code or
temporary information in durable docs, and recording where plans live.

Because every install gets its own copy of `SKILL.md`, the file also states four rules that these docs own:
the [plan obligation for atomic commit groups](./system/skill-workflows.md#atomic-commit-groups-plan-obligation),
the [guide layout and placement test](./system/merlon-docs-1.0-spec.md#2-default-guide-layout-code-repository-archetype),
the [concept removal obligation](./system/skill-workflows.md#concept-removal-obligation),
and the [trigger and evidence of the weekly review routine](./system/workflows/doc-review.md#weekly-review-routine).
The workflow files inside the skill repeat or point to each one at the step where it applies.

Depth on single responsibility, mitosis, and two-level review:
[Shard single responsibility and idea mitosis](./system/shard-srp-and-mitosis.md).

## Ecosystem publication

Primary discovery: [skills.sh](https://skills.sh) via `npx skills`. skills.sh has no submit API, and it indexes the [repo page](https://skills.sh/Merlon-Docs/merlon) from anonymous install telemetry. Do not publish a VS Code Marketplace VSIX for this delivery path.

Maintainer detail: [Publishing the skill pack](../developer/agent-skill.md#publishing-the-skill-pack) says which skills are released and what the root README holds as the skill's landing identity on skills.sh, and
[`skills.sh.json` (repo page layout)](../developer/agent-skill.md#skillsshjson-repo-page-layout) says what that file controls.

## Agent Skill acceptance criteria

1. The skill is a valid Agent Skills package, and its `name: merlon-docs` matches its folder under `skills/`.
2. Consumer install docs describe one skill, installed with `npx skills add`.
3. The skill encodes bootstrap, smallest-context loading and hard rules for docs-as-code agents, and it routes each task to one workflow file.
4. The skill is host-agnostic, and no required step is Marketplace-only.
5. Every skill under `skills/` passes skills-ref validation against the Agent Skills specification, locally and in CI.
6. [`skills.sh.json`](../../skills.sh.json) lists only the skills that [Publishing the skill pack](../developer/agent-skill.md#publishing-the-skill-pack) releases.
