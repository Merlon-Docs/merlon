/**
 * Linear, line-oriented helpers for reading the prose of a shard (no full Markdown parse).
 * Language-agnostic: they only recognize GFM structure markers, never words.
 */

interface Fence {
  char: string;
  len: number;
}

function leadingWhitespace(line: string): number {
  let i = 0;
  while (i < line.length && (line[i] === ' ' || line[i] === '\t')) i++;
  return i;
}

function runLength(line: string, start: number, char: string): number {
  let i = start;
  while (i < line.length && line[i] === char) i++;
  return i - start;
}

/**
 * Fence opener at `start` (``` or ~~~, three or more). By default `start` is the line's first
 * non-blank character at any indent, so maskNonProse also masks fences in nested list items.
 */
function fenceOpen(line: string, start = leadingWhitespace(line)): Fence | null {
  const char = line[start];
  if (char !== '`' && char !== '~') return null;
  const len = runLength(line, start, char);
  if (len < 3) return null;
  // GFM: a backtick fence's info string cannot contain a backtick (that is inline code).
  if (char === '`' && line.indexOf('`', start + len) !== -1) return null;
  return { char, len };
}

function isFenceClose(line: string, fence: Fence, start = leadingWhitespace(line)): boolean {
  const len = runLength(line, start, fence.char);
  if (len < fence.len) return false;
  return line.slice(start + len).trim() === '';
}

/** Columns of indentation, past a fence's container, that make a line indented code. */
const CODE_INDENT = 4;

/** Column of index `to` in `line`. A tab advances to the next multiple of four. */
function columnAt(line: string, to: number): number {
  let column = 0;
  for (let i = 0; i < to; i++) column = line[i] === '\t' ? column + 4 - (column % 4) : column + 1;
  return column;
}

function isDigit(ch: string | undefined): boolean {
  return ch !== undefined && ch >= '0' && ch <= '9';
}

/** Column after `char` at `column`. A tab advances to the next multiple of four. */
function advance(char: string, column: number): number {
  return char === '\t' ? column + 4 - (column % 4) : column + 1;
}

/** True when nothing but a line ending follows index `i`, which ends a whitespace run. */
function restIsBlank(line: string, i: number): boolean {
  return i === line.length || (i === line.length - 1 && line[i] === '\r');
}

/** Where a list item's text starts: its index in the line and its column. */
interface ItemContent {
  index: number;
  column: number;
}

/**
 * The text after a list item marker at `start`, which sits at `column`, or null when no marker
 * starts there. A marker is `-`, `*`, `+`, or one to nine digits and `.` or `)`, followed by one
 * to four columns of whitespace or by the end of the line. An item with no text has its content
 * one column past the marker.
 */
function listItemContent(line: string, start: number, column: number): ItemContent | null {
  let end = start;
  const first = line[start];
  if (first === '-' || first === '*' || first === '+') end++;
  else {
    while (end - start < 9 && isDigit(line[end])) end++;
    if (end === start || (line[end] !== '.' && line[end] !== ')')) return null;
    end++;
  }
  const markerEnd = column + (end - start);
  let index = end;
  let contentColumn = markerEnd;
  while (index < line.length && (line[index] === ' ' || line[index] === '\t')) {
    contentColumn = advance(line[index], contentColumn);
    index++;
  }
  if (restIsBlank(line, index)) return { index, column: markerEnd + 1 };
  if (index === end) return null;
  return contentColumn - markerEnd <= CODE_INDENT ? { index, column: contentColumn } : null;
}

/** A thematic break: three or more of one of `-`, `*` or `_`, with only spaces or tabs between. */
function isThematicBreak(line: string, start: number): boolean {
  const char = line[start];
  if (char !== '-' && char !== '*' && char !== '_') return false;
  let count = 0;
  for (let i = start; i < line.length; i++) {
    if (line[i] === char) count++;
    else if (line[i] !== ' ' && line[i] !== '\t' && line[i] !== '\r') return false;
  }
  return count >= 3;
}

/** A setext underline: a run of `=` or `-`, then only whitespace. */
function isSetextUnderline(line: string, start: number): boolean {
  const char = line[start];
  if (char !== '=' && char !== '-') return false;
  return line.slice(start + runLength(line, start, char)).trim() === '';
}

/** An ATX heading opener: one to six `#`, then whitespace or the end of the line. */
function isAtxOpener(line: string, start: number): boolean {
  const len = runLength(line, start, '#');
  const next = line[start + len];
  return len >= 1 && len <= 6 && (next === undefined || next === ' ' || next === '\t');
}

/**
 * True when the text at `start`, at `column`, opens a block that can interrupt a paragraph: an
 * ATX heading, a fence, a blockquote, a thematic break, or a list item that has text and, when
 * ordered, starts at 1.
 */
