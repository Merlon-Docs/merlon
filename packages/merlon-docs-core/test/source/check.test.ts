import { describe, it, expect } from 'vitest';
import { mkdirSync, writeFileSync } from 'node:fs';
import { dirname, join } from 'node:path';
import { checkSourceDocs, formatSourceIssue, globToRegExp } from '../../src/check/sources.js';
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
