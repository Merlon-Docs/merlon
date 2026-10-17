import { resolve, basename } from 'node:path';
import GithubSlugger from 'github-slugger';
import { createShardCache, guideSectionSlugs, type ShardCache } from './shard-cache.js';
import {
  sectionFiles,
  linkedSectionFiles,
  linkedSectionFilesCacheKey,
  type SectionFilesOptions,
} from './section-manifest.js';
import { resolveUnderOutputDir, defaultGuideOutputFile } from '../config/paths.js';
import type { CompileOptions } from './assemble.js';

export interface GuideLinkEntry {
  guideName: string;
  outputBasename: string;
  /**
   * Absolute path to the output that links from other outputs target: the owner's publish output
   * or default compiled guide, or the monolith when the owner is stitched into it.
   */
  outputFile: string;
  /**
   * Absolute path to the owner's own compiled guide. Set only when the owner is stitched into the
   * monolith and stitches this shard. Another monolith guide's compiled guide links here.
   */
  guideFile?: string;
  /**
   * The slug of the shard's section heading in the owner's own compiled guide. When the owner
   * doesn't stitch the shard, the slug it gets in the first guide in `compileOrder` that does.
   */
  slug: string;
  /**
   * The slug of the shard's section heading in the monolith, which numbers every heading of every
   * guide it stitches. The owner's copy comes first, then the first copy in `compileOrder`. Set
   * only when the owner is stitched into the monolith and some copy there stitches the shard.
   */
  monolithSlug?: string;
  /**
   * True when ownership comes from a manifest listing or a path under the owner's
   * guideDir. False for shards only pulled in via transitive `scopeRoot` links —
   * those may be co-compiled into multiple outputs and should prefer same-output
   * `#anchor` rewrite when present in the assembling guide's slug map.
   */
  canonical: boolean;
}

/** Absolute shard path → compiled output target. */
export type GuideLinkIndex = Map<string, GuideLinkEntry>;

export interface BuildGuideLinkIndexResult {
  index: GuideLinkIndex;
  shardCache: ShardCache;
  /** Memoized linkedSectionFiles per guide options key. */
  linkedFilesByGuide: Map<string, string[]>;
}

/** The index result plus the per-guide numbering that compile reuses. Internal to the package. */
export interface GuideLinkIndexWithSlugs extends BuildGuideLinkIndexResult {
  /**
   * Each guide's section slugs by guide name: absolute shard path → the slug of the heading that
   * opens the shard's section in that guide's output. One slugger numbers the guide's lead heading,
   * then every heading line in stitch order, so each slug matches the compiled anchor. A FIND-*
   * shard or a first-heading `{#id}` keeps its declared id.
   */
  slugsByGuide: Map<string, Map<string, string>>;
  /**
   * The same map for each guide stitched into the monolith, numbered as the monolith numbers it:
   * one slugger runs through the guides in `compileOrder`, so a guide continues the numbering of
   * the guides before it. Empty when the config has no top-level `outputFile`.
   */
  monolithSlugsByGuide: Map<string, Map<string, string>>;
}

function resolveGuideDir(
  name: string,
  guidesRoot: string,
  guidePath: string | undefined,
  cwd: string,
): string {
  if (guidePath) return resolve(cwd, guidePath);
  return resolve(guidesRoot, name);
}

function guideForShardPath(
  filePath: string,
  guideDirs: Map<string, string>,
  compileOrder: string[],
): string | undefined {
  for (const name of compileOrder) {
    const dir = guideDirs.get(name);
    if (!dir) continue;
    if (filePath === dir || filePath.startsWith(dir + '/')) return name;
  }
  return undefined;
}

function ownerPriority(
  filePath: string,
  guideName: string,
  manifestOwners: Map<string, string>,
  guideDirs: Map<string, string>,
  compileOrder: string[],
): number {
  if (manifestOwners.get(filePath) === guideName) return 3;
  if (guideForShardPath(filePath, guideDirs, compileOrder) === guideName) return 2;
  return 1;
}

