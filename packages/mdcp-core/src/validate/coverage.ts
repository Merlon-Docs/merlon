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

/**
 * Drop absolute paths matched by `scan.ignore` globs (plus the built-in ignores), using the
 * same fast-glob matching as {@link computeCoverage}. Globs are relative to `root`; paths
 * outside `root` are kept because no scan glob can name them.
 */
export function filterScanIgnored(root: string, absPaths: string[], ignore: string[]): string[] {
  const base = resolve(root);
  const inside: string[] = [];
  const kept = new Set<string>();
  for (const abs of absPaths) {
    const rel = toPosix(relative(base, abs));
    if (rel === '' || rel.startsWith('..')) kept.add(abs);
    else inside.push(rel);
  }
  if (inside.length > 0) {
    // Static (escaped) patterns: fast-glob checks each file and applies `ignore` exactly as the scan does.
    const visible = fg.sync(
      inside.map((rel) => fg.escapePath(rel)),
      {
        cwd: base,
        dot: true,
        onlyFiles: true,
        followSymbolicLinks: false,
        ignore: [...BUILT_IN_IGNORE, ...ignore],
      },
    );
    for (const rel of visible) kept.add(resolve(base, rel));
  }
  return absPaths.filter((p) => kept.has(p));
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

  const standaloneMatches = new Set<string>();
  const missingStandalone: string[] = [];
  for (const entry of opts.standaloneGuides) {
    const matches = fg.sync(entry, {
      cwd: root,
      dot: true,
      onlyFiles: true,
      followSymbolicLinks: false,
    });
    if (matches.length === 0) {
      missingStandalone.push(entry);
      continue;
    }
    for (const m of matches) standaloneMatches.add(toPosix(m));
  }

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
