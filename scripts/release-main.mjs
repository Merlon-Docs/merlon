#!/usr/bin/env node
/**
 * Single-step release on main: version → sync skills → build → commit →
 * push to main → publish npm → push tags → GitHub Releases.
 *
 * Push happens before npm publish so a failed push cannot leave registry
 * packages without the matching commit on main. If origin/main moved during
 * versioning, abort without force-push (latest main wins). Tags are pushed
 * before GitHub Releases so `gh release create` can resolve them; create also
 * passes `--target` so a fresh checkout can heal missing releases.
 *
 * With no pending changesets, ensures git tags + GitHub Releases exist for
 * every current workspace package version (idempotent heal after partial
 * failure). Tags point at the commit that last changed that package.json
 * (the version bump commit), not necessarily HEAD.
 *
 * Requires RELEASE_GITHUB_TOKEN (fine-grained maintainer PAT).
 */
import { execSync } from 'node:child_process';
import { writeFileSync, unlinkSync } from 'node:fs';
import { dirname, join } from 'node:path';
import { fileURLToPath } from 'node:url';
import { pendingChangesetFiles } from './lib/changeset-bumps.mjs';
import {
  packageJsonRelPath,
  packagesNeedingReleaseHeal,
  parseGitLsRemoteTags,
  readWorkspacePackages,
  releaseLatestFlag,
  releaseNotesForPackage,
  releaseTag,
} from './lib/github-releases.mjs';

const root = join(dirname(fileURLToPath(import.meta.url)), '..');
const dryRun = process.argv.includes('--dry-run');

function run(cmd, opts = {}) {
  console.log(`> ${cmd}`);
  if (!dryRun) {
    execSync(cmd, { cwd: root, stdio: 'inherit', ...opts });
  }
}

function capture(cmd, opts = {}) {
  return execSync(cmd, { cwd: root, encoding: 'utf-8', ...opts }).trim();
}

function token() {
  // Do not fall back to GITHUB_TOKEN — push to protected main needs a PAT/App token.
  return process.env.RELEASE_GITHUB_TOKEN || '';
}

function ghEnv() {
  const t = token();
  return {
    ...process.env,
    GH_TOKEN: t,
    GITHUB_TOKEN: t,
  };
}

function listExistingReleaseTags() {
  const raw = capture('gh release list --limit 1000 --json tagName', { env: ghEnv() });
  const rows = JSON.parse(raw);
  return new Set(rows.map((r) => r.tagName));
}

function listRemoteGitTags() {
  return parseGitLsRemoteTags(capture('git ls-remote --tags origin'));
}

/** Commit that last changed this package's package.json (version bump / release). */
function resolvePackageVersionCommit(pkg) {
  const rel = packageJsonRelPath(pkg).replace(/\\/g, '/');
  const sha = capture(`git rev-list -1 HEAD -- "${rel}"`);
  if (!sha) {
    throw new Error(`No git history for ${rel}`);
  }
  return sha;
}

function ensureGitTag(tag, target) {
  let localSha = '';
  try {
    localSha = capture(`git rev-list -1 "refs/tags/${tag}"`);
  } catch {
    // tag missing locally
  }
  if (localSha && localSha !== target) {
    console.log(
      `Tag ${tag} exists locally at ${localSha}, expected ${target} — leaving local tag; pushing if needed`,
    );
  } else if (!localSha) {
    run(`git tag "${tag}" "${target}"`);
  } else {
    console.log(`Tag ${tag} already at ${target} locally`);
  }

  try {
    const remote = capture(`git ls-remote --tags origin "refs/tags/${tag}"`);
    const remoteSha = remote.split(/[\t ]+/)[0] || '';
    if (remoteSha === target) {
      console.log(`Tag ${tag} already on origin at ${target}`);
      return;
    }
    if (remoteSha && remoteSha !== target) {
      console.log(
        `Tag ${tag} on origin at ${remoteSha}, expected ${target} — not moving a published tag`,
      );
      return;
    }
  } catch {
    // treat as missing on remote
  }
  run(`git push origin "refs/tags/${tag}"`);
}

function createGithubRelease(tag, notes, target) {
  const tmp = join(root, '.tmp-release-notes.md');
  writeFileSync(tmp, `${notes}\n`);
  const env = ghEnv();
  try {
    try {
      capture(`gh release view "${tag}"`, { env });
      console.log(`GitHub Release ${tag} already exists — updating notes`);
      run(`gh release edit "${tag}" --notes-file .tmp-release-notes.md`, { env });
    } catch {
      // --target creates the tag on GitHub when missing; prefer matching the version commit.
      // releaseLatestFlag keeps the Latest badge on the CLI's newest final release.
      run(
        `gh release create "${tag}" --title "${tag}" --notes-file .tmp-release-notes.md --target "${target}" ${releaseLatestFlag(tag)}`,
        { env },
      );
    }
  } finally {
    try {
      unlinkSync(tmp);
    } catch {
      // ignore
    }
  }
}

/**
 * Ensure git tags + GitHub Releases for the given packages at each package's
 * version-bump commit (not necessarily HEAD).
 * @param {import('./lib/github-releases.mjs').WorkspacePackage[]} packages
 * @param {{ ensureTag?: boolean, ensureRelease?: boolean }} [opts]
 */
