import { describe, it, expect } from 'vitest';
import { mkdirSync, writeFileSync } from 'node:fs';
import { dirname, join } from 'node:path';
import {
  checkSourceDocs,
  formatSourceIssue,
  globToRegExp,
  manQuietToRegExps,
} from '../../src/check/sources.js';
import { manReader } from '../../src/source/man/reader.js';
import { gfmReader } from '../../src/source/gfm/reader.js';
import type { SourceDoc } from '../../src/source/model.js';
import { useTmpDir } from '../helpers/tmp-dir.js';

describe('checkSourceDocs on GFM documents', () => {
  const work = useTmpDir('merlon-source-check-');

  function tree(files: Record<string, string>): { root: string; docs: SourceDoc[] } {
    const root = join(work.path, 'docs');
    const docs: SourceDoc[] = [];
    for (const [rel, text] of Object.entries(files)) {
      const abs = join(root, rel);
      mkdirSync(dirname(abs), { recursive: true });
      writeFileSync(abs, text);
      if (rel.endsWith('.md')) docs.push(gfmReader.read(text, { path: abs }));
    }
    return { root, docs };
  }

  it('passes a tree whose links, anchors and manifest all resolve', () => {
    const { root, docs } = tree({
      'index.md': '# Home\n\n- [Setup](setup.md#install)\n- [Top](#home)\n',
      'setup.md': '# Setup\n\n## Install\n\nSee [the image](img.png).\n',
      'img.png': 'png',
    });
    expect(checkSourceDocs({ docs, docsRoot: root, roots: [join(root, 'index.md')] })).toEqual([]);
  });

  it('reports missing files, missing fragments and orphans with file and line', () => {
    const { root, docs } = tree({
      'index.md': '# Home\n\n- [Gone](gone.md)\n- [Setup](setup.md#nope)\n- [Here](#missing)\n',
      'setup.md': '# Setup\n',
      'lonely.md': '# Lonely\n',
    });
    const issues = checkSourceDocs({ docs, docsRoot: root, roots: [join(root, 'index.md')] });
    expect(issues.map(formatSourceIssue)).toEqual([
      'broken-link: index.md:3: table-of-contents entry names a missing file "gone.md"',
      'broken-anchor: index.md:4: no anchor "#nope" in setup.md "setup.md#nope"',
      'broken-anchor: index.md:5: no anchor "#missing" in this document "#missing"',
      'orphan: lonely.md: no table of contents, include or document link reaches this file',
    ]);
  });

  it('counts manifest-hook paths as reachable, and reports no orphans without roots', () => {
    const { root, docs } = tree({ 'index.md': '# Home\n', 'extra.md': '# Extra\n' });
    const roots = [join(root, 'index.md')];
    expect(
      checkSourceDocs({ docs, docsRoot: root, roots, extraReachable: [join(root, 'extra.md')] }),
    ).toEqual([]);
    expect(checkSourceDocs({ docs, docsRoot: root, roots: [] })).toEqual([]);
  });

  it('follows links transitively', () => {
    const { root, docs } = tree({
      'index.md': '# Home\n[A](a/a.md)\n',
      'a/a.md': '# A\n[B](../b.md)\n',
      'b.md': '# B\n',
    });
    expect(checkSourceDocs({ docs, docsRoot: root, roots: [join(root, 'index.md')] })).toEqual([]);
  });
});

describe('globToRegExp', () => {
  it('matches one segment for * and many for **', () => {
    expect(globToRegExp('api/*').test('api/one')).toBe(true);
    expect(globToRegExp('api/*').test('api/one/two')).toBe(false);
    expect(globToRegExp('**/index').test('a/b/index')).toBe(true);
    expect(globToRegExp('**/index').test('index')).toBe(true);
    expect(globToRegExp('v?.x').test('v1.x')).toBe(true);
    expect(globToRegExp('v?.x').test('v1-x')).toBe(false);
  });
});

