import { readFileSync, existsSync } from 'node:fs';
import { join, resolve, basename, dirname, relative } from 'node:path';
import { demoteHeadings, stripAboutThisGuideHeading, extractGuideH1 } from './headings.js';
import { stripExplicitAnchorMarkers } from './anchors.js';
import { extractFirstHeading, stripFirstHeadingLine, formatCompileTitle } from './compile-title.js';
import { applyCompileHooks, createCompileHookState } from './hooks.js';
import './hooks/builtin.js';
import {
  buildSectionSlugMap,
  rewriteCrossGuideFileLinks,
  rewriteIntraGuideFileLinks,
  rewritePublishRelativeLinks,
} from './publish-links.js';
import { buildGuideLinkIndex, type GuideLinkIndex } from './guide-link-index.js';
import {
  linkedSectionFiles,
  linkedSectionFilesCacheKey,
  type SectionFilesOptions,
} from './section-manifest.js';
import { loadShardSnapshot, type ShardCache } from './shard-cache.js';
import type { GuideConfig, GuideConfigInput, MdcpConfigInput } from '../config/schema.js';
import {
  resolveGuideLinkBase,
  resolveUnderOutputDir,
  effectiveGuideOutputFile,
} from '../config/load.js';
import { resolveCompileHooks } from '../config/resolve-compile-hooks.js';
import { writeOutputFile, type WriteOutputBackupOptions } from './write-output.js';
import { markBrokenLinks } from '../links/mark-broken.js';
import type { LinkProvenance } from '../links/mark-broken.js';

export { sectionFiles, linkedSectionFiles, type SectionFilesOptions } from './section-manifest.js';
export {
  buildGuideLinkIndex,
  type GuideLinkIndex,
  type GuideLinkEntry,
  type BuildGuideLinkIndexResult,
} from './guide-link-index.js';
export { type ShardCache, type ShardSnapshot, createShardCache } from './shard-cache.js';

export function processSection(
  guideName: string,
  filename: string,
  content: string,
  preambleSection = 'about-this-guide.md',
): string {
  if (filename === preambleSection) {
    const body = stripAboutThisGuideHeading(content);
    return body.trim() ? demoteHeadings(body, 1) : body;
  }

  return demoteHeadings(content, 1);
}

export interface AssembleGuideOptions {
  manifest?: string;
  scopeRoot?: string;
  sectionsHeading?: string;
  preambleSection?: string;
  title?: string;
  hooks?: string[];
  stripAnchors?: boolean;
  outputBasename?: string;
  /** Absolute path to the rendered document (per-guide output or monolith). */
  outputFile?: string;
  /** When set, rewrite shard-relative file links for this publish output path. */
  publishOutputFile?: string;
  config?: MdcpConfigInput;
  linkIndex?: GuideLinkIndex;
  /** Guide names whose cross-guide shard links keep source `.md` paths. */
  ignoreGuides?: string[];
  markBroken?: boolean;
  guideName?: string;
  /** @deprecated Ignored. Only `#fragment` targets are marked, and they never named an output. */
  knownOutputBasenames?: Set<string>;
  knownSlugs?: Set<string>;
  shardCache?: ShardCache;
  slugByPath?: Map<string, string>;
  linkedFiles?: string[];
  sourceTags?: boolean;
}

