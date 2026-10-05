import { readFileSync, existsSync } from 'node:fs';
import { join, resolve, basename, dirname, relative } from 'node:path';
import { demoteHeadings, stripAboutThisGuideHeading, guideLeadHeading } from './headings.js';
import { keepsAnchorMarkers, stripExplicitAnchorMarkers } from './anchors.js';
import { extractFirstHeading, stripFirstHeadingLine } from './compile-title.js';
import { applyCompileHooks, createCompileHookState } from './hooks.js';
import './hooks/builtin.js';
import {
  buildSectionSlugMap,
  rewriteCrossGuideFileLinksMarked,
  rewriteIntraGuideFileLinks,
  rewritePublishRelativeLinks,
  unmarkLinkTargets,
} from './publish-links.js';
import { buildGuideLinkIndexWithSlugs, type GuideLinkIndex } from './guide-link-index.js';
import {
  linkedSectionFiles,
  linkedSectionFilesCacheKey,
  type SectionFilesOptions,
} from './section-manifest.js';
import { guideSectionSlugs, loadShardSnapshot, type ShardCache } from './shard-cache.js';
import type { GuideConfig, GuideConfigInput, MdcpConfigInput } from '../config/schema.js';
import { resolveUnderOutputDir, effectiveGuideOutputFile } from '../config/load.js';
import { resolveCompileHooks } from '../config/resolve-compile-hooks.js';
import { writeOutputFile, type WriteOutputBackupOptions } from './write-output.js';
import { realignTables } from './align-tables.js';
import { markBrokenLinks } from '../links/mark-broken.js';
import { getLocalePack } from '../locale/index.js';
import { buildSlugRegistry } from '../refs/slugs.js';
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
  /**
   * Absolute path to the monolith, set only when this guide is stitched into it. Assembly for the
   * guide's own compiled guide then links other monolith guides through their compiled guides.
   */
  monolithFile?: string;
  config?: MdcpConfigInput;
  linkIndex?: GuideLinkIndex;
  /** Guide names whose cross-guide shard links keep source `.md` paths. */
  ignoreGuides?: string[];
  markBroken?: boolean;
  guideName?: string;
  /** @deprecated Ignored. Only `#fragment` targets are marked, and they never named an output. */
  knownOutputBasenames?: Set<string>;
  /**
   * @deprecated Ignored. Broken-link marking accepts the headings and section slugs of the document
   * being assembled, which assembly works out itself.
   */
  knownSlugs?: Set<string>;
  shardCache?: ShardCache;
  slugByPath?: Map<string, string>;
  linkedFiles?: string[];
  sourceTags?: boolean;
}

/** The options compile assembles a guide with: the public ones, plus what compile knows of the run. */
interface CompileAssembleOptions extends AssembleGuideOptions {
  /**
   * Absolute paths of the files the run writes. The publish-relative pass resolves a link to one
   * of them before the file is on disk.
   */
  runOutputFiles?: ReadonlySet<string>;
  /**
   * Absolute paths of configured outputs the run never writes: the monolith when no guide is
   * stitched into it. The publish-relative pass treats a link to one as missing, even when an
   * earlier run left the file on disk.
   */
  unwrittenOutputFiles?: ReadonlySet<string>;
}

/** A guide assembled up to broken-link marking. */
interface AssembledGuide {
  markdown: string;
  provenance: LinkProvenance[];
  /**
   * The slug of each section `markdown` stitches, such as a FIND-* id or a declared `{#id}`. A
   * `#fragment` may name one of these besides the headings of `markdown`.
   */
  sectionSlugs: Set<string>;
}

/**
 * Mark broken links in an assembled guide, then re-align the tables whose links changed width.
 * `documentSlugs` adds the slugs of the whole document the guide is stitched into: in the
 * monolith, every heading and the section slugs of every copy.
 */
