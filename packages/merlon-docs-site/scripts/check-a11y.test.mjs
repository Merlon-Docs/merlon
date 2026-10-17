import assert from 'node:assert/strict';
import { describe, it } from 'node:test';
import { samplePages } from './check-a11y.mjs';

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
});
