---
'@merlon-docs/merlon-docs-core': patch
---

Read inline links in linear time in link lint and the link passes

Link lint, broken-link marking and the cross-guide, intra-guide and publish-relative link passes read each line's links with regexes, and `codeEvidence` read each run of lines between fenced code with one. Each regex matched `[label](target)` with negated character classes, so on a crafted line it read the rest of the line again from each `[`. Compiling a shard whose one line is `[a](b` repeated 8,000 times, then one `)`, took about 730 ms, and the same line with 100,000 copies took about 2 minutes.

These readers now find links with a linear scanner in `compile/link-scan.ts`. Those shards now compile in under 20 ms and under 250 ms. New cases in the ReDoS budget suite cover each reader.
