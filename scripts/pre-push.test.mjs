import { test } from 'node:test';
import assert from 'node:assert/strict';
import { pushedBranchShas } from './pre-push.mjs';

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
