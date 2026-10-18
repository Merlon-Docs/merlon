# Compile pipeline

This group covers the assembly steps that run whatever `compile.hooks` says: how they rewrite links and re-align tables, and the rules they share with the [compile hooks](../../client-core/compile-hooks/index.md). The [hooks overview](../../client-core/compile-hooks/index.md#architecture) diagram shows where the steps run. Compile numbers [section slugs](./section-slugs.md) before any hook runs.

- [Front matter](./front-matter.md): why compile discards a shard's leading YAML front matter, and how diagnostics keep the shard's line numbers.
- [Link passes](./link-passes.md): the three passes that rewrite a shard's links to files, and the links they leave as written.
- [Path lookup order](./path-lookup-order.md): the directories each pass and hook tries when it follows a link to a file.
- [Fence scan](./fence-scan.md): how compile finds fenced code and code spans for the passes and hooks that leave code as written.
- [Section slugs](./section-slugs.md): how compile numbers the `#slug` of each section it stitches.
- [Cross-guide link rewriting](./cross-guide-links.md): how a link to a shard becomes a `#slug` in the same document or in another output.
- [Publish-relative link rewriting](./publish-relative-links.md): how compile rebases a shard's `../` paths to the file being assembled.
- [Tables after link rewriting](./tables-after-link-rewriting.md): how compile re-aligns a table whose links changed width.
