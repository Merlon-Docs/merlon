import assert from 'node:assert/strict';
import { mkdtempSync, rmSync, writeFileSync } from 'node:fs';
import { tmpdir } from 'node:os';
import { join } from 'node:path';
import { after, describe, it } from 'node:test';
import { loadTokenizer, parseArgs, summarize } from './bench-context-size.mjs';

describe('bench-context-size', () => {
  const dir = mkdtempSync(join(tmpdir(), 'mdcp-bench-'));
  after(() => rmSync(dir, { recursive: true, force: true }));

  it('defaults to o200k_base and reads the environment', () => {
    assert.equal(parseArgs([]).tokenizer, 'o200k_base');
    assert.equal(parseArgs([], { MDCP_TOKENIZER: 'cl100k_base' }).tokenizer, 'cl100k_base');
    assert.equal(parseArgs(['--tokenizer', 'chars4'], { MDCP_TOKENIZER: 'x' }).tokenizer, 'chars4');
    assert.equal(parseArgs(['--no-write']).write, false);
    assert.throws(() => parseArgs(['--bogus']), /Unknown argument/);
  });

  it('counts with a gpt-tokenizer encoding', async () => {
    const t = await loadTokenizer({ tokenizer: 'o200k_base' });
    assert.equal(t.name, 'o200k_base');
    assert.ok(t.count('Shards are small Markdown files.') > 0);
  });

  it('estimates characters divided by four with chars4', async () => {
    const t = await loadTokenizer({ tokenizer: 'chars4' });
    assert.equal(t.count('abcdefghi'), 3);
  });

  it('loads a custom counter module', async () => {
    const mod = join(dir, 'words.mjs');
    writeFileSync(mod, 'export const countTokens = (t) => t.split(/\\s+/).length;\n');
    const t = await loadTokenizer({ tokenizerModule: mod });
    assert.equal(t.name, 'module:words.mjs');
    assert.equal(t.count('one two three'), 3);
  });

  it('rejects an unknown tokenizer', async () => {
    await assert.rejects(loadTokenizer({ tokenizer: 'nope' }), /Unknown tokenizer/);
  });

  it('summarizes mean, median, p90 and max', () => {
    assert.deepEqual(summarize([10, 1, 4, 3, 2]), {
      count: 5,
      mean: 4,
      median: 3,
      p90: 10,
      max: 10,
    });
    assert.deepEqual(summarize([]), { count: 0, mean: 0, median: 0, p90: 0, max: 0 });
  });
});