function resolveShardOwner(
  filePath: string,
  compilingGuide: string,
  manifestOwners: Map<string, string>,
  guideDirs: Map<string, string>,
  compileOrder: string[],
): string {
  const manifestOwner = manifestOwners.get(filePath);
  if (manifestOwner) return manifestOwner;
  const pathOwner = guideForShardPath(filePath, guideDirs, compileOrder);
  if (pathOwner) return pathOwner;
  return compilingGuide;
}

function outputFileForGuide(
  guideName: string,
  compile: { outputFile?: string } | undefined,
  config: { outputFile?: string; outputDir?: string } | undefined,
  compileOrderLength: number,
  cwd: string,
): string {
  const rel =
    compile?.outputFile ??
    (config?.outputFile !== undefined
      ? config.outputFile
      : defaultGuideOutputFile(guideName, compileOrderLength));
  return resolve(resolveUnderOutputDir(cwd, config?.outputDir ?? '_build', rel));
}

function sectionOptionsForGuide(
  guideDir: string,
  compile:
    | { manifest?: string; scopeRoot?: string; sectionsHeading?: string; preambleSection?: string }
    | undefined,
  cwd: string,
  cache: ShardCache,
): SectionFilesOptions {
  return {
    manifest: compile?.manifest,
    scopeRoot: compile?.scopeRoot ? resolve(cwd, compile.scopeRoot) : undefined,
    sectionsHeading: compile?.sectionsHeading,
    cache,
    preambleSection: compile?.preambleSection,
  };
}

function getLinkedSectionFiles(
  guideDir: string,
  sectionOpts: SectionFilesOptions,
  memo: Map<string, string[]>,
): string[] {
  const key = linkedSectionFilesCacheKey(guideDir, sectionOpts);
  const cached = memo.get(key);
  if (cached) return cached;
  const files = linkedSectionFiles(guideDir, sectionOpts);
  memo.set(key, files);
  return files;
}

/**
 * The monolith slug of a shard's first copy in the monolith: the copy of the first guide in
 * `compileOrder` that stitches it. `monolithSlugsByGuide` holds the guides in that order.
 */
function firstMonolithCopySlug(
  monolithSlugsByGuide: Map<string, Map<string, string>>,
  absPath: string,
): string | undefined {
  for (const slugs of monolithSlugsByGuide.values()) {
    const slug = slugs.get(absPath);
    if (slug !== undefined) return slug;
  }
  return undefined;
}

/** Build a cross-guide link index from every guide in compileOrder. */
export function buildGuideLinkIndex(
  options: CompileOptions,
  cwd: string = options.docsRoot ?? process.cwd(),
  existingCache?: ShardCache,
): BuildGuideLinkIndexResult {
  const { index, shardCache, linkedFilesByGuide } = buildGuideLinkIndexWithSlugs(
    options,
    cwd,
    existingCache,
  );
  return { index, shardCache, linkedFilesByGuide };
}

/**
 * `buildGuideLinkIndex`, plus each guide's section slugs so compile doesn't number the guides
 * again. The package index doesn't export it.
 */
