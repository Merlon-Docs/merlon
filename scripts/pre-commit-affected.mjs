#!/usr/bin/env node
/**
 * Pre-commit checks for the staged files. They must stay fast and work
 * offline: no build, no test run, no network. The pre-push hook and CI run the
 * full gate.
 */
import { execSync } from 'node:child_process';

function stagedFiles() {
  return execSync('git diff --cached --name-only --diff-filter=ACMR', { encoding: 'utf-8' })
    .split('\n')
    .filter(Boolean);
}

function run(cmd) {
  console.log(`> ${cmd}`);
  execSync(cmd, { stdio: 'inherit' });
}

const files = stagedFiles();

// Typecheck each package whose TypeScript changed. Each run takes a few seconds.
for (const name of ['merlon-docs-core', 'merlon-docs-cli']) {
  if (files.some((f) => f.startsWith(`packages/${name}/`) && /\.(ts|mts|cts)$/.test(f))) {
    run(`pnpm --filter @merlon-docs/${name} run typecheck`);
  }
}

if (files.some((f) => f.startsWith('packages/merlon-docs-presets/'))) {
  run('node scripts/validate-presets.mjs');
}
