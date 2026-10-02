# Usage model

Operational roles for Markdown as Context. Parent: [GitHub #45](https://github.com/betsalel-williamson/mdcp/issues/45).

## Agent entrypoint

Agents should load the parent **Agent Skill** (`/mdcp`, installed in your agent's skills directory via `npx skills add`) first. That skill teaches how to query with smallest context — discover one shard at a time — without loading entire guides. See [Agent Skill](../../features/agent-skill.md).

## Actors and obligations

| Actor                    | Reads                                 | Writes           | Must run                                     |
| ------------------------ | ------------------------------------- | ---------------- | -------------------------------------------- |
| Author (human/agent)     | shards, Agent Skill                   | shards, manifest | `check` before PR                            |
| CI                       | config                                | —                | `check --require-lint` when peers configured |
| Agent (context consumer) | Agent Skill, single shards (`rg`/IDE) | —                | —                                            |
| Maintainer               | skill pack + conformance              | protocol shards  | `docs:check:repo`                            |

**Shards are source of truth; compiled files are generated.**

## Adoption paths

### Minimal

One guide, `compile` + `check`, monolith output. Install the skill (`npx skills add betsalel-williamson/mdcp --skill mdcp`).

### Typical

Multi-guide `compileOrder`, publish outputs (`compile.outputFile`).

### Agent-native

Above plus three-tier shards (`features` / `client` / `developer`), the `mdcp` skill's workflows.

## Coexistence

| Incumbent             | Workflow                                                     |
| --------------------- | ------------------------------------------------------------ |
| MCP host              | MCP reads compiled artifacts; MDCP validates authoring       |
| Static site generator | MDCP for in-repo agent context; site may use compiled subset |
| Cursor rules          | Host behavior in rules; product truth in MDCP shards         |

## Query preference order

1. Activate the parent Agent Skill (`/mdcp`) when available
2. Invoke `/mdcp` with the task; the skill picks a workflow and runs intake for `WORK_ITEM` — see [Skill workflows](./skill-workflows.md)
3. Discover the shard with host tools (`rg`, IDE search, guide `index.md`) and **read one shard**
4. Rely on `mdcp check` for broken `#` cross-links (optionally inspect `mdcp refs-list`)

Read [`docs/skills.md`](../../../docs/skills.md) for the skill and its workflow index.
