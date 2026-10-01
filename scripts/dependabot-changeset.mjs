#!/usr/bin/env node
/**
 * Commit a patch changeset to a Dependabot PR that bumps runtime dependencies
 * of a workspace package. Runs from .github/workflows/dependabot-changeset.yml.
 *
 * Reads the PR through the GitHub API only: the PR's package.json files are
 * parsed as data, never checked out or executed. Writes
 * .changeset/dependabot-pr-<n>.md to the PR branch (idempotent).
 *
 * Env: GH_TOKEN (contents:write; a PAT or app token so the push re-runs CI),
 * GITHUB_REPOSITORY, PR_NUMBER, HEAD_REF, HEAD_SHA, BASE_SHA.
 */
import { Buffer } from 'node:buffer';
import {
  PACKAGE_JSON_PATH,
  changesetPath,
  renderChangeset,
  runtimeDependencyChanges,
} from './lib/dependabot-changeset.mjs';

const { GH_TOKEN, GITHUB_REPOSITORY, PR_NUMBER, HEAD_REF, HEAD_SHA, BASE_SHA } = process.env;
const API = process.env.GITHUB_API_URL ?? 'https://api.github.com';

for (const [key, value] of Object.entries({
  GITHUB_REPOSITORY,
  PR_NUMBER,
  HEAD_REF,
  HEAD_SHA,
  BASE_SHA,
})) {
  if (!value) {
    console.error(`Missing ${key}`);
    process.exit(1);
  }
}

if (!GH_TOKEN) {
  console.log(
    '::warning::DEPENDABOT_CHANGESET_TOKEN is not set, so no changeset was added. ' +
      'See docs/developer/versioning-and-releases.md#dependabot.',
  );
  process.exit(0);
}

async function api(path, init = {}) {
  const res = await globalThis.fetch(`${API}${path}`, {
    ...init,
    headers: {
      accept: 'application/vnd.github+json',
      authorization: `Bearer ${GH_TOKEN}`,
      'x-github-api-version': '2022-11-28',
      ...init.headers,
    },
  });
  if (res.status === 404) return null;
  if (!res.ok) {
    throw new Error(`${init.method ?? 'GET'} ${path}: ${res.status} ${await res.text()}`);
  }
  return res.json();
}

async function changedFiles() {
  const files = [];
  for (let page = 1; ; page++) {
    const batch = await api(
      `/repos/${GITHUB_REPOSITORY}/pulls/${PR_NUMBER}/files?per_page=100&page=${page}`,
    );
    files.push(...batch);
    if (batch.length < 100) return files;
  }
}

async function readFile(path, ref) {
  const body = await api(
    `/repos/${GITHUB_REPOSITORY}/contents/${path}?ref=${encodeURIComponent(ref)}`,
  );
  if (!body) return null;
  return { sha: body.sha, text: Buffer.from(body.content, 'base64').toString('utf8') };
}

const bumps = [];
for (const file of await changedFiles()) {
  if (!PACKAGE_JSON_PATH.test(file.filename)) continue;
  const before = await readFile(file.filename, BASE_SHA);
  const after = await readFile(file.filename, HEAD_SHA);
  if (!before || !after) continue;
  const next = JSON.parse(after.text);
  bumps.push({
    packageName: next.name,
    changes: runtimeDependencyChanges(JSON.parse(before.text), next),
  });
}

const content = renderChangeset(bumps);
if (!content) {
  console.log('No runtime dependency changes in packages/*/package.json; no changeset needed.');
  process.exit(0);
}

const target = changesetPath(Number(PR_NUMBER));
const existing = await readFile(target, HEAD_SHA);
if (existing?.text === content) {
  console.log(`${target} is already up to date.`);
  process.exit(0);
}

await api(`/repos/${GITHUB_REPOSITORY}/contents/${target}`, {
  method: 'PUT',
  headers: { 'content-type': 'application/json' },
  body: JSON.stringify({
    message: `chore(changeset): add patch changeset for Dependabot PR #${PR_NUMBER}`,
    content: Buffer.from(content).toString('base64'),
    branch: HEAD_REF,
    ...(existing ? { sha: existing.sha } : {}),
  }),
});
console.log(`Committed ${target}:\n${content}`);
