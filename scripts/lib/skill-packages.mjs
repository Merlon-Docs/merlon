/**
 * Skill version carriers live under packages/skill-<id>/ (private workspace
 * packages). skills/<id>/ stays installable Agent Skill content only — no
 * package.json or CHANGELOG there (those pollute npx skills add context).
 */
import { readdirSync, readFileSync, writeFileSync, existsSync } from 'node:fs';
import { join } from 'node:path';

export const SKILL_PACKAGE_SCOPE = '@merlon-docs/skill-';
export const SKILL_CARRIER_DIR_PREFIX = 'skill-';

export function skillPackageName(skillId) {
  return `${SKILL_PACKAGE_SCOPE}${skillId}`;
}

export function skillIdFromPackageName(name) {
  if (!name.startsWith(SKILL_PACKAGE_SCOPE)) return null;
  return name.slice(SKILL_PACKAGE_SCOPE.length);
}

export function skillCarrierDirName(skillId) {
  return `${SKILL_CARRIER_DIR_PREFIX}${skillId}`;
}

export function skillIdFromCarrierDirName(dirName) {
  if (!dirName.startsWith(SKILL_CARRIER_DIR_PREFIX)) return null;
  return dirName.slice(SKILL_CARRIER_DIR_PREFIX.length);
}

export function skillCarrierPackageJsonPath(root, skillId) {
  return join(root, 'packages', skillCarrierDirName(skillId), 'package.json');
}

/** Skill ids that have a carrier under packages/skill-<id>/. */
export function listSkillCarrierIds(root) {
  const packagesDir = join(root, 'packages');
  if (!existsSync(packagesDir)) return [];
  return readdirSync(packagesDir, { withFileTypes: true })
    .filter((e) => e.isDirectory())
    .map((e) => skillIdFromCarrierDirName(e.name))
    .filter((id) => id && existsSync(skillCarrierPackageJsonPath(root, id)))
    .sort();
}

/** Skill pack dirs under skills/ that contain SKILL.md (install surface). */
export function listSkillDirs(root) {
  const skillsDir = join(root, 'skills');
  if (!existsSync(skillsDir)) return [];
  return readdirSync(skillsDir, { withFileTypes: true })
    .filter((e) => e.isDirectory())
    .map((e) => e.name)
    .filter((name) => existsSync(join(skillsDir, name, 'SKILL.md')))
    .sort();
}

/**
 * Rewrite metadata.version in skills/<id>/SKILL.md while preserving other frontmatter.
 * Opening fence must remain "---\n" (never "---name:").
 */
export function setSkillMdVersion(skillPath, version) {
  const content = readFileSync(skillPath, 'utf-8');
  if (!content.startsWith('---\n')) {
    throw new Error(`Broken YAML fence (missing newline after ---): ${skillPath}`);
  }
  const end = content.indexOf('\n---', 4);
  if (end === -1) {
    throw new Error(`No closing frontmatter fence: ${skillPath}`);
  }
  const frontmatter = content.slice(4, end);
  if (!/^\s*version:\s*/m.test(frontmatter)) {
    throw new Error(`No version field in frontmatter: ${skillPath}`);
  }
  const nextFrontmatter = frontmatter.replace(
    /^(\s*version:\s*)(['"]?)[^'"\n]+\2\s*$/m,
    `$1'${version}'`,
  );
  if (nextFrontmatter === frontmatter) {
    return false;
  }
  writeFileSync(skillPath, `---\n${nextFrontmatter}${content.slice(end)}`);
  return true;
}

export function readPackageVersion(packageJsonPath) {
  const json = JSON.parse(readFileSync(packageJsonPath, 'utf-8'));
  return json.version;
}

/** Extract the ## version section body from a package CHANGELOG.md. */
export function changelogNotesForVersion(changelogPath, version) {
  if (!existsSync(changelogPath)) return '';
  const content = readFileSync(changelogPath, 'utf-8');
  const header = `## ${version}`;
  const start = content.indexOf(header);
  if (start === -1) return '';
  const after = content.slice(start + header.length);
  const next = after.search(/\n## /);
  const section = (next === -1 ? after : after.slice(0, next)).trim();
  return section;
}
