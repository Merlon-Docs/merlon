import { readFileSync, existsSync, readdirSync } from 'node:fs';
import { join, resolve, dirname } from 'node:path';
import { loadShardSnapshot, type ShardCache } from './shard-cache.js';
import { mdLinkPaths, slugLinkTargets } from './link-scan.js';

export interface SectionFilesOptions {
  manifest?: string;
  scopeRoot?: string;
  sectionsHeading?: string;
  cache?: ShardCache;
  preambleSection?: string;
}

function manifestTextForSections(text: string, sectionsHeading?: string): string {
  if (!sectionsHeading) return text;
  const escaped = sectionsHeading.replace(/[.*+?^${}()|[\]\\]/g, '\\$&');
  const re = new RegExp(`^##\\s+${escaped}\\s*$`, 'im');
  const match = re.exec(text);
  if (!match || match.index === undefined) return text;
  return text.slice(match.index);
}

function resolveManifestPaths(
  guideDir: string,
  text: string,
  options: SectionFilesOptions,
): string[] {
  const scope = options.scopeRoot ? resolve(options.scopeRoot) : null;
  const files: string[] = [];

  for (const path of mdLinkPaths(text)) {
    const rel = path.split('#')[0];
    const resolved = resolve(guideDir, rel);
    if (scope && !resolved.startsWith(scope + '/') && resolved !== scope) {
      continue;
    }
    if (!files.includes(resolved)) files.push(resolved);
  }

  for (const slug of slugLinkTargets(text)) {
    if (slug === 'table-of-contents') continue;
    const name = `${slug}.md`;
    const local = join(guideDir, name);
    if (existsSync(local) && !files.includes(local)) {
      files.push(local);
    }
  }

  return files;
}

export function sectionFiles(guideDir: string, options: SectionFilesOptions = {}): string[] {
  const manifestName = options.manifest ?? 'index.md';
  const indexPath = join(guideDir, manifestName);
  if (!existsSync(indexPath)) {
    throw new Error(`No ${manifestName} in ${guideDir}`);
  }

  const text = readFileSync(indexPath, 'utf-8');
  const scopedText = manifestTextForSections(text, options.sectionsHeading);

  const resolved = resolveManifestPaths(guideDir, scopedText, {});
  if (resolved.length > 0) return resolved;

  return readdirSync(guideDir)
    .filter((n: string) => n.endsWith('.md') && n !== manifestName && n !== 'shards.md')
    .sort()
    .map((n: string) => join(guideDir, n));
}

/** Manifest sections plus shards reachable via transitive `.md` links within the guide tree. */
export function linkedSectionFiles(guideDir: string, options: SectionFilesOptions = {}): string[] {
  const guideRoot = resolve(guideDir);
  const scope = options.scopeRoot ? resolve(options.scopeRoot) : null;
  const cache = options.cache;
  const preambleSection = options.preambleSection ?? 'about-this-guide.md';

  function inScope(filePath: string): boolean {
    const abs = resolve(filePath);
    if (abs === guideRoot || abs.startsWith(`${guideRoot}/`)) return true;
    if (scope && (abs === scope || abs.startsWith(`${scope}/`))) return true;
    return false;
  }

  const collected = new Set(sectionFiles(guideDir, options));
  const queue = [...collected];

  while (queue.length > 0) {
    const filePath = queue.shift()!;
    const text = cache
      ? loadShardSnapshot(filePath, cache, preambleSection).raw
      : readFileSync(filePath, 'utf-8');
    for (const path of mdLinkPaths(text)) {
      const rel = path.split('#')[0];
      const resolved = resolve(dirname(filePath), rel);
      if (!inScope(resolved)) continue;
      if (!existsSync(resolved) || collected.has(resolved)) continue;
      collected.add(resolved);
      queue.push(resolved);
    }
  }

  return [...collected];
}

export function linkedSectionFilesCacheKey(guideDir: string, options: SectionFilesOptions): string {
  return [
    resolve(guideDir),
    options.manifest ?? 'index.md',
    options.scopeRoot ? resolve(options.scopeRoot) : '',
    options.sectionsHeading ?? '',
  ].join('\0');
}
