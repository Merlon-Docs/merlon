#!/usr/bin/env node
/**
 * Build / republish bump without API change: append or increment -build.N on
 * selected public packages (and optionally skill carriers). Does not consume
 * changesets. Maintainer / workflow_dispatch only.
 *
 * Usage:
 *   node scripts/release-build.mjs --packages mdcp-cli,mdcp-core
 *   node scripts/release-build.mjs --skills mdcp,mdcp-arch-gtm
 *   node scripts/release-build.mjs --packages mdcp-cli --dry-run
 */
import { execSync } from 'node:child_process';
import { readFileSync, writeFileSync } from 'node:fs';
import { dirname, join } from 'node:path';
import { fileURLToPath } from 'node:url';
import { setSkillMdVersion, skillPackageName } from './lib/skill-packages.mjs';

const root = join(dirname(fileURLToPath(import.meta.url)), '..');
const dryRun = process.argv.includes('--dry-run');

function argValue(flag) {
  const idx = process.argv.indexOf(flag);
  if (idx === -1) return '';
  return process.argv[idx + 1] ?? '';
}

function bumpBuild(version) {
  const match = version.match(/^(\d+\.\d+\.\d+)(?:-build\.(\d+))?$/);
  if (!match) {
    throw new Error(`Unsupported version for build bump: ${version}`);
  }
  const base = match[1];
  const n = match[2] ? Number(match[2]) + 1 : 1;
  return `${base}-build.${n}`;
}

function updatePackageJson(relPath, nextVersion) {
  const path = join(root, relPath);
  const json = JSON.parse(readFileSync(path, 'utf-8'));
  const prev = json.version;
  json.version = nextVersion;
  if (!dryRun) {
    writeFileSync(path, `${JSON.stringify(json, null, 2)}\n`);
  }
  return prev;
}

const packages = argValue('--packages')
  .split(',')
  .map((s) => s.trim())
  .filter(Boolean);
const skills = argValue('--skills')
  .split(',')
  .map((s) => s.trim())
  .filter(Boolean);

if (packages.length === 0 && skills.length === 0) {
  console.error('Provide --packages and/or --skills (comma-separated ids).');
  process.exit(1);
}

for (const name of packages) {
  const rel = `packages/${name}/package.json`;
  const prev = JSON.parse(readFileSync(join(root, rel), 'utf-8')).version;
  const next = bumpBuild(prev);
  updatePackageJson(rel, next);
  console.log(`${name}: ${prev} → ${next}`);
}

for (const id of skills) {
  const rel = `packages/skill-${id}/package.json`;
  const prev = JSON.parse(readFileSync(join(root, rel), 'utf-8')).version;
  const next = bumpBuild(prev);
  updatePackageJson(rel, next);
  if (!dryRun) {
    setSkillMdVersion(join(root, 'skills', id, 'SKILL.md'), next);
  }
  console.log(`${skillPackageName(id)}: ${prev} → ${next}`);
}

if (!dryRun) {
  execSync('pnpm skill:validate', { cwd: root, stdio: 'inherit' });
}
