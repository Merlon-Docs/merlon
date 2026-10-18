import { describe, it, expect, vi, afterEach } from 'vitest';
import { mkdirSync, mkdtempSync, writeFileSync, rmSync } from 'node:fs';
import { join } from 'node:path';
import { tmpdir } from 'node:os';
import * as merlonCore from '@merlon-docs/merlon-docs-core';
import {
  compileWorkspace,
  runBuiltInLinkLintFromWorkspace,
  writeCompiledFromWorkspace,
} from '../src/compile-workspace.js';

describe('compile-once per command (#64 P0)', () => {
  afterEach(() => {
    vi.restoreAllMocks();
  });

  function writeMinimalFixture(docs: string): void {
    const guide = join(docs, 'g');
    mkdirSync(guide, { recursive: true });
    writeFileSync(join(guide, 'index.md'), '# Guide\n\n- [intro](introduction.md)\n');
    writeFileSync(join(guide, 'introduction.md'), '# Guide\n\n## Hello\n\n[anchor](#hello)\n');
    writeFileSync(
      join(docs, 'merlon.config.json'),
      JSON.stringify({
        outputDir: '_build',
        outputFile: 'guides.md',
        compileOrder: ['g'],
        guides: [{ name: 'g', path: 'g' }],
        refs: { registryFile: 'refs.json' },
        lint: { links: { enabled: true } },
      }),
    );
  }

  it('compileWorkspace invokes compileGuideResultsWithContext once', () => {
    const docs = mkdtempSync(join(tmpdir(), 'merlon-perf-'));
    try {
      writeMinimalFixture(docs);
      const config = merlonCore.loadConfig('merlon.config.json', docs);
      const spy = vi.spyOn(merlonCore, 'compileGuideResultsWithContext');

      const workspace = compileWorkspace(config, docs, {});
      writeCompiledFromWorkspace(config, docs, workspace);
      runBuiltInLinkLintFromWorkspace(config, docs, workspace);

      expect(spy).toHaveBeenCalledTimes(1);
    } finally {
      rmSync(docs, { recursive: true, force: true });
    }
  });
});
