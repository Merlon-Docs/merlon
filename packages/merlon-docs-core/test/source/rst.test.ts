import { describe, it, expect } from 'vitest';
import { mkdirSync, writeFileSync } from 'node:fs';
import { dirname, join } from 'node:path';
import { checkSourceDocs, formatSourceIssue } from '../../src/check/sources.js';
import { rstReader, rstInlineToPlain } from '../../src/source/rst/reader.js';
import type { SourceDoc } from '../../src/source/model.js';
import { useTmpDir } from '../helpers/tmp-dir.js';

const read = (lines: string[], path = '/docs/process/page.rst') =>
  rstReader.read(lines.join('\n'), { path });

describe('rst reader: titles and sections', () => {
  it('ranks section styles in order of first use, overline and underline apart', () => {
    const doc = read([
      '=====',
      'Title',
      '=====',
      '',
      'Part',
      '====',
      '',
      'Sub part',
      '--------',
      '',
      'Another part',
      '============',
    ]);
    expect(doc.title).toMatchObject({ text: 'Title', level: 1, line: 2 });
    expect(doc.headings.map((h) => [h.text, h.level, h.line])).toEqual([
      ['Title', 1, 2],
      ['Part', 2, 5],
      ['Sub part', 3, 8],
      ['Another part', 2, 11],
    ]);
  });

  it('does not read a transition or a short underline as a section', () => {
    const doc = read(['Para one.', '', '----------', '', 'A long line of prose here', '--']);
    expect(doc.headings).toEqual([]);
  });
});

describe('rst reader: toctrees and includes', () => {
  it('reads ../ entries as entries, not comments', () => {
    const doc = read(['.. toctree::', '   :maxdepth: 1', '', '   ../RCU/index', '   locking']);
    expect(doc.manifest.map((e) => e.target)).toEqual(['../RCU/index', 'locking']);
    expect(doc.isIndex).toBe(true);
  });

  it('groups entries by caption, unwraps titled entries, flags globs, skips self and URLs', () => {
    const doc = read([
      '.. toctree::',
      '   :caption: User guides',
      '   :glob:',
      '',
      '   Admin guide <admin-guide/index>',
      '   /process/index',
      '   api/*',
      '   self',
      '   https://example.com',
      '',
      '.. toctree::',
      '',
      '   other',
    ]);
    expect(doc.manifest).toEqual([
      { target: 'admin-guide/index', line: 5, group: 'in toctree "User guides"', kind: 'toc' },
      { target: '/process/index', line: 6, group: 'in toctree "User guides"', kind: 'toc' },
      { target: 'api/*', line: 7, group: 'in toctree "User guides"', kind: 'toc', glob: true },
      { target: 'other', line: 13, group: 'in uncaptioned toctree at line 11', kind: 'toc' },
    ]);
  });

  it('reads include and literalinclude as include edges', () => {
    const doc = read(['.. include:: ../shared/notice.rst', '', '.. literalinclude:: demo.c']);
    expect(doc.manifest.map((e) => [e.kind, e.target])).toEqual([
      ['include', '../shared/notice.rst'],
      ['include', 'demo.c'],
    ]);
    expect(doc.isIndex).toBe(false);
  });
});

describe('rst reader: labels and refs', () => {
  it('reads indented, list-item and backquoted labels, and :name: options', () => {
    const doc = read([
      '.. _top-label:',
      '',
      '* .. _in_list:',
      '',
      '  Item text.',
      '',
      '.. _`last row`:',
      '',
      '   .. _Indented Label:',
      '',
      '.. figure:: pic.png',
      '   :name: fig-pic',
    ]);
    expect(doc.anchors.filter((a) => a.origin !== 'heading').map((a) => [a.id, a.origin])).toEqual([
      ['top-label', 'label'],
      ['in_list', 'label'],
      ['last row', 'label'],
      ['indented label', 'label'],
      ['fig-pic', 'name'],
    ]);
  });

  it('joins a :ref: whose text wraps across lines and keeps the start line', () => {
    const doc = read([
      'See :ref:`the coding style',
      'rules <codingstyle>` and :ref:`Printing',
      '   Kernel   Messages` too, and :doc:`/process/index`.',
    ]);
    expect(doc.links).toEqual([
      { kind: 'label', target: 'codingstyle', line: 1 },
      { kind: 'label', target: 'printing kernel messages', line: 2 },
      { kind: 'doc', target: '/process/index', line: 3 },
    ]);
  });

  it('ignores roles inside code, comments and literal blocks', () => {
    const doc = read([
      'Use ``:ref:`x``` like this::',
      '',
      '    :ref:`in-literal`',
      '',
      '.. a comment with :ref:`in-comment`',
      '',
      '.. code-block:: rst',
      '',
      '   :doc:`in-code`',
    ]);
    expect(doc.links).toEqual([]);
  });

  it('marks :orphan: documents', () => {
    expect(read([':orphan:', '', 'Title', '=====']).orphanOk).toBe(true);
    expect(read(['Title', '=====', '', ':orphan: is just text here']).orphanOk).toBe(false);
  });
});

