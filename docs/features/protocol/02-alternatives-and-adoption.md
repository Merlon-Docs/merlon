# Alternatives and adoption

Read [Scope and positioning](./01-scope-and-positioning.md) and [Vision and roadmap](./00-vision-and-roadmap.md).

## Alternatives comparison

| Incumbent                            | What it does well        | What MDCP adds                                         |
| ------------------------------------ | ------------------------ | ------------------------------------------------------ |
| Single-file README / full `llms.txt` | Zero tooling             | Sharding, validation gate, Agent Skill                 |
| Context7 / large crawled corpora     | Fuzzy retrieval at scale | Author-controlled, deterministic, PR-reviewable shards |
| Custom bash/Python glue              | Flexible                 | Owned `check` gate, link rewrite, publish paths        |
| Docusaurus / MkDocs / VitePress      | Public doc sites         | Agent-first shards + CI structural gate                |
| Cursor rules / `AGENTS.md`           | Host-native friction     | Validated product context separate from host config    |
| Custom IDE extension                 | Editor UI / bundled CLI  | Portable Agent Skill + unchanged CLI                   |
| MCP filesystem                       | Live file reads          | Upstream authoring discipline and validated artifacts  |

## Pandoc and advanced publish stacks

MDCP shards are [GFM-only](../design-constraints/gfm-scope.md). Adopters with Pandoc, LaTeX, or wikilinks are not excluded:

- Compile to GFM compiled guides (plus the optional monolith) and feed downstream publish pipelines.
- Run parallel guides for agent-only vs site-only content when scopes differ.

## Bootstrap-first adoption

Suited to **Learner** and **Author** archetypes — see [Personas and priority tiers](../personas-and-priority-tiers.md). Public copy must follow [Benefit claims and evidence](./benefit-claims-and-evidence.md).

1. Install the parent Agent Skill (`npx skills add betsalel-williamson/mdcp --skill mdcp`) before or alongside CLI setup.
2. Use your existing agent (with `/mdcp`) to shard an existing source document and plan glossary entries.
3. Wire mdcp, compile, and validate (`mdcp compile` / `mdcp check`).

## When to adopt MDCP

**Choose MDCP when:**

- Documentation has outgrown a single file (merge conflicts, broken anchors)
- LLM pair-coding needs scoped, validated context
- Same shards publish to multiple outputs (monolith + README + `DEVELOPERS.md`)
- CI must fail on structural doc drift

**Do not choose MDCP when:**

- README-only repo with no growth pain
- Docs live entirely outside git
- You only need a public website with no agent/CI validation requirement

## Learning investment

| Investment                          | Payback                            |
| ----------------------------------- | ---------------------------------- |
| Bootstrap copy + one config session | Replaces bespoke compile scripts   |
| Shard + manifest workflow           | Smaller PRs, fewer merge conflicts |
| Four core commands                  | Same gate for human, agent, and CI |
