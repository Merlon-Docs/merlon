import { existsSync, readFileSync } from 'node:fs';
import { dirname, basename, resolve } from 'node:path';
import { extractLinks } from './extract.js';
import {
  defaultSearchRoots,
  hasFileExtension,
  resolveRelativeFile,
} from '../compile/hooks/path-resolve.js';
import { parseHeading, stripPandocAnchors } from '../markdown/index.js';
import { githubSlugify } from '../refs/slugs.js';
import { demoteHeadings, stripAboutThisGuideHeading } from '../compile/headings.js';
import { extractFirstHeading } from '../compile/compile-title.js';
import type { ShardSnapshot } from '../compile/shard-cache.js';
import type { LinkIssue } from './types.js';
import type { LinkProvenance } from './mark-broken.js';

function shardSlugSetFromText(name: string, raw: string): Set<string> {
  let processed = raw.trim();
  if (name === 'about-this-guide.md') {
    const body = stripAboutThisGuideHeading(processed);
    processed = body.trim() ? demoteHeadings(body, 1) : body;
  } else {
    processed = demoteHeadings(processed, 1);
  }
  const slugs = new Set<string>();
  for (const line of processed.split('\n')) {
    const m = parseHeading(line);
    if (!m) continue;
    const title = stripPandocAnchors(m.title).replace(/\*\*/g, '').trim();
    if (title) slugs.add(githubSlugify(title));
  }
  const first = extractFirstHeading(processed);
  if (first.anchor) slugs.add(first.anchor);
  return slugs;
}

function shardSlugSet(filePath: string, snapshot?: ShardSnapshot): Set<string> {
  if (snapshot) return snapshot.anchorSlugs;
  const name = basename(filePath);
  const raw = readFileSync(filePath, 'utf-8');
  return shardSlugSetFromText(name, raw);
}

export interface LintShardLinksOptions {
  shardFile: string;
  guideDir: string;
  scopeRoot?: string;
  snapshot?: ShardSnapshot;
  /** Effective file extensions (see `fileExtensionSet`). Defaults apply when absent. */
  fileExtensions?: Set<string>;
}

/** Validate links in a single shard source file. */
export function lintShardLinks(options: LintShardLinksOptions): LinkIssue[] {
  const issues: LinkIssue[] = [];
  const text = options.snapshot?.raw ?? readFileSync(options.shardFile, 'utf-8');
  const shardDir = dirname(options.shardFile);
  const searchRoots = [...defaultSearchRoots(), ...(options.scopeRoot ? [options.scopeRoot] : [])];

  const anchorSlugs = shardSlugSet(options.shardFile, options.snapshot);

  for (const link of extractLinks(text)) {
    if (link.target.startsWith('#')) {
      const slug = link.target.slice(1);
      if (!anchorSlugs.has(slug)) {
        issues.push({
          kind: 'dead anchor',
          file: options.shardFile,
          line: link.line,
          label: link.label,
          originalTarget: link.target,
          brokenTarget: link.target,
        });
      }
      continue;
    }

    if (/^https?:\/\//i.test(link.target)) continue;

    const filePart = link.target.split('#')[0];
    // A shard link names either another shard or a source file. Anything else
    // (a bare word, a directory) is too ambiguous to resolve, so it is skipped.
    if (!filePart.endsWith('.md') && !hasFileExtension(filePart, options.fileExtensions)) continue;

    const resolved =
      resolveRelativeFile(filePart, shardDir, searchRoots) ??
      resolveRelativeFile(filePart, options.guideDir, searchRoots);

    if (!resolved || !existsSync(resolved)) {
      issues.push({
        kind: 'missing file',
        file: options.shardFile,
        line: link.line,
        label: link.label,
        originalTarget: link.target,
        brokenTarget: link.target,
      });
    }
  }

  return issues;
}

export function collectShardProvenance(
  shardFile: string,
  textOrSnapshot?: string | ShardSnapshot,
): LinkProvenance[] {
  if (textOrSnapshot && typeof textOrSnapshot !== 'string') {
    return textOrSnapshot.provenance;
  }
  const text =
    typeof textOrSnapshot === 'string' ? textOrSnapshot : readFileSync(shardFile, 'utf-8');
  return extractLinks(text).map((l) => ({
    label: l.label,
    originalTarget: l.target,
    sourceFile: resolve(shardFile),
    sourceLine: l.line,
  }));
}
