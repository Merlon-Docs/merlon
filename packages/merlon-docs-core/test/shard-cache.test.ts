import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest';
import { mkdirSync, mkdtempSync, writeFileSync, rmSync, readFileSync } from 'node:fs';
import type { PathOrFileDescriptor } from 'node:fs';
import { join, resolve } from 'node:path';
import { tmpdir } from 'node:os';

const readCounts = new Map<string, number>();

vi.mock('node:fs', async (importOriginal) => {
  const fsActual = await importOriginal<typeof import('node:fs')>();
  return {
    ...fsActual,
    readFileSync: (path: PathOrFileDescriptor, ...args: unknown[]) => {
      const key = resolve(String(path));
      readCounts.set(key, (readCounts.get(key) ?? 0) + 1);
      return (fsActual.readFileSync as (...a: unknown[]) => unknown)(path, ...args);
    },
  };
});

import { compileGuideResultsWithContext } from '../src/compile/assemble.js';
import { lintLinks } from '../src/links/lint.js';

describe('shard cache (#64 P1)', () => {
  beforeEach(() => {
    readCounts.clear();
  });

  afterEach(() => {
    vi.clearAllMocks();
  });

  function writeFixture(docs: string): void {
    const guide = join(docs, 'g');
    mkdirSync(guide, { recursive: true });
    writeFileSync(
      join(guide, 'index.md'),
      '# Guide\n\n- [intro](introduction.md)\n- [more](details.md)\n',
    );
    writeFileSync(
      join(guide, 'introduction.md'),
      '# Guide\n\n## Hello\n\n[details](./details.md)\n[anchor](#hello)\n',
    );
    writeFileSync(
      join(guide, 'details.md'),
      '# Guide\n\n## Details\n\nSee [hello](./introduction.md#hello)\n',
    );
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

  it('reads each shard file at most once during compileGuideResultsWithContext', () => {
    const docs = mkdtempSync(join(tmpdir(), 'merlon-shard-cache-'));
    try {
      writeFixture(docs);
      const intro = resolve(docs, 'g/introduction.md');
      const details = resolve(docs, 'g/details.md');

      const opts = {
        guidesRoot: docs,
        compileOrder: ['g'],
        guides: [{ name: 'g', path: 'g' }],
        docsRoot: docs,
        config: JSON.parse(readFileSync(join(docs, 'merlon.config.json'), 'utf-8')),
      };

      compileGuideResultsWithContext(opts);

      expect(readCounts.get(intro)).toBe(1);
      expect(readCounts.get(details)).toBe(1);
    } finally {
      rmSync(docs, { recursive: true, force: true });
    }
  });

  it('lintLinks with linkIndex does not re-read shard sources', () => {
    const docs = mkdtempSync(join(tmpdir(), 'merlon-shard-cache-lint-'));
    try {
      writeFixture(docs);
      const config = JSON.parse(readFileSync(join(docs, 'merlon.config.json'), 'utf-8'));
      const opts = {
        guidesRoot: docs,
        compileOrder: ['g'],
        guides: [{ name: 'g', path: 'g' }],
        docsRoot: docs,
        config,
      };

      const intro = resolve(docs, 'g/introduction.md');
      const details = resolve(docs, 'g/details.md');

      const { results, linkIndex, shardCache } = compileGuideResultsWithContext(opts);
      const readsAfterCompile = new Map(readCounts);

      lintLinks({
        config,
        docsRoot: docs,
        results,
        compileOptions: opts,
        linkIndex,
        shardCache,
      });

      expect(readCounts.get(intro)).toBe(readsAfterCompile.get(intro));
      expect(readCounts.get(details)).toBe(readsAfterCompile.get(details));
    } finally {
      rmSync(docs, { recursive: true, force: true });
    }
  });
});
