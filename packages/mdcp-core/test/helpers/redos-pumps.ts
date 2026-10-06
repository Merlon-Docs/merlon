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

/**
 * Fastest of `runs` timed calls, in ms. A linear scanner gets under a budget on at least one
 * run even when the first call is cold or other test files load the machine; a polynomial one
 * misses it on every run.
 */
export function timeMs(fn: () => void, runs = 3): number {
  let best = Infinity;
  for (let i = 0; i < runs; i++) {
    const start = performance.now();
    fn();
    best = Math.min(best, performance.now() - start);
  }
  return best;
}
