/**
 * Parse bump types from pending .changeset/*.md frontmatter.
 */
import { readdirSync, readFileSync } from 'node:fs';
import { join } from 'node:path';

export function pendingChangesetFiles(changesetDir) {
  return readdirSync(changesetDir).filter(
    (name) => name.endsWith('.md') && name !== 'README.md' && !name.startsWith('_'),
  );
}

/**
 * @returns {{ file: string, bumps: Record<string, string> }[]}
 */
export function parseChangesetBumps(changesetDir) {
  const files = pendingChangesetFiles(changesetDir);
  const results = [];
  for (const file of files) {
    const content = readFileSync(join(changesetDir, file), 'utf-8');
    const parts = content.split('---');
    if (parts.length < 3) continue;
    const fm = parts[1];
    const bumps = {};
    for (const line of fm.split('\n')) {
      const match = line.match(/^\s*['"]?([^'":\s]+)['"]?\s*:\s*(major|minor|patch)\s*$/);
      if (match) {
        bumps[match[1]] = match[2];
      }
    }
    if (Object.keys(bumps).length > 0) {
      results.push({ file, bumps });
    }
  }
  return results;
}
