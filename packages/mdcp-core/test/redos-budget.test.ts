import { describe, it, expect } from 'vitest';
import { mkdirSync, writeFileSync } from 'node:fs';
import { join } from 'node:path';
import { stripExplicitAnchorMarkers } from '../src/compile/anchors.js';
import { headingTextToPlain } from '../src/refs/slugs.js';
import { demoteExceptFirstH1, demoteHeadings } from '../src/compile/headings.js';
import { lineRangeFromText } from '../src/compile/hooks/line-range.js';
import { isPathClaim, probePathClaims } from '../src/validate/path-probe.js';
import { enUS } from '../src/locale/index.js';
import { lintCompiledLinks } from '../src/links/validate-compiled.js';
import { linkedSectionFiles, sectionFiles } from '../src/compile/section-manifest.js';
import { applyCompileHooks } from '../src/compile/hooks.js';
import '../src/compile/hooks/builtin.js';
import { manySpaces, nestedOpenAnchors, timeMs, trailingSlashRun } from './helpers/redos-pumps.js';
import { useTmpDir } from './helpers/tmp-dir.js';

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
const CRLF_FENCE_RUN = 15_000;
const OPEN_FILE_LINKS = 400;
const OPEN_SLUG_LINKS = 10_000;
const SHARED_CLOSE_LINKS = 4_000;
const DOTDOT_LABELS = 8_000;
const SHARED_LABEL_END = 40_000;
const SHARED_TARGET_END = 8_000;

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

  // A fence regex that ends in `(.*)$` without the `m` flag fails at the carriage return of a CRLF
  // line and gives the backtick run back one character at a time, rescanning the rest each time.
  it('demoteHeadings stays under budget on a CRLF line of backticks', () => {
    const input = '`'.repeat(CRLF_FENCE_RUN) + '\r\n# Title\r\n';
    const ms = timeMs(() => {
      demoteHeadings(input);
    });
    expect(ms).toBeLessThan(BUDGET_MS);
  });

  it('demoteExceptFirstH1 stays under budget on a CRLF line of backticks', () => {
    const input = '`'.repeat(CRLF_FENCE_RUN) + '\r\n# Title\r\n';
    const ms = timeMs(() => {
      demoteExceptFirstH1(input);
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

// The link scans of compile read a whole manifest or shard, and a `[^)]` run crosses lines, so
// line length doesn't bound them. Each crafted text below leaves every link target without a `)`.
describe('ReDoS budget for the link scans of compile', () => {
  const work = useTmpDir('mdcp-redos-');

  // Each `.md#` can end a link path, and the fragment after it reads on to the next `)`, so a
  // regex tries every `.md` in the rest of the text from each `[`.
  it('linkedSectionFiles stays under budget on a shard of links with no closing parenthesis', () => {
    writeFileSync(join(work.path, 'index.md'), '# Guide\n\n- [A](a.md)\n');
    writeFileSync(join(work.path, 'a.md'), '# A\n\n' + 'See [x](a.md#\n'.repeat(OPEN_FILE_LINKS));
    const ms = timeMs(() => {
      linkedSectionFiles(work.path);
    });
    expect(ms).toBeLessThan(BUDGET_MS);
  });

  it('sectionFiles stays under budget on a manifest of slug links with no closing parenthesis', () => {
    writeFileSync(join(work.path, 'index.md'), '# Guide\n\n' + '](#'.repeat(OPEN_SLUG_LINKS));
    const ms = timeMs(() => {
      sectionFiles(work.path);
    });
    expect(ms).toBeLessThan(BUDGET_MS);
  });

  const insertCtx = () => {
    const guideDir = join(work.path, 'review');
    mkdirSync(guideDir, { recursive: true });
    return {
      guideName: 'review',
      filename: 'claim.md',
      sourceFile: join(guideDir, 'claim.md'),
      config: { guides: [{ name: 'review' }] } as never,
    };
  };

  it('the inlineInserts hook stays under budget on a body of insert links with no closing parenthesis', () => {
    const ctx = insertCtx();
    const body = '[x](diagrams/a.md#'.repeat(OPEN_FILE_LINKS);
    const ms = timeMs(() => {
      applyCompileHooks(body, ctx, ['inlineInserts']);
    });
    expect(ms).toBeLessThan(BUDGET_MS);
  });

  // The cases below close each target, so the scans walk every `[`. Each scan keeps the next `]`
  // and `)` it found, the label end whose target it turned down, and the `.md` it found before a
  // `)`. A scan that searched again for any of them would reread the rest of the text each time.
  it('linkedSectionFiles stays under budget on a shard of links that share one closing parenthesis', () => {
    writeFileSync(join(work.path, 'index.md'), '# Guide\n\n- [A](a.md)\n');
    writeFileSync(join(work.path, 'a.md'), '# A\n\n' + '[a](b'.repeat(SHARED_CLOSE_LINKS) + ')\n');
    const ms = timeMs(() => {
      linkedSectionFiles(work.path);
    });
    expect(ms).toBeLessThan(BUDGET_MS);
  });

  it('the inlineInserts hook stays under budget on labels that share a target of ../ runs', () => {
    const ctx = insertCtx();
    const body = '['.repeat(DOTDOT_LABELS) + '](' + '../'.repeat(DOTDOT_LABELS) + ')';
    const ms = timeMs(() => {
      applyCompileHooks(body, ctx, ['inlineInserts']);
    });
    expect(ms).toBeLessThan(BUDGET_MS);
  });

  // indexOf passes over each run of x in native code, which coverage doesn't instrument. The runs
  // make a scan that searched again for the next `]` or `)` from each `[` read far more text, while
  // one that keeps its answers takes the same steps per `[`, so the case stays fast under coverage.
  it('the inlineInserts hook stays under budget on links that share a label end or a target end', () => {
    const ctx = insertCtx();
    const labels = ('[' + 'x'.repeat(20)).repeat(SHARED_LABEL_END) + '](../)';
    const targets = ('[](../../' + 'x'.repeat(440)).repeat(SHARED_TARGET_END) + ')';
    const body = labels + targets;
    const ms = timeMs(() => {
      applyCompileHooks(body, ctx, ['inlineInserts']);
    });
    expect(ms).toBeLessThan(BUDGET_MS);
  });
});
