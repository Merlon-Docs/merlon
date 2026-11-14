import { describe, it, expect } from 'vitest';
import { gfmReader } from '../../src/source/gfm/reader.js';
import { getFormat, listFormats, registerFormat } from '../../src/source/registry.js';

const read = (text: string, path = '/docs/guide/page.md', manifest?: string) =>
  gfmReader.read(text, { path, manifest });

describe('gfm reader', () => {
  it('treats the configured manifest, index.md and shards.md as indexes', () => {
    expect(read('', '/d/g/index.md').isIndex).toBe(true);
    expect(read('', '/d/g/shards.md').isIndex).toBe(true);
    expect(read('', '/d/g/toc.md', 'toc.md').isIndex).toBe(true);
    expect(read('', '/d/g/page.md').isIndex).toBe(false);
  });

  it('groups shard links under the heading above them', () => {
    const doc = read(
      [
        '# Guide',
        '[Intro](intro.md)',
        '## Setup',
        '- [Install](setup/install.md#steps)',
        '- [Site](https://example.com/x.md)',
        '- [Here](#setup)',
        '### Deep',
        '- [Config](config.md "Config title")',
      ].join('\n'),
      '/d/g/index.md',
    );
    expect(doc.manifest.map((e) => [e.target, e.resolved, e.group, e.line])).toEqual([
      ['intro.md', '/d/g/intro.md', 'before any ## heading', 2],
      ['setup/install.md', '/d/g/setup/install.md', 'under "## Setup"', 4],
      ['config.md', '/d/g/config.md', 'under "### Deep"', 8],
    ]);
  });

  it('tags links as file, anchor or external, with fragments split off', () => {
    const doc = read('[a](other.md#part) [b](#here) [c](https://example.com) [d](./img.png)');
    expect(doc.links).toEqual([
      { kind: 'file', target: 'other.md', fragment: 'part', line: 1 },
      { kind: 'anchor', target: '', fragment: 'here', line: 1 },
      { kind: 'external', target: 'https://example.com', line: 1 },
      { kind: 'file', target: './img.png', line: 1 },
    ]);
  });

  it('ignores links and headings inside fenced code', () => {
    const doc = read(['```md', '# Not a title', '[x](x.md)', '```', '# Title'].join('\n'));
    expect(doc.title?.text).toBe('Title');
    expect(doc.title?.line).toBe(5);
    expect(doc.links).toEqual([]);
  });

  it('numbers repeated heading slugs the way GitHub does', () => {
    const doc = read(['# Guide', '## Usage', '## Usage', '## `merlon check`'].join('\n'));
    expect(doc.anchors.map((a) => a.id)).toEqual(['guide', 'usage', 'usage-1', 'merlon-check']);
    expect(doc.anchors.every((a) => a.origin === 'heading')).toBe(true);
  });

  it('keeps inline markup in the title text and drops it from the plain title', () => {
    const doc = read('# The **`merlon`** CLI');
    expect(doc.title?.text).toBe('The **`merlon`** CLI');
    expect(doc.title?.plain).toBe('The merlon CLI');
  });
});

describe('format registry', () => {
  it('has gfm built in', () => {
    expect(listFormats()).toContain('gfm');
    expect(getFormat('gfm').reader).toBe(gfmReader);
  });

  it('names the known formats when an id is unknown', () => {
    expect(() => getFormat('nope')).toThrow(/Unknown source format "nope"\. Known formats: .*gfm/);
  });

  it('registers a new format without touching the passes', () => {
    registerFormat({
      id: 'test-format',
      name: 'Test',
      reader: {
        read: (_text, ctx) => ({ ...gfmReader.read('', ctx), format: 'test-format' }),
      },
    });
    expect(getFormat('test-format').reader.read('', { path: '/x' }).format).toBe('test-format');
  });
});
