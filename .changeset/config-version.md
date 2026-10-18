---
'@merlon-docs/merlon-docs-core': minor
'@merlon-docs/merlon-docs-cli': minor
'@merlon-docs/skill-merlon-docs': patch
---

A `merlon.config.json` now declares its config format version in `configVersion`: the version of `@merlon-docs/merlon-docs-core` it was written for, since core defines the format. Loading a config that declares no version fails, and the error names the line to add. Breaking: add `"configVersion": "<installed core version>"` to configs that have no version key. A config with the former `standardVersion` or `protocolVersion` still loads, migrated to the installed version, and those keys are read until 2.0.0; the CLI's upgrade of `mdcp.config.json` writes `configVersion`.

Core exports `MerlonConfigFileSchema`, the file format with `configVersion` required, and `DEFAULT_CONFIG_VERSION`, the package's version. `MerlonConfigSchema`, the in-memory config the compile API takes, doesn't require a version. `DEFAULT_STANDARD_VERSION` is a deprecated alias of `DEFAULT_CONFIG_VERSION` until 2.0.0. The generated `merlon.config.schema.json` marks `configVersion` required. The Agent Skill's getting-started workflow tells agents to set `configVersion`.
