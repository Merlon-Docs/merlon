import { describe, it, expect } from 'vitest';
import { decodeEntities, htmlReader } from '../../src/source/html/reader.js';
import { getFormat } from '../../src/source/registry.js';

const html = (lines: string[], path = '/docs/guide.html') =>
  htmlReader.read(lines.join('\n'), { path });

describe('html reader', () => {
  it('is a built-in format', () => {
    expect(getFormat('html').reader).toBe(htmlReader);
  });

  it('reads headings, the first h1 as the title, and block-level prose units with their lines', () => {
    const doc = html([
      '<html><head><title>Page title</title></head>',
      '<body>',
      '<h1>Writing <code>curses</code> programs</h1>',
      '<p>First paragraph',
      'wraps here.</p>',
      '<h2 id="intro">Intro</h2>',
      '<ul><li>One item</li><li>Two',
      'item</li></ul>',
      '<p>Unclosed paragraph',
      '<p>Next one',
      '</body></html>',
    ]);
    expect(doc.format).toBe('html');
    expect(doc.title).toMatchObject({ plain: 'Writing curses programs', level: 1, line: 3 });
    expect(doc.headings.map((h) => [h.level, h.plain, h.line])).toEqual([
      [1, 'Writing curses programs', 3],
      [2, 'Intro', 6],
    ]);
    expect(doc.paragraphs.map((p) => [p.line, p.plain])).toEqual([
      [4, 'First paragraph wraps here.'],
      [7, 'One item'],
      [7, 'Two item'],
      [9, 'Unclosed paragraph'],
      [10, 'Next one'],
    ]);
    expect(doc.proseWords).toBe(3 + 1 + 4 + 2 + 2 + 2 + 2);
  });

  it('falls back to <title> when there is no h1', () => {
    const doc = html(['<head>', '<title>Hacker&rsquo;s Guide</title>', '</head>', '<p>Body.</p>']);
    expect(doc.title).toMatchObject({ plain: 'Hacker’s Guide', level: 1, line: 2 });
    expect(doc.headings).toEqual([]);
  });

  it('leaves pre, script, style and comments out of the prose', () => {
    const doc = html([
      '<p>Before.</p>',
      '<pre>',
      'int main(void) { return 0; }',
      '<b>bold in pre</b>',
      '</pre>',
      '<script>var x = "<p>not prose</p>";</script>',
      '<style>p { color: red }</style>',
      '<!-- <p>commented out</p> -->',
      '<p>After.</p>',
    ]);
    expect(doc.paragraphs.map((p) => p.plain)).toEqual(['Before.', 'After.']);
    expect(doc.proseWords).toBe(2);
  });

  it('decodes entities and keeps a bare < as text', () => {
    expect(decodeEntities('a &lt; b &amp;&amp; c &#62; d &#x41; &unknown;')).toBe(
      'a < b && c > d A &unknown;',
    );
    const doc = html(['<p>if a < b then &quot;ok&quot;</p>']);
    expect(doc.paragraphs[0].plain).toBe('if a < b then "ok"');
  });

  it('reads links as anchor, external and file links, with fragments', () => {
    const doc = html([
      '<p><a href="#top">top</a>',
      '<a href="https://invisible-island.net/">site</a>',
      '<a href="mailto:bugs@example.org">mail</a>',
      '<a href="man/curs_addch.3x.html#h2-NAME">addch</a>',
      '<a href="other%20page.html?x=1">other</a>',
      '<a name="only-a-name">no href</a></p>',
    ]);
    expect(doc.links).toEqual([
      { kind: 'anchor', target: '', fragment: 'top', line: 1 },
      { kind: 'external', target: 'https://invisible-island.net/', line: 2 },
      { kind: 'external', target: 'mailto:bugs@example.org', line: 3 },
      { kind: 'file', target: 'man/curs_addch.3x.html', fragment: 'h2-NAME', line: 4 },
      { kind: 'file', target: 'other page.html', line: 5 },
    ]);
  });

  it('reads id attributes and <a name> as anchors', () => {
    const doc = html([
      '<h2 id="sec">Section</h2>',
      '<div id="box"><a name="AEN5" id="AEN5">x</a><a name="legacy">y</a></div>',
    ]);
    expect(doc.anchors).toEqual([
      { id: 'sec', line: 1, origin: 'heading' },
      { id: 'box', line: 2, origin: 'label' },
      { id: 'AEN5', line: 2, origin: 'label' },
      { id: 'legacy', line: 2, origin: 'label' },
    ]);
  });

  it('lists local HTML links as manifest entries grouped by the heading above them', () => {
    const doc = html(
      [
        '<h1>Docs</h1>',
        '<a href="announce.html">News</a>',
        '<h2>Guides</h2>',
        '<ul><li><a href="ncurses-intro.html#init">Intro</a></li>',
        '<li><a href="README.txt">readme</a></li>',
        '<li><a href="https://example.org/x.html">elsewhere</a></li></ul>',
      ],
      '/docs/html/index.html',
    );
    expect(doc.isIndex).toBe(true);
    expect(doc.manifest).toEqual([
      {
        target: 'announce.html',
        resolved: '/docs/html/announce.html',
        line: 2,
        group: 'before any <h2> heading',
        kind: 'toc',
      },
      {
        target: 'ncurses-intro.html',
        resolved: '/docs/html/ncurses-intro.html',
        line: 4,
        group: 'under <h2> "Guides"',
        kind: 'toc',
      },
    ]);
  });

  it('is an index only under an index name or the configured manifest name', () => {
    expect(html(['<p>x</p>'], '/docs/guide.html').isIndex).toBe(false);
    expect(html(['<p>x</p>'], '/docs/INDEX.HTM').isIndex).toBe(true);
    expect(
      htmlReader.read('<p>x</p>', { path: '/docs/toc.html', manifest: 'toc.html' }).isIndex,
    ).toBe(true);
  });

  it('reads the line of a tag that spans lines from where it starts', () => {
    const doc = html(['<p>one</p>', '<h3', '  class="x">Wrapped', 'heading</h3>', '<p>two</p>']);
    expect(doc.headings).toMatchObject([{ plain: 'Wrapped heading', line: 2 }]);
    expect(doc.paragraphs.map((p) => p.line)).toEqual([1, 5]);
  });
});
