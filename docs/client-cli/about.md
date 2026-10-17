# About @merlon-docs/merlon-docs-cli

The **command-line interface** for [Merlon Docs](https://github.com/Merlon-Docs/merlon), a documentation system for software projects.

Install this package when you need the `merlon` binary: **compile** shards into guides, **check** the docs tree, manage **refs**, and optionally **lint** / **prose**.

## Not the Agent Skill

This npm package is **not** the Merlon Docs Agent Skill. Each piece of Merlon Docs has its own job:

- **This CLI:** the shell command `merlon` (`merlon compile`, `merlon check`, …) from `@merlon-docs/merlon-docs-cli` on npm
- **Core:** the programmatic library the CLI is built on, [`@merlon-docs/merlon-docs-core`](https://www.npmjs.com/package/@merlon-docs/merlon-docs-core)
- **Agent Skill:** the host instructions (`SKILL.md` and its workflows) an agent loads for `/merlon-docs`, which decide when the agent edits docs and which workflow it follows

The CLI and the skill are separate installs with separate docs. [Get started](../../README.md#get-started) in the project README shows how to install the skill and start its bootstrap session, and the [skill catalog](../skills.md) lists its workflows. The skill doesn't include the `merlon` binary, so a repository that runs `merlon compile` or `merlon check` in scripts or CI installs this package as well. [Repo-root npm scripts](./config-essentials.md#repo-root-npm-scripts) shows the npm scripts.
