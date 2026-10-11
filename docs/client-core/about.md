# About @merlon-docs/merlon-docs-core

[![npm version](https://img.shields.io/npm/v/@merlon-docs/merlon-docs-core.svg)](https://www.npmjs.com/package/@merlon-docs/merlon-docs-core)

The **programmatic core library** for the [MarkDown Context Protocol (MDCP)](https://github.com/Merlon-Docs/merlon). It compiles sharded Markdown guides and validates their structure. From the compiled output it also builds the registry of section links (`refs.json`).

Use this package when you need compile, validation, and refs APIs in scripts, CI, editors, or other tools **without** shelling out to the CLI.

## Not the CLI or the Agent Skill

- **This library:** the TypeScript/Node API from `@merlon-docs/merlon-docs-core` on npm
- **CLI:** the command-line wrapper around this library, [`@merlon-docs/merlon-docs-cli`](https://www.npmjs.com/package/@merlon-docs/merlon-docs-cli)
- **Agent Skill:** the host instructions an agent loads for `/merlon-docs`, installed as [Get started](../../README.md#get-started) in the project README describes

`@merlon-docs/merlon-docs-cli` depends on this package, so install `@merlon-docs/merlon-docs-core` directly only when you need the programmatic API. The Agent Skill is a separate install: this library doesn't depend on it, and installing the skill does **not** install this library.

## Requirements

- Node.js **>= 18.0.0**

## Install

```bash
npm install @merlon-docs/merlon-docs-core
```

## Stability

Before **1.0.0**, exported functions, types, the `merlon.config.json` schema and compile output can change in any `0.x.y` release, under the [pre-1.0 policy](../developer/versioning-and-releases.md#pre-10-policy-0xy). [Stability](../client-cli/install-and-quick-start.md#stability) in the CLI README says what to read before upgrading.
