---
'@bwilliamson/mdcp-core': minor
'@bwilliamson/mdcp-cli': minor
---

Validate source-file link targets and link-lint standalone guides

`mdcp check` now fails on a link whose target names a source file that does not
resolve, in shard sources and in compiled output. Previously any target not
ending in `.md` was skipped, so a link to a deleted module passed the gate
indefinitely.

Files registered under `standaloneGuides` are now link-linted with the same
checks a shard gets. They are never compiled, so no phase read their links
before; the docs already claimed they were validated.

Targets that name no resolvable file class — a bare word, a directory path —
stay unvalidated.
