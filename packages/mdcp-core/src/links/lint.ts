import { dirname, resolve } from 'node:path';
import type { CompileGuideResult, CompileOptions } from '../compile/assemble.js';
import {
  compiledOutputDocuments,
  type CompiledOutputDocument,
  type MonolithCopy,
} from '../compile/output-documents.js';
import { getLocalePack } from '../locale/index.js';
import type { MdcpConfig } from '../config/schema.js';
import { getGuideConfig, resolveGuideDir, resolveUnderOutputDir } from '../config/load.js';
import { sectionFiles } from '../compile/section-manifest.js';
import { buildGuideLinkIndex, type GuideLinkIndex } from '../compile/guide-link-index.js';
import { buildSlugRegistry } from '../refs/slugs.js';
import type { RefsRegistry } from '../refs/slugs.js';
import type { ShardCache } from '../compile/shard-cache.js';
import {
  lintBrokenLinkMarkers,
  lintCompiledLinkTargets,
  type LintCompiledLinksOptions,
} from './validate-compiled.js';
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
  /**
   * The options `results` were compiled with. Link lint reads each output as compile writes it
   * with them, banner included. Without them, the banner comes from `config`.
   */
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
  const absDocsRoot = resolve(docsRoot);

  // Every file this run writes, with the text written there, so a line number is a line of the
  // file. Paths resolve under this call's docs root and config.
  const compiledWith: CompileOptions = options.compileOptions ?? {
    guidesRoot: absDocsRoot,
    compileOrder: config.compileOrder,
    banner: config.banner,
  };
  const docs = compiledOutputDocuments(results, { ...compiledWith, docsRoot: absDocsRoot, config });
  const monolith = docs.find((d) => d.copies !== undefined);

  // Every output this run writes, keyed like `slugRegistryCache`. A link is
  // matched to an output by resolved path: a shared file name is not a match.
  // This covers the publish outputs too, so `allowedPublishPaths` stays unset.
  const knownOutputPaths = new Set(docs.map((d) => d.path));

  // A configured monolith that no guide is stitched into is never written. A
  // link to it fails even when an earlier run left the file on disk. A guide
  // whose own output is that path still counts, because outputs match first.
  const unwrittenOutputPaths = new Set<string>();
  if (config.outputFile !== undefined && monolith === undefined) {
    unwrittenOutputPaths.add(
      resolve(resolveUnderOutputDir(absDocsRoot, outputDir, config.outputFile)),
    );
  }

  // Each output's headings. A `#fragment` on a link to an output is checked against them. One in
  // the output itself is checked against its headings and every slug its assembly accepted, as
  // compile marked broken links.
  const slugRegistryCache = new Map<string, RefsRegistry>();
  for (const doc of docs) slugRegistryCache.set(doc.path, buildSlugRegistry(doc.text));

  let linkIndex: GuideLinkIndex | undefined = options.linkIndex;
  if (!linkIndex && options.compileOptions) {
    linkIndex = buildGuideLinkIndex(options.compileOptions, docsRoot).index;
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

  const common = {
    knownOutputPaths,
    unwrittenOutputPaths,
    slugRegistryCache,
    fileExtensions,
  };
  // Each compiled guide's link issues, kept to tell which monolith issues repeat them.
  const guideLinkIssues = new Map<string, GuideLinkIssues>();
  for (const doc of docs) {
    const r = doc.guide;
    if (!r) continue;
    const disallowedShardPaths = linkIndex
      ? disallowedShardPathsForPublisher(config, docsRoot, r.name, linkIndex)
      : undefined;
    const lintOptions: LintCompiledLinksOptions = {
      ...common,
      markdown: doc.text,
      outputFile: doc.path,
      guideName: r.name,
      knownSlugs: new Set(r.knownSlugs ?? []),
      publishOnly: r.publishOnly,
      disallowedShardPaths,
    };
    const linkIssues = lintCompiledLinkTargets(lintOptions, slugRegistryCache.get(doc.path));
    // The banner comes first in the written file, so the guide's text starts after its lines.
    const textFirstLine = 1 + lineBreaks(doc.text) - lineBreaks(r.text);
    guideLinkIssues.set(r.name, { issues: linkIssues, textFirstLine });
    issues.push(...lintBrokenLinkMarkers(doc.text, doc.path, r.name), ...linkIssues);
  }

  if (monolith) {
    issues.push(...lintMonolithOnlyMarkers(monolith));
    issues.push(...lintMonolithLinks(monolith, guideLinkIssues, common));
  }

  return issues;
}

