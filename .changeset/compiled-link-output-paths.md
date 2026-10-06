---
'@bwilliamson/mdcp-core': minor
'@bwilliamson/mdcp-cli': patch
---

Match compiled `.md` links to compile outputs by path, not file name

`mdcp check` skipped a compiled `.md` link whenever its file name matched any
output of the run. With the root `README.md` as an output, a link to a package
`README.md` passed even when that file was gone or its `#fragment` named no
heading. Publish-only output had a similar fallback that took an allowed publish
path with the same file name as the target.

A link now points at another output only when its resolved path is that
output's path. Its `#fragment` is checked against the headings in that output's
compiled text, before or after the output is written, from publish-only output
as well. Any other `.md` target has to exist, and its fragment has to match one
of its headings. The monolith counts as an output only when at least one guide
is stitched into it, so a link to a monolith that is never written reports
`missing publish path`, even when an earlier run left the file on disk.

A check that passed before can now fail. A link to a sibling package README
with a stale fragment is the likely case. Some failures are in links that
compile writes itself, so editing shards won't clear them. A cross-output link
to a `FIND-*` shard or to a heading with a `{#id}` marker is one. Compile
rewrites it to `other.md#find-004` or `other.md#id`, but the heading in that
output gets a slug from its text, such as `find-004--example-finding`.

The `knownOutputBasenames` option is deprecated and ignored.
`lintCompiledLinks` and `validateCompiledLinkTarget` take `knownOutputPaths`,
the absolute paths of the run's outputs, instead. They also take
`unwrittenOutputPaths` for configured outputs that the run doesn't write.
