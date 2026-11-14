---
'@merlon-docs/merlon-docs-core': patch
---

The man and RST readers run in linear time on long runs of unclosed escapes or padded lines, and the man reader reads `\e` as a literal backslash that starts no other escape.