/** A compiled guide's link issues, and the line of the written file on which its text starts. */
interface GuideLinkIssues {
  issues: LinkIssue[];
  textFirstLine: number;
}

function lineBreaks(text: string): number {
  let count = 0;
  for (let i = text.indexOf('\n'); i !== -1; i = text.indexOf('\n', i + 1)) count++;
  return count;
}

/** The index of the monolith copy that holds `line`, or -1 for a line before the first copy. */
function copyIndexAt(copies: MonolithCopy[], line: number): number {
  let index = -1;
  while (index + 1 < copies.length && copies[index + 1].firstLine <= line) index++;
  return index;
}

/** An item found in a guide's copy in the monolith, or in that guide's compiled guide. */
interface CopyItem<T> {
  value: T;
  /** The line of the guide's text that holds the item, counted from 0. */
  textLine: number;
}

/**
 * Pair each item of a copy in the monolith with an item of that guide's compiled guide, one for
 * one, where `same` holds. Both assemblies keep the lines of the guide's text, so an item first
 * takes a match at its own line of the text. Only then do the items left take any match left,
 * which finds an item whose line a hook moved. That second pass skips a candidate that `heldAt`
 * says belongs to an item of the copy at the candidate's own line.
 * Returns, for each item of `found`, whether it found a match. `candidatesByCopy` is consumed.
 */
function matchCopyItems<T, C>(
  found: (CopyItem<T> & { copy: number })[],
  candidatesByCopy: CopyItem<C>[][],
  same: (item: T, candidate: C) => boolean,
  heldAt: (copy: number, candidate: CopyItem<C>) => boolean = () => false,
): boolean[] {
  const matched = found.map(() => false);
  for (const sameLineOnly of [true, false]) {
    found.forEach((item, i) => {
      const candidates = candidatesByCopy[item.copy];
      if (matched[i] || !candidates) return;
      const match = candidates.findIndex(
        (candidate) =>
          (sameLineOnly ? candidate.textLine === item.textLine : !heldAt(item.copy, candidate)) &&
          same(item.value, candidate.value),
      );
      if (match === -1) return;
      candidates.splice(match, 1);
      matched[i] = true;
    });
  }
  return matched;
}

/** The copy that holds a line of the monolith, and the line of the guide's text, counted from 0. */
function copyLineAt(copies: MonolithCopy[], line: number): { copy: number; textLine: number } {
  const copy = copyIndexAt(copies, line);
  return { copy, textLine: copy === -1 ? -1 : line - copies[copy].firstLine };
}

/**
 * Compile marks each guide's copy in the monolith against the whole monolith, so the monolith can
 * hold a marker that no compiled guide holds. Each marker in a copy is matched, one for one, to a
 * marker of the same text in that guide's compiled guide, at the same line of the guide's text
 * first. A monolith line is reported when a marker on it has no match, and the issue names the
 * guide whose copy holds the line and sets `inMonolith`. The rest of the line doesn't count,
 * because each file rebases paths and cross-guide links relative to itself.
 */
function lintMonolithOnlyMarkers(monolith: CompiledOutputDocument): LinkIssue[] {
  const copies = monolith.copies ?? [];
  const locale = getLocalePack();
  const markersOf = (line: string): string[] => {
    const found = locale.brokenLinks.findMarkers?.(line) ?? [];
    return found.length > 0 ? found : [line.trim()];
  };
  // Each copy's markers from its compiled guide, which has no banner in `text`.
  const candidatesByCopy = copies.map(({ guide }) =>
    lintBrokenLinkMarkers(guide.text, monolith.path).flatMap((issue) =>
      markersOf(issue.brokenTarget).map((marker) => ({ value: marker, textLine: issue.line - 1 })),
    ),
  );

  const lines = lintBrokenLinkMarkers(monolith.text, monolith.path);
  const found = lines.flatMap((issue, lineIndex) => {
    const at = copyLineAt(copies, issue.line);
    return markersOf(issue.brokenTarget).map((marker) => ({ ...at, value: marker, lineIndex }));
  });
  const matched = matchCopyItems(found, candidatesByCopy, (a, b) => a === b);

  const reported = new Set(found.filter((_, i) => !matched[i]).map((m) => m.lineIndex));
  return lines
    .filter((_, lineIndex) => reported.has(lineIndex))
    .map((issue) => ({
      ...issue,
      guideName: copies[copyIndexAt(copies, issue.line)]?.guide.name,
      inMonolith: true,
    }));
}

