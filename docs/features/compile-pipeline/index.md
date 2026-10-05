# Compile pipeline

How assembly rewrites links and re-aligns tables, steps that run whatever `compile.hooks` says. The [hooks overview](../../client-core/compile-hooks/index.md#architecture) diagram shows where they run. [Path lookup order](./path-lookup-order.md) also covers the [compile hooks](../../client-core/compile-hooks/index.md) that follow a link to a file.

- [Link passes](./link-passes.md): the three passes that rewrite a shard's links to files, and the links they leave as written.
- [Path lookup order](./path-lookup-order.md): the directories each pass and hook tries when it follows a link to a file.
- [Cross-guide link rewriting](./cross-guide-links.md): how a link to a shard becomes a `#slug` in the same document or in another output.
- [Publish-relative link rewriting](./publish-relative-links.md): how compile rebases a shard's `../` paths to the file being assembled.
- [Tables after link rewriting](./tables-after-link-rewriting.md): how compile re-aligns a table whose links changed width.
