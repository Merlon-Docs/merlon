---
'@merlon-docs/merlon-docs-core': minor
'@merlon-docs/merlon-docs-cli': minor
---

`merlon check --no-compile` resolves man page references, such as `open(2)` in a man page or `` :manpage:`open(2)` `` in RST, against the pages in the tree. A reference that resolves nowhere is an `unresolved-manpage` warning, printed without failing the check. `man.quiet` lists references that shouldn't warn, by section (`"4"`), by page or pattern (`"msr(4)"`), or as `"defaults"` for sections 1, 2, 3 and 8. A name the tree has, in a section it lacks, always warns.
