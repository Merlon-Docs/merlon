---
'@bwilliamson/mdcp-core': patch
---

Number section links with every heading in the compiled guide

A link to a shard compiles to the anchor of the heading that opens the shard's section. Compile used to number only those opening headings, and it skipped sub-headings and the guide's H1. When an earlier heading had the same title, the link pointed at that earlier heading, and `mdcp check` passed. One slugger now numbers every ATX heading at column 0 in stitch order, starting with `compile.title` or the manifest's H1. The link gets the heading's numbered anchor, such as `-1`. The guide link index takes each slug from the numbering of the shard's owner, so a link that goes to the owner's compiled guide matches the anchor there. A `FIND-*` shard or a first heading with `{#id}` keeps its declared id, and later headings with the same title count its heading. When `compile.stripAnchors` is `false` and the `stripAnchors` hook doesn't run, the compiled headings keep their `{#id}` markers, and each heading is numbered by the title it renders, marker included.

A line inside a fenced code block is no longer a heading anywhere mdcp numbers headings: section slugs, `buildSlugRegistry` and the same-shard `#fragment` check all skip it. A `# comment` in a shell example no longer takes a slug or shifts a later anchor, and `refs.json` no longer files the headings after it under a guide named after the comment.

Compiled anchors change only where an earlier heading or a fenced line took a section heading's slug first. A cross-guide link also changes when the index took its slug from a guide whose transitive walk includes the shard. It now takes the slug from the shard's owner.
