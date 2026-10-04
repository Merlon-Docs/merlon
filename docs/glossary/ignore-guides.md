# ignoreGuides

**`ignoreGuides`** is a list of guide names on the **compiling** guide, under `compile.crossGuideLinks.ignoreGuides`. Cross-guide links to a listed guide keep pointing at the source shard instead of rewriting to a `#slug` target. [Publish-relative rewrite](../client-core/compile-hooks/publish-relative-links.md#ignoreguides-interaction) still rebases the kept path. The listed guide stays in `compileOrder` and in the link index.

Read [Cross-guide link rewriting](../client-core/compile-hooks/cross-guide-links.md) for how other links rewrite, and the [publish-only link policy](../features/link-validation.md#publish-only-link-policy) for how link validation treats kept shard paths.
