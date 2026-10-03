import { describe, it, expect } from 'vitest';
import { stripExplicitAnchorMarkers } from '../src/compile/anchors.js';
import { headingTextToPlain } from '../src/refs/slugs.js';
import { demoteHeadings } from '../src/compile/headings.js';
import { lineRangeFromText } from '../src/compile/hooks/line-range.js';
import { isPathClaim, probePathClaims } from '../src/validate/path-probe.js';
import { manySpaces, nestedOpenAnchors, timeMs, trailingSlashRun } from './helpers/redos-pumps.js';

/** Tight budget: safe linear parsers finish well under this; polynomial paths blow it. */
const BUDGET_MS = 50;
const SPACE_N = 40_000;
const ANCHOR_N = 25_000;
const SLASH_N = 20_000;

describe('ReDoS budget demos (CodeQL js/polynomial-redos)', () => {
  it('stripExplicitAnchorMarkers stays under budget on long leading spaces + incomplete {#', () => {
    // Alert #1 class: \s* before {#…}
    const input = manySpaces(SPACE_N) + '{#';
    const ms = timeMs(() => {
      stripExplicitAnchorMarkers(input);
    });
    expect(ms).toBeLessThan(BUDGET_MS);
  });

  it('headingTextToPlain stays under budget on nested {{# pumps', () => {
    // Alerts #4/#6 class: \{#.*?\}
    const input = nestedOpenAnchors(ANCHOR_N);
    const ms = timeMs(() => {
      headingTextToPlain(input);
    });
    expect(ms).toBeLessThan(BUDGET_MS);
  });

  it('demoteHeadings stays under budget on long whitespace after hashes', () => {
    // Alerts #2/#3/#5 class: heading \s+ + rest
    const input = '#' + manySpaces(SPACE_N) + 'Title';
    const ms = timeMs(() => {
      demoteHeadings(input);
    });
    expect(ms).toBeLessThan(BUDGET_MS);
  });

  it('lineRangeFromText stays under budget on long spaces in almost-ranges', () => {
    const input = '1' + manySpaces(SPACE_N) + '-' + manySpaces(SPACE_N) + 'x';
    const ms = timeMs(() => {
      lineRangeFromText(input);
    });
    expect(ms).toBeLessThan(BUDGET_MS);
  });

  it('lineRangeFromText stays under budget on long spaces after lines', () => {
    const input = 'lines' + manySpaces(SPACE_N) + 'x';
    const ms = timeMs(() => {
      lineRangeFromText(input);
    });
    expect(ms).toBeLessThan(BUDGET_MS);
  });

  // A backtick span is documentation text, so a span of slashes reaches
  // isPathClaim as-is. The regex forms this replaced took 138 ms at this n.
  it('isPathClaim stays under budget on a long trailing slash run', () => {
    const input = trailingSlashRun(SLASH_N);
    const ms = timeMs(() => {
      isPathClaim(input);
    });
    expect(ms).toBeLessThan(BUDGET_MS);
  });

  it('declaration matching stays under budget on a long trailing slash run', () => {
    const ms = timeMs(() => {
      probePathClaims('/x/shard.md', 'See `docs/a.md`.\n', {
        searchRoots: [],
        generated: [trailingSlashRun(SLASH_N)],
        vocabulary: [trailingSlashRun(SLASH_N)],
      });
    });
    expect(ms).toBeLessThan(BUDGET_MS);
  });
});
