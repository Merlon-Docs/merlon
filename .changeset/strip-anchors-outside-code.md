---
'@bwilliamson/mdcp-core': patch
'@bwilliamson/mdcp-cli': patch
---

Keep `{#id}` examples inside code when compile strips anchor markers

`stripExplicitAnchorMarkers`, which backs the `stripAnchors` hook and the post-stitch strip, removed every `{#id}` marker in the document. When a guide quoted the syntax in an inline code span, the span compiled to an empty pair of backticks, and a fenced example lost its ids too. The strip now keeps a marker inside an inline code span or a fenced code block.

Heading lines keep the old rule. A line that parses as an ATX heading at column 0 loses every marker, even inside a fence or a code span. mdcp computes heading slugs from titles with every marker removed and without skipping fences. Stripping the whole line keeps the compiled heading on the slug that refs and rewritten links use, however a fence is read. To show the syntax on a heading inside a fenced example, start the heading line one to three spaces in. mdcp doesn't read that line as a heading, so it keeps its marker.

Fences are found line by line. A fence counts when it starts at most three columns in, or right after a list marker, and the scan doesn't read blockquotes or HTML. It misses a fence behind `>` or one indented four or more columns, as in a nested list item. A marker in such a fence still goes unless a code span on its line holds it. Code spans are paired within each line, so a span that wraps onto the line, or a backslash-escaped backtick before it, can shift the pairing. A shifted pairing can drop a quoted marker or keep a prose one.

The strip itself works line by line too. It trims whitespace only on the marker's own line, so a marker that opens a paragraph leaves the blank line above it in place. When a marker opens a line's text, the whitespace after it goes instead, and the line keeps its indent. The strip still drops a line that contains only a marker. With the markers on separate lines, the time grows linearly with the document.

`mdcp compile` output changes the same way. The CLI and core READMEs quote the syntax again, and the core README gives `stripAnchors` its own section with these rules.
