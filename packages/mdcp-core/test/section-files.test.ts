import { describe, it, expect } from 'vitest';
import { mkdirSync, writeFileSync } from 'node:fs';
import { join, resolve } from 'node:path';
import { sectionFiles, linkedSectionFiles } from '../src/compile/assemble.js';
import { useTmpDir } from './helpers/tmp-dir.js';

describe('sectionFiles', () => {
  const work = useTmpDir('mdcp-sections-');

  it('returns shards in index link order', () => {
    writeFileSync(
      join(work.path, 'index.md'),
      '# Guide\n\n- [One](./01-one.md)\n- [Two](./02-two.md)\n',
    );
    writeFileSync(join(work.path, '01-one.md'), '# One\n');
    writeFileSync(join(work.path, '02-two.md'), '# Two\n');

    const files = sectionFiles(work.path);
    expect(files).toEqual([resolve(work.path, '01-one.md'), resolve(work.path, '02-two.md')]);
  });

  it('limits manifest links to text after sectionsHeading', () => {
    writeFileSync(
      join(work.path, 'index.md'),
      '# Glossary\n\nSee [Preamble](./00-preamble.md).\n\n## Sections\n\n- [One](./01-one.md)\n',
    );
    writeFileSync(join(work.path, '00-preamble.md'), '# P\n');
    writeFileSync(join(work.path, '01-one.md'), '# One\n');

    const files = sectionFiles(work.path, { sectionsHeading: 'Sections' });
    expect(files).toEqual([resolve(work.path, '01-one.md')]);
  });

  it('supports shards.md manifest name', () => {
    writeFileSync(join(work.path, 'shards.md'), '# Shards\n\n- [Alpha](./alpha.md)\n');
    writeFileSync(join(work.path, 'alpha.md'), '# Alpha\n');

    expect(sectionFiles(work.path, { manifest: 'shards.md' })).toEqual([
      resolve(work.path, 'alpha.md'),
    ]);
  });

  it('resolves parent-relative manifest links', () => {
    const child = join(work.path, 'compiled');
    const sibling = join(work.path, 'sibling');
    mkdirSync(child, { recursive: true });
    mkdirSync(sibling, { recursive: true });
    writeFileSync(join(child, 'shards.md'), '# M\n\n- [Doc](../sibling/doc.md)\n');
    writeFileSync(join(sibling, 'doc.md'), '# Doc\n');

    const files = sectionFiles(child, {
      manifest: 'shards.md',
      scopeRoot: work.path,
    });
    expect(files).toEqual([resolve(sibling, 'doc.md')]);
  });

  it('pulls transitive glossary shards with scopeRoot without filtering the guide manifest', () => {
    const guide = join(work.path, 'developer');
    const glossary = join(work.path, 'glossary');
    mkdirSync(guide, { recursive: true });
    mkdirSync(glossary, { recursive: true });
    writeFileSync(
      join(guide, 'index.md'),
      '# Dev\n\n- [About](./about.md)\n- [Glossary](../glossary/index.md)\n',
    );
    writeFileSync(join(guide, 'about.md'), '# About\n');
    writeFileSync(join(glossary, 'index.md'), '# Glossary\n\n- [Term](./term.md)\n');
    writeFileSync(join(glossary, 'term.md'), '# Term\n');

    const files = linkedSectionFiles(guide, { scopeRoot: glossary });
    expect(files).toEqual([
      resolve(guide, 'about.md'),
      resolve(glossary, 'index.md'),
      resolve(glossary, 'term.md'),
    ]);
  });

  // A label runs to its first `]` and a target to its first `)`, across line breaks. A label that
  // holds a `]` before its end isn't a link. The path ends at the last `.md` that the `)` or a
  // `#fragment` follows.
  it('reads manifest links across CRLF and wrapped lines and ends each path at its last .md', () => {
    writeFileSync(
      join(work.path, 'index.md'),
      [
        '# Guide',
        '- [One](./one.md)\r',
        '- [Two\r\nlines](two.md#part)',
        '- [a [b] c](skipped.md)',
        '- [Three](three.md.md) and \\[Four](four.md#x.md)',
        '- [Five](#five) [Gone](#gone) [Toc](#table-of-contents) [Six](six.md#)',
        '',
      ].join('\n'),
    );
    for (const name of ['one', 'two', 'skipped', 'three.md', 'four', 'five', 'six']) {
      writeFileSync(join(work.path, `${name}.md`), `# ${name}\n`);
    }

    expect(sectionFiles(work.path)).toEqual(
      ['one', 'two', 'three.md', 'four', 'six', 'five'].map((n) => resolve(work.path, `${n}.md`)),
    );
  });

  it('follows shard links that span lines or sit in a CRLF shard', () => {
    writeFileSync(join(work.path, 'index.md'), '# Guide\r\n\r\n- [A](a.md)\r\n');
    writeFileSync(join(work.path, 'a.md'), '# A\r\n\r\nSee [the\r\nnext](b.md#top).\r\n');
    writeFileSync(join(work.path, 'b.md'), '# B\n\nSee [c](\nc.md) and [d](d.md#)\n');
    writeFileSync(join(work.path, 'c.md'), '# C\n');
    writeFileSync(join(work.path, 'd.md'), '# D\n');

    expect(linkedSectionFiles(work.path)).toEqual(
      ['a', 'b', 'd'].map((n) => resolve(work.path, `${n}.md`)),
    );
  });
});
