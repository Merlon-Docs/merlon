import { createCodeFenceScanner, formatHeadingAsAtx, parseHeading } from '../markdown/index.js';
import { formatCompileTitle } from './compile-title.js';
import { getLocalePack } from '../locale/index.js';
import type { LocalePack } from '../locale/types.js';

function demoteLine(line: string, levels: number): string {
  const m = parseHeading(line);
  if (!m) return line;
  return formatHeadingAsAtx(m, Math.min(m.level + levels, 6));
}

/**
 * `mapFn` applied to each line of `text` outside fenced code blocks. A new
 * `createCodeFenceScanner`, the scan the slug registry's heading reader runs, finds the fences in
 * `text`. A text that ends with a newline gets one more, so the result ends with a blank line.
 * The monolith demotes each copy of a guide after the first, so that blank line follows each of
 * those copies, and dropping it would change the monolith. `monolithGuideFirstLines` counts the
 * lines of the same demoted text, so it would stay right either way.
 */
function mapLinesPreservingFences(text: string, mapFn: (line: string) => string): string {
  const inFence = createCodeFenceScanner();
  let body = text
    .split('\n')
    .map((line) => (inFence(line) ? line : mapFn(line)))
    .join('\n');
  if (text.endsWith('\n')) body += '\n';
  return body;
}

export function demoteHeadings(text: string, levels = 1): string {
  return mapLinesPreservingFences(text, (line) => demoteLine(line, levels));
}

export function demoteExceptFirstH1(text: string): string {
  let keptFirstH1 = false;
  return mapLinesPreservingFences(text, (line) => {
    const m = parseHeading(line);
    if (m && m.level === 1 && !keptFirstH1) {
      keptFirstH1 = true;
      return line;
    }
    return m ? demoteLine(line, 1) : line;
  });
}

export function stripAboutThisGuideHeading(
  text: string,
  locale: LocalePack = getLocalePack(),
): string {
  const aboutTitle = locale.aboutThisGuideTitle.trim().toLowerCase();
  const lines = text.split('\n');
  let i = 0;
  while (i < lines.length && !lines[i].trim()) i++;
  if (aboutTitle && i < lines.length) {
    const parsed = parseHeading(lines[i].trim());
    if (parsed?.level === 1 && parsed.title.trim().toLowerCase() === aboutTitle) {
      i++;
      while (i < lines.length && !lines[i].trim()) i++;
    }
  }
  const body = lines.slice(i).join('\n').trim();
  return body ? body + '\n\n' : '';
}

export function extractGuideH1(indexText: string): string | null {
  for (const line of indexText.split('\n')) {
    if (line.startsWith('# ') && !line.startsWith('## ')) {
      return line.trimEnd() + '\n\n';
    }
  }
  return null;
}

/**
 * The heading line assembleGuide writes before the first section: `compile.title` as an H2, else
 * the manifest's first H1. Null when the guide gets neither.
 */
export function guideLeadHeading(indexText: string, title?: string): string | null {
  if (title) return formatCompileTitle(title);
  return extractGuideH1(indexText)?.trimEnd() ?? null;
}
