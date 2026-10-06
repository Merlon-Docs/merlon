#!/usr/bin/env node
/**
 * Measure compiled-guide vs shard context sizes for benefit-claims evidence.
 * Run after: pnpm build && pnpm docs:compile:repo
 *
 * Sizes are reported in characters and in tokens. Token counts are a rough,
 * relative estimate: every model family tokenizes differently, so the useful
 * number is the ratio between a whole guide and one shard, not the absolute count.
 *
 * Choose the tokenizer with a flag or an environment variable:
 *
 *   --tokenizer <name>          o200k_base (default), o200k_harmony, cl100k_base,
 *                               p50k_base, p50k_edit, r50k_base, gpt2, or chars4
 *                               (characters ÷ 4, no tokenizer at all)
 *   --tokenizer-module <path>   your own counter: an ES module whose default export,
 *                               or named export countTokens, maps text to a number
 *   MDCP_TOKENIZER, MDCP_TOKENIZER_MODULE   the same, from the environment
 *
 * Other flags: --out <csv> (default docs/features/protocol/context-size-dogfood.csv),
 * --no-write (print only).
 */
import { readFileSync, writeFileSync, readdirSync, statSync, existsSync } from 'node:fs';
import { basename, join, dirname, relative, resolve, sep } from 'node:path';
import { fileURLToPath, pathToFileURL } from 'node:url';

const __dirname = dirname(fileURLToPath(import.meta.url));
const REPO_ROOT = join(__dirname, '..');
const DOCS_ROOT = join(REPO_ROOT, 'docs');
const MONOLITH = join(DOCS_ROOT, '_build/guides.md');
const DEFAULT_CSV = join(DOCS_ROOT, 'features/protocol/context-size-dogfood.csv');

/** Encodings shipped by gpt-tokenizer; each module exports countTokens(text). */
export const ENCODINGS = [
  'o200k_base',
  'o200k_harmony',
  'cl100k_base',
  'p50k_base',
  'p50k_edit',
  'r50k_base',
  'gpt2',
];

/** Shard directories measured as "one shard", one per guide in docs/mdcp.config.json. */
const SHARD_DIRS = [
  'features',
  'developer',
  'client-cli',
  'client-core',
  'repo-readme',
  'glossary',
];

/** Compiled outputs measured as "a whole guide". */
const GUIDES = [
  ['monolith', 'docs/_build/guides.md'],
  ['developer', 'DEVELOPERS.md'],
  ['client_cli', 'packages/mdcp-cli/README.md'],
  ['client_core', 'packages/mdcp-core/README.md'],
  ['repo_readme', 'README.md'],
];

export function parseArgs(argv, env = {}) {
  const opts = {
    tokenizer: env.MDCP_TOKENIZER || 'o200k_base',
    tokenizerModule: env.MDCP_TOKENIZER_MODULE || null,
    out: DEFAULT_CSV,
    write: true,
  };
  for (let i = 0; i < argv.length; i++) {
    const arg = argv[i];
    if (arg === '--tokenizer') opts.tokenizer = argv[++i];
    else if (arg === '--tokenizer-module') opts.tokenizerModule = argv[++i];
    else if (arg === '--out') opts.out = resolve(argv[++i]);
    else if (arg === '--no-write') opts.write = false;
    else throw new Error(`Unknown argument: ${arg}`);
  }
  return opts;
}

/** Resolve the token counter and the name recorded beside its numbers. */
export async function loadTokenizer({ tokenizer, tokenizerModule }) {
  if (tokenizerModule) {
    const mod = await import(pathToFileURL(resolve(tokenizerModule)).href);
    const count = mod.countTokens ?? mod.default;
    if (typeof count !== 'function') {
      throw new Error(`${tokenizerModule} must export countTokens(text) or a default function`);
    }
    const rel = relative(REPO_ROOT, resolve(tokenizerModule));
    const label = rel.startsWith('..') ? basename(tokenizerModule) : rel.split(sep).join('/');
    return { name: `module:${label}`, count };
  }
  if (tokenizer === 'chars4')
    return { name: 'chars4', count: (text) => Math.ceil(text.length / 4) };
  if (!ENCODINGS.includes(tokenizer)) {
    throw new Error(
      `Unknown tokenizer "${tokenizer}". Use one of: ${ENCODINGS.join(', ')}, chars4`,
    );
  }
  const mod = await import(`gpt-tokenizer/encoding/${tokenizer}`);
  return { name: tokenizer, count: (text) => mod.countTokens(text) };
}

