#!/usr/bin/env node
/**
 * skills-lock.json: local installs must use repo-relative sources (e.g. "."),
 * not machine-specific absolute paths from `npx skills add .`.
 */
import { readFileSync, writeFileSync } from 'node:fs';
import { isAbsolute, resolve } from 'node:path';

const LOCK_FILE = 'skills-lock.json';
const fix = process.argv.includes('--fix');

function loadLock() {
  try {
    return JSON.parse(readFileSync(LOCK_FILE, 'utf-8'));
  } catch (err) {
    console.error(`Could not read ${LOCK_FILE}: ${err instanceof Error ? err.message : err}`);
    process.exit(1);
  }
}

function writeLock(lock) {
  const sortedSkills = {};
  for (const key of Object.keys(lock.skills).sort()) sortedSkills[key] = lock.skills[key];
  writeFileSync(
    LOCK_FILE,
    JSON.stringify({ version: lock.version, skills: sortedSkills }, null, 2) + '\n',
    'utf-8',
  );
}

const cwd = process.cwd();
const lock = loadLock();
const bad = [];
let changed = false;

for (const [skillName, entry] of Object.entries(lock.skills ?? {})) {
  if (entry?.sourceType !== 'local' || typeof entry.source !== 'string') continue;
  if (!isAbsolute(entry.source)) continue;

  if (resolve(entry.source) === resolve(cwd)) {
    if (fix) {
      entry.source = '.';
      changed = true;
    } else {
      bad.push(`${skillName}: ${entry.source} (expected ".")`);
    }
    continue;
  }

  bad.push(`${skillName}: ${entry.source} (local source must be relative to the repo root)`);
}

if (fix && changed) {
  writeLock(lock);
  console.log(`Normalized local skill source(s) in ${LOCK_FILE}.`);
}

if (bad.length > 0) {
  console.error(
    `${LOCK_FILE} has non-portable local skill source(s):\n` +
      bad.map((line) => `  ${line}`).join('\n'),
  );
  process.exit(1);
}

console.log(`${LOCK_FILE} local sources OK.`);
