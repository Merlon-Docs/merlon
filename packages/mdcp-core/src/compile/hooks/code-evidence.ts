import { readFileSync } from 'node:fs';
import { dirname, relative } from 'node:path';
import type { CompileHook, CompileHookState } from '../hooks.js';
import { markLinkTarget } from '../publish-links.js';
import { maskInlineCode } from '../../links/extract.js';
import { createQuotedFenceScanner } from '../../markdown/index.js';
import {
  nestedLinkIndexes,
  piecesBetween,
  replaceLinkTargets,
  scanMarkdownLinks,
} from '../link-scan.js';
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

/** A link's target as the hook writes it, and whether the hook rebased its path for the output. */
interface EvidenceLink {
  target: string;
  rebased: boolean;
}

function evidenceLink(
  pathPart: string,
  resolved: string | null,
  outputFile: string | undefined,
  fragment?: string,
): EvidenceLink {
  const path = outputPathForLink(pathPart, resolved, outputFile);
  const target = fragment ? `${path}#${fragment}` : path;
  return { target, rebased: Boolean(resolved && outputFile) };
}

function rewriteEvidenceLink(
  label: string,
  target: string,
  resolveFile: (pathPart: string) => string | null,
  outputFile?: string,
  extensions?: EvidenceExtensions,
): EvidenceLink {
  const [pathPart, fragment] = target.split('#');
  if (!isRepoFilePath(pathPart, extensions?.file)) return { target, rebased: false };

  const existingLine = fragment?.match(/^L\d+(?:-L\d+)?$/i);
  if (existingLine) {
    const resolved = resolveFile(pathPart);
    return evidenceLink(pathPart, resolved, outputFile, fragment.toUpperCase());
  }

  const resolved = resolveFile(pathPart);

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
  return evidenceLink(pathPart, resolved, outputFile, lineFrag ?? undefined);
}

/**
 * A link the hook reads, as the body wrote it. Images nest, so the label of an image holds every
 * image inside it, and on a line of nested images those labels add up to the square of the line's
 * length. So `text` and `label` leave out the links and images in the label, and each index of the
 * body is in the `text` of one link at most.
 */
interface ProseLink {
  /** The link's text with each link and image in its label cut out. Marking tells links apart by it. */
  text: string;
  /**
   * The label as written, or, when it holds links or images, the text around them, each piece
   * trimmed and the pieces that hold text joined by a space.
   */
  label: string;
  target: string;
}

/** The new target of a link, or undefined to leave it as written. */
type RewriteEvidenceTarget = (link: ProseLink) => string | undefined;

/** Stands for each link or image cut out of a link's text. */
const CUT = '\u0000';

/**
 * `text`, which holds no fenced code, with the target of each link outside a code span that
 * `rewrite` gives a new one for replaced. `linkTexts` gets the text of each link in the result, as
 * `ProseLink.text` gives it.
 */
function rewriteProseLinks(
  text: string,
  rewrite: RewriteEvidenceTarget,
  linkTexts: string[],
): string {
  // Masking keeps each index, so a link in `masked` is at the same place in `text`.
  const masked = text.split('\n').map(maskInlineCode).join('\n');
  // Each link and image with a target of at least one character.
  const links = scanMarkdownLinks(masked).filter((link) => link.close > link.labelEnd + 2);
  const nested = nestedLinkIndexes(links);
  // The pieces of `source` from `from` to `to` around the links and images right inside link `i`,
  // which `at` places in `source`.
  const around = (source: string, at: [number, number][], i: number, from: number, to: number) =>
    piecesBetween(
      source,
      from,
      to,
      nested[i].map((j) => at[j]),
    );
  const spans = links.map((link): [number, number] => [link.start, link.close + 1]);
  const targets = links.map((link, i) => {
    const labelStart = link.start + (link.image ? 2 : 1);
    const label =
      nested[i].length === 0
        ? text.slice(labelStart, link.labelEnd)
        : around(text, spans, i, labelStart, link.labelEnd)
            .map((piece) => piece.trim())
            .filter((piece) => piece !== '')
            .join(' ');
    return rewrite({
      text: around(text, spans, i, ...spans[i]).join(CUT),
      label,
      target: text.slice(link.labelEnd + 2, link.close),
    });
  });
  const result = replaceLinkTargets(text, links, targets);
  for (let i = 0; i < links.length; i++) {
    linkTexts.push(around(result.text, result.spans, i, ...result.spans[i]).join(CUT));
  }
  return result.text;
}

