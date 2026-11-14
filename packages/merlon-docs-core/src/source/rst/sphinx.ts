import { readFileSync } from 'node:fs';
import { inflateSync } from 'node:zlib';
import type { RefResolver, RefResolverFactory } from '../format.js';
import type { SourceDoc } from '../model.js';
import { normalizeRstLabel, rstDocname } from './names.js';

/** Labels Sphinx defines in every project. */
const SPHINX_BUILT_IN_LABELS = ['genindex', 'modindex', 'search', 'py-modindex'];

export interface SphinxRefOptions {
  /** Set when `conf.py` loads `sphinx.ext.autosectionlabel`. */
  autosectionlabel?: {
    /** `autosectionlabel_prefix_document`: labels read `docname:Section Title`. */
    prefixDocument?: boolean;
    /** `autosectionlabel_maxdepth`: deepest section level labelled; 0 or absent means all. */
    maxDepth?: number;
  };
  /** Regular expressions for labels the build generates, matched against the normalized label. */
  ignoreLabels?: string[];
  /** Labels a built `objects.inv` defines (see {@link readSphinxInventory}). */
  inventoryLabels?: Iterable<string>;
}

export interface SphinxInventory {
  /** `std:label` names, normalized. */
  labels: Set<string>;
  /** `std:doc` names (docnames). */
  docs: Set<string>;
}

/**
 * Parse a Sphinx `objects.inv` (version 2): four header lines, then zlib-compressed lines of
 * `name domain:role priority uri dispname`. Names may contain spaces, so each line is read
 * from the right.
 */
export function parseSphinxInventory(data: Buffer): SphinxInventory {
  let offset = 0;
  const header: string[] = [];
  while (header.length < 4) {
    const end = data.indexOf(0x0a, offset);
    if (end === -1) throw new Error('objects.inv: truncated header');
    header.push(data.subarray(offset, end).toString('utf-8'));
    offset = end + 1;
  }
  if (!header[0].startsWith('# Sphinx inventory version 2')) {
    throw new Error(`objects.inv: unsupported header "${header[0]}"`);
  }
  const body = inflateSync(data.subarray(offset)).toString('utf-8');
  const labels = new Set<string>();
  const docs = new Set<string>();
  for (const line of body.split('\n')) {
    const m = /^(.+?)\s+(\S+:\S+)\s+(-?\d+)\s+(\S+)\s+(.*)$/.exec(line);
    if (!m) continue;
    if (m[2] === 'std:label') labels.add(normalizeRstLabel(m[1]));
    else if (m[2] === 'std:doc') docs.add(m[1]);
  }
  return { labels, docs };
}

/** Read and parse an `objects.inv` file. */
export function readSphinxInventory(path: string): SphinxInventory {
  return parseSphinxInventory(readFileSync(path));
}

/**
 * Resolves `:ref:` targets the way a Sphinx build does: explicit labels, `:name:` options,
 * built-in labels, `autosectionlabel` targets, labels from a built inventory, and labels the
 * build generates (`ignoreLabels`).
 */
export function sphinxRefs(options: SphinxRefOptions = {}): RefResolverFactory {
  const ignore = (options.ignoreLabels ?? []).map((p) => new RegExp(p));
  return {
    prepare(docs: SourceDoc[], docsRoot: string): RefResolver {
      const defined = new Set<string>(SPHINX_BUILT_IN_LABELS);
      for (const label of options.inventoryLabels ?? []) defined.add(normalizeRstLabel(label));
      for (const doc of docs) {
        for (const a of doc.anchors) if (a.origin !== 'heading') defined.add(a.id);
      }
      const auto = options.autosectionlabel;
      if (auto) {
        const maxDepth = auto.maxDepth ?? 0;
        for (const doc of docs) {
          const docname = rstDocname(doc.path, docsRoot).toLowerCase();
          for (const h of doc.headings) {
            if (maxDepth > 0 && h.level > maxDepth) continue;
            const name = normalizeRstLabel(h.plain);
            defined.add(auto.prefixDocument ? `${docname}:${name}` : name);
          }
        }
      }
      return {
        resolves(link) {
          const target = normalizeRstLabel(link.target);
          return defined.has(target) || ignore.some((re) => re.test(target));
        },
      };
    },
  };
}
