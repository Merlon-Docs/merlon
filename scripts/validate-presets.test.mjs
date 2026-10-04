import assert from 'node:assert/strict';
import { spawnSync } from 'node:child_process';
import { dirname, join } from 'node:path';
import { describe, it } from 'node:test';
import { fileURLToPath } from 'node:url';

const root = join(dirname(fileURLToPath(import.meta.url)), '..');

describe('validate-presets', () => {
  it('validates the MDCP Vale style and Packages layout', () => {
    const result = spawnSync(process.execPath, ['scripts/validate-presets.mjs'], {
      cwd: root,
      encoding: 'utf8',
    });

    assert.equal(result.status, 0, result.stderr);
    assert.match(result.stdout, /OK vale\/MDCP\/BareChapterRef\.yml/);
    assert.match(result.stdout, /OK vale\/MDCP\/UnlinkedSeeChapter\.yml/);
    assert.match(result.stdout, /OK vale\/MDCP\/BareSectionRef\.yml/);
    assert.match(result.stdout, /OK vale\/MDCP\/UnlinkedSeeSection\.yml/);
    assert.match(result.stdout, /OK vale\/MDCP\/DatedClaim\.yml/);
    assert.match(result.stdout, /OK vale\/package\/\.vale\.ini/);
    assert.match(result.stdout, /OK vale\/package\/styles\/MDCP\/BareSectionRef\.yml/);
    assert.match(result.stdout, /OK vale\/package\/styles\/MDCP\/UnlinkedSeeSection\.yml/);
    assert.match(result.stdout, /OK vale\/package\/styles\/MDCP\/DatedClaim\.yml/);
  });
});
