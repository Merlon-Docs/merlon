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

/**
 * Index of the text after a list item marker at `start`, or -1 when no marker starts there. A
 * marker is `-`, `*`, `+`, or one to nine digits and `.` or `)`, followed by one to four columns
 * of whitespace.
 */
function listItemContent(line: string, start: number): number {
  let end = start;
  const first = line[start];
  if (first === '-' || first === '*' || first === '+') end++;
  else {
    while (end - start < 9 && isDigit(line[end])) end++;
    if (end === start || (line[end] !== '.' && line[end] !== ')')) return -1;
    end++;
  }
  const content = end + leadingWhitespace(line.slice(end));
  if (content === end) return -1;
  return columnAt(line, content) - columnAt(line, end) <= CODE_INDENT ? content : -1;
}

/**
 * Track fenced code blocks through a document, one line at a time. Call the returned function
 * with each line in order. It returns true for the opening fence, each content line and the
 * closing fence, and false for every other line.
 *
 * A fence opens on a run of three or more backticks or tildes that starts the line's text at most
 * three columns in, or that follows a list item marker which starts the line's text at most three
 * columns in. A backtick fence's info string cannot contain a backtick. The fence's container is
 * the list item's content column for a fence that opens on a marker line, and column 0 for any
 * other fence. A run of the same character, at least as long as the opener and followed only by
 * whitespace, closes the fence when it starts less than four columns past the container. A
 * non-blank line that starts left of a list item container ends that item, and the fence ends
 * with it. A fence with no closer runs to the end of the input unless its list item ends first.
 * Tabs advance to the next multiple of four columns.
 *
 * The scanner tracks no other containers, and it does not read HTML. A line indented four or more
 * columns opens no fence, so a fence in a nested list item goes unseen, and so does a fence behind
 * a blockquote's `>` marker. A fence that opens on its own line inside a list item has column 0 as
 * its container, so when the item leaves it unclosed it runs on past the item's end. A fence line
 * inside an HTML comment or an HTML block counts like any other.
 *
 * Each call reads its line a fixed number of times, with no regex.
 */
export function createCodeFenceScanner(): (line: string) => boolean {
  let fence: (Fence & { container: number }) | null = null;
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
    if (column >= CODE_INDENT) return false;
    const opened = fenceOpen(line, start);
    if (opened) {
      fence = { ...opened, container: 0 };
      return true;
    }
    const content = listItemContent(line, start);
    const inItem = content === -1 ? null : fenceOpen(line, content);
    if (!inItem) return false;
    fence = { ...inItem, container: columnAt(line, content) };
    return true;
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