export function assembleGuide(guideDir: string, options: AssembleGuideOptions = {}): string {
  const guideName = basename(guideDir);
  const manifestName = options.manifest ?? 'index.md';
  const indexPath = join(guideDir, manifestName);
  const indexText = readFileSync(indexPath, 'utf-8');
  const parts: string[] = [];

  const useTitle = options.title;
  const preambleSection = options.preambleSection ?? 'about-this-guide.md';
  const cache = options.shardCache;
  const sectionOpts: SectionFilesOptions = {
    manifest: manifestName,
    scopeRoot: options.scopeRoot,
    sectionsHeading: options.sectionsHeading,
    cache,
    preambleSection,
  };
  const files = options.linkedFiles ?? linkedSectionFiles(guideDir, sectionOpts);

  if (useTitle) {
    parts.push(`${formatCompileTitle(useTitle)}\n\n`);
  } else {
    const h1 = extractGuideH1(indexText);
    if (h1) parts.push(h1);
  }

  const hookState = createCompileHookState();
  const provenance: LinkProvenance[] = [];
  const slugByPath = options.slugByPath ?? buildSectionSlugMap(files, cache, preambleSection);

  for (let i = 0; i < files.length; i++) {
    const filePath = files[i];
    const name = basename(filePath);
    if (!existsSync(filePath)) {
      throw new Error(`Missing section file: ${filePath}`);
    }
    const snapshot = cache ? loadShardSnapshot(filePath, cache, preambleSection) : undefined;
    if (snapshot) {
      provenance.push(...snapshot.provenance);
    }
    let raw = (snapshot?.raw ?? readFileSync(filePath, 'utf-8')).trim();

    if (i === 0 && useTitle) {
      const firstHeading = extractFirstHeading(raw);
      if (firstHeading.text === useTitle) {
        raw = stripFirstHeadingLine(raw);
      }
    }

    let body = processSection(guideName, name, raw, preambleSection).trimEnd();

    body = applyCompileHooks(
      body,
      {
        guideName,
        filename: name,
        config: options.config ?? ({} as MdcpConfigInput),
        outputBasename: options.outputBasename,
        outputFile: options.outputFile,
        scopeRoot: options.scopeRoot,
        sourceFile: filePath,
        hookState,
        linkIndex: options.linkIndex,
      },
      options.hooks,
    );

    if (options.linkIndex) {
      body = rewriteCrossGuideFileLinks(body, {
        sourceFile: filePath,
        guideDir,
        scopeRoot: options.scopeRoot,
        currentGuideName: options.guideName ?? guideName,
        currentOutputBasename: options.outputBasename,
        currentOutputFile: options.outputFile,
        linkIndex: options.linkIndex,
        slugByPath,
        ignoreGuides: options.ignoreGuides,
      });
    }

    body = rewriteIntraGuideFileLinks(body, slugByPath, guideDir, { sourceFile: filePath });

    if (options.publishOutputFile) {
      body = rewritePublishRelativeLinks(body, {
        sourceFile: filePath,
        guideDir,
        scopeRoot: options.scopeRoot,
        currentGuideName: options.guideName ?? guideName,
        currentOutputFile: options.publishOutputFile,
        linkIndex: options.linkIndex,
      });
    }

    if (options.sourceTags !== false && options.outputFile) {
      const relPath = relative(dirname(options.outputFile), filePath);
      body = `<!-- mdcp-shard: start ${relPath} -->\n\n${body}\n\n<!-- mdcp-shard: end ${relPath} -->`;
    }

    parts.push(body + '\n\n');
  }

  let compiled =
    parts
      .join('')
      .replace(/\n{3,}/g, '\n\n')
      .trim() + '\n';

  if (options.stripAnchors !== false) {
    compiled = stripExplicitAnchorMarkers(compiled);
  }

  compiled = rewriteIntraGuideFileLinks(compiled, slugByPath, guideDir);

  const intraSlugs = new Set(slugByPath.values());
  const assemblingGuide = options.guideName ?? guideName;
  if (options.linkIndex && assemblingGuide) {
    for (const entry of options.linkIndex.values()) {
      if (entry.guideName === assemblingGuide) {
        intraSlugs.add(entry.slug);
      }
    }
  }
  const marked = markBrokenLinks(compiled, {
    outputFile: options.outputFile,
    provenance,
    enabled: options.markBroken !== false,
    guideName: options.guideName ?? guideName,
    compiledOutputPath: options.outputFile,
    knownSlugs: intraSlugs,
  });
  compiled = marked.markdown;

  return compiled;
}

export interface CompileGuideResult {
  name: string;
  text: string;
  outputFile: string;
  /** True when `compile.outputFile` was set explicitly (excluded from optional monolith). */
  publishOnly: boolean;
  includeBanner: boolean;
}

export interface CompileOptions {
  guidesRoot: string;
  compileOrder: string[];
  banner?: string;
  guides?: GuideConfigInput[];
  docsRoot?: string;
  config?: MdcpConfigInput;
  backup?: WriteOutputBackupOptions;
}

/** Alias for partial compile options in tests and callers that omit Zod defaults. */
export type CompileOptionsInput = CompileOptions;

function resolveGuideDir(
  name: string,
  guidesRoot: string,
  guideCfg: GuideConfig | undefined,
  cwd: string,
): string {
  if (guideCfg?.path) return resolve(cwd, guideCfg.path);
  return join(guidesRoot, name);
}

export interface CompileGuideResultsContext {
  results: CompileGuideResult[];
  linkIndex: GuideLinkIndex;
  shardCache: ShardCache;
  linkedFilesByGuide: Map<string, string[]>;
}

