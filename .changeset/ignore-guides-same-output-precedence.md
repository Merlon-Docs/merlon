---
'@bwilliamson/mdcp-core': patch
'@bwilliamson/mdcp-cli': patch
---

The core README's cross-guide section now states how `compile.crossGuideLinks.ignoreGuides` and same compiled output preference interact. Compile behaves as before.

A link to a shard that the compiling guide stitches takes the in-document anchor when the shard's owner in the guide link index is non-canonical, even when the compiling guide lists that owner in `ignoreGuides`. A non-canonical owner is only the first guide in `compileOrder` whose walk reached the shard. A `../` link to a shard whose canonical owner is listed keeps its shard path. A `./` or bare link to such a shard still takes the in-document anchor through the intra-guide pass when the compiling guide stitches the shard. The matching rules and the exclusions list read as if every link to a listed guide kept its shard path, and now link the precedence rule. The `ignoreGuides` summaries in the core README's API config section, compile hooks overview and glossary entry, and in the CLI README's consumer migration steps, read the same way. Each now points at the `compile.crossGuideLinks.ignoreGuides` section, which links both rules. The type docs of `AssembleGuideOptions.ignoreGuides` and `CrossGuideLinkRewriteOptions.ignoreGuides` now name the same exceptions.
