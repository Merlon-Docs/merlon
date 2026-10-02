import { describe, it, expect } from 'vitest';
import { mkdirSync, writeFileSync } from 'node:fs';
import { join } from 'node:path';
import {
  maskNonProse,
  inlineToPlain,
  listMarkerLength,
  stripBlockMarkers,
  countWords,
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
