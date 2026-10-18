import { describe, it } from 'vitest';
import { mkdirSync, writeFileSync } from 'node:fs';
import { join } from 'node:path';
import { stripExplicitAnchorMarkers } from '../src/compile/anchors.js';
import { headingTextToPlain } from '../src/refs/slugs.js';
import { demoteExceptFirstH1, demoteHeadings } from '../src/compile/headings.js';
import { lineRangeFromText } from '../src/compile/hooks/line-range.js';
import { isPathClaim, probePathClaims } from '../src/validate/path-probe.js';
import { shardLintPaths } from '../src/config/load.js';
import { symbolFromLabel } from '../src/compile/hooks/code-evidence.js';
import { enUS } from '../src/locale/index.js';
import { lintCompiledLinks } from '../src/links/validate-compiled.js';
import { linkedSectionFiles, sectionFiles } from '../src/compile/section-manifest.js';
import { applyCompileHooks } from '../src/compile/hooks.js';
import '../src/compile/hooks/builtin.js';
import { extractLinks } from '../src/links/extract.js';
import {
  rewriteCrossGuideFileLinks,
  rewriteIntraGuideFileLinks,
  rewritePublishRelativeLinks,
} from '../src/compile/publish-links.js';
import { compileGuideResults } from '../src/compile/assemble.js';
import { expectLinearGrowth } from './helpers/growth.js';
import { manySpaces, nestedOpenAnchors, trailingSlashRun } from './helpers/redos-pumps.js';
import { useTmpDir } from '../test/helpers/tmp-dir.js';

const SPACE_N = 40_000;
const ANCHOR_N = 25_000;
const SLASH_N = 20_000;
const BACKTICK_RUNS = 600;
const MARKED_HEADINGS = 2_000;
const LINE_MARKERS = 20_000;
const MARKER_PARTS = 80;
const MARKER_STARTS = 5_000;
const MARKER_LINE_LINKS = 2_000;
const QUOTE_LINE_MARKERS = 10_000;
const CRLF_FENCE_RUN = 15_000;
const LABEL_BACKTICKS = 20_000;
const OPEN_FILE_LINKS = 400;
const OPEN_SLUG_LINKS = 10_000;
const SHARED_CLOSE_LINKS = 4_000;
const DOTDOT_LABELS = 8_000;
const SHARED_LABEL_END = 40_000;
const SHARED_TARGET_END = 8_000;
const LINE_LINKS = 8_000;
const SHARD_LINE_LINKS = 4_000;
const NESTED_IMAGES = 1_000;
// compileGuideResults reads the files, builds the slug registry, lints and marks on top of the
// hook, so its nested-image cases get a longer line. A reader that takes the square of the line
// takes seconds here.
const COMPILE_NESTED_IMAGES = 2_000;

