import assert from 'node:assert/strict';
import { describe, it } from 'node:test';
import { relabelVitestJobSummary } from './append-labeled-vitest-summary.mjs';

describe('relabelVitestJobSummary', () => {
  it('replaces the hardcoded Vitest H2 with a package label', () => {
    const dump = '## Vitest Test Report\n\n| File | Tests |\n| --- | --- |\n| a.ts | 1 |\n';
    const out = relabelVitestJobSummary('merlon-docs-core', dump);
    assert.match(out, /^## merlon-docs-core — Vitest\n/);
    assert.doesNotMatch(out, /## Vitest Test Report/);
    assert.match(out, /\| a\.ts \| 1 \|/);
  });

  it('prefixes a label when the dump has no Vitest H2', () => {
    const out = relabelVitestJobSummary('merlon-docs-cli', 'some body\n');
    assert.equal(out, '## merlon-docs-cli — Vitest\n\nsome body\n');
  });

  it('emits a labeled stub when the dump is empty', () => {
    const out = relabelVitestJobSummary('merlon-docs-core', '');
    assert.match(out, /^## merlon-docs-core — Vitest\n/);
    assert.match(out, /no Vitest job summary produced/);
  });
});
