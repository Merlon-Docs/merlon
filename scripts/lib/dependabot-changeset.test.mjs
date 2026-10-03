import assert from 'node:assert/strict';
import { describe, it } from 'node:test';
import {
  PACKAGE_JSON_PATH,
  changesetPath,
  renderChangeset,
  runtimeDependencyChanges,
} from './dependabot-changeset.mjs';

describe('runtimeDependencyChanges', () => {
  it('reports changed runtime dependencies and ignores devDependencies', () => {
    const before = {
      dependencies: { zod: '^4.5.4', ignore: '^7.0.8' },
      devDependencies: { vitest: '^4.1.11' },
    };
    const after = {
      dependencies: { zod: '^4.6.5', ignore: '^7.0.8' },
      devDependencies: { vitest: '^5.0.1' },
    };
    assert.deepEqual(runtimeDependencyChanges(before, after), [
      { name: 'zod', from: '^4.5.4', to: '^4.6.5' },
    ]);
  });

  it('skips workspace links and handles added or removed entries', () => {
    const before = { dependencies: { '@scope/core': 'workspace:*', old: '^1.0.0' } };
    const after = { dependencies: { '@scope/core': 'workspace:^', fresh: '^2.0.0' } };
    assert.deepEqual(runtimeDependencyChanges(before, after), [
      { name: 'fresh', from: undefined, to: '^2.0.0' },
      { name: 'old', from: '^1.0.0', to: undefined },
    ]);
  });

  it('returns nothing for a devDependencies-only bump', () => {
    const before = { devDependencies: { vitest: '^4.1.11' } };
    const after = { devDependencies: { vitest: '^5.0.1' } };
    assert.deepEqual(runtimeDependencyChanges(before, after), []);
  });
});

describe('renderChangeset', () => {
  it('returns null when no package has runtime changes', () => {
    assert.equal(renderChangeset([{ packageName: '@scope/core', changes: [] }]), null);
  });

  it('writes a patch changeset per package and lists each bump once', () => {
    const zod = { name: 'zod', from: '^4.5.4', to: '^4.6.5' };
    const out = renderChangeset([
      { packageName: '@scope/core', changes: [zod] },
      { packageName: '@scope/cli', changes: [zod] },
    ]);
    assert.equal(
      out,
      "---\n'@scope/cli': patch\n'@scope/core': patch\n---\n\n" +
        'Update runtime dependencies: `zod` from ^4.5.4 to ^4.6.5.\n',
    );
  });
});

describe('paths', () => {
  it('names the changeset after the PR and matches package manifests only', () => {
    assert.equal(changesetPath(276), '.changeset/dependabot-pr-276.md');
    assert.ok(PACKAGE_JSON_PATH.test('packages/mdcp-core/package.json'));
    assert.ok(!PACKAGE_JSON_PATH.test('package.json'));
    assert.ok(!PACKAGE_JSON_PATH.test('packages/mdcp-core/src/package.json'));
  });
});
