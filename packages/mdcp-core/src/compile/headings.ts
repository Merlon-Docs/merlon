import { formatHeadingAsAtx, parseHeading } from '../markdown/index.js';
import { formatCompileTitle } from './compile-title.js';
import { getLocalePack } from '../locale/index.js';
import type { LocalePack } from '../locale/types.js';

const FENCE_RE = /^(`{3,}|~{3,})(.*)$/;

function demoteLine(line: string, levels: number): string {
  const m = parseHeading(line);
  if (!m) return line;
  return formatHeadingAsAtx(m, Math.min(m.level + levels, 6));
}

function mapLinesPreservingFences(text: string, mapFn: (line: string) => string): string {
  const lines = text.split('\n');
  const endsWithNewline = text.endsWith('\n');
  const out: string[] = [];
  let inFence = false;
  let fenceChar = '';

  for (const line of lines) {
    const fenceMatch = line.match(FENCE_RE);
    if (fenceMatch) {
      const marker = fenceMatch[1];
      if (!inFence) {
        inFence = true;
        fenceChar = marker[0];
      } else if (marker[0] === fenceChar) {
        inFence = false;
        fenceChar = '';
      }
      out.push(line);
      continue;
    }

    out.push(inFence ? line : mapFn(line));
  }

  let body = out.join('\n');
  if (endsWithNewline) body += '\n';
  return body;
}

export function demoteHeadings(text: string, levels = 1): string {
  return mapLinesPreservingFences(text, (line) => demoteLine(line, levels));
}

export function demoteExceptFirstH1(text: string): string {
  const lines = text.split('\n');
  const endsWithNewline = text.endsWith('\n');
  let keptFirstH1 = false;
  let inFence = false;
  let fenceChar = '';
  const out: string[] = [];

  for (const line of lines) {
    const fenceMatch = line.match(FENCE_RE);
    if (fenceMatch) {
      const marker = fenceMatch[1];
      if (!inFence) {
        inFence = true;
        fenceChar = marker[0];
      } else if (marker[0] === fenceChar) {
        inFence = false;
        fenceChar = '';
      }
      out.push(line);
      continue;
    }

    if (inFence) {
      out.push(line);
      continue;
    }

    const m = parseHeading(line);
    if (m && m.level === 1 && !keptFirstH1) {
      keptFirstH1 = true;
      out.push(line);
      continue;
    }
    out.push(m ? demoteLine(line, 1) : line);
  }

  let body = out.join('\n');
  if (endsWithNewline) body += '\n';
  return body;
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
