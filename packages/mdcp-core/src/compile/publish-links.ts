import { existsSync, readFileSync } from 'node:fs';
import { basename, dirname, relative, resolve, isAbsolute } from 'node:path';
import { defaultSearchRoots, resolveRelativeFile } from './hooks/path-resolve.js';
import { maskInlineCode } from '../links/extract.js';
import type { GuideLinkIndex, GuideLinkEntry } from './guide-link-index.js';
import { sectionBodyForSlug, slugForDemotedSection } from './section-slug.js';
import { assignSectionSlugs, type SectionSlugContext, type ShardCache } from './shard-cache.js';

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

/**
 * Assembly opens a link target with this mark when the cross-guide or publish-relative pass writes
 * it. The target is then relative to the link base rather than the shard, so a later pass leaves
 * the link alone: the publish-relative pattern needs a target that opens with `../`, and the
 * intra-guide pass skips a marked target. `unmarkLinkTargets` removes the marks after the last
 * pass. CommonMark replaces U+0000 in its input, so no shard link means the character.
 */
const WRITTEN_LINK_MARK = '\u0000';

/** Remove the marks that assembly's link passes put on the targets they wrote. */
export function unmarkLinkTargets(markdown: string): string {
  return markdown.replaceAll(`](${WRITTEN_LINK_MARK}`, '](');
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

/** Map shard file paths to the slug each section's opening heading gets in the compiled guide. */
export function buildSectionSlugMap(
  sectionPaths: string[],
  cache?: ShardCache,
  preambleSection = 'about-this-guide.md',
  context: SectionSlugContext = {},
): Map<string, string> {
  return assignSectionSlugs(sectionPaths, cache, preambleSection, context);
}

/** A `../` target, including one made only of `../` segments such as `../` or `../../`. */
const PUBLISH_RELATIVE_LINK_RE = /(\[[^\]]*\]\()((?!https?:|\/\/|mailto:)(?:\.\.\/)+[^)]*)\)/g;

export interface PublishRelativeLinkRewriteOptions {
  sourceFile: string;
  guideDir: string;
  scopeRoot?: string;
  currentGuideName?: string;
  /** Absolute path to the document being assembled: the guide's compiled guide or the monolith. */
  currentOutputFile: string;
  linkIndex?: GuideLinkIndex;
  searchRoots?: string[];
  /** Open each target the pass writes with the mark that tells later passes to leave it alone. */
  markWritten?: boolean;
  /**
   * Absolute paths of the files the run writes. A target that names one resolves before the file
   * is on disk, so a link to an output compiles the same on a first run and on later ones.
   */
  runOutputFiles?: ReadonlySet<string>;
  /**
   * Absolute paths of configured outputs the run never writes. A target that names one counts as
   * missing, so a file an earlier run left there doesn't change the compiled link.
   */
  unwrittenOutputFiles?: ReadonlySet<string>;
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
  const bases = [
    dirname(options.sourceFile),
    ...(options.scopeRoot ? [options.scopeRoot] : []),
    options.guideDir,
  ];
  for (const base of bases) {
    const candidate = resolve(base, filePart);
    if (options.runOutputFiles?.has(candidate)) return candidate;
    if (options.unwrittenOutputFiles?.has(candidate)) continue;
    if (existsSync(candidate)) return candidate;
  }
  return null;
}

function skipPublishRelativeRewrite(
  resolvedAbs: string,
  options: PublishRelativeLinkRewriteOptions,
): boolean {
  if (!options.linkIndex || !options.currentGuideName) return false;
  const entry = options.linkIndex.get(resolvedAbs);
  return entry?.guideName === options.currentGuideName;
}

/** Rewrite shard-relative file links to paths relative to the document being assembled (a compiled guide or the monolith). */
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
    if (skipPublishRelativeRewrite(resolved, options)) return originalMatch;

    const fromDir = dirname(outputAbs);
    // A target in the link base's own directory relativizes to '', which would leave an empty href.
    const rel = relative(fromDir, resolve(resolved)).replace(/\\/g, '/') || './';
    const mark = options.markWritten ? WRITTEN_LINK_MARK : '';
    return `${linkPrefixFromMatch(originalMatch, target)}${mark}${rel}${suffix})`;
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
    // An earlier pass wrote this target relative to the link base, not to a shard.
    if (file.startsWith(WRITTEN_LINK_MARK)) return originalMatch;
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
  /**
   * Absolute path to the monolith, set only when the guide being assembled is stitched into it.
   * While such a guide assembles its own compiled guide, a link to another monolith guide's shard
   * targets that guide's compiled guide (`GuideLinkEntry.guideFile`) instead of the monolith.
   */
  monolithFile?: string;
  linkIndex: GuideLinkIndex;
  /**
   * Slugs for shards co-compiled into the current output. When a link resolves to a
   * path in this map, rewrite to an in-document `#anchor` even if the shared index
   * attributes the shard to another guide (multi-guide transitive co-inclusion).
   */
  slugByPath?: Map<string, string>;
  /**
   * Target guide names: links from the compiling guide to shards of a listed guide keep source
   * `.md` paths instead of `#slug` targets in the target guide's compiled guide or in the monolith.
   * Same compiled output preference comes first: a link to a shard in `slugByPath` whose owner in
   * `linkIndex` is non-canonical still takes its in-document anchor.
   */
  ignoreGuides?: string[];
  searchRoots?: string[];
}