function markAssembledGuide(
  guide: AssembledGuide,
  guideName: string,
  options: AssembleGuideOptions,
  documentSlugs?: Iterable<string>,
): string {
  const knownSlugs = new Set(guide.sectionSlugs);
  for (const slug of documentSlugs ?? []) knownSlugs.add(slug);
  // Table re-alignment finds the markers by the wording of the locale that wrote them.
  const locale = getLocalePack();
  const marked = markBrokenLinks(guide.markdown, {
    outputFile: options.outputFile,
    provenance: guide.provenance,
    enabled: options.markBroken !== false,
    guideName,
    compiledOutputPath: options.outputFile,
    knownSlugs,
    locale,
  }).markdown;
  // The last compile step: every link rewrite and broken-link marker is in place.
  return realignTables(marked, { locale });
}

export function assembleGuide(guideDir: string, options: AssembleGuideOptions = {}): string {
  return markAssembledGuide(
    assembleGuideUnmarked(guideDir, options),
    options.guideName ?? basename(guideDir),
    options,
  );
}

function assembleGuideUnmarked(guideDir: string, options: CompileAssembleOptions): AssembledGuide {
  // The configured name: hooks look the guide's config up by it, and `path` can end in a
  // directory with another name.
  const guideName = options.guideName ?? basename(guideDir);
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

  const lead = guideLeadHeading(indexText, useTitle);
  if (lead) parts.push(`${lead}\n\n`);

  const hookState = createCompileHookState();
  const provenance: LinkProvenance[] = [];
  const slugByPath =
    options.slugByPath ??
    buildSectionSlugMap(files, cache, preambleSection, {
      heading: lead,
      title: useTitle,
      keepAnchorMarkers: keepsAnchorMarkers(options.stripAnchors, options.hooks),
    });

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

    // The cross-guide and publish-relative passes mark each target they write, and no later pass
    // reads a marked target, since its path is relative to the link base rather than the shard.
    if (options.linkIndex) {
      body = rewriteCrossGuideFileLinksMarked(body, {
        sourceFile: filePath,
        guideDir,
        scopeRoot: options.scopeRoot,
        currentGuideName: guideName,
        currentOutputBasename: options.outputBasename,
        currentOutputFile: options.outputFile,
        monolithFile: options.monolithFile,
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
        currentGuideName: guideName,
        currentOutputFile: options.publishOutputFile,
        linkIndex: options.linkIndex,
        markWritten: true,
        runOutputFiles: options.runOutputFiles,
        unwrittenOutputFiles: options.unwrittenOutputFiles,
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

  compiled = unmarkLinkTargets(rewriteIntraGuideFileLinks(compiled, slugByPath, guideDir));

  // Only the slugs of sections this assembly stitches. A copy in the monolith also takes the
  // section slugs of the other copies when it is marked. A shard that no copy stitches has no
  // section, so a link to its slug is marked, unless a heading has that slug too.
  return { markdown: compiled, provenance, sectionSlugs: new Set(slugByPath.values()) };
}

export interface CompileGuideResult {
  name: string;
  /**
   * The guide's own compiled guide, as written to `outputFile`: links and source tags are
   * relative to that file, and section slugs number this guide's headings only.
   */
  text: string;
  /**
   * The guide as the monolith holds it, before the monolith demotes it: links and source tags are
   * relative to the monolith, and section slugs continue the numbering of the guides before it.
   * Set only for a guide stitched into the monolith. `compileGuidesFromResults` stitches these.
   */
  monolithText?: string;
  /**
   * Slugs a `#fragment` in `text` may name besides its headings, as broken-link marking took them:
   * the slug of each section `text` stitches, such as a FIND-* finding id or a declared `{#id}`. A
   * shard this guide owns but doesn't stitch has no section, so its slug isn't one of them. Link
   * lint checks a fragment in `text` against the headings plus these. A fragment on a link from
   * another output has to match a heading. When absent, a fragment in `text` has to match one too.
   */
  knownSlugs?: string[];
  /**
   * The same as `knownSlugs`, for `monolithText`: the slug of each section of the whole monolith,
   * as the monolith numbers them. Every copy there takes this one set, since a link in one copy may
   * name a section that another copy stitches. Set only when `monolithText` is.
   */
  monolithKnownSlugs?: string[];
  outputFile: string;
  /** True when `compile.outputFile` was set explicitly (excluded from optional monolith). */
  publishOnly: boolean;
  includeBanner: boolean;
}

export interface CompileOptions {
  guidesRoot: string;
  compileOrder: string[];
  /** Text written before each output that takes a banner. Compile adds a newline when it lacks one. */
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
  const outputDir = options.config?.outputDir ?? '_build';
  const monolithFile =
    options.config?.outputFile !== undefined
      ? resolve(resolveUnderOutputDir(docsRoot, outputDir, options.config.outputFile))
      : undefined;
  const {
    index: linkIndex,
    shardCache,
    linkedFilesByGuide,
    slugsByGuide,
    monolithSlugsByGuide,
  } = buildGuideLinkIndexWithSlugs(options, docsRoot);
  // Every file the run writes: each guide's compiled guide, and the monolith when a guide is
  // stitched into it. A shard's link to one rebases the same whether or not it is on disk yet.
  const runOutputFiles = new Set(
    options.compileOrder.map((name) =>
      resolve(
        resolveUnderOutputDir(
          docsRoot,
          outputDir,
          effectiveGuideOutputFile(
            name,
            (guideConfigMap.get(name) as GuideConfig | undefined)?.compile,
            orderLen,
          ),
        ),
      ),
    ),
  );
  if (monolithFile !== undefined && monolithSlugsByGuide.size > 0) {
    runOutputFiles.add(monolithFile);
  }
  // A configured monolith that no guide is stitched into is never written, so a file an earlier
  // run left there is stale. A guide whose own output is that path still counts, as in link lint.
  const unwrittenOutputFiles = new Set<string>();
  if (monolithFile !== undefined && !runOutputFiles.has(monolithFile)) {
    unwrittenOutputFiles.add(monolithFile);
  }
  // Each guide's copy in the monolith, assembled but not yet marked for broken links.
  const monolithCopies = new Map<
    string,
    { guide: AssembledGuide; options: AssembleGuideOptions }
  >();
  const results: CompileGuideResult[] = options.compileOrder.map((name) => {
    const cfg = guideConfigMap.get(name) as GuideConfig | undefined;
    const guideDir = resolveGuideDir(name, options.guidesRoot, cfg, docsRoot);
    const compile = cfg?.compile;
    const outputFile = effectiveGuideOutputFile(name, compile, orderLen);
    const publishOnly = Boolean(compile?.outputFile);
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
    const slugByPath =
      slugsByGuide.get(name) ?? guideSectionSlugs(guideDir, linkedFiles, shardCache, compile);
    const monolithSlugs = monolithSlugsByGuide.get(name);
    const inMonolith = monolithFile !== undefined && monolithSlugs !== undefined;

    // Each document a guide is written to gets its own assembly, since links, source tags and
    // section slugs depend on where that document sits. The guide's own compiled guide comes
    // first. A guide in the monolith is then assembled again for the monolith.
    const assembleOptions = (
      documentFile: string,
      sectionSlugs: Map<string, string>,
    ): CompileAssembleOptions => ({
      manifest: compile?.manifest,
      scopeRoot: compile?.scopeRoot ? resolve(docsRoot, compile.scopeRoot) : undefined,
      sectionsHeading: compile?.sectionsHeading,
      preambleSection,
      title: compile?.title,
      hooks: resolveCompileHooks(compile),
      stripAnchors: compile?.stripAnchors,
      outputBasename: basename(documentFile),
      outputFile: documentFile,
      publishOutputFile: documentFile,
      monolithFile: inMonolith ? monolithFile : undefined,
      config: options.config,
      linkIndex,
      ignoreGuides: compile?.crossGuideLinks?.ignoreGuides,
      markBroken: compile?.links?.markBroken,
      guideName: name,
      shardCache,
      slugByPath: sectionSlugs,
      linkedFiles,
      sourceTags: compile?.sourceTags ?? options.config?.sourceTags ?? true,
      runOutputFiles,
      unwrittenOutputFiles,
    });

    const guideFile = resolve(resolveUnderOutputDir(docsRoot, outputDir, outputFile));
    const guideOptions = assembleOptions(guideFile, slugByPath);
    const guide = assembleGuideUnmarked(guideDir, guideOptions);
    const text = markAssembledGuide(guide, name, guideOptions);
    if (inMonolith) {
      const copyOptions = assembleOptions(monolithFile, monolithSlugs);
      monolithCopies.set(name, {
        guide: assembleGuideUnmarked(guideDir, copyOptions),
        options: copyOptions,
      });
    }

    const includeBanner = compile?.includeBanner ?? true;
    const knownSlugs = [...guide.sectionSlugs];

    return { name, text, knownSlugs, outputFile, publishOnly, includeBanner };
  });

  if (monolithCopies.size > 0) {
    // A `#fragment` in the monolith may name a heading of any guide the monolith stitches, or the
    // section slug any copy there gives a shard. So the copies are marked against the whole
    // monolith once they are all stitched, and each takes the same set whatever guide owns a shard.
    const monolithSectionSlugs = new Set<string>();
    for (const r of results) {
      const copy = monolithCopies.get(r.name);
      if (!copy) continue;
      r.monolithText = copy.guide.markdown;
      for (const slug of copy.guide.sectionSlugs) monolithSectionSlugs.add(slug);
    }
    const documentSlugs = [
      ...buildSlugRegistry(applyMonolithBanner(options, results)).headings.map((h) => h.slug),
      ...monolithSectionSlugs,
    ];
    for (const r of results) {
      const copy = monolithCopies.get(r.name);
      if (!copy) continue;
      r.monolithKnownSlugs = [...monolithSectionSlugs];
      r.monolithText = markAssembledGuide(copy.guide, r.name, copy.options, documentSlugs);
    }
  }

  return { results, linkIndex, shardCache, linkedFilesByGuide };
}

export function compileGuideResults(options: CompileOptions): CompileGuideResult[] {
  return compileGuideResultsWithContext(options).results;
}

function monolithResults(results: CompileGuideResult[]): CompileGuideResult[] {
  return results.filter((r) => !r.publishOnly);
}

/** Each guide's copy as the monolith holds it, in stitch order: every copy after the first is demoted. */
function monolithCopyTexts(results: CompileGuideResult[]): { name: string; text: string }[] {
  return monolithResults(results).map((r, i) => {
    const guideText = r.monolithText ?? r.text;
    return { name: r.name, text: i === 0 ? guideText : demoteHeadings(guideText, 1) };
  });
}

function buildMonolithBody(results: CompileGuideResult[]): string {
  return monolithCopyTexts(results)
    .map(({ text }) => `${text}\n`)
    .join('');
}

/**
 * The line of the monolith on which each guide's copy starts, 1-based and in stitch order, as
 * `compileGuidesFromResults` stitches it. Each count takes the copy as the monolith holds it,
 * demoted after the first, then the newline that follows it. Demoting keeps each line of a copy,
 * and it adds a blank line at the end of a copy that ends with a newline.
 */
export function monolithGuideFirstLines(
  results: CompileGuideResult[],
  options: CompileOptions,
): { name: string; firstLine: number }[] {
  const lineBreaks = (text: string) => text.split('\n').length - 1;
  let line = 1 + lineBreaks(bannerText(options));
  return monolithCopyTexts(results).map(({ name, text }) => {
    const firstLine = line;
    line += lineBreaks(text) + 1;
    return { name, firstLine };
  });
}

/**
 * The banner as compile writes it: `options.banner`, with a newline added when it lacks one, so
 * the first line of the output starts a line of its own. Empty without a banner.
 */
function bannerText(options: CompileOptions): string {
  const banner = options.banner ?? '';
  return banner === '' || banner.endsWith('\n') ? banner : `${banner}\n`;
}

function applyMonolithBanner(options: CompileOptions, results: CompileGuideResult[]): string {
  const body = buildMonolithBody(results);
  if (!body) return '';
  return bannerText(options) + body;
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

/**
 * The text written to a guide's compiled guide: the banner if the guide takes one, ending with a
 * newline, then `text`.
 */
export function writtenGuideText(result: CompileGuideResult, options: CompileOptions): string {
  return result.includeBanner ? bannerText(options) + result.text : result.text;
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
    const text = writtenGuideText(r, options);
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
