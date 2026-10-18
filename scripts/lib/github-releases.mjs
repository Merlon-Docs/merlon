/**
 * Helpers for per-package GitHub Releases (`name@version` tags).
 */
import { existsSync, readdirSync, readFileSync } from 'node:fs';
import { join } from 'node:path';
import { changelogNotesForVersion, skillIdFromPackageName } from './skill-packages.mjs';

/**
 * @typedef {{ name: string, version: string, dir: string, private: boolean, internal: boolean }} WorkspacePackage
 * `internal` marks a skill carrier whose skills/<id>/SKILL.md sets `metadata.internal: true`: an
 * unreleased skill that gets no git tag and no GitHub Release.
 */

/**
 * @param {string} root
 * @returns {Map<string, WorkspacePackage>}
 */
export function readWorkspacePackages(root) {
  const versions = new Map();
  const packagesDir = join(root, 'packages');
  if (!existsSync(packagesDir)) return versions;
  for (const name of readdirSync(packagesDir)) {
    const pkgPath = join(packagesDir, name, 'package.json');
    if (!existsSync(pkgPath)) continue;
    const json = JSON.parse(readFileSync(pkgPath, 'utf-8'));
    if (json.name && json.version) {
      versions.set(json.name, {
        name: json.name,
        version: json.version,
        dir: name,
        private: Boolean(json.private),
        internal: isInternalSkill(root, json.name),
      });
    }
  }
  return versions;
}

/** Whether `name` is a skill carrier whose SKILL.md front matter sets `metadata.internal: true`. */
export function isInternalSkill(root, name) {
  const skillId = skillIdFromPackageName(name);
  if (!skillId) return false;
  const skillPath = join(root, 'skills', skillId, 'SKILL.md');
  if (!existsSync(skillPath)) return false;
  const frontMatter = readFileSync(skillPath, 'utf-8').match(/^---\n([\s\S]*?)\n---/);
  return Boolean(
    frontMatter &&
    /^metadata:\n(?:[ \t]+.*\n)*?[ \t]+internal:[ \t]*true[ \t]*$/m.test(`${frontMatter[1]}\n`),
  );
}

/** @param {string} name @param {string} version */
export function releaseTag(name, version) {
  return `${name}@${version}`;
}

/** The package whose final release GitHub shows as the repository's Latest release. */
export const LATEST_RELEASE_PACKAGE = '@merlon-docs/merlon-docs-cli';

/**
 * The `gh release create` flag that decides the Latest badge for this tag. A prerelease gets
 * `--prerelease`, which already keeps it off Latest. A final release of LATEST_RELEASE_PACKAGE
 * becomes Latest, and every other final release says `--latest=false`, so a release that doesn't
 * bump the CLI leaves the badge on the CLI's previous release.
 */
export function releaseLatestFlag(tag) {
  const at = tag.lastIndexOf('@');
  if (tag.slice(at + 1).includes('-')) return '--prerelease';
  return tag.slice(0, at) === LATEST_RELEASE_PACKAGE ? '--latest' : '--latest=false';
}

/**
 * Parse `git ls-remote --tags` output into a set of tag names (peeled ^{} lines skipped).
 * @param {string} lsRemoteOutput
 * @returns {Set<string>}
 */
export function parseGitLsRemoteTags(lsRemoteOutput) {
  const tags = new Set();
  for (const line of lsRemoteOutput.split('\n')) {
    const ref = line.split(/[\t ]+/).pop();
    if (!ref || !ref.startsWith('refs/tags/')) continue;
    if (ref.endsWith('^{}')) continue;
    tags.add(ref.slice('refs/tags/'.length));
  }
  return tags;
}

/**
 * Packages whose current `name@version` lacks a GitHub Release and/or a git tag. Internal skills
 * are left out, since they get neither.
 * @param {Iterable<WorkspacePackage>} packages
 * @param {ReadonlySet<string>} existingReleaseTags
 * @param {ReadonlySet<string>} existingGitTags
 * @returns {{ pkg: WorkspacePackage, missingRelease: boolean, missingTag: boolean }[]}
 */
export function packagesNeedingReleaseHeal(packages, existingReleaseTags, existingGitTags) {
  const needing = [];
  for (const pkg of packages) {
    if (pkg.internal) continue;
    const tag = releaseTag(pkg.name, pkg.version);
    const missingRelease = !existingReleaseTags.has(tag);
    const missingTag = !existingGitTags.has(tag);
    if (missingRelease || missingTag) {
      needing.push({ pkg, missingRelease, missingTag });
    }
  }
  return needing.sort((a, b) => a.pkg.name.localeCompare(b.pkg.name));
}

/**
 * Packages whose current `name@version` is not in the set of existing GitHub Release tags.
 * @param {Iterable<WorkspacePackage>} packages
 * @param {ReadonlySet<string>} existingReleaseTags
 * @returns {WorkspacePackage[]}
 */
export function packagesMissingGithubReleases(packages, existingReleaseTags) {
  const missing = [];
  for (const pkg of packages) {
    const tag = releaseTag(pkg.name, pkg.version);
    if (!existingReleaseTags.has(tag)) {
      missing.push(pkg);
    }
  }
  return missing.sort((a, b) => a.name.localeCompare(b.name));
}

/**
 * @param {string} root
 * @param {WorkspacePackage} pkg
 */
export function releaseNotesForPackage(root, pkg) {
  const tag = releaseTag(pkg.name, pkg.version);
  return (
    changelogNotesForVersion(join(root, 'packages', pkg.dir, 'CHANGELOG.md'), pkg.version) ||
    `Release ${tag}`
  );
}

/** Path relative to repo root for a package's package.json. */
export function packageJsonRelPath(pkg) {
  return join('packages', pkg.dir, 'package.json');
}
