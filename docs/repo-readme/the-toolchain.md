# The Toolchain

MDCP has **three separate surfaces**. Each one is its own install with its own docs.

- **Agent Skill**: how agents maintain shards (`/mdcp` and its workflows). This README is its documentation, [Get started](./get-started.md) shows how to install it, and the [skill catalog](../skills.md) lists its workflows.
- **CLI**: shell commands only. Install and usage: [`@bwilliamson/mdcp-cli`](../../packages/mdcp-cli/README.md).
- **Core**: programmatic API only. Install and usage: [`@bwilliamson/mdcp-core`](../../packages/mdcp-core/README.md).

Presets are optional: [`@bwilliamson/mdcp-presets`](../../packages/mdcp-presets/README.md) holds starter markdownlint configs and the `MDCP` Vale style for the CLI's lint and prose commands, and its README says how to install it alongside the CLI.

The skill tells agents _when_ and _how_ to use documentation; the CLI and core **execute** compile and validation. Agents still need `@bwilliamson/mdcp-cli` (or equivalent scripts) in the repo for those commands to run.
