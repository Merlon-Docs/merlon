export function manySpaces(n: number): string {
  return ' '.repeat(n);
}

/** CodeQL pump class for \{#.*?\} — many '{{#' without closing brace. */
export function nestedOpenAnchors(n: number): string {
  return '{{#'.repeat(n);
}

/**
 * CodeQL pump class for a trailing-anchored slash run (`/\\/+$/`, `/\\/*$/`):
 * one long run of slashes followed by a character that defeats the anchor, so
 * every start position rescans the run. Measured quadratic in V8 — 138 ms at
 * n=20_000 and 5.2 s at n=120_000 against the regex forms.
 */
export function trailingSlashRun(n: number): string {
  return '/'.repeat(n) + 'a';
}

export function timeMs(fn: () => void): number {
  const start = performance.now();
  fn();
  return performance.now() - start;
}