function interruptsParagraph(line: string, start: number, column: number): boolean {
  const char = line[start];
  if (char === '>' || isAtxOpener(line, start) || fenceOpen(line, start)) return true;
  if (isThematicBreak(line, start)) return true;
  const content = listItemContent(line, start, column);
  if (!content || restIsBlank(line, content.index)) return false;
  if (char === '-' || char === '*' || char === '+') return true;
  return char === '1' && !isDigit(line[start + 1]);
}

/** Content column of the innermost item in `items` that holds a line at `column`, else 0. */
function containerAt(items: number[], column: number): number {
  let low = 0;
  let high = items.length;
  while (low < high) {
    const mid = (low + high) >> 1;
    if (items[mid] <= column) low = mid + 1;
    else high = mid;
  }
  return low === 0 ? 0 : items[low - 1];
}

/**
 * Track fenced code blocks through a document, one line at a time. Call the returned function
 * with each line in order. It returns true for the opening fence, each content line and the
 * closing fence, and false for every other line.
 *
 * The scanner follows list items. A list item marker (`-`, `*`, `+`, or one to nine digits and
 * `.` or `)`, then one to four columns of whitespace) opens an item whose content starts after
 * that whitespace, and a marker right after another one opens an item inside it. A marker with
 * no text after it opens an empty item whose content starts one column past the marker, and a
 * blank line right after an empty item ends it. A marker nests in an open item when it starts at
 * or past that item's content column. A non-blank line that starts left of an item's content
 * column ends the item, unless it continues a paragraph.
 *
 * A paragraph continues on any line that doesn't open a heading, a fence, a blockquote, a
 * thematic break or a list item less than four columns past its container. A list item
 * interrupts a paragraph in its own container only when it has text and, if ordered, starts at
 * 1. Left of the paragraph's item, any list item marker starts a new item.
 *
 * A fence's container is the content column of the innermost open item, or column 0 outside any
 * item. A fence opens on a run of three or more backticks or tildes that starts the line's text
 * less than four columns past the container, or that follows a list item marker. A backtick
 * fence's info string cannot contain a backtick. A run of the same character, at least as long as
 * the opener and followed only by whitespace, closes the fence when it starts less than four
 * columns past the container. A line that starts left of the container ends the fence's list
 * item and the fence, and it can open the next fence. A fence with no closer runs to the end of
 * the input unless its list item ends first. Tabs advance to the next multiple of four columns.
 *
 * The scanner reads no blockquotes and no HTML. A fence behind a blockquote's `>` marker goes
 * unseen, a quoted line leaves no paragraph for the next line to continue, and a fence line
 * inside an HTML comment or an HTML block counts like any other. A list item marker followed by
 * five or more columns of whitespace doesn't open an item, though CommonMark opens one whose first
 * line is indented code.
 *
 * Each call reads its line a fixed number of times, with no regex.
 */
export function createCodeFenceScanner(): (line: string) => boolean {
  let fence: (Fence & { container: number }) | null = null;
  // Content columns of the open list items, innermost last.
  const items: number[] = [];
  // The previous line was paragraph text, so this line may continue it.
  let paragraph = false;
  // The previous line opened a list item with no text, which a blank line ends.
  let emptyItem = false;
  return (line) => {
    const start = leadingWhitespace(line);
    const column = columnAt(line, start);
    if (fence) {
      if (column >= fence.container || line.slice(start).trim() === '') {
        const close = column - fence.container < CODE_INDENT && isFenceClose(line, fence, start);
        if (close) fence = null;
        return true;
      }
      // The line ends the list item that holds the fence, so the fence ends too.
      fence = null;
    }
    if (line.slice(start).trim() === '') {
      if (emptyItem) items.pop();
      emptyItem = false;
      paragraph = false;
      return false;
    }
    emptyItem = false;
    if (paragraph) {
      // Left of the innermost item's content, the line is outside the paragraph's item.
      const lazy = items.length > 0 && column < items[items.length - 1];
      const indented = column - containerAt(items, column) >= CODE_INDENT;
      const opens =
        !indented &&
        (interruptsParagraph(line, start, column) ||
          (lazy && listItemContent(line, start, column) !== null));
      if (!opens) {
        // A setext underline in the paragraph's own item turns the paragraph into a heading.
        if (!lazy && !indented && isSetextUnderline(line, start)) paragraph = false;
        return false;
      }
    }
    while (items.length > 0 && column < items[items.length - 1]) items.pop();
    const container = items.length > 0 ? items[items.length - 1] : 0;
    paragraph = false;
    if (column - container >= CODE_INDENT) return false;
    const opened = fenceOpen(line, start);
    if (opened) {
      fence = { ...opened, container };
      return true;
    }
    if (isThematicBreak(line, start) || isAtxOpener(line, start)) return false;
    let content: ItemContent = { index: start, column };
    for (let next = listItemContent(line, start, column); next;) {
      content = next;
      items.push(next.column);
      next = listItemContent(line, next.index, next.column);
    }
    const inItem = content.index === start ? null : fenceOpen(line, content.index);
    if (inItem) {
      fence = { ...inItem, container: content.column };
      return true;
    }
    const text = content.index;
    if (restIsBlank(line, text)) {
      // A list item with no text holds no paragraph yet.
      emptyItem = true;
      return false;
    }
    // The scanner doesn't read blockquotes, so a quoted line leaves no paragraph to continue.
    paragraph = line[text] !== '>' && !isAtxOpener(line, text) && !isThematicBreak(line, text);
    return false;
  };
}

