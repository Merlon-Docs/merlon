# Export results

PERSONA: librarian

## How export works today (stale — mixes architecture with usage)

When you export, the PIPELINE_STAGE_MARKER runs first: ingest, normalize, then
serialize. The pkg/export-compiler module owns the transform graph.

Maintainer rebuild checklist:

1. Rebuild packages/export-compiler
2. Restart the compile worker
3. Flush the shard cache

Librarians should somehow get a file — details TBD.
