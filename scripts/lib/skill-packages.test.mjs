import assert from 'node:assert/strict';
import { mkdtempSync, writeFileSync, readFileSync, mkdirSync } from 'node:fs';
import { tmpdir } from 'node:os';
import { join } from 'node:path';
import { describe, it } from 'node:test';
import {
  skillPackageName,
  skillIdFromPackageName,
  skillCarrierDirName,
  setSkillMdVersion,
  listSkillDirs,
  listSkillCarrierIds,
  skillCarrierPackageJsonPath,
  changelogNotesForVersion,
} from './skill-packages.mjs';

describe('skill-packages', () => {
  it('maps skill ids to scoped private package names and carrier dirs', () => {
    assert.equal(skillPackageName('merlon-docs'), '@merlon-docs/skill-merlon-docs');
    assert.equal(skillCarrierDirName('merlon-docs-ux'), 'skill-merlon-docs-ux');
    assert.equal(skillIdFromPackageName('@merlon-docs/skill-merlon-docs-ux'), 'merlon-docs-ux');
    assert.equal(skillIdFromPackageName('@merlon-docs/merlon-docs-cli'), null);
  });

  it('rewrites metadata.version without corrupting the YAML fence', () => {
    const dir = mkdtempSync(join(tmpdir(), 'skill-pkg-'));
    const skillPath = join(dir, 'SKILL.md');
    writeFileSync(
      skillPath,
      `---
name: demo
metadata:
  author: test
  version: '0.7.0'
  internal: true
---

# Demo
`,
    );
    assert.equal(setSkillMdVersion(skillPath, '0.8.1'), true);
    const next = readFileSync(skillPath, 'utf-8');
    assert.ok(next.startsWith('---\nname: demo\n'));
    assert.match(next, /version: '0\.8\.1'/);
    assert.match(next, /internal: true/);
    assert.equal(setSkillMdVersion(skillPath, '0.8.1'), false);
  });

  it('lists skill dirs and carrier packages separately', () => {
    const root = mkdtempSync(join(tmpdir(), 'skills-root-'));
    mkdirSync(join(root, 'skills', 'alpha'), { recursive: true });
    mkdirSync(join(root, 'packages', 'skill-alpha'), { recursive: true });
    writeFileSync(join(root, 'skills', 'alpha', 'SKILL.md'), '---\nname: a\n---\n');
    writeFileSync(
      join(root, 'packages', 'skill-alpha', 'package.json'),
      JSON.stringify({ name: '@merlon-docs/skill-alpha', version: '1.0.0', private: true }),
    );
    assert.deepEqual(listSkillDirs(root), ['alpha']);
    assert.deepEqual(listSkillCarrierIds(root), ['alpha']);
    assert.equal(
      skillCarrierPackageJsonPath(root, 'alpha'),
      join(root, 'packages', 'skill-alpha', 'package.json'),
    );
  });

  it('extracts changelog notes for a version', () => {
    const dir = mkdtempSync(join(tmpdir(), 'cl-'));
    const path = join(dir, 'CHANGELOG.md');
    writeFileSync(
      path,
      `# pkg

## 0.2.0

### Minor Changes

- new thing

## 0.1.0

- old
`,
    );
    assert.match(changelogNotesForVersion(path, '0.2.0'), /new thing/);
    assert.doesNotMatch(changelogNotesForVersion(path, '0.2.0'), /old/);
    assert.equal(changelogNotesForVersion(path, '9.9.9'), '');
  });

  it('reads the section whose heading is exactly the prerelease version', () => {
    const dir = mkdtempSync(join(tmpdir(), 'cl-'));
    const path = join(dir, 'CHANGELOG.md');
    writeFileSync(
      path,
      `# pkg

## 1.0.0-draft.10

- tenth draft

## 1.0.0-draft.1

- first fix
`,
    );
    assert.match(changelogNotesForVersion(path, '1.0.0-draft.1'), /first fix/);
    assert.doesNotMatch(changelogNotesForVersion(path, '1.0.0-draft.1'), /tenth/);
    assert.equal(changelogNotesForVersion(path, '1.0.0'), '');
  });
});
