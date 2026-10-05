---
'@bwilliamson/mdcp-core': patch
'@bwilliamson/mdcp-cli': patch
---

The core README keeps the API reference and what a hook author or config author uses: the compile hooks overview, the extension pattern and each built-in hook. The compile pipeline specs moved to a Compile pipeline group in the Features Guide, under `docs/features/compile-pipeline/`: Link passes, Path lookup order, Cross-guide link rewriting, Publish-relative link rewriting and Tables after link rewriting. The core README links them. Its `#link-passes`, `#path-lookup-order`, `#guidedir-misaligned-with-shard-tree`, `#cross-guide-link-rewriting`, `#publish-relative-link-rewriting` and `#tables-after-link-rewriting` anchors are gone, with the anchors of their subsections, so a link to one of them should point at the same heading in the moved shard. The group also has a Fence scan shard and a Section slugs shard, split from the stripAnchors spec and the cross-guide spec.

The CLI README links the moved shards where it linked those core README sections.
