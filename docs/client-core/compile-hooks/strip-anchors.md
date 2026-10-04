# stripAnchors

<!-- mdcp-paths: illustrative -->

Specification for the `stripAnchors` compile hook. Tests in `packages/mdcp-core/test/anchors.test.ts` map to the sections below (docs first, then TDD).

## stripAnchors purpose

The hook removes `{#id}` anchor markers from each shard body. With `compile.stripAnchors` (default `true`), the same strip runs once more on the stitched guide.

A marker goes with the whitespace before it on the same line. When a marker opens a line's text, the whitespace after it goes instead, and the line keeps its indent. The strip drops a line that contains only a marker, and when that line opens the text or follows a blank line, the blank line right after it goes too.

## stripAnchors heading lines

A line that mdcp reads as a heading, an ATX heading at column 0, loses every marker, even inside a fenced code block or a code span. Heading slugs drop every marker from a title and don't skip fences. Stripping the whole line keeps the compiled heading on the slug that refs and link rewriting use.

To show the syntax on a heading inside a fenced example, start the heading line one to three spaces in. mdcp doesn't read that line as a heading. The strip treats it as fenced text and keeps its marker. Outside a fence the same line is prose, and its marker goes.

## stripAnchors code

On any other line, a `{#id}` inside a fenced code block or an inline code span stays.

A fence opens where three or more backticks or tildes start a line's text at most three columns in. It also opens on a list marker line, where the run follows the marker and one to four columns of whitespace, and the marker starts at most three columns in. A tab advances to the next multiple of four columns, and a backtick fence's info string can't hold a backtick.

A run of the same character, at least as long and with nothing after it, closes the fence when it starts less than four columns past the fence's container. For a fence that opens on a marker line, the container is the column where the item's text starts, and the fence also ends at the first non-blank line that starts left of it. For any other fence the container is column 0. A fence with no closer runs to the end of the text unless its list item ends first.

Code spans are paired within each line. A run of backticks opens a span that the next run of the same length closes.

## stripAnchors limits

The fence scan doesn't read blockquotes or HTML. It misses a fence behind `>`, and it misses one indented four or more columns, as in a nested list item. Indented code blocks aren't fences either. The strip reads their lines as prose, and a marker there goes unless it's inside a code span on its line. A fence that opens on its own line inside a list item and stays unclosed runs on past the item's end. A fence line inside an HTML comment or HTML block opens or closes a fence like any other.

Because code spans are paired within each line, a span that wraps onto the line, or a backslash-escaped backtick before it, can shift the pairing. A shifted pairing can drop a quoted marker or keep a prose one.
