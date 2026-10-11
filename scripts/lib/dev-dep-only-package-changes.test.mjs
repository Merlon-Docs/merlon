import assert from 'node:assert/strict';
import { describe, it } from 'node:test';
import {
  isPackagesPackageJsonPath,
  onlyDevDependenciesDiffer,
  isDevDependencyOnlyPackageChange,
} from './dev-dep-only-package-changes.mjs';

describe('isPackagesPackageJsonPath', () => {
  it('accepts packages/<name>/package.json', () => {
    assert.equal(isPackagesPackageJsonPath('packages/merlon-docs-core/package.json'), true);
    assert.equal(isPackagesPackageJsonPath('packages/merlon-docs-cli/package.json'), true);
  });

  it('rejects other paths', () => {
    assert.equal(isPackagesPackageJsonPath('package.json'), false);
    assert.equal(isPackagesPackageJsonPath('packages/merlon-docs-core/src/index.ts'), false);
    assert.equal(isPackagesPackageJsonPath('packages/merlon-docs-core/README.md'), false);
    assert.equal(isPackagesPackageJsonPath('packages/nested/pkg/package.json'), false);
  });
});

describe('onlyDevDependenciesDiffer', () => {
  const base = {
    name: '@merlon-docs/merlon-docs-core',
    version: '0.6.1',
    dependencies: { zod: '^4.4.3' },
    devDependencies: { '@types/node': '^25.9.3' },
  };

  it('returns true when only devDependencies change', () => {
    const next = {
      ...base,
      devDependencies: { '@types/node': '^26.1.1' },
    };
    assert.equal(onlyDevDependenciesDiffer(base, next), true);
  });

  it('returns false when dependencies change', () => {
    const next = {
      ...base,
      dependencies: { zod: '^4.5.0' },
      devDependencies: { '@types/node': '^26.1.1' },
    };
    assert.equal(onlyDevDependenciesDiffer(base, next), false);
  });

  it('returns false when peerDependencies change', () => {
    const before = { ...base, peerDependencies: { typescript: '^5' } };
    const next = { ...before, peerDependencies: { typescript: '^6' } };
    assert.equal(onlyDevDependenciesDiffer(before, next), false);
  });

  it('returns false when optionalDependencies change', () => {
    const before = { ...base, optionalDependencies: { fsevents: '^2.3.0' } };
    const next = { ...before, optionalDependencies: { fsevents: '^2.3.3' } };
    assert.equal(onlyDevDependenciesDiffer(before, next), false);
  });

  it('returns false when non-dependency fields change', () => {
    const next = { ...base, version: '0.6.2' };
    assert.equal(onlyDevDependenciesDiffer(base, next), false);
  });

  it('returns true when packages are identical (formatting-only / no-op)', () => {
    assert.equal(onlyDevDependenciesDiffer(base, { ...base }), true);
  });
});

describe('isDevDependencyOnlyPackageChange', () => {
  const pkgs = {
    'packages/merlon-docs-core/package.json': {
      before: {
        name: '@merlon-docs/merlon-docs-core',
        dependencies: { zod: '^4.4.3' },
        devDependencies: { '@types/node': '^25.9.3' },
      },
      after: {
        name: '@merlon-docs/merlon-docs-core',
        dependencies: { zod: '^4.4.3' },
        devDependencies: { '@types/node': '^26.1.1' },
      },
    },
    'packages/merlon-docs-cli/package.json': {
      before: {
        name: '@merlon-docs/merlon-docs-cli',
        dependencies: { commander: '^15.0.0' },
        devDependencies: { '@types/node': '^25.9.3' },
      },
      after: {
        name: '@merlon-docs/merlon-docs-cli',
        dependencies: { commander: '^15.0.0' },
        devDependencies: { '@types/node': '^26.1.1' },
      },
    },
  };

  function readPair(path) {
    return pkgs[path] ?? null;
  }

  it('returns true for package.json-only devDependency bumps', () => {
    assert.equal(
      isDevDependencyOnlyPackageChange(
        ['packages/merlon-docs-core/package.json', 'packages/merlon-docs-cli/package.json'],
        readPair,
      ),
      true,
    );
  });

  it('returns false when a non-package.json file under packages/ changed', () => {
    assert.equal(
      isDevDependencyOnlyPackageChange(
        ['packages/merlon-docs-core/package.json', 'packages/merlon-docs-core/src/index.ts'],
        readPair,
      ),
      false,
    );
  });

  it('returns false when a production dependency changed', () => {
    const read = (path) => {
      if (path === 'packages/merlon-docs-core/package.json') {
        return {
          before: pkgs['packages/merlon-docs-core/package.json'].before,
          after: {
            ...pkgs['packages/merlon-docs-core/package.json'].after,
            dependencies: { zod: '^4.5.0' },
          },
        };
      }
      return readPair(path);
    };
    assert.equal(
      isDevDependencyOnlyPackageChange(['packages/merlon-docs-core/package.json'], read),
      false,
    );
  });

  it('returns false when package.json is missing at base or head', () => {
    assert.equal(
      isDevDependencyOnlyPackageChange(['packages/merlon-docs-core/package.json'], () => null),
      false,
    );
  });

  it('returns false for an empty change list', () => {
    assert.equal(isDevDependencyOnlyPackageChange([], readPair), false);
  });
});
