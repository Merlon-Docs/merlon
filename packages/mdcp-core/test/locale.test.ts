import { describe, it, expect } from 'vitest';
import { DEFAULT_LOCALE_ID, enUS, getLocalePack, listLocalePackIds } from '../src/locale/index.js';
import { createLocalePack, formatTemplate } from '../src/locale/create-locale-pack.js';
import { formatBrokenLinkMarker } from '../src/links/mark-broken.js';
import { numberedInsertHeading } from '../src/compile/hooks/inline-inserts.js';
import { buildSlugRegistry } from '../src/refs/slugs.js';

describe('locale packs', () => {
  it('defaults to en-US and lists registered packs', () => {
    expect(DEFAULT_LOCALE_ID).toBe('en-US');
    expect(listLocalePackIds()).toEqual(['en-US']);
    expect(getLocalePack()).toBe(enUS);
    expect(getLocalePack('en-US').id).toBe('en-US');
  });

  it('rejects unknown locale ids', () => {
    expect(() => getLocalePack('fr-FR')).toThrow(/Unknown locale pack/);
  });

  it('formats templates with named placeholders', () => {
    expect(formatTemplate('{greeting}, {name}!', { greeting: 'Hello', name: 'reader' })).toBe(
      'Hello, reader!',
    );
  });

  it('creates locale packs from message templates', () => {
    const pack = createLocalePack({
      id: 'x-test',
      brokenLinks: {
        markerLabel: 'LINK ALERT',
        markerTemplate: '[{markerLabel}] {label}: {originalTarget} => {brokenTarget} ({reason})',
        reasonDeadAnchor: 'dead anchor',
        reasonMissingFile: 'missing file',
        reasonMissingPublishPath: 'missing publish path',
      },
      inserts: {
        seeInsertFallback: 'Open insert',
      },
      headingKeyPattern: '^(?<prefix>[A-Z]{2,4})\\s+Part\\s+(?<number>\\d+)',
      headingKeyTemplate: '{prefix}.p{number}',
    });

    const marker = pack.brokenLinks.formatMarker('Topic', './a.md', '#missing', 'dead anchor');
    expect(marker).toBe('[LINK ALERT] Topic: ./a.md => #missing (dead anchor)');
    expect(pack.brokenLinks.lineHasMarker(marker)).toBe(true);
    expect(pack.brokenLinks.findMarkers?.(`See ${marker}, then [ok](#ok).`)).toEqual([marker]);
    expect(pack.inserts.kindTitle('diagram')).toBe('Diagram');
    expect(pack.inserts.humanizeBasename('éclair-guides')).toBe('Éclair Guides');
    expect(pack.headingKeyFromTitle('ADM Part 7 — Details')).toEqual({
      prefix: 'ADM',
      number: '7',
    });
    expect(pack.formatHeadingKey({ prefix: 'ADM', number: '7' })).toBe('adm.p7');
  });

  it('keeps en-US heading-key pattern in locale JSON (not a core chapter concept)', () => {
    expect(enUS.headingKeyFromTitle('ADM Chapter 1 — Start')).toEqual({
      prefix: 'ADM',
      number: '1',
    });
    expect(enUS.headingKeyFromTitle('Introduction')).toBeNull();
    expect(enUS.formatHeadingKey({ prefix: 'ADM', number: '1' })).toBe('adm.ch1');
  });

  it('loads en-US translations from a single locale JSON file', () => {
    expect(enUS.lineRangeWords).toEqual(['lines', 'line']);
    expect(enUS.aboutThisGuideTitle).toBe('About this guide');
    expect(enUS.inserts.seeInsertFallback).toBe('See insert');
    expect(enUS.brokenLinks.markerLabel).toBe('BROKEN LINK');
  });

  it('normalizes lineRangeWords (trim, dedupe, longest-first)', () => {
    const pack = createLocalePack({
      id: 'x-words',
      brokenLinks: {
        markerLabel: 'X',
        markerTemplate: '{markerLabel}',
        reasonDeadAnchor: 'a',
        reasonMissingFile: 'b',
        reasonMissingPublishPath: 'c',
      },
      inserts: { seeInsertFallback: 'insert' },
      lineRangeWords: ['  line ', 'lines', 'LINE', '', 'zeile'],
    });
    expect(pack.lineRangeWords).toEqual(['lines', 'zeile', 'line']);
  });

  it('formats broken-link markers from the active locale pack', () => {
    const marker = formatBrokenLinkMarker('T', './a.md', '#x', enUS.brokenLinks.reasonDeadAnchor);
    expect(marker).toContain('**BROKEN LINK:**');
    expect(marker).toContain(enUS.brokenLinks.reasonDeadAnchor);
    expect(enUS.brokenLinks.lineHasMarker(marker)).toBe(true);
  });

  it('finds each broken-link marker on a line, without the text around it', () => {
    const first = formatBrokenLinkMarker('a', '#x', '#x', enUS.brokenLinks.reasonDeadAnchor);
    const second = formatBrokenLinkMarker(
      'b "quoted" (c)',
      '../y.md',
      'y.md',
      enUS.brokenLinks.reasonMissingFile,
    );
    expect(
      enUS.brokenLinks.findMarkers?.(`See ${first} and [ok](b.md#ok), then ${second}.`),
    ).toEqual([first, second]);
    expect(enUS.brokenLinks.findMarkers?.('See [ok](#ok).')).toEqual([]);
  });

  it('builds insert captions via en-US kind titles', () => {
    expect(numberedInsertHeading('/docs/tables/status-codes.md', '', 1)).toBe(
      'Table 1. Status Codes',
    );
    expect(enUS.inserts.seeInsertFallback).toBe('See insert');
  });

  it('wires heading semantic keys through the locale pack', () => {
    const reg = buildSlugRegistry('# Guide\n\n## ADM Chapter 1 — Getting started\n');
    const entry = reg.headings.find((h) => h.title.includes('ADM Chapter 1'));
    expect(entry?.key).toBe('adm.ch1');
  });

  it('uses language-agnostic slugify for semantic-key fallback', () => {
    const reg = buildSlugRegistry('# Guide\n\n## 日本語見出し\n');
    const entry = reg.headings.find((h) => h.title === '日本語見出し');
    expect(entry?.slug).toBeTruthy();
    expect(entry!.key).toBe(`guide.${entry!.slug}`);
  });
});
