import assert from 'node:assert/strict';
import { describe, it } from 'node:test';
import { samplePages, widestTable } from './check-a11y.mjs';

describe('check-a11y', () => {
  it('samples the landing page and the first page of each section', () => {
    const pages = [
      '/merlon/guide/zeta/',
      '/merlon/',
      '/merlon/guide/alpha/',
      '/merlon/concepts/adr/',
      '/merlon/concepts/about/',
      '/merlon/sitemap.html',
    ];
    assert.deepEqual(samplePages(pages, '/merlon'), [
      '/merlon/',
      '/merlon/concepts/about/',
      '/merlon/guide/alpha/',
    ]);
  });

  it('adds the page with the widest table in each section', () => {
    const pages = [
      '/merlon/',
      '/merlon/guide/alpha/',
      '/merlon/guide/beta/',
      '/merlon/guide/gamma/',
      '/merlon/guide/delta/',
      '/merlon/concepts/about/',
    ];
    const cols = { '/merlon/guide/beta/': 3, '/merlon/guide/gamma/': 5, '/merlon/guide/delta/': 5 };
    assert.deepEqual(
      samplePages(pages, '/merlon', (path) => cols[path] ?? 0),
      ['/merlon/', '/merlon/concepts/about/', '/merlon/guide/alpha/', '/merlon/guide/delta/'],
    );
  });

  it('counts the cells of the widest table row', () => {
    const html =
      '<table><thead><tr><th>a</th><th>b</th></tr></thead></table>' +
      '<p>x</p><table class="t"><tr>\n<td>1</td><td>2</td><td>3</td></tr></table>';
    assert.equal(widestTable(html), 3);
    assert.equal(widestTable('<p>no tables</p><track src="x">'), 0);
  });
});
