import assert from 'node:assert/strict';
import { describe, it } from 'node:test';
import { bumpBuild } from './build-version.mjs';

describe('bumpBuild', () => {
  it('starts a release version at build 1', () => {
    assert.equal(bumpBuild('2.3.4'), '2.3.4-build.1');
  });

  it('keeps a prerelease and starts it at build 1', () => {
    assert.equal(bumpBuild('2.0.0-rc.3'), '2.0.0-rc.3-build.1');
  });

  it('increments an existing build number', () => {
    assert.equal(bumpBuild('2.3.4-build.1'), '2.3.4-build.2');
    assert.equal(bumpBuild('2.0.0-rc.3-build.9'), '2.0.0-rc.3-build.10');
  });

  it('rejects an empty version', () => {
    assert.throws(() => bumpBuild(''), /Unsupported version/);
  });
});
