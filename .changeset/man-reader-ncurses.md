---
'@merlon-docs/merlon-docs-core': patch
---

The man reader handles what the ncurses pages use: tbl tables (`.TS`…`.TE`) are left out of prose but their page references are read, a line ending in a backslash joins the next, `\*(..` strings and `\(..` special characters no longer leave residue such as `*(lq`, an escaped space stays inside a macro argument, and an autoconf placeholder such as `@TIC@(1)` is checked as `tic(1)`.
