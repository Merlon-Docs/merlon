import { describe, it, expect } from 'vitest';
import { mkdirSync, writeFileSync } from 'node:fs';
import { dirname, join } from 'node:path';
import {
  reviewDocs,
  formatReviewReport,
  normalizeParagraph,
  normalizeTitle,
  paragraphUnits,
  shardProseWords,
  DEFAULT_REVIEW_THRESHOLDS,
  REVIEW_FIXES,
  type ReviewOptions,
} from '../src/validate/review.js';
import { maskNonProse } from '../src/markdown/index.js';
import { MdcpConfigSchema } from '../src/config/schema.js';
import { useTmpDir } from './helpers/tmp-dir.js';

const SENTENCE =
  'Run the compile step after editing any shard so the published guides stay in sync with the sources';

function words(n: number, word = 'alpha'): string {
  return Array.from({ length: n }, () => word).join(' ');
}

describe('reviewDocs', () => {
  const work = useTmpDir('mdcp-review-');

  /** Write files under docs root (`work.path/docs`); keys are docs-relative paths. */
  function writeDocs(files: Record<string, string>): string {
    const docs = join(work.path, 'docs');
    for (const [rel, body] of Object.entries(files)) {
      const abs = join(docs, rel);
      mkdirSync(dirname(abs), { recursive: true });
      writeFileSync(abs, body);
    }
    return docs;
  }

  function run(docs: string, names: string[], extra: Partial<ReviewOptions> = {}) {
    return reviewDocs({
      guides: names.map((name) => ({ name, dir: join(docs, name) })),
      docsRoot: docs,
      ...extra,
    });
  }

  function indexWith(n: number, prefix = ''): string {
    const items = Array.from({ length: n }, (_, i) => `- [S${i}](./s${i}.md)`).join('\n');
    return `# Guide\n\n${prefix}${items}\n`;
  }

  function shardsFor(guide: string, n: number): Record<string, string> {
    const out: Record<string, string> = {};
    for (let i = 0; i < n; i++) out[`${guide}/s${i}.md`] = `# Section ${i}\n\nBody ${i}.\n`;
    return out;
  }

  describe('index-size', () => {
    it('flags an index with more ungrouped shard links than the limit', () => {
      const docs = writeDocs({ 'g/index.md': indexWith(13), ...shardsFor('g', 13) });
      const { findings } = run(docs, ['g']);
      const f = findings.filter((x) => x.signal === 'index-size');
      expect(f).toHaveLength(1);
      expect(f[0].files).toEqual(['g/index.md']);
      expect(f[0].detail).toContain('13 shard links before any ## heading');
      expect(f[0].fix).toBe(REVIEW_FIXES['index-size']);
    });

    it('does not flag an index at the limit', () => {
      const docs = writeDocs({ 'g/index.md': indexWith(12), ...shardsFor('g', 12) });
      expect(run(docs, ['g']).findings).toEqual([]);
    });

    it('does not flag links grouped under ## headings', () => {
      const groupA = Array.from({ length: 8 }, (_, i) => `- [S${i}](./s${i}.md)`).join('\n');
      const groupB = Array.from({ length: 8 }, (_, i) => `- [S${i + 8}](./s${i + 8}.md)`).join(
        '\n',
      );
      const docs = writeDocs({
        'g/index.md': `# Guide\n\n## Set up\n\n${groupA}\n\n### Operate\n\n${groupB}\n`,
        ...shardsFor('g', 16),
      });
      expect(run(docs, ['g']).findings.filter((f) => f.signal === 'index-size')).toEqual([]);
    });

    it('flags one oversized ## group and names it', () => {
      const docs = writeDocs({
        'g/index.md': indexWith(13).replace('# Guide\n\n', '# Guide\n\n## Sections\n\n'),
        ...shardsFor('g', 13),
      });
      const f = run(docs, ['g']).findings.find((x) => x.signal === 'index-size');
      expect(f?.detail).toContain('13 shard links under "## Sections"');
    });

    it('ignores links in code fences, external URLs, and anchors; dedupes repeated targets', () => {
      const fenced = '```md\n' + indexWith(20) + '```\n';
      const docs = writeDocs({
        'g/index.md':
          indexWith(3) +
          '\n' +
          fenced +
          '\n- [ext](https://example.com/a.md)\n- [toc](#table-of-contents)\n- [again](./s0.md#part)\n',
        ...shardsFor('g', 3),
      });
      expect(run(docs, ['g'], { thresholds: { maxIndexEntries: 3 } }).findings).toEqual([]);
    });

    it('reviews nested indexes reached through the manifest', () => {
      const nested: Record<string, string> = { 'g/index.md': '# G\n\n- [Sub](./sub/index.md)\n' };
      nested['g/sub/index.md'] = indexWith(13);
      for (let i = 0; i < 13; i++) nested[`g/sub/s${i}.md`] = `# Sub ${i}\n`;
      const docs = writeDocs(nested);
      const f = run(docs, ['g']).findings.filter((x) => x.signal === 'index-size');
      expect(f.map((x) => x.files[0])).toEqual(['g/sub/index.md']);
    });

    it('honors maxIndexEntries from config thresholds', () => {
      const docs = writeDocs({ 'g/index.md': indexWith(5), ...shardsFor('g', 5) });
      expect(run(docs, ['g'], { thresholds: { maxIndexEntries: 4 } }).findings).toHaveLength(1);
      expect(run(docs, ['g'], { thresholds: { maxIndexEntries: 5 } }).findings).toHaveLength(0);
    });
  });

  describe('long-shard', () => {
    it('flags a shard over maxShardWords', () => {
      const docs = writeDocs({
        'g/index.md': '# G\n\n- [Big](./big.md)\n',
        'g/big.md': `# Big\n\n${words(40)}\n`,
      });
      const f = run(docs, ['g'], { thresholds: { maxShardWords: 30 } }).findings;
      expect(f).toHaveLength(1);
      expect(f[0]).toMatchObject({
        signal: 'long-shard',
        severity: 'warning',
        files: ['g/big.md'],
        fix: REVIEW_FIXES['long-shard'],
      });
      expect(f[0].detail).toBe('41 prose words (limit 30)');
    });

    it('does not count fenced code, front matter, HTML comments, or link targets', () => {
      const docs = writeDocs({
        'g/index.md': '# G\n\n- [Big](./big.md)\n',
        'g/big.md': [
          '---',
          `title: ${words(50)}`,
          '---',
          '# Big',
          '',
          '<!-- ' + words(50),
          words(50) + ' -->',
          '',
          '```bash',
          words(50),
          '```',
          '',
          '- [one two](https://example.com/very/long/path/with/many/segments)',
        ].join('\n'),
      });
      const { findings } = run(docs, ['g'], { thresholds: { maxShardWords: 5 } });
      expect(findings).toEqual([]);
    });

    it('uses the 2500-word default', () => {
      expect(DEFAULT_REVIEW_THRESHOLDS.maxShardWords).toBe(2500);
      const docs = writeDocs({
        'g/index.md': '# G\n\n- [Big](./big.md)\n',
        'g/big.md': `# Big\n\n${words(2499)}\n`,
      });
      expect(run(docs, ['g']).findings).toEqual([]);
    });
  });

  describe('duplicate-paragraph', () => {
    it('reports every location of a repeated paragraph across shards', () => {
      const docs = writeDocs({
        'g/index.md': '# G\n\n- [A](./a.md)\n- [B](./b.md)\n',
        'g/a.md': `# A\n\n${SENTENCE} and more words here for the threshold today.\n`,
        'g/b.md': `# B\n\nIntro.\n\n**${SENTENCE}** and more   words here for the\nthreshold today.\n`,
        'h/index.md': '# H\n\n- [C](./c.md)\n',
        'h/c.md': `# C\n\n- ${SENTENCE.toUpperCase()} and more words here for the threshold today.\n`,
      });
      const { findings } = run(docs, ['g', 'h']);
      const dup = findings.filter((f) => f.signal === 'duplicate-paragraph');
      expect(dup).toHaveLength(1);
      expect(dup[0].files).toEqual(['g/a.md', 'g/b.md', 'h/c.md']);
      expect(dup[0].detail).toContain('g/a.md:3, g/b.md:5, h/c.md:3');
      expect(dup[0].fix).toBe(REVIEW_FIXES['duplicate-paragraph']);
    });

    it('treats link targets as noise when comparing', () => {
      const para = (target: string) =>
        `See [the compile guide](${target}) before ${SENTENCE.toLowerCase()} each day.`;
      const docs = writeDocs({
        'g/index.md': '# G\n\n- [A](./a.md)\n- [B](./b.md)\n',
        'g/a.md': `# A\n\n${para('./compile.md')}\n`,
        'g/b.md': `# B\n\n${para('../other/compile.md#top')}\n`,
      });
      expect(run(docs, ['g']).findings.map((f) => f.signal)).toEqual(['duplicate-paragraph']);
    });

    it('ignores short paragraphs, repeats within one shard, and code blocks', () => {
      const long = `${SENTENCE} and more words here for the threshold today.`;
      const docs = writeDocs({
        'g/index.md': '# G\n\n- [A](./a.md)\n- [B](./b.md)\n',
        'g/a.md': `# A\n\n${long}\n\n${long}\n\n${SENTENCE}\n\n\`\`\`\n${words(60)}\n\`\`\`\n`,
        'g/b.md': `# B\n\n${SENTENCE}\n\n~~~\n${words(60)}\n~~~\n`,
      });
      expect(run(docs, ['g']).findings).toEqual([]);
    });

    it('honors minDuplicateWords from thresholds', () => {
      const docs = writeDocs({
        'g/index.md': '# G\n\n- [A](./a.md)\n- [B](./b.md)\n',
        'g/a.md': `# A\n\n${SENTENCE}\n`,
        'g/b.md': `# B\n\n${SENTENCE}\n`,
      });
      expect(run(docs, ['g'], { thresholds: { minDuplicateWords: 10 } }).findings).toHaveLength(1);
    });
  });

  describe('similar-titles', () => {
    it('flags shards in one guide whose first H1 matches after normalization', () => {
      const docs = writeDocs({
        'g/index.md': '# G\n\n- [A](./a.md)\n- [B](./b.md)\n',
        'g/a.md': '# Config Essentials\n',
        'g/b.md': '# config: **essentials**!\n',
      });
      const f = run(docs, ['g']).findings;
      expect(f).toHaveLength(1);
      expect(f[0]).toMatchObject({
        signal: 'similar-titles',
        files: ['g/a.md', 'g/b.md'],
        fix: REVIEW_FIXES['similar-titles'],
      });
      expect(f[0].detail).toContain('guide "g"');
    });

    it('does not strip trailing words such as "guide" or "overview"', () => {
      const docs = writeDocs({
        'g/index.md': '# G\n\n- [A](./a.md)\n- [B](./b.md)\n',
        'g/a.md': '# Compile\n',
        'g/b.md': '# Compile overview\n',
      });
      expect(run(docs, ['g']).findings).toEqual([]);
    });

    it('does not compare titles across guides', () => {
      const docs = writeDocs({
        'g/index.md': '# G\n\n- [About](./about.md)\n',
        'g/about.md': '# About\n',
        'h/index.md': '# H\n\n- [About](./about.md)\n',
        'h/about.md': '# About\n',
      });
      expect(run(docs, ['g', 'h']).findings).toEqual([]);
    });

    it('uses the first H1 outside code fences', () => {
      const docs = writeDocs({
        'g/index.md': '# G\n\n- [A](./a.md)\n- [B](./b.md)\n',
        'g/a.md': '```\n# Same\n```\n\n# Alpha\n',
        'g/b.md': '# Same\n',
      });
      expect(run(docs, ['g']).findings).toEqual([]);
    });
  });

  describe('guide filter', () => {
    function twoGuides(): string {
      return writeDocs({
        'g/index.md': '# G\n\n- [A](./a.md)\n- [B](./b.md)\n',
        'g/a.md': `# Setup\n\n${SENTENCE} and more words here for the threshold today.\n`,
        'g/b.md': '# Setup\n\nOther body.\n',
        'h/index.md': '# H\n\n- [C](./c.md)\n- [D](./d.md)\n',
        'h/c.md': `# C\n\n${SENTENCE} and more words here for the threshold today.\n`,
        'h/d.md': `# D\n\n${words(60)}\n`,
      });
    }

    it('keeps findings that touch the guide, including duplicates shared with other guides', () => {
      const docs = twoGuides();
      const all = run(docs, ['g', 'h'], { thresholds: { maxShardWords: 40 } });
      expect(all.findings.map((f) => f.signal)).toEqual([
        'long-shard',
        'duplicate-paragraph',
        'similar-titles',
      ]);
      const h = run(docs, ['g', 'h'], { guide: 'h', thresholds: { maxShardWords: 40 } });
      expect(h.findings.map((f) => [f.signal, f.files])).toEqual([
        ['long-shard', ['h/d.md']],
        ['duplicate-paragraph', ['g/a.md', 'h/c.md']],
      ]);
      expect(h.shardCount).toBe(3);
    });

    it('throws on a guide name that is not in compileOrder', () => {
      const docs = twoGuides();
      expect(() => run(docs, ['g', 'h'], { guide: 'nope' })).toThrow(
        'Unknown guide "nope". Guides: g, h',
      );
    });
  });

  describe('discovery and ignore', () => {
    it('skips files matched by scan.ignore relative to the scan root', () => {
      const docs = writeDocs({
        'g/index.md': '# G\n\n- [A](./a.md)\n- [B](./drafts/b.md)\n',
        'g/a.md': '# Same\n',
        'g/drafts/b.md': '# Same\n',
      });
      expect(run(docs, ['g']).findings).toHaveLength(1);
      const ignored = run(docs, ['g'], { scanRoot: work.path, ignore: ['docs/g/drafts/**'] });
      expect(ignored.findings).toEqual([]);
      expect(ignored.shardCount).toBe(2);
    });

    it('assigns scopeRoot shards to the first guide that reaches them', () => {
      const docs = writeDocs({
        'g/index.md': '# G\n\n- [Term](../glossary/term.md)\n',
        'h/index.md': '# H\n\n- [Term](../glossary/term.md)\n',
        'glossary/term.md': '# Term\n',
      });
      const glossary = join(docs, 'glossary');
      const result = reviewDocs({
        guides: [
          { name: 'g', dir: join(docs, 'g'), scopeRoot: glossary },
          { name: 'h', dir: join(docs, 'h'), scopeRoot: glossary },
        ],
        docsRoot: docs,
      });
      expect(result.shardCount).toBe(3);
    });

    it('skips missing guide directories and guides without a manifest', () => {
      const docs = writeDocs({ 'g/a.md': '# A\n' });
      const result = run(docs, ['g', 'missing']);
      expect(result.findings).toEqual([]);
      expect(result.shardCount).toBe(0);
    });

    it('returns findings sorted by signal, then file', () => {
      const docs = writeDocs({
        'g/index.md': `${indexWith(2)}- [Big](./big.md)\n`,
        'g/s0.md': '# Same\n',
        'g/s1.md': '# Same\n',
        'g/big.md': `# Big\n\n${words(20)}\n`,
      });
      const { findings } = run(docs, ['g'], {
        thresholds: { maxIndexEntries: 2, maxShardWords: 10 },
      });
      expect(findings.map((f) => [f.signal, f.files[0]])).toEqual([
        ['index-size', 'g/index.md'],
        ['long-shard', 'g/big.md'],
        ['similar-titles', 'g/s0.md'],
      ]);
    });
  });

  describe('output', () => {
    it('produces a JSON-serializable finding shape', () => {
      const docs = writeDocs({
        'g/index.md': '# G\n\n- [A](./a.md)\n- [B](./b.md)\n',
        'g/a.md': '# Same\n',
        'g/b.md': '# Same\n',
      });
      const parsed = JSON.parse(JSON.stringify(run(docs, ['g']).findings));
      expect(parsed).toEqual([
        {
          signal: 'similar-titles',
          severity: 'warning',
          files: ['g/a.md', 'g/b.md'],
          detail: '2 shards in guide "g" share the title "Same"',
          fix: REVIEW_FIXES['similar-titles'],
        },
      ]);
    });

    it('formats a grouped human report and a clean summary', () => {
      const docs = writeDocs({
        'g/index.md': '# G\n\n- [A](./a.md)\n- [B](./b.md)\n',
        'g/a.md': '# Same\n',
        'g/b.md': '# Same\n',
      });
      const text = formatReviewReport(run(docs, ['g']));
      expect(text).toContain('similar-titles (1)\n  - g/a.md, g/b.md\n');
      expect(text).toContain(`fix: ${REVIEW_FIXES['similar-titles']}`);
      expect(text).toContain('mdcp review: 1 finding(s) in 3 shard(s)');
      const clean = formatReviewReport({
        findings: [],
        shardCount: 4,
        thresholds: DEFAULT_REVIEW_THRESHOLDS,
      });
      expect(clean).toBe('mdcp review: no findings in 4 shard(s)');
    });
  });
});