/**
 * `body` with the target of each link the hook reads replaced by what `rewrite` returns for it.
 * `rewrite` gets each link and image in the order of their targets, so an image in the label of a
 * link comes before the link, and `linkTexts` lists the text each has in the result, as
 * `ProseLink.text` gives it, in that order.
 * The hook skips fenced code, in a blockquote too, and code spans, as the link passes and link lint
 * do. A label can still wrap onto the next line between two fences, so a label that prose wrapping
 * breaks keeps its link.
 */
function replaceEvidenceLinks(
  body: string,
  rewrite: RewriteEvidenceTarget,
): { body: string; linkTexts: string[] } {
  const inFence = createQuotedFenceScanner();
  const out: string[] = [];
  const linkTexts: string[] = [];
  let prose: string[] = [];
  const flush = () => {
    if (prose.length > 0) out.push(rewriteProseLinks(prose.join('\n'), rewrite, linkTexts));
    prose = [];
  };
  for (const line of body.split('\n')) {
    if (inFence(line)) {
      flush();
      out.push(line);
    } else {
      prose.push(line);
    }
  }
  flush();
  return { body: out.join('\n'), linkTexts };
}

/**
 * A link the hook rebased: the text it wrote, as `ProseLink.text` gives it, and how many of its
 * links before it have that text.
 */
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
 * A link is marked when it has the text the hook wrote, with the links and images in its label cut
 * out, and the same place among the links with that text, in document order. So a shard's own link
 * with that text, which the hook left as written, stays unmarked. A hook after it that changes that
 * text leaves the link unmarked. One that adds or removes a link with the same text above it, such
 * as an insert that `inlineInserts` places there, moves the mark onto another link with that text.
 */
export function markRebasedEvidenceLinks(
  body: string,
  rebased: readonly RebasedEvidenceLink[],
): string {
  if (rebased.length === 0) return body;
  const marked = new Set(rebased.map((link) => `${link.occurrence}:${link.text}`));
  const occurrence = occurrenceCounter();
  return replaceEvidenceLinks(body, ({ text, target }) =>
    marked.has(`${occurrence(text)}:${text}`) ? markLinkTarget(target) : undefined,
  ).body;
}

export const codeEvidenceHook: CompileHook = (ctx) => {
  const guideDir = dirname(ctx.sourceFile);
  const searchRoots = evidenceSearchRoots(ctx.scopeRoot);
  const extensions: EvidenceExtensions = {
    file: fileExtensionSet(ctx.config.lint),
    code: codeExtensionSet(ctx.config.lint),
  };
  // A shard can repeat a path in many links, so the hook looks each path up once.
  const resolvedPaths = new Map<string, string | null>();
  const resolveFile = (pathPart: string) => {
    let resolved = resolvedPaths.get(pathPart);
    if (resolved === undefined) {
      resolved = resolveRelativeFile(pathPart, guideDir, searchRoots);
      resolvedPaths.set(pathPart, resolved);
    }
    return resolved;
  };
  const rebased = ctx.hookState ? rebasedLinksByState.get(ctx.hookState) : undefined;
  const rebasedAt: boolean[] = [];

  const result = replaceEvidenceLinks(ctx.body, ({ label, target }) => {
    if (!isRepoFilePath(target.split('#')[0], extensions.file)) {
      rebasedAt.push(false);
      return undefined;
    }
    const link = rewriteEvidenceLink(label, target, resolveFile, ctx.outputFile, extensions);
    rebasedAt.push(link.rebased);
    return link.target;
  });
  // Every link the hook writes counts, so marking can tell a rebased link from one with its text.
  const occurrence = occurrenceCounter();
  result.linkTexts.forEach((text, i) => {
    const before = occurrence(text);
    if (rebasedAt[i]) rebased?.push({ text, occurrence: before });
  });
  return result.body;
};
