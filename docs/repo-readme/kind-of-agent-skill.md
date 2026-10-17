# What kind of Agent Skill is this?

<!-- merlon-paths: illustrative -->

On [skills.sh](https://skills.sh) you will find many skills that teach an agent a repeatable procedure. Merlon Docs belongs with **project knowledge and documentation guardrails** — the same neighborhood as skills such as **[LLM Wiki](https://github.com/alainbrown/skills/tree/main/skills/llm-wiki)** (bootstrap, ingest, query, and lint a compounding markdown wiki) and **[aDNA](https://adna.network/reference/specification/)**-style vaults (what / who / how layout, `AGENTS.md` in each area, and procedural skill files in the vault's how leg).

Those patterns optimize for **broad knowledge** or **whole-vault organization**. Merlon Docs optimizes for **software you ship from git**: small validated **shards**, a compile step, and **`merlon check`** in CI so docs stay reviewable and link-safe as the code changes.

## Comparison at a glance

| Pattern                             | What it is optimized for                                                                                 | Merlon Docs difference                                                                                                                                                                                    |
| ----------------------------------- | -------------------------------------------------------------------------------------------------------- | --------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- |
| **LLM Wiki**                        | A persistent wiki you ingest sources into and query across sessions                                      | Shards live **in your product repo** next to code; validation is structural (orphans, links, compile), not wiki lint alone                                                                                |
| **aDNA vault**                      | Full project vault: missions, pipelines, skills, per-folder `AGENTS.md`                                  | **Documentation-system** skill + CLI; default [Code Repository Archetype](../features/system/extensions-and-archetypes.md#archetypes-battery-types) for `features/`, `developer/`, `client/`, `glossary/` |
| **Cursor rules / lone `AGENTS.md`** | Host-native hints                                                                                        | Product intent lives in **shards**, not only in host config; the skill enforces **update docs before you change what they describe**                                                                      |
| **Merlon Docs**                     | Long-lived **software projects** where humans and agents co-maintain specs, ADRs, runbooks, and API docs | Agent Skill + `merlon` CLI; installs from [skills.sh/Merlon-Docs/merlon](https://skills.sh/Merlon-Docs/merlon)                                                                                            |

Merlon Docs can **compile** into READMEs, monoliths, or downstream site generators. It is not a replacement for Docusaurus or MkDocs when you only need a public website with no agent discipline — see [Alternatives and adoption](../features/system/02-alternatives-and-adoption.md).

## Who it is for (and who can skip it)

Merlon Docs is for people who **operate or extend the software for the long haul**: teammates who onboard later, agents that were not in last week's chat, you six months from now.

It is **not** aimed at the engineer who keeps the entire project scope in their head and sees no documentation debt. That can work for a while; Merlon Docs is for **everyone else** who pays when that knowledge is missing — and for leads who want **guardrails** so agents do not ship code without updating the shards that describe it. The personas page names this reader explicitly: [Anti-persona: the engineer who keeps the system in their head](../features/personas-and-priority-tiers.md#audience-priority).

## Add it to your project (and wire `AGENTS.md`)

1. **Install the skill** and commit the copy so every teammate and agent shares the same discipline:

   ```bash
   npx skills add Merlon-Docs/merlon --skill merlon-docs
   ```

2. **Reference Merlon Docs in your project's `AGENTS.md`** (or `CLAUDE.md`, or your host's equivalent). That file is what agents read first; pointing at the skill turns documentation from optional advice into **project policy**. Example lines you can adapt:

   ```markdown
   ## Documentation

   This repository uses [Merlon Docs](https://github.com/Merlon-Docs/merlon). Shards under `docs/` are the source of truth; compiled READMEs are generated.

   - Install: `merlon-docs` skill (see `.agents/skills/merlon-docs` or your agent's skills directory).
   - For documentation work, invoke `/merlon-docs` before editing shards or product behavior.
   - After shard edits, run `merlon compile` and `merlon check` (or `pnpm docs:check` if wired in this repo). Compile builds the guides you review; check validates links and the docs tree — not whether the prose is factually correct.
   - Do not hand-edit files that contain `<!-- merlon-shard:` markers.
   ```

3. **Add the CLI to scripts or CI** when you are ready — [Get started](./get-started.md) Path B, or let Path A's bootstrap session wire it.

The skill does not replace `AGENTS.md`; it **works with** it. Host config says _that documentation discipline exists_; the skill says _how_ to shard, compile, check, and review.

## Where to go next

- [Get started](./get-started.md) — Path A (skill) and Path B (CLI)
- [Vision and roadmap](../features/system/00-vision-and-roadmap.md) — problem and principles
- [Merlon Docs 101](./merlon-docs-101.md) — habit and readiness checklist
