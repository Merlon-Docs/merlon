---
'@merlon-docs/merlon-docs-cli': minor
'@merlon-docs/merlon-docs-core': minor
'@merlon-docs/merlon-docs-presets': minor
'@merlon-docs/skill-merlon-docs': minor
'@merlon-docs/skill-merlon-docs-arch-gtm': minor
'@merlon-docs/skill-merlon-docs-arch-oss-library': minor
'@merlon-docs/skill-merlon-docs-arch-product-docs-site': minor
'@merlon-docs/skill-merlon-docs-arch-research': minor
---

Merlon Docs is now Merlon Docs. The packages publish as `@merlon-docs/merlon-docs-cli`, `@merlon-docs/merlon-docs-core` and `@merlon-docs/merlon-docs-presets`, and the CLI command is `merlon`. The Agent Skill installs as `merlon-docs` with `npx skills add Merlon-Docs/merlon --skill merlon-docs`, and the archetypes are `merlon-docs-arch-*`.

The config file is `merlon.config.json`. For this minor release the CLI still reads `mdcp.config.json` when no `merlon.config.json` exists, and it prints a notice that says to rename the file. The illustrative-paths marker is `<!-- merlon-paths: illustrative -->`, and the former `mdcp-paths` spelling still works for this minor release too.

The Vale style is `MerlonDocs`, so a rule reads `MerlonDocs.DatedClaim`. Compiled outputs carry `<!-- merlon-shard: … -->` markers. In the core API the config types are `MerlonConfig`, `MerlonConfigInput` and `MerlonConfigSchema`, and the `Mdcp*` names stay as deprecated aliases for this minor release.

To migrate a project, install the new packages, rename `mdcp.config.json` to `merlon.config.json`, and change `MDCP` to `MerlonDocs` in `.vale.ini`, in `<!-- vale MDCP.… -->` comments and in the `StylesPath` link to the presets.
