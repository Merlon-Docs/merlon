/** ATX-specific parse result (GFM ATX subset). Prefer {@link parseHeading} at call sites. */
export interface AtxHeading {
  level: number;
  marker: string;
  whitespace: string;
  title: string;
}

/** Parse one ATX heading line (`#`–`######` + space/tab + title). */
export function parseAtxHeading(line: string): AtxHeading | null {
  let i = 0;
  while (i < line.length && line[i] === '#' && i < 6) i++;
  if (i === 0) return null;
  const level = i;
  if (i >= line.length || (line[i] !== ' ' && line[i] !== '\t')) return null;
  const wsStart = i;
  while (i < line.length && (line[i] === ' ' || line[i] === '\t')) i++;
  return {
    level,
    marker: line.slice(0, level),
    whitespace: line.slice(wsStart, i),
    title: line.slice(i),
  };
}

export function isAtxHeading(line: string): boolean {
  return parseAtxHeading(line) !== null;
}
