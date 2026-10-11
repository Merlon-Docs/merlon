/**
 * Linear scans for inline links. `scanMarkdownLinks` reads a label as CommonMark reads link text,
 * for every reader of inline links: link lint, broken-link marking, the link passes,
 * `codeEvidence`, the manifest walk and the `inlineInserts` hook. Link lint, marking and the passes
 * read one line at a time, `codeEvidence` reads each run of lines between fenced code, and the walk
 * and `inlineInserts` read a whole manifest or shard body. The regexes these scans replaced read a
 * target with `[^)]`, so on a crafted text they could rescan the rest of the text from each `[`,
 * and again after each `.md` in a target. These scans read each index a fixed number of times.
 */

/**
 * A reader for the first index of `char` in `text` at or after an index. Calls whose index never
 * moves back read each index of the text once, since the reader keeps its last answer.
 */
export function createNextIndexReader(text: string, char: string): (from: number) => number {
  let searchedFrom = Infinity;
  let next = -1;
  return (from) => {
    if (from >= searchedFrom && (next === -1 || next >= from)) return next;
    searchedFrom = from;
    next = text.indexOf(char, from);
    return next;
  };
}

/** An inline link or image that `scanMarkdownLinks` reads. */
export interface MarkdownLink {
  /** Index of the `[` that opens the label, or of the `!` before it in an image. */
  start: number;
  /** Index of the `]` that closes the label. The target starts two past it, after the `(`. */
  labelEnd: number;
  /** Index of the `)` that closes the target. */
  close: number;
  /** True for an image, `![alt](src)`. */
  image: boolean;
}

/** ASCII punctuation, which a backslash escapes in CommonMark. */
const ESCAPABLE = new Set('!"#$%&\'()*+,-./:;<=>?@[\\]^_`{|}~');

/** An unclosed `[` or `![`, and whether it opens an image. */
interface Opener {
  at: number;
  image: boolean;
}

/**
 * Each inline link and image in `text`, in the order of their targets, so an image in the label of
 * a link comes before the link. A label is read as CommonMark reads link text. It can hold balanced
 * brackets, an image, and a line break. Its `]` closes the nearest `[` or `![` still open, and a
 * bracket after a backslash is text. A link holds no link, so once a link closes, each `[` open
 * before it is text. Each `![` stays open, so an image can hold a link. A `(` follows the `]` at
 * once, and the target runs from there to the first `)`, which has to be on the same line. The
 * target can be empty. Unlike CommonMark, it can hold spaces, a title or angle brackets, and it
 * can't hold a `)`. The scan reads no bracket in a target. It doesn't read code spans, autolinks or
 * inline HTML, so a bracket in one still counts, and a caller that skips code spans masks them
 * first.
 *
 * The scan stops only at a backslash, a `!` or a bracket, and a regex of one character class finds
 * the next one. That regex, and the indexes of the next `)` and line break, only move forward, so
 * the scan reads each index of the text a fixed number of times.
 */
export function scanMarkdownLinks(text: string): MarkdownLink[] {
  const links: MarkdownLink[] = [];
  const openers: Opener[] = [];
  // Each `[` before the `[` of the last link is text.
  let linkFloor = -1;
  const nextClose = createNextIndexReader(text, ')');
  const nextBreak = createNextIndexReader(text, '\n');
  const stops = /[!\\[\]]/g;
  for (let stop = stops.exec(text); stop; stop = stops.exec(text)) {
    const i = stop.index;
    const char = text[i];
    if (char === '\\') {
      if (ESCAPABLE.has(text[i + 1])) stops.lastIndex = i + 2;
    } else if (char === '!') {
      if (text[i + 1] !== '[') continue;
      openers.push({ at: i + 1, image: true });
      stops.lastIndex = i + 2;
    } else if (char === '[') {
      openers.push({ at: i, image: false });
    } else {
      const opener = openers.pop();
      if (!opener || (!opener.image && opener.at < linkFloor) || text[i + 1] !== '(') continue;
      const close = nextClose(i + 2);
      if (close === -1) break;
      const lineBreak = nextBreak(i + 2);
      if (lineBreak !== -1 && lineBreak < close) continue;
      links.push({
        start: opener.image ? opener.at - 1 : opener.at,
        labelEnd: i,
        close,
        image: opener.image,
      });
      if (!opener.image) linkFloor = opener.at;
      stops.lastIndex = close + 1;
    }
  }
  return links;
}