/** Remove `<!-- … -->` spans from one line; `open` carries a comment across lines. */
function stripComments(line: string, open: boolean): { text: string; open: boolean } {
  let out = '';
  let i = 0;
  let inComment = open;
  while (i < line.length) {
    if (inComment) {
      const close = line.indexOf('-->', i);
      if (close === -1) return { text: out, open: true };
      i = close + 3;
      inComment = false;
      continue;
    }
    const start = line.indexOf('<!--', i);
    if (start === -1) {
      out += line.slice(i);
      break;
    }
    out += line.slice(i, start);
    i = start + 4;
    inComment = true;
  }
  return { text: out, open: inComment };
}

/**
 * Return one entry per input line with non-prose regions blanked: leading YAML front matter,
 * fenced code blocks (fence lines included), and HTML comments. Line numbers are preserved
 * (index + 1), and a blanked line acts as a paragraph break.
 */
export function maskNonProse(markdown: string): string[] {
  const lines = markdown.split('\n').map((l) => (l.endsWith('\r') ? l.slice(0, -1) : l));
  const out: string[] = new Array<string>(lines.length).fill('');
  let i = 0;

  if (lines.length > 0 && lines[0].trimEnd() === '---') {
    for (let j = 1; j < lines.length; j++) {
      const t = lines[j].trimEnd();
      if (t === '---' || t === '...') {
        i = j + 1;
        break;
      }
    }
  }

  let fence: Fence | null = null;
  let inComment = false;
  for (; i < lines.length; i++) {
    const line = lines[i];
    if (fence) {
      if (isFenceClose(line, fence)) fence = null;
      continue;
    }
    if (!inComment) {
      const opened = fenceOpen(line);
      if (opened) {
        fence = opened;
        continue;
      }
    }
    const stripped = stripComments(line, inComment);
    inComment = stripped.open;
    out[i] = stripped.text;
  }
  return out;
}

/** Skip a balanced bracket group starting at `open` (index of `(` or `[`); returns index after it. */
function skipGroup(text: string, open: number, openChar: string, closeChar: string): number {
  let depth = 0;
  for (let i = open; i < text.length; i++) {
    if (text[i] === openChar) depth++;
    else if (text[i] === closeChar) {
      depth--;
      if (depth === 0) return i + 1;
    }
  }
  return text.length;
}

const EMPHASIS_CHARS = new Set(['*', '_', '`', '~']);

/**
 * Inline Markdown to comparable plain text: keep link and image text, drop link targets
 * (`[text](target)`, `[text][ref]`), and drop emphasis / code markers and brackets.
 */
export function inlineToPlain(text: string): string {
  let out = '';
  let i = 0;
  while (i < text.length) {
    const ch = text[i];
    if (ch === ']' && text[i + 1] === '(') {
      i = skipGroup(text, i + 1, '(', ')');
      continue;
    }
    if (ch === ']' && text[i + 1] === '[') {
      i = skipGroup(text, i + 1, '[', ']');
      continue;
    }
    if (ch === '!' && text[i + 1] === '[') {
      i++;
      continue;
    }
    if (ch === '[' || ch === ']' || EMPHASIS_CHARS.has(ch)) {
      i++;
      continue;
    }
    out += ch;
    i++;
  }
  return out;
}

/** Length of a list-item marker (`- `, `* `, `+ `, `1. `, `1) `) at the start of `trimmed`, else 0. */
export function listMarkerLength(trimmed: string): number {
  const first = trimmed[0];
  if ((first === '-' || first === '*' || first === '+') && trimmed[1] === ' ') return 2;
  let i = 0;
  while (i < trimmed.length && i < 9 && trimmed[i] >= '0' && trimmed[i] <= '9') i++;
  if (i === 0) return 0;
  if ((trimmed[i] === '.' || trimmed[i] === ')') && trimmed[i + 1] === ' ') return i + 2;
  return 0;
}

/** Strip leading blockquote markers (`>`), then an optional list-item marker. */
export function stripBlockMarkers(line: string): string {
  let t = line.trimStart();
  while (t.startsWith('>')) t = t.slice(1).trimStart();
  const marker = listMarkerLength(t);
  return marker > 0 ? t.slice(marker) : t;
}

const WORDISH = /[\p{L}\p{N}]/u;

/** Whitespace-separated tokens that contain at least one letter or digit. */
export function countWords(text: string): number {
  let n = 0;
  for (const token of text.split(/\s+/)) {
    if (token && WORDISH.test(token)) n++;
  }
  return n;
}