function listShards(dir) {
  const out = [];
  for (const name of readdirSync(dir)) {
    const p = join(dir, name);
    if (statSync(p).isDirectory()) out.push(...listShards(p));
    else if (name.endsWith('.md') && name !== 'index.md') out.push(p);
  }
  return out;
}

export function percentile(sorted, p) {
  const idx = Math.ceil((p / 100) * sorted.length) - 1;
  return sorted[Math.max(0, idx)];
}

export function summarize(values) {
  const sorted = [...values].sort((a, b) => a - b);
  const total = sorted.reduce((a, b) => a + b, 0);
  return {
    count: sorted.length,
    mean: sorted.length ? Math.round(total / sorted.length) : 0,
    median: sorted[Math.floor(sorted.length / 2)] ?? 0,
    p90: sorted.length ? percentile(sorted, 90) : 0,
    max: sorted.at(-1) ?? 0,
  };
}

const pct = (part, whole) => (whole > 0 ? Math.round((part / whole) * 1000) / 10 : 0);

async function main() {
  const opts = parseArgs(process.argv.slice(2), process.env);
  const tokenizer = await loadTokenizer(opts);
  const recordedAt = new Date().toISOString().slice(0, 10);
  const rows = [['metric', 'value', 'unit', 'notes', 'recorded_at']];
  const add = (metric, value, unit, notes) =>
    rows.push([metric, String(value), unit, notes, recordedAt]);
  const measure = (path) => {
    const text = readFileSync(path, 'utf-8');
    return { chars: text.length, tokens: tokenizer.count(text) };
  };

  add('tokenizer', tokenizer.name, 'name', 'rough estimate; other models count differently');

  const guides = {};
  for (const [name, rel] of GUIDES) {
    const abs = join(REPO_ROOT, rel);
    if (!existsSync(abs)) continue;
    guides[name] = measure(abs);
    add(`guide_${name}_chars`, guides[name].chars, 'chars', rel);
    add(`guide_${name}_tokens`, guides[name].tokens, 'tokens', rel);
  }

  const shards = SHARD_DIRS.flatMap((d) => listShards(join(DOCS_ROOT, d))).map(measure);
  const chars = summarize(shards.map((s) => s.chars));
  const tokens = summarize(shards.map((s) => s.tokens));
  const scope = `docs/{${SHARD_DIRS.join(',')}}/**/*.md, excludes index.md`;
  add('shard_count', chars.count, 'count', scope);
  for (const stat of ['mean', 'median', 'p90', 'max']) {
    add(`shard_${stat}_chars`, chars[stat], 'chars', scope);
    add(`shard_${stat}_tokens`, tokens[stat], 'tokens', scope);
  }

  // Features-only figures, kept for the Tier B wording in benefit-claims-and-evidence.md.
  const monolithChars = guides.monolith?.chars ?? measure(MONOLITH).chars;
  const featureShards = listShards(join(DOCS_ROOT, 'features')).map(measure);
  const featureChars = summarize(featureShards.map((s) => s.chars));
  const featureTokens = summarize(featureShards.map((s) => s.tokens));
  add('features_monolith_chars', monolithChars, 'chars', 'docs/_build/guides.md');
  add('feature_shard_count', featureChars.count, 'count', 'excludes index.md');
  add('feature_shard_median_chars', featureChars.median, 'chars', 'docs/features/**/*.md');
  add('feature_shard_p90_chars', featureChars.p90, 'chars', 'docs/features/**/*.md');
  add('feature_shard_median_tokens', featureTokens.median, 'tokens', 'docs/features/**/*.md');
  add(
    'median_shard_pct_of_monolith',
    pct(featureChars.median, monolithChars),
    'percent',
    'median feature shard / monolith character ratio',
  );
  if (guides.monolith) {
    add(
      'median_shard_token_pct_of_monolith',
      pct(featureTokens.median, guides.monolith.tokens),
      'percent',
      'median feature shard / monolith token ratio',
    );
  }

  const table = rows
    .slice(1)
    .map(([m, v, u]) => `  ${m.padEnd(36)} ${v.padStart(10)} ${u}`)
    .join('\n');
  console.log(`Context sizes (tokenizer: ${tokenizer.name}; a rough, relative estimate)\n${table}`);

  if (opts.write) {
    writeFileSync(opts.out, rows.map((r) => r.join(',')).join('\n') + '\n');
    console.log(`Wrote ${relative(REPO_ROOT, opts.out).split(sep).join('/')}`);
  }
}

if (process.argv[1] && resolve(process.argv[1]) === fileURLToPath(import.meta.url)) {
  await main();
}
