#!/usr/bin/env node
/**
 * Pre-push hook: runs the checks CI and the land gate run, on the commit being
 * pushed. It may take minutes and may use the network (`pnpm audit`, the
 * Alloy download). The pre-commit hook stays fast and offline.
 *
 * Git passes the remote name as the first argument and one line per pushed ref
 * on stdin: `<local ref> <local sha> <remote ref> <remote sha>`.
 * `git push --no-verify` skips the hook. CI still runs every check.
 */
import { execSync } from 'node:child_process';
import { readFileSync } from 'node:fs';
import { pathToFileURL } from 'node:url';

const ZERO = /^0+$/;

/** The checks the land gate runs, in its order. Formal models run only when they change. */
export const GATE_COMMANDS = [
  'pnpm run verify:peers',
  'pnpm audit --audit-level=high',
  'pnpm run typecheck',
  'pnpm run lint',
  'pnpm run format:check',
  'pnpm run build',
  'pnpm run test',
  'pnpm run skill:validate',
  'pnpm run prepare:docs',
  'pnpm run docs:check',
  'pnpm run docs:compile',
  'git diff --exit-code',
];

export const FORMAL_PATHS = ['formal', 'scripts/formal-check.mjs', 'scripts/lib/alloy-receipt.mjs'];

export const CHANGESET_COMMANDS = ['pnpm changeset:reject-major', 'pnpm changeset:status'];

/** Branch commits being pushed. Deletions and tags are skipped. */
export function pushedBranchShas(stdin) {
  return stdin
    .split('\n')
    .map((line) => line.trim().split(/\s+/))
    .filter(
      (parts) => parts.length === 4 && parts[0].startsWith('refs/heads/') && !ZERO.test(parts[1]),
    )
    .map((parts) => parts[1]);
}

function sh(cmd) {
  return execSync(cmd, { encoding: 'utf8', stdio: ['ignore', 'pipe', 'ignore'] }).trim();
}

function trySh(cmd) {
  try {
    return sh(cmd);
  } catch {
    return '';
  }
}

function run(cmd, env = process.env) {
  console.log(`> ${cmd}`);
  execSync(cmd, { stdio: 'inherit', env });
}

function fail(message) {
  console.error(`pre-push: ${message}`);
  console.error('pre-push: `git push --no-verify` skips this hook, and CI runs the same checks.');
  process.exit(1);
}

function main() {
  const remote = process.argv[2] || 'origin';
  const shas = pushedBranchShas(readFileSync(0, 'utf8'));
  if (shas.length === 0) return;

  const head = sh('git rev-parse HEAD');
  if (shas.some((sha) => sha !== head)) {
    fail(
      `the checks run on HEAD (${head.slice(0, 7)}), so check out the branch you are pushing first.`,
    );
  }
  if (trySh('git status --porcelain --untracked-files=no') !== '') {
    fail('commit or stash your changes first, so the checks see the commit you are pushing.');
  }

  for (const cmd of GATE_COMMANDS) run(cmd);

  trySh(`git fetch --quiet ${remote} develop`);
  const base = trySh(`git merge-base HEAD ${remote}/develop`);
  if (!base) {
    console.warn(
      `pre-push: no ${remote}/develop to compare with, so the changeset and formal checks are skipped.`,
    );
    return;
  }
  if (trySh(`git diff --name-only ${base} HEAD -- ${FORMAL_PATHS.join(' ')}`) !== '') {
    run('pnpm formal:check');
  }
  for (const cmd of CHANGESET_COMMANDS) run(cmd, { ...process.env, CHANGESET_SINCE: base });
}

if (import.meta.url === pathToFileURL(process.argv[1]).href) {
  main();
}
