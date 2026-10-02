import { existsSync, readFileSync } from 'node:fs';
import { basename, dirname, join, relative, resolve, sep } from 'node:path';
import { linkedSectionFiles } from '../compile/section-manifest.js';
import { extractLinks } from '../links/extract.js';
import {
  countWords,
  headingTitlePlain,
  inlineToPlain,
  listMarkerLength,
  maskNonProse,
  parseHeading,
  stripBlockMarkers,
} from '../markdown/index.js';
import { filterScanIgnored } from './coverage.js';
import type { GuideDirEntry } from './orphans.js';

/** Sprawl signals reported by {@link reviewDocs}, in report order. */
export const REVIEW_SIGNALS = [
  'index-size',
  'long-shard',
  'duplicate-paragraph',
  'similar-titles',
] as const;

export type ReviewSignal = (typeof REVIEW_SIGNALS)[number];

export interface ReviewFinding {
  signal: ReviewSignal;
  severity: 'warning';
  /** Docs-root-relative POSIX paths, sorted. */
  files: string[];
  detail: string;
  fix: string;
}

export interface ReviewThresholds {
  /** Most shard links one index group may list before `index-size` fires. */
  maxIndexEntries: number;
  /** Most prose words a shard may hold before `long-shard` fires. */
  maxShardWords: number;
  /** Fewest words a paragraph needs before `duplicate-paragraph` compares it. */
  minDuplicateWords: number;
}

export const DEFAULT_REVIEW_THRESHOLDS: ReviewThresholds = {
  maxIndexEntries: 12,
  maxShardWords: 2500,
  minDuplicateWords: 25,
};

export const REVIEW_FIXES: Record<ReviewSignal, string> = {
  'index-size': "Group entries under headings named for the reader's task.",
  'long-shard': 'Check whether it serves two audiences or jobs; split it if so (idea mitosis).',
  'duplicate-paragraph':
    'Keep the paragraph in the shard that owns the rule and link to it from the others.',
  'similar-titles': 'Merge the shards, or retitle them so each title names its one job.',
};

export interface ReviewOptions {
  /** Guides in `compileOrder` order (same entries `mdcp check` uses for orphans). */
  guides: GuideDirEntry[];
  /** Docs root; reported paths are relative to it. */
  docsRoot: string;
  /** Scan root for `ignore` globs (CLI: `scan.root` or the invocation directory). */
  scanRoot?: string;
  /** `scan.ignore` globs, relative to `scanRoot`. Applied only when `scanRoot` is set. */
  ignore?: string[];
  thresholds?: Partial<ReviewThresholds>;
  /**
   * Review one guide (by `compileOrder` name): keep findings that involve at least one of its
   * shards, including duplicates whose other copies sit in other guides. Unknown names throw.
   */
  guide?: string;
}

export interface ReviewResult {
  findings: ReviewFinding[];
  /** Number of distinct shard files reviewed (indexes included); only the chosen guide's with `guide`. */
  shardCount: number;
  thresholds: ReviewThresholds;
}

interface Shard {
  abs: string;
  rel: string;
  guide: string;
  isIndex: boolean;
  lines: string[];
}

function toPosix(p: string): string {
  return p.split(sep).join('/');
}

/** Every shard compile reads for each guide, plus its manifest; first guide in order owns a file. */
function collectShardOwners(
  guides: GuideDirEntry[],
): Map<string, { guide: string; manifest: string }> {
  const owners = new Map<string, { guide: string; manifest: string }>();
  for (const g of guides) {
    if (!existsSync(g.dir)) continue;
    const manifest = g.manifest ?? 'index.md';
    let files: string[];
    try {
      files = linkedSectionFiles(g.dir, {
        manifest,
        sectionsHeading: g.sectionsHeading,
        scopeRoot: g.scopeRoot,
      });
    } catch {
      // Missing or unreadable manifest: `mdcp check` reports it; review what exists.
      files = [];
    }
    for (const f of [join(g.dir, manifest), ...files]) {
      const abs = resolve(f);
      if (!owners.has(abs) && existsSync(abs)) owners.set(abs, { guide: g.name, manifest });
    }
  }
  return owners;
}

