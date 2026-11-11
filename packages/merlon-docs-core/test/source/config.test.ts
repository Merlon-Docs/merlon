import { describe, it, expect } from 'vitest';
import { mkdirSync, writeFileSync } from 'node:fs';
import { dirname, join } from 'node:path';
import { MerlonConfigSchema, MerlonConfigFileSchema } from '../../src/config/schema.js';
import { reviewDocs } from '../../src/validate/review.js';
import { useTmpDir } from '../helpers/tmp-dir.js';

describe('source-format config', () => {
  it('reads Markdown with the GFM format when sources is left out', () => {
    const config = MerlonConfigSchema.parse({ compileOrder: ['guide'] });
    expect(config.sources).toEqual([{ glob: '**/*.md', format: 'gfm' }]);
    expect(config.roots).toEqual([]);
    expect(config.sphinx).toBeUndefined();
  });

  it('accepts a review-only config with no compileOrder', () => {
    const config = MerlonConfigFileSchema.parse({
      configVersion: '1.1.0',
      sources: [
        { glob: '**/*.rst', format: 'rst' },
        { glob: '**/README', format: 'text' },
      ],
      roots: ['index.rst'],
      sphinx: { autosectionlabel: { prefixDocument: true }, ignoreLabels: ['^genindex$'] },
    });
    expect(config.compileOrder).toEqual([]);
    expect(config.sphinx?.autosectionlabel).toEqual({ prefixDocument: true, maxDepth: 0 });
    expect(config.sphinx?.ignoreLabels).toEqual(['^genindex$']);
  });

  it('still rejects an explicitly empty compileOrder and an empty sources list', () => {
    expect(() => MerlonConfigSchema.parse({ compileOrder: [] })).toThrow();
    expect(() => MerlonConfigSchema.parse({ sources: [] })).toThrow();
  });

  it('accepts per-guide review thresholds', () => {
    const config = MerlonConfigSchema.parse({
      compileOrder: ['ABI'],
      review: { guides: { ABI: { maxShardWords: 20000 } } },
    });
    expect(config.review.maxShardWords).toBe(2500);
    expect(config.review.guides).toEqual({ ABI: { maxShardWords: 20000 } });
  });
});

describe('per-guide review thresholds', () => {
  const work = useTmpDir('merlon-review-guides-');

  it('lets a reference guide hold long shards that another guide may not', () => {
    const docs = join(work.path, 'docs');
    const long = `# Reference\n\n${Array.from({ length: 30 }, () => 'word').join(' ')}\n`;
    const files: Record<string, string> = {
      'ref/index.md': '# Ref\n\n- [Page](page.md)\n',
      'ref/page.md': long,
      'guide/index.md': '# Guide\n\n- [Page](page.md)\n',
      'guide/page.md': long.replace('Reference', 'Guide page'),
    };
    for (const [rel, body] of Object.entries(files)) {
      mkdirSync(dirname(join(docs, rel)), { recursive: true });
      writeFileSync(join(docs, rel), body);
    }
    const { findings } = reviewDocs({
      guides: ['ref', 'guide'].map((name) => ({ name, dir: join(docs, name) })),
      docsRoot: docs,
      thresholds: { maxShardWords: 20 },
      guideThresholds: { ref: { maxShardWords: 100 } },
    });
    expect(findings.filter((f) => f.signal === 'long-shard').map((f) => f.files)).toEqual([
      ['guide/page.md'],
    ]);
  });
});
