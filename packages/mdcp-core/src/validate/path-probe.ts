import { existsSync, readFileSync } from 'node:fs';
import { dirname, resolve } from 'node:path';
import fg from 'fast-glob';
import type { MdcpConfig } from '../config/schema.js';
import { getGuideConfig, guideScanDirs } from '../config/load.js';
import { type ExtensionConfig, fileExtensionSet } from '../compile/hooks/path-resolve.js';
import { resolveStandaloneGuides } from './coverage.js';

/**
 * Resolution of backtick-quoted repository paths in documentation prose.
 *
 * A shard that names `src/session/store.ts` in prose makes a checkable claim:
 * that file is in the repository. When the component is removed and the prose
 * survives, the claim goes stale and no structural check notices, because the
 * path is not a link.
 *
 * The probe cannot distinguish a path that went stale from one that was always
 * illustrative — the two are textually identical — so the discriminator is
 * authorial: a file whose paths teach syntax rather than describe this
 * repository opts out with a marker. Default severity is `off`; a repository
 * turns it on once its own corpus is clean.
 */

/**
 * Opt-out marker, in two scopes:
 *
 * - alone on its own line — the whole file is exempt, for a document whose
 *   paths teach syntax rather than describe this repository;
 * - trailing a content line — that line only, for a single illustrative path
 *   in a document that otherwise makes real claims.
 *
 * A whole-file marker on a mostly-descriptive shard would exempt its real
 * claims too, which is why the line scope exists.
 */
export const ILLUSTRATIVE_MARKER = '<!-- mdcp-paths: illustrative -->';

const SPAN_RE = /`([^`\n]+)`/g;

/** Documentation extensions, always claimable alongside the source ones. */
const DOC_EXTENSIONS = ['md', 'mdx'];

/**
 * Extensions that let a backtick span name a file: every code and data
 * extension, widened with documentation formats. Prose asks the same question
 * link validation does, whether the file exists, so the two share one pair of
 * config knobs.
 */
export function pathClaimExtensions(lint?: ExtensionConfig): Set<string> {
  const set = fileExtensionSet(lint);
  for (const ext of DOC_EXTENSIONS) set.add(ext);
  return set;
}

export interface PathProbeIssue {
  /** Absolute path of the file the claim appears in. */
  file: string;
  /** 1-based line number. */
  line: number;
  /** Path as authored, without surrounding backticks. */
  path: string;
}

export interface PathProbeOptions {
  /** Absolute paths of the documentation source files to scan. */
  files: string[];
  /**
   * Absolute roots every claim resolves against, in order. The file's own
   * directory is always tried first and does not need listing.
   */
  searchRoots: string[];
  /**
   * Scan-root-relative prefixes that are real but absent in a clean checkout:
   * build output, caches, vendor-managed installs. A claim under one of these
   * is not reported.
   */
  generated: string[];
  /**
   * Paths this repository documents without having: names the protocol defines
   * for a consumer repository, or another project's tree. Matched exactly,
   * because the name is what the document declares, so an invented file
   * beneath one still has to resolve.
   */
  vocabulary: string[];
  /** Effective claim extensions (see `pathClaimExtensions`). Defaults apply when absent. */
  extensions?: Set<string>;
}

/**
 * Trim `./` and trailing slashes without a regex.
 *
 * The regex forms of these (`/^\.\//`, `/\/+$/`, `/#.*$/`) backtrack on a
 * span with many repeated `/` or `#`, and a span comes from documentation text
 * rather than from us — CodeQL js/polynomial-redos flags exactly this. Index
 * arithmetic is linear whatever the input.
 */
function stripLeadingDotSlash(path: string): string {
  return path.startsWith('./') ? path.slice(2) : path;
}

function stripTrailingSlashes(path: string): string {
  let end = path.length;
  while (end > 0 && path[end - 1] === '/') end--;
  return path.slice(0, end);
}

function beforeFragment(text: string): string {
  const hash = text.indexOf('#');
  return hash === -1 ? text : text.slice(0, hash);
}

/**
 * True when a backtick span claims a repository path rather than prose, a
 * command, or a code identifier.
 *
 * A claim must carry a directory segment, so the root it resolves against is
 * not a guess. That rules out a bare `index.md` and equally a bare `src/`:
 * both are spoken of generically, with no path to anchor them. Anything with
 * whitespace is a command line; a glob, brace or angle bracket is a pattern
 * rather than a file; a leading `-`, `#`, `$`, `@` or `~` is a flag, anchor,
 * variable, npm scope or home-relative path; an absolute path is outside the
 * repository's control.
 *
 * Returns the resolvable path with `./` and any trailing slash or `#fragment`
 * removed, or null when the span makes no claim.
 */