function isIndexFile(abs: string, manifest: string): boolean {
  const name = basename(abs);
  return name === manifest || name === 'index.md' || name === 'shards.md';
}

/** Reference-style link definition line (`[id]: target`), which carries no prose. */
function isLinkDefinition(trimmed: string): boolean {
  if (!trimmed.startsWith('[')) return false;
  const close = trimmed.indexOf(']:');
  return close > 1 && !trimmed.slice(1, close).includes(']');
}

function isTableRow(trimmed: string): boolean {
  return trimmed.startsWith('|');
}

/** Prose words in a shard: fenced code, front matter, HTML comments, and link targets excluded. */
export function shardProseWords(lines: string[]): number {
  let words = 0;
  for (const line of lines) {
    const trimmed = line.trim();
    if (!trimmed || isLinkDefinition(trimmed)) continue;
    const heading = parseHeading(trimmed);
    const text = heading ? heading.title : stripBlockMarkers(trimmed);
    words += countWords(inlineToPlain(text.split('|').join(' ')));
  }
  return words;
}

/** Lowercase, whitespace-collapsed plain text used to compare paragraphs. */
export function normalizeParagraph(text: string): string {
  return inlineToPlain(text).toLowerCase().split(/\s+/).filter(Boolean).join(' ');
}

/** Normalized title for comparison: plain text, lowercase, punctuation folded to spaces. */
export function normalizeTitle(title: string): string {
  return inlineToPlain(headingTitlePlain(title))
    .toLowerCase()
    .replace(/[^\p{L}\p{N}]+/gu, ' ')
    .trim();
}

interface Paragraph {
  line: number;
  text: string;
}

/**
 * Paragraph-like units: runs of prose lines split at blank lines, headings, table rows, and
 * list-item starts (each list item is its own unit).
 */
export function paragraphUnits(lines: string[]): Paragraph[] {
  const units: Paragraph[] = [];
  let current: Paragraph | null = null;
  const flush = () => {
    if (current) units.push(current);
    current = null;
  };
  for (let i = 0; i < lines.length; i++) {
    const trimmed = lines[i].trim();
    if (!trimmed || parseHeading(trimmed) || isTableRow(trimmed) || isLinkDefinition(trimmed)) {
      flush();
      continue;
    }
    let quoted = trimmed;
    while (quoted.startsWith('>')) quoted = quoted.slice(1).trimStart();
    if (listMarkerLength(quoted) > 0) flush();
    const text = stripBlockMarkers(trimmed);
    if (!text) {
      flush();
      continue;
    }
    if (current) current.text += ` ${text}`;
    else current = { line: i + 1, text };
  }
  flush();
  return units;
}

function firstH1(lines: string[]): { title: string; line: number } | null {
  for (let i = 0; i < lines.length; i++) {
    const h = parseHeading(lines[i]);
    if (h && h.level === 1) return { title: h.title, line: i + 1 };
  }
  return null;
}

function isShardLinkTarget(target: string): string | null {
  if (target.startsWith('#') || target.includes('://') || target.startsWith('mailto:')) return null;
  let path = target;
  const hash = path.indexOf('#');
  if (hash !== -1) path = path.slice(0, hash);
  const query = path.indexOf('?');
  if (query !== -1) path = path.slice(0, query);
  // Strip an optional link title: `(path "Title")`.
  const space = path.indexOf(' ');
  if (space !== -1) path = path.slice(0, space);
  return path.endsWith('.md') ? path : null;
}

