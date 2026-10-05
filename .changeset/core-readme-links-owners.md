---
'@bwilliamson/mdcp-core': patch
'@bwilliamson/mdcp-cli': patch
---

The core README links each rule's owner instead of restating it. API Config and the compile hooks overview link Default compile hooks in the Features Guide for the forms `compile.hooks` takes. The overview's "Opt out per hook" and "Explicit override" subsections are gone, so links to `#opt-out-per-hook` or `#explicit-override` should point at that spec's Configuration section. The rule for the strip after stitching is stated once, under "stripAnchors purpose".

The Config API summary gives the `ignoreGuides` exception in one clause that links the glossary entry, and the glossary entry, which each README stitches, links the two rules behind it. A link to a shard the compiling guide stitches can still take its in-document anchor. Same compiled output preference says when the cross-guide pass gives it one, and `ignoreGuides` interaction says when the intra-guide pass does, for a `./` or bare link. The CLI README now stitches the `ignoreGuides` glossary entry, which its consumer migration steps link. API Config links Source tags and default banner for the per-guide banner and source tag keys, and Config essentials for the base of each generated path. API Compile says what `knownSlugs` and `monolithKnownSlugs` hold and links the BROKEN LINK marker spec for the fragments that pass.

The core README no longer links the monolith glossary entry, which led to a chain of doc-authoring terms, so it stitches three glossary entries where it stitched fifteen. API Compile defines the monolith in one sentence instead.
