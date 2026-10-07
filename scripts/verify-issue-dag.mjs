#!/usr/bin/env node
/**
 * Verify docs/superpowers/dag/issues-dag.json:
 * - unique issue ids, valid wave refs, acyclic depends_on
 * - plan files exist; gate-monitor nodes have gate object
 * - topological execution order; wave order respects dependencies
 * - optional: cross-check open GitHub issues via gh CLI
 *
 * Usage:
 *   node scripts/verify-issue-dag.mjs
 *   node scripts/verify-issue-dag.mjs --order
 *   node scripts/verify-issue-dag.mjs --wave wave-2
 *   node scripts/verify-issue-dag.mjs --ready  # nodes with all deps satisfied (none done)
 *   node scripts/verify-issue-dag.mjs --check-gh
 */
import { readFileSync, existsSync } from 'node:fs';
import { dirname, join } from 'node:path';
import { fileURLToPath } from 'node:url';
import { execSync } from 'node:child_process';

const __dirname = dirname(fileURLToPath(import.meta.url));
const REPO_ROOT = join(__dirname, '..');
const DAG_PATH = join(REPO_ROOT, 'docs/superpowers/dag/issues-dag.json');

const WAVE_ORDER = ['wave-0', 'wave-1', 'wave-2', 'wave-3', 'wave-4', 'wave-gate', 'wave-epic'];

function loadDag() {
  const raw = readFileSync(DAG_PATH, 'utf8');
  return JSON.parse(raw);
}

function waveIndex(waveId) {
  const i = WAVE_ORDER.indexOf(waveId);
  if (i === -1) throw new Error(`Unknown wave id: ${waveId}`);
  return i;
}

/** @param {import('./verify-issue-dag.types').Dag} dag */
function buildNodeMap(dag) {
  /** @type {Map<number, object>} */
  const map = new Map();
  for (const node of dag.nodes) {
    if (map.has(node.issue)) {
      throw new Error(`Duplicate issue id: ${node.issue}`);
    }
    map.set(node.issue, node);
  }
  return map;
}

/** @param {import('./verify-issue-dag.types').Dag} dag */
function validateStructure(dag) {
  const errors = [];
  const waveIds = new Set(dag.waves.map((w) => w.id));
  const nodeMap = buildNodeMap(dag);

  for (const node of dag.nodes) {
    if (!waveIds.has(node.wave)) {
      errors.push(`#${node.issue}: unknown wave "${node.wave}"`);
    }
    if (!existsSync(join(REPO_ROOT, node.plan_file))) {
      errors.push(`#${node.issue}: missing plan_file ${node.plan_file}`);
    }
    for (const dep of node.depends_on ?? []) {
      if (!nodeMap.has(dep)) {
        errors.push(`#${node.issue}: depends_on unknown issue #${dep}`);
      }
    }
    if (node.mode === 'gate-monitor' && !node.gate) {
      errors.push(`#${node.issue}: gate-monitor mode requires gate object`);
    }
    if (node.mode === 'inflight' && !node.inflight_pr) {
      errors.push(`#${node.issue}: inflight mode requires inflight_pr`);
    }
    if (node.kind === 'epic' && node.mode === 'rollup' && !node.never_close) {
      const cw = node.closes_when ?? [];
      if (cw.length === 0 && !node.never_close) {
        if (node.issue !== 173) {
          errors.push(`#${node.issue}: rollup epic needs closes_when or never_close`);
        }
      }
    }
  }

  return { errors, nodeMap, waveIds };
}

/** Kahn topological sort on depends_on edges */
function topologicalOrder(nodeMap) {
  const inDegree = new Map();
  for (const id of nodeMap.keys()) inDegree.set(id, 0);

  for (const node of nodeMap.values()) {
    const depCount = (node.depends_on ?? []).length;
    if (depCount > 0) {
      inDegree.set(node.issue, (inDegree.get(node.issue) ?? 0) + depCount);
    }
  }

  const queue = [...nodeMap.keys()].filter((id) => inDegree.get(id) === 0);
  queue.sort((a, b) => a - b);
  const order = [];

  while (queue.length) {
    const id = queue.shift();
    order.push(id);
    for (const node of nodeMap.values()) {
      if ((node.depends_on ?? []).includes(id)) {
        const next = inDegree.get(node.issue) - 1;
        inDegree.set(node.issue, next);
        if (next === 0) {
          queue.push(node.issue);
          queue.sort((a, b) => a - b);
        }
      }
    }
  }

  if (order.length !== nodeMap.size) {
    throw new Error('Cycle detected in depends_on graph');
  }
  return order;
}

/** Ensure dependency wave is not after dependent wave (implement nodes only) */
function validateWaveOrdering(nodeMap) {
  const errors = [];
  for (const node of nodeMap.values()) {
    if (node.mode === 'gate-monitor' || node.mode === 'rollup') continue;
    const nodeWave = waveIndex(node.wave);
    for (const dep of node.depends_on ?? []) {
      const depNode = nodeMap.get(dep);
      if (!depNode) continue;
      const depWave = waveIndex(depNode.wave);
      if (depWave > nodeWave) {
        errors.push(
          `#${node.issue} (wave ${node.wave}) depends on #${dep} (wave ${depNode.wave}) — wave inversion`,
        );
      }
    }
  }
  return errors;
}

