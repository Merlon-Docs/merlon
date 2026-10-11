#!/usr/bin/env node
import { execSync } from 'node:child_process';

function stagedFiles() {
  return execSync('git diff --cached --name-only', { encoding: 'utf-8' })
    .split('\n')
    .filter(Boolean);
}

function run(cmd) {
  console.log(`> ${cmd}`);
  execSync(cmd, { stdio: 'inherit' });
}

function matches(files, prefix) {
  return files.some((f) => f.startsWith(prefix));
}

const files = stagedFiles();
if (files.length === 0) process.exit(0);

const rootConfigChanged = files.some(
  (f) =>
    f === 'package.json' ||
    f === 'pnpm-lock.yaml' ||
    f === 'pnpm-workspace.yaml' ||
    f === 'eslint.config.mjs' ||
    (f.startsWith('tsconfig') && f.endsWith('.json')),
);

let coreBuilt = false;

function ensureCoreBuild() {
  if (!coreBuilt) {
    run('pnpm --filter @merlon-docs/merlon-docs-core run build');
    coreBuilt = true;
  }
}

if (matches(files, 'packages/merlon-docs-core/')) {
  run('pnpm --filter @merlon-docs/merlon-docs-core run typecheck');
  run('pnpm --filter @merlon-docs/merlon-docs-core run build');
  const corePaths = files
    .filter((f) => f.startsWith('packages/merlon-docs-core/'))
    .map((f) => f.slice('packages/merlon-docs-core/'.length));
  if (corePaths.length > 0) {
    run(
      `pnpm --filter @merlon-docs/merlon-docs-core exec vitest related --run ${corePaths.map((p) => `"${p}"`).join(' ')}`,
    );
  }
  coreBuilt = true;
}

if (matches(files, 'packages/merlon-docs-cli/')) {
  ensureCoreBuild();
  run('pnpm --filter @merlon-docs/merlon-docs-cli run typecheck');
  run('pnpm --filter @merlon-docs/merlon-docs-cli run build');
  run('pnpm --filter @merlon-docs/merlon-docs-cli run test');
}

if (matches(files, 'packages/merlon-docs-presets/')) {
  run('node scripts/validate-presets.mjs');
}

const docsChanged =
  matches(files, 'docs/') ||
  files.includes('DEVELOPERS.md') ||
  files.some((f) => /^packages\/[^/]+\/README\.md$/.test(f));

if (docsChanged) {
  ensureCoreBuild();
  run('pnpm --filter @merlon-docs/merlon-docs-cli run build');
  run('pnpm run docs:compile:repo');
  run(
    'node packages/merlon-docs-cli/dist/cli.js check --config docs/merlon.config.json --docs-root docs --require-lint --require-vale --warn-broken-links',
  );
}

if (rootConfigChanged) {
  run('pnpm run typecheck');
  run('pnpm run format:check');
}

// CI runs `pnpm audit --audit-level=high` on every PR. Catch the same gate when
// dependency manifests change — lint-staged / docs checks alone will not.
const lockfileOrManifestChanged = files.some(
  (f) =>
    f === 'package.json' ||
    f === 'pnpm-lock.yaml' ||
    f === 'pnpm-workspace.yaml' ||
    /^packages\/[^/]+\/package\.json$/.test(f),
);

if (lockfileOrManifestChanged) {
  run('pnpm audit --audit-level=high');
}