export function compileGuideResultsWithContext(
  options: CompileOptions,
): CompileGuideResultsContext {
  const guideConfigMap = new Map((options.guides ?? []).map((g) => [g.name, g]));
  const docsRoot = resolve(options.docsRoot ?? process.cwd());
  const orderLen = options.compileOrder.length;
  const {
    index: linkIndex,
    shardCache,
    linkedFilesByGuide,
  } = buildGuideLinkIndex(options, docsRoot);
  const results = options.compileOrder.map((name) => {
    const cfg = guideConfigMap.get(name) as GuideConfig | undefined;
    const guideDir = resolveGuideDir(name, options.guidesRoot, cfg, docsRoot);
    const compile = cfg?.compile;
    const outputFile = effectiveGuideOutputFile(name, compile, orderLen);
    const publishOnly = Boolean(compile?.outputFile);
    const outputBasename = basename(outputFile);
    const preambleSection = compile?.preambleSection ?? 'about-this-guide.md';
    const sectionOpts: SectionFilesOptions = {
      manifest: compile?.manifest,
      scopeRoot: compile?.scopeRoot ? resolve(docsRoot, compile.scopeRoot) : undefined,
      sectionsHeading: compile?.sectionsHeading,
      cache: shardCache,
      preambleSection,
    };
    const linkedKey = linkedSectionFilesCacheKey(guideDir, sectionOpts);
    const linkedFiles = linkedFilesByGuide.get(linkedKey)!;
    const slugByPath = buildSectionSlugMap(linkedFiles, shardCache, preambleSection);

    const linkBase = resolve(
      resolveGuideLinkBase(options.config ?? {}, docsRoot, name, orderLen, compile),
    );

    const text = assembleGuide(guideDir, {
      manifest: compile?.manifest,
      scopeRoot: compile?.scopeRoot ? resolve(docsRoot, compile.scopeRoot) : undefined,
      sectionsHeading: compile?.sectionsHeading,
      preambleSection,
      title: compile?.title,
      hooks: resolveCompileHooks(compile),
      stripAnchors: compile?.stripAnchors,
      outputBasename,
      outputFile: linkBase,
      publishOutputFile: linkBase,
      config: options.config,
      linkIndex,
      ignoreGuides: compile?.crossGuideLinks?.ignoreGuides,
      markBroken: compile?.links?.markBroken,
      guideName: name,
      shardCache,
      slugByPath,
      linkedFiles,
      sourceTags: compile?.sourceTags ?? options.config?.sourceTags ?? true,
    });

    const includeBanner = compile?.includeBanner ?? true;

    return {
      name,
      text,
      outputFile,
      publishOnly,
      includeBanner,
    };
  });

  return { results, linkIndex, shardCache, linkedFilesByGuide };
}

export function compileGuideResults(options: CompileOptions): CompileGuideResult[] {
  return compileGuideResultsWithContext(options).results;
}

function monolithResults(results: CompileGuideResult[]): CompileGuideResult[] {
  return results.filter((r) => !r.publishOnly);
}

function buildMonolithBody(results: CompileGuideResult[]): string {
  const monolith = monolithResults(results);
  if (monolith.length === 0) return '';

  const parts: string[] = [];
  for (let i = 0; i < monolith.length; i++) {
    const text = i === 0 ? monolith[i].text : demoteHeadings(monolith[i].text, 1);
    parts.push(text, '\n');
  }
  return parts.join('');
}

function applyMonolithBanner(options: CompileOptions, results: CompileGuideResult[]): string {
  const body = buildMonolithBody(results);
  if (!body) return '';
  if (options.banner) {
    return options.banner + body;
  }
  return body;
}

export function compileGuidesFromResults(
  results: CompileGuideResult[],
  options: CompileOptions,
): string {
  if (options.config?.outputFile !== undefined) {
    return applyMonolithBanner(options, results);
  }
  return results.map((r) => r.text).join('\n');
}

export function compileGuides(options: CompileOptions): string {
  return compileGuidesFromResults(compileGuideResults(options), options);
}

export function writeCompiledGuidesFromResults(
  results: CompileGuideResult[],
  options: CompileOptions,
  monolithOutputPath?: string,
): { path: string; lines: number; backupPath?: string }[] {
  const docsRoot = options.docsRoot ?? process.cwd();
  const outputDir = options.config?.outputDir ?? '_build';
  const writeCtx = { docsRoot, outputDir, backup: options.backup };
  const written: { path: string; lines: number; backupPath?: string }[] = [];

  for (const r of results) {
    const outPath = resolveUnderOutputDir(docsRoot, outputDir, r.outputFile);
    let text = r.text;
    if (options.banner && r.includeBanner) text = options.banner + text;
    const { backupPath } = writeOutputFile(outPath, text, writeCtx);
    written.push({ path: outPath, lines: text.split('\n').length, backupPath });
  }

  const monolith = monolithResults(results);
  if (monolithOutputPath && monolith.length > 0) {
    const combined = applyMonolithBanner(options, results);
    const { backupPath } = writeOutputFile(monolithOutputPath, combined, writeCtx);
    written.push({
      path: monolithOutputPath,
      lines: combined.split('\n').length,
      backupPath,
    });
  }

  return written;
}

export function writeCompiledGuides(
  options: CompileOptions,
  monolithOutputPath?: string,
): { path: string; lines: number; backupPath?: string }[] {
  return writeCompiledGuidesFromResults(compileGuideResults(options), options, monolithOutputPath);
}
