/**
 * Cross-guide link rewriting — tests driven by the spec in
 * docs/client-core/compile-hooks/cross-guide-links.md.
 */
import { describe, it, expect } from 'vitest';
import { mkdirSync, writeFileSync, readFileSync } from 'node:fs';
import { join } from 'node:path';
import { buildGuideLinkIndex } from '../src/compile/guide-link-index.js';
import { rewriteCrossGuideFileLinks } from '../src/compile/publish-links.js';
import { compileGuideResults, writeCompiledGuides } from '../src/compile/assemble.js';
import type { CompileOptionsInput } from '../src/compile/assemble.js';
import { withTmpDir } from './helpers/tmp-dir.js';

function writeThreeGuideFixture(
  work: string,
  glossaryCompile?: CompileOptionsInput['guides'] extends (infer G)[] | undefined
    ? G extends { compile?: infer C }
      ? C
      : never
    : never,
): CompileOptionsInput {
  mkdirSync(join(work, 'glossary'), { recursive: true });
  mkdirSync(join(work, 'review', 'outcomes'), { recursive: true });
  mkdirSync(join(work, 'technical'), { recursive: true });

  writeFileSync(
    join(work, 'glossary', 'index.md'),
    '# Glossary\n\n## Sections\n\n- [Terms](./terms.md)\n',
  );
  writeFileSync(
    join(work, 'glossary', 'terms.md'),
    '## Terms\n\nSee [FIND-004](../review/outcomes/FIND-004.md) and [Deployment](../technical/deployment.md).\n',
  );

  writeFileSync(
    join(work, 'review', 'shards.md'),
    '# Architecture review\n\n## Sections\n\n- [Outcomes](./review-outcomes.md)\n',
  );
  writeFileSync(
    join(work, 'review', 'review-outcomes.md'),
    '## Review outcomes\n\nDetails in [FIND-004](./outcomes/FIND-004.md).\n',
  );
  writeFileSync(
    join(work, 'review', 'outcomes', 'FIND-004.md'),
    '# FIND-004 — Example finding\n\nFinding body.\n',
  );

  writeFileSync(
    join(work, 'technical', 'index.md'),
    '# Technical guide\n\n## Sections\n\n- [Deployment](./deployment.md)\n',
  );
  writeFileSync(join(work, 'technical', 'deployment.md'), '# Deployment\n\nDeploy steps.\n');

  return {
    guidesRoot: work,
    compileOrder: ['glossary', 'architecture-review', 'technical-guide'],
    docsRoot: work,
    config: {
      outputDir: '.',
      compileOrder: ['glossary', 'architecture-review', 'technical-guide'],
    },
    guides: [
      {
        name: 'glossary',
        path: 'glossary',
        compile: {
          scopeRoot: '.',
          outputFile: 'glossary.md',
          sectionsHeading: 'Sections',
          ...glossaryCompile,
        },
      },
      {
        name: 'architecture-review',
        path: 'review',
        compile: {
          scopeRoot: '.',
          manifest: 'shards.md',
          outputFile: 'architecture-review.md',
          sectionsHeading: 'Sections',
        },
      },
      {
        name: 'technical-guide',
        path: 'technical',
        compile: {
          scopeRoot: '.',
          outputFile: 'technical-guide.md',
          sectionsHeading: 'Sections',
        },
      },
    ],
  };
}