/**
 * For each link and image of `links`, the indexes in `links` of the links and images right inside
 * its label, in order. `links` come in the order `scanMarkdownLinks` gives them, or a part of it.
 * Each one sits right inside at most one other, so the lists hold each index at most once.
 */
export function nestedLinkIndexes(links: readonly MarkdownLink[]): number[][] {
  const nested: number[][] = [];
  // The links and images read so far that no other holds, in order. A link or image ends before
  // the one after it in `links` does, so the ones that start after it starts are in its label.
  const outer: number[] = [];
  links.forEach((link, i) => {
    let first = outer.length;
    while (first > 0 && links[outer[first - 1]].start > link.start) first--;
    nested.push(outer.splice(first));
    outer.push(i);
  });
  return nested;
}

/**
 * The text of `text` from `from` to `to`, as the pieces between the spans of `cut`. Each span is a
 * start and an end in that range, and the spans are apart and in order.
 */
export function piecesBetween(
  text: string,
  from: number,
  to: number,
  cut: readonly (readonly [number, number])[],
): string[] {
  const pieces: string[] = [];
  let at = from;
  for (const [start, end] of cut) {
    pieces.push(text.slice(at, start));
    at = end;
  }
  pieces.push(text.slice(at, to));
  return pieces;
}

/**
 * `text` with the target of each link in `links` replaced by the entry of `targets` at the same
 * index, when that entry isn't undefined. `links` come in the order `scanMarkdownLinks` gives them.
 * `spans` gives the start and end of each link in the new text, an image's new src included in the
 * link around it.
 */
export function replaceLinkTargets(
  text: string,
  links: readonly MarkdownLink[],
  targets: readonly (string | undefined)[],
): { text: string; spans: [number, number][] } {
  let out = '';
  let last = 0;
  // The `)` of each replaced target, in order, and how far the text after it has moved.
  const closes: number[] = [];
  const shifts: number[] = [0];
  links.forEach((link, i) => {
    const target = targets[i];
    if (target === undefined) return;
    const targetStart = link.labelEnd + 2;
    out += text.slice(last, targetStart) + target;
    last = link.close;
    closes.push(link.close);
    shifts.push(shifts[shifts.length - 1] + target.length - (link.close - targetStart));
  });
  out += text.slice(last);
  const moved = (at: number) => at + shifts[countAtMost(closes, at)];
  const spans = links.map((link): [number, number] => [moved(link.start), moved(link.close + 1)]);
  return { text: out, spans };
}

/** How many entries of `sorted`, which is in ascending order, are at most `value`. */
function countAtMost(sorted: readonly number[], value: number): number {
  let low = 0;
  let high = sorted.length;
  while (low < high) {
    const mid = (low + high) >> 1;
    if (sorted[mid] <= value) low = mid + 1;
    else high = mid;
  }
  return low;
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
 * The path of each `[label](….md)` link and `![alt](….md)` image in `text`, as `scanMarkdownLinks`
 * reads them, which may have a `#fragment` after the `.md`. A path runs from the start of the
 * target to its last `.md` that the `)` or a `#` follows, and it has at least one character before
 * that `.md`. The path itself can hold a `#`, so `[a](#x.md)` gives the path `#x.md`.
 */
export function mdLinkPaths(text: string): string[] {
  const mdSuffix = createMdSuffixReader(text, { ignoreCase: false, minFragment: 0 });
  const paths: string[] = [];
  for (const { labelEnd, close } of scanMarkdownLinks(text)) {
    const targetStart = labelEnd + 2;
    const md = mdSuffix(close);
    if (md > targetStart) paths.push(text.slice(targetStart, md + 3));
  }
  return paths;
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
