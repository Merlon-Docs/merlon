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
  createQuotedFenceScanner,
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

  it('ends a fence on its own line in a list item where the item ends', () => {
    // The fence counts from the item's content column, so a line left of it ends the item and
    // the fence, as a renderer reads it. The next fence line opens a new fence.
    expect(fenced(['- item', '', '  ```', '  x', '', 'Text', '  ```'])).toEqual([
      false,
      false,
      true,
      true,
      true,
      false,
      true,
    ]);
    expect(fenced(['- Install:', '', '  ```bash', '  npm i', '', '## Next', 'Text'])).toEqual([
      false,
      false,
      true,
      true,
      true,
      false,
      false,
    ]);
  });

  it('follows nested list items, on their own lines or after another marker', () => {
    expect(fenced(['- a', '  - b', '', '    ```', '    x', '    ```', 'y'])).toEqual([
      false,
      false,
      false,
      true,
      true,
      true,
      false,
    ]);
    expect(fenced(['1. - x', '     ```', '     y', '     ```', 'z'])).toEqual([
      false,
      true,
      true,
      true,
      false,
    ]);
  });

  it('keeps a list item open across a lazy paragraph line', () => {
    expect(fenced(['- item', 'lazy', '  ```', '  code', 'Text', '  ```', 'x'])).toEqual([
      false,
      false,
      true,
      true,
      false,
      true,
      true,
    ]);
    // A setext underline ends the paragraph, so the next line left of the item ends the item.
    expect(fenced(['- item', '  text', '  ---', 'lazy', '  ```', 'x'])).toEqual([
      false,
      false,
      false,
      false,
      true,
      true,
    ]);
  });

  it('opens an empty list item on a marker with nothing or only whitespace after it', () => {
    // A bare marker opens an item whose text starts one column past the marker.
    expect(fenced(['-', '  ```', 'x', '# heading'])).toEqual([false, true, false, false]);
    expect(fenced(['1.', '   ```', 'x', '   ```', 'y'])).toEqual([false, true, false, true, true]);
    // An empty item holds no paragraph, so an unindented line after it ends the item.
    expect(fenced(['- ', 'text', '  ```', 'x', '  ```'])).toEqual([false, false, true, true, true]);
    // A blank line right after an empty item ends the item.
    expect(fenced(['- ', '', '  ```', 'x', '  ```'])).toEqual([false, false, true, true, true]);
    expect(fenced(['-', '', '  ```', 'x', '  ```'])).toEqual([false, false, true, true, true]);
    // An empty item can't interrupt a paragraph, so a bare `-` there underlines it.
    expect(fenced(['Text', '-', '```', 'x', '```'])).toEqual([false, false, true, true, true]);
  });

  it('opens no list item for a thematic break or a marker that cannot interrupt a paragraph', () => {
    expect(fenced(['- - -', '  ```', 'x', '  ```'])).toEqual([false, true, true, true]);
    expect(fenced(['Text', '2. two', '   ```', 'x', '   ```'])).toEqual([
      false,
      false,
      true,
      true,
      true,
    ]);
  });

  it('reads no blockquotes and no HTML', () => {
    // A fence behind a blockquote marker goes unseen.
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

  it('stays linear on deeply nested list markers and the lines after them', () => {
    const lines = ['- '.repeat(5_000) + 'x', ...Array.from({ length: 500 }, () => 'lazy')];
    lines.push(manySpaces(5_000) + '```', 'x');
    const ms = timeMs(() => {
      for (let i = 0; i < 20; i++) fenced(lines);
    });
    expect(ms).toBeLessThan(100);
  });
});

/** Run a fresh quote-aware scanner over `lines` and return its answer for each line. */
function quotedFenced(lines: string[]): boolean[] {
  const inFence = createQuotedFenceScanner();
  return lines.map((line) => inFence(line));
}

