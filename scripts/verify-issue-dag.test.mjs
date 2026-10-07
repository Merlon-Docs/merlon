import { test } from 'node:test';
import assert from 'node:assert/strict';
import { readFileSync, existsSync } from 'node:fs';
import { dirname, join } from 'node:path';
import { fileURLToPath } from 'node:url';
import { execSync } from 'node:child_process';

const __dirname = dirname(fileURLToPath(import.meta.url));
const REPO_ROOT = join(__dirname, '..');
const DAG_PATH = join(REPO_ROOT, 'docs/superpowers/dag/issues-dag.json');

test('issues-dag.json exists and parses', () => {
  assert.ok(existsSync(DAG_PATH));
  const dag = JSON.parse(readFileSync(DAG_PATH, 'utf8'));
  assert.equal(dag.version, 1);
  assert.equal(dag.nodes.length, 25);
});

test('verify-issue-dag.mjs exits 0', () => {
  execSync('node scripts/verify-issue-dag.mjs', { cwd: REPO_ROOT, stdio: 'pipe' });
});

test('protocol spine order: 46 before 48 before 47 before 49', () => {
  const order = execSync('node scripts/verify-issue-dag.mjs --order', {
    cwd: REPO_ROOT,
    encoding: 'utf8',
  });
  const lines = order.split('\n').filter((l) => l.includes('#'));
  const idx = (n) => lines.findIndex((l) => l.includes(`#${n} `));
  assert.ok(idx(46) < idx(48), '46 before 48');
  assert.ok(idx(48) < idx(47), '48 before 47');
  assert.ok(idx(47) < idx(49), '47 before 49');
});

test('every node has a plan file on disk', () => {
  const dag = JSON.parse(readFileSync(DAG_PATH, 'utf8'));
  for (const node of dag.nodes) {
    assert.ok(
      existsSync(join(REPO_ROOT, node.plan_file)),
      `missing plan for #${node.issue}: ${node.plan_file}`,
    );
  }
});

test('simulate execution produces batches', () => {
  const out = execSync('node scripts/verify-issue-dag.mjs --simulate-waves', {
    cwd: REPO_ROOT,
    encoding: 'utf8',
  });
  assert.match(out, /batch 1 \[/);
  assert.match(out, /#153/);
  assert.match(out, /wave-0/);
});
