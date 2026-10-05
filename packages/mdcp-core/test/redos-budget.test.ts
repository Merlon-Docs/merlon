import { describe, it, expect } from 'vitest';
import { stripExplicitAnchorMarkers } from '../src/compile/anchors.js';
import { headingTextToPlain } from '../src/refs/slugs.js';
import { demoteHeadings } from '../src/compile/headings.js';
import { lineRangeFromText } from '../src/compile/hooks/line-range.js';
import { isPathClaim, probePathClaims } from '../src/validate/path-probe.js';
import { enUS } from '../src/locale/index.js';
import { lintCompiledLinks } from '../src/links/validate-compiled.js';
import { manySpaces, nestedOpenAnchors, timeMs, trailingSlashRun } from './helpers/redos-pumps.js';

/** Tight budget: safe linear parsers finish well under this; polynomial paths blow it. */
const BUDGET_MS = 50;
const SPACE_N = 40_000;
const ANCHOR_N = 25_000;
const SLASH_N = 20_000;
const BACKTICK_RUNS = 600;
const MARKED_HEADINGS = 2_000;
const LINE_MARKERS = 20_000;
const MARKER_PARTS = 80;
const MARKER_STARTS = 5_000;
const MARKER_LINE_LINKS = 2_000;

describe('ReDoS budget demos (CodeQL js/polynomial-redos)', () => {
  it('stripExplicitAnchorMarkers stays under budget on long leading spaces + incomplete {#', () => {
    // Alert #1 class: \s* before {#…}
    const input = manySpaces(SPACE_N) + '{#';
    const ms = timeMs(() => {
      stripExplicitAnchorMarkers(input);
    });
    expect(ms).toBeLessThan(BUDGET_MS);
  });

  it('stripExplicitAnchorMarkers stays under budget on a heading line with long spaces + incomplete {#', () => {
    const input = '## Heading `x`' + manySpaces(SPACE_N) + '{#';
    const ms = timeMs(() => {
      stripExplicitAnchorMarkers(input);
    });
    expect(ms).toBeLessThan(BUDGET_MS);
  });

  // Backtick runs of falling length never close each other, so a scanner that searches ahead
  // for each run's closer rescans the rest of the line every time.
  it('stripExplicitAnchorMarkers stays under budget on unmatched backtick runs', () => {
    const runs: string[] = [];
    for (let len = BACKTICK_RUNS; len > 0; len--) runs.push('`'.repeat(len));
    const input = 'x' + runs.join(' ') + ' {#';
    const ms = timeMs(() => {
      stripExplicitAnchorMarkers(input);
    });
    expect(ms).toBeLessThan(BUDGET_MS);
  });

  // Each removed marker trims the text before it. Over a whole document that cost grows with
  // markers times length; line by line it stays linear.
  it('stripExplicitAnchorMarkers stays under budget on many marked headings', () => {
    const input = ('Prose. '.repeat(25) + '\n\n## Heading {#id}\n\n').repeat(MARKED_HEADINGS);
    const ms = timeMs(() => {
      stripExplicitAnchorMarkers(input);
    });
    expect(ms).toBeLessThan(BUDGET_MS);
  });

  // Each removed marker trims the whitespace before it. A strip that reads the end of the output
  // built so far copies that whole output once per marker on a long line.
  it('stripExplicitAnchorMarkers stays under budget on a line of many markers between words', () => {
    const input = 'text ' + 'a{#x}'.repeat(LINE_MARKERS) + ' b {#y}'.repeat(LINE_MARKERS);
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

  // The en-US marker template has a variable between each two of its five literal parts. With
  // every copy of each part after the copies of the part before it, and no `)` after the last
  // `` ` ( ``, a regex with a lazy `.*?` for each variable tries every choice of where each one
  // ends before it fails.
  const crossedMarkerParts = (n: number) =>
    '**BROKEN LINK:** "' + '" (`'.repeat(n) + '`) → `'.repeat(n) + '` ('.repeat(n);

  it('lineHasMarker stays under budget on a line of crossed marker parts', () => {
    const input = crossedMarkerParts(MARKER_PARTS);
    const ms = timeMs(() => {
      enUS.brokenLinks.lineHasMarker(input);
    });
    expect(ms).toBeLessThan(BUDGET_MS);
  });

  it('findMarkers stays under budget on a line of crossed marker parts', () => {
    const input = crossedMarkerParts(MARKER_PARTS);
    const ms = timeMs(() => {
      enUS.brokenLinks.findMarkers?.(input);
    });
    expect(ms).toBeLessThan(BUDGET_MS);
  });

  // Each copy of the first part starts a search that finds the next three parts and then the last
  // one only after a line separator. A scan that searches again from each start for each part
  // rereads the rest of the line every time.
  const markerStarts = (n: number) =>
    '**BROKEN LINK:** "'.repeat(n) + '" (`' + '`) → `' + '` (' + '\u2028)';

  it('lineHasMarker stays under budget on a line of first parts whose last part follows a line separator', () => {
    const input = markerStarts(MARKER_STARTS);
    const ms = timeMs(() => {
      enUS.brokenLinks.lineHasMarker(input);
    });
    expect(ms).toBeLessThan(BUDGET_MS);
  });

  it('findMarkers stays under budget on a line of first parts whose last part follows a line separator', () => {
    const input = markerStarts(MARKER_STARTS);
    const ms = timeMs(() => {
      enUS.brokenLinks.findMarkers?.(input);
    });
    expect(ms).toBeLessThan(BUDGET_MS);
  });

  // Link lint skips each link on a line that holds a marker, so it asks about that line once for
  // each of its links. A marker search whose cost grows with the line, even when the marker comes
  // first, makes that cost grow with the line times its links.
  const markerLine = (markerFirst: boolean) => {
    const marker = enUS.brokenLinks.formatMarker('a', '#b', '#b', 'dead anchor');
    const links = ' [a](#t)'.repeat(MARKER_LINE_LINKS);
    return markerFirst ? marker + links : links + ' ' + marker;
  };

  it('lineHasMarker stays under budget when asked once per link about a long line', () => {
    const input = markerLine(true);
    const ms = timeMs(() => {
      for (let i = 0; i < MARKER_LINE_LINKS; i++) enUS.brokenLinks.lineHasMarker(input);
    });
    expect(ms).toBeLessThan(BUDGET_MS);
  });

  it('lintCompiledLinks stays under budget on a line with a marker after many links', () => {
    const markdown = '# T\n\n' + markerLine(false) + '\n';
    const ms = timeMs(() => {
      lintCompiledLinks({ markdown, outputFile: '/x/out.md', guideName: 'g' });
    });
    expect(ms).toBeLessThan(BUDGET_MS);
  });
});
