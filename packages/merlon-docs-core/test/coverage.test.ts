import { describe, it, expect } from 'vitest';
import { mkdirSync, writeFileSync } from 'node:fs';
import { join, dirname } from 'node:path';
import { computeCoverage } from '../src/validate/coverage.js';
import { useTmpDir } from './helpers/tmp-dir.js';

describe('computeCoverage', () => {
  const work = useTmpDir('merlon-coverage-');

  function write(rel: string, body = '# Doc\n'): string {
    const abs = join(work.path, rel);
    mkdirSync(dirname(abs), { recursive: true });
    writeFileSync(abs, body);
    return abs;
  }

  /** Baseline tree: one guide, one output target, standalone files, and a stray. */
  function setup() {
    write('guide/index.md', '# G\n\n- [a](./a.md)\n');
    write('guide/a.md');
    write('README.md'); // guide output target
    write('packages/x/README.md'); // standalone glob match
    write('SECURITY.md'); // standalone exact match
    write('stray.md'); // uncaptured
    return {
      root: work.path,
      guideDirs: [join(work.path, 'guide')],
      outputFiles: [join(work.path, 'README.md')],
      standaloneGuides: ['packages/*/README.md', 'SECURITY.md'],
      ignore: [],
      gitignore: true,
    };
  }

  it('captures shards inside a guide directory subtree', () => {
    const result = computeCoverage(setup());
    expect(result.captured).toContain('guide/index.md');
    expect(result.captured).toContain('guide/a.md');
    expect(result.uncaptured).not.toContain('guide/a.md');
  });

  it('captures a guide output target', () => {
    const result = computeCoverage(setup());
    expect(result.captured).toContain('README.md');
    expect(result.uncaptured).not.toContain('README.md');
  });

  it('captures standaloneGuides entries including glob matches', () => {
    const result = computeCoverage(setup());
    expect(result.captured).toContain('SECURITY.md');
    expect(result.captured).toContain('packages/x/README.md');
    expect(result.standalone).toEqual(['SECURITY.md', 'packages/x/README.md']);
  });

  it('reports a markdown file no guide accounts for as uncaptured', () => {
    const result = computeCoverage(setup());
    expect(result.uncaptured).toContain('stray.md');
    expect(result.captured).not.toContain('stray.md');
  });

  it('sorts, de-dupes, and uses POSIX root-relative paths', () => {
    const result = computeCoverage(setup());
    expect(result.captured).toEqual([...result.captured].sort());
    expect(result.uncaptured).toEqual([...result.uncaptured].sort());
    expect(new Set(result.captured).size).toBe(result.captured.length);
    expect(result.captured.every((p) => !p.includes('\\'))).toBe(true);
  });

  it('honors .gitignore by default', () => {
    const opts = setup();
    write('.git'); // mark repo root (file or dir both count)
    write('.gitignore', 'dist/\n');
    write('dist/generated.md');
    const result = computeCoverage(opts);
    expect(result.uncaptured).not.toContain('dist/generated.md');
    expect(result.captured).not.toContain('dist/generated.md');
  });

  it('walks up from scan.root to honor an ancestor repository .gitignore', () => {
    write('.git');
    write('.gitignore', '.caches/\n');
    write('docs/guide/index.md');
    write('docs/.caches/mdcp/prompts/legacy.prompt.md');
    write('docs/stray.md');
    const result = computeCoverage({
      root: join(work.path, 'docs'),
      guideDirs: [join(work.path, 'docs/guide')],
      outputFiles: [],
      standaloneGuides: [],
      ignore: [],
      gitignore: true,
    });
    expect(result.uncaptured).not.toContain('.caches/mdcp/prompts/legacy.prompt.md');
    expect(result.uncaptured).toContain('stray.md');
    expect(result.captured).toContain('guide/index.md');
  });

  it('does not walk above scan.root for .gitignore when not inside a git repo', () => {
    // Parent has a .gitignore but no .git — must not escape the project root.
    write('.gitignore', '.caches/\n');
    write('docs/guide/index.md');
    write('docs/.caches/mdcp/prompts/legacy.prompt.md');
    write('docs/stray.md');
    const result = computeCoverage({
      root: join(work.path, 'docs'),
      guideDirs: [join(work.path, 'docs/guide')],
      outputFiles: [],
      standaloneGuides: [],
      ignore: [],
      gitignore: true,
    });
    expect(result.uncaptured).toContain('.caches/mdcp/prompts/legacy.prompt.md');
    expect(result.uncaptured).toContain('stray.md');
  });

  it('still honors .gitignore at scan.root when not inside a git repo', () => {
    write('.gitignore', 'dist/\n');
    write('dist/generated.md');
    write('guide/index.md');
    const result = computeCoverage({
      root: work.path,
      guideDirs: [join(work.path, 'guide')],
      outputFiles: [],
      standaloneGuides: [],
      ignore: [],
      gitignore: true,
    });
    expect(result.uncaptured).not.toContain('dist/generated.md');
  });

  it('does not honor .gitignore when gitignore is false', () => {
    const opts = { ...setup(), gitignore: false };
    write('.gitignore', 'dist/\n');
    write('dist/generated.md');
    const result = computeCoverage(opts);
    expect(result.uncaptured).toContain('dist/generated.md');
  });

  it('always skips built-in .git, node_modules, and .agents', () => {
    const opts = setup();
    write('node_modules/dep/readme.md');
    write('.git/hooks/note.md');
    write('.agents/skills/s.md');
    const result = computeCoverage({ ...opts, gitignore: false });
    const all = [...result.captured, ...result.uncaptured];
    expect(all.some((p) => p.startsWith('node_modules/'))).toBe(false);
    expect(all.some((p) => p.startsWith('.git/'))).toBe(false);
    expect(all.some((p) => p.startsWith('.agents/'))).toBe(false);
  });

  it('extends skips via scan.ignore', () => {
    const opts = setup();
    write('legacy/old.md');
    const withoutIgnore = computeCoverage(opts);
    expect(withoutIgnore.uncaptured).toContain('legacy/old.md');
    const withIgnore = computeCoverage({ ...opts, ignore: ['legacy/**'] });
    expect(withIgnore.uncaptured).not.toContain('legacy/old.md');
  });

  it('reports a standaloneGuides entry matching no file as missing', () => {
    const opts = { ...setup(), standaloneGuides: ['does-not-exist.md', 'SECURITY.md'] };
    const result = computeCoverage(opts);
    expect(result.missingStandalone).toEqual(['does-not-exist.md']);
    expect(result.standalone).toEqual(['SECURITY.md']);
  });
});
