#!/usr/bin/env node
/**
 * Fail if any skills/<name>/SKILL.md opens with a broken YAML fence
 * ("---name:" instead of "---" then newline then "name:").
 * That corruption breaks `npx skills add`.
 *
 * Also fails when skills/<id>/ contains package.json or CHANGELOG.md, or when
 * metadata.version does not match packages/skill-<id>/package.json.
 */
import { dirname, join } from 'node:path';
import { fileURLToPath } from 'node:url';
import { lintSkillFrontmatter } from './lib/lint-skill-frontmatter.mjs';

const root = join(dirname(fileURLToPath(import.meta.url)), '..');
const errors = lintSkillFrontmatter(root);

if (errors.length > 0) {
  console.error(
    'Skill frontmatter / install-surface lint failed:\n' + errors.map((e) => `  ${e}`).join('\n'),
  );
  process.exit(1);
}

console.log('Skill frontmatter fences OK.');
