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
    assert.match(result.stdout, /merlon-docs-cli: 0\.\d+\.\d+ → 0\.\d+\.\d+-build\.1/);
    const version = JSON.parse(
      readFileSync(join(root, 'packages/merlon-docs-cli/package.json'), 'utf8'),
    ).version;
    assert.doesNotMatch(version, /-build\./);
  });
});
