import { maskInlineCode } from '../links/extract.js';
import { getLocalePack, type LocalePack } from '../locale/index.js';
import { createCodeFenceScanner, displayWidth, listMarkerLength } from '../markdown/index.js';

type Alignment = 'none' | 'left' | 'right' | 'center';

/** A table row that starts and ends with a pipe. */
interface Row {
  /** The spaces and blockquote markers before the leading pipe, and a header row's list markers. */
  prefix: string;
  /** The prefix with each list marker as spaces, which the rows under a header row take. */
  indent: string;
  /** Each cell as written between two pipes, padding included. */
  cells: string[];
  /** `\r` when the line ends with one, else empty. */
  eol: string;
}

export interface RealignTablesOptions {
  /** Locale of the broken-link markers in `markdown` (defaults to en-US). */
  locale?: LocalePack;
}

const DELIMITER_CELL = /^:?-+:?$/;

/** A line of spaces and blockquote markers alone, which ends a table as a blank line does. */
const BLANK_LINE = /^[\s>]*$/;

/**
 * The most blockquotes a table compile re-aligns can sit in. Finding the fences of each quote
 * around a table reads its lines once per quote, so the time grows with the square of the depth.
 */
const MAX_QUOTE_DEPTH = 10;

/**
 * A list item marker, an ATX heading, a blockquote marker or a thematic break, each of which ends
 * a table.
 */
const BLOCK_START =
  /^(?:(?:[-*+]|\d{1,9}[.)])(?: |$)|#{1,6}(?: |$)|>|(?:\* *){3,}$|(?:- *){3,}$|(?:_ *){3,}$)/;

/** Tag names that open an HTML block whatever follows them on the line (CommonMark 6). */
const HTML_BLOCK_NAMES =
  'address|article|aside|base|basefont|blockquote|body|caption|center|col|colgroup|dd|details|' +
  'dialog|dir|div|dl|dt|fieldset|figcaption|figure|footer|form|frame|frameset|h[1-6]|head|' +
  'header|hr|html|iframe|legend|li|link|main|menu|menuitem|nav|noframes|ol|optgroup|option|p|' +
  'param|search|section|summary|table|tbody|td|tfoot|th|thead|title|tr|track|ul';