function writeConsumerFixture(work: string): CompileOptionsInput {
  mkdirSync(join(work, 'glossary'), { recursive: true });
  mkdirSync(join(work, 'review', 'outcomes'), { recursive: true });

  writeFileSync(
    join(work, 'glossary', 'index.md'),
    '# Glossary\n\n## Sections\n\n- [Terms](./terms.md)\n',
  );
  writeFileSync(
    join(work, 'glossary', 'terms.md'),
    '## Terms\n\nSee [FIND-004](../review/outcomes/FIND-004.md).\n',
  );

  writeFileSync(
    join(work, 'review', 'shards.md'),
    '# Architecture review\n\n## Sections\n\n- [Outcomes](./review-outcomes.md)\n',
  );
  writeFileSync(
    join(work, 'review', 'review-outcomes.md'),
    '## Review outcomes\n\nDetails in [FIND-004](./outcomes/FIND-004.md).\n',
  );
  writeFileSync(
    join(work, 'review', 'outcomes', 'FIND-004.md'),
    '# FIND-004 — Example finding\n\nFinding body.\n',
  );

  return {
    guidesRoot: work,
    compileOrder: ['glossary', 'architecture-review'],
    docsRoot: work,
    config: { outputDir: '.', compileOrder: ['glossary', 'architecture-review'] },
    guides: [
      {
        name: 'glossary',
        path: 'glossary',
        compile: {
          scopeRoot: '.',
          outputFile: 'glossary.md',
          sectionsHeading: 'Sections',
        },
      },
      {
        name: 'architecture-review',
        path: 'review',
        compile: {
          scopeRoot: '.',
          manifest: 'shards.md',
          outputFile: 'architecture-review.md',
          sectionsHeading: 'Sections',
        },
      },
    ],
  };
}

