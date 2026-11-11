import type { SourceDoc } from './model.js';

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
}
