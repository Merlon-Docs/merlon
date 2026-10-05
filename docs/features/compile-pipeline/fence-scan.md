# Fence scan

Compile finds fenced code and code spans with one scan, which the steps that leave code as written share. `stripAnchors` and heading demotion read each line with it, and so does the heading reader behind the refs registry and [section slugs](./section-slugs.md). The [link passes](./link-passes.md), `codeEvidence`, broken-link marking, link lint and [table re-alignment](./tables-after-link-rewriting.md) also run it on the text of each blockquote, up to ten blockquotes deep. Table re-alignment reads only the fences, since a pipe splits a cell in a code span too. [Fence scan limits](#fence-scan-limits) says where those readers can still disagree about where code is.

The fence scan follows list items. A bullet or numbered list marker followed by one to four columns of whitespace opens an item whose text starts after that whitespace. A marker with no text after it opens an empty item whose text would start one column past the marker, and a blank line right after an empty item ends it. When a marker starts at or past the column where an open item's text starts, it nests in that item. The item ends at the first non-blank line that starts left of its text, unless that line continues a paragraph. Headings, fences, blockquotes, thematic breaks and list items interrupt a paragraph, and any other line continues it. In its own item, a list item interrupts a paragraph only when it has text and, if numbered, starts at 1.

The container of a fence is the column where the innermost open item's text starts, or column 0 outside any item. Three or more backticks or tildes open a fence where they start a line's text less than four columns past the container, or right after a list marker. Tabs advance to the next multiple of four columns, and a backtick fence's info string can't hold a backtick.

A run of the same character, at least as long and with nothing after it, closes the fence when it starts less than four columns past the container. A non-blank line that starts left of the container ends the fence along with its list item. A fence with no closer runs to the end of the text unless its list item ends first.

Code spans are paired within each line. A run of backticks opens a span that the next run of the same length closes.

## Fence scan limits

The scan doesn't read blockquotes or HTML. Run on its own, it misses a fence behind `>`, which the readers that also scan blockquote text find. It doesn't let a line continue a quoted paragraph, so an unindented line right after a quote in a list item ends the item. A fence line inside an HTML comment or HTML block opens or closes a fence like any other. Indented code blocks aren't fences either, so the scan reads their lines as prose.

The scan doesn't open an item for a list marker followed by five or more columns of whitespace. CommonMark opens one there whose first line is indented code, so a fence in that item can run past the line where CommonMark ends it.

Because code spans are paired within each line, a span that wraps onto the line, or a backslash-escaped backtick before it, can shift the pairing.

A reader that starts a new scan on each shard and a reader that scans the whole guide at once can disagree about a shard that follows one ending inside an open fence. Heading demotion starts a new scan on each text it demotes, such as one shard, while the refs registry reads its whole text with one scan. The per-shard link passes and `codeEvidence` start a new scan on each shard, while broken-link marking and compiled link lint read the whole guide with one scan, as the intra-guide run on the stitched body does.