describe('ReDoS growth (CodeQL js/polynomial-redos)', () => {
  it('stripExplicitAnchorMarkers grows linearly on long leading spaces + incomplete {#', () => {
    // Alert #1 class: \s* before {#…}
    expectLinearGrowth((n) => {
      const input = manySpaces(n) + '{#';
      return () => {
        stripExplicitAnchorMarkers(input);
      };
    }, SPACE_N);
  });

  it('stripExplicitAnchorMarkers grows linearly on a heading line with long spaces + incomplete {#', () => {
    expectLinearGrowth((n) => {
      const input = '## Heading `x`' + manySpaces(n) + '{#';
      return () => {
        stripExplicitAnchorMarkers(input);
      };
    }, SPACE_N);
  });

  // Backtick runs of falling length never close each other, so a scanner that searches ahead
  // for each run's closer rescans the rest of the line every time. n counts runs; runs from n
  // down to 1 hold n(n+1)/2 backticks, which `size` passes on.
  it('stripExplicitAnchorMarkers grows linearly on unmatched backtick runs', () => {
    expectLinearGrowth(
      (n) => {
        const runs: string[] = [];
        for (let len = n; len > 0; len--) runs.push('`'.repeat(len));
        const input = 'x' + runs.join(' ') + ' {#';
        return () => {
          stripExplicitAnchorMarkers(input);
        };
      },
      BACKTICK_RUNS,
      (n) => (n * (n + 1)) / 2,
    );
  });

  // Each removed marker trims the text before it. Over a whole document that cost grows with
  // markers times length; line by line it stays linear.
  it('stripExplicitAnchorMarkers grows linearly on many marked headings', () => {
    expectLinearGrowth((n) => {
      const input = ('Prose. '.repeat(25) + '\n\n## Heading {#id}\n\n').repeat(n);
      return () => {
        stripExplicitAnchorMarkers(input);
      };
    }, MARKED_HEADINGS);
  });

  // Each removed marker trims the whitespace before it. A strip that reads the end of the output
  // built so far copies that whole output once per marker on a long line.
  it('stripExplicitAnchorMarkers grows linearly on a line of many markers between words', () => {
    expectLinearGrowth((n) => {
      const input = 'text ' + 'a{#x}'.repeat(n) + ' b {#y}'.repeat(n);
      return () => {
        stripExplicitAnchorMarkers(input);
      };
    }, LINE_MARKERS);
  });

  it('headingTextToPlain grows linearly on nested {{# pumps', () => {
    // Alerts #4/#6 class: \{#.*?\}
    expectLinearGrowth((n) => {
      const input = nestedOpenAnchors(n);
      return () => {
        headingTextToPlain(input);
      };
    }, ANCHOR_N);
  });

  it('demoteHeadings grows linearly on long whitespace after hashes', () => {
    // Alerts #2/#3/#5 class: heading \s+ + rest
    expectLinearGrowth((n) => {
      const input = '#' + manySpaces(n) + 'Title';
      return () => {
        demoteHeadings(input);
      };
    }, SPACE_N);
  });

  // A fence regex that ends in `(.*)$` without the `m` flag fails at the carriage return of a CRLF
  // line and gives the backtick run back one character at a time, rescanning the rest each time.
  it('demoteHeadings grows linearly on a CRLF line of backticks', () => {
    expectLinearGrowth((n) => {
      const input = '`'.repeat(n) + '\r\n# Title\r\n';
      return () => {
        demoteHeadings(input);
      };
    }, CRLF_FENCE_RUN);
  });

  it('demoteExceptFirstH1 grows linearly on a CRLF line of backticks', () => {
    expectLinearGrowth((n) => {
      const input = '`'.repeat(n) + '\r\n# Title\r\n';
      return () => {
        demoteExceptFirstH1(input);
      };
    }, CRLF_FENCE_RUN);
  });

  it('lineRangeFromText grows linearly on long spaces in almost-ranges', () => {
    expectLinearGrowth((n) => {
      const input = '1' + manySpaces(n) + '-' + manySpaces(n) + 'x';
      return () => {
        lineRangeFromText(input);
      };
    }, SPACE_N);
  });

  it('lineRangeFromText grows linearly on long spaces after lines', () => {
    expectLinearGrowth((n) => {
      const input = 'lines' + manySpaces(n) + 'x';
      return () => {
        lineRangeFromText(input);
      };
    }, SPACE_N);
  });

  // A backtick span is documentation text, so a span of slashes reaches
  // isPathClaim as-is. The regex forms this replaced took 138 ms at this n.
  it('isPathClaim grows linearly on a long trailing slash run', () => {
    expectLinearGrowth((n) => {
      const input = trailingSlashRun(n);
      return () => {
        isPathClaim(input);
      };
    }, SLASH_N);
  });

  it('declaration matching grows linearly on a long trailing slash run', () => {
    expectLinearGrowth((n) => {
      const options = {
        searchRoots: [],
        generated: [trailingSlashRun(n)],
        vocabulary: [trailingSlashRun(n)],
      };
      return () => {
        probePathClaims('/x/shard.md', 'See `docs/a.md`.\n', options);
      };
    }, SLASH_N);
  });

  // A `shardsGlobs` entry is config text, and an entry that starts with `../` had its trailing
  // slashes trimmed with `/\/+$/`, which rescans the run from each slash when a letter follows.
  it('shardLintPaths grows linearly on a ../ entry with a long slash run inside', () => {
    expectLinearGrowth((n) => {
      const config = {
        lint: { markdownlint: { shardsGlobs: ['../x' + trailingSlashRun(n)] } },
      } as never;
      return () => {
        shardLintPaths(config, '/docs');
      };
    }, SLASH_N);
  });

  // A link label is documentation text. Trimming its backticks with ``/^`+|`+$/g`` rescans a
  // backtick run from each of its backticks when a letter follows the run.
  it('symbolFromLabel grows linearly on a label with a long backtick run inside', () => {
    expectLinearGrowth((n) => {
      const input = 'a' + '`'.repeat(n) + 'a';
      return () => {
        symbolFromLabel(input);
      };
    }, LABEL_BACKTICKS);
  });

  // The en-US marker template has a variable between each two of its five literal parts. With
  // every copy of each part after the copies of the part before it, and no `)` after the last
  // `` ` ( ``, a regex with a lazy `.*?` for each variable tries every choice of where each one
  // ends before it fails.
  const crossedMarkerParts = (n: number) =>
    '**BROKEN LINK:** "' + '" (`'.repeat(n) + '`) → `'.repeat(n) + '` ('.repeat(n);

  it('lineHasMarker grows linearly on a line of crossed marker parts', () => {
    expectLinearGrowth((n) => {
      const input = crossedMarkerParts(n);
      return () => {
        enUS.brokenLinks.lineHasMarker(input);
      };
    }, MARKER_PARTS);
  });

  it('findMarkers grows linearly on a line of crossed marker parts', () => {
    expectLinearGrowth((n) => {
      const input = crossedMarkerParts(n);
      return () => {
        enUS.brokenLinks.findMarkers?.(input);
      };
    }, MARKER_PARTS);
  });

  // Each copy of the first part starts a search that finds the next three parts and then the last
  // one only after a line separator. A scan that searches again from each start for each part
  // rereads the rest of the line every time.
  const markerStarts = (n: number) =>
    '**BROKEN LINK:** "'.repeat(n) + '" (`' + '`) → `' + '` (' + ' )';

  it('lineHasMarker grows linearly on a line of first parts whose last part follows a line separator', () => {
    expectLinearGrowth((n) => {
      const input = markerStarts(n);
      return () => {
        enUS.brokenLinks.lineHasMarker(input);
      };
    }, MARKER_STARTS);
  });

  it('findMarkers grows linearly on a line of first parts whose last part follows a line separator', () => {
    expectLinearGrowth((n) => {
      const input = markerStarts(n);
      return () => {
        enUS.brokenLinks.findMarkers?.(input);
      };
    }, MARKER_STARTS);
  });

  // Link lint skips each link on a line that holds a marker, so it asks about that line once for
  // each of its links. A marker search whose cost grows with the line, even when the marker comes
  // first, makes that cost grow with the line times its links.
  const markerLine = (markerFirst: boolean, n: number) => {
    const marker = enUS.brokenLinks.formatMarker('a', '#b', '#b', 'dead anchor');
    const links = ' [a](#t)'.repeat(n);
    return markerFirst ? marker + links : links + ' ' + marker;
  };

  it('lineHasMarker grows linearly when asked once per link about a long line', () => {
    expectLinearGrowth((n) => {
      const input = markerLine(true, n);
      return () => {
        for (let i = 0; i < n; i++) enUS.brokenLinks.lineHasMarker(input);
      };
    }, MARKER_LINE_LINKS);
  });

  it('lintCompiledLinks grows linearly on a line with a marker after many links', () => {
    expectLinearGrowth((n) => {
      const markdown = '# T\n\n' + markerLine(false, n) + '\n';
      return () => {
        lintCompiledLinks({ markdown, outputFile: '/x/out.md', guideName: 'g' });
      };
    }, MARKER_LINE_LINKS);
  });

  // Link lint finds fenced code with createQuotedFenceScanner, which reads the list item markers
  // before each quote marker and gives each quote's text to a scanner of its own.
  it('lintCompiledLinks grows linearly on long runs of list item and quote markers', () => {
    expectLinearGrowth((n) => {
      const markdown = [
        '- '.repeat(n) + '> ```',
        '> '.repeat(9) + '- '.repeat(n) + '> x',
        '>\t'.repeat(n) + '[a](#a)',
      ].join('\n');
      return () => {
        lintCompiledLinks({ markdown, outputFile: '/x/out.md', guideName: 'g' });
      };
    }, QUOTE_LINE_MARKERS);
  });

  it('lintCompiledLinks grows linearly on shard comment tags with long internal whitespace runs', () => {
    expectLinearGrowth((n) => {
      const markdown = [
        `<!-- merlon-shard: start ${manySpaces(n)}a` + manySpaces(n),
        `<!-- merlon-shard: end ${manySpaces(n)}a` + manySpaces(n),
      ].join('\n');
      return () => {
        lintCompiledLinks({ markdown, outputFile: '/x/out.md', guideName: 'g' });
      };
    }, SPACE_N);
  });
});