describe('rst reader: prose', () => {
  it('turns inline markup into plain text', () => {
    expect(
      rstInlineToPlain(
        'A **bold** *em* ``code`` :ref:`text <lbl>` `link <https://x>`_ word_ |sub| [1]_',
      ),
    ).toBe('A bold em code text link word sub');
  });

  it('keeps admonition bodies as prose and drops directive options and tables', () => {
    const doc = read([
      '.. note::',
      '   :class: wide',
      '',
      '   Keep this sentence in the prose count.',
      '',
      '+-----+-----+',
      '| a   | b   |',
      '+-----+-----+',
      '',
      '===  ===',
      'x    y',
      '===  ===',
    ]);
    expect(doc.paragraphs.map((p) => p.plain)).toEqual(['Keep this sentence in the prose count.']);
  });

  it('splits list items into their own units', () => {
    const doc = read(['- first item', '  continues', '- second item', '#. third']);
    expect(doc.paragraphs.map((p) => [p.line, p.plain])).toEqual([
      [1, 'first item continues'],
      [3, 'second item'],
      [4, 'third'],
    ]);
  });
});

describe('checkSourceDocs on an RST tree', () => {
  const work = useTmpDir('merlon-rst-check-');

  function tree(files: Record<string, string>): { root: string; docs: SourceDoc[] } {
    const root = join(work.path, 'Documentation');
    const docs: SourceDoc[] = [];
    for (const [rel, text] of Object.entries(files)) {
      const abs = join(root, rel);
      mkdirSync(dirname(abs), { recursive: true });
      writeFileSync(abs, text);
      if (rel.endsWith('.rst')) docs.push(rstReader.read(text, { path: abs }));
    }
    return { root, docs };
  }

  it('follows relative, absolute and glob toctree entries, includes, :doc: and :orphan:', () => {
    const { root, docs } = tree({
      'index.rst': '.. toctree::\n   :glob:\n\n   process/index\n   api/*\n',
      'process/index.rst': '.. toctree::\n\n   ../RCU/index\n   /core/index\n',
      'RCU/index.rst': 'RCU\n===\n\n.. include:: shared.rst\n\nSee :doc:`../misc/linked`.\n',
      'RCU/shared.rst': 'Shared text.\n',
      'core/index.rst': 'Core\n====\n',
      'api/one.rst': 'One\n===\n',
      'api/two.rst': 'Two\n===\n',
      'misc/linked.rst': 'Linked\n======\n',
      'misc/standalone.rst': ':orphan:\n\nStandalone\n==========\n',
      'misc/lost.rst': 'Lost\n====\n',
    });
    const issues = checkSourceDocs({ docs, docsRoot: root, roots: [join(root, 'index.rst')] });
    expect(issues.map(formatSourceIssue)).toEqual([
      'orphan: misc/lost.rst: no table of contents, include or document link reaches this file',
    ]);
  });

  it('reports missing toctree entries, includes and :doc: targets', () => {
    const { root, docs } = tree({
      'index.rst': '.. toctree::\n\n   gone\n\n.. include:: nope.rst\n\nSee :doc:`missing`.\n',
    });
    expect(
      checkSourceDocs({ docs, docsRoot: root, roots: [join(root, 'index.rst')] }).map(
        formatSourceIssue,
      ),
    ).toEqual([
      'broken-link: index.rst:3: table-of-contents entry names a missing file "gone"',
      'broken-link: index.rst:5: include names a missing file "nope.rst"',
      'broken-link: index.rst:7: doc link names a missing file "missing"',
    ]);
  });

  it('resolves a :ref: to a label or a :name: option, and reports one that is undefined', () => {
    const { root, docs } = tree({
      'a.rst': '.. _`last row`:\n\nA\n=\n\n.. figure:: x.png\n   :name: fig-x\n',
      'b.rst': 'B\n=\n\nSee :ref:`last row`, :ref:`fig-x` and :ref:`nowhere`.\n',
      'x.png': '',
    });
    expect(checkSourceDocs({ docs, docsRoot: root, roots: [] }).map(formatSourceIssue)).toEqual([
      'undefined-ref: b.rst:4: label is not defined "nowhere"',
    ]);
  });
});
