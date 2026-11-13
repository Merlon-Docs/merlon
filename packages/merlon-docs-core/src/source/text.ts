/** Format-neutral text helpers shared by readers and passes. */

const WORDISH = /[\p{L}\p{N}]/u;

/** Whitespace-separated tokens that hold at least one letter or digit. */
export function countWords(text: string): number {
  let n = 0;
  for (const token of text.split(/\s+/)) {
    if (token && WORDISH.test(token)) n++;
  }
  return n;
}

/** Lowercase, whitespace-collapsed form of plain prose, used to compare paragraphs. */
export function foldPlain(plain: string): string {
  return plain.toLowerCase().split(/\s+/).filter(Boolean).join(' ');
}

/** Plain title folded for comparison: lowercase, punctuation folded to spaces. */
export function foldTitle(plain: string): string {
  return plain
    .toLowerCase()
    .replace(/[^\p{L}\p{N}]+/gu, ' ')
    .trim();
}