// The link scans of compile read a whole manifest or shard, and a `[^)]` run crosses lines, so
// line length doesn't bound them. Each crafted text below leaves every link target without a `)`.
describe('ReDoS growth for the link scans of compile', () => {
  const work = useTmpDir('merlon-redos-');

  /** A fresh directory for size `n`, so the two timed sizes don't share files. */
  const sizeDir = (n: number) => {
    const dir = join(work.path, `n${n}`);
    mkdirSync(dir, { recursive: true });
    return dir;
  };

  // Each `.md#` can end a link path, and the fragment after it reads on to the next `)`, so a
  // regex tries every `.md` in the rest of the text from each `[`.
  it('linkedSectionFiles grows linearly on a shard of links with no closing parenthesis', () => {
    expectLinearGrowth((n) => {
      const dir = sizeDir(n);
      writeFileSync(join(dir, 'index.md'), '# Guide\n\n- [A](a.md)\n');
      writeFileSync(join(dir, 'a.md'), '# A\n\n' + 'See [x](a.md#\n'.repeat(n));
      return () => {
        linkedSectionFiles(dir);
      };
    }, OPEN_FILE_LINKS);
  });

  it('sectionFiles grows linearly on a manifest of slug links with no closing parenthesis', () => {
    expectLinearGrowth((n) => {
      const dir = sizeDir(n);
      writeFileSync(join(dir, 'index.md'), '# Guide\n\n' + '](#'.repeat(n));
      return () => {
        sectionFiles(dir);
      };
    }, OPEN_SLUG_LINKS);
  });

  const insertCtx = (n: number) => {
    const guideDir = join(sizeDir(n), 'review');
    mkdirSync(guideDir, { recursive: true });
    return {
      guideName: 'review',
      filename: 'claim.md',
      sourceFile: join(guideDir, 'claim.md'),
      config: { guides: [{ name: 'review' }] } as never,
    };
  };

  it('the inlineInserts hook grows linearly on a body of insert links with no closing parenthesis', () => {
    expectLinearGrowth((n) => {
      const ctx = insertCtx(n);
      const body = '[x](diagrams/a.md#'.repeat(n);
      return () => {
        applyCompileHooks(body, ctx, ['inlineInserts']);
      };
    }, OPEN_FILE_LINKS);
  });

  // The cases below close each target, so the scans walk every `[`. Each scan keeps the next `]`
  // and `)` it found, the label end whose target it turned down, and the `.md` it found before a
  // `)`. A scan that searched again for any of them would reread the rest of the text each time.
  it('linkedSectionFiles grows linearly on a shard of links that share one closing parenthesis', () => {
    expectLinearGrowth((n) => {
      const dir = sizeDir(n);
      writeFileSync(join(dir, 'index.md'), '# Guide\n\n- [A](a.md)\n');
      writeFileSync(join(dir, 'a.md'), '# A\n\n' + '[a](b'.repeat(n) + ')\n');
      return () => {
        linkedSectionFiles(dir);
      };
    }, SHARED_CLOSE_LINKS);
  });

  it('the inlineInserts hook grows linearly on labels that share a target of ../ runs', () => {
    expectLinearGrowth((n) => {
      const ctx = insertCtx(n);
      const body = '['.repeat(n) + '](' + '../'.repeat(n) + ')';
      return () => {
        applyCompileHooks(body, ctx, ['inlineInserts']);
      };
    }, DOTDOT_LABELS);
  });

  // indexOf passes over each run of x in native code, which coverage doesn't instrument. The runs
  // make a scan that searched again for the next `]` or `)` from each `[` read far more text, while
  // one that keeps its answers takes the same steps per `[`, so the case stays fast under coverage.
  // n counts the labels; the targets scale with it, in the same proportion as at full size.
  it('the inlineInserts hook grows linearly on links that share a label end or a target end', () => {
    expectLinearGrowth((n) => {
      const ctx = insertCtx(n);
      const targetCount = Math.round((n * SHARED_TARGET_END) / SHARED_LABEL_END);
      const labels = ('[' + 'x'.repeat(20)).repeat(n) + '](../)';
      const targets = ('[](../../' + 'x'.repeat(440)).repeat(targetCount) + ')';
      const body = labels + targets;
      return () => {
        applyCompileHooks(body, ctx, ['inlineInserts']);
      };
    }, SHARED_LABEL_END);
  });
});

