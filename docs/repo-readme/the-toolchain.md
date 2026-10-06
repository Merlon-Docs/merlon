# The Toolchain

MDCP has **three separate surfaces**. Each has its own docs — do not treat them as one install or one README.

- **Agent Skill**: how agents maintain shards (`/mdcp` and its workflows). This README is its documentation, and [Get started](./get-started.md) shows how to install it.
- **CLI**: shell commands only. Install and usage: [`@bwilliamson/mdcp-cli`](./packages/mdcp-cli/README.md).
- **Core**: programmatic API only. Install and usage: [`@bwilliamson/mdcp-core`](./packages/mdcp-core/README.md).

The skill tells agents _when_ and _how_ to use documentation; the CLI and core **execute** compile and validation. Agents still need `@bwilliamson/mdcp-cli` (or equivalent scripts) in the repo for those commands to run.
