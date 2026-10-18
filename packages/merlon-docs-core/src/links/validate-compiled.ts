import { dirname, resolve } from 'node:path';
import { getLocalePack, type LocalePack } from '../locale/index.js';
import { createQuotedFenceScanner } from '../markdown/index.js';
import { buildSlugRegistry, type RefsRegistry } from '../refs/slugs.js';
import { extractLinks } from './extract.js';
import { validateCompiledLinkTarget } from './validate.js';
import type { LinkIssue } from './types.js';

const SHARD_COMMENT_PREFIX = '<!--';
const SHARD_COMMENT_SUFFIX = '-->';
const SHARD_TAG_KEY = 'merlon-shard:';
const BROKEN_MARKER_ORIG_RE = /\(`([^`\n]+)`\)\s*→\s*`([^`\n]+)`/;

/**
 * Linear-time parser for `<!-- merlon-shard: start <path> -->` and `<!-- merlon-shard: end <path> -->`
 * without regex backtracking on repeated whitespace.
 */
function parseShardCommentTag(
  trimmedLine: string,
): { kind: 'start' | 'end'; relPath: string } | null {
  if (
    !trimmedLine.startsWith(SHARD_COMMENT_PREFIX) ||
    !trimmedLine.endsWith(SHARD_COMMENT_SUFFIX)
  ) {
    return null;
  }
  const inner = trimmedLine
    .slice(SHARD_COMMENT_PREFIX.length, trimmedLine.length - SHARD_COMMENT_SUFFIX.length)
    .trim();
  if (!inner.startsWith(SHARD_TAG_KEY)) return null;
  const afterKey = inner.slice(SHARD_TAG_KEY.length).trimStart();
  if (afterKey.startsWith('start')) {
    const rest = afterKey.slice('start'.length);
    if (rest.length === 0 || (rest[0] !== ' ' && rest[0] !== '\t')) return null;
    const relPath = rest.trim();
    return relPath ? { kind: 'start', relPath } : null;
  }
  if (afterKey.startsWith('end')) {
    const rest = afterKey.slice('end'.length);
    if (rest.length === 0 || (rest[0] !== ' ' && rest[0] !== '\t')) return null;
    const relPath = rest.trim();
    return relPath ? { kind: 'end', relPath } : null;
  }
  return null;
}

export interface CompiledShardSpan {
  /** 1-based first content line after the `<!-- merlon-shard: start ... -->` tag and its blank line. */
  startLine: number;
  /** 1-based last content line before the `<!-- merlon-shard: end ... -->` tag. */
  endLine: number;
  /** Resolved shard file path. */
  shardFile: string;
}

/**
 * Parse `<!-- merlon-shard: start <relPath> -->` / `end` markers in `markdown` and map 1-based
 * compiled line numbers to `{ shardFile, shardLine }`. Paths resolve against `dirname(outputFile)`.
 */
export function resolveCompiledShardLine(
  lines: readonly string[],
  outputFile: string,
): (compiledLine: number) => { shardFile: string; shardLine: number } | undefined {
  if (!outputFile) return () => undefined;
  const baseDir = dirname(resolve(outputFile));
  const spans: CompiledShardSpan[] = [];
  const inFence = createQuotedFenceScanner();
  let activeShard: { shardFile: string; firstContentLine: number } | undefined;

  for (let i = 0; i < lines.length; i++) {
    const line = lines[i];
    if (inFence(line)) continue;
    const tag = parseShardCommentTag(line.trim());
    if (tag?.kind === 'start') {
      // Assemble writes `<!-- merlon-shard: start rel -->\n\n<body>\n\n<!-- merlon-shard: end rel -->`
      const nextIsBlank = (lines[i + 1] ?? '').trim() === '';
      activeShard = {
        shardFile: resolve(baseDir, tag.relPath),
        firstContentLine: i + 1 + (nextIsBlank ? 2 : 1),
      };
      continue;
    }
    if (activeShard && tag?.kind === 'end') {
      const prevIsBlank = (lines[i - 1] ?? '').trim() === '';
      const endLine = i + 1 - (prevIsBlank ? 2 : 1);
      if (endLine >= activeShard.firstContentLine) {
        spans.push({
          startLine: activeShard.firstContentLine,
          endLine,
          shardFile: activeShard.shardFile,
        });
      }
      activeShard = undefined;
    }
  }

  if (spans.length === 0) return () => undefined;
  return (compiledLine: number) => {
    for (const s of spans) {
      if (compiledLine >= s.startLine && compiledLine <= s.endLine) {
        return {
          shardFile: s.shardFile,
          shardLine: compiledLine - s.startLine + 1,
        };
      }
    }
    return undefined;
  };
}

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
  const shardAt = resolveCompiledShardLine(lines, outputFile);

  for (let i = 0; i < lines.length; i++) {
    if (inFence(lines[i])) continue;

    if (locale.brokenLinks.lineHasMarker(lines[i])) {
      const shard = shardAt(i + 1);
      const origMatch = BROKEN_MARKER_ORIG_RE.exec(lines[i]);
      issues.push({
        kind: 'dead anchor',
        file: outputFile,
        line: i + 1,
        label: '',
        originalTarget: origMatch ? origMatch[1] : '',
        brokenTarget: lines[i].trim(),
        guideName,
        ...(shard ? { shardFile: shard.shardFile, shardLine: shard.shardLine } : {}),
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
  const shardAt = resolveCompiledShardLine(lines, options.outputFile);
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
    const shard = shardAt(link.line);
    issues.push({
      kind: result.reason ?? 'dead anchor',
      file: options.outputFile,
      line: link.line,
      label: link.label,
      originalTarget: link.target,
      brokenTarget: result.brokenTarget ?? link.target,
      guideName: options.guideName,
      ...(shard ? { shardFile: shard.shardFile, shardLine: shard.shardLine } : {}),
    });
  }

  return issues;
}