const OPEN_TAG =
  /<[A-Za-z][A-Za-z0-9-]*(?: +[A-Za-z_:][\w.:-]*(?: *= *(?:[^ "'=<>`]+|'[^']*'|"[^"]*"))?)* *\/?>/;
const CLOSING_TAG = /<\/[A-Za-z][A-Za-z0-9-]* *>/;

/**
 * The start of an HTML block, which ends a table: a raw tag such as `<pre>`, a comment, a
 * processing instruction, a declaration, CDATA, a block-level tag, or any other complete tag alone
 * on the line (CommonMark start conditions 1 to 7).
 */
const HTML_BLOCK_START = new RegExp(
  [
    /^<(?:script|pre|style|textarea)(?:[ >]|$)/.source,
    /^<(?:!--|\?|![A-Za-z]|!\[CDATA\[)/.source,
    `^</?(?:${HTML_BLOCK_NAMES})(?:[ >]|/>|$)`,
    `^(?:${OPEN_TAG.source}|${CLOSING_TAG.source}) *$`,
  ].join('|'),
  'i',
);

/**
 * The spaces, blockquote markers and, with `markers`, list item markers that start `text`: where
 * they end, and the indent they give the lines under them, with each list marker as spaces.
 */
function scanPrefix(text: string, markers: boolean): { end: number; indent: string } {
  let end = 0;
  let indent = '';
  while (end < text.length) {
    if (text[end] === ' ' || text[end] === '>') {
      indent += text[end++];
      continue;
    }
    // A marker is at most nine digits, then `.` or `)`, then a space.
    const marker = markers ? listMarkerLength(text.slice(end, end + 11)) : 0;
    if (marker === 0) break;
    indent += ' '.repeat(marker);
    end += marker;
  }
  return { end, indent };
}

/**
 * Split a line at its unescaped pipes. Null unless the line is spaces and blockquote markers, then
 * a pipe, then cells, ending with a pipe. With `markers`, for a header row, list item markers can
 * come before the pipe too, since a table can open a list item. A backslash escapes the character
 * after it, so `\|` stays in its cell, in a code span or out of one. A line with a tab is never a
 * row, since its width depends on the tab stops.
 */
function parseRow(line: string, markers = false): Row | null {
  const eol = line.endsWith('\r') ? '\r' : '';
  const text = eol ? line.slice(0, -1) : line;
  if (text.includes('\t')) return null;
  const { end: start, indent } = scanPrefix(text, markers);
  if (text[start] !== '|') return null;
  const pipes: number[] = [];
  for (let i = start; i < text.length; i++) {
    if (text[i] === '\\') i++;
    else if (text[i] === '|') pipes.push(i);
  }
  if (pipes.length < 2 || pipes[pipes.length - 1] !== text.length - 1) return null;
  const cells: string[] = [];
  for (let k = 1; k < pipes.length; k++) cells.push(text.slice(pipes[k - 1] + 1, pipes[k]));
  return { prefix: text.slice(0, start), indent, cells, eol };
}

/**
 * Split a line at its unescaped pipes as GFM reads a table row, with the pipe at either end
 * optional. Null when the line has no unescaped pipe. This only finds where a table starts and
 * ends, so a tab counts as a space and trailing spaces don't count. With `markers`, the row can
 * start on the line of a list marker.
 */
function readRow(line: string, markers = false): Row | null {
  const text = line.replaceAll('\t', ' ').trimEnd();
  const { end: start, indent } = scanPrefix(text, markers);
  const bounds = [start - 1];
  for (let i = start; i < text.length; i++) {
    if (text[i] === '\\') i++;
    else if (text[i] === '|') bounds.push(i);
  }
  if (bounds.length === 1) return null;
  const lastPipe = bounds[bounds.length - 1];
  bounds.push(text.length);
  const cells: string[] = [];
  for (let k = 1; k < bounds.length; k++) cells.push(text.slice(bounds[k - 1] + 1, bounds[k]));
  if (text[start] === '|') cells.shift();
  if (lastPipe === text.length - 1) cells.pop();
  return { prefix: text.slice(0, start), indent, cells, eol: '' };
}

/**
 * The text of `line` inside its first `depth` blockquote markers, or null when it has fewer. Each
 * marker is a `>` after any spaces, and the one space after it belongs to the marker. With
 * `markers`, list item markers can come before each `>` too, as when a list item opens with a
 * blockquote.
 */
function quotedText(line: string, depth: number, markers = false): string | null {
  let i = 0;
  for (let level = 0; level < depth; level++) {
    for (;;) {
      while (line[i] === ' ') i++;
      const marker = markers ? listMarkerLength(line.slice(i, i + 11)) : 0;
      if (marker === 0) break;
      i += marker;
    }
    if (line[i] !== '>') return null;
    i += line[i + 1] === ' ' ? 2 : 1;
  }
  return line.slice(i);
}

/**
 * True when `line` ends a table whose rows sit inside `depth` blockquote markers and `indent`
 * spaces past them. That is a line that leaves one of those blockquotes, or a line that opens a
 * list item, a heading, a blockquote, a thematic break or an HTML block and is indented no more
 * than the rows. A blank line or a fence ends a table too. GFM reads most other lines as rows.
 */
function endsTable(line: string, depth: number, indent: number): boolean {
  const text = quotedText(line.endsWith('\r') ? line.slice(0, -1) : line, depth);
  if (text === null) return true;
  let start = 0;
  while (text[start] === ' ') start++;
  const rest = text.slice(start);
  return start <= indent && (BLOCK_START.test(rest) || HTML_BLOCK_START.test(rest));
}

/**
 * True when the header row may continue the paragraph on the line above it lazily, from outside
 * that paragraph's blockquote or list item, where GFM reads no table. That is a header row that
 * opens no list item and sits in fewer blockquotes than the line above, or in as many and indented
 * less than the text of the line above.
 */
function mayBeLazy(header: Row, above: string | undefined): boolean {
  if (above === undefined || BLANK_LINE.test(above) || header.prefix !== header.indent) {
    return false;
  }
  const aboveIndent = scanPrefix(above, true).indent;
  const quotes = (indent: string) => indent.split('>').length - 1;
  const depth = quotes(header.indent);
  if (depth !== quotes(aboveIndent)) return depth < quotes(aboveIndent);
  const inner = (indent: string) => (quotedText(indent, depth) ?? '').length;
  return inner(header.indent) < inner(aboveIndent);
}

/** True when the row has cells and each is dashes, with a colon at either end or both. */
function isDelimiterRow(row: Row | null): row is Row {
  return (
    row !== null &&
    row.cells.length > 0 &&
    row.cells.every((cell) => DELIMITER_CELL.test(trimSpaces(cell)))
  );
}

/**
 * The indentation of the rows of the table that `line` starts as its delimiter row under the
 * header row `header`, or -1 when the two rows start no table. The rows must have one indentation
 * and as many cells. A table in a blockquote counts only for the scanner of that blockquote's text.
 */
function tableRowIndent(header: string | undefined, line: string): number {
  // A delimiter row starts with a pipe, a colon or a dash, so it sits in no further blockquote.
  let start = 0;
  while (line[start] === ' ' || line[start] === '\t') start++;
  const first = line[start];
  if (first !== '|' && first !== ':' && first !== '-') return -1;
  if (header === undefined || BLANK_LINE.test(header)) return -1;
  const delimiter = readRow(line);
  if (!isDelimiterRow(delimiter)) return -1;
  const head = readRow(header, true);
  if (!head || head.indent !== delimiter.prefix || head.cells.length !== delimiter.cells.length) {
    return -1;
  }
  return delimiter.prefix.length;
}

/**
 * The code fence scanner, told where each table ends. The scanner reads a table as a paragraph,
 * and a list item that starts past 1 or has no text can't interrupt a paragraph. Any list item ends
 * a table, so a fence in such an item opens. This feeds the scanner a blank line before the line
 * that ends a table, which ends the paragraph the scanner read.
 */
function createFenceScanner(): (line: string) => boolean {
  const inFence = createCodeFenceScanner();
  // The line before this one, while it is outside fenced code.
  let above: string | undefined;
  // The indentation of the rows of the table that the line above is in, or -1 outside a table.
  let rowIndent = -1;
  return (line) => {
    const ends = rowIndent >= 0 && endsTable(line, 0, rowIndent);
    if (ends) inFence('');
    const fenced = inFence(line);
    if (fenced || ends || BLANK_LINE.test(line)) rowIndent = -1;
    else if (rowIndent < 0) rowIndent = tableRowIndent(above, line);
    above = fenced ? undefined : line;
    return fenced;
  };
}

/**
 * For each line, whether it is fenced code inside a blockquote `depth` deep. The code fence scanner
 * reads no blockquotes, so this feeds it the text of each such blockquote alone, from the quote's
 * first line, and starts a new scanner for the next quote. A list item marker before one of the
 * line's quote markers opens a new quote on that line, so a fence can open there too, as in
 * `- > ```sh`.
 */
function fencesInQuotes(lines: string[], depth: number): boolean[] {
  let inFence: ((line: string) => boolean) | null = null;
  return lines.map((line) => {
    const text = quotedText(line, depth, true);
    if (text === null || quotedText(line, depth) === null) inFence = null;
    if (text === null) return false;
    inFence ??= createFenceScanner();
    return inFence(text);
  });
}

function trimSpaces(cell: string): string {
  let start = 0;
  let end = cell.length;
  while (start < end && cell[start] === ' ') start++;
  while (end > start && cell[end - 1] === ' ') end--;
  return cell.slice(start, end);
}

function alignmentOf(cell: string): Alignment {
  const left = cell.startsWith(':');
  const right = cell.endsWith(':');
  if (left && right) return 'center';
  if (left) return 'left';
  return right ? 'right' : 'none';
}

/** More than one space between the cell's text and a pipe, which a compact table never has. */
function padsPastOneSpace(cell: string): boolean {
  const text = trimSpaces(cell);
  if (text === '') return cell.length > 1;
  return cell.indexOf(text) > 1 || cell.length - cell.indexOf(text) - text.length > 1;
}

/** A cell whose width compile can change: it holds a link, or the marker that replaced one. */
function compileCanChange(cell: string, locale: LocalePack): boolean {
  return maskInlineCode(cell).includes('](') || locale.brokenLinks.lineHasMarker(cell);
}

/**
 * True when the shard aligned the table and compile moved its pipes. The delimiter row holds no
 * link, so it keeps the width the shard gave each column. Every cell compile can't change must
 * still span that width, some cell compile changed must not, and some cell must pad its text with
 * more than one space, which tells an aligned table from a compact one.
 */
function needsRealigning(rows: Row[], delimiter: Row, locale: LocalePack): boolean {
  const columnWidths = delimiter.cells.map(displayWidth);
  let moved = false;
  let padded = false;
  for (const row of rows) {
    for (let i = 0; i < row.cells.length; i++) {
      const cell = row.cells[i];
      if (padsPastOneSpace(cell)) padded = true;
      if (displayWidth(cell) === columnWidths[i]) continue;
      if (!compileCanChange(cell, locale)) return false;
      moved = true;
    }
  }
  return moved && padded;
}

/**
 * The table as Prettier prints it with `proseWrap` at `preserve`: each column as wide as its widest
 * cell, three at least.
 */
function formatTable(header: Row, delimiter: Row, body: Row[]): string[] {
  const alignments = delimiter.cells.map((cell) => alignmentOf(trimSpaces(cell)));
  const texts = [header, ...body].map((row) => row.cells.map(trimSpaces));
  const widths = alignments.map(() => 3);
  for (const cells of texts) {
    cells.forEach((text, i) => (widths[i] = Math.max(widths[i], displayWidth(text))));
  }

  const pad = (text: string, i: number): string => {
    const spaces = widths[i] - displayWidth(text);
    const before =
      alignments[i] === 'right' ? spaces : alignments[i] === 'center' ? spaces >> 1 : 0;
    return ' '.repeat(before) + text + ' '.repeat(spaces - before);
  };
  const line = (row: Row, cells: string[]) => `${row.prefix}| ${cells.join(' | ')} |${row.eol}`;

  const rule = alignments.map((alignment, i) => {
    const first = alignment === 'left' || alignment === 'center' ? ':' : '-';
    const last = alignment === 'right' || alignment === 'center' ? ':' : '-';
    return first + '-'.repeat(widths[i] - 2) + last;
  });
  const [headerTexts, ...bodyTexts] = texts;
  return [
    line(header, headerTexts.map(pad)),
    line(delimiter, rule),
    ...body.map((row, r) => line(row, bodyTexts[r].map(pad))),
  ];
}

/**
 * Re-align each GFM table that the shard aligned and compile misaligned by rewriting its links
 * or marking them broken, and print it as Prettier does. A compact or tight table stays as it is,
 * and so does an aligned one. Only a table whose rows start and end with a pipe, after the same
 * indentation and blockquote markers, is read, so one in a list item or a blockquote keeps them.
 * Its header row can also start on the line of a list marker. The table ends at a blank line, a
 * fence, or a line that leaves its blockquote or opens another block. A table in fenced code is
 * never touched, in a blockquote or out of one, and neither is a table in more than ten
 * blockquotes. Prettier prints a table this way unless `proseWrap` is `never` and the table
 * outgrows `printWidth`, which makes Prettier print it compact.
 */
export function realignTables(markdown: string, options: RealignTablesOptions = {}): string {
  if (!markdown.includes('|')) return markdown;
  const locale = options.locale ?? getLocalePack();
  const lines = markdown.split('\n');
  const inFence = createFenceScanner();
  const fenced = lines.map((line) => inFence(line));
  // Fenced code inside blockquotes, by quote depth, read once for each depth a table needs.
  const quoteFences = new Map<number, boolean[]>();
  const fencedInQuotes = (depth: number): boolean[] => {
    let inQuote = quoteFences.get(depth);
    if (!inQuote) quoteFences.set(depth, (inQuote = fencesInQuotes(lines, depth)));
    return inQuote;
  };

  for (let d = 1; d < lines.length; d++) {
    if (fenced[d] || fenced[d - 1]) continue;
    // A delimiter row with a tab still starts a table, and compile leaves that table as written.
    const tabbed = lines[d].includes('\t');
    const delimiter = parseRow(tabbed ? lines[d].replaceAll('\t', ' ') : lines[d]);
    if (!isDelimiterRow(delimiter)) continue;
    // A delimiter row with no line above it in its blockquote starts no table.
    if (BLANK_LINE.test(lines[d - 1])) continue;

    // In a blockquote, a fence inside that quote or an outer one counts too. Every row of a table
    // nested deeper than the cap is nested as deep, so compile reads none of them.
    const depth = delimiter.prefix.split('>').length - 1;
    if (depth > MAX_QUOTE_DEPTH) continue;
    const quoteFenced = Array.from({ length: depth }, (_, k) => fencedInQuotes(k + 1));
    const isFenced = (i: number) => fenced[i] || quoteFenced.some((inQuote) => inQuote[i]);
    if (isFenced(d - 1) || isFenced(d)) continue;

    // The table runs to the first line that ends it. Every row has to fit the delimiter row.
    const rowIndent = (quotedText(delimiter.prefix, depth) ?? '').length;
    let end = d + 1;
    while (
      end < lines.length &&
      !BLANK_LINE.test(lines[end]) &&
      !isFenced(end) &&
      !endsTable(lines[end], depth, rowIndent)
    ) {
      end++;
    }
    // A header row can start on the line of a list marker, and its indent is then the item's.
    const header = parseRow(lines[d - 1], true);
    const columns = delimiter.cells.length;
    const body = lines.slice(d + 1, end).map((line) => parseRow(line));
    const rows = body.filter(
      (row): row is Row =>
        row !== null && row.prefix === delimiter.prefix && row.cells.length <= columns,
    );
    if (
      !tabbed &&
      header &&
      header.indent === delimiter.prefix &&
      header.cells.length === columns &&
      rows.length === body.length &&
      !mayBeLazy(header, lines[d - 2]) &&
      needsRealigning([header, delimiter, ...rows], delimiter, locale)
    ) {
      // One line per row, so the lines after the table keep their indexes.
      formatTable(header, delimiter, rows).forEach((row, k) => (lines[d - 1 + k] = row));
    }
    // A delimiter row inside a table that compile leaves starts no table either, whatever the
    // reason compile leaves it.
    d = end;
  }
  return lines.join('\n');
}
