import assert from 'node:assert/strict';
import { describe, it } from 'node:test';
import { samplePages } from './check-a11y.mjs';

describe('check-a11y', () => {
  it('samples the landing page and the first page of each section', () => {
    const pages = [
      '/mdcp/guide/zeta/',
      '/mdcp/',
      '/mdcp/guide/alpha/',
      '/mdcp/concepts/adr/',
      '/mdcp/concepts/about/',
      '/mdcp/sitemap.html',
    ];
    assert.deepEqual(samplePages(pages, '/mdcp'), [
      '/mdcp/',
      '/mdcp/concepts/about/',
      '/mdcp/guide/alpha/',
    ]);
  });
});
