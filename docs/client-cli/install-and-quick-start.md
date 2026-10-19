# Install and quick start

[![npm version](https://img.shields.io/npm/v/@merlon-docs/merlon-docs-cli.svg)](https://www.npmjs.com/package/@merlon-docs/merlon-docs-cli)

This package installs the **`merlon` CLI** for use in your repo or CI. It works in **any** codebase, whatever its stack or layout, because Merlon Docs manages only your documentation shards and compile pipeline.

To install the Agent Skill instead, see [Get started](../../README.md#get-started) and the [skill catalog](../skills.md) (or [Not the Agent Skill](./about.md#not-the-agent-skill)).

## Requirements

- Node.js **22.13.0** or later.

## Install

```bash
# Dev dependency (recommended)
npm install -D @merlon-docs/merlon-docs-cli

# Or run without installing
npx @merlon-docs/merlon-docs-cli check --config merlon.config.json

# Global install
npm install -g @merlon-docs/merlon-docs-cli
```

Several commands run peer tools that you install in your repository, such as markdownlint-cli2 for `merlon lint` and Vale for `merlon prose`. [Optional linters](./optional-linters.md) lists the peer tools each command runs and how to install them.

## Stability

Before **1.0.0**, CLI commands, flags, the `merlon.config.json` schema and compile output can change in any `0.x.y` release, under the [pre-1.0 policy](../developer/versioning-and-releases.md#pre-10-policy-0xy).

Before upgrading, read the changelog and release notes of each Merlon Docs package you use. They hold the upgrade notes for earlier releases, which the feature catalog doesn't repeat.

## Quick start

1. Create `merlon.config.json` in your docs root. Start with this minimal config for two guides, `overview` and `admin-guide`. Set `configVersion` to the version of `@merlon-docs/merlon-docs-core` you install; when it's missing, loading the config fails and names the value to add. [Minimal config](./config-essentials.md#minimal-config) says what each field does:

   ```json
   {
     "configVersion": "1.0.0",
     "compileOrder": ["overview", "admin-guide"],
     "guides": [{ "name": "overview" }, { "name": "admin-guide" }]
   }
   ```

   Once you install markdownlint-cli2 and `@merlon-docs/merlon-docs-presets` with the npm command in [Optional linters](./optional-linters.md), add a `lint` key that lints the shards with the shard preset. The whole file then reads:

   ```json
   {
     "configVersion": "1.0.0",
     "compileOrder": ["overview", "admin-guide"],
     "guides": [{ "name": "overview" }, { "name": "admin-guide" }],
     "lint": {
       "markdownlint": {
         "shardsConfig": "../node_modules/@merlon-docs/merlon-docs-presets/markdownlint-shards.markdownlint-cli2.jsonc"
       }
     }
   }
   ```

   This path works when the docs root is a direct child of the directory that holds `node_modules`, and Optional linters says how Merlon Docs resolves it. When markdownlint-cli2 is missing, `merlon check` skips the shard pass with an info line unless you pass `--require-lint`. When the preset file is missing, the pass fails. Optional linters also covers the compiled-output preset and Vale.

2. Lay out shards under guide directories (each with `index.md` and chapter files). The [sample guides](../../examples/sample-guides/) in the Merlon Docs repository show a layout, and you can [copy single keys from their config](./config-reference.md#full-schema-and-sample-config).

3. Run:

   ```bash
   # When your shell is in the docs root
   merlon compile --config merlon.config.json
   merlon check --config merlon.config.json --skip-vale
   ```

   From the **repository root** (typical npm scripts), pass both `--config` and `--docs-root`:

   ```bash
   merlon compile --config docs/merlon.config.json --docs-root docs
   merlon check --config docs/merlon.config.json --docs-root docs --skip-vale
   ```

   [`--config` vs `--docs-root`](./config-essentials.md#--config-vs---docs-root) says what each flag resolves from, and [Global options](./commands-reference.md#global-options) lists the options that every command accepts.

   `--skip-vale` leaves Vale out of the check. Without it, `merlon check` runs Vale whenever it finds `vale`, and Vale stops with a runtime error when it can't find a config. Drop the flag once you set up Vale as [Optional linters](./optional-linters.md) describes.

4. Add `docs:compile` and `docs:check` scripts to your repo-root `package.json`, as [Repo-root npm scripts](./config-essentials.md#repo-root-npm-scripts) shows. The check script runs `merlon check --require-lint`. Add `--skip-vale` to it until Vale is set up, then replace that flag with `--require-vale`.

5. Run the same compile and check scripts in CI. The [verification checklist](#verification-checklist) lists what to confirm once they pass.

   If your repository commits compiled outputs, such as a package README that is a [publish output](../glossary/publish-output.md), add a CI step that runs `git diff --exit-code` after `merlon compile`. That step fails when a committed output differs from what its shards compile to. `merlon check` writes every output again before it checks them, so it passes on a stale one.

## Verification checklist

After you set up a repository, confirm each item:

1. **`merlon compile`**: per-guide outputs under `_build/` (or explicit `compile.outputFile` targets); optional monolith when `outputFile` is set
2. **`merlon check --require-lint`**: passes the [check gate](../features/check-gate.md) with markdownlint-cli2 required for each configured markdownlint stage
3. **`merlon check --require-vale`**: when Vale is configured
4. **Hook output**: diagram tables inlined (`inlineInserts`), code evidence blocks resolved (`codeEvidence`), cross-guide links rewritten to `#slug` targets in compiled output (a link to a guide in `compile.crossGuideLinks.ignoreGuides` keeps its shard `.md` path, except in the cases that [its config section](../features/compile-pipeline/cross-guide-links.md#compilecrossguidelinksignoreguides) points to)
