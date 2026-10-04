import { readFileSync } from 'node:fs';
import { basename, dirname, relative, resolve, isAbsolute } from 'node:path';
import { defaultSearchRoots, resolveRelativeFile } from './hooks/path-resolve.js';
import { maskInlineCode } from '../links/extract.js';
import type { GuideLinkIndex, GuideLinkEntry } from './guide-link-index.js';
import { sectionBodyForSlug, slugForDemotedSection } from './section-slug.js';
import { assignSectionSlugs, type ShardCache } from './shard-cache.js';

/** Slug for a shard file after compile demotion (shared by index build and hooks). */
export function slugForSectionFile(filePath: string, cache?: ShardCache): string | null {
  const name = basename(filePath);
  if (cache) {
    const absPath = resolve(filePath);
    const cached = cache.get(absPath);
    if (cached) return cached.slug;
  }
  const raw = readFileSync(filePath, 'utf-8').trim();
  const processed = sectionBodyForSlug(name, raw);
  return slugForDemotedSection(name, processed);
}

const INTRA_GUIDE_MD_LINK_RE = /(\[[^\]]*\]\()((?!https?:)(?:\.\/)?[^)#/\s][^)#]*\.md)(#[^)]*)?\)/g;
const CROSS_GUIDE_MD_LINK_RE =
  /(\[[^\]]*\]\()((?!https?:)(?:(?:\.\.\/)+|\.\/)[^)#/\s][^)#]*\.md)(#[^)]*)?\)/g;
/** Apply a link regex line-wise with inline-code masking (labels may contain `]` inside backticks). */
function rewriteMarkdownLinkLines(
  markdown: string,
  re: RegExp,
  replace: (originalMatch: string, masked: RegExpMatchArray) => string,
): string {
  const lines = markdown.split('\n');
  let inFence = false;

  return lines
    .map((line) => {
      const stripped = line.trim();
      if (stripped.startsWith('```')) {
        inFence = !inFence;
        return line;
      }
      if (inFence) return line;

      const masked = maskInlineCode(line);
      let out = line;
      const lineRe = new RegExp(re.source, re.flags);
      const matches = [...masked.matchAll(lineRe)];
      for (const m of matches.reverse()) {
        const start = m.index!;
        const originalMatch = line.slice(start, start + m[0].length);
        out = out.slice(0, start) + replace(originalMatch, m) + out.slice(start + m[0].length);
      }
      return out;
    })
    .join('\n');
}

function linkPrefixFromMatch(originalMatch: string, url: string): string {
  const marker = `](${url}`;
  const idx = originalMatch.indexOf(marker);
  if (idx === -1) return originalMatch.slice(0, originalMatch.lastIndexOf('(') + 1);
  return originalMatch.slice(0, idx + 2);
}

/** Map shard file paths to GitHub-style slugs for the first heading after compile demotion. */
export function buildSectionSlugMap(
  sectionPaths: string[],
  cache?: ShardCache,
  preambleSection = 'about-this-guide.md',
): Map<string, string> {
  return assignSectionSlugs(sectionPaths, cache, preambleSection);
}

const PUBLISH_RELATIVE_LINK_RE = /(\[[^\]]*\]\()((?!https?:|\/\/|mailto:)(?:\.\.\/)+[^)]+)\)/g;

export interface PublishRelativeLinkRewriteOptions {
  sourceFile: string;
  guideDir: string;
  scopeRoot?: string;
  currentGuideName?: string;
  /** Absolute path to the guide's link base (see resolveGuideLinkBase). */
  currentOutputFile: string;
  linkIndex?: GuideLinkIndex;
  searchRoots?: string[];
}

function parseLinkPath(target: string): { path: string; suffix: string } {
  const hash = target.indexOf('#');
  if (hash === -1) return { path: target, suffix: '' };
  return { path: target.slice(0, hash), suffix: target.slice(hash) };
}

