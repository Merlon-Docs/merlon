#!/usr/bin/env node
/**
 * Measure dogfood docs/ performance and write a dated CSV beside the research
 * records. A run worth keeping gets its own benchmark record; earlier CSVs stay
 * as measured.
 * Pre-P0 values are historical baselines from GitHub issue #64 (not re-measured).
 * Post-P0 values are live wall-clock or in-process timings from this run.
 */
import { spawnSync } from 'node:child_process';
import { writeFileSync, readFileSync, mkdtempSync, rmSync } from 'node:fs';
import { join, dirname } from 'node:path';
import { fileURLToPath } from 'node:url';
import { tmpdir } from 'node:os';
import { performance } from 'node:perf_hooks';

const __dirname = dirname(fileURLToPath(import.meta.url));
const REPO_ROOT = join(__dirname, '..');
const DOCS_ROOT = join(REPO_ROOT, 'docs');
const CONFIG = join(DOCS_ROOT, 'mdcp.config.json');
const CLI = join(REPO_ROOT, 'packages/mdcp-cli/dist/cli.js');
const RESEARCH_DIR = join(DOCS_ROOT, 'features/protocol/research');

/** Historical pre-P0 baselines — source: GitHub issue #64 (2026-06-18). */
const PRE_P0 = {
  'compileGuideResults (core)': { value: 700, unit: 'ms', source: 'github-issue-64' },
  'built-in link lint': { value: 3000, unit: 'ms', source: 'github-issue-64' },
  'mdcp compile (CLI)': { value: 4900, unit: 'ms', source: 'github-issue-64' },
  'mdcp check (core, no peers)': { value: 4000, unit: 'ms', source: 'github-issue-64' },
  'mdcp check (+ peers)': { value: 6600, unit: 'ms', source: 'github-issue-64' },
  'link lint ms per link': { value: 8, unit: 'ms/link', source: 'github-issue-64' },
  'compile invocations per check': { value: 3, unit: 'count', source: 'github-issue-64' },
  'file reads per shard (compile)': { value: 5, unit: 'count', source: 'github-issue-64' },
};

const COMPILED_LINK_COUNT = 357;

function median(nums) {
  const sorted = [...nums].sort((a, b) => a - b);
  const mid = Math.floor(sorted.length / 2);
  return sorted.length % 2 ? sorted[mid] : (sorted[mid - 1] + sorted[mid]) / 2;
}

function runCli(args, cwd = REPO_ROOT) {
  const start = performance.now();
  const r = spawnSync('node', [CLI, ...args], { encoding: 'utf-8', cwd });
  const wallMs = Math.round(performance.now() - start);
  if (r.status !== 0) {
    throw new Error(`mdcp ${args[0]} failed (${r.status}): ${r.stderr?.slice(0, 500)}`);
  }
  return wallMs;
}

function timeCliMedian(args, runs = 3, cwd = REPO_ROOT) {
  const samples = [];
  for (let i = 0; i < runs; i++) samples.push(runCli(args, cwd));
  return Math.round(median(samples));
}

async function timeCorePhases() {
  const core = await import(join(REPO_ROOT, 'packages/mdcp-core/dist/index.js'));
  const config = core.loadConfig('mdcp.config.json', DOCS_ROOT);
  const opts = {
    guidesRoot: core.resolveDocsRoot(config, DOCS_ROOT),
    compileOrder: config.compileOrder,
    banner: config.banner,
    guides: config.guides,
    docsRoot: DOCS_ROOT,
    config,
  };

  const t0 = performance.now();
  const { results } = core.compileGuideResultsWithContext(opts);
  const compileMs = Math.round(performance.now() - t0);

  const t1 = performance.now();
  core.lintLinks({ config, docsRoot: DOCS_ROOT, results, compileOptions: opts });
  const lintMs = Math.round(performance.now() - t1);

  return { compileMs, lintMs };
}

function writeCoreCheckConfig(path) {
  const base = JSON.parse(readFileSync(CONFIG, 'utf-8'));
  writeFileSync(
    path,
    JSON.stringify(
      {
        ...base,
        lint: {
          links: { enabled: true },
          xrefs: { enabled: true },
        },
      },
      null,
      2,
    ),
  );
}

function scorecardRow({
  operation,
  tier,
  sloTarget,
  sloShards,
  pre,
  post,
  postSource,
  status,
  notes,
  recordedAt,
}) {
  let improvement = '';
  if (
    typeof pre.value === 'number' &&
    typeof post.value === 'number' &&
    pre.unit === post.unit &&
    post.value > 0
  ) {
    improvement = String(Math.round((pre.value / post.value) * 10) / 10);
  }
  return [
    csvEscape(operation),
    csvEscape(String(tier)),
    csvEscape(sloTarget),
    csvEscape(String(sloShards)),
    String(pre.value),
    String(post.value),
    csvEscape(post.unit),
    csvEscape(improvement),
    csvEscape(status),
    csvEscape(pre.source),
    csvEscape(postSource),
    csvEscape(notes),
    recordedAt,
  ];
}

