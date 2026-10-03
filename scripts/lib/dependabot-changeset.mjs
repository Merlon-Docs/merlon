/**
 * Build the changeset a Dependabot PR needs: a patch bump for every workspace
 * package whose runtime dependencies changed. `devDependencies` are skipped,
 * matching scripts/changeset-status.mjs (tooling bumps need no release note).
 */

const RUNTIME_FIELDS = ['dependencies', 'peerDependencies', 'optionalDependencies'];

export const PACKAGE_JSON_PATH = /^packages\/[^/]+\/package\.json$/;

/** @param {number} prNumber */
export function changesetPath(prNumber) {
  return `.changeset/dependabot-pr-${prNumber}.md`;
}

/**
 * @param {Record<string, any>} before
 * @param {Record<string, any>} after
 * @returns {{ name: string, from: string | undefined, to: string | undefined }[]}
 */
export function runtimeDependencyChanges(before, after) {
  const changes = [];
  for (const field of RUNTIME_FIELDS) {
    const prev = before[field] ?? {};
    const next = after[field] ?? {};
    const names = new Set([...Object.keys(prev), ...Object.keys(next)]);
    for (const name of [...names].sort()) {
      // Workspace links move with the workspace, not with Dependabot.
      if (String(next[name] ?? prev[name]).startsWith('workspace:')) continue;
      if (prev[name] !== next[name]) {
        changes.push({ name, from: prev[name], to: next[name] });
      }
    }
  }
  return changes;
}

/** @param {{ name: string, from: string | undefined, to: string | undefined }} change */
function describeChange({ name, from, to }) {
  if (from === undefined) return `add \`${name}\` ${to}`;
  if (to === undefined) return `remove \`${name}\``;
  return `\`${name}\` from ${from} to ${to}`;
}

/**
 * @param {{ packageName: string, changes: ReturnType<typeof runtimeDependencyChanges> }[]} bumps
 * @returns {string | null} changeset Markdown, or null when nothing needs a release
 */
export function renderChangeset(bumps) {
  const relevant = bumps.filter((b) => b.changes.length > 0);
  if (relevant.length === 0) return null;

  const names = [...new Set(relevant.map((b) => b.packageName))].sort();
  const frontmatter = names.map((name) => `'${name}': patch`).join('\n');

  const seen = new Set();
  const lines = [];
  for (const { changes } of relevant) {
    for (const change of changes) {
      const line = describeChange(change);
      if (seen.has(line)) continue;
      seen.add(line);
      lines.push(line);
    }
  }

  return `---\n${frontmatter}\n---\n\nUpdate runtime dependencies: ${lines.join('; ')}.\n`;
}
