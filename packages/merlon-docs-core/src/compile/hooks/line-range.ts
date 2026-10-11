/** Linear line-range parser for code-evidence (avoid polynomial-adjacent regexes). */

import { getLocalePack } from '../../locale/index.js';
import type { LocalePack } from '../../locale/types.js';

/** Hyphen / en dash / em dash — distinct code points (legacy `[-–—]` class). */
const DASHES = new Set([
  '\u002D', // hyphen-minus '-'
  '\u2013', // en dash '–'
  '\u2014', // em dash '—'
]);

function isWs(ch: string | undefined): boolean {
  if (ch === undefined) return false;
  // Same class as /\s/ for doc text; avoid RegExp.test in hot loops.
  const code = ch.charCodeAt(0);
  return (
    code === 0x20 || // space
    code === 0x09 || // tab
    code === 0x0a || // LF
    code === 0x0d || // CR
    code === 0x0c || // form feed
    code === 0x0b || // vertical tab
    code === 0xa0 // nbsp
  );
}

function isWordChar(ch: string | undefined): boolean {
  if (ch === undefined) return false;
  const code = ch.charCodeAt(0);
  return (
    (code >= 0x30 && code <= 0x39) || // 0-9
    (code >= 0x41 && code <= 0x5a) || // A-Z
    (code >= 0x61 && code <= 0x7a) || // a-z
    code === 0x5f // _
  );
}

function isWordBoundary(text: string, index: number): boolean {
  return isWordChar(text[index - 1]) !== isWordChar(text[index]);
}

function skipWs(text: string, i: number): number {
  while (i < text.length && isWs(text[i])) i++;
  return i;
}

function readDigits(text: string, i: number): { value: string; end: number } | null {
  if (i >= text.length || text[i]! < '0' || text[i]! > '9') return null;
  const start = i;
  while (i < text.length && text[i]! >= '0' && text[i]! <= '9') i++;
  return { value: text.slice(start, i), end: i };
}

function startsIgnoreCase(text: string, i: number, literalLower: string): boolean {
  if (i + literalLower.length > text.length) return false;
  for (let k = 0; k < literalLower.length; k++) {
    const ch = text[i + k]!;
    const code = ch.charCodeAt(0);
    const lower = code >= 0x41 && code <= 0x5a ? String.fromCharCode(code + 0x20) : ch;
    if (lower !== literalLower[k]) return false;
  }
  return true;
}

/** Protocol single-letter `L` prefix (GitHub fragment shape — not locale wording). */
function matchLetterLPrefix(text: string, i: number): number | null {
  if (!startsIgnoreCase(text, i, 'l')) return null;
  // Do not treat the start of a longer word cue as bare `L` (handled via locale words).
  if (
    i + 1 < text.length &&
    isWordChar(text[i + 1]!) &&
    (text[i + 1]! < '0' || text[i + 1]! > '9')
  ) {
    return null;
  }
  return skipWs(text, i + 1);
}

function wordPrefixEnds(text: string, i: number, wordsLower: readonly string[]): number[] {
  const ends: number[] = [];
  for (const word of wordsLower) {
    if (!startsIgnoreCase(text, i, word)) continue;
    ends.push(skipWs(text, i + word.length));
  }
  return ends;
}

function lowerFirstChar(ch: string): string {
  const code = ch.charCodeAt(0);
  return code >= 0x41 && code <= 0x5a ? String.fromCharCode(code + 0x20) : ch;
}

/** True when `c` can start a digit / L / locale-word match (cheap; no slice). */
function canStartMatch(c: string, wordsLower: readonly string[]): boolean {
  if (c >= '0' && c <= '9') return true;
  if (c === 'L' || c === 'l') return true;
  const first = lowerFirstChar(c);
  for (const word of wordsLower) {
    if (word[0] === first) return true;
  }
  return false;
}

export function formatLineFragment(start: string, end?: string): string {
  if (end && end !== start) return `L${start}-L${end}`;
  return `L${start}`;
}

/**
 * Parse first line-range mention in `text` (parity with former LINE_RANGE_RE).
 * Language-neutral forms: `L6-L8`, `:10-20`, `:7`.
 * Locale word forms: from `locale.lineRangeWords` (en-US: `line` / `lines`).
 * Output is always a GitHub-style `L…` fragment (not localized).
 */
