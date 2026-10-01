# Skills Index

The MDCP documentation system is a human/machine interface tool. To make it easy for AI agents to adopt the discipline, the system is published as one Agent Skill. Install it once, and it picks the right workflow for each task.

## The skill

| Skill                           | Description                                                                                                                             |
| ------------------------------- | --------------------------------------------------------------------------------------------------------------------------------------- |
| [mdcp](../skills/mdcp/SKILL.md) | Teaches the docs-as-code discipline, what belongs where, and the CLI, then routes each task to one of the workflows below and loads it. |

## Workflows

Each workflow is a file inside the skill. The agent loads only the one the task needs.

| Workflow                                                                          | Description                                                                                                                                                         |
| --------------------------------------------------------------------------------- | ------------------------------------------------------------------------------------------------------------------------------------------------------------------- |
| [getting-started](../skills/mdcp/references/workflows/getting-started.md)         | Bootstrap MDCP in a repository. See [Getting-started workflow](./features/protocol/workflows/getting-started.md).                                                   |
| [doc-only](../skills/mdcp/references/workflows/doc-only.md)                       | Documentation-only work as a technical writer. See [Doc-only workflow](./features/protocol/workflows/doc-only.md).                                                  |
| [design-architecture](../skills/mdcp/references/workflows/design-architecture.md) | Record architecture as MDCP shards (RFCs/ADRs), without product code. See [Design-architecture workflow](./features/protocol/workflows/design-architecture.md).     |
| [feature-level](../skills/mdcp/references/workflows/feature-level.md)             | Implement and document features (docs first, then TDD). See [Feature-level workflow](./features/protocol/workflows/feature-level.md).                               |
| [ux](../skills/mdcp/references/workflows/ux.md)                                   | End-user value, processes, and workflows (UI when it serves those flows). See [UX workflow](./features/protocol/workflows/ux.md).                                   |
| [doc-review](../skills/mdcp/references/workflows/doc-review.md)                   | Review the docs as a set: catch sprawl and duplication, then merge, split, move, or reword. See [Doc-review workflow](./features/protocol/workflows/doc-review.md). |

## Architecture Extensions

Optional archetype skills for specific documentation architectures (Work in Progress).

| Skill                                                                         | Description                           |
| ----------------------------------------------------------------------------- | ------------------------------------- |
| [mdcp-arch-oss-library](../skills/mdcp-arch-oss-library/SKILL.md)             | Open-source library archetype.        |
| [mdcp-arch-product-docs-site](../skills/mdcp-arch-product-docs-site/SKILL.md) | Product documentation site archetype. |