export function buildGuideLinkIndexWithSlugs(
  options: CompileOptions,
  cwd: string = options.docsRoot ?? process.cwd(),
  existingCache?: ShardCache,
): GuideLinkIndexWithSlugs {
  const guideConfigMap = new Map((options.guides ?? []).map((g) => [g.name, g]));
  const index: GuideLinkIndex = new Map();
  const manifestOwners = new Map<string, string>();
  const guideDirs = new Map<string, string>();
  const shardCache = existingCache ?? createShardCache();
  const linkedFilesByGuide = new Map<string, string[]>();

  for (const name of options.compileOrder) {
    const cfg = guideConfigMap.get(name);
    const compile = cfg?.compile;
    const guideDir = resolveGuideDir(name, options.guidesRoot, cfg?.path, cwd);
    guideDirs.set(name, guideDir);
    const manifestFiles = sectionFiles(guideDir, {
      manifest: compile?.manifest,
      scopeRoot: compile?.scopeRoot ? resolve(cwd, compile.scopeRoot) : undefined,
      sectionsHeading: compile?.sectionsHeading,
    });
    for (const f of manifestFiles) {
      manifestOwners.set(f, name);
    }
  }

  // Number every guide's sections first, so an entry can take its slug from the owner's guide.
  const filesByGuide = new Map<string, string[]>();
  const slugsByGuide = new Map<string, Map<string, string>>();
  for (const name of options.compileOrder) {
    const compile = guideConfigMap.get(name)?.compile;
    const guideDir = guideDirs.get(name)!;
    const sectionOpts = sectionOptionsForGuide(guideDir, compile, cwd, shardCache);
    const files = getLinkedSectionFiles(guideDir, sectionOpts, linkedFilesByGuide);
    filesByGuide.set(name, files);
    slugsByGuide.set(name, guideSectionSlugs(guideDir, files, shardCache, compile));
  }

  // The monolith stitches every guide without compile.outputFile, so one slugger numbers them all.
  const monolithSlugsByGuide = new Map<string, Map<string, string>>();
  if (options.config?.outputFile !== undefined) {
    const slugger = new GithubSlugger();
    for (const name of options.compileOrder) {
      const compile = guideConfigMap.get(name)?.compile;
      if (compile?.outputFile) continue;
      monolithSlugsByGuide.set(
        name,
        guideSectionSlugs(
          guideDirs.get(name)!,
          filesByGuide.get(name)!,
          shardCache,
          compile,
          slugger,
        ),
      );
    }
  }

  for (const name of options.compileOrder) {
    const files = filesByGuide.get(name)!;
    const slugByPath = slugsByGuide.get(name)!;

    for (const filePath of files) {
      // Index every path from linkedSectionFiles (manifest + transitive inline .md
      // links under guideDir / scopeRoot), including shards outside guideDir.
      const absPath = resolve(filePath);
      const ownSlug = slugByPath.get(absPath);
      if (!ownSlug) continue;

      const owner = resolveShardOwner(
        absPath,
        name,
        manifestOwners,
        guideDirs,
        options.compileOrder,
      );
      // The slug the shard gets in its owner's output, when the owner stitches it.
      const slug = slugsByGuide.get(owner)?.get(absPath) ?? ownSlug;
      const existing = index.get(absPath);
      if (
        existing &&
        ownerPriority(
          absPath,
          existing.guideName,
          manifestOwners,
          guideDirs,
          options.compileOrder,
        ) >= ownerPriority(absPath, owner, manifestOwners, guideDirs, options.compileOrder)
      ) {
        continue;
      }

      const ownerCfg = guideConfigMap.get(owner);
      const ownerCompile = ownerCfg?.compile;
      const outputFile = outputFileForGuide(
        owner,
        ownerCompile,
        options.config,
        options.compileOrder.length,
        cwd,
      );
      const entry: GuideLinkEntry = {
        guideName: owner,
        outputBasename: basename(outputFile),
        outputFile,
        slug,
        canonical:
          ownerPriority(absPath, owner, manifestOwners, guideDirs, options.compileOrder) >= 2,
      };
      if (monolithSlugsByGuide.has(owner)) {
        // The owner is in the monolith. Its own compiled guide holds the section only when the
        // owner stitches the shard, and the monolith numbers the copy it stitches.
        if (slugsByGuide.get(owner)?.has(absPath)) {
          entry.guideFile = resolve(
            resolveUnderOutputDir(
              cwd,
              options.config?.outputDir ?? '_build',
              defaultGuideOutputFile(owner, options.compileOrder.length),
            ),
          );
        }
        const monolithSlug =
          monolithSlugsByGuide.get(owner)?.get(absPath) ??
          firstMonolithCopySlug(monolithSlugsByGuide, absPath);
        if (monolithSlug !== undefined) entry.monolithSlug = monolithSlug;
      }
      index.set(absPath, entry);
    }
  }

  return { index, shardCache, linkedFilesByGuide, slugsByGuide, monolithSlugsByGuide };
}
