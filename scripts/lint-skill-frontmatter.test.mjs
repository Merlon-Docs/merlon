import assert from 'node:assert/strict';
import { mkdirSync, mkdtempSync, writeFileSync } from 'node:fs';
import { tmpdir } from 'node:os';
import { join } from 'node:path';
import { describe, it } from 'node:test';
import { lintSkills } from './lint-skill-frontmatter.mjs';

/** Build a repo root with skills/demo/SKILL.md and, unless carrierVersion is null, its carrier. */
function makeRoot({ skillVersion = '2.3.4', carrierVersion = '2.3.4', opening = '---\n' } = {}) {
  const root = mkdtempSync(join(tmpdir(), 'lint-skill-'));
  mkdirSync(join(root, 'skills', 'demo'), { recursive: true });
  const versionLine = skillVersion === null ? '' : `  version: '${skillVersion}'\n`;
  writeFileSync(
    join(root, 'skills', 'demo', 'SKILL.md'),
    `${opening}name: demo\nmetadata:\n  author: test\n${versionLine}---\n\n# Demo\n`,
  );
  if (carrierVersion !== null) {
    mkdirSync(join(root, 'packages', 'skill-demo'), { recursive: true });
    writeFileSync(
      join(root, 'packages', 'skill-demo', 'package.json'),
      JSON.stringify({ name: '@merlon-docs/skill-demo', version: carrierVersion, private: true }),
    );
  }
  return root;
}

describe('lintSkills', () => {
  it('passes a skill whose metadata.version matches its carrier', () => {
    assert.deepEqual(lintSkills(makeRoot()), []);
  });

  it('fails a metadata.version that differs from the carrier, naming both files', () => {
    const errors = lintSkills(makeRoot({ skillVersion: '9.9.9', carrierVersion: '2.3.4' }));
    assert.equal(errors.length, 1);
    assert.match(errors[0], /^skills\/demo\/SKILL\.md: metadata\.version is 9\.9\.9/);
    assert.match(errors[0], /packages\/skill-demo\/package\.json has 2\.3\.4/);
  });

  it('fails a SKILL.md without metadata.version', () => {
    const errors = lintSkills(makeRoot({ skillVersion: null }));
    assert.equal(errors.length, 1);
    assert.match(errors[0], /^skills\/demo\/SKILL\.md: no metadata\.version/);
  });

  it('fails a skill without a carrier package', () => {
    const errors = lintSkills(makeRoot({ carrierVersion: null }));
    assert.equal(errors.length, 1);
    assert.match(errors[0], /no version carrier at packages\/skill-demo\/package\.json/);
  });

  it('fails each carrier file copied into the skill directory', () => {
    const root = makeRoot();
    writeFileSync(join(root, 'skills', 'demo', 'package.json'), '{}');
    writeFileSync(join(root, 'skills', 'demo', 'CHANGELOG.md'), '# Changelog\n');
    const errors = lintSkills(root);
    assert.equal(errors.length, 2);
    assert.match(errors[0], /^skills\/demo\/package\.json: remove it/);
    assert.match(errors[1], /^skills\/demo\/CHANGELOG\.md: remove it/);
  });

  it('still fails a broken opening fence', () => {
    const errors = lintSkills(makeRoot({ opening: '---' }));
    assert.equal(errors.length, 1);
    assert.match(errors[0], /^skills\/demo\/SKILL\.md: broken YAML frontmatter/);
  });
});
