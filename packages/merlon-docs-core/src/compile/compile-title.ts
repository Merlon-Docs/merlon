import { isHeading, parseHeading, splitTrailingPandocAnchor } from '../markdown/index.js';

export function extractFirstHeading(body: string): {
  text: string | null;
  anchor: string | null;
} {
  const trimmed = body.trimStart();
  const newline = trimmed.indexOf('\n');
  const firstLine = newline === -1 ? trimmed : trimmed.slice(0, newline);
  const parsed = parseHeading(firstLine);
  if (!parsed) return { text: null, anchor: null };
  const { text, anchor } = splitTrailingPandocAnchor(parsed.title);
  return { text: text || null, anchor };
}

export function stripFirstHeadingLine(body: string): string {
  const lines = body.split('\n');
  if (lines.length === 0) return body;
  if (isHeading(lines[0])) {
    return lines.slice(1).join('\n').trimStart();
  }
  return body;
}

export function formatCompileTitle(title: string): string {
  return `## ${title}`;
}
