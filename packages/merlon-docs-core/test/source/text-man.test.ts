import { describe, it, expect } from 'vitest';
import { textReader } from '../../src/source/text/reader.js';
import { manReader, troffToPlain } from '../../src/source/man/reader.js';

const text = (lines: string[], path = '/docs/README') =>
  textReader.read(lines.join('\n'), { path });
const man = (lines: string[], path = '/docs/open.2') => manReader.read(lines.join('\n'), { path });

describe('plain-text reader', () => {
  it('reads blank-line paragraphs and an underlined first line as the title', () => {
    const doc = text([
      'Kernel notes',
      '============',
      '',
      'First paragraph',
      'wraps here.',
      '',
      'Second.',
    ]);
    expect(doc.title).toMatchObject({ text: 'Kernel notes', level: 1, line: 1 });
    expect(doc.paragraphs.map((p) => [p.line, p.plain])).toEqual([
      [4, 'First paragraph wraps here.'],
      [7, 'Second.'],
    ]);
  });

  it('has no title when the first line is not underlined', () => {
    expect(text(['Just prose.', '', 'More prose.']).title).toBeNull();
  });

  it('reads a file that starts with #! as empty', () => {
    const doc = text(['#!/bin/sh', 'echo "This is a script, not prose."']);
    expect(doc.paragraphs).toEqual([]);
    expect(doc.proseWords).toBe(0);
  });

  it('measures literal blocks from the document indent, so an indented document is still prose', () => {
    const doc = text([
      '\tWhole document is indented.',
      '',
      '\t\tdeeper code line',
      '',
      '\tBack to prose.',
    ]);
    expect(doc.paragraphs.map((p) => p.plain)).toEqual([
      'Whole document is indented.',
      'Back to prose.',
    ]);
  });

  it('is never an orphan and has no links', () => {
    const doc = text(['See Documentation/process/index.rst for more.']);
    expect(doc.orphanOk).toBe(true);
    expect(doc.links).toEqual([]);
  });
});

describe('man reader', () => {
  it('reads .TH as the title and .SH/.SS as sections, including a title on the next line', () => {
    const doc = man([
      '.TH OPEN 2 2024-01-01 "Linux" "Linux Programmer\'s Manual"',
      '.SH NAME',
      'open \\- open a file',
      '.SH',
      'DESCRIPTION',
      '.SS "Flags"',
    ]);
    expect(doc.headings.map((h) => [h.plain, h.level, h.line])).toEqual([
      ['OPEN', 1, 1],
      ['NAME', 2, 2],
      ['DESCRIPTION', 2, 5],
      ['Flags', 3, 6],
    ]);
    expect(doc.paragraphs.map((p) => p.plain)).toEqual(['open - open a file']);
  });

  it('leaves out comments, no-fill and example blocks and macro definitions', () => {
    const doc = man([
      '.\\" a comment',
      'Visible text.',
      '.nf',
      'hidden one',
      '.fi',
      '.EX',
      'hidden two',
      '.EE',
      '.de XX',
      'hidden three',
      '..',
      'More visible text.',
    ]);
    expect(doc.paragraphs.map((p) => p.plain)).toEqual(['Visible text.', 'More visible text.']);
  });

  it('reads page references as manpage links', () => {
    const doc = man(['.PP', 'See', '.BR close (2)', 'and fcntl(2).']);
    expect(doc.links).toEqual([
      { kind: 'manpage', target: 'close(2)', line: 3 },
      { kind: 'manpage', target: 'fcntl(2)', line: 4 },
    ]);
  });

  it('turns troff escapes into plain text', () => {
    expect(troffToPlain('\\fBbold\\fR \\-\\-flag \\(em x\\&y')).toBe('bold --flag — xy');
  });
});
