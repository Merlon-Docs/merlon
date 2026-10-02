# Agent Skill

MDCP ships as one portable **documentation system** Agent Skill so projects inherit docs-as-code guardrails without a host-specific IDE extension. People install that one skill; it picks the workflow for each task (bootstrap, docs-only, design, feature, UX, doc review) and loads only that workflow's file.

## Why Agent Skills

Agent Skills give:

- **Lower friction** — zero-install in the repo, or `npx skills add`
- **Host interoperability** — Cursor, Copilot, Claude Code, VS Code, and CLI hosts
- **Simpler maintenance** — markdown skill directories agents load from the repo
- **Composition** — one skill with task workflows inside it (catalog: [Skill workflows](./protocol/skill-workflows.md); hardened boundaries per workflow under `protocol/workflows/`); archetype skills are WIP
- **Reviewable instructions** — vendored in your agent's skills directory and committed with the project

## The skill and complementary skills

**Upstream source** (this repository, publishable):

- [`skills/mdcp/`](../../skills/mdcp/) — the documentation system skill and its workflows (the supported consumer install)
- [`skills/mdcp-arch-oss-library/`](../../skills/mdcp-arch-oss-library/) — OSS library documentation architecture (**WIP**, not ready for consumer install)
- [`skills/mdcp-arch-product-docs-site/`](../../skills/mdcp-arch-product-docs-site/) — product docs site architecture (**WIP**, not ready for consumer install)

**Consumer install target** after `npx skills add`: the **agent-specific** skills directory the [`skills` CLI](https://www.skills.sh/docs/cli) chooses (`--agent` or auto-detect) — vendored into your repo. Per-agent paths: [Supported Agents](https://github.com/vercel-labs/skills#supported-agents).

## Format and location

- **Format:** `SKILL.md` per the [Agent Skills](https://agentskills.io) open standard (progressive disclosure: lean activation body; depth in `references/` and `scripts/`).
- **Upstream path:** [`skills/mdcp/SKILL.md`](../../skills/mdcp/SKILL.md).
- **Install path:** your agent's skills directory after `npx skills add` (not one universal folder — the CLI maps each host to its own tree; see [Supported Agents](https://github.com/vercel-labs/skills#supported-agents)).
- **Frontmatter:** `license`, `compatibility` (Node.js 18+ / `@bwilliamson/mdcp-cli`), and `metadata.version` (independent per skill; synced from `packages/skill-<id>/` at release). WIP complementary skills also set `metadata.internal: true` so they stay off default skills CLI discovery until ready.

Skill `scripts/` are thin wrappers into the CLI — see [`skills/mdcp/references/cli-and-scripts.md`](../../skills/mdcp/references/cli-and-scripts.md) for what **compile** (build docs), **check** (validate the tree), and **refs** (cross-link registry) mean.

## Versioning Strategy (Vendoring)

Agent Skills use a **vendoring** approach: skill files live in the project and are versioned with Git.

1. **Commit to Git:** When you run `npx skills add`, the skill's files are copied into your agent's skills directory and tracked in your own source control.
2. **Docs-as-code Evolution:** The skill version is tied to the commit in your repository. Agent instruction changes are reviewable in Pull Requests alongside the code or configuration changes they support.
3. **Upgrading:** To upgrade a skill, re-run `npx skills add` (or manually copy the updated folder), review the resulting `git diff`, and commit the changes.
4. **Authoring/Maintainer Versioning:** Upstream skills live under `skills/` (install surface) and version via private carriers in `packages/skill-<id>/`. Release notes are GitHub Releases / carrier CHANGELOGs — not files under `skills/`. `pnpm release:main` syncs carrier versions into `metadata.version` on matching `SKILL.md` files.

## Install surfaces

```bash
npx skills add betsalel-williamson/mdcp --skill mdcp
```

Then start bootstrap:

```text
/mdcp help me get started
```

Zero-install: copy `skills/mdcp/` from this repository into the skills directory your host discovers ([Supported Agents](https://github.com/vercel-labs/skills#supported-agents)). Do not document complementary archetype install commands until those skills are ready for use.

Qualitative checks of skill behavior (with vs without the skill) are maintainer workflow — see [Live skill evals](../developer/live-skill-evals.md). The static CI gate is `pnpm skill:validate`.

## Quality Assurance (QA) Principles

The skill states its QA principles once, in
[`skills/mdcp/SKILL.md`](../../skills/mdcp/SKILL.md#quality-assurance-qa-principles),
because that file travels with every install and an agent in another repository
has no copy of these docs. They cover referencing shards before work spreads,
small batches, [atomic commit groups](../glossary/atomic-commit-groups.md),
current docs only, [shard single responsibility](../glossary/shard-single-responsibility.md),
[idea mitosis](../glossary/idea-mitosis.md), two-level review, no code or
temporary information in durable docs, and recording where plans live.

Depth on single responsibility and mitosis:
[Shard single responsibility and idea mitosis](./protocol/shard-srp-and-mitosis.md).
How this repository applies two-level review to guide changes:
[Comprehensive review when guides are involved](../developer/docs-dogfooding.md#comprehensive-review-when-guides-are-involved).

## Ecosystem publication

Primary discovery: [skills.sh](https://skills.sh) via `npx skills`. There is no submit API — the [repo page](https://skills.sh/betsalel-williamson/mdcp) is indexed from anonymous install telemetry. Secondary registries later. Do not publish a VS Code Marketplace VSIX for this delivery path.

Landing identity for skills.sh:

- Root [README](../../README.md) includes the [install-count badge](https://www.skills.sh/docs#badge) (`https://skills.sh/b/betsalel-williamson/mdcp`) and `npx skills add` install commands.
- Repo-root [`skills.sh.json`](../../skills.sh.json) lists `mdcp` in the **Documentation system** group on the [skills.sh repo page](https://www.skills.sh/docs/customize). WIP `mdcp-arch-*` skills stay `metadata.internal` and out of groupings until ready to release.

Maintainer detail (what the file does and does not control, release-ready vs internal
policy, telemetry refresh): [Agent Skill development — skills.sh.json](../developer/agent-skill.md#skillsshjson-repo-page-layout).