/** The file a compiled link points at, resolved from the file that holds it. */
function linkTargetPath(issue: LinkIssue): string {
  const target = issue.originalTarget;
  const hash = target.indexOf('#');
  const path = hash === -1 ? target : target.slice(0, hash);
  const fragment = hash === -1 ? '' : target.slice(hash);
  return path ? `${resolve(dirname(issue.file), path)}${fragment}` : target;
}

/**
 * Lint the links of the monolith as a document of its own. A link in any copy is checked against
 * the headings of the whole monolith and the section slugs of every copy, as compile marked it,
 * whatever guide owns a shard and wherever it sits in `compileOrder`. An issue is left out when
 * that guide's compiled guide already reports the same link: the same kind and label, and the
 * same target, either as written or as the file it resolves to, since each file rebases paths
 * relative to itself. Each issue there covers one monolith issue, and an issue at the same line of
 * the guide's text is matched first. An issue on another line is matched only when no monolith
 * issue with its label is at its own line. An issue that stays names the guide whose copy holds
 * the line and sets `inMonolith`.
 */
function lintMonolithLinks(
  monolith: CompiledOutputDocument,
  guideLinkIssues: Map<string, GuideLinkIssues>,
  common: Pick<
    LintCompiledLinksOptions,
    'knownOutputPaths' | 'unwrittenOutputPaths' | 'slugRegistryCache' | 'fileExtensions'
  >,
): LinkIssue[] {
  const copies = monolith.copies ?? [];
  const knownSlugs = new Set(copies.flatMap((c) => c.guide.monolithKnownSlugs ?? []));
  const found = lintCompiledLinkTargets(
    {
      ...common,
      markdown: monolith.text,
      outputFile: monolith.path,
      publishOnly: false,
      knownSlugs,
    },
    common.slugRegistryCache?.get(monolith.path),
  );

  // Each copy's issues from its compiled guide. The banner comes first in the written file.
  const candidatesByCopy = copies.map((c) => {
    const guide = guideLinkIssues.get(c.guide.name);
    return (guide?.issues ?? []).map((issue) => ({
      value: issue,
      textLine: issue.line - guide!.textFirstLine,
    }));
  });
  const sameLink = (a: LinkIssue, b: LinkIssue) =>
    a.kind === b.kind &&
    a.label === b.label &&
    (a.originalTarget === b.originalTarget || linkTargetPath(a) === linkTargetPath(b));

  const copyLines = found.map((issue) => copyLineAt(copies, issue.line));
  // A compiled guide issue whose own line of the copy holds a monolith issue with its label is
  // that link's issue, even when the targets differ, so no issue on another line takes it.
  const lineKey = (copy: number, textLine: number, label: string) =>
    JSON.stringify([copy, textLine, label]);
  const labelsAtLine = new Set(
    found.map((issue, i) => lineKey(copyLines[i].copy, copyLines[i].textLine, issue.label)),
  );
  const matched = matchCopyItems(
    found.map((issue, i) => ({ ...copyLines[i], value: issue })),
    candidatesByCopy,
    sameLink,
    (copy, candidate) => labelsAtLine.has(lineKey(copy, candidate.textLine, candidate.value.label)),
  );

  const issues: LinkIssue[] = [];
  found.forEach((issue, i) => {
    if (matched[i]) return;
    issues.push({ ...issue, guideName: copies[copyLines[i].copy]?.guide.name, inMonolith: true });
  });
  return issues;
}
