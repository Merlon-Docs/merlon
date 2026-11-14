---
'@merlon-docs/merlon-docs-core': minor
'@merlon-docs/merlon-docs-cli': minor
---

The `man` reader follows `.so` includes, so a man page split into fragments is checked as one: a missing fragment is a broken link, and a fragment no page includes is an orphan, even without `roots`. A man page is titled by name and section, such as `term(5)`, so `term(5)` and `term(7)` no longer read as a title clash. Page references resolve to the names a page's NAME section lists, sections compare without case (`addch(3X)` resolves to `curs_addch.3x`), uppercase sections are read, and a call such as `attrset(0)` is no longer a reference. `SourceDoc` gains an optional `aliases` list.
