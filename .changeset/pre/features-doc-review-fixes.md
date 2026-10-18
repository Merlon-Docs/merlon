---
'@merlon-docs/merlon-docs-cli': patch
'@merlon-docs/merlon-docs-core': patch
---

Doc review corrections in sections that the READMEs stitch. The `orphan` entry in both READMEs links the new Orphan check scope section of the Manifest compile order spec, which says what the check reports and which files it doesn't read. The entry's second paragraph restated that scope and is gone.

In the CLI README, the `refs registry` entry says that `merlon compile`, `merlon refs-gen` and `merlon check` rewrite `refs.json` from their own compile, and that only `merlon refs-check` fails on a stale file, as the new Stale registry check section of the Refs registry path spec says. It used to say that `merlon check` verifies the registry against the latest compile, which can't fail because `merlon check` writes the file first. The `refs` entry there drops "via `merlon check`" from its check refs row and links the registry entry from its own row.

Both READMEs link the backup path layout in the Compile output backup spec instead of restating where `--backup` puts a prior output. The CLI README said prior output sits under `backups/`, but the backup of a publish output outside the docs root climbs out of that directory.

The `locale pack` entry in both READMEs and the `authored GFM` entry in the core README now have lowercase titles, like the other common-noun glossary entries. Their anchors are unchanged.
