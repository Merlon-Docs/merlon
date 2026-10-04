import { existsSync, readFileSync } from 'node:fs';
import { dirname, resolve, isAbsolute } from 'node:path';
import { buildSlugRegistry } from '../refs/slugs.js';
import { hasFileExtension } from '../compile/hooks/path-resolve.js';
import type { RefsRegistry } from '../refs/slugs.js';

export type LinkFailureReason = 'dead anchor' | 'missing file' | 'missing publish path';

export interface LinkValidationResult {
  valid: boolean;
  reason?: LinkFailureReason;
  brokenTarget?: string;
}

export interface ValidateCompiledLinkOptions {
  outputFile?: string;
  /**
   * @deprecated Ignored. A file name cannot tell two outputs apart, so a link to
   * any `README.md` passed whenever one output was named `README.md`. Pass
   * `knownOutputPaths` instead.
   */
  knownOutputBasenames?: Set<string>;
  /**
   * Absolute paths of every output the current compile run writes: each
   * compiled guide, and the monolith when at least one guide is stitched into
   * it. Entries are normalized before comparing. A `.md` link that resolves to
   * one of them is valid before the output is written, from publish-only output
   * too. Its `#fragment` is checked against that output's registry in
   * `slugRegistryCache`, or the file on disk when the cache has no entry for it.
   */
  knownOutputPaths?: Set<string>;
  /**
   * Absolute paths of outputs the config names but this run doesn't write, such
   * as a monolith that no guide is stitched into. A `.md` link to one reports
   * `missing publish path`, even when a file from an earlier run is on disk.
   * A path in `knownOutputPaths` is a written output and takes precedence.
   */
  unwrittenOutputPaths?: Set<string>;
  knownSlugs?: Set<string>;
  /** When true, `.md` links must target published outputs — not guide shard sources. */
  publishOnly?: boolean;
  /**
   * Publish outputs a publish-only link may name, checked like
   * `knownOutputPaths`. `lintLinks` passes every output in `knownOutputPaths`
   * and leaves this unset.
   */
  allowedPublishPaths?: Set<string>;
  /** Indexed shard paths that must not appear as link targets in publish output. */
  disallowedShardPaths?: Set<string>;
  /** Cached slug registries keyed by the resolved absolute path of each output. */
  slugRegistryCache?: Map<string, RefsRegistry>;
  /** Effective file extensions (see `fileExtensionSet`). Defaults apply when absent. */
  fileExtensions?: Set<string>;
}

function getOrBuildRegistry(
  path: string,
  cache?: Map<string, RefsRegistry>,
): RefsRegistry | undefined {
  const absPath = resolve(path);
  const cached = cache?.get(absPath);
  if (cached) return cached;
  if (!existsSync(absPath)) return undefined;
  try {
    const registry = buildSlugRegistry(readFileSync(absPath, 'utf-8'));
    cache?.set(absPath, registry);
    return registry;
  } catch {
    return undefined;
  }
}

function registryHasSlug(path: string, slug: string, cache?: Map<string, RefsRegistry>): boolean {
  const registry = getOrBuildRegistry(path, cache);
  return registry ? slugSet(registry).has(slug) : false;
}

function slugSet(registry: RefsRegistry): Set<string> {
  return new Set(registry.headings.map((h) => h.slug));
}

/**
 * Whether a link's `#fragment` names a heading in a compile output, which may
 * not be written yet. The output's compiled text in the cache comes first, then
 * the file on disk. With neither, there is no heading list to check against.
 */
function outputHasFragment(
  path: string,
  fragment: string | undefined,
  cache?: Map<string, RefsRegistry>,
): boolean {
  if (!fragment) return true;
  const registry = getOrBuildRegistry(path, cache);
  return !registry || slugSet(registry).has(fragment);
}

function parseTarget(target: string): { path: string; fragment?: string } {
  const hash = target.indexOf('#');
  if (hash === -1) return { path: target };
  return { path: target.slice(0, hash), fragment: target.slice(hash + 1) };
}

function isExternal(target: string): boolean {
  return /^https?:\/\//i.test(target) || target.startsWith('//');
}

function isMarkdownPath(path: string): boolean {
  return path === '' || /\.md$/i.test(path) || path.endsWith('.md');
}

