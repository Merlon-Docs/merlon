import { readFileSync } from 'node:fs';
import { basename, dirname } from 'node:path';
import { getLocalePack, type LocalePack } from '../../locale/index.js';
import { githubSlugify } from '../../refs/slugs.js';
import type { CompileHook, CompileHookState, InlineInsertsHookState } from '../hooks.js';
import { hookSearchRoots, resolveRelativeFile } from './path-resolve.js';
import { createMdSuffixReader, scanInlineLinks } from '../link-scan.js';

/**
 * Insert library directories: `diagrams/`, `tables/`, `figures/`, `media/` and `inserts/`, and
 * each but `media/` without its `s`.
 */
const INSERT_LIBRARY_DIRS = ['diagram', 'table', 'figure', 'media', 'insert'];

const INSERT_KINDS = new Set(INSERT_LIBRARY_DIRS);

/** Heading level for first inlined insert (GFM anchor target for back-links). */
const INSERT_HEADING_PREFIX = '####';

export type InsertLinkRef = { start: number; end: number; label: string; relPath: string };

function createInlineInsertsState(): InlineInsertsHookState {
  return { firstAnchorByPath: new Map(), nextNumberByKind: new Map() };
}

function ensureInlineInsertsState(hookState?: CompileHookState): InlineInsertsHookState {
  if (!hookState) {
    return createInlineInsertsState();
  }
  if (!hookState.inlineInserts) {
    hookState.inlineInserts = createInlineInsertsState();
  }
  return hookState.inlineInserts;
}

