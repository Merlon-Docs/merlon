import { describe, it, expect } from 'vitest';
import { mkdirSync, writeFileSync } from 'node:fs';
import { join, resolve } from 'node:path';
import { sectionFiles, assembleGuide, compileGuides } from '../src/compile/assemble.js';
import { useTmpDir } from './helpers/tmp-dir.js';

describe('shard round-trip', () => {
  const work = useTmpDir('merlon-roundtrip-');

  it('manifest link order survives compile', () => {
    const guide = join(work.path, 'mini');
    mkdirSync(guide, { recursive: true });
    writeFileSync(join(guide, 'index.md'), '# Mini\n\n- [a](./a.md)\n- [b](./b.md)\n');
    writeFileSync(join(guide, 'a.md'), '# Part A\n\nAlpha.\n');
    writeFileSync(join(guide, 'b.md'), '# Part B\n\nBeta.\n');

    expect(sectionFiles(guide)).toEqual([resolve(guide, 'a.md'), resolve(guide, 'b.md')]);
    const compiled = assembleGuide(guide);
    expect(compiled).toContain('Part A');
    expect(compiled).toContain('Part B');
    expect(compiled).toMatch(/^# Mini/m);
  });

  it('compileGuides writes expected structure for multi-guide fixture', () => {
    const fixture = join(work.path, 'fixture');
    const overview = join(fixture, 'overview');
    mkdirSync(overview, { recursive: true });
    writeFileSync(join(overview, 'index.md'), '# Overview\n\n- [intro](./intro.md)\n');
    writeFileSync(join(overview, 'intro.md'), '# Intro\n\nText.\n');

    const out = compileGuides({
      guidesRoot: fixture,
      compileOrder: ['overview'],
    });
    expect(out).toContain('# Overview');
    expect(out).toContain('Intro');
  });
});

describe('peers', () => {
  it('findPeerBinary returns structured result', async () => {
    const { findPeerBinary } = await import('../src/peers/resolve.js');
    const tool = findPeerBinary('nonexistent-merlon-tool-xyz', process.cwd());
    expect(tool.found).toBe(false);
    expect(tool.source).toBe('none');
  });
});
