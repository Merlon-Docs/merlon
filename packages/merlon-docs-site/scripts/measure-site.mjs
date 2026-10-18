#!/usr/bin/env node
/**
 * Measure this repository for the homepage, each time the site is built. Writes two files under
 * .generated/ (gitignored), which src/components/ContextSizes.astro and SiteStatus.astro read:
 *
 *   context-size.csv  scripts/bench-context-size.mjs on the compiled guides: whole guides
 *                     against single shards, in estimated tokens
 *   site-stats.json   the specification's version, and how long
 *                     `merlon check` takes on docs/ here, with the commit and time measured
 *
 * Needs the built CLI and compiled guides, which `pnpm site:prepare` makes. A failing
 * `merlon check` fails the build, so the homepage never shows figures from a broken tree.
 */
import { spawnSync } from 'node:child_process';
import { existsSync, mkdirSync, readFileSync, writeFileSync } from 'node:fs';
import { dirname, join } from 'node:path';
import { performance } from 'node:perf_hooks';
import { fileURLToPath } from 'node:url';

const siteRoot = join(dirname(fileURLToPath(import.meta.url)), '..');
const repoRoot = join(siteRoot, '../..');
const outDir = join(siteRoot, '.generated');
const cli = join(repoRoot, 'packages/merlon-docs-cli/dist/cli.js');
const CHECK_RUNS = 3;

function run(command, args) {
  const result = spawnSync(command, args, { cwd: repoRoot, encoding: 'utf8' });
  if (result.status !== 0) {
    process.stderr.write(`${result.stdout ?? ''}${result.stderr ?? ''}`);
    throw new Error(`${command} ${args.join(' ')} exited with ${result.status}`);
  }
  return result.stdout;
}

function specVersion() {
  const spec = readFileSync(join(repoRoot, 'docs/features/system/merlon-docs-1.0-spec.md'), 'utf8');
  const match = spec.match(/^\*\*Version:\*\* `([^`]+)`$/m);
  if (!match) throw new Error('The specification has no "**Version:** `x.y.z`" line.');
  return match[1];
}

/** The median wall-clock time of `merlon check` on docs/, in seconds. */
function checkSeconds() {
  const times = [];
  for (let i = 0; i < CHECK_RUNS; i++) {
    const start = performance.now();
    run('node', [
      cli,
      'check',
      '--config',
      'docs/merlon.config.json',
      '--docs-root',
      'docs',
      '--skip-vale',
    ]);
    times.push(performance.now() - start);
  }
  times.sort((a, b) => a - b);
  return Math.round(times[Math.floor(times.length / 2)] / 100) / 10;
}

if (!existsSync(cli)) {
  throw new Error('The CLI is not built. Run pnpm site:prepare from the repository root first.');
}
mkdirSync(outDir, { recursive: true });

run('node', ['scripts/bench-context-size.mjs', '--out', join(outDir, 'context-size.csv')]);

const stats = {
  measuredAt: new Date().toISOString(),
  commit: process.env.GITHUB_SHA || run('git', ['rev-parse', 'HEAD']).trim(),
  specVersion: specVersion(),
  checkSeconds: checkSeconds(),
};
writeFileSync(join(outDir, 'site-stats.json'), `${JSON.stringify(stats, null, 2)}\n`);
console.log(`measure-site: wrote ${join(outDir, 'site-stats.json')} and context-size.csv`);
