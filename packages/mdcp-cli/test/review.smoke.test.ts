import { describe, it, expect } from 'vitest';
import { spawnSync } from 'node:child_process';
import { join, dirname } from 'node:path';
import { fileURLToPath } from 'node:url';
import { mkdtempSync, mkdirSync, writeFileSync, rmSync } from 'node:fs';
import { tmpdir } from 'node:os';

const __dirname = dirname(fileURLToPath(import.meta.url));
const CLI = join(__dirname, '../dist/cli.js');

/** Project with docs root `docs/`, one guide `g` holding two shards that share a title. */
function writeReviewFixture(extra: Record<string, unknown> = {}): string {
  const project = mkdtempSync(join(tmpdir(), 'mdcp-review-cli-'));
  const guide = join(project, 'docs', 'g');
  mkdirSync(join(guide, 'drafts'), { recursive: true });
  writeFileSync(
    join(guide, 'index.md'),
    '# G\n\n- [A](./a.md)\n- [B](./b.md)\n- [C](./drafts/c.md)\n',
  );
  writeFileSync(join(guide, 'a.md'), '# Setup\n\nShort body.\n');
  writeFileSync(join(guide, 'b.md'), '# Setup!\n\nAnother body.\n');
  writeFileSync(join(guide, 'drafts', 'c.md'), '# Draft\n\nDraft body.\n');
  writeFileSync(
    join(project, 'docs', 'mdcp.config.json'),
    JSON.stringify({ compileOrder: ['g'], scan: { gitignore: false }, ...extra }),
  );
  return project;
}

function review(project: string, ...flags: string[]) {
  return spawnSync(
    'node',
    [CLI, 'review', '--config', 'docs/mdcp.config.json', '--docs-root', 'docs', ...flags],
    { encoding: 'utf-8', cwd: project },
  );
}

describe('mdcp review', () => {
  it('prints findings grouped by signal and exits 0 by default', () => {
    const project = writeReviewFixture();
    try {
      const r = review(project);
      expect(r.status).toBe(0);
      expect(r.stdout).toContain('similar-titles (1)');
      expect(r.stdout).toContain('  - g/a.md, g/b.md');
      expect(r.stdout).toContain('fix: Merge the shards');
      expect(r.stdout).toContain('mdcp review: 1 finding(s) in 4 shard(s)');
    } finally {
      rmSync(project, { recursive: true, force: true });
    }
  });

  it('exits 1 with --strict when there is a finding', () => {
    const project = writeReviewFixture();
    try {
      expect(review(project, '--strict').status).toBe(1);
    } finally {
      rmSync(project, { recursive: true, force: true });
    }
  });

  it('prints a JSON array with --json and applies config thresholds', () => {
    const project = writeReviewFixture({ review: { maxIndexEntries: 2 } });
    try {
      const r = review(project, '--json');
      expect(r.status).toBe(0);
      const findings = JSON.parse(r.stdout) as { signal: string; files: string[] }[];
      expect(findings.map((f) => f.signal)).toEqual(['index-size', 'similar-titles']);
      expect(findings[0]).toMatchObject({
        severity: 'warning',
        files: ['g/index.md'],
        detail: '3 shard links before any ## heading (limit 2 per group)',
      });
    } finally {
      rmSync(project, { recursive: true, force: true });
    }
  });

  it('reviews one guide with --guide and rejects an unknown name', () => {
    const project = writeReviewFixture();
    try {
      const r = review(project, '--guide', 'g');
      expect(r.status).toBe(0);
      expect(r.stdout).toContain('mdcp review: 1 finding(s) in 4 shard(s)');
      const bad = review(project, '--guide', 'nope');
      expect(bad.status).toBe(1);
      expect(bad.stderr).toContain('Unknown guide "nope". Guides: g');
    } finally {
      rmSync(project, { recursive: true, force: true });
    }
  });

  it('skips scan.ignore paths and passes --strict when clean', () => {
    const project = writeReviewFixture({
      scan: { gitignore: false, ignore: ['docs/g/b.md'] },
    });
    try {
      const r = review(project, '--strict');
      expect(r.status).toBe(0);
      expect(r.stdout.trim()).toBe('mdcp review: no findings in 3 shard(s)');
    } finally {
      rmSync(project, { recursive: true, force: true });
    }
  });
});
