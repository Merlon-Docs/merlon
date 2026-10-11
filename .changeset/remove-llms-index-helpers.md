---
'@merlon-docs/merlon-docs-core': minor
---

Remove the unused llms-index helpers `parseLlmsIndexFilename`, `isLlmsIndexDraftFilename`, `expandProtocolVersion`, `abbreviateProtocolVersion` and `protocolVersionToReleaseRef`, which were left over from the removed `merlon export`, and drop `export.llm` from `merlon.config.schema.json`. Breaking for importers of those names.
