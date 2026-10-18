import { test } from 'node:test';
import assert from 'node:assert/strict';
import { readFileSync } from 'node:fs';
import { URL } from 'node:url';
import { CHANGESET_COMMANDS, FORMAL_PATHS, GATE_COMMANDS, pushedBranchShas } from './pre-push.mjs';

const ZERO = '0'.repeat(40);
const A = 'a'.repeat(40);
const B = 'b'.repeat(40);

test('pushedBranchShas keeps branch pushes and skips deletions and tags', () => {
  const stdin = [
    `refs/heads/feature ${A} refs/heads/feature ${B}`,
    `(delete) ${ZERO} refs/heads/old ${B}`,
    `refs/tags/v1 ${B} refs/tags/v1 ${ZERO}`,
    '',
  ].join('\n');
  assert.deepEqual(pushedBranchShas(stdin), [A]);
});

test('pushedBranchShas returns nothing for an empty push', () => {
  assert.deepEqual(pushedBranchShas(''), []);
});

/** The run lines of the land gate step, without comments, `set` and the formal block. */
function landGateLines() {
  const workflow = readFileSync(
    new URL('../.github/workflows/land-develop.yml', import.meta.url),
    'utf8',
  );
  const start = workflow.indexOf('- name: Gate (');
  assert.ok(start >= 0, 'land-develop.yml has a Gate step');
  const block = workflow.slice(start, workflow.indexOf('\n  land:', start));
  const run = block.slice(block.indexOf('run: |') + 'run: |'.length);
  return run
    .split('\n')
    .map((line) => line.trim())
    .filter((line) => line && !line.startsWith('#') && !line.startsWith('set '));
}

test('the pre-push hook runs the land gate commands in order', () => {
  const lines = landGateLines();
  const formalStart = lines.findIndex((line) => line.startsWith('if '));
  assert.deepEqual(lines.slice(0, formalStart), GATE_COMMANDS);
  assert.deepEqual(lines.slice(lines.indexOf('fi') + 1), CHANGESET_COMMANDS);
});

test('the pre-push hook runs the formal models on the paths the land gate watches', () => {
  const condition = landGateLines().find((line) => line.startsWith('if '));
  assert.match(condition, new RegExp(` -- ${FORMAL_PATHS.join(' ')};`));
});
