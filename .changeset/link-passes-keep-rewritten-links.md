---
'@bwilliamson/mdcp-core': patch
---

Compile no longer lets a later link pass rewrite a link that the cross-guide or publish-relative pass already wrote.

The cross-guide pass writes a link to an output in the same directory as the output's file name alone, such as `glossary.md#term`. When the linking guide stitched a shard with that file name, the intra-guide pass turned the link into a dead `#term`, and compile marked it as a broken link. Guides without `compile.outputFile` all write to the output directory, so a link between two of them met this whenever the linking guide stitched a shard named like the other's compiled guide. The link now keeps the target the cross-guide pass wrote.

The publish-relative pass also looked up a cross-guide target from the shard's directory, though that target is relative to the link base. When the path led to some other file from there, the pass pointed the link at that file, so `../../README.md#t` became `../../docs/README.md#t` once `docs/README.md` existed. It now leaves a cross-guide target as written.

A path that `compile.crossGuideLinks.ignoreGuides` keeps is still rebased relative to the link base. The intra-guide run on the stitched body read that rebased path from the guide directory, and turned it into `#slug` when the guide stitched the shard and the path led to it from there. Whether it did depended on where each document sat, so a guide in the monolith could link the section in its compiled guide and the shard file in the monolith. Both documents now link the shard file, also in a layout where both used to link the section. A `./` or bare link to a shard the guide stitches still becomes `#slug`, because the intra-guide pass rewrites it per shard and the publish-relative pass only matches `../`.

A direct `assembleGuide` call that sets `publishOutputFile` now keeps each path the publish-relative pass rebases. Without `linkIndex`, a `../` link to a shard the guide stitches used to become `#slug` when the rebased path also led to the shard from the guide directory. It now stays a path relative to `publishOutputFile`.

The exported `rewriteCrossGuideFileLinks` doesn't mark the targets it writes. A caller that runs `rewriteIntraGuideFileLinks` on its output still lets the intra-guide pass read a target such as `glossary.md#term` as a shard link and turn it into `#term`.

The compile hooks section of the core README states the new rule under "Link passes".
