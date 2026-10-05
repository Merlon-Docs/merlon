import { scanInlineLinks } from '../compile/link-scan.js';
import { createQuotedFenceScanner } from '../markdown/index.js';

export interface ExtractedLink {
  label: string;
  target: string;
  line: number;
  /** Full markdown link match for replacement. */
  match: string;
  /** Offset of `match` in the markdown, counted in UTF-16 code units from 0. */
  offset: number;
}

/** Mask inline code spans so link regex does not match example syntax inside backticks. */
export function maskInlineCode(line: string): string {
  let out = '';
  let i = 0;
  while (i < line.length) {
    if (line[i] !== '`') {
      out += line[i];
      i++;
      continue;
    }
    let tickCount = 0;
    while (i < line.length && line[i] === '`') {
      tickCount++;
      i++;
    }
    const close = '`'.repeat(tickCount);
    const contentStart = i;
    const closeIdx = line.indexOf(close, contentStart);
    if (closeIdx === -1) {
      out += close;
      continue;
    }
    out += ' '.repeat(closeIdx + tickCount - (contentStart - tickCount));
    i = closeIdx + tickCount;
  }
  return out;
}

/**
 * Extract markdown links with 1-based line numbers. Skip fenced code, which
 * `createQuotedFenceScanner` finds in a blockquote too, and code spans.
 */
export function extractLinks(markdown: string): ExtractedLink[] {
  const links: ExtractedLink[] = [];
  const lines = markdown.split('\n');
  const inFence = createQuotedFenceScanner();
  let lineStart = 0;

  for (let i = 0; i < lines.length; i++) {
    const line = lines[i];
    const lineOffset = lineStart;
    lineStart += line.length + 1;
    if (inFence(line)) continue;

    const masked = maskInlineCode(line);
    // A link that isn't an image, with a target of at least one character.
    const found = scanInlineLinks(
      masked,
      (targetStart, close) => close > targetStart || undefined,
      {
        skipImages: true,
      },
    );
    for (const { start, labelEnd, close } of found) {
      const target = masked.slice(labelEnd + 2, close).trim();
      if (target.startsWith('mailto:')) continue;
      links.push({
        label: masked.slice(start + 1, labelEnd),
        target,
        line: i + 1,
        match: masked.slice(start, close + 1),
        offset: lineOffset + start,
      });
    }
  }

  return links;
}
