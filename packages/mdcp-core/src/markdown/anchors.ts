export function isSlugChar(ch: string): boolean {
  return (
    (ch >= 'A' && ch <= 'Z') || (ch >= 'a' && ch <= 'z') || (ch >= '0' && ch <= '9') || ch === '-'
  );
}

function isAsciiSpaceOrTab(ch: string): boolean {
  return ch === ' ' || ch === '\t';
}

/** Whitespace that JS `\\s` matches for common markdown (no regex). */
function isJsWhitespace(ch: string): boolean {
  return ch === ' ' || ch === '\t' || ch === '\n' || ch === '\r' || ch === '\f' || ch === '\v';
}

/** Split trailing Pandoc {#id} from a heading title (forward scan, stripPandocAnchors rules). */
export function splitTrailingPandocAnchor(title: string): { text: string; anchor: string | null } {
  let end = title.length;
  while (end > 0 && isAsciiSpaceOrTab(title[end - 1])) end--;

  if (end === 0 || title[end - 1] !== '}') {
    return { text: title.trim(), anchor: null };
  }

  const closeBrace = end - 1;
  let openBrace = closeBrace - 1;
  while (openBrace >= 0 && title[openBrace] !== '{') openBrace--;

  if (
    openBrace < 0 ||
    openBrace + 1 >= closeBrace ||
    title[openBrace + 1] !== '#' ||
    openBrace + 2 >= closeBrace
  ) {
    return { text: title.trim(), anchor: null };
  }

  const slugStart = openBrace + 2;
  for (let k = slugStart; k < closeBrace; k++) {
    if (!isSlugChar(title[k])) {
      return { text: title.trim(), anchor: null };
    }
  }

  let textEnd = openBrace;
  while (textEnd > 0 && isAsciiSpaceOrTab(title[textEnd - 1])) textEnd--;

  const slug = title.slice(slugStart, closeBrace);
  return { text: title.slice(0, textEnd).trim(), anchor: slug.toLowerCase() };
}

/**
 * Remove Pandoc-style {#id} markers without polynomial regex backtracking.
 *
 * The output is kept as ranges of `text` and joined once at the end. Trimming the whitespace
 * before a marker shortens the last ranges, so it never reads the output built so far, and the
 * time stays linear in the length of `text` however many markers it holds.
 */
export function stripPandocAnchors(
  text: string,
  options?: { trimPrecedingWhitespace?: boolean },
): string {
  const first = text.indexOf('{#');
  if (first === -1) return text;

  const trimPreceding = options?.trimPrecedingWhitespace ?? false;
  // Kept ranges of `text`: [starts[k], ends[k]). The text from `copyFrom` up to the current
  // position is kept too, and becomes a range when a marker ends it.
  const starts: number[] = [];
  const ends: number[] = [];
  let copyFrom = 0;
  let i = first;

  // Mode A (trimPrecedingWhitespace: true): parity with old regex /\s*\{#[a-z0-9-]+\}/gi
  // requires >=1 slug char and trims all preceding regex whitespace.
  // Mode B (trimPrecedingWhitespace: false): strictly strips well-formed anchors,
  // allowing empty {#} but not touching surrounding text.

  while (i < text.length) {
    if (text[i] === '{' && i + 1 < text.length && text[i + 1] === '#') {
      let j = i + 2;
      let valid = true;
      let slugLen = 0;
      while (j < text.length && text[j] !== '}') {
        if (trimPreceding) {
          if (!isSlugChar(text[j])) {
            valid = false;
            break;
          }
          slugLen++;
        } else if (text[j] === '{') {
          valid = false;
          break;
        }
        j++;
      }

      if (trimPreceding && slugLen === 0) {
        valid = false;
      }

      if (valid && j < text.length && text[j] === '}') {
        starts.push(copyFrom);
        ends.push(i);
        if (trimPreceding) trimTrailingRanges(text, starts, ends);
        i = j + 1;
        copyFrom = i;
        continue;
      }
    }

    i++;
  }

  const parts: string[] = [];
  for (let k = 0; k < starts.length; k++) parts.push(text.slice(starts[k], ends[k]));
  parts.push(text.slice(copyFrom));
  return parts.join('');
}

/**
 * Drop trailing whitespace from the kept ranges, removing each range it empties. A character it
 * drops never comes back, so the calls for one text read each character at most once, plus one
 * character per marker.
 */
function trimTrailingRanges(text: string, starts: number[], ends: number[]): void {
  while (starts.length > 0) {
    const k = starts.length - 1;
    while (ends[k] > starts[k] && isJsWhitespace(text[ends[k] - 1])) ends[k]--;
    if (ends[k] > starts[k]) return;
    starts.pop();
    ends.pop();
  }
}
