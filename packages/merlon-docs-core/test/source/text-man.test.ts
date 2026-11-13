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

  it('reads a heading after prose as a section, not the title', () => {
    const doc = text([
      'This folder builds the bindings.',
      '',
      'requirements',
      '------------',
      '',
      'A compiler.',
    ]);
    expect(doc.title).toBeNull();
    expect(doc.headings).toMatchObject([{ text: 'requirements', level: 2, line: 3 }]);
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
      ['OPEN(2)', 1, 1],
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

  it('ends a no-fill or example block that is never closed at the next section', () => {
    const doc = man([
      '.SH DESCRIPTION',
      '.nf',
      'hidden one',
      '.SS Options',
      'Visible option text.',
      '.EX',
      'hidden two',
      '.SH NOTES',
      'Visible note.',
    ]);
    expect(doc.headings.map((h) => h.plain)).toEqual(['DESCRIPTION', 'Options', 'NOTES']);
    expect(doc.paragraphs.map((p) => p.plain)).toEqual(['Visible option text.', 'Visible note.']);
  });

  it('reads page references as manpage links', () => {
    const doc = man(['.PP', 'See', '.BR close (2)', 'and fcntl(2).']);
    expect(doc.links).toEqual([
      { kind: 'manpage', target: 'close(2)', line: 3 },
      { kind: 'manpage', target: 'fcntl(2)', line: 4 },
    ]);
  });

  it('reads page references inside a no-fill block, but not inside an example', () => {
    const doc = man([
      '.SH "SEE ALSO"',
      '.nf',
      'msr(4)',
      'CPUID(1): family 6',
      '.fi',
      '.EX',
      'call(2)',
      '.EE',
    ]);
    expect(doc.links).toEqual([{ kind: 'manpage', target: 'msr(4)', line: 3 }]);
    expect(doc.paragraphs).toEqual([]);
  });

  it('titles a page by name and section', () => {
    expect(man(['.TH term 5 2025-08-16 "ncurses 6.6" "File formats"']).title).toMatchObject({
      plain: 'term(5)',
      level: 1,
    });
    expect(man(['.TH term 7']).title?.plain).toBe('term(7)');
  });

  it('does not read a C call with a 0 argument as a page reference', () => {
    const doc = man(['.TH curs_attr 3X', 'the same as \\fBattrset(0)\\fP, see attron(3X).']);
    expect(doc.links.map((l) => l.target)).toEqual(['attron(3X)']);
  });

  it('reads .so as an include, grouped by the section above it, and a page with .TH as never an orphan', () => {
    const doc = man(
      ['.TH addch 3X', '.so addch/name.3x', '.SH DESCRIPTION', '.so common/return-value.3x'],
      '/man/addch.3x',
    );
    expect(doc.manifest).toEqual([
      { target: 'addch/name.3x', line: 2, group: 'before any .SH', kind: 'include' },
      {
        target: 'common/return-value.3x',
        line: 4,
        group: 'under .SH DESCRIPTION',
        kind: 'include',
      },
    ]);
    expect(doc.orphanOk).toBe(true);
    expect(man(['.SH HISTORY', 'A fragment.'], '/man/addch/history.3x').orphanOk).toBe(false);
  });

  it('reads the names a NAME section lists as aliases', () => {
    const doc = man([
      '.TH curs_addch 3X',
      '.SH NAME',
      '\\fBaddch\\fP,',
      '\\fBwaddch\\fP \\-',
      'add a character',
      '.SH DESCRIPTION',
      'Text.',
    ]);
    expect(doc.aliases).toEqual(['addch', 'waddch']);
    expect(man(['.TH x 1', '.SH DESCRIPTION', 'No NAME here.']).aliases).toEqual([]);
  });

  it('turns troff escapes into plain text', () => {
    expect(troffToPlain('\\fBbold\\fR \\-\\-flag \\(em x\\&y')).toBe('bold --flag — xy');
    expect(troffToPlain('\\fIiasl\\fR\\|(8), a\\^b\\/c')).toBe('iasl(8), abc');
  });
});
