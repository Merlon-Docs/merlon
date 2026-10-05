import { describe, it, expect } from 'vitest';
import {
  parseAtxHeading,
  isAtxHeading,
  parseHeading,
  isHeading,
  formatHeadingAsAtx,
  stripPandocAnchors,
  headingTitlePlain,
  isSlugChar,
  splitTrailingPandocAnchor,
} from '../src/markdown/index.js';

describe('parseAtxHeading', () => {
  it('parses levels 1–6 with preserved whitespace', () => {
    expect(parseAtxHeading('##  Hello')).toEqual({
      level: 2,
      marker: '##',
      whitespace: '  ',
      title: 'Hello',
    });
  });

  it('parses level 1 and level 6 boundaries', () => {
    expect(parseAtxHeading('# One')).toEqual({
      level: 1,
      marker: '#',
      whitespace: ' ',
      title: 'One',
    });
    expect(parseAtxHeading('###### Six')).toEqual({
      level: 6,
      marker: '######',
      whitespace: ' ',
      title: 'Six',
    });
  });

  it('returns null for seven hashes', () => {
    expect(parseAtxHeading('####### Title')).toBeNull();
  });

  it('supports tab separator', () => {
    expect(parseAtxHeading('##\tTabbed')).toEqual({
      level: 2,
      marker: '##',
      whitespace: '\t',
      title: 'Tabbed',
    });
  });

  it('returns null for non-headings and missing space after hashes', () => {
    expect(parseAtxHeading('')).toBeNull();
    expect(parseAtxHeading('not a heading')).toBeNull();
    expect(parseAtxHeading('#nofence')).toBeNull();
    expect(parseAtxHeading('##')).toBeNull();
    expect(isAtxHeading('### Title')).toBe(true);
    expect(isAtxHeading('#nofence')).toBe(false);
  });

  it('keeps empty title when only hashes and whitespace', () => {
    expect(parseAtxHeading('###   ')).toEqual({
      level: 3,
      marker: '###',
      whitespace: '   ',
      title: '',
    });
  });
});

describe('parseHeading', () => {
  it('wraps ATX results with kind atx', () => {
    expect(parseHeading('##  Hello')).toEqual({
      kind: 'atx',
      level: 2,
      title: 'Hello',
      atx: { marker: '##', whitespace: '  ' },
    });
    expect(isHeading('### Title')).toBe(true);
    expect(isHeading('Title\n===')).toBe(false);
  });

  it('formats demoted ATX via formatHeadingAsAtx', () => {
    const h = parseHeading('## Hello');
    expect(h).not.toBeNull();
    expect(formatHeadingAsAtx(h!, 3)).toBe('### Hello');
  });
});

describe('isSlugChar', () => {
  it('accepts alphanumerics and hyphen', () => {
    expect(isSlugChar('A')).toBe(true);
    expect(isSlugChar('z')).toBe(true);
    expect(isSlugChar('0')).toBe(true);
    expect(isSlugChar('9')).toBe(true);
    expect(isSlugChar('-')).toBe(true);
  });

  it('rejects punctuation, whitespace, and braces', () => {
    expect(isSlugChar(' ')).toBe(false);
    expect(isSlugChar('_')).toBe(false);
    expect(isSlugChar('{')).toBe(false);
    expect(isSlugChar('}')).toBe(false);
    expect(isSlugChar('#')).toBe(false);
  });
});

describe('splitTrailingPandocAnchor', () => {
  it('splits trailing {#id} and lowercases the slug', () => {
    expect(splitTrailingPandocAnchor('Title {#My-Id}')).toEqual({
      text: 'Title',
      anchor: 'my-id',
    });
  });

  it('allows no space before the marker', () => {
    expect(splitTrailingPandocAnchor('Title{#id}')).toEqual({
      text: 'Title',
      anchor: 'id',
    });
  });

  it('returns null anchor when marker is missing or incomplete', () => {
    expect(splitTrailingPandocAnchor('Plain title')).toEqual({
      text: 'Plain title',
      anchor: null,
    });
    expect(splitTrailingPandocAnchor('Title {#}')).toEqual({
      text: 'Title {#}',
      anchor: null,
    });
    expect(splitTrailingPandocAnchor('Title {#bad id}')).toEqual({
      text: 'Title {#bad id}',
      anchor: null,
    });
    expect(splitTrailingPandocAnchor('Title {#unclosed')).toEqual({
      text: 'Title {#unclosed',
      anchor: null,
    });
  });

  it('trims trailing spaces and tabs before looking for the marker', () => {
    expect(splitTrailingPandocAnchor('Title {#id}  \t')).toEqual({
      text: 'Title',
      anchor: 'id',
    });
  });
});

