/**
 * The linear link scans of compile and link lint. A change to which links a reader finds shows up
 * as a different link list here.
 */
import { describe, it, expect } from 'vitest';
import {
  createMdSuffixReader,
  createNextIndexReader,
  mdLinkPaths,
  nestedLinkIndexes,
  piecesBetween,
  replaceLinkTargets,
  scanMarkdownLinks,
  slugLinkTargets,
} from '../src/compile/link-scan.js';

describe('createNextIndexReader', () => {
  it('finds the first index of the character at or after an index, in any order of calls', () => {
    const next = createNextIndexReader('a#b#c', '#');
    expect([0, 1, 2, 3, 4, 0, 4].map(next)).toEqual([1, 1, 3, 3, -1, 1, -1]);
  });
});

describe('createMdSuffixReader', () => {
  it('finds the last .md before the ) that the ) or a # follows', () => {
    const text = '(a.md#b.md#x)';
    const read = createMdSuffixReader(text, { ignoreCase: false, minFragment: 0 });
    expect(read(text.length - 1)).toBe(text.indexOf('b.md') + 1);
  });

  it('reads no further back than the ) before', () => {
    const text = 'a.md) xyz)';
    const read = createMdSuffixReader(text, { ignoreCase: false, minFragment: 0 });
    expect(read(text.length - 1)).toBe(-1);
    expect(read(4)).toBe(1);
  });

  it('needs more than minFragment characters after the #', () => {
    const one = '(a.md#)';
    const two = '(a.md#b)';
    const opts = { ignoreCase: false, minFragment: 1 };
    expect(createMdSuffixReader(one, opts)(one.length - 1)).toBe(-1);
    expect(createMdSuffixReader(two, opts)(two.length - 1)).toBe(2);
  });

  it('reads .MD and .Md as .md only when it ignores case', () => {
    const text = '(a.MD)';
    expect(createMdSuffixReader(text, { ignoreCase: false, minFragment: 0 })(5)).toBe(-1);
    expect(createMdSuffixReader(text, { ignoreCase: true, minFragment: 0 })(5)).toBe(2);
  });
});

describe('mdLinkPaths', () => {
  it('returns the path of each .md link, without its fragment', () => {
    const text = '- [A](a.md)\r\n- [B](./b/c.md#part)\n- [C](c.md#)\n- [D](d.txt)\n- [E](.md)\n';
    expect(mdLinkPaths(text)).toEqual(['a.md', './b/c.md', 'c.md']);
  });

  it('keeps a # inside the path when a later .md ends it', () => {
    expect(mdLinkPaths('[x](a.md#b.md)')).toEqual(['a.md#b.md']);
  });

  // The walk reads a label and a target as the link passes do.
  it('reads a label as CommonMark does, and reads the src of an image too', () => {
    const text = '[![A](a.md)](b.md) [arr[0]](c.md) \\[d](d.md) ![e](e.md) [f](\ng.md)';
    expect(mdLinkPaths(text)).toEqual(['a.md', 'b.md', 'c.md', 'e.md']);
  });
});

describe('slugLinkTargets', () => {
  it('returns the text after the # of each ](#slug) link, up to the first )', () => {
    expect(slugLinkTargets('[a](#one) [b](#two\r\nlines) [c](#)')).toEqual(['one', 'two\r\nlines']);
  });
});