function resolveIndexedMarkdownLink(
  file: string,
  options: CrossGuideLinkRewriteOptions,
): GuideLinkEntry | null {
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
    return {
      guideName: options.currentGuideName ?? '',
      outputBasename: options.currentOutputBasename ?? '',
      outputFile: options.currentOutputFile ?? '',
      slug: sameOutputSlug,
      canonical: false,
    };
  }

  return entry ?? null;
}

/**
 * The anchor a link to `entry`'s section gets in the document it lands in. An explicit
 * `#fragment` stays as written. A section link takes the monolith's numbering when it lands in
 * the monolith (`entry.outputFile` for a monolith guide's shard), and the owner's own numbering
 * anywhere else.
 */
function sectionAnchor(
  entry: GuideLinkEntry,
  fragment: string | undefined,
  landsInEntryOutput: boolean,
): string {
  if (fragment) return fragment.slice(1);
  return landsInEntryOutput && entry.monolithSlug !== undefined ? entry.monolithSlug : entry.slug;
}

function formatCrossGuideTarget(
  prefix: string,
  fragment: string | undefined,
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
    return `${prefix}#${sectionAnchor(entry, fragment, sameOutputFile || sameBasenameLegacy)})`;
  }

  // A monolith guide's own compiled guide links another monolith guide's compiled guide.
  const toGuideFile =
    options.monolithFile !== undefined &&
    options.currentOutputFile !== options.monolithFile &&
    entry.outputFile === options.monolithFile &&
    entry.guideFile !== undefined;
  const toFile = toGuideFile ? entry.guideFile! : entry.outputFile;
  const anchor = sectionAnchor(entry, fragment, !toGuideFile);

  if (options.currentOutputFile) {
    const fromDir = dirname(options.currentOutputFile);
    if (dirname(toFile) === fromDir) {
      return `${prefix}${basename(toFile)}#${anchor})`;
    }
    let rel = relative(fromDir, toFile).replace(/\\/g, '/');
    if (!rel.startsWith('.')) rel = `./${rel}`;
    return `${prefix}${rel}#${anchor})`;
  }

  return `${prefix}${toGuideFile ? basename(toFile) : entry.outputBasename}#${anchor})`;
}

function crossGuidePass(
  markdown: string,
  options: CrossGuideLinkRewriteOptions,
  mark: string,
): string {
  return rewriteMarkdownLinkLines(markdown, CROSS_GUIDE_MD_LINK_RE, (originalMatch, m) => {
    const file = m[2];
    const fragment = m[3];
    const entry = resolveIndexedMarkdownLink(file, options);
    if (!entry) return originalMatch;
    if (options.ignoreGuides?.includes(entry.guideName)) return originalMatch;
    return formatCrossGuideTarget(
      `${linkPrefixFromMatch(originalMatch, file)}${mark}`,
      fragment,
      entry,
      options,
    );
  });
}

/**
 * Rewrite cross-guide `.md` links using the compile-time guide link index. The targets it writes
 * carry no mark, so `rewriteIntraGuideFileLinks` run on its output can still read one as a shard
 * link: `glossary.md#term` becomes `#term` when `slugByPath` has a shard named `glossary.md`.
 * Compile uses a variant that marks each target it writes, so its later passes leave them alone.
 */
export function rewriteCrossGuideFileLinks(
  markdown: string,
  options: CrossGuideLinkRewriteOptions,
): string {
  return crossGuidePass(markdown, options, '');
}

/**
 * `rewriteCrossGuideFileLinks` for assembly: each target the pass writes opens with a mark, so the
 * later link passes leave it alone. Assembly removes the marks with `unmarkLinkTargets`.
 */
export function rewriteCrossGuideFileLinksMarked(
  markdown: string,
  options: CrossGuideLinkRewriteOptions,
): string {
  return crossGuidePass(markdown, options, WRITTEN_LINK_MARK);
}
