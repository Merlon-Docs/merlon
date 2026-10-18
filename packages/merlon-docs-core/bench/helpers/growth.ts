import { expect } from 'vitest';

/** Input grows by this factor between the two timed sizes. */
export const GROWTH_FACTOR = 4;

/**
 * Most the time may grow for {@link GROWTH_FACTOR}× the input. A linear scan grows about 4×,
 * n log n about 5×, and the quadratic paths CodeQL's polynomial-ReDoS alerts describe about 16×.
 */
export const MAX_GROWTH = 10;

/** Times under this are noise, so the smaller run counts as at least this long. */
const FLOOR_MS = 1;

/**
 * Fastest of `runs` timed calls, in ms. The fastest run is the one least disturbed by a cold
 * start, garbage collection or other work on the machine.
 */
export function timeMs(fn: () => void, runs = 5): number {
  let best = Infinity;
  for (let i = 0; i < runs; i++) {
    const start = performance.now();
    fn();
    best = Math.min(best, performance.now() - start);
  }
  return best;
}

/**
 * How many times longer `make(n)` runs than `make(n / GROWTH_FACTOR)`. `make` builds the input
 * for a size and returns the call to time, so building the input isn't timed.
 */
export function growth(make: (n: number) => () => void, n: number): number {
  const small = make(Math.max(1, Math.floor(n / GROWTH_FACTOR)));
  const large = make(n);
  small();
  large();
  return timeMs(large) / Math.max(timeMs(small), FLOOR_MS);
}

/**
 * Fails when the time for `make(n)` grows more than {@link MAX_GROWTH}× over `make(n / 4)`.
 * Pick `n` so that a quadratic path takes well over a second at `n` and a linear one a few
 * milliseconds; the ratio, not the machine's speed, decides the result.
 *
 * When the input's length doesn't grow in step with `n`, pass `size`, which gives the input's
 * length for a given `n`. The limit then scales with the input's own growth, at the same
 * 2.5× headroom over linear.
 */
export function expectLinearGrowth(
  make: (n: number) => () => void,
  n: number,
  size: (n: number) => number = (m) => m,
): void {
  const small = Math.max(1, Math.floor(n / GROWTH_FACTOR));
  const inputGrowth = size(n) / size(small);
  const limit = (MAX_GROWTH / GROWTH_FACTOR) * inputGrowth;
  const ratio = growth(make, n);
  expect(
    ratio,
    `time grew ${ratio.toFixed(1)}× for ${inputGrowth.toFixed(1)}× the input (n=${n})`,
  ).toBeLessThan(limit);
}
