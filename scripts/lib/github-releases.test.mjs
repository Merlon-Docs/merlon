import assert from 'node:assert/strict';
import { mkdirSync, mkdtempSync, rmSync, writeFileSync } from 'node:fs';
import { tmpdir } from 'node:os';
import { join } from 'node:path';
import { describe, it } from 'node:test';
import {
  isInternalSkill,
  packagesMissingGithubReleases,
  packagesNeedingReleaseHeal,
  parseGitLsRemoteTags,
  readWorkspacePackages,
  releaseLatestFlag,
  releaseTag,
} from './github-releases.mjs';

/** A repository root with one skill carrier whose SKILL.md front matter is `frontMatter`. */
function repoWithSkill(skillId, frontMatter) {
  const root = mkdtempSync(join(tmpdir(), 'github-releases-'));
  mkdirSync(join(root, 'skills', skillId), { recursive: true });
  writeFileSync(join(root, 'skills', skillId, 'SKILL.md'), `---\n${frontMatter}\n---\n\n# Skill\n`);
  mkdirSync(join(root, 'packages', `skill-${skillId}`), { recursive: true });
  writeFileSync(
    join(root, 'packages', `skill-${skillId}`, 'package.json'),
    JSON.stringify({ name: `@merlon-docs/skill-${skillId}`, version: '1.0.0', private: true }),
  );
  return root;
}

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
    assert.equal(releaseLatestFlag('@merlon-docs/skill-example@1.2.3'), '--latest=false');
  });

  it('marks a prerelease as a prerelease, whatever the package', () => {
    assert.equal(releaseLatestFlag('@merlon-docs/merlon-docs-cli@2.0.0-rc.1'), '--prerelease');
    assert.equal(releaseLatestFlag('@merlon-docs/merlon-docs-core@1.1.0-draft.3'), '--prerelease');
  });

  it('marks a skill internal only when its metadata sets internal: true', () => {
    const cases = [
      ['name: a\nmetadata:\n  author: x\n  internal: true\n  version: 1.0.0', true],
      ['name: a\nmetadata:\n  internal: false', false],
      ['name: a\nmetadata:\n  author: x', false],
      ['name: a\ninternal: true\nmetadata:\n  author: x', false],
    ];
    for (const [frontMatter, expected] of cases) {
      const root = repoWithSkill('a', frontMatter);
      try {
        assert.equal(isInternalSkill(root, '@merlon-docs/skill-a'), expected, frontMatter);
        assert.equal(readWorkspacePackages(root).get('@merlon-docs/skill-a').internal, expected);
      } finally {
        rmSync(root, { recursive: true, force: true });
      }
    }
    assert.equal(isInternalSkill(tmpdir(), '@merlon-docs/merlon-docs-cli'), false);
  });

  it('never heals an internal skill', () => {
    const packages = [
      {
        name: '@merlon-docs/skill-a',
        version: '1.0.0',
        dir: 'skill-a',
        private: true,
        internal: true,
      },
      {
        name: '@merlon-docs/skill-b',
        version: '1.0.0',
        dir: 'skill-b',
        private: true,
        internal: false,
      },
    ];
    const needing = packagesNeedingReleaseHeal(packages, new Set(), new Set());
    assert.deepEqual(
      needing.map((row) => row.pkg.name),
      ['@merlon-docs/skill-b'],
    );
  });
});
