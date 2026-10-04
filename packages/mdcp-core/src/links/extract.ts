/** Match markdown links but not images `![alt](url)`. */
export const MD_LINK_RE = /(?<!!)\[([^\]]*)\]\(([^)]+)\)/g;

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

/** Extract markdown links with 1-based line numbers; skip fenced and inline code. */
export function extractLinks(markdown: string): ExtractedLink[] {
  const links: ExtractedLink[] = [];
  const lines = markdown.split('\n');
  let inFence = false;
  let lineStart = 0;

  for (let i = 0; i < lines.length; i++) {
    const line = lines[i];
    const lineOffset = lineStart;
    lineStart += line.length + 1;
    const stripped = line.trim();
    if (stripped.startsWith('```')) {
      inFence = !inFence;
      continue;
    }
    if (inFence) continue;

    const masked = maskInlineCode(line);
    for (const m of masked.matchAll(MD_LINK_RE)) {
      const target = m[2].trim();
      if (target.startsWith('mailto:')) continue;
      links.push({
        label: m[1],
        target,
        line: i + 1,
        match: m[0],
        offset: lineOffset + m.index,
      });
    }
  }

  return links;
}
