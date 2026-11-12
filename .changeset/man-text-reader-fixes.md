---
'@merlon-docs/merlon-docs-core': patch
---

Read real-world man pages and READMEs more faithfully: a `.nf` or `.EX` block that is never closed ends at the next `.SH` or `.SS` instead of hiding the rest of the page, page references inside no-fill blocks (often `SEE ALSO`) are read, troff spacing escapes such as `\|` are dropped, and a plain-text heading that follows prose is a section, not the document's title.
