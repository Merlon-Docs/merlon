# The Toolchain

MDCP has **three separate surfaces**. Each has its own docs — do not treat them as one install or one README.

- **Agent Skill** — `npx skills add … --skill mdcp`. How agents maintain shards (`/mdcp` and its workflows). Docs: **this README**.
- **CLI** — `npm i -D @bwilliamson/mdcp-cli`. Shell commands only. Docs: [`@bwilliamson/mdcp-cli`](./packages/mdcp-cli/README.md).
- **Core** — `npm i @bwilliamson/mdcp-core`. Programmatic API only. Docs: [`@bwilliamson/mdcp-core`](./packages/mdcp-core/README.md).

The skill tells agents _when_ and _how_ to use documentation; the CLI and core **execute** compile and validation. Agents still need `@bwilliamson/mdcp-cli` (or equivalent scripts) in the repo for those commands to run.
