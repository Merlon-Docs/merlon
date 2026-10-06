# cross-link

A **cross-link** (also **cross-ref**) is a Markdown link whose target is another place in the docs set. It is usually a same-document `[label](#heading-slug)` fragment or a path to another shard that compile may rewrite.

Cross-links are why [refs](./refs.md) exist. After assemble, the visible heading text and level can change. The [heading slug](./heading-slug.md) that works in a shard may then differ from the slug in the compiled file. MDCP rewrites these targets and validates the links in each [compiled guide](./compiled-guide.md). See [Built-in link validation](../features/link-validation.md).
