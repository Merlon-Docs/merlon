# Usage model

Operational roles for Markdown as Context.

## Agent entrypoint

Agents should load the parent **Agent Skill** (`/mdcp`, installed in your agent's skills directory via `npx skills add`) first. That skill teaches how to query with smallest context — discover one shard at a time — without loading entire guides. See [Agent Skill](../../features/agent-skill.md).

## Actors and obligations

| Actor                    | Reads                                 | Writes           | Must run                                     |
| ------------------------ | ------------------------------------- | ---------------- | -------------------------------------------- |
| Author (human/agent)     | shards, Agent Skill                   | shards, manifest | `check` before PR                            |
| CI                       | config                                | —                | `check --require-lint` when peers configured |
| Agent (context consumer) | Agent Skill, single shards (`rg`/IDE) | —                | —                                            |
| Maintainer               | skill pack + conformance              | protocol shards  | `docs:check:repo`                            |

Authors can also run `mdcp prose` locally to see Vale findings before CI does.

**Shards are source of truth; compiled files are generated.**

## Adoption paths

### Minimal

One guide that compiles to `guide.md` and passes `check`. Install the skill (`npx skills add betsalel-williamson/mdcp --skill mdcp`).

### Typical

Multi-guide `compileOrder`, publish outputs (`compile.outputFile`).

### Agent-native

Above plus the four-tier guide layout (`features` / `client` / `developer` / `glossary`), the `mdcp` skill's workflows.

## Coexistence

[Alternatives and adoption](./02-alternatives-and-adoption.md#alternatives-comparison) says what MDCP adds beside site generators and host rules files. [Scope and positioning](./01-scope-and-positioning.md#why-mdcp-is-not-an-mcp-server) explains why MCP sits on top of MDCP instead of replacing it.

## Query preference order

1. Activate the parent Agent Skill (`/mdcp`) when available
2. Invoke `/mdcp` with the task; the skill picks a workflow and runs intake for `WORK_ITEM` — see [Skill workflows](./skill-workflows.md)
3. Discover the shard with host tools (`rg`, IDE search, guide `index.md`) and **read one shard**; read a compiled guide under `outputDir` only when a broader read is intentional
4. Rely on `mdcp check` for broken `#` cross-links (optionally inspect `mdcp refs-list`)

Read [`docs/skills.md`](../../../docs/skills.md) for the skill and its workflow index.
