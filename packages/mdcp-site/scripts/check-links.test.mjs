import assert from 'node:assert/strict';
import { mkdirSync, mkdtempSync, rmSync, writeFileSync } from 'node:fs';
import { tmpdir } from 'node:os';
import { dirname, join } from 'node:path';
import { after, describe, it } from 'node:test';
import { checkLinks, scanHtml } from './check-links.mjs';

describe('check-links', () => {
  const dist = mkdtempSync(join(tmpdir(), 'mdcp-site-dist-'));
  after(() => rmSync(dist, { recursive: true, force: true }));
  const write = (rel, html) => {
    mkdirSync(dirname(join(dist, rel)), { recursive: true });
    writeFileSync(join(dist, rel), html);
  };

  it('scanHtml collects ids and anchor hrefs', () => {
    const { ids, hrefs } = scanHtml(
      '<h2 id="a&amp;b">x</h2><a class="c" href="/b/x/?q=1&amp;r=2">y</a>',
    );
    assert.ok(ids.has('a&b'));
    assert.deepEqual(hrefs, ['/b/x/?q=1&r=2']);
  });

  it('scanHtml decodes entities once, so an escaped entity stays literal', () => {
    const { ids } = scanHtml('<h2 id="a&amp;lt;b">x</h2>');
    assert.ok(ids.has('a&lt;b'));
  });

  it('accepts valid pages, files and anchors; reports the rest', () => {
    write('index.html', '<a href="/b/guide/#usage">ok</a><a href="https://example.com">ext</a>');
    write(
      'guide/index.html',
      '<h2 id="usage">U</h2><a href="#usage">self</a><a href="../file.txt">file</a><a href="/b/missing/">bad</a><a href="/b/#nope">bad anchor</a>',
    );
    write('file.txt', 'x');
    const { pages, checked, broken } = checkLinks(dist, '/b');
    assert.equal(pages, 2);
    assert.equal(checked, 5);
    assert.deepEqual(
      broken.map((b) => b.href),
      ['/b/missing/', '/b/#nope'],
    );
  });
});
