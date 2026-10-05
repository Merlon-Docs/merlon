/**
 * Display width, as compile measures table cells when it re-aligns a table. Each width in the
 * first table is the one Prettier's `getStringWidth` gives, so a table compile re-aligns matches
 * the table Prettier would print.
 */
import { describe, it, expect } from 'vitest';
import { displayWidth } from '../src/markdown/display-width.js';

describe('displayWidth', () => {
  it.each([
    ['', 0],
    ['mdcp compile', 12],
    ['`docs/_build/guides.md`', 23],
    // Punctuation and letters the repo's own tables hold, one column each.
    ['—', 1],
    ['…', 1],
    ['→', 1],
    ['×', 1],
    ['“quoted”', 8],
    ['·', 1],
    ['’', 1],
    ['–', 1],
    ['Diátaxis', 8],
    ['≠', 1],
    // Wide East Asian characters.
    ['中文', 4],
    ['日本語 docs', 11],
    ['ひらがな', 8],
    ['カタカナ', 8],
    ['한국어', 6],
    // Fullwidth forms count two, halfwidth forms one.
    ['ＡＢＣ', 6],
    ['！', 2],
    ['\u3000', 2],
    ['ｶﾀｶﾅ', 4],
    // Emoji, including modifier, ZWJ, flag and keycap sequences, count two.
    ['🚀', 2],
    ['Ship 🚀 fast', 12],
    ['✅', 2],
    ['⭐', 2],
    ['⌚', 2],
    ['👍🏽', 2],
    ['👨\u200D👩\u200D👧', 2],
    ['🇺🇸', 2],
    ['❤\uFE0F', 2],
    ['1\uFE0F\u20E3', 2],
    // Emoji from Unicode 15 and later count two, even where the runtime's Unicode data predates them.
    ['\u{1F6DC}', 2],
    ['\u{1F6D8}', 2],
    ['\u{1FAE9}', 2],
    ['\u{1FAEA}', 2],
    // A pictograph that is no emoji, or `#` with no keycap, counts one even with the emoji selector.
    ['★\uFE0F', 1],
    ['☐\uFE0F', 1],
    ['#\uFE0F', 1],
    // A symbol shown as text, without the emoji selector, counts one.
    ['©', 1],
    ['™', 1],
    ['✔', 1],
    ['☺', 1],
    // Combining marks and a variation selector count zero.
    ['e\u0301', 1],
    ['a\u0308o\u0308', 2],
    ['a\uFE0F', 1],
  ])('measures %j as %i columns, as Prettier does', (text, width) => {
    expect(displayWidth(text)).toBe(width);
  });

  it('counts nonspacing and enclosing marks and format characters as zero, as markdownlint does', () => {
    // Prettier counts these one column each. Markdownlint, which checks the compiled output's
    // tables, counts them zero.
    expect(displayWidth('שָׁ')).toBe(1);
    expect(displayWidth('x⃗')).toBe(1);
    expect(displayWidth('x\u200By')).toBe(2);
    expect(displayWidth('soft\u00ADhyphen')).toBe(10);
    // An emoji that shows as text by default counts one. Prettier counts it two.
    expect(displayWidth('☝')).toBe(1);
    expect(displayWidth('✌')).toBe(1);
  });

  it('counts a spacing mark as one column, as Prettier does', () => {
    // Markdownlint counts each grapheme once, so it gives the vowel sign in 'का' no column and the
    // conjunct 'न्दी' one. Prettier also counts the virama, a nonspacing mark, which this skips.
    expect(displayWidth('का')).toBe(2);
    expect(displayWidth('हिन्दी')).toBe(5);
  });
});
