import { getLocalePack, type LocalePack } from '../locale/index.js';
import { buildSlugRegistry } from '../refs/slugs.js';
import { extractLinks, type ExtractedLink } from './extract.js';
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
  /**
   * Every link of the shards `markdown` stitches, in order, as `collectShardProvenance` lists them.
   * The k-th link with a label in `markdown` takes the k-th entry with that label.
   */
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

/**
 * The provenance of each link, by position: the k-th link with a label takes the k-th provenance
 * entry with that label. Provenance lists every link of the stitched shards in order, so a link
 * keeps its own source whether or not the links before it are broken.
 */
function provenanceByLink(
  links: ExtractedLink[],
  provenance: LinkProvenance[] | undefined,
): (LinkProvenance | undefined)[] {
  if (!provenance) return links.map(() => undefined);
  const byLabel = new Map<string, LinkProvenance[]>();
  for (const prov of provenance) {
    const entries = byLabel.get(prov.label);
    if (entries) entries.push(prov);
    else byLabel.set(prov.label, [prov]);
  }
  const seen = new Map<string, number>();
  return links.map((link) => {
    const k = seen.get(link.label) ?? 0;
    seen.set(link.label, k + 1);
    return byLabel.get(link.label)?.[k];
  });
}

/**
 * Replace invalid links in compiled markdown with BROKEN LINK markers. Each marker replaces its own
 * link where it stands, and names the target that `provenance` gives the link by position.
 */
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
  let out = markdown;

  const links = extractLinks(markdown);
  const provenance = provenanceByLink(links, options.provenance);
  // Last link first, so each replacement leaves the offsets of the links before it in place.
  for (let i = links.length - 1; i >= 0; i--) {
    const link = links[i];
    if (!link.target.startsWith('#')) continue;

    const result = validateCompiledLinkTarget(link.target, registry, {
      outputFile: options.outputFile,
      knownSlugs: options.knownSlugs,
    });
    if (result.valid) continue;

    const prov = provenance[i];
    const originalTarget = prov?.originalTarget ?? link.target;
    const brokenTarget = result.brokenTarget ?? link.target;
    const reason =
      result.reason === 'dead anchor'
        ? locale.brokenLinks.reasonDeadAnchor
        : result.reason === 'missing file'
          ? locale.brokenLinks.reasonMissingFile
          : locale.brokenLinks.reasonMissingPublishPath;

    const marker = formatBrokenLinkMarker(link.label, originalTarget, brokenTarget, reason, locale);
    out = out.slice(0, link.offset) + marker + out.slice(link.offset + link.match.length);

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
