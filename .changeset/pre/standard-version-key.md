---
'@merlon-docs/merlon-docs-core': minor
'@merlon-docs/merlon-docs-cli': patch
'@merlon-docs/merlon-docs-presets': patch
'@merlon-docs/skill-merlon-docs': patch
'@merlon-docs/skill-merlon-docs-arch-gtm': patch
'@merlon-docs/skill-merlon-docs-arch-oss-library': patch
'@merlon-docs/skill-merlon-docs-arch-product-docs-site': patch
'@merlon-docs/skill-merlon-docs-arch-research': patch
---

The config key for the version of the Merlon Docs standard is now `standardVersion`, defaulting to `1.0.0-draft.0` with the 1.0 draft line (replacing the former `0.5.0.0` label and `protocolVersion` name). A config that still sets `protocolVersion` keeps working until 2.0.0: when `standardVersion` is absent, `loadConfig` and the new `parseConfig` migrate it to `1.0.0-draft.0` on `standardVersion`, and they fail when the two keys hold different values. A parsed config still has `protocolVersion`, set to the same value. The JSON schema marks `protocolVersion` as deprecated.

The copyright line in each license now reads Merlon Docs. Code comments, the JSON schema and the docs now call the specification "the standard". The presets README now refers to the `MerlonDocs` Vale style, which the rename had missed.
