# stripAnchors

<!-- mdcp-paths: illustrative -->

Specification for the `stripAnchors` compile hook. Tests in `packages/mdcp-core/test/anchors.test.ts` map to the sections below (docs first, then TDD).

## stripAnchors purpose

The hook removes `{#id}` anchor markers from each shard body. With `compile.stripAnchors` (default `true`), the same strip runs once more on the stitched guide.

A marker goes with the whitespace before it on the same line. When a marker opens a line's text, the whitespace after it goes instead, and the line keeps its indent. The strip drops a line that contains only a marker, and when that line opens the text or follows a blank line, the blank line right after it goes too.

## stripAnchors heading lines

A line that mdcp reads as a heading, an ATX heading at column 0, loses every marker, even inside a fenced code block or a code span. Heading slugs drop every marker from a title and skip the lines that the [fence scan](../../features/compile-pipeline/fence-scan.md) reads as code. The scan ignores HTML and can misread a fence there, so stripping every heading line keeps a marker off a rendered heading even then.

To show the syntax on a heading inside a fenced example, start the heading line one to three spaces in. mdcp doesn't read that line as a heading. The strip treats it as fenced text and keeps its marker. Outside a fence the same line is prose, and its marker goes.

## stripAnchors code

On any other line, a `{#id}` inside a fenced code block or an inline code span stays. The hook finds both with the [fence scan](../../features/compile-pipeline/fence-scan.md).

## stripAnchors limits

The strip reads an indented code block as prose, as the fence scan does, so a marker there goes unless it's inside a code span on its line. The hook runs the scan without the blockquote text, so a fence behind `>` is prose to it too, and a marker there goes unless a code span on its line holds it. Where the [fence scan limits](../../features/compile-pipeline/fence-scan.md#fence-scan-limits) misread a fence or shift the pairing of code spans, the strip can drop a quoted marker or keep a prose one.
