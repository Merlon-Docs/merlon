// Pins the workflow guards that docs/developer/formal-models.md lists as in
// place, so an edit that drops one fails here. The workflows are read as text,
// so the patterns below follow the files' two-space indentation.
import assert from 'node:assert/strict';
import { readFileSync } from 'node:fs';
import { dirname, join } from 'node:path';
import { describe, it } from 'node:test';
import { fileURLToPath } from 'node:url';

const workflows = join(dirname(fileURLToPath(import.meta.url)), '..', '.github', 'workflows');
const read = (name) => readFileSync(join(workflows, name), 'utf8');

/** The lines of the top-level `on:` block. */
function triggers(text) {
  const block = /^on:\n((?:[ \t]+.*\n|\n)*)/m.exec(text);
  assert.ok(block, 'workflow has an on: block');
  return block[1];
}

describe('sync from main goes through the land gate', () => {
  const sync = read('sync-develop.yml');
  const land = read('land-develop.yml');

  it('never pushes develop itself', () => {
    // The one push allowed, so a push through a variable such as HEAD:$TARGET
    // fails here too.
    const pushes = sync.match(/git push[^\n]*/g) ?? [];
    assert.ok(pushes.length > 0, 'the sync pushes its merge somewhere');
    for (const push of pushes) {
      assert.equal(push, 'git push --force origin "HEAD:refs/heads/${SYNC_BRANCH}"');
    }
    assert.doesNotMatch(sync, /gh api/, 'the sync moves no ref through the API');
  });

  it('pushes the merge to a land/** branch and dispatches the land workflow on it', () => {
    assert.match(sync, /^\s+SYNC_BRANCH: land\/[\w-]+$/m);
    assert.match(sync, /git push --force origin "HEAD:refs\/heads\/\$\{SYNC_BRANCH\}"/);
    assert.match(sync, /gh workflow run land-develop\.yml --ref "\$\{SYNC_BRANCH\}"/);
  });

  it('gives the sync job the permissions its push, dispatch and conflict PR need', () => {
    // Without actions: write the dispatch fails after the push, and develop
    // never gets main.
    const block = /^ {2}sync:\n(?: {4}.*\n)*? {4}permissions:\n((?: {6}.*\n)+)/m.exec(sync);
    assert.ok(block, 'the sync job sets its own permissions');
    const granted = Object.fromEntries(
      [...block[1].matchAll(/^ {6}([\w-]+): (\w+)/gm)].map(([, scope, level]) => [scope, level]),
    );
    assert.equal(granted.contents, 'write');
    assert.equal(granted.actions, 'write');
    assert.equal(granted['pull-requests'], 'write');
  });

  it('keeps the conflict PR from main to develop', () => {
    assert.match(sync, /gh pr create --base develop --head main/);
  });

  it('lets the land workflow be dispatched, on land branches only', () => {
    assert.match(triggers(land), /^ {2}workflow_dispatch:/m);
    assert.match(
      land,
      /case "\$GITHUB_REF" in\n\s+refs\/heads\/claude\/\* \| refs\/heads\/land\/\*\) ;;/,
    );
  });
});
