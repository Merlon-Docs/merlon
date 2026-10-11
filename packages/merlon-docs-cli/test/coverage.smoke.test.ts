import { describe, it, expect } from 'vitest';
import { spawnSync } from 'node:child_process';
import { join, dirname } from 'node:path';
import { fileURLToPath } from 'node:url';
import { mkdtempSync, mkdirSync, writeFileSync, rmSync } from 'node:fs';
import { tmpdir } from 'node:os';

const __dirname = dirname(fileURLToPath(import.meta.url));
const CLI = join(__dirname, '../dist/cli.js');

/**
 * Project fixture: one guide `g`, a monolith output target `guides.md`, a
 * standalone `SECURITY.md`, and an uncaptured `stray.md`.
 */
function writeCoverageFixture(extra: Record<string, unknown> = {}): string {
  const project = mkdtempSync(join(tmpdir(), 'merlon-coverage-cli-'));
  const guide = join(project, 'g');
  mkdirSync(guide, { recursive: true });
  writeFileSync(join(guide, 'index.md'), '# G\n\n- [section](section.md)\n');
  writeFileSync(join(guide, 'section.md'), '# G\n\n## Hello\n');
  writeFileSync(join(project, 'SECURITY.md'), '# Security policy\n');
  writeFileSync(join(project, 'stray.md'), '# Stray\n\nNot captured by any guide.\n');
  writeFileSync(join(project, 'guides.md'), '# G\n');
  writeFileSync(
    join(project, 'merlon.config.json'),
    JSON.stringify({
      outputDir: '.',
      outputFile: 'guides.md',
      compileOrder: ['g'],
      guides: [{ name: 'g', path: 'g' }],
      standaloneGuides: ['SECURITY.md'],
      scan: { gitignore: false },
      refs: { registryFile: 'refs.json' },
      lint: { links: { enabled: false } },
      ...extra,
    }),
  );
  return project;
}

describe('merlon check coverage', () => {
  it('prints uncaptured paths as a non-fatal warning and still exits 0', () => {
    const project = writeCoverageFixture();
    try {
      const r = spawnSync(
        'node',
        [CLI, 'check', '--config', 'merlon.config.json', '--docs-root', '.', '--skip-vale'],
        { encoding: 'utf-8', cwd: project },
      );
      expect(r.status).toBe(0);
      expect(r.stdout).toContain('merlon check passed');
      const combined = `${r.stdout}${r.stderr}`;
      expect(combined).toContain('uncaptured: stray.md');
      expect(combined).toMatch(/coverage: \d+ uncaptured/);
      expect(combined).toContain('non-fatal');
    } finally {
      rmSync(project, { recursive: true, force: true });
    }
  });

  it('fails check when scan.strict and uncaptured files exist', () => {
    const project = writeCoverageFixture({ scan: { gitignore: false, strict: true } });
    try {
      const r = spawnSync(
        'node',
        [CLI, 'check', '--config', 'merlon.config.json', '--docs-root', '.', '--skip-vale'],
        { encoding: 'utf-8', cwd: project },
      );
      expect(r.status).toBe(1);
      expect(`${r.stdout}${r.stderr}`).toContain('uncaptured: stray.md');
      expect(`${r.stdout}${r.stderr}`).toContain('merlon check failed: coverage gaps');
    } finally {
      rmSync(project, { recursive: true, force: true });
    }
  });

  it('reports missing standaloneGuides entries without failing check by default', () => {
    const project = writeCoverageFixture({
      standaloneGuides: ['SECURITY.md', 'does-not-exist.md'],
    });
    try {
      const r = spawnSync(
        'node',
        [CLI, 'check', '--config', 'merlon.config.json', '--docs-root', '.', '--skip-vale'],
        { encoding: 'utf-8', cwd: project },
      );
      expect(r.status).toBe(0);
      expect(`${r.stdout}${r.stderr}`).toContain('missing-standalone: does-not-exist.md');
    } finally {
      rmSync(project, { recursive: true, force: true });
    }
  });

  it('captures compile.scopeRoot trees as accounted for', () => {
    const project = mkdtempSync(join(tmpdir(), 'merlon-coverage-scope-'));
    try {
      mkdirSync(join(project, 'g'), { recursive: true });
      mkdirSync(join(project, 'shared'), { recursive: true });
      writeFileSync(join(project, 'g', 'index.md'), '# G\n\n- [section](section.md)\n');
      writeFileSync(join(project, 'g', 'section.md'), '# G\n\n## Hello\n');
      writeFileSync(join(project, 'shared', 'term.md'), '# Term\n');
      writeFileSync(join(project, 'guides.md'), '# G\n');
      writeFileSync(
        join(project, 'merlon.config.json'),
        JSON.stringify({
          outputDir: '.',
          outputFile: 'guides.md',
          compileOrder: ['g'],
          guides: [{ name: 'g', path: 'g', compile: { scopeRoot: 'shared' } }],
          scan: { gitignore: false, strict: true },
          refs: { registryFile: 'refs.json' },
          lint: { links: { enabled: false } },
        }),
      );
      const r = spawnSync(
        'node',
        [CLI, 'check', '--config', 'merlon.config.json', '--docs-root', '.', '--skip-vale'],
        { encoding: 'utf-8', cwd: project },
      );
      expect(r.status).toBe(0);
      expect(r.stdout).toContain('merlon check passed');
      expect(`${r.stdout}${r.stderr}`).not.toContain('uncaptured: shared/term.md');
    } finally {
      rmSync(project, { recursive: true, force: true });
    }
  });
});
