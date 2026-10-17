---
'@merlon-docs/merlon-docs-core': patch
---

Read inline links as CommonMark does in every link reader

Link lint, broken-link marking, the link passes, `codeEvidence`, the manifest walk and the `inlineInserts` hook ran a link's label to its first `]`. In a linked image, `[![Diagram](./d.png)](./page.md)`, they read the image's src and missed the outer target. Compile left `./page.md` as written and link lint didn't check it, and the walk didn't follow it to a shard. They didn't read a label with brackets in it, such as `[the arr[0] notes](./notes.md)`, at all.

These readers now read a label as CommonMark reads link text, so a label can contain an image or balanced brackets. Compile rewrites the outer target of a linked image, and link lint checks it. Broken-link marking marks a dead `#fragment` there with the label and target the shard wrote, and the walk follows the target to a shard. A bracket after a backslash is text, so `\[x](./x.md)` isn't a link, and the walk no longer follows it. Link lint checks no image's src, so it no longer reports a missing src in a linked image, as it never did for an image alone. `inlineInserts` no longer reads an image as an insert link. In `codeEvidence`, the walk and `inlineInserts`, a target now ends at the first `)` on its line, as in link lint and the link passes. So an unfinished link such as `[x](see` no longer takes in the link on the next line.
