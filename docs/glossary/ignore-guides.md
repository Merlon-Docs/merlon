# ignoreGuides

**`ignoreGuides`** is a list of guide names on the **compiling** guide, under `compile.crossGuideLinks.ignoreGuides`. Cross-guide links to a listed guide keep pointing at the source shard instead of rewriting to a `#slug` target, except in the cases that [its config section](../client-core/compile-hooks/cross-guide-links.md#compilecrossguidelinksignoreguides) points to. [`ignoreGuides` interaction](../client-core/compile-hooks/publish-relative-links.md#ignoreguides-interaction) says how compile rebases a kept path, and when a `./` or bare link to a stitched shard takes `#slug`. The listed guide stays in `compileOrder` and in the link index.

Read [Cross-guide link rewriting](../client-core/compile-hooks/cross-guide-links.md) for how other links rewrite, and the [publish-only link policy](../features/link-validation.md#publish-only-link-policy) for how link validation treats kept shard paths.
