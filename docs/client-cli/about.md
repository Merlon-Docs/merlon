# About @bwilliamson/mdcp-cli

The **command-line interface** for the [MarkDown Context Protocol (MDCP)](https://github.com/betsalel-williamson/mdcp).

Install this package when you need the `mdcp` binary: **compile** shards into guides, **check** the docs tree, manage **refs**, and optionally **lint** / **prose**.

## Not the Agent Skill

This npm package is **not** the MDCP Agent Skill. Each piece of MDCP has its own job:

- **This CLI:** the shell command `mdcp` (`mdcp compile`, `mdcp check`, …) from `@bwilliamson/mdcp-cli` on npm
- **Core:** the programmatic library the CLI is built on, [`@bwilliamson/mdcp-core`](https://www.npmjs.com/package/@bwilliamson/mdcp-core)
- **Agent Skill:** the host instructions (`SKILL.md` and its workflows) an agent loads for `/mdcp`, which decide when the agent edits docs and which workflow it follows

The CLI and the skill are separate installs with separate docs. [Get started](../../README.md#get-started) in the project README shows how to install the skill and start its bootstrap session, and the [skill catalog](../skills.md) lists its workflows. The skill doesn't include the `mdcp` binary, so a repository that runs `mdcp compile` or `mdcp check` in scripts or CI installs this package as well. [Agent integration](./agent-integration.md) shows the npm scripts.
