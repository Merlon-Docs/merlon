import { getLocalePack, type LocalePack } from '../locale/index.js';
import { createQuotedFenceScanner } from '../markdown/index.js';
import { buildSlugRegistry, type RefsRegistry } from '../refs/slugs.js';
import { extractLinks } from './extract.js';
import { validateCompiledLinkTarget } from './validate.js';
import type { LinkIssue } from './types.js';

export interface LintCompiledLinksOptions {
  markdown: string;
  outputFile: string;
  guideName?: string;
  /** @deprecated Ignored. Pass `knownOutputPaths`, which matches outputs by resolved path. */
  knownOutputBasenames?: Set<string>;
  /** Absolute paths of every output in the current compile run (see `validateCompiledLinkTarget`). */
  knownOutputPaths?: Set<string>;
  /** Absolute paths of configured outputs this run doesn't write (see `validateCompiledLinkTarget`). */
  unwrittenOutputPaths?: Set<string>;
  knownSlugs?: Set<string>;
  publishOnly?: boolean;
  allowedPublishPaths?: Set<string>;
  disallowedShardPaths?: Set<string>;
  /** Slug registries keyed by output path. A registry must not change after a call (see `validateCompiledLinkTarget`). */
  slugRegistryCache?: Map<string, RefsRegistry>;
  /** Effective file extensions (see `fileExtensionSet`). Defaults apply when absent. */
  fileExtensions?: Set<string>;
  /** Locale for broken-link marker detection (defaults to en-US). */
  locale?: LocalePack;
}

/**
 * One `dead anchor` issue for each line that holds a BROKEN LINK marker. Lint skips fenced code,
 * which `createQuotedFenceScanner` finds in a blockquote too, as `extractLinks` does.
 */
export function lintBrokenLinkMarkers(
  markdown: string,
  outputFile: string,
  guideName?: string,
  locale: LocalePack = getLocalePack(),
): LinkIssue[] {
  const issues: LinkIssue[] = [];
  const lines = markdown.split('\n');
  const inFence = createQuotedFenceScanner();

  for (let i = 0; i < lines.length; i++) {
    if (inFence(lines[i])) continue;

    if (locale.brokenLinks.lineHasMarker(lines[i])) {
      issues.push({
        kind: 'dead anchor',
        file: outputFile,
        line: i + 1,
        label: '',
        originalTarget: '',
        brokenTarget: lines[i].trim(),
        guideName,
      });
    }
  }
  return issues;
}

/** Validate links in assembled compiled guide output. */
export function lintCompiledLinks(options: LintCompiledLinksOptions): LinkIssue[] {
  const locale = options.locale ?? getLocalePack();
  return [
    ...lintBrokenLinkMarkers(options.markdown, options.outputFile, options.guideName, locale),
    ...lintCompiledLinkTargets(options),
  ];
}

/**
 * The link half of `lintCompiledLinks`: one issue for each link whose target fails, skipping lines
 * that hold a BROKEN LINK marker. `registry` is the slug registry of `options.markdown`, for a
 * caller that has built it already.
 */
export function lintCompiledLinkTargets(
  options: LintCompiledLinksOptions,
  registry: RefsRegistry = buildSlugRegistry(options.markdown),
): LinkIssue[] {
  const locale = options.locale ?? getLocalePack();
  const issues: LinkIssue[] = [];
  const lines = options.markdown.split('\n');
  // A line can hold many links, so each line is searched for a marker once.
  const markerLines = new Map<number, boolean>();
  const lineHasMarker = (line: number): boolean => {
    let has = markerLines.get(line);
    if (has === undefined) {
      has = locale.brokenLinks.lineHasMarker(lines[line - 1] ?? '');
      markerLines.set(line, has);
    }
    return has;
  };

  for (const link of extractLinks(options.markdown)) {
    if (lineHasMarker(link.line)) continue;

    const result = validateCompiledLinkTarget(link.target, registry, {
      outputFile: options.outputFile,
      knownOutputPaths: options.knownOutputPaths,
      unwrittenOutputPaths: options.unwrittenOutputPaths,
      knownSlugs: options.knownSlugs,
      publishOnly: options.publishOnly,
      allowedPublishPaths: options.allowedPublishPaths,
      disallowedShardPaths: options.disallowedShardPaths,
      slugRegistryCache: options.slugRegistryCache,
      fileExtensions: options.fileExtensions,
    });
    if (result.valid) continue;
    issues.push({
      kind: result.reason ?? 'dead anchor',
      file: options.outputFile,
      line: link.line,
      label: link.label,
      originalTarget: link.target,
      brokenTarget: result.brokenTarget ?? link.target,
      guideName: options.guideName,
    });
  }

  return issues;
}
