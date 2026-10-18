import { readFileSync } from 'node:fs';
import { basename, join, resolve } from 'node:path';
import GithubSlugger from 'github-slugger';
import { extractLinks, type ExtractedLink } from '../links/extract.js';
import type { LinkProvenance } from '../links/mark-broken.js';
import type { GuideConfigInput } from '../config/schema.js';
import { resolveCompileHooks } from '../config/resolve-compile-hooks.js';
import { headingTitlePlain } from '../markdown/index.js';
import { createHeadingReader, githubSlugify } from '../refs/slugs.js';
import { keepsAnchorMarkers } from './anchors.js';
import { extractFirstHeading, stripFirstHeadingLine } from './compile-title.js';
import { guideLeadHeading } from './headings.js';
import { declaredSectionSlug, sectionBodyForSlug, slugForDemotedSection } from './section-slug.js';

export interface ShardSnapshot {
  raw: string;
  processed: string;
  slug: string | null;
  links: ExtractedLink[];
  provenance: LinkProvenance[];
  anchorSlugs: Set<string>;
}

/** Absolute shard path → cached read + derived compile metadata. */
export type ShardCache = Map<string, ShardSnapshot>;

/** Slugs a same-shard `#fragment` may name: each rendered heading's, plus a first-heading `{#id}`. */
export function sectionAnchorSlugs(processed: string): Set<string> {
  const slugs = new Set<string>();
  const readHeading = createHeadingReader();
  for (const line of processed.split('\n')) {
    const heading = readHeading(line);
    if (heading) slugs.add(githubSlugify(heading.title));
  }
  const first = extractFirstHeading(processed);
  if (first.anchor) slugs.add(first.anchor);
  return slugs;
}

function provenanceFromLinks(links: ExtractedLink[], sourceFile: string): LinkProvenance[] {
  return links.map((l) => ({
    label: l.label,
    originalTarget: l.target,
    sourceFile,
    sourceLine: l.line,
  }));
}

/** Read a shard once and populate derived compile/lint fields. */
export function loadShardSnapshot(
  filePath: string,
  cache: ShardCache,
  preambleSection = 'about-this-guide.md',
): ShardSnapshot {
  const absPath = resolve(filePath);
  const existing = cache.get(absPath);
  if (existing) return existing;

  const name = basename(absPath);
  const raw = readFileSync(absPath, 'utf-8').trim();
  const processed = sectionBodyForSlug(name, raw, preambleSection);
  const slug = slugForDemotedSection(name, processed);
  const links = extractLinks(raw);
  const snapshot: ShardSnapshot = {
    raw,
    processed,
    slug,
    links,
    provenance: provenanceFromLinks(links, absPath),
    anchorSlugs: sectionAnchorSlugs(processed),
  };
  cache.set(absPath, snapshot);
  return snapshot;
}

/** What assembleGuide does around the sections that changes their headings' numbers. */
export interface SectionSlugContext {
  /** The lead heading line that assembly writes first (see `guideLeadHeading`). */
  heading?: string | null;
  /** `compile.title`. Assembly drops the first section's heading when it repeats this title. */
  title?: string;
  /**
   * True when compile leaves `{#id}` markers in the output (see `keepsAnchorMarkers`). A heading
   * line is then numbered by the title it renders, marker included.
   */
  keepAnchorMarkers?: boolean;
  /**
   * A slugger that has already numbered the headings before this guide's lead heading. The
   * monolith passes one slugger through every guide it stitches, so each guide continues the
   * numbering of the guides before it. Without one, numbering starts fresh.
   */
  slugger?: GithubSlugger;
}

function readSection(
  filePath: string,
  cache: ShardCache | undefined,
  preambleSection: string,
): { raw: string; processed: string } {
  if (cache) return loadShardSnapshot(filePath, cache, preambleSection);
  const raw = readFileSync(filePath, 'utf-8').trim();
  return { raw, processed: sectionBodyForSlug(basename(filePath), raw, preambleSection) };
}

/**
 * Assign each section the slug its opening heading gets in the compiled guide. One github-slugger
 * numbers every heading in stitch order, starting with the lead heading, so a heading earlier in
 * the guide that takes the same slug pushes the section to `-1`, as GitHub and
 * `buildSlugRegistry` number it. Lines in fenced code blocks are not headings, and the fence scan
 * reads a blank line before each section, as assembly writes one. A FIND-* file or a first
 * heading with `{#id}` keeps its declared id, and its heading still takes its number. When compile
 * keeps the markers, that number comes from the title with its marker.
 */
export function assignSectionSlugs(
  sectionPaths: string[],
  cache?: ShardCache,
  preambleSection = 'about-this-guide.md',
  context: SectionSlugContext = {},
): Map<string, string> {
  const keepAnchorMarkers = context.keepAnchorMarkers === true;
  const readHeading = createHeadingReader({ keepAnchorMarkers });
  const slugger = context.slugger ?? new GithubSlugger();
  const numberHeading = (line: string): string | null => {
    const heading = readHeading(line);
    return heading ? slugger.slug(headingTitlePlain(heading.title, { keepAnchorMarkers })) : null;
  };
  const leadSlug = context.heading ? numberHeading(context.heading) : null;
  const slugByPath = new Map<string, string>();

  sectionPaths.forEach((filePath, i) => {
    const name = basename(filePath);
    const { raw, processed } = readSection(filePath, cache, preambleSection);
    // assembleGuide drops the first section's heading when it repeats compile.title.
    const titleDropped =
      i === 0 && !!context.title && extractFirstHeading(raw).text === context.title;
    const body = titleDropped
      ? sectionBodyForSlug(name, stripFirstHeadingLine(raw), preambleSection)
      : processed;
    const lines = body.split('\n');
    const opening = titleDropped ? -1 : lines.findIndex((line) => line.trim() !== '');
    let rendered = titleDropped ? leadSlug : null;
    // Assembly puts a blank line before each section, which ends a paragraph or an empty item.
    readHeading('');
    lines.forEach((line, j) => {
      const numbered = numberHeading(line);
      if (j === opening) rendered = numbered;
    });

    const slug = slugForDemotedSection(name, processed);
    if (!slug) return;
    slugByPath.set(resolve(filePath), declaredSectionSlug(name, processed) ?? rendered ?? slug);
  });

  return slugByPath;
}

/**
 * Section slugs for one guide, with the lead heading its manifest and `compile.title` give it, and
 * with `{#id}` markers read as title text when its compile config keeps them. Pass `slugger` to
 * continue a numbering that earlier guides started, as the monolith does.
 */
export function guideSectionSlugs(
  guideDir: string,
  sectionPaths: string[],
  cache: ShardCache,
  compile?: NonNullable<GuideConfigInput['compile']>,
  slugger?: GithubSlugger,
): Map<string, string> {
  const indexText = readFileSync(join(guideDir, compile?.manifest ?? 'index.md'), 'utf-8');
  return assignSectionSlugs(
    sectionPaths,
    cache,
    compile?.preambleSection ?? 'about-this-guide.md',
    {
      heading: guideLeadHeading(indexText, compile?.title),
      title: compile?.title,
      keepAnchorMarkers: keepsAnchorMarkers(compile?.stripAnchors, resolveCompileHooks(compile)),
      slugger,
    },
  );
}

export function createShardCache(): ShardCache {
  return new Map();
}
