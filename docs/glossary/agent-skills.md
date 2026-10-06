# Agent Skills

**Agent Skills** is the [open standard](https://agentskills.io) for portable packages of agent instructions. Each package is a directory with a `SKILL.md` file and optional companion files, and agent hosts discover and load it. One package is an **Agent Skill**, usually shortened to **skill**, and several packages are _skills_.

Outside agent tooling, the word skill can mean a person's ability or a general AI capability. In MDCP docs it always means the packaged directory.

MDCP's main skill is `mdcp`, with its source in `skills/mdcp/`. It contains the **documentation system** guardrails that direct agents to shard and maintain docs one piece at a time. Optional [archetype](../features/protocol/extensions-and-archetypes.md#archetypes-battery-types) skills are under `skills/mdcp-arch-*`.

Install and validation: [Agent Skill](../features/agent-skill.md).
