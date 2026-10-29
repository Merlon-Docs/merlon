# About @merlon-docs/merlon-docs-core

[![npm version](https://img.shields.io/npm/v/@merlon-docs/merlon-docs-core.svg)](https://www.npmjs.com/package/@merlon-docs/merlon-docs-core)

The **programmatic core library** for [Merlon Docs](https://github.com/Merlon-Docs/merlon), a documentation system for software projects. It compiles sharded Markdown guides and validates their structure. From the compiled output it also builds the registry of section links (`refs.json`).

Use this package when you need compile, validation, and refs APIs in scripts, CI, editors, or other tools **without** shelling out to the CLI.

## Not the CLI or the Agent Skill

- **This library:** the TypeScript/Node API from `@merlon-docs/merlon-docs-core` on npm
- **CLI:** the command-line wrapper around this library, [`@merlon-docs/merlon-docs-cli`](https://www.npmjs.com/package/@merlon-docs/merlon-docs-cli)
- **Agent Skill:** the host instructions an agent loads for `/merlon-docs`, installed as [Get started](../../README.md#get-started) in the project README describes

`@merlon-docs/merlon-docs-cli` depends on this package, so install `@merlon-docs/merlon-docs-core` directly only when you need the programmatic API. The Agent Skill is a separate install: this library doesn't depend on it, and installing the skill does **not** install this library.

## Requirements

- Node.js **22** or later. Use the latest release of your major version for its security fixes.

## Install

```bash
npm install @merlon-docs/merlon-docs-core
```

## Stability

On **1.0.0** and later, exported functions, types, the `merlon.config.json` schema, and compile output follow semver: breaking changes ship only in **major** releases, as [Versioning and releases](../developer/versioning-and-releases.md#pre-10-policy-0xy) describes for the move past 1.0.0. On **`0.x.y`**, those surfaces had no API stability guarantee under that policy. [Stability](../client-cli/install-and-quick-start.md#stability) in the CLI README says what to read before upgrading.
