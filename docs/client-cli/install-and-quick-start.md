# Install and quick start

[![npm version](https://img.shields.io/npm/v/@bwilliamson/mdcp-cli.svg)](https://www.npmjs.com/package/@bwilliamson/mdcp-cli)

This package installs the **`mdcp` CLI** (MarkDown Context Protocol) for use in your repo or CI. It works in **any** codebase — language, framework, and repo layout do not matter; mdcp only manages your documentation shards and compile pipeline.

This is **not** the Agent Skill. For skill install (`npx skills add`, `/mdcp help me get started`), see [root README](../../README.md) or [Agent Skill (related)](./agent-skill.md).

## Requirements

- Node.js **>= 18.0.0**

## Install

```bash
# Dev dependency (recommended)
npm install -D @bwilliamson/mdcp-cli

# Or run without installing
npx @bwilliamson/mdcp-cli check --config mdcp.config.json

# Global install
npm install -g @bwilliamson/mdcp-cli
```

## Stability

**Pre-1.0:** Until this package reaches **1.0.0**, there is **no API stability guarantee**. CLI commands, flags, `mdcp.config.json` schema, and compile output may change in any `0.x.y` release. Read the package changelog before upgrading.

### Get involved

Visit [github.com/betsalel-williamson/mdcp](https://github.com/betsalel-williamson/mdcp), **star** the repo to follow progress, **share** it if it helps your team, and **open or comment on [GitHub Issues](https://github.com/betsalel-williamson/mdcp/issues)** with feedback, adoption stories, or reviews. Explore [DORA AI Capabilities](https://dora.dev/ai/) and join the community at [dora.community/join](https://dora.community/join) for SDLC best practices.

Optional lint tooling (install in your repo when you want `mdcp lint`, `mdcp prose`, or `mdcp check --require-lint`):

```bash
npm install -D markdownlint-cli2 @bwilliamson/mdcp-presets
```

For prose lint (`mdcp prose`, `mdcp check --require-vale`), install [Vale](https://vale.sh/docs/vale-cli/installation/) separately so `vale` is on your `PATH`.

## Quick start

1. Copy a starter config from [examples/sample-guides/mdcp.config.json](../../examples/sample-guides/mdcp.config.json) into your docs directory as `mdcp.config.json`.

2. Lay out shards under guide directories (each with `index.md` and chapter files). See [examples/sample-guides](../../examples/sample-guides/).

3. Run:

```bash
# When your shell is in the docs directory
mdcp compile --config mdcp.config.json
mdcp check --config mdcp.config.json
```

From the **repository root** (typical npm scripts), pass both `--config` and `--docs-root`:

```bash
mdcp compile --config docs/mdcp.config.json --docs-root docs
mdcp check --config docs/mdcp.config.json --docs-root docs
```

`--config` is resolved from where you run the command; `--docs-root` sets the docs root. Details: [Config essentials](./config-essentials.md#--config-vs---docs-root).

Global options (apply to every command):

| Option                | Default            | Purpose                                                                          |
| --------------------- | ------------------ | -------------------------------------------------------------------------------- |
| `-c, --config <path>` | `mdcp.config.json` | Config file path, resolved from the **invocation directory** (not `--docs-root`) |
| `--docs-root <path>`  | current directory  | Docs root — one subdirectory per guide shard tree                                |
