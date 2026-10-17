# Usage model

Operational roles in Merlon Docs.

## Agent entrypoint

Agents should load the parent **Agent Skill** (`/merlon-docs`, installed in your agent's skills directory via `npx skills add`) first. That skill teaches how to query with smallest context — discover one shard at a time — without loading entire guides. See [Agent Skill](../../features/agent-skill.md).

## Actors and obligations

| Actor                    | Reads                                 | Writes           | Must run                                     |
| ------------------------ | ------------------------------------- | ---------------- | -------------------------------------------- |
| Author (human/agent)     | shards, Agent Skill                   | shards, manifest | `check` before PR                            |
| CI                       | config                                | —                | `check --require-lint` when peers configured |
| Agent (context consumer) | Agent Skill, single shards (`rg`/IDE) | —                | —                                            |

Authors can also run `merlon prose` locally to see Vale findings before CI does.

**Shards are source of truth; compiled files are generated.**

## Adoption paths

### Minimal

One guide that compiles to `guide.md` and passes `check`. Install the skill with [its install command](../agent-skill.md#install-surfaces).

### Typical

Multi-guide `compileOrder`, publish outputs (`compile.outputFile`).

### Agent-native

Above plus the four-tier guide layout (`features` / `client` / `developer` / `glossary`), the `merlon-docs` skill's workflows.

## Coexistence

[Alternatives and adoption](./02-alternatives-and-adoption.md#alternatives-comparison) says what Merlon Docs adds beside site generators and host rules files. [Scope and positioning](./01-scope-and-positioning.md#why-merlon-docs-is-not-an-mcp-server) explains why MCP sits on top of Merlon Docs instead of replacing it.

## Query preference order

1. When the parent Agent Skill (`/merlon-docs`) is available, load it with the task; the skill picks a workflow and runs intake for `WORK_ITEM`, as [Skill workflows](./skill-workflows.md) says
2. Find the shard with host search and **read one shard**, as [refs](../../glossary/refs.md) says
3. Rely on `merlon check` for broken `#` cross-links (optionally inspect `merlon refs-list`)

Read [`docs/skills.md`](../../../docs/skills.md) for the skill and its workflow index.