describe('checkSourceDocs on man page references', () => {
  const work = useTmpDir('merlon-source-man-');

  function pages(files: Record<string, string>): { root: string; docs: SourceDoc[] } {
    const root = join(work.path, 'tools');
    const docs: SourceDoc[] = [];
    for (const [rel, text] of Object.entries(files)) {
      const abs = join(root, rel);
      mkdirSync(dirname(abs), { recursive: true });
      writeFileSync(abs, text);
      docs.push(manReader.read(text, { path: abs }));
    }
    return { root, docs };
  }

  const tree = () =>
    pages({
      'cpupower/cpupower.1':
        '.TH CPUPOWER 1\n.SH "SEE ALSO"\ncpupower-info(1), powertop(8), msr(4)\n',
      'cpupower/cpupower-info.1':
        '.TH CPUPOWER-INFO 1\n.SH "SEE ALSO"\ncpupower(8), dmesg(1), open(2), ssl(3ssl)\n',
    });

  it('follows .so includes from pages, and reports missing and unincluded fragments', () => {
    const { root, docs } = pages({
      'addch.3x':
        '.TH addch 3X\n.so addch/name.3x\n.so common/return-value.3x\n.so addch/gone.3x\n',
      'addch/name.3x': '.SH NAME\naddch \\- add a character\n',
      'common/return-value.3x': '.SH "RETURN VALUE"\nThese functions return OK.\n',
      'addch/stale.3x': '.SH HISTORY\nNo page includes this.\n',
    });
    expect(checkSourceDocs({ docs, docsRoot: root, roots: [] }).map(formatSourceIssue)).toEqual([
      'broken-link: addch.3x:4: include names a missing file "addch/gone.3x"',
      'orphan: addch/stale.3x: no table of contents, include or document link reaches this file',
    ]);
  });

  it('does not count an included fragment as a page that references resolve to', () => {
    const { root, docs } = pages({
      'addch.3x': '.TH addch 3X\n.so addch/name.3x\n.SH "SEE ALSO"\nname(3x)\n',
      'addch/name.3x': '.SH NAME\naddch \\- add a character\n',
    });
    const issues = checkSourceDocs({ docs, docsRoot: root, roots: [], manPages: { quiet: [] } });
    expect(issues.map((i) => i.target)).toEqual(['name(3x)']);
  });

  it('resolves a reference to a name the NAME section lists, whatever the section case', () => {
    const { root, docs } = pages({
      'curs_addch.3x': '.TH curs_addch 3X\n.SH NAME\naddch, waddch \\- add a character\n',
      'curs_attr.3x': '.TH curs_attr 3X\n.SH "SEE ALSO"\nwaddch(3X), curs_addch(3x), wattron(3X)\n',
    });
    const issues = checkSourceDocs({ docs, docsRoot: root, roots: [], manPages: { quiet: [] } });
    expect(issues.map((i) => i.target)).toEqual(['wattron(3X)']);
  });

  it('does not check man page references unless asked', () => {
    const { root, docs } = tree();
    expect(checkSourceDocs({ docs, docsRoot: root, roots: [] })).toEqual([]);
  });

  it('warns on every reference the tree does not have when nothing is quiet', () => {
    const { root, docs } = tree();
    const issues = checkSourceDocs({ docs, docsRoot: root, roots: [], manPages: { quiet: [] } });
    expect(issues.map((i) => i.target)).toEqual([
      'cpupower(8)',
      'dmesg(1)',
      'open(2)',
      'ssl(3ssl)',
      'powertop(8)',
      'msr(4)',
    ]);
    expect(issues.every((i) => i.severity === 'warning')).toBe(true);
  });

  it('quiets the default sections and named pages, but not a section the tree lacks', () => {
    const { root, docs } = tree();
    const issues = checkSourceDocs({
      docs,
      docsRoot: root,
      roots: [],
      manPages: { quiet: ['defaults', 'msr(4)'] },
    });
    expect(issues.map(formatSourceIssue)).toEqual([
      'unresolved-manpage (warning): cpupower/cpupower-info.1:3: no such page in the tree, which has cpupower(1) "cpupower(8)"',
    ]);
  });

  it('reads a quiet entry as a section, a pattern or the defaults', () => {
    const quiets = (entry: string, ref: string) =>
      manQuietToRegExps(entry).some((re) => re.test(ref));
    expect(quiets('3', 'SSL_new(3ssl)')).toBe(true);
    expect(quiets('3', 'x(13)')).toBe(false);
    expect(quiets('*(4)', 'msr(4)')).toBe(true);
    expect(quiets('dmesg(1)', 'xdmesg(1)')).toBe(false);
    expect(['1', '2', '3', '8', '4'].map((sec) => quiets('defaults', `x(${sec})`))).toEqual([
      true,
      true,
      true,
      true,
      false,
    ]);
  });
});
