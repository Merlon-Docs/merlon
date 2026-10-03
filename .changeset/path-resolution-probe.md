---
'@bwilliamson/mdcp-core': minor
'@bwilliamson/mdcp-cli': minor
---

Add opt-in path resolution for backtick paths in prose

`mdcp check` can now resolve backtick-quoted repository paths in shards and
standalone guides, and fail on the ones that resolve nowhere. This catches a
document describing code, files or a component that no longer exists — prose a
link check never reads.

Off by default (`lint.paths.severity: "off"`). Turning it on for a corpus
written without it produces findings that are correct as written, so a
repository enables it deliberately, cleans up once, and keeps it on.

A claim needs a directory segment and a name, so a bare `index.md`, a single
`src/`, a command line, a glob, a flag and a code identifier are not claims.
Claims resolve against the file's own directory, the scan root, the docs root,
each guide `scopeRoot`, and `lint.paths.searchRoots`.

Two config lists declare why a path legitimately does not resolve, and they say
which case they are rather than sharing one allow-list. `lint.paths.generated`
covers paths that exist only after a build or install, matched as a prefix since
nothing under one exists yet. `lint.paths.vocabulary` covers a name the
repository documents without having, such as a protocol tier a consumer creates,
matched exactly so an invented file beneath that name still has to resolve.

Because no pattern separates a stale path from an always-illustrative one, the
discriminator is authorial: `<!-- mdcp-paths: illustrative -->` exempts the file
when it stands alone on a line, or one line when it trails content.
