import assert from 'node:assert/strict';
import { mkdirSync, mkdtempSync, rmSync, writeFileSync } from 'node:fs';
import { tmpdir } from 'node:os';
import { join } from 'node:path';
import { after, describe, it } from 'node:test';
import { changedPaths, indexNowKey, pagePaths, pageUrl, submission } from './indexnow.mjs';

describe('indexnow', () => {
  it('submits pages that are new or whose hash changed, and skips unchanged ones', () => {
    const current = { 'index.html': 'a2', 'guide/index.html': 'b1', 'new/index.html': 'c1' };
    const previous = { 'index.html': 'a1', 'guide/index.html': 'b1', 'gone/index.html': 'd1' };
    assert.deepEqual(changedPaths(current, previous), ['index.html', 'new/index.html']);
  });

  it('submits every page when no previous hashes exist', () => {
    assert.deepEqual(changedPaths({ 'b.html': '1', 'a.html': '2' }, {}), ['a.html', 'b.html']);
  });

  it('maps a page path to its public URL under the base', () => {
    assert.equal(pageUrl('index.html', 'https://x.github.io', '/r'), 'https://x.github.io/r/');
    assert.equal(
      pageUrl('guide/index.html', 'https://x.github.io', '/r'),
      'https://x.github.io/r/guide/',
    );
  });

  it('builds a request whose key location is under the base', () => {
    assert.deepEqual(submission(['https://x.github.io/r/'], 'k', 'https://x.github.io', '/r'), {
      host: 'x.github.io',
      key: 'k',
      keyLocation: 'https://x.github.io/r/k.txt',
      urlList: ['https://x.github.io/r/'],
    });
  });

  describe('pagePaths', () => {
    const dist = mkdtempSync(join(tmpdir(), 'merlon-indexnow-'));
    after(() => rmSync(dist, { recursive: true, force: true }));

    it('lists built pages and leaves out the 404 page and other files', () => {
      mkdirSync(join(dist, 'guide'), { recursive: true });
      writeFileSync(join(dist, 'index.html'), '');
      writeFileSync(join(dist, 'guide', 'index.html'), '');
      writeFileSync(join(dist, '404.html'), '');
      writeFileSync(join(dist, 'sitemap-0.xml'), '');
      assert.deepEqual(pagePaths(dist), ['guide/index.html', 'index.html']);
    });
  });

  describe('indexNowKey', () => {
    const dir = mkdtempSync(join(tmpdir(), 'merlon-indexnow-key-'));
    after(() => rmSync(dir, { recursive: true, force: true }));

    it('reads the key from the one file whose contents match its name', () => {
      writeFileSync(join(dir, 'abc123ef.txt'), 'abc123ef\n');
      writeFileSync(join(dir, 'deadbeef.txt'), 'something else');
      writeFileSync(join(dir, 'robots.txt'), 'User-agent: *');
      assert.equal(indexNowKey(dir), 'abc123ef');
    });

    it('rejects a public directory with no key file', () => {
      const empty = mkdtempSync(join(tmpdir(), 'merlon-indexnow-empty-'));
      try {
        assert.throws(() => indexNowKey(empty), /exactly one IndexNow key file/);
      } finally {
        rmSync(empty, { recursive: true, force: true });
      }
    });
  });
});
