---
'@bwilliamson/mdcp-core': patch
---

Read manifest, shard and insert links in linear time

Compile reads the `.md` links and `](#slug)` links of a manifest, then the `.md` links of each shard it follows a link to. The `inlineInserts` hook reads links into an insert library. Both read the whole text at once. The regexes that did this read a link target with `[^)]`, which crosses line breaks. On a crafted text the `.md` and insert link regexes rescanned the rest of the text from each `[` and again after each `.md`, so their time grew with the cube of the text's length. A shard of 1,000 lines of `See [x](a.md#` took 4.5 s to compile, and an `inlineInserts` body of 21,600 characters took 8.4 s. The slug link regex rescanned the rest of a manifest from each `](#`, so its time grew with the square of the manifest's length.

Linear scanners now find the same links, with the same labels, paths and fragments, and the same two inputs take 9 ms and under 1 ms. New cases in the ReDoS budget suite cover a shard, a manifest and an insert body whose link targets never close, and texts whose links share a label end or a target end.

The `inlineInserts` section of the core package README now states the rule the hook matches links with. The target starts with a library directory, after an optional `./` or run of `../`, and the directory and the `.md` can take any case. A `#fragment` after the `.md` can't be empty.