// The link readers of compile and link lint read one line at a time, or each run of lines between
// fenced code. Each crafted line below repeats one unfinished link, so a regex that reads a label
// and then a target to the first `)` tries again from each `[`. A target that one `)` closes for
// every link fails a regex that wants `.md` before it, and a line with no `)` fails any of them.
describe('ReDoS growth for the link readers', () => {
  const work = useTmpDir('merlon-redos-links-');
  const pump = (target: string, close: string, n: number) => `[a](${target}`.repeat(n) + close;

  /** A guide `g` with one shard, under a fresh directory for size `n`. */
  const shardAt = (n: number) => {
    const root = join(work.path, `n${n}`);
    const guideDir = join(root, 'g');
    mkdirSync(guideDir, { recursive: true });
    const sourceFile = join(guideDir, 'shard.md');
    writeFileSync(sourceFile, '# Shard\n');
    return { root, guideDir, sourceFile };
  };

  it('compileGuideResults grows linearly on a shard line of links that share one closing parenthesis', () => {
    expectLinearGrowth((n) => {
      const { root, guideDir, sourceFile } = shardAt(n);
      writeFileSync(join(guideDir, 'index.md'), '# Guide\n\n- [Shard](./shard.md)\n');
      // Compile runs every link reader on the line, so the line is shorter than the others here.
      writeFileSync(sourceFile, '# Shard\n\n' + pump('b', ')', n) + '\n');
      const options = { guidesRoot: root, compileOrder: ['g'], docsRoot: root };
      return () => {
        compileGuideResults(options);
      };
    }, SHARD_LINE_LINKS);
  });

  it('rewriteIntraGuideFileLinks grows linearly on a line of links that share one closing parenthesis', () => {
    expectLinearGrowth((n) => {
      const { guideDir } = shardAt(n);
      const markdown = pump('b', ')', n);
      return () => {
        rewriteIntraGuideFileLinks(markdown, new Map(), guideDir);
      };
    }, LINE_LINKS);
  });

  it('rewriteCrossGuideFileLinks grows linearly on a line of ./ links that share one closing parenthesis', () => {
    expectLinearGrowth((n) => {
      const { guideDir, sourceFile } = shardAt(n);
      const markdown = pump('./b', ')', n);
      return () => {
        rewriteCrossGuideFileLinks(markdown, { sourceFile, guideDir, linkIndex: new Map() });
      };
    }, LINE_LINKS);
  });

  it('rewritePublishRelativeLinks grows linearly on a line of ../ links with no closing parenthesis', () => {
    expectLinearGrowth((n) => {
      const { root, guideDir, sourceFile } = shardAt(n);
      const markdown = pump('../b', '', n);
      const currentOutputFile = join(root, 'out.md');
      return () => {
        rewritePublishRelativeLinks(markdown, { sourceFile, guideDir, currentOutputFile });
      };
    }, LINE_LINKS);
  });

  it('extractLinks grows linearly on a line of links with no closing parenthesis', () => {
    expectLinearGrowth((n) => {
      const markdown = pump('b', '', n);
      return () => {
        extractLinks(markdown);
      };
    }, LINE_LINKS);
  });

  it('the codeEvidence hook grows linearly on a line of links with no closing parenthesis', () => {
    expectLinearGrowth((n) => {
      const { sourceFile } = shardAt(n);
      const ctx = {
        guideName: 'g',
        filename: 'shard.md',
        sourceFile,
        config: { guides: [{ name: 'g' }] } as never,
      };
      const body = pump('b', '', n);
      return () => {
        applyCompileHooks(body, ctx, ['codeEvidence']);
      };
    }, LINE_LINKS);
  });

  // Images nest, so the alt of each image in `![![a](t)](t)` holds every image inside it, and the
  // alts on a line of n nested images add up to the square of n. A reader that reads each alt
  // whole, or each image's whole text, takes that long too. A target with a code extension names
  // a file that codeEvidence resolves and rebases, and assembly then marks each image it rebased.
  describe('on a line of nested images', () => {
    const nestedImages = (target: string, count: number) =>
      '!['.repeat(count) + 'a' + `](${target})`.repeat(count);

    for (const target of ['x', '../src/x.ts']) {
      it(`compileGuideResults grows linearly with the target ${target}`, () => {
        expectLinearGrowth((n) => {
          const { root, guideDir, sourceFile } = shardAt(n);
          mkdirSync(join(root, 'src'), { recursive: true });
          writeFileSync(join(root, 'src', 'x.ts'), 'export const x = 1;\n');
          writeFileSync(join(guideDir, 'index.md'), '# Guide\n\n- [Shard](./shard.md)\n');
          writeFileSync(sourceFile, '# Shard\n\n' + nestedImages(target, n) + '\n');
          const options = { guidesRoot: root, compileOrder: ['g'], docsRoot: root };
          return () => {
            compileGuideResults(options);
          };
        }, COMPILE_NESTED_IMAGES);
      });

      it(`the codeEvidence hook grows linearly with the target ${target}`, () => {
        expectLinearGrowth((n) => {
          const { root, sourceFile } = shardAt(n);
          mkdirSync(join(root, 'src'), { recursive: true });
          writeFileSync(join(root, 'src', 'x.ts'), 'export const x = 1;\n');
          const ctx = {
            guideName: 'g',
            filename: 'shard.md',
            sourceFile,
            outputFile: join(root, '_build', 'g.md'),
            config: { guides: [{ name: 'g' }] } as never,
          };
          const body = nestedImages(target, n);
          return () => {
            applyCompileHooks(body, ctx, ['codeEvidence']);
          };
        }, NESTED_IMAGES);
      });
    }
  });
});
