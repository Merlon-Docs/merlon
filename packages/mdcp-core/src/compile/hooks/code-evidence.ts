import { readFileSync } from 'node:fs';
import { dirname, relative } from 'node:path';
import type { CompileHook, CompileHookState } from '../hooks.js';
import { markLinkTarget } from '../publish-links.js';
import {
  codeExtensionSet,
  defaultSearchRoots,
  fileExtensionSet,
  hasCodeExtension,
  hasFileExtension,
  resolveRelativeFile,
} from './path-resolve.js';
import { formatLineFragment, lineRangeFromText } from './line-range.js';

export { formatLineFragment, lineRangeFromText } from './line-range.js';

const MD_LINK_RE = /\[([^\]]*)\]\(([^)]+)\)/g;

const IDENT_RE = /^[\w$]+$/;

/**
 * The two extension sets the hook works with: every file extension decides
 * whether a link is rewritten at all, the code ones decide whether a line can
 * be cited.
 */
export interface EvidenceExtensions {
  file: Set<string>;
  code: Set<string>;
}

/** True when a link target names a file in the repository rather than a doc or a URL. */
export function isRepoFilePath(path: string, extensions?: Set<string>): boolean {
  if (!path || path.startsWith('http://') || path.startsWith('https://') || path.startsWith('#')) {
    return false;
  }
  if (path.endsWith('.md')) return false;
  const base = path.split('#')[0].split('?')[0];
  return hasFileExtension(base, extensions) || !base.includes('.');
}

/**
 * `label` without the backticks at either end. A loop, since ``/`+$/`` rescans a backtick run from
 * each backtick.
 */
function trimBackticks(label: string): string {
  let start = 0;
  let end = label.length;
  while (start < end && label[start] === '`') start++;
  while (end > start && label[end - 1] === '`') end--;
  return label.slice(start, end);
}

export function symbolFromLabel(label: string): string | null {
  const stripped = trimBackticks(label).trim();
  if (!stripped || lineRangeFromText(stripped)) return null;
  if (!IDENT_RE.test(stripped)) return null;
  return stripped;
}

function evidenceSearchRoots(scopeRoot?: string): string[] {
  const roots = defaultSearchRoots();
  if (scopeRoot) roots.push(scopeRoot);
  return roots;
}

function lineForSymbol(filePath: string, symbol: string): string | null {
  const text = readFileSync(filePath, 'utf-8');
  const lines = text.split('\n');
  const escaped = symbol.replace(/[.*+?^${}()|[\]\\]/g, '\\$&');
  const patterns = [
    new RegExp(`\\b${escaped}\\b`),
    new RegExp(`\\bfunction\\s+${escaped}\\b`),
    new RegExp(`\\bclass\\s+${escaped}\\b`),
    new RegExp(`\\b(?:const|let|var|export)\\s+${escaped}\\b`),
    new RegExp(`\\b${escaped}\\s*\\(`),
  ];
  for (let i = 0; i < lines.length; i++) {
    if (patterns.some((re) => re.test(lines[i]))) {
      return formatLineFragment(String(i + 1));
    }
  }
  return null;
}

function posixRelative(fromDir: string, toFile: string): string {
  return relative(fromDir, toFile).replace(/\\/g, '/');
}

function outputPathForLink(pathPart: string, resolved: string | null, outputFile?: string): string {
  if (!resolved || !outputFile) return pathPart;
  return posixRelative(dirname(outputFile), resolved);
}

/** A link as the hook writes it, and whether the hook rebased its path for the output. */
interface EvidenceLink {
  label: string;
  target: string;
  rebased: boolean;
}

function evidenceLink(
  label: string,
  pathPart: string,
  resolved: string | null,
  outputFile: string | undefined,
  fragment?: string,
): EvidenceLink {
  const path = outputPathForLink(pathPart, resolved, outputFile);
  const target = fragment ? `${path}#${fragment}` : path;
  return { label, target, rebased: Boolean(resolved && outputFile) };
}