describe('cross-guide link rewriting', () => {
  it('buildGuideLinkIndex maps shard paths to output basenames and slugs', () => {
    withTmpDir('mdcp-link-index-', (work) => {
      const opts = writeConsumerFixture(work);
      const index = buildGuideLinkIndex(opts, work).index;

      const finding = join(work, 'review', 'outcomes', 'FIND-004.md');
      expect(index.get(finding)).toEqual({
        guideName: 'architecture-review',
        outputBasename: 'architecture-review.md',
        outputFile: join(work, 'architecture-review.md'),
        slug: 'find-004',
        canonical: true,
      });

      const terms = join(work, 'glossary', 'terms.md');
      expect(index.get(terms)).toEqual({
        guideName: 'glossary',
        outputBasename: 'glossary.md',
        outputFile: join(work, 'glossary.md'),
        slug: 'terms',
        canonical: true,
      });
    });
  });

  it('rewriteCrossGuideFileLinks targets another guide output with finding slug', () => {
    withTmpDir('mdcp-cross-rewrite-', (work) => {
      const opts = writeConsumerFixture(work);
      const index = buildGuideLinkIndex(opts, work).index;
      const sourceFile = join(work, 'glossary', 'terms.md');

      const out = rewriteCrossGuideFileLinks('See [FIND-004](../review/outcomes/FIND-004.md).', {
        sourceFile,
        guideDir: join(work, 'glossary'),
        scopeRoot: work,
        currentOutputBasename: 'glossary.md',
        linkIndex: index,
      });

      expect(out).toBe('See [FIND-004](architecture-review.md#find-004).');
    });
  });

  it('rewriteCrossGuideFileLinks uses in-document anchors within the same output', () => {
    withTmpDir('mdcp-same-output-', (work) => {
      const opts = writeConsumerFixture(work);
      const index = buildGuideLinkIndex(opts, work).index;
      const sourceFile = join(work, 'review', 'review-outcomes.md');

      const out = rewriteCrossGuideFileLinks('See [FIND-004](./outcomes/FIND-004.md).', {
        sourceFile,
        guideDir: join(work, 'review'),
        scopeRoot: work,
        currentOutputBasename: 'architecture-review.md',
        linkIndex: index,
      });

      expect(out).toBe('See [FIND-004](#find-004).');
    });
  });

  it('rewriteCrossGuideFileLinks preserves explicit fragments', () => {
    withTmpDir('mdcp-fragment-', (work) => {
      const opts = writeConsumerFixture(work);
      const index = buildGuideLinkIndex(opts, work).index;
      const sourceFile = join(work, 'glossary', 'terms.md');

      const out = rewriteCrossGuideFileLinks(
        '[FIND-004](../review/outcomes/FIND-004.md#custom-anchor).',
        {
          sourceFile,
          guideDir: join(work, 'glossary'),
          scopeRoot: work,
          currentOutputBasename: 'glossary.md',
          linkIndex: index,
        },
      );

      expect(out).toBe('[FIND-004](architecture-review.md#custom-anchor).');
    });
  });

  it('compileGuideResults rewrites cross-guide links between compiled guides in consumer layout', () => {
    withTmpDir('mdcp-consumer-compile-', (work) => {
      const opts = writeConsumerFixture(work);
      writeCompiledGuides(opts, join(work, 'guides.md'));

      const glossary = readFileSync(join(work, 'glossary.md'), 'utf-8');
      expect(glossary).toContain('[FIND-004](architecture-review.md#find-004)');
      expect(glossary).not.toMatch(/\]\(\.\.\/review\/outcomes\/FIND-004\.md\)/);

      const review = readFileSync(join(work, 'architecture-review.md'), 'utf-8');
      expect(review).toContain('[FIND-004](#find-004)');
      expect(review).not.toMatch(/\]\(\.\/outcomes\/FIND-004\.md\)/);
    });
  });

  describe('three guides — hub links to two outputs', () => {
    it('buildGuideLinkIndex maps each shard to its guide output', () => {
      withTmpDir('mdcp-three-index-', (work) => {
        const opts = writeThreeGuideFixture(work);
        const index = buildGuideLinkIndex(opts, work).index;

        expect(index.get(join(work, 'review', 'outcomes', 'FIND-004.md'))).toEqual({
          guideName: 'architecture-review',
          outputBasename: 'architecture-review.md',
          outputFile: join(work, 'architecture-review.md'),
          slug: 'find-004',
          canonical: true,
        });
        expect(index.get(join(work, 'technical', 'deployment.md'))).toEqual({
          guideName: 'technical-guide',
          outputBasename: 'technical-guide.md',
          outputFile: join(work, 'technical-guide.md'),
          slug: 'deployment',
          canonical: true,
        });
      });
    });

    it('rewriteCrossGuideFileLinks routes each link to the correct output file', () => {
      withTmpDir('mdcp-three-rewrite-', (work) => {
        const opts = writeThreeGuideFixture(work);
        const index = buildGuideLinkIndex(opts, work).index;
        const sourceFile = join(work, 'glossary', 'terms.md');
        const input =
          'See [FIND-004](../review/outcomes/FIND-004.md) and [Deployment](../technical/deployment.md).';

        const out = rewriteCrossGuideFileLinks(input, {
          sourceFile,
          guideDir: join(work, 'glossary'),
          scopeRoot: work,
          currentOutputBasename: 'glossary.md',
          linkIndex: index,
        });

        expect(out).toBe(
          'See [FIND-004](architecture-review.md#find-004) and [Deployment](technical-guide.md#deployment).',
        );
      });
    });

    it('compileGuideResults rewrites each cross-guide link to its native output', () => {
      withTmpDir('mdcp-three-compile-', (work) => {
        const opts = writeThreeGuideFixture(work);
        writeCompiledGuides(opts, join(work, 'guides.md'));

        const glossary = readFileSync(join(work, 'glossary.md'), 'utf-8');
        expect(glossary).toContain('[FIND-004](architecture-review.md#find-004)');
        expect(glossary).toContain('[Deployment](technical-guide.md#deployment)');
        expect(glossary).not.toMatch(/\]\(\.\.\/review\/outcomes\/FIND-004\.md\)/);
        expect(glossary).not.toMatch(/\]\(\.\.\/technical\/deployment\.md\)/);
      });
    });

    it('ignoreGuides keeps shard paths for listed guides only', () => {
      withTmpDir('mdcp-ignore-guides-', (work) => {
        const opts = writeThreeGuideFixture(work, {
          crossGuideLinks: { ignoreGuides: ['technical-guide'] },
        });
        writeCompiledGuides(opts, join(work, 'guides.md'));

        const glossary = readFileSync(join(work, 'glossary.md'), 'utf-8');
        expect(glossary).toContain('[FIND-004](architecture-review.md#find-004)');
        expect(glossary).toContain('[Deployment](technical/deployment.md)');
        expect(glossary).not.toContain('[Deployment](technical-guide.md#deployment)');
      });
    });

    it('rewriteCrossGuideFileLinks honors ignoreGuides per target guide', () => {
      withTmpDir('mdcp-ignore-rewrite-', (work) => {
        const opts = writeThreeGuideFixture(work);
        const index = buildGuideLinkIndex(opts, work).index;
        const sourceFile = join(work, 'glossary', 'terms.md');
        const input =
          'See [FIND-004](../review/outcomes/FIND-004.md) and [Deployment](../technical/deployment.md).';

        const out = rewriteCrossGuideFileLinks(input, {
          sourceFile,
          guideDir: join(work, 'glossary'),
          scopeRoot: work,
          currentOutputBasename: 'glossary.md',
          linkIndex: index,
          ignoreGuides: ['technical-guide'],
        });

        expect(out).toBe(
          'See [FIND-004](architecture-review.md#find-004) and [Deployment](../technical/deployment.md).',
        );
      });
    });
  });

  it('compileGuideResults leaves unresolved markdown links unchanged', () => {
    withTmpDir('mdcp-unresolved-', (work) => {
      mkdirSync(join(work, 'glossary'), { recursive: true });
      writeFileSync(
        join(work, 'glossary', 'index.md'),
        '# Glossary\n\n## Sections\n\n- [Terms](./terms.md)\n',
      );
      writeFileSync(
        join(work, 'glossary', 'terms.md'),
        '## Terms\n\nSee [Missing](../missing/shard.md).\n',
      );

      const results = compileGuideResults({
        guidesRoot: work,
        compileOrder: ['glossary'],
        docsRoot: work,
        guides: [
          {
            name: 'glossary',
            path: 'glossary',
            compile: {
              scopeRoot: '.',
              outputFile: 'glossary.md',
              sectionsHeading: 'Sections',
              links: { markBroken: false },
            },
          },
        ],
      });

      expect(results[0].text).toContain('[Missing](../missing/shard.md)');
    });
  });

  it('buildGuideLinkIndex does not let transitive guide overwrite manifest owner', () => {
    withTmpDir('mdcp-index-owner-', (work) => {
      mkdirSync(join(work, 'features'), { recursive: true });
      mkdirSync(join(work, 'client-cli'), { recursive: true });

      writeFileSync(
        join(work, 'features', 'index.md'),
        '# Features\n\n## Sections\n\n- [Catalog](./feature-catalog.md)\n',
      );
      writeFileSync(join(work, 'features', 'feature-catalog.md'), '# Feature catalog\n');

      writeFileSync(
        join(work, 'client-cli', 'index.md'),
        '# CLI\n\n## Sections\n\n- [Consumer](./consumer.md)\n',
      );
      writeFileSync(
        join(work, 'client-cli', 'consumer.md'),
        '## Consumer\n\n[Catalog](../features/feature-catalog.md)\n',
      );

      const opts = {
        guidesRoot: work,
        compileOrder: ['features', 'client-cli'],
        docsRoot: work,
        config: {
          outputDir: '.',
          outputFile: 'guides.md',
          compileOrder: ['features', 'client-cli'],
        },
        guides: [
          { name: 'features' },
          { name: 'client-cli', compile: { outputFile: 'README.md' } },
        ],
      };
      const index = buildGuideLinkIndex(opts, work).index;
      const entry = index.get(join(work, 'features', 'feature-catalog.md'));
      expect(entry?.guideName).toBe('features');
      expect(entry?.outputBasename).toBe('guides.md');
    });
  });

  it('compileGuideResults rewrites features link to guides.md#slug not #slug', () => {
    withTmpDir('mdcp-publish-regression-', (work) => {
      mkdirSync(join(work, 'features'), { recursive: true });
      mkdirSync(join(work, 'client-cli'), { recursive: true });

      writeFileSync(
        join(work, 'features', 'index.md'),
        '# Features\n\n## Sections\n\n- [Catalog](./feature-catalog.md)\n',
      );
      writeFileSync(join(work, 'features', 'feature-catalog.md'), '# Feature catalog\n');

      writeFileSync(
        join(work, 'client-cli', 'index.md'),
        '# CLI\n\n## Sections\n\n- [Consumer](./consumer.md)\n',
      );
      writeFileSync(
        join(work, 'client-cli', 'consumer.md'),
        '## Consumer\n\n[Catalog](../features/feature-catalog.md)\n',
      );

      const results = compileGuideResults({
        guidesRoot: work,
        compileOrder: ['features', 'client-cli'],
        docsRoot: work,
        config: {
          outputDir: '.',
          outputFile: 'guides.md',
          compileOrder: ['features', 'client-cli'],
        },
        guides: [
          { name: 'features' },
          { name: 'client-cli', compile: { outputFile: 'README.md', links: { markBroken: true } } },
        ],
      });

      const readme = results.find((r) => r.name === 'client-cli')!.text;
      expect(readme).toContain('[Catalog](guides.md#feature-catalog)');
      expect(readme).not.toMatch(/\[Catalog\]\(#feature-catalog\)/);
    });
  });

  it('rewriteCrossGuideFileLinks uses relative output paths when guides share output basename', () => {
    withTmpDir('mdcp-same-basename-', (work) => {
      mkdirSync(join(work, 'pkg-a'), { recursive: true });
      mkdirSync(join(work, 'pkg-b'), { recursive: true });

      writeFileSync(
        join(work, 'pkg-a', 'index.md'),
        '# A\n\n## Sections\n\n- [Section](./section.md)\n',
      );
      writeFileSync(join(work, 'pkg-a', 'section.md'), '## Section A\n\nBody.\n');

      writeFileSync(
        join(work, 'pkg-b', 'index.md'),
        '# B\n\n## Sections\n\n- [Consumer](./consumer.md)\n',
      );
      writeFileSync(
        join(work, 'pkg-b', 'consumer.md'),
        '## Consumer\n\nSee [Section A](../pkg-a/section.md#section-a).\n',
      );

      const opts = {
        guidesRoot: work,
        compileOrder: ['pkg-a', 'pkg-b'],
        docsRoot: work,
        config: { outputDir: '.', compileOrder: ['pkg-a', 'pkg-b'] },
        guides: [
          { name: 'pkg-a', path: 'pkg-a', compile: { outputFile: 'out-a/README.md' } },
          { name: 'pkg-b', path: 'pkg-b', compile: { outputFile: 'out-b/README.md' } },
        ],
      };
      const index = buildGuideLinkIndex(opts, work).index;
      const sourceFile = join(work, 'pkg-b', 'consumer.md');
      const currentOutput = join(work, 'out-b', 'README.md');

      const out = rewriteCrossGuideFileLinks('See [Section A](../pkg-a/section.md#section-a).', {
        sourceFile,
        guideDir: join(work, 'pkg-b'),
        scopeRoot: work,
        currentGuideName: 'pkg-b',
        currentOutputBasename: 'README.md',
        currentOutputFile: currentOutput,
        linkIndex: index,
      });

      expect(out).toBe('See [Section A](../out-a/README.md#section-a).');
    });
  });

  it('buildGuideLinkIndex excludes repo files outside guide directories', () => {
    withTmpDir('mdcp-index-external-', (work) => {
      mkdirSync(join(work, 'features'), { recursive: true });
      mkdirSync(join(work, 'examples', 'other'), { recursive: true });

      writeFileSync(
        join(work, 'features', 'index.md'),
        '# Features\n\n## Sections\n\n- [Overview](./overview.md)\n',
      );
      writeFileSync(
        join(work, 'features', 'overview.md'),
        '# Overview\n\nPrompts: [README](../../examples/other/README.md)\n',
      );
      writeFileSync(join(work, 'examples', 'other', 'README.md'), '# Prompt templates\n');

      const index = buildGuideLinkIndex({
        guidesRoot: work,
        compileOrder: ['features'],
        docsRoot: work,
        config: { outputDir: '.', outputFile: 'guides.md', compileOrder: ['features'] },
        guides: [{ name: 'features' }],
      }).index;

      expect(index.has(join(work, 'features', 'overview.md'))).toBe(true);
      expect(index.has(join(work, 'examples', 'other', 'README.md'))).toBe(false);
    });
  });

  it('buildGuideLinkIndex includes transitive scopeRoot files outside guideDir', () => {
    withTmpDir('mdcp-index-transitive-scope-', (work) => {
      mkdirSync(join(work, 'guide', 'compiled'), { recursive: true });
      mkdirSync(join(work, 'topics', 'security'), { recursive: true });

      writeFileSync(join(work, 'guide', 'compiled', 'shards.md'), '- [Shard A](../shard-a.md)\n');
      writeFileSync(
        join(work, 'guide', 'shard-a.md'),
        '# Shard A\n\n- [Onboarding](../onboarding.md#setup-prerequisites)\n',
      );
      writeFileSync(
        join(work, 'onboarding.md'),
        '# Onboarding\n\n## Setup prerequisites\n\n- [Security overview](./topics/security/index.md).\n',
      );
      writeFileSync(join(work, 'topics', 'security', 'index.md'), '# Security overview\n');

      const opts: CompileOptionsInput = {
        guidesRoot: work,
        compileOrder: ['example-guide'],
        docsRoot: work,
        config: { outputDir: '_build', compileOrder: ['example-guide'] },
        guides: [
          {
            name: 'example-guide',
            path: 'guide/compiled',
            compile: {
              manifest: 'shards.md',
              scopeRoot: '.',
              outputFile: 'example-guide.md',
            },
          },
        ],
      };
      const index = buildGuideLinkIndex(opts, work).index;

      const onboarding = join(work, 'onboarding.md');
      const security = join(work, 'topics', 'security', 'index.md');
      expect(index.get(onboarding)).toEqual({
        guideName: 'example-guide',
        outputBasename: 'example-guide.md',
        outputFile: join(work, '_build', 'example-guide.md'),
        slug: 'onboarding',
        canonical: false,
      });
      expect(index.get(security)).toEqual({
        guideName: 'example-guide',
        outputBasename: 'example-guide.md',
        outputFile: join(work, '_build', 'example-guide.md'),
        slug: 'security-overview',
        canonical: false,
      });
    });
  });

  it('co-included shared shards rewrite to same-output anchors in each guide', () => {
    withTmpDir('mdcp-co-include-shared-', (work) => {
      for (const name of ['guide-a', 'guide-b'] as const) {
        mkdirSync(join(work, name), { recursive: true });
        writeFileSync(
          join(work, name, 'index.md'),
          `# ${name}\n\n## Sections\n\n- [Body](./body.md)\n`,
        );
        writeFileSync(join(work, name, 'body.md'), '## Body\n\nSee [Shared](../shared/note.md).\n');
      }
      mkdirSync(join(work, 'shared'), { recursive: true });
      writeFileSync(join(work, 'shared', 'note.md'), '# Shared note\n\nBody.\n');

      const opts: CompileOptionsInput = {
        guidesRoot: work,
        compileOrder: ['guide-a', 'guide-b'],
        docsRoot: work,
        config: { outputDir: '_build', compileOrder: ['guide-a', 'guide-b'] },
        guides: [
          {
            name: 'guide-a',
            path: 'guide-a',
            compile: {
              scopeRoot: '.',
              outputFile: 'guide-a.md',
              sectionsHeading: 'Sections',
            },
          },
          {
            name: 'guide-b',
            path: 'guide-b',
            compile: {
              scopeRoot: '.',
              outputFile: 'guide-b.md',
              sectionsHeading: 'Sections',
            },
          },
        ],
      };

      const shared = join(work, 'shared', 'note.md');
      const index = buildGuideLinkIndex(opts, work).index;
      expect(index.has(shared)).toBe(true);
      expect(index.get(shared)?.slug).toBe('shared-note');
      expect(['guide-a', 'guide-b']).toContain(index.get(shared)?.guideName);

      const results = compileGuideResults(opts);
      for (const result of results) {
        expect(result.text).toContain('[Shared](#shared-note)');
        expect(result.text).not.toMatch(/guide-[ab]\.md#shared-note/);
        expect(result.text).not.toMatch(/\]\(\.\.\/shared\/note\.md\)/);
      }
    });
  });
});
