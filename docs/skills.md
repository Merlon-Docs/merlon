# Skills Index

The Merlon Docs documentation system is a human/machine interface tool. To make it easy for AI agents to adopt the discipline, the system is published as one Agent Skill. Install it once, and it picks the right workflow for each task.

## The skill

| Skill                                         | Description                                                                                                                             |
| --------------------------------------------- | --------------------------------------------------------------------------------------------------------------------------------------- |
| [Merlon Docs](../skills/merlon-docs/SKILL.md) | Teaches the docs-as-code discipline, what belongs where, and the CLI, then routes each task to one of the workflows below and loads it. |

## Workflows

Each workflow is a file inside the skill. The agent loads only the one the task needs.

| Workflow                                                                                 | Description                                                                                                                                                          |
| ---------------------------------------------------------------------------------------- | -------------------------------------------------------------------------------------------------------------------------------------------------------------------- |
| [getting-started](../skills/merlon-docs/references/workflows/getting-started.md)         | Bootstrap Merlon Docs in a repository. See [Getting-started workflow](./features/system/workflows/getting-started.md).                                               |
| [doc-only](../skills/merlon-docs/references/workflows/doc-only.md)                       | Documentation-only work as a technical writer. See [Doc-only workflow](./features/system/workflows/doc-only.md).                                                     |
| [design-architecture](../skills/merlon-docs/references/workflows/design-architecture.md) | Record architecture as Merlon Docs shards (RFCs/ADRs), without product code. See [Design-architecture workflow](./features/system/workflows/design-architecture.md). |
| [feature-level](../skills/merlon-docs/references/workflows/feature-level.md)             | Implement and document features (docs first, then TDD). See [Feature-level workflow](./features/system/workflows/feature-level.md).                                  |
| [ux](../skills/merlon-docs/references/workflows/ux.md)                                   | End-user value, processes, and workflows (UI when it serves those flows). See [UX workflow](./features/system/workflows/ux.md).                                      |
| [doc-review](../skills/merlon-docs/references/workflows/doc-review.md)                   | Review the docs as a set: catch sprawl and duplication, then merge, split, move, or reword. See [Doc-review workflow](./features/system/workflows/doc-review.md).    |

## Working with other skills

The skill works alongside the other skills and tools in your agent, and it's easy to extend: a project that needs more can add its own guide tiers, presets or local skills. [Extensions and archetypes](./features/system/extensions-and-archetypes.md) says how.
