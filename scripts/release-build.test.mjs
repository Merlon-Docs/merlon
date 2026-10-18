import assert from 'node:assert/strict';
import { readFileSync } from 'node:fs';
import { join, dirname } from 'node:path';
import { describe, it } from 'node:test';
import { spawnSync } from 'node:child_process';
import { fileURLToPath } from 'node:url';

const root = join(dirname(fileURLToPath(import.meta.url)), '..');

describe('release-build', () => {
  it('dry-run prints build.N bump without writing', () => {
    const result = spawnSync(
      process.execPath,
      ['scripts/release-build.mjs', '--packages', 'merlon-docs-cli', '--dry-run'],
      { cwd: root, encoding: 'utf8' },
    );
    assert.equal(result.status, 0, result.stderr);
    // The release bumps the CLI before it runs the tests, so read the version instead of pinning it.
    const version = JSON.parse(
      readFileSync(join(root, 'packages/merlon-docs-cli/package.json'), 'utf8'),
    ).version;
    assert.ok(
      result.stdout.includes(`merlon-docs-cli: ${version} → ${version}-build.1`),
      result.stdout,
    );
    assert.doesNotMatch(version, /-build\./);
  });
});
