---
'@bwilliamson/mdcp-core': patch
---

Strip `{#id}` markers from a long line in linear time

`stripExplicitAnchorMarkers`, which backs the `stripAnchors` hook and the post-stitch strip, trims the whitespace before each marker it removes. `stripPandocAnchors` with `trimPrecedingWhitespace` did that by reading the end of the output it had built so far, and V8 copied that whole output on each read. A line with many markers took time that grew with the square of its length. A line of 40,000 `a{#x}` markers took 135 ms to strip, and one of 160,000 took 6.7 s.

The helper now keeps its output as ranges of the input and trims the last range. Its time grows linearly with the line, and the same two lines take 8 ms and 30 ms. A new case in the ReDoS budget suite covers a line of many markers between words. The output is the same.
