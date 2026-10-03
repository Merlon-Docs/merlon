# standalone guide

A single markdown file registered as its own guide that is **not** compiled from shards. Declared in `standaloneGuides[]`, it is the source and the published file at once — for example a hand-authored package `README.md` or a top-level `SECURITY.md`.

Contrast with a [guide](#mdcp), which stitches a list of shards into one output. A standalone guide is register-only: compile never stitches, rewrites, or emits it, but its headings still register into [refs](#refs) and its outbound links are link-linted with the same checks a shard gets. Registering a file as standalone marks it as [captured](#coverage) so the coverage scan does not report it.

See [Documentation coverage scan](../features/coverage-scan.md).