function reviewIndex(shard: Shard, max: number): ReviewFinding | null {
  const groups = new Map<string, Set<string>>();
  const order: string[] = [];
  const headingAt = new Map<number, string>();
  shard.lines.forEach((line, i) => {
    const h = parseHeading(line);
    if (h && h.level >= 2) headingAt.set(i + 1, `"${'#'.repeat(h.level)} ${h.title.trim()}"`);
  });

  let group = 'before any ## heading';
  const links = extractLinks(shard.lines.join('\n'));
  let next = 0;
  const headingLines = [...headingAt.keys()].sort((a, b) => a - b);
  for (const link of links) {
    while (next < headingLines.length && headingLines[next] <= link.line) {
      group = `under ${headingAt.get(headingLines[next])}`;
      next++;
    }
    const path = isShardLinkTarget(link.target);
    if (!path) continue;
    const target = resolve(dirname(shard.abs), path);
    let set = groups.get(group);
    if (!set) {
      set = new Set();
      groups.set(group, set);
      order.push(group);
    }
    set.add(target);
  }

  const over = order.filter((g) => (groups.get(g)?.size ?? 0) > max);
  if (over.length === 0) return null;
  const parts = over.map((g) => `${groups.get(g)?.size} shard links ${g}`);
  return {
    signal: 'index-size',
    severity: 'warning',
    files: [shard.rel],
    detail: `${parts.join('; ')} (limit ${max} per group)`,
    fix: REVIEW_FIXES['index-size'],
  };
}

function excerpt(normalized: string, words = 12): string {
  const tokens = normalized.split(' ');
  const head = tokens.slice(0, words).join(' ');
  return tokens.length > words ? `${head} …` : head;
}

/** Code-unit comparison (locale-independent, so output order is the same on every machine). */
function compare(a: string, b: string): number {
  return a < b ? -1 : a > b ? 1 : 0;
}

function sortFindings(findings: ReviewFinding[]): ReviewFinding[] {
  const rank = new Map(REVIEW_SIGNALS.map((s, i) => [s, i]));
  return findings.sort((a, b) => {
    const r = (rank.get(a.signal) ?? 0) - (rank.get(b.signal) ?? 0);
    if (r !== 0) return r;
    const f = compare(a.files.join('\0'), b.files.join('\0'));
    if (f !== 0) return f;
    return compare(a.detail, b.detail);
  });
}

/**
 * Report documentation sprawl signals across every guide shard (report-only; never writes).
 * Signals: `index-size`, `long-shard`, `duplicate-paragraph`, `similar-titles`.
 */
