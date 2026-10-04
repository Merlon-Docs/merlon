# Cross-links and refs

When writing `` `[link text](#anchor)` `` in a shard, the fragment must match the [heading slug](../glossary/heading-slug.md) in **compiled** output. [Refs](../glossary/refs.md) keep those [cross-links](../glossary/cross-link.md) checkable after stitch.

```bash
mdcp compile --config docs/mdcp.config.json --docs-root docs
mdcp check --config docs/mdcp.config.json --docs-root docs
mdcp refs-list
```

`mdcp check` fails on dead `#` fragments and bad paths. `mdcp refs-list` shows registry entries from the [refs registry](../glossary/refs-registry.md).

## Heading slugs (GitHub rules)

**Authoring rules** (CLI consumers):

1. Prefer unique subheadings (duplicate titles get `-1`, `-2` slug suffixes).
2. Validate with `mdcp check` — do not guess anchors from shard-only titles.
3. Prefer GFM auto-slugs over explicit `{#id}` overrides.

Slug algorithm, examples, and programmatic APIs: [Core — heading slugs](../client-core/api-refs-validation.md#heading-slugs-github-slugger).