function resolvePublishLinkTarget(
  filePart: string,
  options: PublishRelativeLinkRewriteOptions,
): string | null {
  const shardDir = dirname(options.sourceFile);
  const searchRoots = options.scopeRoot ? [options.scopeRoot] : [];
  return (
    resolveRelativeFile(filePart, shardDir, searchRoots) ??
    resolveRelativeFile(filePart, options.guideDir, searchRoots)
  );
}

function isOtherPublishOutput(
  resolvedAbs: string,
  options: PublishRelativeLinkRewriteOptions,
): boolean {
  if (!options.linkIndex) return false;
  for (const entry of options.linkIndex.values()) {
    if (entry.outputFile === resolvedAbs) return true;
  }
  return false;
}

function skipPublishRelativeRewrite(
  resolvedAbs: string,
  options: PublishRelativeLinkRewriteOptions,
): boolean {
  if (!options.linkIndex || !options.currentGuideName) return false;
  const entry = options.linkIndex.get(resolvedAbs);
  return entry?.guideName === options.currentGuideName;
}

/** Rewrite shard-relative file links to paths relative to the guide's link base (its compile.outputFile, the monolith, or its default output). */
export function rewritePublishRelativeLinks(
  markdown: string,
  options: PublishRelativeLinkRewriteOptions,
): string {
  const outputAbs = resolve(options.currentOutputFile);
  if (!isAbsolute(outputAbs)) return markdown;

  return rewriteMarkdownLinkLines(markdown, PUBLISH_RELATIVE_LINK_RE, (originalMatch, m) => {
    const target = m[2];
    const { path: filePart, suffix } = parseLinkPath(target);
    if (!filePart) return originalMatch;

    const resolved = resolvePublishLinkTarget(filePart, options);
    if (!resolved) return originalMatch;
    if (isOtherPublishOutput(resolved, options)) return originalMatch;
    if (skipPublishRelativeRewrite(resolved, options)) return originalMatch;

    const fromDir = dirname(outputAbs);
    const rel = relative(fromDir, resolve(resolved)).replace(/\\/g, '/');
    return `${linkPrefixFromMatch(originalMatch, target)}${rel}${suffix})`;
  });
}

export interface IntraGuideLinkRewriteOptions {
  sourceFile?: string;
}

