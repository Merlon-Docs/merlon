# stripAnchors

<!-- mdcp-paths: illustrative -->

Specification for the `stripAnchors` compile hook. Tests in `packages/mdcp-core/test/anchors.test.ts` map to the sections below (docs first, then TDD).

## stripAnchors purpose

The hook removes `{#id}` anchor markers from each shard body. With `compile.stripAnchors` (default `true`), the same strip runs once more on the stitched guide.

A marker goes with the whitespace before it on the same line. When a marker opens a line's text, the whitespace after it goes instead, and the line keeps its indent. The strip drops a line that contains only a marker, and when that line opens the text or follows a blank line, the blank line right after it goes too.

## stripAnchors heading lines

A line that mdcp reads as a heading, an ATX heading at column 0, loses every marker, even inside a fenced code block or a code span. Heading slugs drop every marker from a title and skip the lines that the fence scan below reads as code. The scan ignores HTML and can misread a fence there, so stripping every heading line keeps a marker off a rendered heading even then.

To show the syntax on a heading inside a fenced example, start the heading line one to three spaces in. mdcp doesn't read that line as a heading. The strip treats it as fenced text and keeps its marker. Outside a fence the same line is prose, and its marker goes.

## stripAnchors code

On any other line, a `{#id}` inside a fenced code block or an inline code span stays.

The fence scan follows list items. A bullet or numbered list marker followed by one to four columns of whitespace opens an item whose text starts after that whitespace. A marker with no text after it opens an empty item whose text would start one column past the marker, and a blank line right after an empty item ends it. When a marker starts at or past the column where an open item's text starts, it nests in that item. The item ends at the first non-blank line that starts left of its text, unless that line continues a paragraph. Headings, fences, blockquotes, thematic breaks and list items interrupt a paragraph, and any other line continues it. In its own item, a list item interrupts a paragraph only when it has text and, if numbered, starts at 1.

The container of a fence is the column where the innermost open item's text starts, or column 0 outside any item. Three or more backticks or tildes open a fence where they start a line's text less than four columns past the container, or right after a list marker. Tabs advance to the next multiple of four columns, and a backtick fence's info string can't hold a backtick.

A run of the same character, at least as long and with nothing after it, closes the fence when it starts less than four columns past the container. A non-blank line that starts left of the container ends the fence along with its list item. A fence with no closer runs to the end of the text unless its list item ends first.

Code spans are paired within each line. A run of backticks opens a span that the next run of the same length closes.

## stripAnchors limits

The fence scan doesn't read blockquotes or HTML. It misses a fence behind `>`. It also doesn't let a line continue a quoted paragraph, so an unindented line right after a quote in a list item ends the item. A fence line inside an HTML comment or HTML block opens or closes a fence like any other. Indented code blocks aren't fences either. The strip reads their lines as prose, and a marker there goes unless it's inside a code span on its line.

The scan doesn't open an item for a list marker followed by five or more columns of whitespace. CommonMark opens one there whose first line is indented code, so a fence in that item can run past the line where CommonMark ends it.

Because code spans are paired within each line, a span that wraps onto the line, or a backslash-escaped backtick before it, can shift the pairing. A shifted pairing can drop a quoted marker or keep a prose one.
