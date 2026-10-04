import { getLocalePack, type LocalePack } from '../locale/index.js';
import { buildSlugRegistry } from '../refs/slugs.js';
import { extractLinks } from './extract.js';
import { validateCompiledLinkTarget } from './validate.js';
import type { LinkIssue } from './types.js';

export interface LinkProvenance {
  label: string;
  originalTarget: string;
  sourceFile: string;
  sourceLine: number;
}

export interface MarkBrokenLinksOptions {
  outputFile?: string;
  provenance?: LinkProvenance[];
  enabled?: boolean;
  guideName?: string;
  compiledOutputPath?: string;
  /** @deprecated Ignored. Only `#fragment` targets are marked, and they never named an output. */
  knownOutputBasenames?: Set<string>;
  /** Intra-guide section slugs valid after rewrite (FIND-* filename slugs, etc.). */
  knownSlugs?: Set<string>;
  /** Locale for marker copy (defaults to en-US). */
  locale?: LocalePack;
}

export function formatBrokenLinkMarker(
  label: string,
  originalTarget: string,
  brokenTarget: string,
  reason: string,
  locale: LocalePack = getLocalePack(),
): string {
  return locale.brokenLinks.formatMarker(label, originalTarget, brokenTarget, reason);
}

function findProvenance(
  label: string,
  provenance: LinkProvenance[] | undefined,
  used: Set<number>,
): LinkProvenance | undefined {
  if (!provenance) return undefined;
  for (let i = 0; i < provenance.length; i++) {
    if (used.has(i)) continue;
    if (provenance[i].label === label) {
      used.add(i);
      return provenance[i];
    }
  }
  return undefined;
}

/** Replace invalid links in compiled markdown with BROKEN LINK markers. */
export function markBrokenLinks(
  markdown: string,
  options: MarkBrokenLinksOptions = {},
): { markdown: string; issues: LinkIssue[] } {
  if (options.enabled === false) {
    return { markdown, issues: [] };
  }

  const locale = options.locale ?? getLocalePack();
  const registry = buildSlugRegistry(markdown);
  const issues: LinkIssue[] = [];
  const usedProvenance = new Set<number>();
  let out = markdown;

  const links = extractLinks(markdown);
  for (const link of [...links].reverse()) {
    if (!link.target.startsWith('#')) continue;

    const result = validateCompiledLinkTarget(link.target, registry, {
      outputFile: options.outputFile,
      knownSlugs: options.knownSlugs,
    });
    if (result.valid) continue;

    const prov = findProvenance(link.label, options.provenance, usedProvenance);
    const originalTarget = prov?.originalTarget ?? link.target;
    const brokenTarget = result.brokenTarget ?? link.target;
    const reason =
      result.reason === 'dead anchor'
        ? locale.brokenLinks.reasonDeadAnchor
        : result.reason === 'missing file'
          ? locale.brokenLinks.reasonMissingFile
          : locale.brokenLinks.reasonMissingPublishPath;

    const marker = formatBrokenLinkMarker(link.label, originalTarget, brokenTarget, reason, locale);
    out = out.replace(link.match, marker);

    const reportPath = options.compiledOutputPath ?? options.outputFile ?? 'compiled';
    issues.push({
      kind: result.reason ?? 'dead anchor',
      file: reportPath,
      line: link.line,
      label: link.label,
      originalTarget,
      brokenTarget,
      guideName: options.guideName,
      shardFile: prov?.sourceFile,
      shardLine: prov?.sourceLine,
    });
  }

  return { markdown: out, issues };
}
