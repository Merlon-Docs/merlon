import assert from 'node:assert/strict';
import { mkdirSync, mkdtempSync, writeFileSync } from 'node:fs';
import { tmpdir } from 'node:os';
import { join } from 'node:path';
import { describe, it } from 'node:test';
import {
  FORBIDDEN_SKILL_INSTALL_FILES,
  lintSkillFrontmatter,
  readSkillMdMetadataVersion,
} from './lint-skill-frontmatter.mjs';

function writeSkill(root, id, body, { brokenFence = false } = {}) {
  mkdirSync(join(root, 'skills', id), { recursive: true });
  const fence = brokenFence ? '---name: demo\n' : '---\n';
  writeFileSync(join(root, 'skills', id, 'SKILL.md'), `${fence}${body}\n---\n\n# Demo\n`);
}

function writeCarrier(root, id, version) {
  mkdirSync(join(root, 'packages', `skill-${id}`), { recursive: true });
  writeFileSync(
    join(root, 'packages', `skill-${id}`, 'package.json'),
    JSON.stringify({ name: `@merlon-docs/skill-${id}`, version, private: true }),
  );
}

describe('lint-skill-frontmatter', () => {
  it('reads metadata.version from frontmatter', () => {
    const dir = mkdtempSync(join(tmpdir(), 'skill-md-'));
    const skillPath = join(dir, 'SKILL.md');
    writeFileSync(
      skillPath,
      `---
name: demo
metadata:
  version: '2.3.4'
---
`,
    );
    assert.equal(readSkillMdMetadataVersion(skillPath), '2.3.4');
  });

  it('passes when carrier version matches SKILL.md metadata.version', () => {
    const root = mkdtempSync(join(tmpdir(), 'skill-lint-'));
    writeCarrier(root, 'alpha', '1.2.3');
    writeSkill(root, 'alpha', "name: alpha\nmetadata:\n  version: '1.2.3'");
    assert.deepEqual(lintSkillFrontmatter(root), []);
  });

  it('fails on version drift and forbidden install files', () => {
    const root = mkdtempSync(join(tmpdir(), 'skill-lint-'));
    writeCarrier(root, 'beta', '2.0.0');
    writeSkill(root, 'beta', "name: beta\nmetadata:\n  version: '1.9.9'");
    for (const name of FORBIDDEN_SKILL_INSTALL_FILES) {
      writeFileSync(join(root, 'skills', 'beta', name), '{}');
    }
    const errors = lintSkillFrontmatter(root);
    assert.ok(errors.some((e) => e.includes('metadata.version') && e.includes('1.9.9')));
    assert.ok(errors.some((e) => e.includes('skills/beta/package.json')));
    assert.ok(errors.some((e) => e.includes('skills/beta/CHANGELOG.md')));
  });

  it('fails on a corrupted opening YAML fence', () => {
    const root = mkdtempSync(join(tmpdir(), 'skill-lint-'));
    writeCarrier(root, 'gamma', '0.1.0');
    writeSkill(root, 'gamma', "name: gamma\nmetadata:\n  version: '0.1.0'", {
      brokenFence: true,
    });
    const errors = lintSkillFrontmatter(root);
    assert.ok(errors.some((e) => e.includes('missing newline after ---')));
  });
});
