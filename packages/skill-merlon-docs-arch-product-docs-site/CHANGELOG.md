# @merlon-docs/skill-merlon-docs-arch-product-docs-site

## 1.0.0

### Major Changes

- 4b846c4: This is the 1.0 draft of Merlon Docs. The CLI, the core library, the presets and the Agent Skills publish as `1.0.0-draft.N` prereleases under the npm `draft` tag. Install the newest draft with `npm install @merlon-docs/merlon-docs-cli@draft`. The interfaces can still change between drafts. 1.0.0 is the first release with a stability guarantee, and from 1.0.0 on a breaking change needs a major version.

### Minor Changes

- 4b846c4: MDCP (MarkDown Context Protocol) is now Merlon Docs. The packages publish as `@merlon-docs/merlon-docs-cli`, `@merlon-docs/merlon-docs-core` and `@merlon-docs/merlon-docs-presets`, and the CLI command is `merlon`. The Agent Skill installs as `merlon-docs` with `npx skills add Merlon-Docs/merlon --skill merlon-docs`, and the archetypes are `merlon-docs-arch-*`.

  The config file is `merlon.config.json`. Until 2.0.0, a CLI run that finds `mdcp.config.json` and no `merlon.config.json` upgrades the project itself. It writes the config to `merlon.config.json` with `protocolVersion` renamed to `standardVersion` and set to `1.0.0-draft.0`, deletes `mdcp.config.json` and prints a notice. The illustrative-paths marker is `<!-- merlon-paths: illustrative -->`, and the former `mdcp-paths` spelling still works until 2.0.0.

  The Vale style is `MerlonDocs`, so a rule reads `MerlonDocs.DatedClaim`. Compiled outputs carry `<!-- merlon-shard: … -->` markers. In the core API the config types are `MerlonConfig`, `MerlonConfigInput` and `MerlonConfigSchema`, and the `Mdcp*` names stay as deprecated aliases until 2.0.0.

  To migrate a project, install the new packages, run any `merlon` command once to upgrade the config file, and change `MDCP` to `MerlonDocs` in `.vale.ini`, in `<!-- vale MDCP.… -->` comments and in the `StylesPath` link to the presets.

### Patch Changes

- 4b846c4: Use "compiled guide" for the file compile writes for one guide, and keep "monolith" for the optional top-level `outputFile`. The `merlon compile` help text now reads "Stitch shards into compiled guides". The `ignoreGuides` type docs now say that links to a listed guide's shards keep source `.md` paths instead of `#slug` targets in the file that holds the target guide. The `standaloneGuides` schema description now says a standalone guide doesn't get compile output of its own. The `merlon shard` help text now reads "Split a source document into shards (md-tree)". The `merlon-docs` skill's context guardrails tell agents not to load whole compiled output (a compiled guide or the monolith). The product docs site archetype skill now says "one large file" instead of "monolith" for an oversized authoring tree.
- 4b846c4: The config key for the version of the Merlon Docs standard is now `standardVersion`, defaulting to `1.0.0-draft.0` with the 1.0 draft line (replacing the former `0.5.0.0` label and `protocolVersion` name). A config that still sets `protocolVersion` keeps working until 2.0.0: when `standardVersion` is absent, `loadConfig` and the new `parseConfig` migrate it to `1.0.0-draft.0` on `standardVersion`, and they fail when the two keys hold different values. A parsed config still has `protocolVersion`, set to the same value. The JSON schema marks `protocolVersion` as deprecated.

  The copyright line in each license now reads Merlon Docs. Code comments, the JSON schema and the docs now call the specification "the standard". The presets README now refers to the `MerlonDocs` Vale style, which the rename had missed.

## 1.0.0-draft.0

### Major Changes

- 5ab62e8: This is the 1.0 draft of Merlon Docs. The CLI, the core library, the presets and the Agent Skills publish as `1.0.0-draft.N` prereleases under the npm `draft` tag. Install the newest draft with `npm install @merlon-docs/merlon-docs-cli@draft`. The interfaces can still change between drafts. 1.0.0 is the first release with a stability guarantee, and from 1.0.0 on a breaking change needs a major version.

### Minor Changes

- 58452d2: MDCP (MarkDown Context Protocol) is now Merlon Docs. The packages publish as `@merlon-docs/merlon-docs-cli`, `@merlon-docs/merlon-docs-core` and `@merlon-docs/merlon-docs-presets`, and the CLI command is `merlon`. The Agent Skill installs as `merlon-docs` with `npx skills add Merlon-Docs/merlon --skill merlon-docs`, and the archetypes are `merlon-docs-arch-*`.

  The config file is `merlon.config.json`. Until 2.0.0, a CLI run that finds `mdcp.config.json` and no `merlon.config.json` upgrades the project itself. It writes the config to `merlon.config.json` with `protocolVersion` renamed to `standardVersion` and set to `1.0.0-draft.0`, deletes `mdcp.config.json` and prints a notice. The illustrative-paths marker is `<!-- merlon-paths: illustrative -->`, and the former `mdcp-paths` spelling still works until 2.0.0.

  The Vale style is `MerlonDocs`, so a rule reads `MerlonDocs.DatedClaim`. Compiled outputs carry `<!-- merlon-shard: … -->` markers. In the core API the config types are `MerlonConfig`, `MerlonConfigInput` and `MerlonConfigSchema`, and the `Mdcp*` names stay as deprecated aliases until 2.0.0.

  To migrate a project, install the new packages, run any `merlon` command once to upgrade the config file, and change `MDCP` to `MerlonDocs` in `.vale.ini`, in `<!-- vale MDCP.… -->` comments and in the `StylesPath` link to the presets.

### Patch Changes

- 9bc05cd: Use "compiled guide" for the file compile writes for one guide, and keep "monolith" for the optional top-level `outputFile`. The `merlon compile` help text now reads "Stitch shards into compiled guides". The `ignoreGuides` type docs now say that links to a listed guide's shards keep source `.md` paths instead of `#slug` targets in the file that holds the target guide. The `standaloneGuides` schema description now says a standalone guide doesn't get compile output of its own. The `merlon shard` help text now reads "Split a source document into shards (md-tree)". The `merlon-docs` skill's context guardrails tell agents not to load whole compiled output (a compiled guide or the monolith). The product docs site archetype skill now says "one large file" instead of "monolith" for an oversized authoring tree.
- 01b6d2b: The config key for the version of the Merlon Docs standard is now `standardVersion`, defaulting to `1.0.0-draft.0` with the 1.0 draft line (replacing the former `0.5.0.0` label and `protocolVersion` name). A config that still sets `protocolVersion` keeps working until 2.0.0: when `standardVersion` is absent, `loadConfig` and the new `parseConfig` migrate it to `1.0.0-draft.0` on `standardVersion`, and they fail when the two keys hold different values. A parsed config still has `protocolVersion`, set to the same value. The JSON schema marks `protocolVersion` as deprecated.

  The copyright line in each license now reads Merlon Docs. Code comments, the JSON schema and the docs now call the specification "the standard". The presets README now refers to the `MerlonDocs` Vale style, which the rename had missed.

## 0.7.2

### Patch Changes

- d60f90d: Move skill version carriers and CHANGELOGs to packages/skill-* so npx skills add installs stay free of release metadata; publish skill notes on GitHub Releases in the same single-step main release job as npm packages.

## 0.7.1

### Patch Changes

- e017c43: Version packages and Agent Skills independently via Changesets; release on merge to main through the Version Packages PR. Major bumps stay blocked until maintainers open 1.0.
