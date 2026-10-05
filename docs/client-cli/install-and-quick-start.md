# Install and quick start

[![npm version](https://img.shields.io/npm/v/@bwilliamson/mdcp-cli.svg)](https://www.npmjs.com/package/@bwilliamson/mdcp-cli)

This package installs the **`mdcp` CLI** (MarkDown Context Protocol) for use in your repo or CI. It works in **any** codebase — language, framework, and repo layout do not matter; mdcp only manages your documentation shards and compile pipeline.

To install the Agent Skill instead, see [Not the Agent Skill](./about.md#not-the-agent-skill).

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

Several commands run peer tools that you install in your repository, such as markdownlint-cli2 for `mdcp lint` and Vale for `mdcp prose`. [Optional linters](./optional-linters.md) lists the peer tools each command runs and how to install them.

## Stability

Before **1.0.0**, this package has **no API stability guarantee**: CLI commands, flags, the `mdcp.config.json` schema and compile output can change in any `0.x.y` release, under the [pre-1.0 policy](../developer/versioning-and-releases.md#pre-10-policy-0xy). Read the changelog and release notes of each MDCP package you use before upgrading. They hold the upgrade notes for earlier releases, which the feature catalog doesn't repeat.

### Get involved

Visit [github.com/betsalel-williamson/mdcp](https://github.com/betsalel-williamson/mdcp), **star** the repo to follow progress, **share** it if it helps your team, and **open or comment on [GitHub Issues](https://github.com/betsalel-williamson/mdcp/issues)** with feedback, adoption stories, or reviews. Explore [DORA AI Capabilities](https://dora.dev/ai/) and join the community at [dora.community/join](https://dora.community/join) for SDLC best practices.

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

   `--config` resolves from the directory you run the command in, and `--docs-root` sets the docs root. [Config essentials](./config-essentials.md#--config-vs---docs-root) has the details, and [Global options](./commands-reference.md#global-options) lists the options that every command accepts.

4. Add `docs:compile` and `docs:check` scripts to your repo-root `package.json`, as [Repo-root npm scripts](./config-essentials.md#repo-root-npm-scripts) shows. The check script runs `mdcp check --require-lint`. Add `--require-vale` to it when Vale is configured.

5. Run the same compile and check scripts in CI. The [verification checklist](#verification-checklist) lists what to confirm once they pass.

## Verification checklist

After you set up a repository, confirm each item:

1. **`mdcp compile`**: per-guide outputs under `_build/` (or explicit `compile.outputFile` targets); optional monolith when `outputFile` is set
2. **`mdcp check --require-lint`**: passes the [check gate](../features/check-gate.md) with markdownlint-cli2 required for each configured markdownlint stage
3. **`mdcp check --require-vale`**: when Vale is configured
4. **Hook output**: diagram tables inlined (`inlineInserts`), code evidence blocks resolved (`codeEvidence`), cross-guide links rewritten to `#slug` targets in compiled output (a link to a guide in `compile.crossGuideLinks.ignoreGuides` keeps its shard `.md` path, except in the cases that [its config section](../client-core/compile-hooks/cross-guide-links.md#compilecrossguidelinksignoreguides) points to)