export function isPathClaim(span: string, extensions?: Set<string>): string | null {
  const text = span.trim();
  if (!text || /\s/.test(text)) return null;
  if (/^https?:|^mailto:/i.test(text)) return null;
  if (/^[-#$@~]/.test(text) || text.startsWith('/')) return null;
  if (/[*?{}()<>|=:;,![\]]/.test(text)) return null;

  const withoutFragment = beforeFragment(text);
  const bare = stripTrailingSlashes(stripLeadingDotSlash(withoutFragment));
  if (!bare || !bare.includes('/')) return null;

  const isDirectory = withoutFragment.endsWith('/');
  if (!isDirectory) {
    const dot = bare.lastIndexOf('.');
    const ext = dot > 0 && dot < bare.length - 1 ? bare.slice(dot + 1).toLowerCase() : null;
    if (!ext) return null;
    if (!(extensions ?? pathClaimExtensions()).has(ext)) return null;
  }
  return bare;
}

/** True when the whole file opts out: the marker stands alone on a line. */
export function hasIllustrativeMarker(text: string): boolean {
  return text.split('\n').some((line) => line.trim() === ILLUSTRATIVE_MARKER);
}

/** True when this line opts out: the marker trails content on the same line. */
export function lineOptsOut(line: string): boolean {
  return line.includes(ILLUSTRATIVE_MARKER) && line.trim() !== ILLUSTRATIVE_MARKER;
}

function normalizeEntry(entry: string): string {
  return stripTrailingSlashes(stripLeadingDotSlash(entry));
}

/**
 * True when the document has already declared why this path does not resolve.
 *
 * The two declarations are different claims, so they match differently. A
 * generated prefix covers a whole tree, because nothing under it exists until
 * something builds it. A vocabulary entry is one name the document uses
 * without instantiating, so matching stops there: `docs/client/` is declared,
 * `docs/client/onboarding.md` is still an unresolved path.
 */
function isDeclared(path: string, options: Pick<PathProbeOptions, 'generated' | 'vocabulary'>) {
  const generated = options.generated.some((prefix) => {
    const normalized = normalizeEntry(prefix);
    return path === normalized || path.startsWith(`${normalized}/`);
  });
  return generated || options.vocabulary.some((entry) => path === normalizeEntry(entry));
}

/**
 * Resolve every path claim in `text`, returning the ones that resolve against
 * no root. The text is passed in rather than read here so a caller holding a
 * shard snapshot does not re-read the file.
 */
export function probePathClaims(
  file: string,
  text: string,
  options: Pick<PathProbeOptions, 'searchRoots' | 'generated' | 'vocabulary' | 'extensions'>,
): PathProbeIssue[] {
  if (hasIllustrativeMarker(text)) return [];

  const roots = [dirname(file), ...options.searchRoots];
  const extensions = options.extensions ?? pathClaimExtensions();
  const issues: PathProbeIssue[] = [];
  const lines = text.split('\n');
  let inFence = false;

  for (let i = 0; i < lines.length; i++) {
    const line = lines[i];
    if (line.trim().startsWith('```')) {
      inFence = !inFence;
      continue;
    }
    if (inFence) continue;
    if (lineOptsOut(line)) continue;

    for (const match of line.matchAll(SPAN_RE)) {
      const claim = isPathClaim(match[1], extensions);
      if (!claim) continue;
      if (isDeclared(claim, options)) continue;
      if (roots.some((root) => existsSync(resolve(root, claim)))) continue;
      issues.push({ file, line: i + 1, path: match[1].trim() });
    }
  }

  return issues;
}

export function formatPathProbeIssue(issue: PathProbeIssue, severity: 'error' | 'warn'): string {
  const prefix = severity === 'warn' ? 'path-warn' : 'path';
  return `${prefix}: ${issue.file}:${issue.line}: unresolved path "${issue.path}"`;
}

/** Run the probe over every file in `options.files`. */
export function probeDocumentPaths(options: PathProbeOptions): PathProbeIssue[] {
  const issues: PathProbeIssue[] = [];
  for (const file of options.files) {
    let text: string;
    try {
      text = readFileSync(file, 'utf-8');
    } catch {
      continue;
    }
    issues.push(...probePathClaims(file, text, options));
  }
  return issues;
}

/**
 * Build probe inputs from config.
 *
 * Source docs only — guide shards and standalone guides. Compiled output is
 * generated from these, so scanning it would double-report every claim and
 * point diagnostics at a file nobody should edit.
 *
 * The root ladder is the scan root, the docs root, each guide's `scopeRoot`,
 * and whatever `lint.paths.searchRoots` adds — a monorepo names paths relative
 * to a package as readily as to the repository.
 */
export function pathProbeInputs(
  config: MdcpConfig,
  docsRoot: string,
  scanRoot: string,
): PathProbeOptions {
  const files: string[] = [];
  for (const dir of guideScanDirs(config, docsRoot)) {
    files.push(...fg.sync('**/*.md', { cwd: dir, absolute: true, onlyFiles: true, dot: true }));
  }
  const { matched } = resolveStandaloneGuides(scanRoot, config.standaloneGuides);
  files.push(...matched.map((rel) => resolve(scanRoot, rel)));

  const searchRoots = [resolve(scanRoot), resolve(docsRoot)];
  for (const name of config.compileOrder) {
    const scopeRoot = getGuideConfig(config, name)?.compile?.scopeRoot;
    if (scopeRoot) searchRoots.push(resolve(docsRoot, scopeRoot));
  }
  for (const root of config.lint?.paths?.searchRoots ?? []) {
    searchRoots.push(resolve(scanRoot, root));
  }

  return {
    files: [...new Set(files)],
    searchRoots: [...new Set(searchRoots)],
    generated: config.lint?.paths?.generated ?? [],
    vocabulary: config.lint?.paths?.vocabulary ?? [],
    extensions: pathClaimExtensions(config.lint),
  };
}
