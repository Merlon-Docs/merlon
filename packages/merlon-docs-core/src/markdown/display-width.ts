/**
 * Display width of text in a monospace font, as table formatters measure a cell: an emoji or a
 * wide or fullwidth East Asian character takes two columns, a nonspacing or enclosing mark, a
 * control or a format character none, and any other character one, a spacing mark included.
 *
 * Prettier and markdownlint give these widths wherever the two agree. Where they disagree, this
 * follows markdownlint on nonspacing marks and format characters, and on an emoji that shows as
 * text by default, and Prettier on spacing marks. Markdownlint counts an Indic conjunct once, and
 * this counts each of its letters, so for Indic text it matches neither tool.
 *
 * Emoji detection reads the runtime's Unicode data, which an older Node version takes from an
 * older Unicode version. Every emoji of one code point from Unicode 15 on is in two blocks, so the
 * wide ranges list those blocks' emoji too, and an emoji newer than the runtime still counts two.
 */

/**
 * Code points East Asian Width gives as wide or fullwidth, inclusive. Emoji are left out, apart
 * from the two blocks that newer Unicode versions extend. A range may span unassigned code points
 * between two assigned runs.
 */
const WIDE_RANGES: readonly (readonly [number, number])[] = [
  [0x1100, 0x115f], // Hangul Jamo leading consonants
  [0x2329, 0x232a], // angle brackets
  [0x2630, 0x2637], // trigrams
  [0x268a, 0x268f], // monograms and digrams
  [0x2e80, 0x303e], // CJK radicals, Kangxi radicals, CJK symbols and punctuation
  [0x3041, 0x3247], // Kana, Bopomofo, Hangul compatibility Jamo, enclosed CJK
  [0x3250, 0xa4c6], // enclosed CJK, CJK compatibility, CJK ideographs, Yi
  [0xa960, 0xa97c], // Hangul Jamo Extended-A
  [0xac00, 0xd7a3], // Hangul syllables
  [0xf900, 0xfaff], // CJK compatibility ideographs
  [0xfe10, 0xfe19], // vertical forms
  [0xfe30, 0xfe6b], // CJK compatibility forms, small form variants
  [0xff01, 0xff60], // fullwidth forms
  [0xffe0, 0xffe6], // fullwidth signs
  [0x16fe0, 0x1b2fb], // Tangut, Khitan, Nushu, Kana supplements
  [0x1d300, 0x1d376], // Tai Xuan Jing symbols, counting rods
  [0x1f200, 0x1f265], // enclosed ideographic supplement
  [0x1f6d5, 0x1f6d8], // transport and map emoji
  [0x1f6dc, 0x1f6df], // transport and map emoji
  [0x1fa70, 0x1fa7c], // symbols and pictographs extended-A, here and in the six ranges below
  [0x1fa80, 0x1fa8a],
  [0x1fa8e, 0x1fac6],
  [0x1fac8, 0x1fac8],
  [0x1facd, 0x1fadc],
  [0x1fadf, 0x1faea],
  [0x1faef, 0x1faf8],
  [0x20000, 0x3fffd], // CJK ideograph extensions
];

const ZERO_WIDTH = /^[\p{Mn}\p{Me}\p{Cc}\p{Cf}]$/u;
const EMOJI_PRESENTATION = /(?!\p{Regional_Indicator})\p{Emoji_Presentation}/u;
/** A pictograph that is also an emoji, as `❤` is and `★` isn't. */
const EMOJI_PICTOGRAPH = /^(?=\p{Emoji})\p{Extended_Pictographic}/u;
const FLAG = /\p{Regional_Indicator}{2}/u;
const KEYCAP = '\u20E3';
const EMOJI_SELECTOR = '\uFE0F';
const PRINTABLE_ASCII = /^[\x20-\x7e]*$/;

let segmenter: Intl.Segmenter | undefined;

function isWide(codePoint: number): boolean {
  let low = 0;
  let high = WIDE_RANGES.length - 1;
  while (low <= high) {
    const mid = (low + high) >> 1;
    const [start, end] = WIDE_RANGES[mid];
    if (codePoint < start) high = mid - 1;
    else if (codePoint > end) low = mid + 1;
    else return true;
  }
  return false;
}

/**
 * A grapheme shown as an emoji: one with emoji presentation by default, a flag, a keycap, or an
 * emoji pictograph followed by the emoji presentation selector.
 */
function isEmoji(grapheme: string): boolean {
  if (EMOJI_PRESENTATION.test(grapheme) || FLAG.test(grapheme)) return true;
  if (grapheme.includes(KEYCAP)) return true;
  return grapheme.includes(EMOJI_SELECTOR) && EMOJI_PICTOGRAPH.test(grapheme);
}

function graphemeWidth(grapheme: string): number {
  if (isEmoji(grapheme)) return 2;
  let width = 0;
  for (const char of grapheme) {
    if (ZERO_WIDTH.test(char)) continue;
    width += isWide(char.codePointAt(0)!) ? 2 : 1;
  }
  return width;
}

/** Columns `text` takes in a monospace display. */
export function displayWidth(text: string): number {
  if (PRINTABLE_ASCII.test(text)) return text.length;
  segmenter ??= new Intl.Segmenter(undefined, { granularity: 'grapheme' });
  let width = 0;
  for (const { segment } of segmenter.segment(text)) width += graphemeWidth(segment);
  return width;
}
