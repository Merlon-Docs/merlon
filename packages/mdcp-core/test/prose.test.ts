import { describe, it, expect } from 'vitest';
import { mkdirSync, writeFileSync } from 'node:fs';
import { join } from 'node:path';
import {
  maskNonProse,
  inlineToPlain,
  listMarkerLength,
  stripBlockMarkers,
  countWords,
  createCodeFenceScanner,
} from '../src/markdown/index.js';
import { filterScanIgnored } from '../src/validate/coverage.js';
import { manySpaces, timeMs } from './helpers/redos-pumps.js';
import { useTmpDir } from './helpers/tmp-dir.js';

describe('maskNonProse', () => {
  it('blanks front matter, fences, and comments while keeping line numbers', () => {
    const md = [
      '---',
      'title: x',
      '---',
      'keep <!-- drop --> this',
      '<!-- start',
      'still comment',
      'end --> tail',
      '````md',
      '```',
      'inner',
      '```',
      '````',
      'after',
    ].join('\r\n');
    expect(maskNonProse(md)).toEqual([
      '',
      '',
      '',
      'keep  this',
      '',
      '',
      ' tail',
      '',
      '',
      '',
      '',
      '',
      'after',
    ]);
  });

  it('treats an unterminated front matter opener as prose', () => {
    expect(maskNonProse('---\ntext')).toEqual(['---', 'text']);
  });

  it('masks list-indented fences and everything after an unclosed fence', () => {
    expect(maskNonProse('- item\n  ```bash\n  run\n  ```\nafter\n~~~\nopen')).toEqual([
      '- item',
      '',
      '',
      '',
      'after',
      '',
      '',
    ]);
  });

  it('does not open a fence on inline code with backticks in the info string', () => {
    expect(maskNonProse('``` `x` ```\nprose')).toEqual(['``` `x` ```', 'prose']);
  });

  it('ignores fence markers inside an open HTML comment', () => {
    expect(maskNonProse('<!--\n```\n-->\nprose')).toEqual(['', '', '', 'prose']);
  });
});

/** Run a fresh scanner over `lines` and return its answer for each line. */
function fenced(lines: string[]): boolean[] {
  const inFence = createCodeFenceScanner();
  return lines.map((line) => inFence(line));
}

