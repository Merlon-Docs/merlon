import { existsSync, readFileSync } from 'node:fs';
import { dirname, resolve, isAbsolute, basename } from 'node:path';
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
  /** Output basenames from the current compile run (cross-guide targets). */
  knownOutputBasenames?: Set<string>;
  knownSlugs?: Set<string>;
  /** When true, `.md` links must target published outputs — not guide shard sources. */
  publishOnly?: boolean;
  allowedPublishPaths?: Set<string>;
  /** Indexed shard paths that must not appear as link targets in publish output. */
  disallowedShardPaths?: Set<string>;
  /** Cached slug registries keyed by absolute publish output path. */
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

/** Match a publish output when href used a rewritten or sibling-package path. */
function resolveAllowedPublishTarget(
  resolved: string,
  filePart: string,
  fragment: string | undefined,
  options: ValidateCompiledLinkOptions,
): string | undefined {
  if (options.allowedPublishPaths?.has(resolved)) return resolved;
  const resolvedAbs = resolve(resolved);
  if ([...(options.allowedPublishPaths ?? [])].some((p) => resolve(p) === resolvedAbs)) {
    return resolvedAbs;
  }

  const base = basename(filePart);
  const candidates = [...(options.allowedPublishPaths ?? [])]
    .map((p) => resolve(p))
    .filter((p) => basename(p) === base);
  if (candidates.length === 0) return undefined;
  if (candidates.length === 1) return candidates[0];

  if (fragment) {
    const matching = candidates.filter((p) =>
      registryHasSlug(p, fragment, options.slugRegistryCache),
    );
    if (matching.length === 1) return matching[0];
  }

  return undefined;
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

  const base = basename(filePart);
  if (!options.publishOnly && options.knownOutputBasenames?.has(base)) {
    return { valid: true };
  }

  if (!options.outputFile) {
    return { valid: true };
  }

  const baseDir = dirname(resolve(options.outputFile));
  const resolved = isAbsolute(filePart) ? filePart : resolve(baseDir, filePart);

  if (options.publishOnly) {
    const publishTarget = resolveAllowedPublishTarget(resolved, filePart, fragment, options);
    if (publishTarget) {
      if (fragment && existsSync(publishTarget)) {
        if (!registryHasSlug(publishTarget, fragment, options.slugRegistryCache)) {
          return { valid: false, reason: 'dead anchor', brokenTarget: target };
        }
      }
      return { valid: true };
    }
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
