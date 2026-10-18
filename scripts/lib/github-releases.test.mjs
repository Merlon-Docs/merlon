import assert from 'node:assert/strict';
import { describe, it } from 'node:test';
import {
  packagesMissingGithubReleases,
  packagesNeedingReleaseHeal,
  parseGitLsRemoteTags,
  releaseLatestFlag,
  releaseTag,
} from './github-releases.mjs';

describe('github-releases', () => {
  it('builds name@version tags', () => {
    assert.equal(
      releaseTag('@merlon-docs/skill-merlon-docs', '0.7.2'),
      '@merlon-docs/skill-merlon-docs@0.7.2',
    );
  });

  it('parses git ls-remote --tags output', () => {
    const tags = parseGitLsRemoteTags(`
abc\trefs/tags/@merlon-docs/merlon-docs-cli@0.7.1
def\trefs/tags/@merlon-docs/merlon-docs-cli@0.7.1^{}
ghi refs/tags/v0.7.0
`);
    assert.deepEqual([...tags].sort(), ['@merlon-docs/merlon-docs-cli@0.7.1', 'v0.7.0']);
  });

  it('lists packages missing a GitHub Release and/or git tag', () => {
    const packages = [
      {
        name: '@merlon-docs/merlon-docs-cli',
        version: '0.7.1',
        dir: 'merlon-docs-cli',
        private: false,
      },
      {
        name: '@merlon-docs/skill-merlon-docs',
        version: '0.7.2',
        dir: 'skill-merlon-docs',
        private: true,
      },
      {
        name: '@merlon-docs/merlon-docs-presets',
        version: '0.7.0',
        dir: 'merlon-docs-presets',
        private: false,
      },
    ];
    const releases = new Set(['@merlon-docs/merlon-docs-cli@0.7.1']);
    const gitTags = new Set([
      '@merlon-docs/merlon-docs-cli@0.7.1',
      '@merlon-docs/merlon-docs-presets@0.7.0',
    ]);
    const needing = packagesNeedingReleaseHeal(packages, releases, gitTags);
    assert.deepEqual(
      needing.map((row) => ({
        tag: releaseTag(row.pkg.name, row.pkg.version),
        missingRelease: row.missingRelease,
        missingTag: row.missingTag,
      })),
      [
        {
          tag: '@merlon-docs/merlon-docs-presets@0.7.0',
          missingRelease: true,
          missingTag: false,
        },
        {
          tag: '@merlon-docs/skill-merlon-docs@0.7.2',
          missingRelease: true,
          missingTag: true,
        },
      ],
    );
  });

  it('packagesMissingGithubReleases stays release-only', () => {
    const packages = [
      {
        name: '@merlon-docs/merlon-docs-cli',
        version: '0.7.1',
        dir: 'merlon-docs-cli',
        private: false,
      },
    ];
    const existing = new Set(['@merlon-docs/merlon-docs-cli@0.7.1']);
    assert.deepEqual(packagesMissingGithubReleases(packages, existing), []);
  });

  it('marks the CLI final release Latest and keeps every other final release off Latest', () => {
    assert.equal(releaseLatestFlag('@merlon-docs/merlon-docs-cli@1.0.0'), '--latest');
    assert.equal(releaseLatestFlag('@merlon-docs/merlon-docs-core@1.0.0'), '--latest=false');
    assert.equal(
      releaseLatestFlag('@merlon-docs/skill-merlon-docs-arch-gtm@1.2.3'),
      '--latest=false',
    );
  });

  it('marks a prerelease as a prerelease, whatever the package', () => {
    assert.equal(releaseLatestFlag('@merlon-docs/merlon-docs-cli@2.0.0-rc.1'), '--prerelease');
    assert.equal(releaseLatestFlag('@merlon-docs/merlon-docs-core@1.1.0-draft.3'), '--prerelease');
  });
});
