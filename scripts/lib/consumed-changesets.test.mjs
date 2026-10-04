import assert from 'node:assert/strict';
import { execFileSync } from 'node:child_process';
import { mkdirSync, mkdtempSync, rmSync, writeFileSync } from 'node:fs';
import { tmpdir } from 'node:os';
import { dirname, join } from 'node:path';
import { after, describe, it } from 'node:test';
import { consumedChangesets } from './consumed-changesets.mjs';

const dirs = [];
after(() => {
  for (const dir of dirs) rmSync(dir, { recursive: true, force: true });
});

/** A throwaway repository with helpers to write, delete and commit files. */
function repo() {
  const cwd = mkdtempSync(join(tmpdir(), 'consumed-changesets-'));
  dirs.push(cwd);
  const env = {
    ...process.env,
    GIT_AUTHOR_NAME: 'test',
    GIT_AUTHOR_EMAIL: 'test@example.invalid',
    GIT_COMMITTER_NAME: 'test',
    GIT_COMMITTER_EMAIL: 'test@example.invalid',
  };
  const git = (...args) =>
    execFileSync('git', ['-c', 'commit.gpgsign=false', ...args], {
      cwd,
      env,
      encoding: 'utf8',
    }).trim();
  const write = (path, text) => {
    mkdirSync(dirname(join(cwd, path)), { recursive: true });
    writeFileSync(join(cwd, path), text);
  };
  const commit = (message) => {
    git('add', '-A');
    git('commit', '-q', '-m', message);
    return git('rev-parse', 'HEAD');
  };
  git('init', '-q', '-b', 'main');
  write('.changeset/README.md', 'Changesets.\n');
  write('packages/core/package.json', '{ "name": "core", "version": "0.1.0" }\n');
  write('packages/core/CHANGELOG.md', '# core\n');
  write('packages/core/src/index.ts', 'export {};\n');
  write('packages/cli/src/index.ts', 'export {};\n');
  const release = commit('chore: release');
  return { cwd, git, write, commit, release };
}

const changeset = (pkg) => `---\n"${pkg}": patch\n---\n\nA change.\n`;

describe('consumedChangesets', () => {
  it('finds nothing when no changeset was deleted', () => {
    const r = repo();
    r.write('packages/core/src/index.ts', 'export const a = 1;\n');
    r.write('.changeset/core-work.md', changeset('core'));
    r.commit('feat: core work');
    assert.deepEqual(consumedChangesets(r.release, { cwd: r.cwd }), []);
  });

  it('finds a pending changeset that a release commit deleted', () => {
    const r = repo();
    r.write('packages/core/src/index.ts', 'export const a = 1;\n');
    r.write('.changeset/core-work.md', changeset('core'));
    const develop = r.commit('feat: core work');
    r.git('rm', '-q', '.changeset/core-work.md');
    r.write('packages/core/package.json', '{ "name": "core", "version": "0.1.1" }\n');
    r.write('packages/core/CHANGELOG.md', '# core\n\n## 0.1.1\n\n- A change.\n');
    r.commit('chore: release');
    assert.deepEqual(consumedChangesets(develop, { cwd: r.cwd }), ['.changeset/core-work.md']);
  });

  it('finds a hotfix changeset that main added and released without develop seeing it', () => {
    // develop: work since the last release, with its own changeset.
    const r = repo();
    r.git('checkout', '-q', '-b', 'develop');
    r.write('packages/cli/src/index.ts', 'export const b = 2;\n');
    r.write('.changeset/cli-work.md', changeset('cli'));
    const develop = r.commit('feat: cli work');
    // main: a hotfix with its changeset, then the release commit that consumes it.
    r.git('checkout', '-q', 'main');
    r.write('packages/core/src/index.ts', 'export const fixed = true;\n');
    r.write('.changeset/hotfix.md', changeset('core'));
    r.commit('fix: hotfix');
    r.git('rm', '-q', '.changeset/hotfix.md');
    r.write('packages/core/package.json', '{ "name": "core", "version": "0.1.1" }\n');
    r.write('packages/core/CHANGELOG.md', '# core\n\n## 0.1.1\n\n- A change.\n');
    r.commit('chore: release');
    // The sync merges main into the develop that never received the hotfix.
    r.git('checkout', '-q', 'develop');
    r.git('merge', '-q', '--no-edit', 'main', '-m', 'chore: sync main into develop');
    assert.deepEqual(consumedChangesets(develop, { cwd: r.cwd }), ['.changeset/hotfix.md']);
  });

  it('ignores a changeset that a branch added and then deleted without a release', () => {
    const r = repo();
    r.write('packages/core/src/index.ts', 'export const a = 1;\n');
    r.write('.changeset/core-work.md', changeset('core'));
    r.commit('feat: core work');
    r.git('rm', '-q', '.changeset/core-work.md');
    r.commit('chore: drop the changeset');
    assert.deepEqual(consumedChangesets(r.release, { cwd: r.cwd }), []);
  });

  it('ignores a deleted README.md', () => {
    const r = repo();
    r.git('rm', '-q', '.changeset/README.md');
    r.write('packages/core/CHANGELOG.md', '# core\n\n## 0.1.1\n');
    r.commit('chore: release');
    assert.deepEqual(consumedChangesets(r.release, { cwd: r.cwd }), []);
  });
});
