# Cross-links and refs

When writing `` `[link text](#anchor)` `` in a shard, the fragment must match the [heading slug](../glossary/heading-slug.md) in **compiled** output. [Refs](../glossary/refs.md) keep those [cross-links](../glossary/cross-link.md) checkable after stitch.

```bash
mdcp compile --config docs/mdcp.config.json --docs-root docs
mdcp check --config docs/mdcp.config.json --docs-root docs
mdcp refs-list
```

`mdcp check` fails on dead `#` fragments and bad paths. `mdcp refs-list` lists the heading slugs of each compiled output, with the output's file, from the [refs registry](../glossary/refs-registry.md). A `#fragment` has to match a slug of the file the link points at. For a bare `#fragment` in a shard, that is each output that stitches the shard. Compile stitches a guide's shard into the guide's [compiled guide](../glossary/compiled-guide.md) and, for a guide in the [monolith](../glossary/monolith.md), into the monolith too, where the same heading can take another slug, such as `setup-1` for `setup`. A bare `#fragment` may also point at the id of a section in that output, such as a `FIND-*` finding id or a declared `{#id}`. `mdcp refs-list` doesn't print those ids. Compile doesn't write an output for a [standalone guide](../glossary/standalone-guide.md), so the registry doesn't hold its headings.

## Heading slugs (GitHub rules)

**Authoring rules** (CLI consumers):

1. Prefer unique subheadings (duplicate titles get `-1`, `-2` slug suffixes).
2. Validate with `mdcp check` — do not guess anchors from shard-only titles.
3. Prefer GFM auto-slugs over explicit `{#id}` overrides.

Slug algorithm, examples, and programmatic APIs: [Core — heading slugs](../client-core/api-refs-validation.md#heading-slugs-github-slugger).
