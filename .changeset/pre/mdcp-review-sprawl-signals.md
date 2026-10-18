---
'@merlon-docs/merlon-docs-core': minor
'@merlon-docs/merlon-docs-cli': minor
---

Add `merlon review`, a report-only command that flags documentation sprawl across guide shards: index groups with too many shard links (`index-size`), shards with too many prose words (`long-shard`), paragraphs repeated in two or more shards (`duplicate-paragraph`), and shards in one guide that share a title (`similar-titles`). Each finding names the files and a fix (with `fix:` printed once per signal group header in text output). Use `--json` for machine-readable output, `--strict` to exit 1 when there are findings, and `--guide <name>` to review one guide (duplicates shared with other guides included). Tune thresholds with the new optional `review` config object (`maxIndexEntries`, `maxShardWords`, `minDuplicateWords`); paths in `scan.ignore` are skipped. Core exports `reviewDocs` and `formatReviewReport`.