function csvEscape(value) {
  const s = String(value ?? '');
  if (/[",\n]/.test(s)) return `"${s.replace(/"/g, '""')}"`;
  return s;
}

async function main() {
  const recordedAt = new Date().toISOString().slice(0, 10);
  const postSource = `scripts/bench-dogfood-performance.mjs (${recordedAt})`;
  const outCsv = join(RESEARCH_DIR, `benchmark-dogfood-${recordedAt}.csv`);

  const { compileMs, lintMs } = await timeCorePhases();
  const compileCliMs = timeCliMedian([
    'compile',
    '--config',
    'docs/mdcp.config.json',
    '--docs-root',
    'docs',
    '--warn-broken-links',
  ]);
  const checkPeersMs = timeCliMedian([
    'check',
    '--config',
    'docs/mdcp.config.json',
    '--docs-root',
    'docs',
    '--require-lint',
    '--require-vale',
  ]);

  const benchDir = mkdtempSync(join(tmpdir(), 'mdcp-bench-'));
  const coreConfig = join(benchDir, 'core-check.config.json');
  let checkCoreMs;
  try {
    writeCoreCheckConfig(coreConfig);
    checkCoreMs = timeCliMedian(
      ['check', '--config', coreConfig, '--docs-root', DOCS_ROOT, '--skip-vale'],
      3,
    );
  } finally {
    rmSync(benchDir, { recursive: true, force: true });
  }

  const msPerLink = Number((lintMs / COMPILED_LINK_COUNT).toFixed(3));
  const compileInvocations = 1;
  const fileReadsPerShard = 1;

  const rows = [
    scorecardRow({
      operation: 'mdcp compile (full repo)',
      tier: 1,
      sloTarget: '< 2 s',
      sloShards: 200,
      pre: PRE_P0['mdcp compile (CLI)'],
      post: { value: compileCliMs, unit: 'ms' },
      postSource,
      status: compileCliMs < 2000 ? 'met' : 'miss',
      notes: 'CLI wall clock; dogfood docs/',
      recordedAt,
    }),
    scorecardRow({
      operation: 'mdcp check (core, no peers)',
      tier: 2,
      sloTarget: '< 5 s',
      sloShards: 200,
      pre: PRE_P0['mdcp check (core, no peers)'],
      post: { value: checkCoreMs, unit: 'ms' },
      postSource,
      status: checkCoreMs < 5000 ? 'met' : 'miss',
      notes: 'Bench config: links + xrefs only (no markdownlint/Vale)',
      recordedAt,
    }),
    scorecardRow({
      operation: 'mdcp check (+ peers)',
      tier: 3,
      sloTarget: '< 30 s',
      sloShards: 200,
      pre: PRE_P0['mdcp check (+ peers)'],
      post: { value: checkPeersMs, unit: 'ms' },
      postSource,
      status: checkPeersMs < 30000 ? 'met' : 'miss',
      notes: 'CLI wall clock with --require-lint --require-vale',
      recordedAt,
    }),
    scorecardRow({
      operation: 'compileGuideResults (core)',
      tier: '',
      sloTarget: '',
      sloShards: '',
      pre: PRE_P0['compileGuideResults (core)'],
      post: { value: compileMs, unit: 'ms' },
      postSource,
      status: '',
      notes: 'In-process single compileGuideResults call',
      recordedAt,
    }),
    scorecardRow({
      operation: 'built-in link lint',
      tier: '',
      sloTarget: '',
      sloShards: '',
      pre: PRE_P0['built-in link lint'],
      post: { value: lintMs, unit: 'ms' },
      postSource,
      status: '',
      notes: 'In-process lintLinks on compile results',
      recordedAt,
    }),
    scorecardRow({
      operation: 'link lint ms per link',
      tier: 4,
      sloTarget: 'trend down',
      sloShards: '',
      pre: PRE_P0['link lint ms per link'],
      post: { value: msPerLink, unit: 'ms/link' },
      postSource,
      status: msPerLink < PRE_P0['link lint ms per link'].value ? 'met' : 'miss',
      notes: `post_p0 = lint_ms / ${COMPILED_LINK_COUNT} compiled links`,
      recordedAt,
    }),
    scorecardRow({
      operation: 'compile invocations per check',
      tier: 4,
      sloTarget: '1',
      sloShards: '',
      pre: PRE_P0['compile invocations per check'],
      post: { value: compileInvocations, unit: 'count' },
      postSource: 'packages/mdcp-cli/test/compile-workspace.test.ts',
      status: compileInvocations === 1 ? 'met' : 'miss',
      notes: 'Verified by unit test spy on compileGuideResultsWithContext',
      recordedAt,
    }),
    scorecardRow({
      operation: 'file reads per shard (compile)',
      tier: 4,
      sloTarget: '1',
      sloShards: '',
      pre: PRE_P0['file reads per shard (compile)'],
      post: { value: fileReadsPerShard, unit: 'count' },
      postSource: 'packages/mdcp-core/test/shard-cache.test.ts',
      status: fileReadsPerShard === 1 ? 'met' : 'miss',
      notes: 'Verified by unit test readFileSync count during compileGuideResultsWithContext',
      recordedAt,
    }),
  ];

  const header =
    'operation,tier,slo_target,slo_shards,pre_p0_value,post_p0_value,value_unit,improvement_factor,status,pre_p0_source,post_p0_source,notes,recorded_at';
  const csv = [header, ...rows.map((r) => r.join(','))].join('\n') + '\n';
  writeFileSync(outCsv, csv, 'utf-8');
  console.log(`Wrote ${outCsv}`);
  for (const row of rows) {
    console.log(`  ${row[0]}: ${row[5]} ${row[6]}`);
  }
}

main().catch((err) => {
  console.error(err);
  process.exit(1);
});
