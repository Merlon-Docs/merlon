/**
 * Static checks for skills/<id>/ install surface (pnpm skill:validate).
 */
import { existsSync, readFileSync } from 'node:fs';
import { join } from 'node:path';
import {
  listSkillCarrierIds,
  listSkillDirs,
  readPackageVersion,
  skillCarrierPackageJsonPath,
} from './skill-packages.mjs';

/** Files that belong on the carrier under packages/skill-<id>/, not in skills/<id>/. */
export const FORBIDDEN_SKILL_INSTALL_FILES = ['package.json', 'CHANGELOG.md'];

/**
 * Read metadata.version from skills/<id>/SKILL.md frontmatter.
 * @returns {string | null} version string, or null when no version field
 */
export function readSkillMdMetadataVersion(skillPath) {
  const content = readFileSync(skillPath, 'utf-8');
  if (!content.startsWith('---\n')) {
    throw new Error(`Broken YAML fence (missing newline after ---): ${skillPath}`);
  }
  const end = content.indexOf('\n---', 4);
  if (end === -1) {
    throw new Error(`No closing frontmatter fence: ${skillPath}`);
  }
  const frontmatter = content.slice(4, end);
  const match = /^\s*version:\s*['"]?([^'"\n]+)['"]?\s*$/m.exec(frontmatter);
  return match ? match[1] : null;
}

/**
 * @param {string} root repository root
 * @returns {string[]} human-readable errors (empty when OK)
 */
export function lintSkillFrontmatter(root) {
  const errors = [];
  const skillsDir = join(root, 'skills');

  for (const id of listSkillDirs(root)) {
    const skillPath = join(skillsDir, id, 'SKILL.md');
    let content;
    try {
      content = readFileSync(skillPath, 'utf-8');
    } catch {
      continue;
    }
    if (!content.startsWith('---\n')) {
      errors.push(
        `Broken SKILL.md YAML frontmatter (missing newline after ---): skills/${id}/SKILL.md`,
      );
    }
    for (const name of FORBIDDEN_SKILL_INSTALL_FILES) {
      const rel = `skills/${id}/${name}`;
      if (existsSync(join(skillsDir, id, name))) {
        errors.push(`${rel} must not exist (version carrier lives under packages/skill-${id}/)`);
      }
    }
  }

  for (const id of listSkillCarrierIds(root)) {
    const skillPath = join(skillsDir, id, 'SKILL.md');
    if (!existsSync(skillPath)) {
      errors.push(`packages/skill-${id}/ has no matching skills/${id}/SKILL.md`);
      continue;
    }
    let carrierVersion;
    try {
      carrierVersion = readPackageVersion(skillCarrierPackageJsonPath(root, id));
    } catch {
      errors.push(`packages/skill-${id}/package.json is missing or invalid`);
      continue;
    }
    let skillVersion;
    try {
      skillVersion = readSkillMdMetadataVersion(skillPath);
    } catch (err) {
      errors.push(String(err.message ?? err));
      continue;
    }
    if (!skillVersion) {
      errors.push(`No metadata.version in skills/${id}/SKILL.md`);
      continue;
    }
    if (skillVersion !== carrierVersion) {
      errors.push(
        `skills/${id}/SKILL.md metadata.version (${skillVersion}) != packages/skill-${id}/package.json (${carrierVersion}) — run pnpm sync:skill-versions`,
      );
    }
  }

  return errors;
}
