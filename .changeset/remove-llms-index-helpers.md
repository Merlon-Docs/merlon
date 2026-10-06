---
'@bwilliamson/mdcp-core': minor
---

Remove the unused llms-index helpers `parseLlmsIndexFilename`, `isLlmsIndexDraftFilename`, `expandProtocolVersion`, `abbreviateProtocolVersion` and `protocolVersionToReleaseRef`, which were left over from the removed `mdcp export`, and drop `export.llm` from `mdcp.config.schema.json`. Breaking for importers of those names.
