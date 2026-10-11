# Cross-links and refs

When writing `` `[link text](#anchor)` `` in a shard, the fragment must match the [heading slug](../glossary/heading-slug.md) in **compiled** output. [Refs](../glossary/refs.md) keep those [cross-links](../glossary/cross-link.md) checkable after stitch.

```bash
mdcp compile --config docs/mdcp.config.json --docs-root docs
mdcp check --config docs/mdcp.config.json --docs-root docs
mdcp refs-list --config docs/mdcp.config.json --docs-root docs
```

`mdcp check` fails on dead `#` fragments and bad paths. `mdcp refs-list` lists the heading slugs of each compiled output, with the output's file, from the [refs registry](../glossary/refs-registry.md) that `mdcp compile` writes. When `mdcp check` reports a dead anchor on a link into a compiled output, look up that file's slugs with `mdcp refs-list --format table`. A `#fragment` has to match a slug of the file the link points at. For a bare `#fragment` in a shard, that is each output that stitches the shard. Compile stitches a guide's shard into the guide's [compiled guide](../glossary/compiled-guide.md) and, for a guide in the [monolith](../glossary/monolith.md), into the monolith too, where the same heading can take another slug, such as `setup-1` for `setup`. A bare `#fragment` may also point at the id of a section in that output, such as a `FIND-*` finding id. `mdcp refs-list` doesn't print those ids. Compile doesn't write its own output for a [standalone guide](../glossary/standalone-guide.md), so its headings are in the registry only when a guide stitches the file through its manifest or a `compile.scopeRoot` walk, as [Standalone guide behavior](../features/standalone-guides.md#standalone-guide-behavior) says.

## Heading slugs (GitHub rules)

**Authoring rules** (CLI consumers):

1. Prefer unique subheadings. A repeated title gets a `-1` or `-2` suffix on its slug, the way GitHub numbers duplicates.
2. Validate with `mdcp check` — do not guess anchors from shard-only titles.
3. Link a heading by the slug of its text. [GFM scope](../features/design-constraints/gfm-scope.md#headings) sets that contract and says not to write an explicit `{#id}` after a heading.

Slug algorithm, examples, and programmatic APIs: [Core — heading slugs](../client-core/api-refs-validation.md#heading-slugs-github-slugger).
