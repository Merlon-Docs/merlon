#!/usr/bin/env node
/**
 * Fail when a local skill in skills-lock.json records an absolute `source`.
 * `npx skills add .` from the repo root writes "."; an absolute path, such as a
 * cloud agent's checkout path, only holds on the machine that wrote it.
 */
import { readFile } from 'node:fs/promises';
import path from 'node:path';
import { pathToFileURL } from 'node:url';

/**
 * @param {string} lockPath
 * @returns {Promise<string[]>} one message per local skill whose source is absolute
 */
export async function findAbsoluteLocalSources(lockPath) {
  const lock = JSON.parse(await readFile(lockPath, 'utf8'));
  return Object.entries(lock.skills ?? {})
    .filter(([, s]) => s.sourceType === 'local' && typeof s.source === 'string')
    .filter(([, s]) => path.posix.isAbsolute(s.source) || path.win32.isAbsolute(s.source))
    .map(
      ([name, s]) =>
        `${name}: source "${s.source}" is absolute; re-run \`pnpm skill:update\` from the repo root`,
    );
}

const isMain = process.argv[1] != null && import.meta.url === pathToFileURL(process.argv[1]).href;

if (isMain) {
  const lockPath = process.argv[2] ?? 'skills-lock.json';
  const problems = await findAbsoluteLocalSources(lockPath);
  if (problems.length > 0) {
    for (const p of problems) console.error(`${lockPath}: ${p}`);
    process.exit(1);
  }
  console.log(`${lockPath}: local skill sources OK`);
}
