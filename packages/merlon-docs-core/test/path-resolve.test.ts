import { describe, it, expect } from 'vitest';
import { mkdirSync, writeFileSync } from 'node:fs';
import { join } from 'node:path';
import { resolveRelativeFile, readTextFileAt } from '../src/compile/hooks/path-resolve.js';
import { useTmpDir, withCwd } from './helpers/tmp-dir.js';

describe('hook path resolution', () => {
  const work = useTmpDir('merlon-path-');

  it('resolveRelativeFile checks guide dir, parent, and search roots', () => {
    const guideDir = join(work.path, 'review', 'technical');
    const sharedDir = join(work.path, 'shared');
    mkdirSync(guideDir, { recursive: true });
    mkdirSync(sharedDir, { recursive: true });
    writeFileSync(join(guideDir, 'local.md'), 'local');
    writeFileSync(join(sharedDir, 'shared.md'), 'shared');

    expect(resolveRelativeFile('local.md', guideDir)).toContain('local.md');

    const nestedDir = join(guideDir, 'nested');
    mkdirSync(nestedDir, { recursive: true });
    expect(resolveRelativeFile('../local.md', nestedDir)).toContain('local.md');

    withCwd(work.path, () => {
      expect(resolveRelativeFile('shared.md', guideDir, [join(work.path, 'shared')])).toContain(
        'shared.md',
      );
    });
  });

  it('readTextFileAt returns trimmed file contents', () => {
    const guideDir = join(work.path, 'guide');
    mkdirSync(guideDir, { recursive: true });
    writeFileSync(join(guideDir, 'diagram.md'), '\n| A | B |\n\n');
    expect(readTextFileAt('diagram.md', guideDir)).toBe('| A | B |');
  });
});
