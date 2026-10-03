import { dirname, relative, resolve, sep } from 'node:path';
import fg from 'fast-glob';
import ignoreFactory from 'ignore';
import { readFileSync, existsSync } from 'node:fs';

export interface CoverageResult {
  /** Repo-root-relative POSIX paths of markdown files a guide accounts for. Sorted, unique. */
  captured: string[];
  /** Repo-root-relative POSIX paths of scanned markdown no guide accounts for. Sorted, unique. */
  uncaptured: string[];
  /** Resolved `standaloneGuides` files that exist. Sorted, unique. */
  standalone: string[];
  /** `standaloneGuides` entries that matched no file on disk. */
  missingStandalone: string[];
}

export interface CoverageOptions {
  /** Absolute scan root. */
  root: string;
  /** Absolute guide directories — the whole subtree counts as captured. */
  guideDirs: string[];
  /** Absolute guide output targets plus top-level `outputFile`. */
  outputFiles: string[];
  /** `standaloneGuides` paths or globs, relative to `root`. */
  standaloneGuides: string[];
  /** Extra ignore globs; built-in defaults are always added internally. */
  ignore: string[];
  /** Honor `.gitignore`: repo-root when inside git; scan-root only otherwise. */
  gitignore: boolean;
}

/** Directories always skipped, even when `.gitignore` does not list them. */
const BUILT_IN_IGNORE = ['**/.git/**', '**/node_modules/**', '**/.agents/**'];

function toPosix(p: string): string {
  return p.split(sep).join('/');
}

function sortedUnique(paths: string[]): string[] {
  return [...new Set(paths)].sort();
}

/** True when `absPath` is `dir` or lives inside the `dir` subtree. */
function isUnder(dir: string, absPath: string): boolean {
  const rel = relative(dir, absPath);
  return rel === '' || (!rel.startsWith('..') && !rel.startsWith(`..${sep}`));
}

/**
 * Walk up from `start` looking for a `.git` entry (directory or file, as in
 * worktrees). Returns the repository root, or null when `start` is not inside
 * a git working tree.
 */
function findGitRoot(start: string): string | null {
  let dir = resolve(start);
  for (;;) {
    if (existsSync(resolve(dir, '.git'))) return dir;
    const parent = dirname(dir);
    if (parent === dir) return null;
    dir = parent;
  }
}

/**
 * Locate the `.gitignore` that should apply to `start`.
 *
 * - Inside a git repo: use the repository-root `.gitignore` only (never walk
 *   above the `.git` boundary).
 * - Outside a git repo: honor `.gitignore` at `start` itself only — do not
 *   climb parents, which would escape the project root into unrelated trees.
 */
function findApplicableGitignore(start: string): { dir: string; content: string } | null {
  const root = resolve(start);
  const gitRoot = findGitRoot(root);
  // Inside git: repo-root `.gitignore`. Outside git: scan-root only (no parent climb).
  const ignoreDir = gitRoot ?? root;
  const gitignorePath = resolve(ignoreDir, '.gitignore');
  if (!existsSync(gitignorePath)) return null;
  return { dir: ignoreDir, content: readFileSync(gitignorePath, 'utf-8') };
}

/**
 * Filter scan-root-relative POSIX paths through the applicable `.gitignore`
 * (repo-root when inside git; scan-root only otherwise).
 */
function gitignoreFilter(root: string, relPaths: string[]): string[] {
  const found = findApplicableGitignore(root);
  if (!found) return relPaths;
  const matcher = ignoreFactory().add(found.content);
  return relPaths.filter((rel) => {
    const abs = resolve(root, rel);
    const fromIgnoreRoot = toPosix(relative(found.dir, abs));
    if (fromIgnoreRoot === '' || fromIgnoreRoot.startsWith('..')) return true;
    return !matcher.ignores(fromIgnoreRoot);
  });
}

/**
 * Expand `standaloneGuides` entries (paths or globs, relative to `root`) into
 * scan-root-relative POSIX paths, alongside the entries that matched nothing.
 */
export function resolveStandaloneGuides(
  root: string,
  entries: string[],
): { matched: string[]; missing: string[] } {
  const matched = new Set<string>();
  const missing: string[] = [];
  for (const entry of entries) {
    const matches = fg.sync(entry, {
      cwd: resolve(root),
      dot: true,
      onlyFiles: true,
      followSymbolicLinks: false,
    });
    if (matches.length === 0) {
      missing.push(entry);
      continue;
    }
    for (const m of matches) matched.add(toPosix(m));
  }
  return { matched: sortedUnique([...matched]), missing };
}

/**
 * Compute documentation coverage for the scan root.
 *
 * A markdown file is **captured** when it lives inside a guide directory subtree,
 * is a guide output target, or matches a `standaloneGuides` entry. Whatever the
 * scan finds that is not captured is **uncaptured**. Guide directory membership in
 * a manifest is the orphan check's job, so a whole guide directory counts as
 * captured and its shards are never double-reported.
 */
export function computeCoverage(opts: CoverageOptions): CoverageResult {
  const root = resolve(opts.root);

  const scannedRel = fg.sync('**/*.md', {
    cwd: root,
    dot: true,
    onlyFiles: true,
    followSymbolicLinks: false,
    ignore: [...BUILT_IN_IGNORE, ...opts.ignore],
  });

  const scanned = opts.gitignore ? gitignoreFilter(root, scannedRel) : scannedRel;

  const guideDirs = opts.guideDirs.map((d) => resolve(d));
  const outputFiles = new Set(opts.outputFiles.map((f) => resolve(f)));

  const { matched, missing: missingStandalone } = resolveStandaloneGuides(
    root,
    opts.standaloneGuides,
  );
  const standaloneMatches = new Set<string>(matched);

  const captured: string[] = [];
  const uncaptured: string[] = [];
  for (const rel of scanned) {
    const posix = toPosix(rel);
    const abs = resolve(root, rel);
    const isCaptured =
      guideDirs.some((dir) => isUnder(dir, abs)) ||
      outputFiles.has(abs) ||
      standaloneMatches.has(posix);
    if (isCaptured) captured.push(posix);
    else uncaptured.push(posix);
  }

  return {
    captured: sortedUnique(captured),
    uncaptured: sortedUnique(uncaptured),
    standalone: sortedUnique([...standaloneMatches]),
    missingStandalone: sortedUnique(missingStandalone),
  };
}
