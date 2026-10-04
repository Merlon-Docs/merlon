---
'@bwilliamson/mdcp-core': minor
'@bwilliamson/mdcp-cli': patch
---

Assemble a guide in the monolith once for its compiled guide and once for the monolith

A guide without `compile.outputFile` is written to its own compiled guide and,
when the config sets top-level `outputFile`, into the monolith too. Compile
assembled it once, against the monolith, and wrote that text to both files.
Its compiled guide then had paths and source tags relative to the monolith,
so they broke whenever the monolith was in another directory. A link
between two guides in the monolith compiled to a `#slug` that the linking
guide's compiled guide doesn't have, so compile replaced it with a BROKEN LINK
marker in both files and exited 1. In the monolith itself, a section link could
point at an earlier guide's heading with the same title, and `mdcp check`
passed.

Compile now assembles such a guide twice. Its compiled guide rebases paths and
source tags relative to itself, and it links another guide in the monolith
through that guide's compiled guide, such as `b.md#topic`, when that guide
stitches the target shard. Otherwise it links the monolith. Its copy in the
monolith rebases relative to the monolith and links the monolith's own
headings. One slugger numbers every guide in the monolith, in `compileOrder`,
so a section link there takes `#setup-1` when an earlier guide also has a Setup
heading. A publish output that links a guide in the monolith takes the
monolith's slug. An explicit `#fragment` is never renumbered, so a hand-written
`#setup` can still point at an earlier guide's heading in the monolith.

Compile marks broken links in a guide's copy in the monolith after every copy is
assembled, against the headings of the whole monolith. So a link such as
`../a/setup.md#details` to a sub-heading of another guide stays a link there.
`lintLinks` reports a BROKEN LINK marker that appears only in the monolith. It
matches each marker in a guide's copy in the monolith to the same marker in
that guide's compiled guide, so a marker in both files is reported once, even
when the rest of its line differs. A stale `#fragment` on a link to another
guide in the monolith is reported once for each file: as a dead anchor in the
linking guide's compiled guide and as a marker in the monolith.
`LocaleBrokenLinkCopy` gains the optional `findMarkers` method, which returns
each marker on a line, and `createLocalePack` provides it.

`markBrokenLinks` now replaces each broken link where it stands, and its marker
gives the target that link was written with. It used to pair a broken link
with the first unused shard link of the same label among the broken ones, and
to replace the first text that matched the link, which could be in an earlier
code span. So a marker could name another link's target, or replace the text in
the code span and leave the broken link as it was. It now pairs the k-th link
with a label with the k-th provenance entry with that label. A link then gets
the same marker in a compiled guide and in the monolith. `extractLinks` gives
each link's `offset` in the markdown.

`CompileGuideResult.text` is now each guide's own compiled guide. For a guide
in the monolith it used to hold the monolith copy, so code that read it as the
monolith copy should read the new optional `monolithText` instead.
`compileGuidesFromResults` and `compileGuides` stitch the monolith from
`monolithText`. `GuideLinkEntry` gains the optional `guideFile` and
`monolithSlug` fields. Both are set only for a shard whose owner is in the
monolith: `guideFile` only when the owner stitches the shard, and
`monolithSlug` only when some copy in the monolith stitches it.
`assembleGuide` and `rewriteCrossGuideFileLinks` take a `monolithFile` option.

`mdcp compile` and `mdcp check` change with it. A link between two guides in the
monolith no longer fails them, and a link that compile marks only in the
monolith now does.

Compile output changes for configs with a monolith. It can also change in a
config without one, for a broken link that shares its label with an earlier
link or whose text also appears in an earlier code span. A guide in the
monolith takes about twice as long to assemble. Its compile hooks, a
registered custom hook included, run twice for each shard, with fresh
`hookState` for each assembly.
