import { realpathSync, statSync } from 'node:fs';
import { basename, dirname, join, resolve, sep } from 'node:path';
import { guideScanDirs, resolveStandaloneGuides, type MdcpConfig } from '@bwilliamson/mdcp-core';

/** Directories Vale 3.15.1 skips when it walks a scanned directory, that directory included. */
const VALE_WALK_SKIPS = new Set(['node_modules', '.git']);

/**
 * Paths `mdcp prose` and `mdcp check` pass Vale: `vale.scanGlobs` (resolved against the
 * docs root) or else the guide directories, plus every file `standaloneGuides` matches
 * under the scan root. The standalone files join either set, so `vale.scanGlobs` replaces
 * only the guide directories. Vale does not expand globs, so each `vale.scanGlobs` entry
 * must name a file or directory that exists.
 *
 * Every path is absolute. Vale runs with the docs root as its cwd, so a guide directory
 * built from a relative `--docs-root` (`docs/guide`) would point at `docs/docs/guide`.
 * Absolute paths are also why a `.vale.ini` section that should match them starts with
 * `**` + `/`.
 *
 * Vale lints a file once for every argument that reaches it, so a standalone file that a
 * scanned path already covers is left out, and so is a second spelling of a standalone
 * file (`AGENTS.md` and `./AGENTS.md`). Both checks compare paths resolved through
 * symlinks, so a docs root given through a symlink still matches a standalone file
 * resolved from the scan root. Vale's walk never enters a `node_modules` or `.git`
 * directory, so a standalone file under one keeps its own argument. Vale's walk does
 * follow a symlinked subdirectory, and this check does not, so a standalone file that a
 * scanned directory reaches only through such a link gets its own argument as well, and
 * Vale lints it under both names.
 *
 * An empty `standaloneGuides` entry is skipped, because fast-glob throws on an empty
 * pattern.
 */
export function valeScanPaths(config: MdcpConfig, docsRoot: string, scanRoot: string): string[] {
  const root = resolve(docsRoot);
  const base = config.vale?.scanGlobs?.map((g) => resolve(root, g)) ?? guideScanDirs(config, root);
  const realBase = base.map(pathKey);
  const reached = (file: string) =>
    realBase.some((p) => {
      if (file === p) return true;
      const dir = p.endsWith(sep) ? p : p + sep;
      if (!file.startsWith(dir)) return false;
      const walked = [basename(p), ...file.slice(dir.length).split(sep).slice(0, -1)];
      return !walked.some((d) => VALE_WALK_SKIPS.has(d));
    });
  const entries = config.standaloneGuides.filter((g) => g !== '');
  const { matched } = resolveStandaloneGuides(scanRoot, entries);
  const seen = new Set<string>();
  const standalone: string[] = [];
  for (const rel of matched) {
    const file = resolve(scanRoot, rel);
    const real = pathKey(file);
    if (seen.has(real) || reached(real)) continue;
    seen.add(real);
    standalone.push(file);
  }
  return [...base, ...standalone];
}

/**
 * `p` with symlinks resolved, so two spellings of one path compare equal. A file keeps its
 * own name, because Vale lints a linked file under the name it finds. A directory resolves
 * in full, because Vale walks into the target of a linked directory. A path that does not
 * exist, such as a missing `vale.scanGlobs` entry, stays as it is.
 */
function pathKey(p: string): string {
  try {
    if (statSync(p).isDirectory()) return realpathSync(p);
    return join(realpathSync(dirname(p)), basename(p));
  } catch {
    return p;
  }
}

/**
 * Vale `--minAlertLevel` for a run. A strict run (`mdcp prose --strict`, `mdcp check`)
 * shows alerts at `vale.strictMinAlertLevel` and above, default `error`. A non-strict
 * `mdcp prose` passes no level, so the `.vale.ini` `MinAlertLevel` applies.
 *
 * The level only changes what Vale prints. Of Vale's alerts, only error-level ones make
 * it exit non-zero (a runtime error does too), so a warning never fails either command.
 */
export function valeMinAlertLevel(config: MdcpConfig, strict: boolean): string | undefined {
  return strict ? (config.vale?.strictMinAlertLevel ?? 'error') : undefined;
}

/** Vale arguments shared by `mdcp prose` and `mdcp check`. */
export function valeArgs(config: MdcpConfig, scanPaths: string[], strict: boolean): string[] {
  const level = valeMinAlertLevel(config, strict);
  return [
    '--config',
    config.vale?.config ?? '.vale.ini',
    ...(level ? [`--minAlertLevel=${level}`] : []),
    ...scanPaths,
  ];
}

/**
 * Hints for a failed Vale step in `mdcp check`. Vale exits 1 on error-level alerts and 2
 * on a runtime error, such as a missing `.vale.ini`, style or scanned path. A run that
 * never started (`--require-vale` with no Vale) gets only the skip hint.
 */
export function valeCheckHints(run: { ran: boolean; exitCode: number }): string[] {
  const skip =
    'Fix prose style alerts, or use `--skip-vale` only when prose is intentionally out of scope.';
  if (!run.ran) return [skip];
  if (run.exitCode === 1) {
    return [
      skip,
      'To keep Vale off one standalone guide, such as vendored text, add a `[**/<file>]` section at the end of `.vale.ini`, after every section that matches the file, such as `[*.md]` or `[*.{md,mdx}]`. Empty `BasedOnStyles` in it, and set to `NO` each rule that an earlier section names (CLI README: Opt a standalone guide out of Vale).',
    ];
  }
  return [
    'Vale stopped with a runtime error before it reported alerts. Check `.vale.ini` and its `StylesPath`, and that each `vale.scanGlobs` entry names a path that exists, because Vale does not expand globs.',
  ];
}
