#!/usr/bin/env node
/**
 * Apply pending changesets (independent package + skill versions), sync skill
 * frontmatter, then validate skill packs. Used by changesets/action `version`.
 */
import { execSync } from 'node:child_process';
import { dirname, join } from 'node:path';
import { fileURLToPath } from 'node:url';

const root = join(dirname(fileURLToPath(import.meta.url)), '..');

function run(cmd) {
  console.log(`> ${cmd}`);
  execSync(cmd, { cwd: root, stdio: 'inherit' });
}

run('pnpm exec changeset version');
run('node scripts/sync-skill-versions.mjs');
run('pnpm skill:validate');
