import { createCodeFenceScanner, parseHeading, stripPandocAnchors } from '../markdown/index.js';

const BACKTICK = '`';

function stripMarkers(text: string): string {
  return stripPandocAnchors(text, { trimPrecedingWhitespace: true });
}

/**
 * Strip markers from one line outside its inline code spans. As in CommonMark, a run of n
 * backticks opens a span that the next run of exactly n backticks closes, and a run with no such
 * closer is literal text. A backslash before a backtick gets no special treatment. One backward
 * pass finds every run's closer, so the line is read a fixed number of times however its backtick
 * runs are arranged.
 */
function stripOutsideCodeSpans(line: string): string {
  const starts: number[] = [];
  const lengths: number[] = [];
  let i = 0;
  while (i < line.length) {
    if (line[i] !== BACKTICK) {
      i++;
      continue;
    }
    const start = i;
    while (i < line.length && line[i] === BACKTICK) i++;
    starts.push(start);
    lengths.push(i - start);
  }
  if (starts.length < 2) return stripMarkers(line);

  // closer[r]: the next run after r with the same length, or -1 when none follows.
  const closer = new Array<number>(starts.length);
  const nextRunOfLength = new Map<number, number>();
  for (let r = starts.length - 1; r >= 0; r--) {
    closer[r] = nextRunOfLength.get(lengths[r]) ?? -1;
    nextRunOfLength.set(lengths[r], r);
  }

  let out = '';
  let proseStart = 0;
  for (let r = 0; r < starts.length; r++) {
    const c = closer[r];
    if (c === -1) continue;
    const spanEnd = starts[c] + lengths[c];
    out += stripMarkers(line.slice(proseStart, starts[r])) + line.slice(starts[r], spanEnd);
    proseStart = spanEnd;
    r = c;
  }
  return out + stripMarkers(line.slice(proseStart));
}

/**
 * Strip one line that is not a heading. A marker that opens the line's text goes with the
 * whitespace after it, and the line keeps its own indent. Otherwise the text after the marker
 * would start the line with that whitespace, and four columns of it make an indented code block.
 */
function stripProseLine(line: string): string {
  const indent = leadingBlanks(line);
  const text = line.slice(indent);
  const stripped = stripOutsideCodeSpans(text);
  const markerOpened = text.startsWith('{#') && !stripped.startsWith('{#');
  return (
    line.slice(0, indent) + (markerOpened ? stripped.slice(leadingBlanks(stripped)) : stripped)
  );
}

/** Number of spaces and tabs at the start of `text`. */
function leadingBlanks(text: string): number {
  let i = 0;
  while (i < text.length && (text[i] === ' ' || text[i] === '\t')) i++;
  return i;
}

/**
 * Remove Pandoc-style `{#id}` markers from compiled output, along with the whitespace before each
 * one on the same line. A marker that opens a line's text goes with the whitespace after it
 * instead, and the line keeps its indent. A line that held only a marker is dropped, and when that
 * line opens the text or follows a blank line, the blank line right after it goes too.
 *
 * A line that parses as an ATX heading at column 0 loses every marker, even inside a fenced code
 * block or a code span. Slug code removes every marker from such a line's title and does not skip
 * fences, so the compiled heading gives the slug that refs and rewritten links use, however a
 * fence is read. On any other line, a marker inside a fenced code block or an inline code span
 * stays as example syntax. The markdown helpers' fence scanner finds the fences: it sees fences
 * indented at most three columns, or opened right after a list marker, and it tracks no
 * blockquotes or HTML. Code spans are paired within each line, with no backslash escapes, so a
 * span that wraps onto the line, or an escaped backtick before it, can shift the pairing. A
 * shifted pairing can drop a quoted marker or keep a prose one.
 */
export function stripExplicitAnchorMarkers(markdown: string): string {
  if (markdown.indexOf('{#') === -1) return markdown;
  const inFence = createCodeFenceScanner();
  const out: string[] = [];
  // Set after dropping a marker-only line that opened the document or followed a blank line, so a
  // blank line right after it goes too and the blank run stays one line long.
  let skipBlank = false;
  for (const line of markdown.split('\n')) {
    const fenced = inFence(line);
    const afterDrop = skipBlank;
    skipBlank = false;
    const heading = parseHeading(line) !== null;
    if ((fenced && !heading) || line.indexOf('{#') === -1) {
      if (!(afterDrop && line.trim() === '')) out.push(line);
      continue;
    }
    const stripped = heading ? stripMarkers(line) : stripProseLine(line);
    if (stripped.trim() !== '') {
      out.push(stripped);
      continue;
    }
    // A line left blank by the strip would split a paragraph or end a table, so drop it.
    skipBlank = out.length === 0 || out[out.length - 1].trim() === '';
  }
  return out.join('\n');
}