export function lineRangeFromText(
  text: string,
  locale: LocalePack = getLocalePack(),
): string | null {
  const wordsLower = locale.lineRangeWords.map((w) => w.toLowerCase());
  for (let i = 0; i < text.length; i++) {
    const c = text[i]!;
    // Skip pure whitespace / punctuation pumps without probing locale words.
    if (isWs(c)) continue;
    if (c === ':') {
      const found = tryColonRangeAt(text, i) ?? tryColonSingleAt(text, i);
      if (found) return found;
      continue;
    }
    if (!canStartMatch(c, wordsLower)) continue;
    if (!isWordBoundary(text, i)) continue;
    const found = tryDigitRangeAt(text, i, wordsLower) ?? tryPrefixedSingleAt(text, i, wordsLower);
    if (found) return found;
  }
  return null;
}

/** Optional `L` / locale words, then `\d+\s*[-–—]\s*(?:L)?\d+`. */
function tryDigitRangeAt(text: string, i: number, wordsLower: readonly string[]): string | null {
  if (!isWordBoundary(text, i)) return null;

  const prefixEnds: number[] = [];
  const lEnd = matchLetterLPrefix(text, i);
  if (lEnd !== null) prefixEnds.push(lEnd);
  prefixEnds.push(...wordPrefixEnds(text, i, wordsLower));
  for (const start of prefixEnds) {
    const d1 = readDigits(text, start);
    if (!d1) continue;
    let j = skipWs(text, d1.end);
    if (j >= text.length || !DASHES.has(text[j]!)) continue;
    j++;
    j = skipWs(text, j);
    // Optional single-letter L before the second number (`L8` in `L6-L8`).
    if (
      startsIgnoreCase(text, j, 'l') &&
      j + 1 < text.length &&
      text[j + 1]! >= '0' &&
      text[j + 1]! <= '9'
    ) {
      j += 1;
    }
    const d2 = readDigits(text, j);
    if (!d2) continue;
    if (!isWordBoundary(text, d2.end)) continue;
    return formatLineFragment(d1.value, d2.value);
  }
  return null;
}

/**
 * Shortest locale word forms only (en-US: `line` not `lines`) — parity with
 * former `\b(?:L|line\s*)(\d+)\b`. Longer plural cues still work for ranges.
 */
function singleCueWords(wordsLower: readonly string[]): readonly string[] {
  if (!wordsLower.length) return [];
  let minLen = wordsLower[0]!.length;
  for (const w of wordsLower) {
    if (w.length < minLen) minLen = w.length;
  }
  return wordsLower.filter((w) => w.length === minLen);
}

/** Required `L` or shortest locale word, then `\d+`. */
function tryPrefixedSingleAt(
  text: string,
  i: number,
  wordsLower: readonly string[],
): string | null {
  if (!isWordBoundary(text, i)) return null;

  const ends: number[] = [];
  const lEnd = matchLetterLPrefix(text, i);
  if (lEnd !== null) ends.push(lEnd);
  ends.push(...wordPrefixEnds(text, i, singleCueWords(wordsLower)));

  for (const start of ends) {
    const d = readDigits(text, start);
    if (!d) continue;
    if (!isWordBoundary(text, d.end)) continue;
    return formatLineFragment(d.value);
  }
  return null;
}

/** `:(\d+)\s*[-–—]\s*(\d+)\b` */
function tryColonRangeAt(text: string, i: number): string | null {
  if (text[i] !== ':') return null;
  const d1 = readDigits(text, i + 1);
  if (!d1) return null;
  let j = skipWs(text, d1.end);
  if (j >= text.length || !DASHES.has(text[j]!)) return null;
  j++;
  j = skipWs(text, j);
  const d2 = readDigits(text, j);
  if (!d2) return null;
  if (!isWordBoundary(text, d2.end)) return null;
  return formatLineFragment(d1.value, d2.value);
}

/** `:(\d+)\b` */
function tryColonSingleAt(text: string, i: number): string | null {
  if (text[i] !== ':') return null;
  const d = readDigits(text, i + 1);
  if (!d) return null;
  if (!isWordBoundary(text, d.end)) return null;
  return formatLineFragment(d.value);
}
