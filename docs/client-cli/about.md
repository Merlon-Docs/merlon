# About @bwilliamson/mdcp-cli

The **command-line interface** for the [MarkDown Context Protocol (MDCP)](https://github.com/betsalel-williamson/mdcp).

Install this package when you need the `mdcp` binary: **compile** shards into guides, **check** the docs tree, manage **refs**, and optionally **lint** / **prose**.

## Not the Agent Skill

This npm package is **not** the MDCP Agent Skill.

- **This CLI** — shell/`npx` tool (`mdcp compile`, `mdcp check`, …) via `@bwilliamson/mdcp-cli` on npm
- **Core** — programmatic library used by the CLI: [`@bwilliamson/mdcp-core`](https://www.npmjs.com/package/@bwilliamson/mdcp-core)
- **Agent Skill** — host instructions (`SKILL.md` and its workflows): [root README](../../README.md) / `npx skills add … --skill mdcp`

Slash `/mdcp` in an agent host loads the **skill**. The shell command `mdcp` runs **this CLI**. They are separate installs and separate docs.