describe('createQuotedFenceScanner', () => {
  it('reads fences outside blockquotes as the code fence scanner does', () => {
    const lines = ['a', '~~~', 'x', '~~~', '- ```', '  y', '  ```', 'b'];
    expect(quotedFenced(lines)).toEqual(fenced(lines));
  });

  it('reads a fence inside a blockquote, at any depth up to ten', () => {
    expect(quotedFenced(['> ```', '> x', '> ```', '> y'])).toEqual([true, true, true, false]);
    expect(quotedFenced(['> > ~~~', '>> x', '> > ~~~', '> > y'])).toEqual([
      true,
      true,
      true,
      false,
    ]);
    const deep = '> '.repeat(10);
    expect(quotedFenced([`${deep}\`\`\``, `${deep}x`])).toEqual([true, true]);
    const deeper = '> '.repeat(11);
    expect(quotedFenced([`${deeper}\`\`\``, `${deeper}x`])).toEqual([false, false]);
  });

  it('ends the fence with its blockquote', () => {
    expect(quotedFenced(['> ```', '> x', 'y', '> z'])).toEqual([true, true, false, false]);
    expect(quotedFenced(['> > ```', '> > x', '> y', '> > z'])).toEqual([true, true, false, false]);
  });

  it('opens a new quote after a list item marker', () => {
    expect(quotedFenced(['- > ```sh', '  > x', '  > ```', 'y'])).toEqual([true, true, true, false]);
    // The second item's quote is a new one, so the first item's open fence doesn't hold it.
    expect(quotedFenced(['- > ```', '- > y'])).toEqual([true, false]);
  });

  it('reads a quote marker inside fenced code as code', () => {
    expect(quotedFenced(['```', '> ```', '```', '> x'])).toEqual([true, true, true, false]);
    expect(quotedFenced(['> ~~~', '> > ```', '> ~~~', '> > x'])).toEqual([true, true, true, false]);
  });

  it('reads a tab after a quote marker as CommonMark does', () => {
    // The marker takes one column of the tab, and the rest indents the fence two columns.
    expect(quotedFenced(['>\t```sh', '>\tx', '>\t```', '> y'])).toEqual([true, true, true, false]);
    expect(quotedFenced(['> \t```', '> \tx', '> \t```'])).toEqual([true, true, true]);
    expect(quotedFenced(['>\t>\t```', '>\t>\tx', '>\t>\t```'])).toEqual([true, true, true]);
    expect(quotedFenced(['  >\t```', '  >\tx', '  >\t```', 'y'])).toEqual([
      true,
      true,
      true,
      false,
    ]);
    // A second tab indents the text six columns, so the line is indented code.
    expect(quotedFenced(['>\t\t```', '>\t\tx'])).toEqual([false, false]);
  });

  it('reads a CRLF line as it reads the line without its \\r', () => {
    const lines = ['> ```', '> x', '>', '> ```', '> y', '- > ~~~', '  > z', '  > ~~~', 'w'];
    const expected = [true, true, true, true, false, true, true, true, false];
    expect(quotedFenced(lines)).toEqual(expected);
    expect(quotedFenced(lines.map((line) => `${line}\r`))).toEqual(expected);
  });

  it('reads a `>` four or more columns past its container as code or text', () => {
    // An indented code block, and lines that continue a paragraph.
    expect(quotedFenced(['    > ```', '    > x', '    > ```'])).toEqual([false, false, false]);
    expect(quotedFenced(['Text.', '    > ```', '    > x'])).toEqual([false, false, false]);
    // Fenced code ends its quote, and the indented line after it is an indented code block.
    expect(quotedFenced(['> ```', '    > x', '> ```', '> y'])).toEqual([true, false, true, true]);
    // Four columns past the quote marker's space, the text is indented code in the quote.
    expect(quotedFenced(['>     > ```', '>     > x'])).toEqual([false, false]);
    // Two columns past a list item's text, the `>` opens a quote in the item; four columns past
    // it, the line is indented code in the item.
    expect(quotedFenced(['- a', '', '    > ```', '    > x', '    > ```'])).toEqual([
      false,
      false,
      true,
      true,
      true,
    ]);
    expect(quotedFenced(['- a', '', '      > ```', '      > x'])).toEqual([
      false,
      false,
      false,
      false,
    ]);
  });

  it('stays linear on long lines of quote and list markers', () => {
    const lines = [
      '> '.repeat(20_000) + '```',
      '- > '.repeat(10_000) + 'x',
      '>'.repeat(40_000),
      '- '.repeat(20_000) + '> ```',
      '> '.repeat(9) + '- '.repeat(20_000) + '> x',
      '>\t'.repeat(20_000) + '```',
    ];
    // Lines ten quotes deep with long text, which each quote's scanner reads.
    const deep = Array.from({ length: 200 }, () => '> '.repeat(10) + 'x '.repeat(500));
    const ms = timeMs(() => {
      for (let i = 0; i < 5; i++) {
        quotedFenced(lines);
        quotedFenced(deep);
      }
    });
    expect(ms).toBeLessThan(200);
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