describe('stripPandocAnchors', () => {
  it('removes {#id} and optional preceding whitespace', () => {
    expect(stripPandocAnchors('## Review {#review-index}', { trimPrecedingWhitespace: true })).toBe(
      '## Review',
    );
  });

  it('preserves empty {#} in mode A (trimPrecedingWhitespace: true)', () => {
    expect(stripPandocAnchors('## Review {#}', { trimPrecedingWhitespace: true })).toBe(
      '## Review {#}',
    );
  });

  it('removes empty {#} in mode B (trimPrecedingWhitespace: false)', () => {
    expect(stripPandocAnchors('## Review {#}', { trimPrecedingWhitespace: false })).toBe(
      '## Review ',
    );
  });

  it('trims preceding newlines/tabs/spaces in mode A', () => {
    expect(stripPandocAnchors('## Review\n\n\n{#aaa}\n', { trimPrecedingWhitespace: true })).toBe(
      '## Review\n',
    );
    expect(stripPandocAnchors('## Review\t\t{#aaa}', { trimPrecedingWhitespace: true })).toBe(
      '## Review',
    );
    expect(stripPandocAnchors('## Review\r\f\v{#aaa}', { trimPrecedingWhitespace: true })).toBe(
      '## Review',
    );
  });

  it('strips a leading anchor with nothing to trim (no-op trim branch)', () => {
    expect(stripPandocAnchors('{#only}', { trimPrecedingWhitespace: true })).toBe('');
  });

  it('aborts mode B when a nested { appears inside the marker', () => {
    expect(stripPandocAnchors('x {#a{b}', { trimPrecedingWhitespace: false })).toBe('x {#a{b}');
  });

  it('leaves text unchanged when there is no {# sequence', () => {
    expect(stripPandocAnchors('no anchors here')).toBe('no anchors here');
    expect(stripPandocAnchors('{ not-an-anchor }')).toBe('{ not-an-anchor }');
  });

  it('strips multiple anchors in one pass', () => {
    expect(stripPandocAnchors('A {#a} and B {#b}', { trimPrecedingWhitespace: true })).toBe(
      'A and B',
    );
  });

  it('strips two anchors on the same line (adjacent and spaced)', () => {
    expect(stripPandocAnchors('## Title {#one} {#two}', { trimPrecedingWhitespace: true })).toBe(
      '## Title',
    );
    expect(stripPandocAnchors('## Title{#one}{#two}', { trimPrecedingWhitespace: true })).toBe(
      '## Title',
    );
    expect(stripPandocAnchors('x{#a}{#b}y', { trimPrecedingWhitespace: false })).toBe('xy');
  });

  it('trims the whitespace between consecutive anchors in mode A', () => {
    expect(stripPandocAnchors('A {#x} \t{#y}\nB {#z} C', { trimPrecedingWhitespace: true })).toBe(
      'A\nB C',
    );
    expect(stripPandocAnchors('   {#x}  {#y}', { trimPrecedingWhitespace: true })).toBe('');
  });

  it('leaves incomplete {# pumps alone', () => {
    expect(stripPandocAnchors('prefix {#no-close', { trimPrecedingWhitespace: true })).toBe(
      'prefix {#no-close',
    );
  });

  it('diverges on mode A/B for non-slug chars', () => {
    expect(stripPandocAnchors('## Review {#invalid id}', { trimPrecedingWhitespace: true })).toBe(
      '## Review {#invalid id}',
    );
    expect(stripPandocAnchors('## Review {#invalid id}', { trimPrecedingWhitespace: false })).toBe(
      '## Review ',
    );
  });

  it('is linear on incomplete pumps', () => {
    const input = '{#'.repeat(20_000);
    const start = performance.now();
    stripPandocAnchors(input);
    // Generous under coverage instrumentation; redos-budget.test.ts keeps a tighter public-API budget.
    expect(performance.now() - start).toBeLessThan(200);
  });
});

describe('headingTitlePlain', () => {
  it('matches prior headingTextToPlain semantics', () => {
    expect(headingTitlePlain('**Bold** `{#custom-id}`')).toBe('Bold');
  });

  it('strips anchors and trims without requiring preceding space', () => {
    expect(headingTitlePlain('  Hello{#world}  ')).toBe('Hello');
  });
});
