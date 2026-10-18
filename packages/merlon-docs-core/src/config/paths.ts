import { resolve, relative, isAbsolute } from 'node:path';

function isUnder(parent: string, child: string): boolean {
  const rel = relative(parent, child);
  return rel !== '' && !rel.startsWith('..') && !isAbsolute(rel);
}

/**
 * Resolve `file` under `outputDir` (both relative to docs root `docsRoot`).
 * Absolute `file` values are returned unchanged.
 * When `file` is accidentally docs-root-relative but already under `outputDir`, use that path.
 */
export function resolveUnderOutputDir(docsRoot: string, outputDir: string, file: string): string {
  if (isAbsolute(file)) return file;
  const outputRoot = resolve(docsRoot, outputDir);
  const underOutputDir = resolve(outputRoot, file);
  const docsRelative = resolve(docsRoot, file);
  if (docsRelative !== underOutputDir && isUnder(outputRoot, docsRelative)) {
    return docsRelative;
  }
  return underOutputDir;
}

/** Default per-guide output filename under outputDir. */
export function defaultGuideOutputFile(guideName: string, compileOrderLength: number): string {
  return compileOrderLength === 1 ? 'guide.md' : `${guideName}.md`;
}