// What CommonMark reads as an inline link or image in each text, with the target that mdcp reads:
// the text from the `(` to the first `)` on the same line.
describe('scanMarkdownLinks', () => {
  const read = (text: string) =>
    scanMarkdownLinks(text).map(({ start, labelEnd, close, image }) => ({
      text: text.slice(start, close + 1),
      label: text.slice(start + (image ? 2 : 1), labelEnd),
      target: text.slice(labelEnd + 2, close),
      image,
    }));

  it('reads a linked image as an image in the label of a link', () => {
    expect(read('See [![Diagram](./d.png)](./page.md).')).toEqual([
      { text: '![Diagram](./d.png)', label: 'Diagram', target: './d.png', image: true },
      {
        text: '[![Diagram](./d.png)](./page.md)',
        label: '![Diagram](./d.png)',
        target: './page.md',
        image: false,
      },
    ]);
  });

  it('reads a label that holds balanced brackets', () => {
    expect(read('[the arr[0] notes](./n.md) and [a [b] [c]](./m.md)').map((l) => l.label)).toEqual([
      'the arr[0] notes',
      'a [b] [c]',
    ]);
  });

  it('reads the innermost link when links nest, and no link around it', () => {
    expect(read('[a [b](./x.md) c](./y.md)').map((l) => l.text)).toEqual(['[b](./x.md)']);
    expect(read('[a [b](./x.md)').map((l) => l.text)).toEqual(['[b](./x.md)']);
  });

  it('reads a link in the alt text of an image, and the image around it', () => {
    expect(read('![a [b](./x.md) c](./y.png)').map((l) => [l.text, l.image])).toEqual([
      ['[b](./x.md)', false],
      ['![a [b](./x.md) c](./y.png)', true],
    ]);
  });

  it('keeps an image in a label from turning the brackets around it into text', () => {
    expect(read('[![a](./x.png) and ![b](./y.png)](./z.md)').map((l) => l.target)).toEqual([
      './x.png',
      './y.png',
      './z.md',
    ]);
  });

  it('reads no bracket that a backslash escapes', () => {
    expect(
      read('\\[a](./x.md) \\![b](./y.md) [c\\]](./z.md) \\\\[d](./w.md)').map((l) => [
        l.label,
        l.image,
      ]),
    ).toEqual([
      ['b', false],
      ['c\\]', false],
      ['d', false],
    ]);
  });

  it('needs a ( right after the ], and a ) on the same line', () => {
    expect(read('[a] (./x.md) [b](./y.md\n) [c](./z.md')).toEqual([]);
  });

  it('reads a label that wraps onto the next line', () => {
    expect(read('[a\nb](./x.md)').map((l) => l.label)).toEqual(['a\nb']);
  });

  it('runs a target to its first ), with an empty target too', () => {
    expect(read('[a](./x (1).md) [b]() [c](<./y.md> "t")').map((l) => l.target)).toEqual([
      './x (1',
      '',
      '<./y.md> "t"',
    ]);
  });

  it('reads no bracket in a target, and goes on after its )', () => {
    expect(read('[a](./x[y.md) z](./v.md) [b](./w.md)').map((l) => l.text)).toEqual([
      '[a](./x[y.md)',
      '[b](./w.md)',
    ]);
  });
});

describe('replaceLinkTargets', () => {
  it('replaces the targets it is given and finds where each link ends up', () => {
    const text = 'x [![a](i.png)](p.md) y [b](q.md)';
    const links = scanMarkdownLinks(text);
    const { text: out, spans } = replaceLinkTargets(text, links, ['img/i.png', undefined, '#q']);
    expect(out).toBe('x [![a](img/i.png)](p.md) y [b](#q)');
    expect(spans.map(([start, end]) => out.slice(start, end))).toEqual([
      '![a](img/i.png)',
      '[![a](img/i.png)](p.md)',
      '[b](#q)',
    ]);
  });
});

describe('nestedLinkIndexes', () => {
  it('gives the links and images right inside each label, in order', () => {
    const links = scanMarkdownLinks('[![a](x) ![b ![c](z)](y)](t) ![d](w)');
    expect(links.map((l) => l.start)).toEqual([1, 13, 9, 0, 29]);
    expect(nestedLinkIndexes(links)).toEqual([[], [], [1], [0, 2], []]);
  });
});

describe('piecesBetween', () => {
  it('gives the text of a range around the spans it cuts out', () => {
    expect(
      piecesBetween('0123456789', 1, 9, [
        [2, 4],
        [4, 5],
        [7, 9],
      ]),
    ).toEqual(['1', '', '56', '']);
    expect(piecesBetween('0123456789', 3, 6, [])).toEqual(['345']);
  });
});
