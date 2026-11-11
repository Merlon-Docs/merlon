/**
 * The format-neutral document model (ADR 0008). A format's reader turns source text into a
 * {@link SourceDoc}; review and check passes read only this model, never format syntax.
 */

/** A heading or document title. `line` is 1-based. */
export interface DocHeading {
  /** Title as written in the source (inline markup kept, trimmed). */
  text: string;
  /** Title as plain text: inline markup removed, for comparison. */
  plain: string;
  /** 1 is the document title level; deeper sections count up. */
  level: number;
  line: number;
}

/** A unit of prose, such as a paragraph or one list item. Code and literal blocks never appear. */
export interface DocParagraph {
  /** First source line of the unit, 1-based. */
  line: number;
  /** Prose as plain text, whitespace collapsed to single spaces where the reader joins lines. */
  plain: string;
}

/**
 * What a link points at.
 * - `file`: another file by path (a Markdown link to a shard, an RST include).
 * - `doc`: another document by name, with the extension left off (RST `:doc:`).
 * - `anchor`: a fragment in the same document.
 * - `label`: a named target anywhere in the tree (RST `:ref:`).
 * - `manpage`: a man page by name and section, such as `open(2)`.
 * - `external`: a URL.
 */
export type DocLinkKind = 'file' | 'doc' | 'anchor' | 'label' | 'manpage' | 'external';

export interface DocLink {
  kind: DocLinkKind;
  /** Target as written, whitespace normalized. For `file` links, without the fragment. */
  target: string;
  /** Fragment after `#`, when the format has one. */
  fragment?: string;
  line: number;
}

/** Where an anchor comes from: a heading, an explicit label, a directive option, or the build. */
export type AnchorOrigin = 'heading' | 'label' | 'name' | 'generated';

export interface DocAnchor {
  id: string;
  line: number;
  origin: AnchorOrigin;
}

/**
 * One reachability edge declared by the document: a table-of-contents entry or an include.
 * `group` names the index group the entry belongs to, in words a report can print
 * (for GFM, the enclosing `##` heading; for RST, the toctree caption).
 */
export interface ManifestEntry {
  /** Target as written. Resolved by the format, relative to the document or the docs root. */
  target: string;
  /** Absolute path the target resolves to, when the reader can resolve it without globbing. */
  resolved?: string;
  line: number;
  group: string;
  kind: 'toc' | 'include';
  /** True when `target` is a glob pattern (RST `:glob:` toctrees). */
  glob?: boolean;
}

export interface SourceDoc {
  /** Absolute path the document was read from. */
  path: string;
  /** Format id, such as `gfm`. */
  format: string;
  /** True when this document is an index: its manifest entries count toward `index-size`. */
  isIndex: boolean;
  /** The document title: the first level-1 heading, or null. */
  title: DocHeading | null;
  headings: DocHeading[];
  paragraphs: DocParagraph[];
  /** Prose words, with code, literal blocks, markup and link targets excluded. */
  proseWords: number;
  links: DocLink[];
  anchors: DocAnchor[];
  manifest: ManifestEntry[];
  /** True when the document says it is intentionally unreachable (RST `:orphan:`). */
  orphanOk: boolean;
}
