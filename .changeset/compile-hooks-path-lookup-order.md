---
'@bwilliamson/mdcp-core': patch
---

The core README's compile hooks section states each pass's path lookup order once, under "Path lookup order", in a table that matches the code. The per-hook lists it replaces were wrong. No pass tries the shard's parent directory. The publish-relative rewrite tries `compile.scopeRoot` before the guide directory. `codeEvidence`, `inlineInserts` and the cross-guide rewrite try the working directory and its parent before `compile.scopeRoot`.

The `codeEvidence` section now says what the hook does with the fragment of a link whose file it can't find. It keeps an existing `#L` fragment or adds one from a line range in the label or path, and it drops any other `#fragment`. Its exclusions list said such a link was left unchanged. The section also says a data file gets an `#L` fragment from a line range the shard writes, and never from symbol lookup. It said a data file never got one.

The Architecture section now lists the three link passes in one "Link passes" table, and its diagram shows the per-shard intra-guide pass. The Built-in hooks list links that table in place of its entries for the cross-guide and publish-relative passes, which aren't hooks. The cross-guide section's "Link rewrite passes" table and the publish-relative section's "Division of labor" table are gone, so links to `#link-rewrite-passes-cross-guide-vs-intra-guide` or `#division-of-labor-three-link-passes` should point at `#link-passes`. The "guideDir misaligned with shard tree" section moved under Architecture and keeps its anchor.

The cross-guide section no longer describes which links the compile walk follows. The Manifest compile order spec in the features guide covers that now, so links to `#transitive-section-discovery` or `#what-the-walk-follows` should point at its "Linked shards and the file-name fallback" section. The ownership rules for the guide link index are under "Index ownership" (`#index-ownership`) in the cross-guide section, and "Cross-guide purpose" says which shards get an entry: each shard the walk compiles that opens with a heading, and each `FIND-*` finding. The API Config section's publish-outputs paragraph links to the link passes instead of restating them.

The publish-relative section's matching and exclusions lists now match the code.

The `inlineInserts` search root examples use `shared`, the parent of a `diagrams/` library. Compile resolves the whole link path, such as `diagrams/flow.md`, against each root, so a root named `diagrams` looks for `diagrams/diagrams/flow.md`.
