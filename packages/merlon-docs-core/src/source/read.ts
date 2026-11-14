import { lstatSync, readFileSync, realpathSync } from 'node:fs';
import { resolve } from 'node:path';
import { globSync } from 'tinyglobby';
import type { SourceFormat } from './format.js';
import type { SourceDoc } from './model.js';
import { getFormat } from './registry.js';

export interface SourceSpec {
  /** Glob relative to the docs root. */
  glob: string;
  /** Registered format id. */
  format: string;
}

export interface ReadSourcesOptions {
  /** Absolute docs root the globs are relative to. */
  docsRoot: string;
  /** Which files are docs and which format reads them; the first matching entry wins. */
  sources: SourceSpec[];
  /** Extra ignore globs relative to the docs root. `.git` and `node_modules` are always skipped. */
  ignore?: string[];
  /** Format lookup; defaults to the registry. */
  formatOf?: (id: string) => SourceFormat;
}

export interface ReadSourcesResult {
  docs: SourceDoc[];
  /** Symlinks left out because the file they point at is read under its own path. */
  symlinks: { path: string; target: string }[];
}

const BUILT_IN_IGNORE = ['**/.git/**', '**/node_modules/**'];

/**
 * Find and read every source document under the docs root. A symlink whose target is also a
 * document is read once, under the target's own path, so it never counts as a duplicate.
 */
export function readSources(options: ReadSourcesOptions): ReadSourcesResult {
  const docsRoot = resolve(options.docsRoot);
  const formatOf = options.formatOf ?? getFormat;
  const assigned = new Map<string, string>();
  for (const spec of options.sources) {
    formatOf(spec.format);
    const files = globSync(spec.glob, {
      cwd: docsRoot,
      dot: false,
      onlyFiles: true,
      absolute: true,
      ignore: [...BUILT_IN_IGNORE, ...(options.ignore ?? [])],
    });
    for (const f of files.sort()) {
      const abs = resolve(f);
      if (!assigned.has(abs)) assigned.set(abs, spec.format);
    }
  }

  const byReal = new Map<string, { abs: string; link: boolean }[]>();
  for (const abs of assigned.keys()) {
    let real: string;
    let link: boolean;
    try {
      link = lstatSync(abs).isSymbolicLink();
      real = realpathSync(abs);
    } catch {
      continue;
    }
    const list = byReal.get(real) ?? [];
    list.push({ abs, link });
    byReal.set(real, list);
  }

  const docs: SourceDoc[] = [];
  const symlinks: { path: string; target: string }[] = [];
  for (const [real, entries] of byReal) {
    const keep = entries.find((e) => !e.link) ?? entries[0];
    for (const e of entries) if (e !== keep) symlinks.push({ path: e.abs, target: real });
    const format = formatOf(assigned.get(keep.abs)!);
    docs.push(format.reader.read(readFileSync(keep.abs, 'utf-8'), { path: keep.abs }));
  }
  docs.sort((a, b) => (a.path < b.path ? -1 : a.path > b.path ? 1 : 0));
  return { docs, symlinks };
}
