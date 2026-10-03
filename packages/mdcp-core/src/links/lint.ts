import { basename, dirname, resolve } from 'node:path';
import type { CompileGuideResult } from '../compile/assemble.js';
import { compileGuidesFromResults } from '../compile/assemble.js';
import type { MdcpConfig } from '../config/schema.js';
import { getGuideConfig, resolveGuideDir, resolveUnderOutputDir } from '../config/load.js';
import { sectionFiles } from '../compile/section-manifest.js';
import { buildGuideLinkIndex, type GuideLinkIndex } from '../compile/guide-link-index.js';
import { buildSlugRegistry } from '../refs/slugs.js';
import type { RefsRegistry } from '../refs/slugs.js';
import type { ShardCache } from '../compile/shard-cache.js';
import { lintCompiledLinks } from './validate-compiled.js';
import { lintShardLinks } from './validate-shards.js';
import { resolveStandaloneGuides } from '../validate/coverage.js';
import { fileExtensionSet } from '../compile/hooks/path-resolve.js';
import type { LinkIssue } from './types.js';

export type { LinkIssue, LinkSeverity } from './types.js';
export { formatLinkIssue } from './types.js';
export { markBrokenLinks, formatBrokenLinkMarker } from './mark-broken.js';
export type { LinkProvenance, MarkBrokenLinksOptions } from './mark-broken.js';
export { extractLinks } from './extract.js';
export { validateCompiledLinkTarget } from './validate.js';
export { lintShardLinks, collectShardProvenance } from './validate-shards.js';
export { lintCompiledLinks } from './validate-compiled.js';

export interface LintLinksOptions {
  config: MdcpConfig;
  docsRoot: string;
  results: CompileGuideResult[];
  /** When set, also lint shard sources. */
  lintShards?: boolean;
  compileOptions?: import('../compile/assemble.js').CompileOptions;
  linkIndex?: GuideLinkIndex;
  shardCache?: ShardCache;
  /**
   * Scan root the `standaloneGuides` globs resolve against — the same root the
   * coverage pass uses. Standalone guides are link-linted only when this is set.
   */
  scanRoot?: string;
}

function disallowedShardPathsForPublisher(
  config: MdcpConfig,
  docsRoot: string,
  publishingGuideName: string,
  linkIndex: GuideLinkIndex,
): Set<string> {
  const ignoreGuides = new Set(
    getGuideConfig(config, publishingGuideName)?.compile?.crossGuideLinks?.ignoreGuides ?? [],
  );
  const disallowed = new Set<string>();
  const absDocsRoot = resolve(docsRoot);

  for (const name of config.compileOrder) {
    if (ignoreGuides.has(name)) continue;

    const cfg = getGuideConfig(config, name);
    const compile = cfg?.compile;
    if (compile?.outputFile) continue;

    const guideDir = resolveGuideDir(name, config, absDocsRoot);
    for (const shardPath of linkIndex.keys()) {
      const absShard = resolve(shardPath);
      if (absShard === guideDir || absShard.startsWith(`${guideDir}/`)) {
        disallowed.add(absShard);
      }
    }
  }
  return disallowed;
}

/**
 * Link-lint the files registered under `standaloneGuides`. These are captured
 * but never compiled, so nothing else in the gate reads their links. Each file
 * is its own guide directory: there is no manifest or scope root to resolve
 * against.
 */
function lintStandaloneGuideLinks(
  config: MdcpConfig,
  scanRoot: string,
  fileExtensions: Set<string>,
): LinkIssue[] {
  const { matched } = resolveStandaloneGuides(scanRoot, config.standaloneGuides);
  const issues: LinkIssue[] = [];
  for (const rel of matched) {
    const shardFile = resolve(scanRoot, rel);
    issues.push(...lintShardLinks({ shardFile, guideDir: dirname(shardFile), fileExtensions }));
  }
  return issues;
}

export function lintLinks(options: LintLinksOptions): LinkIssue[] {
  const issues: LinkIssue[] = [];
  const { config, docsRoot, results } = options;
  const outputDir = config.outputDir;
  const fileExtensions = fileExtensionSet(config.lint);

  const knownOutputBasenames = new Set(results.map((r) => basename(r.outputFile)));
  if (config.outputFile !== undefined) {
    knownOutputBasenames.add(basename(config.outputFile));
  }

  const knownSlugs = new Set<string>();
  const absDocsRoot = resolve(docsRoot);
  const allowedPublishPaths = new Set(
    results
      .filter((r) => r.publishOnly)
      .map((r) => resolve(resolveUnderOutputDir(absDocsRoot, outputDir, r.outputFile))),
  );
  if (config.outputFile !== undefined) {
    allowedPublishPaths.add(
      resolve(resolveUnderOutputDir(absDocsRoot, outputDir, config.outputFile)),
    );
  }

  const slugRegistryCache = new Map<string, RefsRegistry>();
  for (const r of results) {
    const outPath = resolve(resolveUnderOutputDir(absDocsRoot, outputDir, r.outputFile));
    slugRegistryCache.set(outPath, buildSlugRegistry(r.text));
  }
  if (config.outputFile !== undefined && options.compileOptions) {
    const monolithPath = resolve(resolveUnderOutputDir(absDocsRoot, outputDir, config.outputFile));
    const monolithText = compileGuidesFromResults(results, options.compileOptions);
    slugRegistryCache.set(monolithPath, buildSlugRegistry(monolithText));
  }

  let linkIndex: GuideLinkIndex | undefined = options.linkIndex;
  if (!linkIndex && options.compileOptions) {
    linkIndex = buildGuideLinkIndex(options.compileOptions, docsRoot).index;
  }
  if (linkIndex) {
    for (const entry of linkIndex.values()) {
      knownSlugs.add(entry.slug);
    }
  }

  if (options.lintShards) {
    for (const name of config.compileOrder) {
      const cfg = getGuideConfig(config, name);
      const guideDir = resolveGuideDir(name, config, docsRoot);
      const compile = cfg?.compile;
      const scopeRoot = compile?.scopeRoot ? resolve(docsRoot, compile.scopeRoot) : undefined;

      let files: string[];
      try {
        files = sectionFiles(guideDir, {
          manifest: compile?.manifest,
          scopeRoot,
          sectionsHeading: compile?.sectionsHeading,
        });
      } catch {
        continue;
      }

      for (const shardFile of files) {
        const snapshot = options.shardCache?.get(resolve(shardFile));
        issues.push(
          ...lintShardLinks({ shardFile, guideDir, scopeRoot, snapshot, fileExtensions }).map(
            (i) => ({
              ...i,
              guideName: name,
            }),
          ),
        );
      }
    }
  }

  // Standalone guides are never compiled, so the compiled-output pass below
  // cannot reach them. They need the shard-style pass regardless of `lintShards`.
  if (options.scanRoot) {
    issues.push(...lintStandaloneGuideLinks(config, options.scanRoot, fileExtensions));
  }

  for (const r of results) {
    const outPath = resolve(resolveUnderOutputDir(absDocsRoot, outputDir, r.outputFile));
    const disallowedShardPaths = linkIndex
      ? disallowedShardPathsForPublisher(config, docsRoot, r.name, linkIndex)
      : undefined;
    issues.push(
      ...lintCompiledLinks({
        markdown: r.text,
        outputFile: outPath,
        guideName: r.name,
        knownOutputBasenames,
        knownSlugs,
        publishOnly: r.publishOnly,
        allowedPublishPaths,
        disallowedShardPaths,
        slugRegistryCache,
        fileExtensions,
      }),
    );
  }

  return issues;
}