describe('createCodeFenceScanner', () => {
  it('marks the opener, the content and the closer of a fence', () => {
    expect(fenced(['a', '```js', 'x', '```', 'b'])).toEqual([false, true, true, true, false]);
  });

  it('closes only on the same character, at least as long, with nothing after it', () => {
    expect(fenced(['~~~~', '~~~', '```', '~~~~ x', '~~~~~', 'y'])).toEqual([
      true,
      true,
      true,
      true,
      true,
      false,
    ]);
  });

  it('does not open a backtick fence whose info string holds a backtick', () => {
    expect(fenced(['``` a`b', 'x'])).toEqual([false, false]);
    expect(fenced(['~~~ a`b', 'x', '~~~'])).toEqual([true, true, true]);
  });

  it('opens and closes on lines indented at most three columns', () => {
    expect(fenced(['   ```', 'x', '   ```', '    ```', 'y'])).toEqual([
      true,
      true,
      true,
      false,
      false,
    ]);
    // Inside a fence, a run four columns in is content.
    expect(fenced(['```', '    ```', 'x', '```', 'y'])).toEqual([true, true, true, true, false]);
    // A tab advances to column 4.
    expect(fenced(['\t```', 'x', ' \t```'])).toEqual([false, false, false]);
  });

  it('opens a fence right after a list marker and measures its closer from the item', () => {
    expect(fenced(['- ```bash', '  x', '  ```', '  y'])).toEqual([true, true, true, false]);
    expect(fenced(['1. ```', '   x', '   ```', 'y'])).toEqual([true, true, true, false]);
    expect(fenced(['10. ```', '    x', '    ```', 'y'])).toEqual([true, true, true, false]);
    expect(fenced(['  - ```', '    x', '    ```', 'y'])).toEqual([true, true, true, false]);
    // A thematic break or a marker without a fence after it opens nothing.
    expect(fenced(['* * *', '- - -', '- text', '1.```'])).toEqual([false, false, false, false]);
  });

  it('ends a fence opened on a marker line where its list item ends', () => {
    // Blank lines, CRLF ones included, keep the item open; a line left of its content ends it.
    expect(fenced(['- ```', '  x', '', '\r', '  y', 'z', '  w'])).toEqual([
      true,
      true,
      true,
      true,
      true,
      false,
      false,
    ]);
    // The line that ends the item can open the next fence.
    expect(fenced(['- ```', '  x', '```', 'y', '```', 'z'])).toEqual([
      true,
      true,
      true,
      true,
      true,
      false,
    ]);
  });

  it('reads no other containers and no HTML', () => {
    // A fence on its own line in a list item has column 0 as its container, so it outlives the
    // item when the item leaves it unclosed.
    expect(fenced(['- item', '', '  ```', '  x', '', 'Text', '  ```'])).toEqual([
      false,
      false,
      true,
      true,
      true,
      true,
      true,
    ]);
    // A fence in a nested list item or behind a blockquote marker goes unseen.
    expect(fenced(['- a', '  - b', '', '    ```', '    x', '    ```'])).toEqual([
      false,
      false,
      false,
      false,
      false,
      false,
    ]);
    expect(fenced(['> ```', '> x', '> ```'])).toEqual([false, false, false]);
    // A fence line inside an HTML comment counts like any other.
    expect(fenced(['<!--', '```', '-->', 'x'])).toEqual([false, true, true, true]);
    // Inside a fence, a marker line is content.
    expect(fenced(['```', '- ```', 'x', '```', 'y'])).toEqual([true, true, true, true, false]);
  });

  it('stays linear on long indents and long fence runs', () => {
    const lines = [manySpaces(40_000) + '```', '`'.repeat(40_000), '- ' + '`'.repeat(40_000)];
    const ms = timeMs(() => {
      for (let i = 0; i < 20; i++) fenced(lines);
    });
    expect(ms).toBeLessThan(100);
  });
});

describe('inline helpers', () => {
  it('keeps link text and drops targets, including nested parentheses', () => {
    expect(inlineToPlain('a [b](c_(d).md) e')).toBe('a b e');
    expect(inlineToPlain('unclosed [x](y')).toBe('unclosed x');
  });

  it('recognizes list markers', () => {
    expect(listMarkerLength('- a')).toBe(2);
    expect(listMarkerLength('12. a')).toBe(4);
    expect(listMarkerLength('3) a')).toBe(3);
    expect(listMarkerLength('-a')).toBe(0);
    expect(listMarkerLength('12.a')).toBe(0);
    expect(listMarkerLength('word')).toBe(0);
    expect(stripBlockMarkers('> > - quoted item')).toBe('quoted item');
  });

  it('counts only tokens with letters or digits', () => {
    expect(countWords('one — two | --- 3')).toBe(3);
    expect(countWords('')).toBe(0);
  });

  it('stays linear on long pathological input', () => {
    const input = '[' + manySpaces(40_000) + '](' + manySpaces(40_000);
    expect(timeMs(() => inlineToPlain(input))).toBeLessThan(50);
    const comments = '<!--'.repeat(20_000);
    expect(timeMs(() => maskNonProse(comments))).toBeLessThan(50);
  });
});

describe('filterScanIgnored', () => {
  const work = useTmpDir('mdcp-scan-ignore-');

  it('drops ignored files, keeps files outside the scan root, and drops missing files', () => {
    const root = join(work.path, 'repo');
    mkdirSync(join(root, 'docs', 'drafts'), { recursive: true });
    const keep = join(root, 'docs', 'a.md');
    const drop = join(root, 'docs', 'drafts', 'b.md');
    const special = join(root, 'docs', 'c (1).md');
    const outside = join(work.path, 'elsewhere.md');
    for (const f of [keep, drop, special, outside]) writeFileSync(f, '# x\n');
    const missing = join(root, 'docs', 'gone.md');
    expect(
      filterScanIgnored(root, [keep, drop, special, outside, missing], ['docs/drafts/**']),
    ).toEqual([keep, special, outside]);
  });
});
