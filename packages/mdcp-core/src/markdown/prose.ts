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

/** Fence opener (``` or ~~~, three or more, any indent so list-nested fences count). */
function fenceOpen(line: string): Fence | null {
  const start = leadingWhitespace(line);
  const char = line[start];
  if (char !== '`' && char !== '~') return null;
  const len = runLength(line, start, char);
  if (len < 3) return null;
  // GFM: a backtick fence's info string cannot contain a backtick (that is inline code).
  if (char === '`' && line.indexOf('`', start + len) !== -1) return null;
  return { char, len };
}

function isFenceClose(line: string, fence: Fence): boolean {
  const start = leadingWhitespace(line);
  const len = runLength(line, start, fence.char);
  if (len < fence.len) return false;
  return line.slice(start + len).trim() === '';
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
