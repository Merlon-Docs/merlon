import { basename, dirname, resolve } from 'node:path';
import GithubSlugger from 'github-slugger';
import { extractLinks } from '../../links/extract.js';
import {
  headingTitlePlain,
  inlineToPlain,
  listMarkerLength,
  maskNonProse,
  parseHeading,
  stripBlockMarkers,
} from '../../markdown/index.js';
import { createHeadingReader } from '../../refs/slugs.js';
import { countWords, foldPlain, foldTitle } from '../text.js';
import type { ReadContext, SourceFormat, SourceReader } from '../format.js';
import type {
  DocAnchor,
  DocHeading,
  DocLink,
  DocParagraph,
  ManifestEntry,
  SourceDoc,
} from '../model.js';

/** Index files a GFM guide may have besides its configured manifest. */
const GFM_INDEX_NAMES = ['index.md', 'shards.md'];

/** The group a link belongs to before any `##` heading in an index. */
export const GFM_GROUP_BEFORE_HEADINGS = 'before any ## heading';

/** Reference-style link definition line (`[id]: target`), which carries no prose. */
function isLinkDefinition(trimmed: string): boolean {
  if (!trimmed.startsWith('[')) return false;
  const close = trimmed.indexOf(']:');
  return close > 1 && !trimmed.slice(1, close).includes(']');
}

function isTableRow(trimmed: string): boolean {
  return trimmed.startsWith('|');
}

/**
 * Prose words in masked GFM lines: front matter, fenced code, HTML comments and link targets are
 * already masked by `maskNonProse`; link definitions are skipped, and headings count their title.
 */
export function gfmProseWords(lines: string[]): number {
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

/**
 * Paragraph-like units of masked GFM lines: runs of prose lines split at blank lines, headings,
 * table rows, link definitions and list-item starts (each list item is its own unit). `text` is
 * the unit's lines joined with spaces, inline markup kept.
 */
export function gfmParagraphUnits(lines: string[]): { line: number; text: string }[] {
  const units: { line: number; text: string }[] = [];
  let current: { line: number; text: string } | null = null;
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

/** Plain text of a GFM heading title, as `similar-titles` compares it. */
export function gfmTitlePlain(title: string): string {
  return inlineToPlain(headingTitlePlain(title));
}

/** Lowercase, whitespace-collapsed plain text used to compare GFM paragraphs. */
export function gfmNormalizeParagraph(text: string): string {
  return foldPlain(inlineToPlain(text));
}

/** Normalized GFM title for comparison: plain text, lowercase, punctuation folded to spaces. */
export function gfmNormalizeTitle(title: string): string {
  return foldTitle(gfmTitlePlain(title));
}

/** The path part of a link target when it names a `.md` file, else null. */
export function gfmShardLinkPath(target: string): string | null {
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

function linkOf(target: string, line: number): DocLink {
  if (target.startsWith('#'))
    return { kind: 'anchor', target: '', fragment: target.slice(1), line };
  if (/^[a-z][a-z0-9+.-]*:/i.test(target)) return { kind: 'external', target, line };
  let path = target;
  const space = path.indexOf(' ');
  if (space !== -1) path = path.slice(0, space);
  const hash = path.indexOf('#');
  if (hash === -1) return { kind: 'file', target: path, line };
  return { kind: 'file', target: path.slice(0, hash), fragment: path.slice(hash + 1), line };
}

function headingsOf(lines: string[]): DocHeading[] {
  const out: DocHeading[] = [];
  lines.forEach((line, i) => {
    const h = parseHeading(line);
    if (h)
      out.push({
        text: h.title.trim(),
        plain: gfmTitlePlain(h.title),
        level: h.level,
        line: i + 1,
      });
  });
  return out;
}

/** `.md` links, each in the index group of the `##` (or deeper) heading above it. */
function manifestOf(
  path: string,
  links: { target: string; line: number }[],
  headings: DocHeading[],
): ManifestEntry[] {
  const groupHeadings = headings.filter((h) => h.level >= 2);
  const entries: ManifestEntry[] = [];
  let group = GFM_GROUP_BEFORE_HEADINGS;
  let next = 0;
  for (const link of links) {
    while (next < groupHeadings.length && groupHeadings[next].line <= link.line) {
      const h = groupHeadings[next];
      group = `under "${'#'.repeat(h.level)} ${h.text}"`;
      next++;
    }
    const shardPath = gfmShardLinkPath(link.target);
    if (!shardPath) continue;
    entries.push({
      target: shardPath,
      resolved: resolve(dirname(path), shardPath),
      line: link.line,
      group,
      kind: 'toc',
    });
  }
  return entries;
}

/** GitHub heading slugs, numbered for repeats the way GitHub renders them. */
function anchorsOf(text: string): DocAnchor[] {
  const read = createHeadingReader();
  const slugger = new GithubSlugger();
  const anchors: DocAnchor[] = [];
  text.split('\n').forEach((line, i) => {
    const h = read(line);
    if (h)
      anchors.push({
        id: slugger.slug(headingTitlePlain(h.title)),
        line: i + 1,
        origin: 'heading',
      });
  });
  return anchors;
}

export const gfmReader: SourceReader = {
  read(text: string, context: ReadContext): SourceDoc {
    const lines = maskNonProse(text);
    const headings = headingsOf(lines);
    const extracted = extractLinks(lines.join('\n'));
    const name = basename(context.path);
    const manifestName = context.manifest ?? 'index.md';
    return {
      path: context.path,
      format: 'gfm',
      isIndex: name === manifestName || GFM_INDEX_NAMES.includes(name),
      title: headings.find((h) => h.level === 1) ?? null,
      headings,
      paragraphs: gfmParagraphUnits(lines).map((u): DocParagraph => ({
        line: u.line,
        plain: inlineToPlain(u.text),
      })),
      proseWords: gfmProseWords(lines),
      links: extracted.map((l) => linkOf(l.target, l.line)),
      anchors: anchorsOf(text),
      manifest: manifestOf(context.path, extracted, headings),
      orphanOk: false,
    };
  },
};

export const gfmFormat: SourceFormat = {
  id: 'gfm',
  name: 'GitHub Flavored Markdown',
  reader: gfmReader,
};
