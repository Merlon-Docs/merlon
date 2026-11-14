#!/usr/bin/env node
/**
 * Static checks on each skills/<id>/ install surface, run by `pnpm skill:validate`:
 *
 * - SKILL.md opens with a "---" line, not "---name:". That corruption breaks `npx skills add`.
 * - SKILL.md metadata.version equals the version in the carrier's
 *   packages/skill-<id>/package.json, which `sync-skill-versions.mjs` copies in at release.
 * - skills/<id>/ holds no package.json or CHANGELOG.md. Those belong on the carrier,
 *   because every install would copy them into agent context.
 */
import { existsSync, readdirSync, readFileSync } from 'node:fs';
import { join } from 'node:path';
import { pathToFileURL } from 'node:url';
import {
  readPackageVersion,
  readSkillMdVersion,
  skillCarrierDirName,
  skillCarrierPackageJsonPath,
} from './lib/skill-packages.mjs';

/** Files that belong on the carrier under packages/skill-<id>/, never in skills/<id>/. */
export const CARRIER_ONLY_FILES = ['package.json', 'CHANGELOG.md'];

/**
 * @param {string} root repository root
 * @returns {string[]} one message per problem, each naming the file; empty when all skills pass
 */
export function lintSkills(root) {
  const skillsDir = join(root, 'skills');
  if (!existsSync(skillsDir)) return [];
  const errors = [];

  for (const entry of readdirSync(skillsDir, { withFileTypes: true })) {
    if (!entry.isDirectory()) continue;
    const id = entry.name;
    const skillRel = `skills/${id}/SKILL.md`;
    const carrierRel = `packages/${skillCarrierDirName(id)}/package.json`;

    for (const name of CARRIER_ONLY_FILES) {
      if (existsSync(join(skillsDir, id, name))) {
        errors.push(
          `skills/${id}/${name}: remove it. The skill's ${name} belongs on its carrier in packages/${skillCarrierDirName(id)}/, because every install copies skills/${id}/ into agent context.`,
        );
      }
    }

    const skillPath = join(skillsDir, id, 'SKILL.md');
    if (!existsSync(skillPath)) continue;
    if (!readFileSync(skillPath, 'utf-8').startsWith('---\n')) {
      errors.push(
        `${skillRel}: broken YAML frontmatter (missing newline after the opening ---). Expected "---\\nname: ...", not "---name: ...".`,
      );
      continue;
    }

    const carrierPath = skillCarrierPackageJsonPath(root, id);
    if (!existsSync(carrierPath)) {
      errors.push(`${skillRel}: no version carrier at ${carrierRel}.`);
      continue;
    }
    let carrierVersion;
    try {
      carrierVersion = readPackageVersion(carrierPath);
    } catch (err) {
      errors.push(`${carrierRel}: unreadable (${err.message}).`);
      continue;
    }
    let skillVersion;
    try {
      skillVersion = readSkillMdVersion(skillPath);
    } catch (err) {
      errors.push(`${skillRel}: ${err.message}`);
      continue;
    }
    if (skillVersion === null) {
      errors.push(
        `${skillRel}: no metadata.version. Add one, then run pnpm sync:skill-versions to set it from ${carrierRel}.`,
      );
    } else if (skillVersion !== carrierVersion) {
      errors.push(
        `${skillRel}: metadata.version is ${skillVersion}, but ${carrierRel} has ${carrierVersion}. Never edit metadata.version by hand: run pnpm sync:skill-versions, and bump the carrier with a changeset.`,
      );
    }
  }

  return errors;
}

if (process.argv[1] && import.meta.url === pathToFileURL(process.argv[1]).href) {
  const errors = lintSkills(process.cwd());
  if (errors.length > 0) {
    console.error(`Skill install surface check failed:\n${errors.map((e) => `  ${e}`).join('\n')}`);
    process.exit(1);
  }
  console.log('Skill frontmatter, versions and install files OK.');
}
