---
'@merlon-docs/merlon-docs-core': patch
'@merlon-docs/merlon-docs-cli': patch
'@merlon-docs/skill-merlon-docs': patch
'@merlon-docs/skill-merlon-docs-arch-product-docs-site': patch
---

Use "compiled guide" for the file compile writes for one guide, and keep "monolith" for the optional top-level `outputFile`. The `merlon compile` help text now reads "Stitch shards into compiled guides". The `ignoreGuides` type docs now say that links to a listed guide's shards keep source `.md` paths instead of `#slug` targets in the file that holds the target guide. The `standaloneGuides` schema description now says a standalone guide doesn't get compile output of its own. The `merlon shard` help text now reads "Split a source document into shards (md-tree)". The `merlon-docs` skill's context guardrails tell agents not to load whole compiled output (a compiled guide or the monolith). The product docs site archetype skill now says "one large file" instead of "monolith" for an oversized authoring tree.
