import { describe, it, expect } from 'vitest';
import {
  demoteHeadings,
  demoteExceptFirstH1,
  stripAboutThisGuideHeading,
  extractGuideH1,
} from '../src/compile/headings.js';
import { createLocalePack } from '../src/locale/index.js';

describe('demoteHeadings', () => {
  it('demotes ATX headings by one level', () => {
    const input = '# One\n## Two\n### Three';
    expect(demoteHeadings(input)).toBe('## One\n### Two\n#### Three');
  });

  it('does not demote h6 further', () => {
    expect(demoteHeadings('###### Max')).toBe('###### Max');
  });

  it('ignores headings inside fenced code', () => {
    const input = '# Real\n\n```md\n# Fake\n```\n';
    const out = demoteHeadings(input);
    expect(out).toContain('## Real');
    expect(out).toContain('# Fake');
  });

  it('ignores headings inside fenced code in a CRLF shard', () => {
    const input = '# Real\r\n\r\n```md\r\n# Fake\r\n```\r\n~~~\r\n# Tilde\r\n~~~\r\n# After';
    expect(demoteHeadings(input)).toBe(
      '## Real\r\n\r\n```md\r\n# Fake\r\n```\r\n~~~\r\n# Tilde\r\n~~~\r\n## After',
    );
  });

  // Each copy of a guide after the first in the monolith is demoted, and the monolith keeps this
  // blank line after each of those copies.
  it('adds a blank line at the end of text that ends with a newline', () => {
    expect(demoteHeadings('# A\n')).toBe('## A\n\n');
    expect(demoteHeadings('# A\n\n```\n# B\n```\n')).toBe('## A\n\n```\n# B\n```\n\n');
    expect(demoteHeadings('# A')).toBe('## A');
  });

  it('closes a fence only on a run of its own character', () => {
    const input = '~~~\n# In tilde\n```\n# Still in tilde\n~~~\n# Out';
    expect(demoteHeadings(input)).toBe('~~~\n# In tilde\n```\n# Still in tilde\n~~~\n## Out');
  });

  // Demotion finds fences with the scan the slug registry's heading reader runs, so within one
  // shard a heading the reader counts is a heading demotion demotes.
  it('finds fences as the heading reader does', () => {
    const cases: [string, string][] = [
      // A shorter run inside a longer fence is fence content.
      ['````md\n```\n# Inner\n```\n````\n# Out', '````md\n```\n# Inner\n```\n````\n## Out'],
      // A run with an info string doesn't close a fence.
      ['```\n# A\n```js\n# B\n```\n# C', '```\n# A\n```js\n# B\n```\n## C'],
      // A backtick run followed by another backtick is inline code, not a fence.
      ['``` `x` ```\n# Real', '``` `x` ```\n## Real'],
      // A fence can sit up to three spaces in.
      ['  ```\n# Code\n  ```\n# Real', '  ```\n# Code\n  ```\n## Real'],
    ];
    for (const [input, expected] of cases) expect(demoteHeadings(input)).toBe(expected);
  });
});

describe('demoteExceptFirstH1', () => {
  it('keeps first h1 and demotes the rest', () => {
    const input = '# Keep\n## Two\n# Also demoted';
    const out = demoteExceptFirstH1(input);
    expect(out).toMatch(/^# Keep/m);
    expect(out).toContain('### Two');
    expect(out).toContain('## Also demoted');
  });

  it('preserves headings inside fenced code', () => {
    const input = '# Keep\n\n```md\n# Fake\n```\n\n## After';
    const out = demoteExceptFirstH1(input);
    expect(out).toMatch(/^# Keep/m);
    expect(out).toContain('# Fake');
    expect(out).toContain('### After');
  });

  it('preserves headings inside fenced code in a CRLF shard', () => {
    const input = '# Keep\r\n\r\n```md\r\n# Fake\r\n```\r\n\r\n# Demoted';
    expect(demoteExceptFirstH1(input)).toBe(
      '# Keep\r\n\r\n```md\r\n# Fake\r\n```\r\n\r\n## Demoted',
    );
  });
});

describe('stripAboutThisGuideHeading', () => {
  it('removes about-this-guide h1 and leading blanks', () => {
    const input = '# About this guide\n\nBody text.\n';
    expect(stripAboutThisGuideHeading(input)).toBe('Body text.\n\n');
  });

  it('returns empty string when only the about heading remains', () => {
    expect(stripAboutThisGuideHeading('# About this guide\n\n')).toBe('');
  });

  it('matches the about title from the locale pack', () => {
    const de = createLocalePack({
      id: 'x-de',
      brokenLinks: {
        markerLabel: 'X',
        markerTemplate: '{markerLabel}',
        reasonDeadAnchor: 'a',
        reasonMissingFile: 'b',
        reasonMissingPublishPath: 'c',
      },
      inserts: { seeInsertFallback: 'insert' },
      aboutThisGuideTitle: 'Über diesen Leitfaden',
    });

    expect(stripAboutThisGuideHeading('# Über diesen Leitfaden\n\nBody.\n', de)).toBe('Body.\n\n');
    // en-US title is not universal when another pack is active
    expect(stripAboutThisGuideHeading('# About this guide\n\nBody.\n', de)).toBe(
      '# About this guide\n\nBody.\n\n',
    );
  });
});

describe('extractGuideH1', () => {
  it('returns first h1 from index', () => {
    const index = '# My Guide\n\n- [a](a.md)\n';
    expect(extractGuideH1(index)).toBe('# My Guide\n\n');
  });

  it('returns null when no h1 is present', () => {
    expect(extractGuideH1('## Only h2\n')).toBeNull();
  });
});
