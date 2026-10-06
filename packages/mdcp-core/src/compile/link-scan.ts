/**
 * Linear scans for the links that the manifest walk and the `inlineInserts` hook read from a whole
 * manifest or shard body. Each finds what the regex it replaced found, in the same order. Those
 * regexes read a target with `[^)]`, which crosses line breaks, so on a crafted text they could
 * rescan the rest of the text from each `[`, and again after each `.md` in a target. These scans
 * read each index a fixed number of times.
 */

/** A `[label](target)` link and the value its target gave. */
export interface InlineLink<T> {
  /** Index of the `[` that opens the label. */
  start: number;
  /** Index of the `]` that closes the label. The target starts two past it, after the `(`. */
  labelEnd: number;
  /** Index of the `)` that closes the target. */
  close: number;
  value: T;
}

/**
 * Each `[label](target)` link in `text` whose target `read` gives a value for, from left to right
 * without overlap. A label runs from a `[` to the first `]` after it, a `(` follows at once, and
 * the target runs from there to the first `)`. Either can span lines. `read` gets the index where
 * the target starts and the index of its `)`, and returns undefined to turn the link down. The
 * search then goes on from the next `[`, which can sit inside that link. A global regex that
 * starts with `\[[^\]]*\]\(` and matches a target with no `)` in it, then `\)`, walks a text the
 * same way.
 *
 * Links that share a label end share a target, so `read` runs once for each label end. The
 * indexes of the next `]` and `)` only move forward, so the scan reads each index of the text a
 * fixed number of times besides what `read` reads.
 */
export function scanInlineLinks<T>(
  text: string,
  read: (targetStart: number, close: number) => T | undefined,
): InlineLink<T>[] {
  const links: InlineLink<T>[] = [];
  let labelEnd = -1;
  let close = -1;
  let refused = -1;
  for (let start = text.indexOf('['); start !== -1;) {
    if (labelEnd <= start) labelEnd = text.indexOf(']', start + 1);
    if (labelEnd === -1) break;
    if (labelEnd !== refused && text[labelEnd + 1] === '(') {
      const targetStart = labelEnd + 2;
      if (close < targetStart) close = text.indexOf(')', targetStart);
      if (close === -1) break;
      const value = read(targetStart, close);
      if (value !== undefined) {
        links.push({ start, labelEnd, close, value });
        start = text.indexOf('[', close + 1);
        continue;
      }
      refused = labelEnd;
    }
    start = text.indexOf('[', start + 1);
  }
  return links;
}

export interface MdSuffixOptions {
  /** Read `.MD` and `.Md` as `.md` too. */
  ignoreCase: boolean;
  /** The fewest characters a `#fragment` after the `.md` can hold. */
  minFragment: number;
}

function isMdAt(text: string, i: number, ignoreCase: boolean): boolean {
  if (text[i] !== '.') return false;
  const m = text[i + 1];
  const d = text[i + 2];
  return ignoreCase ? (m === 'm' || m === 'M') && (d === 'd' || d === 'D') : m === 'm' && d === 'd';
}

/**
 * A reader for the `.md` that ends the path of a link target in `text`. Given the index of the
 * `)` that closes a target, it returns the index of the last `.md` before it that the `)` follows
 * at once, or that a `#` and at least `minFragment` more characters follow. It returns -1 when no
 * `.md` qualifies. It reads back no further than the `)` before, since no target crosses one, and
 * it keeps its last answer, so calls whose `)` never moves back read each index once.
 */
export function createMdSuffixReader(
  text: string,
  options: MdSuffixOptions,
): (close: number) => number {
  let lastClose = -1;
  let lastAnswer = -1;
  return (close) => {
    if (close === lastClose) return lastAnswer;
    const floor = text.lastIndexOf(')', close - 1);
    let answer = -1;
    for (let i = close - 3; i > floor; i--) {
      if (!isMdAt(text, i, options.ignoreCase)) continue;
      const after = i + 3;
      if (after === close || (text[after] === '#' && close - after > options.minFragment)) {
        answer = i;
        break;
      }
    }
    lastClose = close;
    lastAnswer = answer;
    return answer;
  };
}

/**
 * The path of each `[label](….md)` link in `text`, which may have a `#fragment` after the `.md`.
 * A path runs from the start of the target to its last `.md` that the `)` or a `#` follows, and it
 * has at least one character before that `.md`. The path itself can hold a `#`. This is what
 * `/\[[^\]]*\]\(([^)]+\.md)(?:#[^)]*)?\)/g` captured.
 */
export function mdLinkPaths(text: string): string[] {
  const mdSuffix = createMdSuffixReader(text, { ignoreCase: false, minFragment: 0 });
  return scanInlineLinks(text, (targetStart, close) => {
    const md = mdSuffix(close);
    return md > targetStart ? text.slice(targetStart, md + 3) : undefined;
  }).map((link) => link.value);
}

/**
 * The slug of each `](#slug)` link in `text`: the text after the `#`, up to the first `)`, which
 * may span lines but not be empty. This is what `/\]\(#([^)]+)\)/g` captured.
 */
export function slugLinkTargets(text: string): string[] {
  const slugs: string[] = [];
  let close = -1;
  for (let at = text.indexOf('](#'); at !== -1;) {
    const slugStart = at + 3;
    if (close < slugStart) close = text.indexOf(')', slugStart);
    if (close === -1) break;
    if (close > slugStart) {
      slugs.push(text.slice(slugStart, close));
      at = text.indexOf('](#', close + 1);
    } else {
      at = text.indexOf('](#', at + 1);
    }
  }
  return slugs;
}
