import { parseAtxHeading, type AtxHeading } from './atx-heading.js';

/**
 * Recognized heading kinds. Only `atx` is implemented today; setext and fuller
 * GFM ATX edge cases are tracked under GFM scope docs.
 */
export type HeadingKind = 'atx';

/** Generic heading shape. ATX fields live under `atx` so other kinds can expand cleanly. */
export type Heading = {
  kind: 'atx';
  level: number;
  title: string;
  atx: Pick<AtxHeading, 'marker' | 'whitespace'>;
};

/** Parse a single-line heading (ATX kind only for now). */
export function parseHeading(line: string): Heading | null {
  const atx = parseAtxHeading(line);
  if (!atx) return null;
  return {
    kind: 'atx',
    level: atx.level,
    title: atx.title,
    atx: { marker: atx.marker, whitespace: atx.whitespace },
  };
}

export function isHeading(line: string): boolean {
  return parseHeading(line) !== null;
}

/** Format a recognized heading as an ATX line (demotion / emit path). */
export function formatHeadingAsAtx(heading: Heading, level = heading.level): string {
  const depth = Math.min(Math.max(level, 1), 6);
  if (heading.kind === 'atx') {
    return '#'.repeat(depth) + heading.atx.whitespace + heading.title;
  }
  return '#'.repeat(depth) + ' ' + heading.title;
}
