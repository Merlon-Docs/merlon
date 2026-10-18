---
'@merlon-docs/merlon-docs-core': patch
---

Compile discards a shard's leading YAML front matter instead of stitching it into the guide, where it rendered as a horizontal rule and a stray heading. When compile drops lines before a shard's body, the opening source tag names the line the body starts on (`<!-- merlon-shard: start guide/section.md#L6 -->`), so link diagnostics still report the shard's own line numbers.