describe('review helpers', () => {
  it('normalizes case, whitespace, emphasis, and link targets', () => {
    expect(normalizeParagraph('See **the** [Guide](./a.md)  and _More_ `code`')).toBe(
      'see the guide and more code',
    );
    expect(normalizeParagraph('![Alt](x.png) and [ref][id]')).toBe('alt and ref');
  });

  it('normalizes titles by folding punctuation', () => {
    expect(normalizeTitle('Config: *Essentials*!')).toBe('config essentials');
    expect(normalizeTitle('Commands reference')).not.toBe(normalizeTitle('Commands'));
  });

  it('splits paragraph units at list items, headings, and tables', () => {
    const units = paragraphUnits(
      maskNonProse(
        'Para one\ncontinues.\n\n- item a\n  wraps\n- item b\n## H\n| a | b |\n> quoted',
      ),
    );
    expect(units).toEqual([
      { line: 1, text: 'Para one continues.' },
      { line: 4, text: 'item a wraps' },
      { line: 6, text: 'item b' },
      { line: 9, text: 'quoted' },
    ]);
  });

  it('counts table cell text and headings as prose words', () => {
    const lines = maskNonProse('# Title here\n\n| Col | Two |\n| --- | --- |\n| a b | c |\n');
    expect(shardProseWords(lines)).toBe(7);
  });

  it('skips reference link definitions', () => {
    expect(shardProseWords(maskNonProse('[id]: https://example.com/a/b\nword'))).toBe(1);
  });

  it('parses the review config block with defaults', () => {
    const cfg = MdcpConfigSchema.parse({ compileOrder: ['g'] });
    expect(cfg.review).toEqual(DEFAULT_REVIEW_THRESHOLDS);
    const partial = MdcpConfigSchema.parse({ compileOrder: ['g'], review: { maxShardWords: 900 } });
    expect(partial.review).toEqual({ ...DEFAULT_REVIEW_THRESHOLDS, maxShardWords: 900 });
    expect(() =>
      MdcpConfigSchema.parse({ compileOrder: ['g'], review: { maxIndexEntries: 0 } }),
    ).toThrow();
  });
});
