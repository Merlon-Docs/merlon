---
'@merlon-docs/merlon-docs-core': minor
'@merlon-docs/merlon-docs-cli': minor
---

Validate source-file and directory link targets and link-lint standalone guides

`merlon check` now fails on a link whose target names a source file or directory (`path/`) that does not
resolve, in shard sources and in compiled output. Previously any target not
ending in `.md` was skipped, so a link to a deleted module or directory passed the gate
indefinitely.

Files registered under `standaloneGuides` are now link-linted with the same
checks a shard gets. They are never compiled, so no phase read their links
before; the docs already claimed they were validated.

Targets that name no resolvable file or directory class — a bare word —
stay unvalidated, and external `http://`, `https://` and `//` URLs are skipped without network requests.