function fetchOpenIssues() {
  try {
    const out = execSync(
      'gh issue list --repo betsalel-williamson/mdcp --state open --limit 200 --json number',
      { encoding: 'utf8', cwd: REPO_ROOT },
    );
    return new Set(JSON.parse(out).map((i) => i.number));
  } catch {
    return null;
  }
}

function checkGithubSync(nodeMap) {
  const open = fetchOpenIssues();
  if (!open) return ['gh CLI unavailable — skipped open-issue sync check'];
  const errors = [];
  const dagIssues = new Set(nodeMap.keys());
  for (const n of open) {
    if (!dagIssues.has(n)) errors.push(`Open GitHub issue #${n} missing from DAG`);
  }
  for (const n of dagIssues) {
    if (!open.has(n)) errors.push(`DAG issue #${n} not open on GitHub`);
  }
  return errors;
}

function nodesInWave(nodeMap, waveId) {
  return [...nodeMap.values()]
    .filter((n) => n.wave === waveId)
    .map((n) => n.issue)
    .sort((a, b) => a - b);
}

function readyNodes(nodeMap, completed = new Set()) {
  const ready = [];
  for (const node of nodeMap.values()) {
    if (completed.has(node.issue)) continue;
    const deps = node.depends_on ?? [];
    if (deps.every((d) => completed.has(d))) ready.push(node.issue);
  }
  return ready.sort((a, b) => a - b);
}

function simulateExecution(nodeMap, { waveAware = false } = {}) {
  const completed = new Set();
  const steps = [];
  const remaining = new Set(nodeMap.keys());

  while (remaining.size > 0) {
    let candidates = [...remaining].filter((id) => {
      const node = nodeMap.get(id);
      return (node.depends_on ?? []).every((d) => completed.has(d));
    });
    if (candidates.length === 0) {
      throw new Error('Execution simulation stuck — cycle or missing deps');
    }
    if (waveAware) {
      const minWave = Math.min(...candidates.map((id) => waveIndex(nodeMap.get(id).wave)));
      candidates = candidates.filter((id) => waveIndex(nodeMap.get(id).wave) === minWave);
    }
    candidates.sort((a, b) => a - b);
    steps.push(candidates);
    for (const id of candidates) {
      completed.add(id);
      remaining.delete(id);
    }
  }
  return steps;
}

function main() {
  const args = new Set(process.argv.slice(2));
  const dag = loadDag();
  const { errors, nodeMap } = validateStructure(dag);
  const waveErrors = validateWaveOrdering(nodeMap);

  let allErrors = [...errors, ...waveErrors];

  try {
    topologicalOrder(nodeMap);
  } catch (e) {
    allErrors.push(e.message);
  }

  if (args.has('--check-gh')) {
    allErrors = allErrors.concat(checkGithubSync(nodeMap));
  }

  if (allErrors.length > 0) {
    console.error('verify-issue-dag: FAILED\n');
    for (const e of allErrors) console.error(`  - ${e}`);
    process.exit(1);
  }

  if (args.has('--order')) {
    const order = topologicalOrder(nodeMap);
    console.log('Topological order (depends_on):');
    for (const id of order) {
      const n = nodeMap.get(id);
      console.log(`  #${id} [${n.wave}] ${n.mode} ${n.title ?? n.slug}`);
    }
    return;
  }

  if (args.has('--waves')) {
    console.log('Waves:');
    for (const w of WAVE_ORDER) {
      const ids = nodesInWave(nodeMap, w);
      const meta = dag.waves.find((x) => x.id === w);
      console.log(`  ${w}: ${ids.map((i) => `#${i}`).join(', ') || '(empty)'}`);
      if (meta) console.log(`    ${meta.description}`);
    }
    return;
  }

  const waveArg = process.argv.find((a) => a.startsWith('--wave='));
  if (waveArg) {
    const waveId = waveArg.split('=')[1];
    console.log(nodesInWave(nodeMap, waveId).join(','));
    return;
  }

  if (args.has('--ready')) {
    console.log(readyNodes(nodeMap).join(','));
    return;
  }

  if (args.has('--simulate') || args.has('--simulate-waves')) {
    const waveAware = args.has('--simulate-waves');
    const steps = simulateExecution(nodeMap, { waveAware });
    const label = waveAware
      ? 'Wave-aware execution batches (orchestrator order):'
      : 'Execution batches (deps only, parallel within each line):';
    console.log(label);
    steps.forEach((batch, i) => {
      const waves = [...new Set(batch.map((id) => nodeMap.get(id).wave))];
      console.log(
        `  batch ${i + 1} [${waves.join(',')}]: ${batch.map((id) => `#${id}`).join(', ')}`,
      );
    });
    return;
  }

  console.log(
    `verify-issue-dag: OK (${dag.nodes.length} nodes, ${dag.waves.length} waves, acyclic)`,
  );
}

main();
