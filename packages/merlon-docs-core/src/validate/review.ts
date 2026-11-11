import { existsSync, readFileSync } from 'node:fs';
import { join, relative, resolve, sep } from 'node:path';
import { linkedSectionFiles } from '../compile/section-manifest.js';
import { countWords, foldPlain, foldTitle } from '../source/text.js';
import { getFormat } from '../source/registry.js';
import type { SourceDoc } from '../source/model.js';
import { filterScanIgnored } from './coverage.js';
import type { GuideDirEntry } from './orphans.js';

// GFM helpers this module exported before the source-format readers; kept for compatibility.
export {
  gfmProseWords as shardProseWords,
  gfmParagraphUnits as paragraphUnits,
  gfmNormalizeParagraph as normalizeParagraph,
  gfmNormalizeTitle as normalizeTitle,
} from '../source/gfm/reader.js';

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
  /** Guides in `compileOrder` order (same entries `merlon check` uses for orphans). */
  guides: GuideDirEntry[];
  /** Docs root; reported paths are relative to it. */
  docsRoot: string;
  /** Scan root for `ignore` globs (CLI: `scan.root` or the invocation directory). */
  scanRoot?: string;
  /** `scan.ignore` globs, relative to `scanRoot`. Applied only when `scanRoot` is set. */
  ignore?: string[];
  thresholds?: Partial<ReviewThresholds>;
  /** Per-guide overrides of `thresholds`, keyed by guide name (config `review.guides`). */
  guideThresholds?: Record<string, Partial<ReviewThresholds>>;
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
  doc: SourceDoc;
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
      // Missing or unreadable manifest: `merlon check` reports it; review what exists.
      files = [];
    }
    for (const f of [join(g.dir, manifest), ...files]) {
      const abs = resolve(f);
      if (!owners.has(abs) && existsSync(abs)) owners.set(abs, { guide: g.name, manifest });
    }
  }
  return owners;
}

function reviewIndex(shard: Shard, max: number): ReviewFinding | null {
  const groups = new Map<string, Set<string>>();
  const order: string[] = [];
  for (const entry of shard.doc.manifest) {
    const target = entry.resolved ?? entry.target;
    let set = groups.get(entry.group);
    if (!set) {
      set = new Set();
      groups.set(entry.group, set);
      order.push(entry.group);
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

  const gfm = getFormat('gfm');
  const limitsFor = (guide: string): ReviewThresholds => {
    const over = options.guideThresholds?.[guide];
    if (!over) return thresholds;
    const merged = { ...thresholds };
    for (const key of Object.keys(DEFAULT_REVIEW_THRESHOLDS) as (keyof ReviewThresholds)[]) {
      const v = over[key];
      if (typeof v === 'number') merged[key] = v;
    }
    return merged;
  };

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
        doc: gfm.reader.read(readFileSync(abs, 'utf-8'), { path: abs, manifest: owner.manifest }),
      };
    })
    .sort((a, b) => compare(a.rel, b.rel));

  const findings: ReviewFinding[] = [];

  // index-size
  for (const shard of shards) {
    if (!shard.doc.isIndex) continue;
    const f = reviewIndex(shard, limitsFor(shard.guide).maxIndexEntries);
    if (f) findings.push(f);
  }

  // long-shard
  for (const shard of shards) {
    const words = shard.doc.proseWords;
    const max = limitsFor(shard.guide).maxShardWords;
    if (words > max) {
      findings.push({
        signal: 'long-shard',
        severity: 'warning',
        files: [shard.rel],
        detail: `${words} prose words (limit ${max})`,
        fix: REVIEW_FIXES['long-shard'],
      });
    }
  }

  // duplicate-paragraph
  const byText = new Map<string, { rel: string; line: number }[]>();
  for (const shard of shards) {
    for (const unit of shard.doc.paragraphs) {
      const normalized = foldPlain(unit.plain);
      if (countWords(normalized) < limitsFor(shard.guide).minDuplicateWords) continue;
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
    const h1 = shard.doc.title;
    if (!h1) continue;
    const key = foldTitle(h1.plain);
    if (!key) continue;
    const mapKey = `${shard.guide}\0${key}`;
    const list = byTitle.get(mapKey) ?? [];
    list.push({ guide: shard.guide, title: h1.text, rel: shard.rel, line: h1.line });
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

/** Human-readable report grouped by signal (stdout of `merlon review`). */
export function formatReviewReport(result: ReviewResult): string {
  const out: string[] = [];
  for (const signal of REVIEW_SIGNALS) {
    const group = result.findings.filter((f) => f.signal === signal);
    if (group.length === 0) continue;
    out.push(`${signal} (${group.length}) — fix: ${REVIEW_FIXES[signal]}`);
    for (const f of group) {
      out.push(`  - ${f.files.join(', ')}: ${f.detail}`);
    }
    out.push('');
  }
  const n = result.findings.length;
  if (n === 0) {
    out.push(`merlon review: no findings in ${result.shardCount} shard(s)`);
  } else {
    const counts = REVIEW_SIGNALS.map(
      (s) => `${s} ${result.findings.filter((f) => f.signal === s).length}`,
    ).join(', ');
    out.push(`merlon review: ${n} finding(s) in ${result.shardCount} shard(s) (${counts})`);
  }
  return out.join('\n');
}
