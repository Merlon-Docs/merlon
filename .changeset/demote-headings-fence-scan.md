---
'@bwilliamson/mdcp-core': patch
---

Keep headings inside fenced code in a CRLF shard

Heading demotion skips the lines inside fenced code blocks, so a `# comment` in a shell example keeps its level. It found the fences with a regex that ended in `(.*)$` without the `m` flag, and on a line that ends in a carriage return that regex never matched. In a shard with CRLF line endings, compile and `demoteHeadings` demoted each heading-like line inside a fence. On a crafted CRLF line the regex also gave the backtick run back one character at a time, so a line of 40,000 backticks took 2.4 s.

Demotion now finds fences with the scan that the slug registry's heading reader uses. A heading inside a fence of a CRLF shard stays as written, and the 40,000 backticks take under 1 ms. Since the scan follows GFM, a few lines that the regex misread now read as GFM renders them:

- A run of backticks or tildes shorter than the one that opened the fence, or one followed by an info string, no longer closes it.
- A line of three or more backticks followed by another backtick, such as `` ``` `x` ``` ``, no longer opens a fence.
- A fence that starts one to three spaces in now counts as a fence.

`demoteExceptFirstH1` changes the same way. On text that ends with a newline, both functions still add a blank line at the end.
