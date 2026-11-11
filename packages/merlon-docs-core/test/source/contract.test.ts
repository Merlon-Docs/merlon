import { describe, it, expect } from 'vitest';
import { getFormat } from '../../src/source/registry.js';
import { foldPlain } from '../../src/source/text.js';
import type { DocLinkKind } from '../../src/source/model.js';

/**
 * The reader contract (ADR 0008, Liskov substitution): the same short document, written in each
 * format, reads to the same model. Every built-in format adds its spelling here.
 */
interface ContractFixture {
  path: string;
  text: string;
  /** Link kinds the format spells the cross-document link with; [] for formats without links. */
  linkKinds: DocLinkKind[];
}

const CONTRACT: Record<string, ContractFixture> = {
  gfm: {
    path: '/docs/install.md',
    text: [
      '# Install the tool',
      '',
      '## Before you start',
      '',
      'You need a recent *Node* release and a shell.',
      '',
      '```sh',
      'npm install --global the-tool',
      '```',
      '',
      '## Next steps',
      '',
      'Read the [getting started guide](guide.md) next.',
      '',
    ].join('\n'),
    linkKinds: ['file'],
  },
};

const EXPECTED = {
  title: 'Install the tool',
  headings: [
    { plain: 'Install the tool', level: 1 },
    { plain: 'Before you start', level: 2 },
    { plain: 'Next steps', level: 2 },
  ],
  paragraphs: [
    'you need a recent node release and a shell.',
    'read the getting started guide next.',
  ],
  // Title and headings (3 + 3 + 2) plus both paragraphs (9 + 6); the code block counts for nothing.
  proseWords: 23,
};

describe.each(Object.entries(CONTRACT))('reader contract: %s', (id, fixture) => {
  const doc = getFormat(id).reader.read(fixture.text, { path: fixture.path });

  it('reports its own format and path', () => {
    expect(doc.format).toBe(id);
    expect(doc.path).toBe(fixture.path);
  });

  it('reads the title', () => {
    expect(doc.title?.plain).toBe(EXPECTED.title);
  });

  it('reads the heading tree', () => {
    expect(doc.headings.map((h) => ({ plain: h.plain, level: h.level }))).toEqual(
      EXPECTED.headings,
    );
  });

  it('reads prose paragraphs and leaves code out', () => {
    expect(doc.paragraphs.map((p) => foldPlain(p.plain))).toEqual(EXPECTED.paragraphs);
    expect(doc.proseWords).toBe(EXPECTED.proseWords);
  });

  it('reads the cross-document link', () => {
    expect(doc.links.map((l) => l.kind)).toEqual(fixture.linkKinds);
  });

  it('gives every line number inside the document', () => {
    const count = fixture.text.split('\n').length;
    const lines = [
      ...doc.headings.map((h) => h.line),
      ...doc.paragraphs.map((p) => p.line),
      ...doc.links.map((l) => l.line),
    ];
    for (const line of lines) {
      expect(line).toBeGreaterThanOrEqual(1);
      expect(line).toBeLessThanOrEqual(count);
    }
  });
});
