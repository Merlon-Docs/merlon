import { describe, it, expect } from 'vitest';
import { mkdirSync, writeFileSync } from 'node:fs';
import { join, relative, resolve } from 'node:path';
import { checkOrphansForGuides } from '../src/validate/orphans.js';
import { sectionFiles } from '../src/compile/assemble.js';
import { useTmpDir } from './helpers/tmp-dir.js';

describe('checkOrphansForGuides', () => {
  const work = useTmpDir('mdcp-orphans-');

  function setup() {
    const guide = join(work.path, 'guide');
    mkdirSync(guide, { recursive: true });
    writeFileSync(join(guide, 'index.md'), '# G\n\n- [a](./a.md)\n');
    writeFileSync(join(guide, 'a.md'), '# A\n');
    return guide;
  }

  it('returns no issues for consistent tree', () => {
    const guide = setup();
    const issues = checkOrphansForGuides([{ name: 'guide', dir: guide }]);
    expect(issues).toEqual([]);
  });

  it('detects orphan shard', () => {
    const guide = setup();
    writeFileSync(join(guide, 'orphan.md'), '# Orphan\n');
    const issues = checkOrphansForGuides([{ name: 'guide', dir: guide }]);
    expect(issues.some((i) => i.type === 'orphan_shard')).toBe(true);
  });

  it('detects missing guide directory', () => {
    const issues = checkOrphansForGuides([{ name: 'missing', dir: join(work.path, 'nope') }]);
    expect(issues.some((i) => i.type === 'missing_guide')).toBe(true);
  });

  it('detects broken manifest entry', () => {
    const guide = setup();
    writeFileSync(join(guide, 'index.md'), '# G\n\n- [missing](./missing.md)\n');
    const issues = checkOrphansForGuides([{ name: 'guide', dir: guide }]);
    expect(issues.some((i) => i.type === 'broken_manifest')).toBe(true);
  });

  it('reports an orphan beside a nested shard of the same name when dir is relative', () => {
    // The manifest links sub/a.md and a.md sits unlisted at the guide top level. A relative
    // dir never prefixes the absolute shard paths from sectionFiles, so the nested shard was
    // keyed as guide/a.md and hid the orphan.
    const guide = join(work.path, 'guide');
    mkdirSync(join(guide, 'sub'), { recursive: true });
    writeFileSync(join(guide, 'index.md'), '# G\n\n- [a](./sub/a.md)\n');
    writeFileSync(join(guide, 'sub', 'a.md'), '# Nested A\n');
    writeFileSync(join(guide, 'a.md'), '# Top A\n');
    const dir = relative(process.cwd(), guide);
    const issues = checkOrphansForGuides([{ name: 'guide', dir }]);
    expect(issues.map((i) => [i.type, i.message])).toEqual([
      ['orphan_shard', `Orphaned shard not in sections manifest: ${join('guide', 'a.md')}`],
    ]);
  });

  it('keys a shard in a sibling dir whose name extends the guide name like any outside shard', () => {
    // guide reaches ../guide-shared/x.md through scopeRoot. A prefix test without a separator
    // read that file as inside guide and keyed it guide-shared/x.md, which hid the orphan x.md
    // in the guide-shared guide. A sibling with any other name, such as shared, reports it.
    for (const sibling of ['guide-shared', 'shared']) {
      const root = join(work.path, sibling);
      const guide = join(root, 'guide');
      const other = join(root, sibling);
      mkdirSync(guide, { recursive: true });
      mkdirSync(other, { recursive: true });
      writeFileSync(join(guide, 'index.md'), `# G\n\n- [x](../${sibling}/x.md)\n`);
      writeFileSync(join(other, 'index.md'), '# S\n\n- [y](./y.md)\n');
      writeFileSync(join(other, 'y.md'), '# Y\n');
      writeFileSync(join(other, 'x.md'), '# X\n');
      const issues = checkOrphansForGuides([
        { name: 'guide', dir: guide, scopeRoot: root },
        { name: sibling, dir: other },
      ]);
      expect(issues.map((i) => [i.type, i.message])).toEqual([
        ['orphan_shard', `Orphaned shard not in sections manifest: ${join(sibling, 'x.md')}`],
      ]);
    }
  });

  it('resolves manifest links relative to guide dir', () => {
    const guide = setup();
    expect(sectionFiles(guide)).toEqual([resolve(guide, 'a.md')]);
  });
});
