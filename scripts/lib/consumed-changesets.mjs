/**
 * Changesets that release versioning consumed between a base commit and HEAD.
 *
 * changeset-status.mjs skips its package check when the change being checked
 * consumed changesets, because the release commit that deletes them also bumps
 * the packages they name.
 *
 * Two kinds count. A changeset present at `since` and gone at HEAD is the
 * usual case: develop held it and a release consumed it. A changeset that a
 * release commit in since..HEAD deleted counts too, even when `since` never
 * held it. That happens when the sync merges main into develop after a hotfix
 * and its release while the hotfix's own sync never landed. A release commit
 * is one that deletes a changeset and writes a packages/<name>/CHANGELOG.md,
 * as `changeset version` does, so a branch that adds a changeset and then
 * deletes it still needs one.
 */
import { execFileSync } from 'node:child_process';

const PACKAGE_CHANGELOG = /^packages\/[^/]+\/CHANGELOG\.md$/;

/** @param {string} path */
function isChangesetFile(path) {
  return path.startsWith('.changeset/') && path.endsWith('.md') && !path.endsWith('README.md');
}

/**
 * @param {string[]} args
 * @param {string} cwd
 */
function git(args, cwd) {
  try {
    return execFileSync('git', args, {
      cwd,
      encoding: 'utf8',
      stdio: ['ignore', 'pipe', 'ignore'],
    }).trim();
  } catch {
    return '';
  }
}

/**
 * Changeset files deleted by release commits in since..HEAD. --full-history
 * follows both parents of every merge, so history simplification cannot prune
 * the side that holds the release commit.
 *
 * @param {string} since
 * @param {string} cwd
 * @returns {string[]}
 */
function deletedByReleaseCommits(since, cwd) {
  const log = git(
    [
      'log',
      '--full-history',
      '--no-merges',
      '--no-renames',
      '--format=%x00',
      '--name-status',
      `${since}..HEAD`,
      '--',
      '.changeset/',
      'packages/',
    ],
    cwd,
  );
  return log.split('\0').flatMap((entry) => {
    const changes = entry
      .split('\n')
      .filter(Boolean)
      .map((line) => line.split('\t'));
    const writesChangelog = changes.some(([, path]) => PACKAGE_CHANGELOG.test(path ?? ''));
    if (!writesChangelog) return [];
    return changes
      .filter(([status, path]) => status === 'D' && isChangesetFile(path ?? ''))
      .map(([, path]) => path);
  });
}

/**
 * Changesets that release versioning consumed between `since` and HEAD.
 *
 * @param {string} since
 * @param {{ cwd?: string }} [options]
 * @returns {string[]} repo-relative paths, sorted
 */
export function consumedChangesets(since, { cwd = process.cwd() } = {}) {
  const deleted = git(
    ['diff', '--name-only', '--diff-filter=D', `${since}..HEAD`, '--', '.changeset/'],
    cwd,
  );
  const fromTree = deleted.split('\n').filter(isChangesetFile);
  return [...new Set([...fromTree, ...deletedByReleaseCommits(since, cwd)])].sort();
}
