import { getLocalePack, type LocalePack } from '../locale/index.js';
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
  slugRegistryCache?: Map<string, RefsRegistry>;
  /** Effective file extensions (see `fileExtensionSet`). Defaults apply when absent. */
  fileExtensions?: Set<string>;
  /** Locale for broken-link marker detection (defaults to en-US). */
  locale?: LocalePack;
}

/** One `dead anchor` issue for each line outside fenced code that holds a BROKEN LINK marker. */
export function lintBrokenLinkMarkers(
  markdown: string,
  outputFile: string,
  guideName?: string,
  locale: LocalePack = getLocalePack(),
): LinkIssue[] {
  const issues: LinkIssue[] = [];
  const lines = markdown.split('\n');
  let inFence = false;

  for (let i = 0; i < lines.length; i++) {
    const stripped = lines[i].trim();
    if (stripped.startsWith('```')) {
      inFence = !inFence;
      continue;
    }
    if (inFence) continue;

    if (locale.brokenLinks.lineHasMarker(lines[i])) {
      issues.push({
        kind: 'dead anchor',
        file: outputFile,
        line: i + 1,
        label: '',
        originalTarget: '',
        brokenTarget: stripped,
        guideName,
      });
    }
  }
  return issues;
}

/** Validate links in assembled compiled guide output. */
export function lintCompiledLinks(options: LintCompiledLinksOptions): LinkIssue[] {
  const locale = options.locale ?? getLocalePack();
  const issues = lintBrokenLinkMarkers(
    options.markdown,
    options.outputFile,
    options.guideName,
    locale,
  );
  const registry = buildSlugRegistry(options.markdown);
  const lines = options.markdown.split('\n');

  for (const link of extractLinks(options.markdown)) {
    if (locale.brokenLinks.lineHasMarker(lines[link.line - 1] ?? '')) continue;

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
