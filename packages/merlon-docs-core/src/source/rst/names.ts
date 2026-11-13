import { extname, relative, sep } from 'node:path';

/** Sphinx label and reference normal form: lowercase, whitespace collapsed. */
export function normalizeRstLabel(text: string): string {
  return text.trim().split(/\s+/).join(' ').toLowerCase();
}

/** RST source extensions a document name may omit, most likely first. */
export const RST_EXTENSIONS = ['.rst', '.txt'];

/** Docname of an RST path: docs-root-relative POSIX path without its extension. */
export function rstDocname(absPath: string, docsRoot: string): string {
  const name = relative(docsRoot, absPath).split(sep).join('/');
  const ext = extname(name);
  return RST_EXTENSIONS.includes(ext) ? name.slice(0, -ext.length) : name;
}