/** Rewrite same-guide shard links to in-document anchors in every compiled guide. */
export function rewriteIntraGuideFileLinks(
  markdown: string,
  slugByPath: Map<string, string>,
  guideDir: string,
  options?: IntraGuideLinkRewriteOptions,
): string {
  return rewriteMarkdownLinkLines(markdown, INTRA_GUIDE_MD_LINK_RE, (originalMatch, m) => {
    const file = m[2];
    const fragment = m[3];
    const normalized = file.replace(/^\.\//, '');
    if (options?.sourceFile && normalized.startsWith('../')) return originalMatch;
    let slug: string | undefined;

    if (options?.sourceFile) {
      slug = slugByPath.get(resolve(dirname(options.sourceFile), normalized));
    }

    if (!slug) {
      slug = slugByPath.get(resolve(guideDir, normalized));
    }

    if (!slug) {
      for (const [path, pathSlug] of slugByPath) {
        if (basename(path) === normalized) {
          slug = pathSlug;
          break;
        }
      }
    }
    if (!slug) return originalMatch;
    if (fragment) return `${linkPrefixFromMatch(originalMatch, file)}#${fragment.slice(1)})`;
    return `${linkPrefixFromMatch(originalMatch, file)}#${slug})`;
  });
}

export interface CrossGuideLinkRewriteOptions {
  sourceFile: string;
  guideDir: string;
  scopeRoot?: string;
  currentGuideName?: string;
  currentOutputBasename?: string;
  /** Absolute path to the guide output being assembled. */
  currentOutputFile?: string;
  linkIndex: GuideLinkIndex;
  /**
   * Slugs for shards co-compiled into the current output. When a link resolves to a
   * path in this map, rewrite to an in-document `#anchor` even if the shared index
   * attributes the shard to another guide (multi-guide transitive co-inclusion).
   */
  slugByPath?: Map<string, string>;
  /** Target guide names: links from the compiling guide to shards of a listed guide keep source `.md` paths instead of `#slug` targets in the file that holds the target guide (the monolith when the target guide is part of it, otherwise its compiled guide). */
  ignoreGuides?: string[];
  searchRoots?: string[];
}

function resolveIndexedMarkdownLink(
  file: string,
  fragment: string | undefined,
  options: CrossGuideLinkRewriteOptions,
): { entry: GuideLinkEntry; anchor: string } | null {
  const shardDir = dirname(options.sourceFile);
  const searchRoots = [
    ...(options.searchRoots ?? defaultSearchRoots()),
    ...(options.scopeRoot ? [options.scopeRoot] : []),
  ];

  const resolved =
    resolveRelativeFile(file, shardDir, searchRoots) ??
    resolveRelativeFile(file, options.guideDir, searchRoots);
  if (!resolved) return null;

  const entry = options.linkIndex.get(resolved);
  const sameOutputSlug = options.slugByPath?.get(resolved);
  // Prefer in-document anchors for co-compiled shards unless another guide has
  // canonical (manifest / guideDir) ownership — those keep cross-output targets.
  const preferSameOutput =
    sameOutputSlug !== undefined &&
    (!entry || entry.guideName === options.currentGuideName || entry.canonical === false);
  if (preferSameOutput) {
    const anchor = fragment ? fragment.slice(1) : sameOutputSlug;
    return {
      entry: {
        guideName: options.currentGuideName ?? '',
        outputBasename: options.currentOutputBasename ?? '',
        outputFile: options.currentOutputFile ?? '',
        slug: sameOutputSlug,
        canonical: false,
      },
      anchor,
    };
  }

  if (!entry) return null;

  const anchor = fragment ? fragment.slice(1) : entry.slug;
  return { entry, anchor };
}

function formatCrossGuideTarget(
  prefix: string,
  anchor: string,
  entry: GuideLinkEntry,
  options: CrossGuideLinkRewriteOptions,
): string {
  const sameGuide =
    options.currentGuideName !== undefined && entry.guideName === options.currentGuideName;
  const sameOutputFile =
    options.currentOutputFile !== undefined && entry.outputFile === options.currentOutputFile;
  const sameBasenameLegacy =
    options.currentOutputBasename !== undefined &&
    entry.outputBasename === options.currentOutputBasename &&
    options.currentOutputFile === undefined;

  if (sameGuide || sameOutputFile || sameBasenameLegacy) {
    return `${prefix}#${anchor})`;
  }

  if (options.currentOutputFile) {
    const fromDir = dirname(options.currentOutputFile);
    const toFile = entry.outputFile;
    if (dirname(toFile) === fromDir) {
      return `${prefix}${basename(toFile)}#${anchor})`;
    }
    let rel = relative(fromDir, toFile).replace(/\\/g, '/');
    if (!rel.startsWith('.')) rel = `./${rel}`;
    return `${prefix}${rel}#${anchor})`;
  }

  return `${prefix}${entry.outputBasename}#${anchor})`;
}

/** Rewrite cross-guide `.md` links using the compile-time guide link index. */
export function rewriteCrossGuideFileLinks(
  markdown: string,
  options: CrossGuideLinkRewriteOptions,
): string {
  return rewriteMarkdownLinkLines(markdown, CROSS_GUIDE_MD_LINK_RE, (originalMatch, m) => {
    const file = m[2];
    const fragment = m[3];
    const hit = resolveIndexedMarkdownLink(file, fragment, options);
    if (!hit) return originalMatch;
    if (options.ignoreGuides?.includes(hit.entry.guideName)) return originalMatch;
    return formatCrossGuideTarget(
      linkPrefixFromMatch(originalMatch, file),
      hit.anchor,
      hit.entry,
      options,
    );
  });
}
