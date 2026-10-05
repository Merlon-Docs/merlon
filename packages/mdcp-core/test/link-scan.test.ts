/**
 * The linear link scans that compile runs on a whole manifest or shard body. Each test names the
 * regex match that the scan returns, so a change to the walk shows up as a different link list.
 */
import { describe, it, expect } from 'vitest';
import {
  createMdSuffixReader,
  mdLinkPaths,
  scanInlineLinks,
  slugLinkTargets,
} from '../src/compile/link-scan.js';

describe('scanInlineLinks', () => {
  const targets = (text: string, accept: (target: string) => boolean = () => true) =>
    scanInlineLinks(text, (targetStart, close) => {
      const target = text.slice(targetStart, close);
      return accept(target) ? target : undefined;
    });

  it('gives the index of each link’s [, ] and ), and the value its target gave', () => {
    const text = 'See [a](x) and\r\n[b c](y z).';
    expect(targets(text)).toEqual([
      { start: 4, labelEnd: 6, close: 9, value: 'x' },
      { start: 16, labelEnd: 20, close: 25, value: 'y z' },
    ]);
  });

  it('runs a label to its first ] and a target to its first ), across lines', () => {
    // The label of each [ before `b]` ends at that ], and no ( follows it.
    const text = '[a [b] c](t1) [d\n](t2\nt3) x)';
    expect(targets(text).map(({ start, value }) => [start, value])).toEqual([[14, 't2\nt3']]);
  });

  it('goes on from the next [ after a target it turns down, which can sit inside that link', () => {
    const text = '[a](skip [b](keep) [c](skip)';
    const links = targets(text, (t) => !t.startsWith('skip'));
    expect(links.map(({ start, value }) => [start, value])).toEqual([[9, 'keep']]);
  });

  it('asks about a label end once, however many [ share it', () => {
    const text = '[[[a](t)';
    const asked: number[] = [];
    const links = scanInlineLinks(text, (targetStart) => {
      asked.push(targetStart);
      return undefined;
    });
    expect(links).toEqual([]);
    expect(asked).toEqual([6]);
  });

  it('finds nothing when a ( does not follow the ] at once, or no ) closes the target', () => {
    expect(targets('[a] (t) [b](t')).toEqual([]);
    expect(targets('[a]')).toEqual([]);
  });

  it('turns down an empty target only when the callback does', () => {
    expect(targets('[a]() [b](c)', (t) => t.length > 0).map((l) => l.value)).toEqual(['c']);
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
});

describe('slugLinkTargets', () => {
  it('returns the text after the # of each ](#slug) link, up to the first )', () => {
    expect(slugLinkTargets('[a](#one) [b](#two\r\nlines) [c](#)')).toEqual(['one', 'two\r\nlines']);
  });
});
