import { dirname, resolve } from 'node:path';
import type { CompileGuideResult, CompileOptions } from '../compile/assemble.js';
import { compileGuidesFromResults, monolithGuideFirstLines } from '../compile/assemble.js';
import { getLocalePack } from '../locale/index.js';
import type { MdcpConfig } from '../config/schema.js';
import { getGuideConfig, resolveGuideDir, resolveUnderOutputDir } from '../config/load.js';
import { sectionFiles } from '../compile/section-manifest.js';
import { buildGuideLinkIndex, type GuideLinkIndex } from '../compile/guide-link-index.js';
import { buildSlugRegistry } from '../refs/slugs.js';
import type { RefsRegistry } from '../refs/slugs.js';
import type { ShardCache } from '../compile/shard-cache.js';
import { lintBrokenLinkMarkers, lintCompiledLinks } from './validate-compiled.js';
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
  compileOptions?: CompileOptions;
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
 * Link-lint the files registered under `standaloneGuides`. Registration gives a
 * file no compile output, so the compiled-output pass checks it only when a
 * guide stitches it as a shard. Each file is its own guide directory: there is
 * no manifest or scope root to resolve against.
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

  const knownSlugs = new Set<string>();
  const absDocsRoot = resolve(docsRoot);
  const configuredMonolith =
    config.outputFile !== undefined
      ? resolve(resolveUnderOutputDir(absDocsRoot, outputDir, config.outputFile))
      : undefined;
  // The monolith is written only when at least one guide is stitched into it.
  const monolithPath = results.some((r) => !r.publishOnly) ? configuredMonolith : undefined;

  // Every output this run writes, keyed like `slugRegistryCache`. A link is
  // matched to an output by resolved path: a shared file name is not a match.
  // This covers the publish outputs too, so `allowedPublishPaths` stays unset.
  const knownOutputPaths = new Set(
    results.map((r) => resolve(resolveUnderOutputDir(absDocsRoot, outputDir, r.outputFile))),
  );
  if (monolithPath !== undefined) knownOutputPaths.add(monolithPath);

  // A configured monolith that no guide is stitched into is never written. A
  // link to it fails even when an earlier run left the file on disk. A guide
  // whose own output is that path still counts, because outputs match first.
  const unwrittenOutputPaths = new Set<string>();
  if (configuredMonolith !== undefined && monolithPath === undefined) {
    unwrittenOutputPaths.add(configuredMonolith);
  }

  const slugRegistryCache = new Map<string, RefsRegistry>();
  for (const r of results) {
    const outPath = resolve(resolveUnderOutputDir(absDocsRoot, outputDir, r.outputFile));
    slugRegistryCache.set(outPath, buildSlugRegistry(r.text));
  }
  let monolithText: string | undefined;
  if (monolithPath !== undefined && options.compileOptions) {
    monolithText = compileGuidesFromResults(results, options.compileOptions);
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

  // A standalone guide has no compile output, so the compiled-output pass below
  // reaches it only when a guide stitches it. Lint every registered file with
  // the shard-style pass regardless of `lintShards`.
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
        knownOutputPaths,
        unwrittenOutputPaths,
        knownSlugs,
        publishOnly: r.publishOnly,
        disallowedShardPaths,
        slugRegistryCache,
        fileExtensions,
      }),
    );
  }

  if (monolithPath !== undefined && monolithText !== undefined && options.compileOptions) {
    issues.push(
      ...lintMonolithOnlyMarkers(results, monolithText, monolithPath, options.compileOptions),
    );
  }

  return issues;
}

/**
 * Compile marks each guide's copy in the monolith against the whole monolith, so the monolith can
 * hold a marker that no compiled guide holds. Each marker in a copy is matched, one for one, to a
 * marker of the same text in that guide's compiled guide. A monolith line is reported when a
 * marker on it has no match. The rest of the line doesn't count, because each file rebases paths
 * and cross-guide links relative to itself.
 */
function lintMonolithOnlyMarkers(
  results: CompileGuideResult[],
  monolithText: string,
  monolithPath: string,
  compileOptions: CompileOptions,
): LinkIssue[] {
  const locale = getLocalePack();
  const markersOf = (line: string): string[] => {
    const found = locale.brokenLinks.findMarkers?.(line) ?? [];
    return found.length > 0 ? found : [line.trim()];
  };
  const byName = new Map(results.map((r) => [r.name, r]));
  // Each copy's unmatched markers from its compiled guide, keyed by marker text, with counts.
  const copies = monolithGuideFirstLines(results, compileOptions).map(({ name, firstLine }) => {
    const unmatched = new Map<string, number>();
    for (const issue of lintBrokenLinkMarkers(byName.get(name)?.text ?? '', monolithPath)) {
      for (const marker of markersOf(issue.brokenTarget)) {
        unmatched.set(marker, (unmatched.get(marker) ?? 0) + 1);
      }
    }
    return { firstLine, unmatched };
  });

  const issues: LinkIssue[] = [];
  let copyIndex = -1;
  for (const issue of lintBrokenLinkMarkers(monolithText, monolithPath)) {
    while (copyIndex + 1 < copies.length && copies[copyIndex + 1].firstLine <= issue.line) {
      copyIndex++;
    }
    const unmatched = copies[copyIndex]?.unmatched;
    let reported = false;
    for (const marker of markersOf(issue.brokenTarget)) {
      const left = unmatched?.get(marker) ?? 0;
      if (left > 0) unmatched?.set(marker, left - 1);
      else reported = true;
    }
    if (reported) issues.push(issue);
  }
  return issues;
}
