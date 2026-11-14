import { dirname, join, relative, resolve, sep } from 'node:path';
import { pathToFileURL } from 'node:url';
import {
  getFormat,
  readSources,
  readSphinxInventory,
  resolveGuideDir,
  rstFormatWithSphinx,
  type MerlonConfig,
  type SourceDoc,
  type SourceFormat,
} from '@merlon-docs/merlon-docs-core';

/** What `--no-compile` runs on: the documents read through their formats, and where reading starts. */
export interface SourceModeInputs {
  docs: SourceDoc[];
  formatOf: (id: string) => SourceFormat;
  /** Absolute entry documents for reachability. */
  roots: string[];
  /** Absolute paths the manifest hook says are reachable. */
  extraReachable: string[];
}

/** Context passed to a manifest hook's default export. */
export interface ManifestHookContext {
  /** Absolute docs root. */
  docsRoot: string;
  /** Docs-root-relative POSIX paths of every document read. */
  docs: string[];
}

function toPosix(p: string): string {
  return p.split(sep).join('/');
}

/**
 * Read the config's `sources` under the docs root for `--no-compile`. Module and inventory paths
 * in the config resolve against the config file's directory, so the config can live outside the
 * project it reviews.
 */
export async function loadSourceMode(
  config: MerlonConfig,
  docsRoot: string,
  configFile: string,
): Promise<SourceModeInputs> {
  const root = resolve(docsRoot);
  const configDir = dirname(resolve(configFile));
  const sphinx = config.sphinx;
  const inventoryLabels = sphinx?.inventory
    ? readSphinxInventory(resolve(configDir, sphinx.inventory)).labels
    : undefined;
  const rst = sphinx
    ? rstFormatWithSphinx({
        autosectionlabel: sphinx.autosectionlabel,
        ignoreLabels: sphinx.ignoreLabels,
        inventoryLabels,
      })
    : undefined;
  const formatOf = (id: string) => (id === 'rst' && rst ? rst : getFormat(id));

  const { docs } = readSources({
    docsRoot: root,
    sources: config.sources,
    ignore: config.scan?.ignore ?? [],
    formatOf,
  });

  let roots = config.roots.map((r) => resolve(root, r));
  if (roots.length === 0) {
    roots = config.compileOrder.map((name) => {
      const guide = config.guides?.find((g) => g.name === name);
      return join(resolveGuideDir(name, config, root), guide?.compile?.manifest ?? 'index.md');
    });
  }

  let extraReachable: string[] = [];
  if (config.manifestHook) {
    const hookPath = resolve(configDir, config.manifestHook);
    const mod = (await import(pathToFileURL(hookPath).href)) as { default?: unknown };
    if (typeof mod.default !== 'function') {
      throw new Error(
        `manifestHook ${config.manifestHook}: the module has no default export function`,
      );
    }
    const context: ManifestHookContext = {
      docsRoot: root,
      docs: docs.map((d) => toPosix(relative(root, d.path))),
    };
    const result = (await (mod.default as (c: ManifestHookContext) => unknown)(context)) as unknown;
    if (!Array.isArray(result) || result.some((p) => typeof p !== 'string')) {
      throw new Error(`manifestHook ${config.manifestHook}: must return an array of paths`);
    }
    extraReachable = (result as string[]).map((p) => resolve(root, p));
  }

  return { docs, formatOf, roots, extraReachable };
}
