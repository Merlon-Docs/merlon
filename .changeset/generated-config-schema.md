---
'@merlon-docs/merlon-docs-core': patch
---

Describe each documented key of `MerlonConfigSchema` in the zod schema itself, so `z.toJSONSchema(MerlonConfigSchema)` carries the same descriptions, title and `protocolVersion` deprecation as the editor schema. The repository's `merlon.config.schema.json` is now generated from it during the build.