function rewriteEvidenceLink(
  label: string,
  target: string,
  guideDir: string,
  searchRoots: string[],
  outputFile?: string,
  extensions?: EvidenceExtensions,
): EvidenceLink {
  const [pathPart, fragment] = target.split('#');
  if (!isRepoFilePath(pathPart, extensions?.file)) return { label, target, rebased: false };

  const existingLine = fragment?.match(/^L\d+(?:-L\d+)?$/i);
  if (existingLine) {
    const resolved = resolveRelativeFile(pathPart, guideDir, searchRoots);
    return evidenceLink(label, pathPart, resolved, outputFile, fragment.toUpperCase());
  }

  const resolved = resolveRelativeFile(pathPart, guideDir, searchRoots);

  // A symbol names a line in code. In a data file the same match is an
  // occurrence rather than a declaration, so a data link is rebased and left
  // without a fragment. `lint.codeExtensions` moves an extension across.
  const citable = hasCodeExtension(pathPart, extensions?.code);

  let lineFrag = lineRangeFromText(label) ?? lineRangeFromText(pathPart);
  if (!lineFrag && citable && fragment && !fragment.match(/^L\d/i) && resolved) {
    lineFrag = lineForSymbol(resolved, fragment);
  }
  if (!lineFrag && citable && resolved) {
    const symbol = symbolFromLabel(label);
    if (symbol) lineFrag = lineForSymbol(resolved, symbol);
  }

  // No line to cite — a data file, or a symbol the label does not name. The
  // path still has to be rebased, or a link correct in the shard breaks in
  // output published from another directory. `outputPathForLink` leaves an
  // unresolvable path alone.
  return evidenceLink(label, pathPart, resolved, outputFile, lineFrag ?? undefined);
}

/**
 * `body` with each link the hook reads replaced by what `replace` returns for it. `replace` gets the
 * link's label and target.
 */
function replaceEvidenceLinks(
  body: string,
  replace: (match: string, label: string, target: string) => string,
): string {
  return body.replace(MD_LINK_RE, replace);
}

/** A link the hook rebased: the text it wrote, and how many of its links before it have that text. */
export interface RebasedEvidenceLink {
  text: string;
  occurrence: number;
}

/** A counter that returns, for each link text in document order, how often it came before. */
function occurrenceCounter(): (text: string) => number {
  const seen = new Map<string, number>();
  return (text) => {
    const count = seen.get(text) ?? 0;
    seen.set(text, count + 1);
    return count;
  };
}

/**
 * The links the hook rebased in the shard each assembly is on, by that assembly's hook state.
 * Only assembly sets a list, so the hook records nothing for any other caller.
 */
const rebasedLinksByState = new WeakMap<CompileHookState, RebasedEvidenceLink[]>();

/**
 * Record each link that `codeEvidenceHook` rebases from now on under `hookState`, as the hook
 * writes it, in the list this returns. Assembly calls this before it runs a shard's hooks.
 */
export function recordRebasedEvidenceLinks(hookState: CompileHookState): RebasedEvidenceLink[] {
  const links: RebasedEvidenceLink[] = [];
  rebasedLinksByState.set(hookState, links);
  return links;
}

/**
 * Mark the target of each link in `body` that `rebased` lists, so the publish-relative pass leaves
 * a path the hook already rebased for the output alone. The hook writes no mark itself, so neither
 * a direct caller nor a hook after it sees one.
 *
 * A link is marked when it has the text the hook wrote and the same place among the links with
 * that text, in document order. So a shard's own link with that text, which the hook left as
 * written, stays unmarked. A hook after it that changes that text leaves the link unmarked. One
 * that adds or removes a link with the same text above it, such as an insert that `inlineInserts`
 * places there, moves the mark onto another link with that text.
 */
export function markRebasedEvidenceLinks(
  body: string,
  rebased: readonly RebasedEvidenceLink[],
): string {
  if (rebased.length === 0) return body;
  const marked = new Set(rebased.map((link) => `${link.occurrence}:${link.text}`));
  const occurrence = occurrenceCounter();
  return replaceEvidenceLinks(body, (match, label: string, target: string) =>
    marked.has(`${occurrence(match)}:${match}`) ? `[${label}](${markLinkTarget(target)})` : match,
  );
}

export const codeEvidenceHook: CompileHook = (ctx) => {
  const guideDir = dirname(ctx.sourceFile);
  const searchRoots = evidenceSearchRoots(ctx.scopeRoot);
  const extensions: EvidenceExtensions = {
    file: fileExtensionSet(ctx.config.lint),
    code: codeExtensionSet(ctx.config.lint),
  };
  const rebased = ctx.hookState ? rebasedLinksByState.get(ctx.hookState) : undefined;
  // Every link the hook writes counts, so marking can tell a rebased link from one with its text.
  const occurrence = occurrenceCounter();

  return replaceEvidenceLinks(ctx.body, (match, label: string, target: string) => {
    if (!isRepoFilePath(target.split('#')[0], extensions.file)) {
      occurrence(match);
      return match;
    }
    const link = rewriteEvidenceLink(
      label,
      target,
      guideDir,
      searchRoots,
      ctx.outputFile,
      extensions,
    );
    const text = `[${link.label}](${link.target})`;
    const before = occurrence(text);
    if (link.rebased) rebased?.push({ text, occurrence: before });
    return text;
  });
};
