# Merlon Docs

**Merlon Docs** is an **open standard** for a documentation system in software projects, delivered as an [Agent Skill](./agent-skills.md) and a lightweight toolchain. With people reviewing the result, it helps teams who care about durable docs distill mind maps, architecture notes, specs, and product ideas into small Markdown **shards** so intent stays reviewable in git, maintainable as ideas keep arriving, and readable one shard at a time by people and agents.

Formerly MDCP (MarkDown Context Protocol). The old name borrowed the word protocol from the Model Context Protocol. Merlon Docs is a set of processes for recording a project's durable information.

[Vision and roadmap](../features/system/00-vision-and-roadmap.md) says what Merlon Docs does about documentation debt and which teams it serves.

The CLI compiles and checks the shards and maintains the [refs](./refs.md) registry. It works alongside the skill’s behavioral guardrails.

The CLI command is `merlon`, the packages are `@merlon-docs/merlon-docs-*`, and the Agent Skill is `merlon-docs`.