export function reviewDocs(options: ReviewOptions): ReviewResult {
  const thresholds: ReviewThresholds = { ...DEFAULT_REVIEW_THRESHOLDS };
  for (const key of Object.keys(DEFAULT_REVIEW_THRESHOLDS) as (keyof ReviewThresholds)[]) {
    const v = options.thresholds?.[key];
    if (typeof v === 'number') thresholds[key] = v;
  }
  const docsRoot = resolve(options.docsRoot);
  if (options.guide !== undefined && !options.guides.some((g) => g.name === options.guide)) {
    const names = options.guides.map((g) => g.name).join(', ');
    throw new Error(`Unknown guide "${options.guide}". Guides: ${names}`);
  }

  const owners = collectShardOwners(options.guides);
  let paths = [...owners.keys()];
  if (options.scanRoot) {
    paths = filterScanIgnored(options.scanRoot, paths, options.ignore ?? []);
  }

  const shards: Shard[] = paths
    .map((abs) => {
      const owner = owners.get(abs)!;
      return {
        abs,
        rel: toPosix(relative(docsRoot, abs)),
        guide: owner.guide,
        isIndex: isIndexFile(abs, owner.manifest),
        lines: maskNonProse(readFileSync(abs, 'utf-8')),
      };
    })
    .sort((a, b) => compare(a.rel, b.rel));

  const findings: ReviewFinding[] = [];

  // index-size
  for (const shard of shards) {
    if (!shard.isIndex) continue;
    const f = reviewIndex(shard, thresholds.maxIndexEntries);
    if (f) findings.push(f);
  }

  // long-shard
  for (const shard of shards) {
    const words = shardProseWords(shard.lines);
    if (words > thresholds.maxShardWords) {
      findings.push({
        signal: 'long-shard',
        severity: 'warning',
        files: [shard.rel],
        detail: `${words} prose words (limit ${thresholds.maxShardWords})`,
        fix: REVIEW_FIXES['long-shard'],
      });
    }
  }

  // duplicate-paragraph
  const byText = new Map<string, { rel: string; line: number }[]>();
  for (const shard of shards) {
    for (const unit of paragraphUnits(shard.lines)) {
      const normalized = normalizeParagraph(unit.text);
      if (countWords(normalized) < thresholds.minDuplicateWords) continue;
      const list = byText.get(normalized) ?? [];
      list.push({ rel: shard.rel, line: unit.line });
      byText.set(normalized, list);
    }
  }
  for (const [text, locations] of byText) {
    const files = [...new Set(locations.map((l) => l.rel))].sort();
    if (files.length < 2) continue;
    const where = locations
      .map((l) => `${l.rel}:${l.line}`)
      .sort()
      .join(', ');
    findings.push({
      signal: 'duplicate-paragraph',
      severity: 'warning',
      files,
      detail: `${countWords(text)}-word paragraph in ${files.length} shards at ${where}: "${excerpt(text)}"`,
      fix: REVIEW_FIXES['duplicate-paragraph'],
    });
  }

  // similar-titles (within one guide)
  const byTitle = new Map<string, { guide: string; title: string; rel: string; line: number }[]>();
  for (const shard of shards) {
    const h1 = firstH1(shard.lines);
    if (!h1) continue;
    const key = normalizeTitle(h1.title);
    if (!key) continue;
    const mapKey = `${shard.guide}\0${key}`;
    const list = byTitle.get(mapKey) ?? [];
    list.push({ guide: shard.guide, title: h1.title.trim(), rel: shard.rel, line: h1.line });
    byTitle.set(mapKey, list);
  }
  for (const entries of byTitle.values()) {
    if (entries.length < 2) continue;
    const files = entries.map((e) => e.rel).sort();
    findings.push({
      signal: 'similar-titles',
      severity: 'warning',
      files,
      detail: `${entries.length} shards in guide "${entries[0].guide}" share the title "${entries[0].title}"`,
      fix: REVIEW_FIXES['similar-titles'],
    });
  }

  if (options.guide !== undefined) {
    const inGuide = new Set(shards.filter((s) => s.guide === options.guide).map((s) => s.rel));
    return {
      findings: sortFindings(findings.filter((f) => f.files.some((rel) => inGuide.has(rel)))),
      shardCount: inGuide.size,
      thresholds,
    };
  }
  return { findings: sortFindings(findings), shardCount: shards.length, thresholds };
}

/** Human-readable report grouped by signal (stdout of `mdcp review`). */
export function formatReviewReport(result: ReviewResult): string {
  const out: string[] = [];
  for (const signal of REVIEW_SIGNALS) {
    const group = result.findings.filter((f) => f.signal === signal);
    if (group.length === 0) continue;
    out.push(`${signal} (${group.length})`);
    for (const f of group) {
      out.push(`  - ${f.files.join(', ')}`);
      out.push(`    ${f.detail}`);
      out.push(`    fix: ${f.fix}`);
    }
    out.push('');
  }
  const n = result.findings.length;
  if (n === 0) {
    out.push(`mdcp review: no findings in ${result.shardCount} shard(s)`);
  } else {
    const counts = REVIEW_SIGNALS.map(
      (s) => `${s} ${result.findings.filter((f) => f.signal === s).length}`,
    ).join(', ');
    out.push(`mdcp review: ${n} finding(s) in ${result.shardCount} shard(s) (${counts})`);
  }
  return out.join('\n');
}
