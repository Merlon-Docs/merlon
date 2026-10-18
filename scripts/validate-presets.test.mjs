import assert from 'node:assert/strict';
import { spawnSync } from 'node:child_process';
import { dirname, join } from 'node:path';
import { describe, it } from 'node:test';
import { fileURLToPath } from 'node:url';

const root = join(dirname(fileURLToPath(import.meta.url)), '..');

describe('validate-presets', () => {
  it('validates the MerlonDocs Vale style and Packages layout', () => {
    const result = spawnSync(process.execPath, ['scripts/validate-presets.mjs'], {
      cwd: root,
      encoding: 'utf8',
    });

    assert.equal(result.status, 0, result.stderr);
    assert.match(result.stdout, /OK vale\/MerlonDocs\/BareChapterRef\.yml/);
    assert.match(result.stdout, /OK vale\/MerlonDocs\/UnlinkedSeeChapter\.yml/);
    assert.match(result.stdout, /OK vale\/MerlonDocs\/BareSectionRef\.yml/);
    assert.match(result.stdout, /OK vale\/MerlonDocs\/UnlinkedSeeSection\.yml/);
    assert.match(result.stdout, /OK vale\/MerlonDocs\/DatedClaim\.yml/);
    assert.match(result.stdout, /OK vale\/package\/\.vale\.ini/);
    assert.match(result.stdout, /OK vale\/package\/styles\/MerlonDocs\/BareSectionRef\.yml/);
    assert.match(result.stdout, /OK vale\/package\/styles\/MerlonDocs\/UnlinkedSeeSection\.yml/);
    assert.match(result.stdout, /OK vale\/package\/styles\/MerlonDocs\/DatedClaim\.yml/);
  });

  it('checks that the compiled preset keeps the shard rules and turns MD052 and MD053 on', () => {
    // The monolith is the shards joined together, so a rule the shard preset turns off for
    // shard content must stay off on the monolith too.
    const result = spawnSync(process.execPath, ['scripts/validate-presets.mjs'], {
      cwd: root,
      encoding: 'utf8',
    });

    assert.equal(result.status, 0, result.stderr);
    assert.match(
      result.stdout,
      /OK compiled preset matches the shard rules, with MD052 and MD053 on/,
    );
  });
});
