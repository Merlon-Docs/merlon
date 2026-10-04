import { resolve, basename } from 'node:path';
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
  /** Absolute path to the guide's compiled output file. */
  outputFile: string;
  slug: string;
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
  return resolveUnderOutputDir(cwd, config?.outputDir ?? '_build', rel);
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
      index.set(absPath, {
        guideName: owner,
        outputBasename: basename(outputFile),
        outputFile,
        slug,
        canonical:
          ownerPriority(absPath, owner, manifestOwners, guideDirs, options.compileOrder) >= 2,
      });
    }
  }

  return { index, shardCache, linkedFilesByGuide, slugsByGuide };
}
