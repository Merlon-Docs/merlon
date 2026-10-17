import assert from 'node:assert/strict';
import { mkdtemp, mkdir, writeFile, rm } from 'node:fs/promises';
import { tmpdir } from 'node:os';
import path from 'node:path';
import { describe, it, after } from 'node:test';
import { formatCoverageJobSummary } from './coverage-job-summary.mjs';

describe('formatCoverageJobSummary', () => {
  it('renders a markdown table for each package summary', async () => {
    const root = await mkdtemp(path.join(tmpdir(), 'cov-sum-'));
    after(async () => {
      await rm(root, { recursive: true, force: true });
    });

    const coreDir = path.join(root, 'core');
    const cliDir = path.join(root, 'cli');
    await mkdir(coreDir);
    await mkdir(cliDir);

    await writeFile(
      path.join(coreDir, 'coverage-summary.json'),
      JSON.stringify({
        total: {
          statements: { pct: 80.1 },
          branches: { pct: 70 },
          functions: { pct: 90.25 },
          lines: { pct: 81 },
        },
      }),
    );
    await writeFile(
      path.join(cliDir, 'coverage-summary.json'),
      JSON.stringify({
        total: {
          statements: { pct: 60 },
          branches: { pct: 50.5 },
          functions: { pct: 55 },
          lines: { pct: 61.1 },
        },
      }),
    );

    const md = await formatCoverageJobSummary([
      { name: 'merlon-docs-core', summaryPath: path.join(coreDir, 'coverage-summary.json') },
      { name: 'merlon-docs-cli', summaryPath: path.join(cliDir, 'coverage-summary.json') },
    ]);

    assert.match(md, /## Package code coverage/);
    assert.match(md, /\| Package \| Statements \| Branches \| Functions \| Lines \|/);
    assert.match(md, /\| merlon-docs-core \| 80\.1% \| 70% \| 90\.25% \| 81% \|/);
    assert.match(md, /\| merlon-docs-cli \| 60% \| 50\.5% \| 55% \| 61\.1% \|/);
  });

  it('emits n/a for missing or unreadable summaries, but succeeds if at least one works', async () => {
    const root = await mkdtemp(path.join(tmpdir(), 'cov-sum-'));
    after(async () => {
      await rm(root, { recursive: true, force: true });
    });

    const coreDir = path.join(root, 'core');
    await mkdir(coreDir);

    await writeFile(
      path.join(coreDir, 'coverage-summary.json'),
      JSON.stringify({
        total: {
          statements: { pct: 80.1 },
          branches: { pct: 70 },
          functions: { pct: 90.25 },
          lines: { pct: 81 },
        },
      }),
    );

    const md = await formatCoverageJobSummary([
      { name: 'merlon-docs-core', summaryPath: path.join(coreDir, 'coverage-summary.json') },
      { name: 'merlon-docs-cli', summaryPath: path.join(root, 'missing', 'coverage-summary.json') },
    ]);

    assert.match(md, /\| merlon-docs-core \| 80\.1% \| 70% \| 90\.25% \| 81% \|/);
    assert.match(md, /\| merlon-docs-cli \| n\/a \| n\/a \| n\/a \| n\/a \|/);
  });

  it('throws an error if all packages fail', async () => {
    await assert.rejects(
      formatCoverageJobSummary([
        { name: 'merlon-docs-core', summaryPath: 'does-not-exist.json' },
        { name: 'merlon-docs-cli', summaryPath: 'also-does-not-exist.json' },
      ]),
      /All packages failed to provide coverage summaries/,
    );
  });
});