function ensureReleaseArtifacts(packages, opts = {}) {
  const ensureTag = opts.ensureTag !== false;
  const ensureRelease = opts.ensureRelease !== false;
  if (packages.length === 0) {
    console.log('No release artifacts to create or update.');
    return;
  }
  console.log(`Ensuring release artifacts (${packages.length}):`);
  for (const pkg of packages) {
    const tag = releaseTag(pkg.name, pkg.version);
    const target = dryRun ? 'HEAD' : resolvePackageVersionCommit(pkg);
    const notes = releaseNotesForPackage(root, pkg);
    if (dryRun) {
      console.log(`would ensure tag+release ${tag} at ${target}`);
      continue;
    }
    console.log(`  ${tag} → ${target}`);
    if (ensureTag) {
      ensureGitTag(tag, target);
    }
    if (ensureRelease) {
      createGithubRelease(tag, notes, target);
    }
  }
}

function configureGitIdentityAndRemote(ghToken) {
  if (dryRun) return;
  const repo = capture('gh repo view --json nameWithOwner -q .nameWithOwner', {
    env: { ...process.env, GH_TOKEN: ghToken, GITHUB_TOKEN: ghToken },
  });
  execSync(`git remote set-url origin https://x-access-token:${ghToken}@github.com/${repo}.git`, {
    cwd: root,
    stdio: 'ignore',
  });
  console.log('> git remote set-url origin (token redacted)');
  // Runners have no git identity; required before commit (local to this clone).
  run('git config user.name "github-actions[bot]"');
  run('git config user.email "41898282+github-actions[bot]@users.noreply.github.com"');
}

const changesetDir = join(root, '.changeset');
const pending = pendingChangesetFiles(changesetDir);
const ghToken = token();

if (!ghToken && !dryRun) {
  console.error(
    'RELEASE_GITHUB_TOKEN is required (fine-grained PAT with Contents write on this repo).',
  );
  process.exit(1);
}

if (pending.length === 0) {
  console.log('No pending changesets — checking for missing git tags / GitHub Releases.');
  if (dryRun) {
    console.log('dry-run: would heal any missing tags/Releases for current package versions.');
    process.exit(0);
  }
  configureGitIdentityAndRemote(ghToken);
  const packages = [...readWorkspacePackages(root).values()];
  const needing = packagesNeedingReleaseHeal(
    packages,
    listExistingReleaseTags(),
    listRemoteGitTags(),
  );
  if (needing.length === 0) {
    console.log('Nothing to version, publish, or heal.');
    process.exit(0);
  }
  console.log(
    `Healing missing release artifacts (${needing.length}): ${needing
      .map((row) => {
        const tag = releaseTag(row.pkg.name, row.pkg.version);
        const parts = [];
        if (row.missingTag) parts.push('tag');
        if (row.missingRelease) parts.push('release');
        return `${tag}[${parts.join('+')}]`;
      })
      .join(', ')}`,
  );
  ensureReleaseArtifacts(
    needing.map((row) => row.pkg),
    { ensureTag: true, ensureRelease: true },
  );
  console.log('Release heal complete.');
  process.exit(0);
}

console.log(`Pending changesets (${pending.length}): ${pending.join(', ')}`);

const before = readWorkspacePackages(root);

run('pnpm exec changeset version');
run('node scripts/sync-skill-versions.mjs');
run('pnpm skill:validate');
run('pnpm build');
// The pre-commit hook no longer builds or tests, so the release checks the bumped packages here.
run('pnpm typecheck');
run('pnpm test');
run('node scripts/validate-presets.mjs');

const after = readWorkspacePackages(root);
const bumped = [];
for (const [name, next] of after) {
  const prev = before.get(name);
  if (!prev || prev.version !== next.version) {
    bumped.push(next);
  }
}

if (bumped.length === 0) {
  console.error('changeset version ran but no package versions changed.');
  process.exit(1);
}

console.log('Bumped:');
for (const b of bumped) {
  const kind = b.internal ? ' (internal skill, not released)' : b.private ? ' (skill carrier)' : '';
  console.log(`  ${releaseTag(b.name, b.version)}${kind}`);
}

configureGitIdentityAndRemote(ghToken);

run('git add -A');
run('git commit -m "chore: release"');

// Push the release commit to main BEFORE npm publish so a failed push cannot
// leave packages on the registry without the matching commit on main.
// If main moved during versioning, abort without force-push (latest main wins).
if (!dryRun) {
  run('git fetch origin main');
  const parent = capture('git rev-parse HEAD~1');
  const tip = capture('git rev-parse origin/main');
  if (parent !== tip) {
    console.log(
      `Release superseded: commit parent ${parent} is not origin/main ${tip}. ` +
        'Aborting without push (latest main wins). A newer Release run should publish.',
    );
    process.exit(0);
  }
}
run('git push origin HEAD:main');

run('pnpm audit --audit-level=high');
run('pnpm exec changeset publish');

// changeset publish tags every bumped package. An internal skill isn't released, so drop its tag.
const internalBumped = bumped.filter((pkg) => pkg.internal);
for (const pkg of internalBumped) {
  const tag = releaseTag(pkg.name, pkg.version);
  if (capture(`git tag -l "${tag}"`)) run(`git tag -d "${tag}"`);
}

// Push tags before GitHub Releases so create can resolve them when present.
run('git push origin --tags');

// Ensure Releases (and any missing tags) at this release commit.
ensureReleaseArtifacts(bumped.filter((pkg) => !pkg.internal));

run('git push origin --tags');

console.log('Release complete.');
