# Overview

[![npm version](https://img.shields.io/npm/v/@bwilliamson/mdcp-core.svg)](https://www.npmjs.com/package/@bwilliamson/mdcp-core)

Core library for **mdcp** (MarkDown Context Protocol). It compiles sharded Markdown guides, builds section link registries, and validates structure.

Use this package when you need mdcp behavior in scripts, CI pipelines, editors, or other tools without shelling out to the CLI. For the Agent Skill (host instructions), see [root README](../../README.md) — that is a separate install.

## Requirements

- Node.js **>= 18.0.0**

## Install

```bash
npm install @bwilliamson/mdcp-core
```

The CLI (`@bwilliamson/mdcp-cli`) depends on this package. Install `@bwilliamson/mdcp-core` directly only when you need the programmatic API.

## Stability

**Pre-1.0:** Until this package reaches **1.0.0**, there is **no API stability guarantee**. Exported functions, types, `mdcp.config.json` schema, and compile output may change in any `0.x.y` release. Read the package changelog before upgrading.
