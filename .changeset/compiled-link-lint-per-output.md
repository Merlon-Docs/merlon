---
'@bwilliamson/mdcp-core': minor
'@bwilliamson/mdcp-cli': patch
---

Lint each compiled output against its own slugs, and lint the monolith as a document

`lintLinks` accepted a compiled `#fragment` when it matched a heading of the
output or the slug of any shard in the guide link index. So a guide could link
`#topic` to a heading that only another guide's compiled guide has, and
`mdcp check` passed. The monolith was never linted as a document, apart from
its BROKEN LINK markers. Issue lines also left out the banner, so a diagnostic
named a line two lines above the link in the written file.

Each `CompileGuideResult` now has `knownSlugs`, the slugs broken-link marking
accepted besides the headings of `text`: the slug of each section `text`
stitches, such as a `FIND-*` finding id or a declared `{#id}`. A guide in the
monolith also has `monolithKnownSlugs` for `monolithText`, the section slugs of
every copy there. Link lint checks a fragment in an output against that
output's headings and known slugs, so compile and check agree. A fragment on a
link to another output still has to match a heading there, so a link to a
shard that the output doesn't stitch fails, even when the shard is in the
directory of the output's guide. It passes only when another heading there has
the same slug, and it then points at that heading.

Broken-link marking now accepts only the slugs of sections the document
stitches. It used to accept the slug of each shard that the guide link index
gives the guide, such as a shard in the guide's directory. So a link to such a
shard that the guide doesn't stitch passed compile and check and pointed at no
heading. Compile now marks it. In the monolith, a link to a shard that no
guide there stitches is marked too, unless another heading or section there has
the slug the link takes. Such a link then points at that heading, or at no
heading when only a section's declared `{#id}` has the slug, and compile and
link lint pass it in the monolith. Each copy in the monolith accepts the section
slugs of every copy, whichever guide is the shard's owner.

Link lint reads each output as compile writes it, banner included, through the
new `compiledOutputDocuments` export. It lints the monolith as a document of
its own and leaves out an issue that the guide's compiled guide already
reports for the same link. It matches a link issue or a BROKEN LINK marker at
the same line of the guide's text first. It reports a monolith issue under the
guide whose copy holds its line, as it does for a compiled guide. Called without
`compileOptions`, `lintLinks` now counts the banner from config in its line
numbers and lints the monolith too. The `knownSlugs` option of `assembleGuide`
is now marked deprecated. Assembly already ignored it.

`mdcp compile` and `mdcp check` report these issues. A diagnostic now gives the
line of the written file, banner included, and a monolith issue gives the guide
whose copy holds its line.

Compile now adds a newline to a `banner` that lacks one. The banner's last line
used to share a line with the guide's title, which then had no anchor in the
written file. A later heading with the same title lost its number too. A link
to either heading named a slug that the written file didn't have.

A check that passed before can fail when a guide links a `#fragment` that only
another output has. Link it through its shard file instead, so compile
rewrites the link to that output. That doesn't clear a link to a `FIND-*`
shard or to a heading with a `{#id}` marker, since no heading in the other
output has the id that the rewritten link gives.
