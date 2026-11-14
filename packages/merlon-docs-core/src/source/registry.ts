import type { SourceFormat } from './format.js';
import { gfmFormat } from './gfm/reader.js';
import { htmlFormat } from './html/reader.js';
import { manFormat } from './man/reader.js';
import { rstFormat } from './rst/reader.js';
import { textFormat } from './text/reader.js';

/** Built-in formats, present without any registration call (no import side effects). */
const BUILT_IN_FORMATS: SourceFormat[] = [gfmFormat, rstFormat, textFormat, manFormat, htmlFormat];

const registry = new Map<string, SourceFormat>(BUILT_IN_FORMATS.map((f) => [f.id, f]));

/** Register a format by id. Registering an id twice replaces the earlier bundle. */
export function registerFormat(format: SourceFormat): void {
  registry.set(format.id, format);
}

/** The format registered under `id`. Throws, listing the known ids, when there is none. */
export function getFormat(id: string): SourceFormat {
  const format = registry.get(id);
  if (!format) {
    throw new Error(`Unknown source format "${id}". Known formats: ${listFormats().join(', ')}`);
  }
  return format;
}

/** Ids of every registered format, sorted. */
export function listFormats(): string[] {
  return [...registry.keys()].sort();
}
