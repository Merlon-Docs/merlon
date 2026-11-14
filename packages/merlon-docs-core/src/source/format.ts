import type { DocLink, SourceDoc } from './model.js';

/** What a reader knows about the document beyond its text. */
export interface ReadContext {
  /** Absolute path of the document. */
  path: string;
  /** The guide's manifest file name, for formats whose index is named by config (GFM). */
  manifest?: string;
}

/** Turns one format's source text into a {@link SourceDoc}. It parses; it never decides findings. */
export interface SourceReader {
  read(text: string, context: ReadContext): SourceDoc;
}

/**
 * A registered format. A bundle supplies only what its format has: every format has a reader;
 * anchor and reference handling are added by the formats that define them.
 */
export interface SourceFormat {
  /** Id used in config `sources[].format`, such as `gfm`. */
  id: string;
  /** Human name for messages, such as `GitHub Flavored Markdown`. */
  name: string;
  reader: SourceReader;
  /** How the format names other files. Without one, targets resolve as plain relative paths. */
  locator?: TargetLocator;
  /** How the format resolves label references. Without one, labels match explicit anchors only. */
  refs?: RefResolverFactory;
}

/** Where a reference points from: the document and the docs root it lives under. */
export interface LocateContext {
  /** Absolute path of the referring document. */
  from: string;
  /** Absolute docs root, for targets the format writes from the root (RST `/path`). */
  docsRoot: string;
}

/**
 * Turns a target as written (a toctree entry, an include, a `doc` or `file` link) into the
 * absolute paths it may name, most likely first. The first one that exists wins.
 */
export interface TargetLocator {
  candidates(
    target: string,
    kind: 'toc' | 'include' | 'file' | 'doc',
    context: LocateContext,
  ): string[];
  /**
   * For glob manifest entries: the document name a path is matched under (RST matches
   * `:glob:` patterns against docnames, which have no extension). Defaults to the path itself.
   */
  globName?(absPath: string): string;
}

/** Answers whether a `label` link resolves anywhere in the tree. */
export interface RefResolver {
  resolves(link: DocLink, from: SourceDoc): boolean;
}

/** Builds a {@link RefResolver} once all documents of a format have been read. */
export interface RefResolverFactory {
  prepare(docs: SourceDoc[], docsRoot: string): RefResolver;
}
