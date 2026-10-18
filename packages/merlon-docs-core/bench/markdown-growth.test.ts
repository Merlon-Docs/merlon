import { describe, it } from 'vitest';
import { realignTables } from '../src/compile/align-tables.js';
import {
  createCodeFenceScanner,
  createQuotedFenceScanner,
  inlineToPlain,
  maskNonProse,
  stripPandocAnchors,
} from '../src/markdown/index.js';
import { expectLinearGrowth } from './helpers/growth.js';
import { manySpaces } from './helpers/redos-pumps.js';

/** Run a fresh code fence scanner over `lines`. */
function fenced(lines: string[]): boolean[] {
  const inFence = createCodeFenceScanner();
  return lines.map((line) => inFence(line));
}

/** Run a fresh quote-aware fence scanner over `lines`. */
function quotedFenced(lines: string[]): boolean[] {
  const inFence = createQuotedFenceScanner();
  return lines.map((line) => inFence(line));
}

describe('createCodeFenceScanner growth', () => {
  it('grows linearly on long indents and long fence runs', () => {
    expectLinearGrowth((n) => {
      const lines = [manySpaces(n) + '```', '`'.repeat(n), '- ' + '`'.repeat(n)];
      return () => {
        for (let i = 0; i < 20; i++) fenced(lines);
      };
    }, 40_000);
  });

  it('grows linearly on deeply nested list markers and the lines after them', () => {
    // The 500 lazy lines stay fixed; the marker depth and the indent scale.
    expectLinearGrowth((n) => {
      const lines = ['- '.repeat(n) + 'x', ...Array.from({ length: 500 }, () => 'lazy')];
      lines.push(manySpaces(n) + '```', 'x');
      return () => {
        for (let i = 0; i < 20; i++) fenced(lines);
      };
    }, 5_000);
  });
});

describe('createQuotedFenceScanner growth', () => {
  it('grows linearly on long lines of quote and list markers', () => {
    expectLinearGrowth((n) => {
      const lines = [
        '> '.repeat(n) + '```',
        '- > '.repeat(n / 2) + 'x',
        '>'.repeat(2 * n),
        '- '.repeat(n) + '> ```',
        '> '.repeat(9) + '- '.repeat(n) + '> x',
        '>\t'.repeat(n) + '```',
      ];
      return () => {
        for (let i = 0; i < 5; i++) quotedFenced(lines);
      };
    }, 20_000);
  });

  it('grows linearly with the number of lines ten quotes deep', () => {
    // Each quote's scanner reads every line, so time grows with lines × depth; depth stays at ten.
    expectLinearGrowth((n) => {
      const deep = Array.from({ length: n }, () => '> '.repeat(10) + 'x '.repeat(500));
      return () => {
        quotedFenced(deep);
      };
    }, 800);
  });
});

describe('inline helper growth', () => {
  it('inlineToPlain grows linearly on an unclosed link with long whitespace', () => {
    expectLinearGrowth((n) => {
      const input = '[' + manySpaces(n) + '](' + manySpaces(n);
      return () => {
        inlineToPlain(input);
      };
    }, 40_000);
  });

  it('maskNonProse grows linearly on many unclosed comments', () => {
    expectLinearGrowth((n) => {
      const comments = '<!--'.repeat(n);
      return () => {
        maskNonProse(comments);
      };
    }, 20_000);
  });

  it('stripPandocAnchors grows linearly on incomplete anchor pumps', () => {
    expectLinearGrowth((n) => {
      const input = '{#'.repeat(n);
      return () => {
        stripPandocAnchors(input);
      };
    }, 20_000);
  });
});

describe('realignTables growth', () => {
  const table = [
    '| Page                              | Purpose    |',
    '| --------------------------------- | ---------- |',
    '| [Setup](#setup-and-configuration) | Install it |',
    '| [Usage](#usage)                   | Run it     |',
  ].join('\n');

  it('grows linearly with blockquote depth around tables', () => {
    // Finding the fences of each quote around a table takes time that grows with the square of
    // its depth, so compile reads tables in ten blockquotes at most.
    const tables = Array.from({ length: 100 }, () => table).join('\n\n');
    expectLinearGrowth((n) => {
      const deep = tables
        .split('\n')
        .map((row) => `${'> '.repeat(n)}${row}`)
        .join('\n');
      return () => {
        realignTables(deep);
      };
    }, 300);
  });
});
