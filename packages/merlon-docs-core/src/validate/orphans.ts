import { readdirSync, existsSync } from 'node:fs';
import { join, basename, relative, resolve, sep } from 'node:path';
import { sectionFiles } from '../compile/assemble.js';

export interface OrphanIssue {
  type: 'orphan_shard' | 'missing_guide' | 'broken_manifest' | 'broken_toc';
  message: string;
  path?: string;
}

export interface GuideDirEntry {
  name: string;
  dir: string;
  manifest?: string;
  sectionsHeading?: string;
  scopeRoot?: string;
}

export function checkOrphansForGuides(guides: GuideDirEntry[]): OrphanIssue[] {
  const issues: OrphanIssue[] = [];
  const registered = new Set<string>();

  for (const guide of guides) {
    const { name, manifest, sectionsHeading, scopeRoot } = guide;
    // sectionFiles returns absolute paths, so a relative dir would never prefix them.
    const dir = resolve(guide.dir);
    if (!existsSync(dir)) {
      issues.push({
        type: 'missing_guide',
        message: `Guide directory missing: ${name}`,
        path: dir,
      });
      continue;
    }

    let files: string[];
    try {
      files = sectionFiles(dir, {
        manifest,
        sectionsHeading,
        scopeRoot: scopeRoot ? resolve(scopeRoot) : undefined,
      });
    } catch (e) {
      issues.push({
        type: 'broken_toc',
        message: `Cannot read sections for ${name}: ${(e as Error).message}`,
        path: dir,
      });
      continue;
    }

    for (const f of files) {
      // The separator keeps a sibling such as guide-shared/x.md out of guide.
      const inDir = f.startsWith(dir + sep);
      const relKey = inDir ? join(name, relative(dir, f)) : join(name, basename(f));
      registered.add(relKey);
      if (!existsSync(f)) {
        issues.push({
          type: 'broken_manifest',
          message: `sections manifest lists missing file: ${relKey}`,
          path: f,
        });
      }
    }
  }

  for (const guide of guides) {
    const { name, manifest = 'index.md' } = guide;
    const dir = resolve(guide.dir);
    if (!existsSync(dir)) continue;

    const skip = new Set([manifest, 'shards.md']);
    const onDisk = readdirSync(dir).filter((n: string) => n.endsWith('.md') && !skip.has(n));
    for (const f of onDisk) {
      const rel = join(name, f);
      if (!registered.has(rel)) {
        issues.push({
          type: 'orphan_shard',
          message: `Orphaned shard not in sections manifest: ${rel}`,
          path: join(dir, f),
        });
      }
    }
  }

  return issues;
}

export function guideDirEntriesFromNames(guidesRoot: string, names: string[]): GuideDirEntry[] {
  return names.map((name) => ({
    name,
    dir: join(guidesRoot, name),
  }));
}
