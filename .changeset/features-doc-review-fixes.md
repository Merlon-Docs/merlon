---
'@bwilliamson/mdcp-cli': patch
'@bwilliamson/mdcp-core': patch
---

Doc review corrections in the glossary entries that the READMEs stitch. The `orphan` entry in both READMEs links the new Orphan check scope section of the Manifest compile order spec, which says what the check reports and which files it doesn't read. The entry's second paragraph restated that scope and is gone.

In the CLI README, the `refs registry` entry says that `mdcp compile`, `mdcp refs-gen` and `mdcp check` rewrite `refs.json` from their own compile, and that only `mdcp refs-check` fails on a stale file, as the new Stale registry check section of the Refs registry path spec says. It used to say that `mdcp check` verifies the registry against the latest compile, which can't fail because `mdcp check` writes the file first. The `refs` entry there drops "via `mdcp check`" from its check refs row and links the registry entry from its own row.