/**
 * Whether `paths` holds the resolved absolute path `resolved`. Entries are
 * normalized before comparing. A shared file name is not a match.
 */
function hasResolvedPath(paths: Set<string> | undefined, resolved: string): boolean {
  if (!paths) return false;
  if (paths.has(resolved)) return true;
  for (const p of paths) {
    if (resolve(p) === resolved) return true;
  }
  return false;
}

/**
 * Resolve a compiled link that names a source file. The `codeEvidence` hook
 * rewrites these targets relative to the output file, so an unresolved target
 * means the file the docs cite is gone. Targets without a known source
 * extension (a bare word, a directory) stay unvalidated.
 */
function validateSourceFileTarget(
  target: string,
  filePart: string,
  options: ValidateCompiledLinkOptions,
): LinkValidationResult {
  if (!hasFileExtension(filePart, options.fileExtensions) || !options.outputFile) {
    return { valid: true };
  }
  const baseDir = dirname(resolve(options.outputFile));
  const resolved = isAbsolute(filePart) ? filePart : resolve(baseDir, filePart);
  if (existsSync(resolved)) return { valid: true };
  return { valid: false, reason: 'missing file', brokenTarget: target };
}

/** Validate a link target against a compiled document's slug registry and output path. */
export function validateCompiledLinkTarget(
  target: string,
  registry: RefsRegistry,
  outputFileOrOptions?: string | ValidateCompiledLinkOptions,
): LinkValidationResult {
  const options: ValidateCompiledLinkOptions =
    typeof outputFileOrOptions === 'string'
      ? { outputFile: outputFileOrOptions }
      : (outputFileOrOptions ?? {});

  if (!target || isExternal(target)) {
    return { valid: true };
  }

  if (target.startsWith('#')) {
    const slug = target.slice(1);
    const ok = slugSet(registry).has(slug) || options.knownSlugs?.has(slug) === true;
    return ok ? { valid: true } : { valid: false, reason: 'dead anchor', brokenTarget: target };
  }

  const { path: filePart, fragment } = parseTarget(target);

  if (!isMarkdownPath(filePart)) {
    return validateSourceFileTarget(target, filePart, options);
  }

  if (!filePart) {
    if (fragment) {
      const ok = slugSet(registry).has(fragment);
      return ok
        ? { valid: true }
        : { valid: false, reason: 'dead anchor', brokenTarget: `#${fragment}` };
    }
    return { valid: true };
  }

  if (!options.outputFile) {
    return { valid: true };
  }

  const baseDir = dirname(resolve(options.outputFile));
  // Normalized even when absolute, so it matches output and publish path sets.
  const resolved = resolve(baseDir, filePart);

  // Another output of this run, matched by resolved path. Its fragment is
  // checked against the compiled text, so the output need not be written yet.
  if (
    hasResolvedPath(options.knownOutputPaths, resolved) ||
    (options.publishOnly && hasResolvedPath(options.allowedPublishPaths, resolved))
  ) {
    return outputHasFragment(resolved, fragment, options.slugRegistryCache)
      ? { valid: true }
      : { valid: false, reason: 'dead anchor', brokenTarget: target };
  }

  // A configured output this run doesn't write. A file left by an earlier run
  // is stale, so whether it exists doesn't matter.
  if (hasResolvedPath(options.unwrittenOutputPaths, resolved)) {
    return { valid: false, reason: 'missing publish path', brokenTarget: target };
  }

  if (options.publishOnly) {
    if (options.disallowedShardPaths?.has(resolved)) {
      return {
        valid: false,
        reason: 'missing publish path',
        brokenTarget: target,
      };
    }
    if (!existsSync(resolved)) {
      return {
        valid: false,
        reason: 'missing publish path',
        brokenTarget: target,
      };
    }
    if (fragment) {
      if (!registryHasSlug(resolved, fragment, options.slugRegistryCache)) {
        return { valid: false, reason: 'dead anchor', brokenTarget: target };
      }
    }
    return { valid: true };
  }

  if (!existsSync(resolved)) {
    return {
      valid: false,
      reason: 'missing publish path',
      brokenTarget: target,
    };
  }

  if (fragment && filePart.endsWith('.md')) {
    if (!registryHasSlug(resolved, fragment, options.slugRegistryCache)) {
      return { valid: false, reason: 'dead anchor', brokenTarget: target };
    }
  }

  return { valid: true };
}