export function isInsertLibraryPath(relPath: string): boolean {
  if (/^https?:\/\//i.test(relPath) || !/\.md$/i.test(relPath)) return false;
  return findInsertLinks(`[x](${relPath})`).length > 0;
}

function humanizeBasename(resolvedPath: string, locale: LocalePack): string {
  return locale.inserts.humanizeBasename(basename(resolvedPath, '.md'));
}

export function insertKind(resolvedPath: string): string | null {
  const parent = basename(dirname(resolvedPath)).toLowerCase();
  const kind = parent.endsWith('s') ? parent.slice(0, -1) : parent;
  return INSERT_KINDS.has(kind) ? kind : null;
}

function baseTitle(resolvedPath: string, label: string, locale: LocalePack): string {
  return label.trim() || humanizeBasename(resolvedPath, locale);
}

function stripLeadingKind(title: string, kind: string, locale: LocalePack): string {
  const prefix = locale.inserts.kindTitle(kind);
  if (new RegExp(`^${prefix}\\b`, 'i').test(title)) {
    return title
      .slice(prefix.length)
      .trim()
      .replace(/^[.:]\s*/, '');
  }
  return title;
}

/** Caption title without kind prefix or serial number. */
export function insertCaptionTitle(
  resolvedPath: string,
  label = '',
  locale: LocalePack = getLocalePack(),
): string {
  const kind = insertKind(resolvedPath);
  const title = baseTitle(resolvedPath, label, locale);
  if (!kind) return title;
  return stripLeadingKind(title, kind, locale) || humanizeBasename(resolvedPath, locale);
}

/** GFM heading for a first inline — e.g. `Table 1. Status codes` (en-US captions). */
export function numberedInsertHeading(
  resolvedPath: string,
  label: string,
  number: number,
  locale: LocalePack = getLocalePack(),
): string {
  const kind = insertKind(resolvedPath);
  if (!kind) return baseTitle(resolvedPath, label, locale);
  const caption = insertCaptionTitle(resolvedPath, label, locale);
  return `${locale.inserts.kindTitle(kind)} ${number}. ${caption}`;
}

export function insertAnchorSlug(
  resolvedPath: string,
  label = '',
  number = 1,
  locale: LocalePack = getLocalePack(),
): string {
  return githubSlugify(numberedInsertHeading(resolvedPath, label, number, locale));
}

function nextInsertNumber(state: InlineInsertsHookState, kind: string): number {
  const number = state.nextNumberByKind.get(kind) ?? 1;
  state.nextNumberByKind.set(kind, number + 1);
  return number;
}

function readInsertAt(resolvedPath: string): string | null {
  try {
    return readFileSync(resolvedPath, 'utf-8').trim();
  } catch {
    return null;
  }
}

function formatFirstInline(
  resolvedPath: string,
  content: string,
  label: string,
  state: InlineInsertsHookState,
  locale: LocalePack,
): string {
  const kind = insertKind(resolvedPath);
  const heading = kind
    ? numberedInsertHeading(resolvedPath, label, nextInsertNumber(state, kind), locale)
    : baseTitle(resolvedPath, label, locale);
  const anchor = githubSlugify(heading);
  state.firstAnchorByPath.set(resolvedPath, anchor);
  return `\n\n${INSERT_HEADING_PREFIX} ${heading}\n\n${content}\n\n`;
}

function formatBackLink(label: string, anchor: string, locale: LocalePack): string {
  const text = label.trim() || locale.inserts.seeInsertFallback;
  return `[${text}](#${anchor})`;
}

function resolveInsert(
  relPath: string,
  guideDir: string,
  searchRoots: string[],
): { resolvedPath: string; content: string } | null {
  const resolvedPath = resolveRelativeFile(relPath, guideDir, searchRoots);
  if (!resolvedPath) return null;
  const content = readInsertAt(resolvedPath);
  if (!content) return null;
  return { resolvedPath, content };
}

/** True when `text` holds the lower-case ASCII `word` at `i`, in any case. */
function hasWordAnyCase(text: string, i: number, word: string): boolean {
  for (let k = 0; k < word.length; k++) {
    const code = text.charCodeAt(i + k);
    if ((code >= 0x41 && code <= 0x5a ? code + 0x20 : code) !== word.charCodeAt(k)) return false;
  }
  return true;
}

/**
 * The index after the `/` of the insert library directory that starts the target at `start`, or
 * -1. The directory can follow `./` or a run of `../`, and its name can take any case. No URL
 * starts with a directory name, so an `http:` or `https:` target never matches.
 */
function insertLibraryPathStart(text: string, start: number): number {
  let i = start;
  if (text.startsWith('../', i)) {
    while (text.startsWith('../', i)) i += 3;
  } else if (text.startsWith('./', i)) {
    i += 2;
  }
  const dir = INSERT_LIBRARY_DIRS.find((name) => hasWordAnyCase(text, i, name));
  if (!dir) return -1;
  i += dir.length;
  if (dir !== 'media' && (text[i] === 's' || text[i] === 'S') && text[i + 1] === '/') i++;
  return text[i] === '/' ? i + 1 : -1;
}

/**
 * Each link in `body` into an insert library: a target that starts with a library directory, then
 * a path whose first character is not `#` or whitespace, ending in `.md` in any case, with an
 * optional `#fragment` that is not empty.
 */
export function findInsertLinks(body: string): InsertLinkRef[] {
  const mdSuffix = createMdSuffixReader(body, { ignoreCase: true, minFragment: 1 });
  const links = scanInlineLinks(body, (targetStart, close) => {
    const pathStart = insertLibraryPathStart(body, targetStart);
    if (pathStart === -1) return undefined;
    const first = body[pathStart];
    if (first === undefined || first === ')' || first === '#' || /\s/.test(first)) return undefined;
    return mdSuffix(close) > pathStart ? true : undefined;
  });
  return links.map(({ start, labelEnd, close }) => ({
    start,
    end: close + 1,
    label: body.slice(start + 1, labelEnd),
    relPath: body.slice(labelEnd + 2, close),
  }));
}

function replacementForLink(
  ref: InsertLinkRef,
  guideDir: string,
  searchRoots: string[],
  state: InlineInsertsHookState,
  original: string,
  locale: LocalePack,
): string {
  const insert = resolveInsert(ref.relPath, guideDir, searchRoots);
  if (!insert) return original;

  const existing = state.firstAnchorByPath.get(insert.resolvedPath);
  if (existing) {
    return formatBackLink(ref.label, existing, locale);
  }

  return formatFirstInline(insert.resolvedPath, insert.content, ref.label, state, locale);
}

export const inlineInsertsHook: CompileHook = (ctx) => {
  const guideDir = dirname(ctx.sourceFile);
  const searchRoots = hookSearchRoots(ctx, 'inlineInserts');
  const state = ensureInlineInsertsState(ctx.hookState);
  const locale = getLocalePack();
  const refs = findInsertLinks(ctx.body);

  if (!refs.length) return ctx.body;

  const replacements = refs.map((ref) => ({
    start: ref.start,
    end: ref.end,
    text: replacementForLink(
      ref,
      guideDir,
      searchRoots,
      state,
      ctx.body.slice(ref.start, ref.end),
      locale,
    ),
  }));

  let out = ctx.body;
  for (const rep of [...replacements].sort((a, b) => b.start - a.start)) {
    out = out.slice(0, rep.start) + rep.text + out.slice(rep.end);
  }

  return out;
};
