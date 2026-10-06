# About @bwilliamson/mdcp-core

[![npm version](https://img.shields.io/npm/v/@bwilliamson/mdcp-core.svg)](https://www.npmjs.com/package/@bwilliamson/mdcp-core)

The **programmatic core library** for the [MarkDown Context Protocol (MDCP)](https://github.com/betsalel-williamson/mdcp). It compiles sharded Markdown guides and validates their structure. From the compiled output it also builds the registry of section links (`refs.json`).

Use this package when you need compile, validation, and refs APIs in scripts, CI, editors, or other tools **without** shelling out to the CLI.

## Not the CLI or the Agent Skill

- **This library:** the TypeScript/Node API from `@bwilliamson/mdcp-core` on npm
- **CLI:** the command-line wrapper around this library, [`@bwilliamson/mdcp-cli`](https://www.npmjs.com/package/@bwilliamson/mdcp-cli)
- **Agent Skill:** the host instructions an agent loads for `/mdcp`, installed as [Get started](../../README.md#get-started) in the project README describes

`@bwilliamson/mdcp-cli` depends on this package, so install `@bwilliamson/mdcp-core` directly only when you need the programmatic API. The Agent Skill is a separate install: this library doesn't depend on it, and installing the skill does **not** install this library.

## Requirements

- Node.js **>= 18.0.0**

## Install

```bash
npm install @bwilliamson/mdcp-core
```

## Stability

**Pre-1.0:** there is **no API stability guarantee** before this package reaches **1.0.0**. Exported functions, types, `mdcp.config.json` schema, and compile output may change in any `0.x.y` release. Read the changelog and release notes of each MDCP package you use before upgrading.
