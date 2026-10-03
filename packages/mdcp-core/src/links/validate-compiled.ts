import { getLocalePack, type LocalePack } from '../locale/index.js';
import { buildSlugRegistry, type RefsRegistry } from '../refs/slugs.js';
import { extractLinks } from './extract.js';
import { validateCompiledLinkTarget } from './validate.js';
import type { LinkIssue } from './types.js';

export interface LintCompiledLinksOptions {
  markdown: string;
  outputFile: string;
  guideName?: string;
  knownOutputBasenames?: Set<string>;
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

/** Validate links in assembled compiled guide output. */
export function lintCompiledLinks(options: LintCompiledLinksOptions): LinkIssue[] {
  const issues: LinkIssue[] = [];
  const locale = options.locale ?? getLocalePack();
  const registry = buildSlugRegistry(options.markdown);
  const lines = options.markdown.split('\n');
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
        file: options.outputFile,
        line: i + 1,
        label: '',
        originalTarget: '',
        brokenTarget: lines[i].trim(),
        guideName: options.guideName,
      });
    }
  }

  for (const link of extractLinks(options.markdown)) {
    if (locale.brokenLinks.lineHasMarker(lines[link.line - 1] ?? '')) continue;

    const result = validateCompiledLinkTarget(link.target, registry, {
      outputFile: options.outputFile,
      knownOutputBasenames: options.knownOutputBasenames,
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
