/**
 * Cross-guide link rewriting — tests driven by the spec in
 * docs/client-core/compile-hooks/cross-guide-links.md.
 */
import { describe, it, expect } from 'vitest';
import { mkdirSync, writeFileSync, readFileSync } from 'node:fs';
import { dirname, join } from 'node:path';
import {
  buildGuideLinkIndex,
  buildGuideLinkIndexWithSlugs,
} from '../src/compile/guide-link-index.js';
import { rewriteCrossGuideFileLinks } from '../src/compile/publish-links.js';
import {
  assembleGuide,
  compileGuideResults,
  writeCompiledGuides,
} from '../src/compile/assemble.js';
import type { CompileOptionsInput } from '../src/compile/assemble.js';
import { buildSlugRegistry } from '../src/refs/slugs.js';
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

function writeTree(root: string, files: Record<string, string>): void {
  for (const [rel, text] of Object.entries(files)) {
    mkdirSync(dirname(join(root, rel)), { recursive: true });
    writeFileSync(join(root, rel), text);
  }
}

type GuideCompile = NonNullable<NonNullable<CompileOptionsInput['guides']>[number]['compile']>;

function headingSlugAt(text: string, heading: string): string | undefined {
  const line = text.split('\n').indexOf(heading) + 1;
  return buildSlugRegistry(text).headings.find((h) => h.line === line)?.slug;
}

describe('section slugs count every earlier heading', () => {
  it('numbers a section after an earlier sub-heading with the same title', () => {
    withTmpDir('mdcp-section-slug-sub-', (work) => {
      writeTree(work, {
        'a/index.md': '# Guide A\n\n- [One](./one.md)\n- [Two](./two.md)\n',
        'a/one.md': '# One\n\nSee [two](./two.md).\n\n## Two\n\nSub.\n',
        'a/two.md': '# Two\n\nSection two.\n',
      });
      const [r] = compileGuideResults({
        guidesRoot: work,
        compileOrder: ['a'],
        docsRoot: work,
        config: { compileOrder: ['a'] },
      });
      expect(r.text).toContain('[two](#two-1)');
    });
  });

  it('counts the guide H1 that assembly writes first', () => {
    withTmpDir('mdcp-section-slug-h1-', (work) => {
      writeTree(work, {
        'a/index.md': '# Two\n\n- [One](./one.md)\n- [Two](./two.md)\n',
        'a/one.md': '# One\n\nSee [two](./two.md).\n',
        'a/two.md': '# Two\n\nSection two.\n',
      });
      const [r] = compileGuideResults({
        guidesRoot: work,
        compileOrder: ['a'],
        docsRoot: work,
        config: { compileOrder: ['a'] },
      });
      expect(r.text).toContain('[two](#two-1)');
    });
  });

  it('counts compile.title once when the first section repeats it', () => {
    withTmpDir('mdcp-section-slug-title-', (work) => {
      writeTree(work, {
        'a/index.md': '# Guide\n\n- [One](./one.md)\n- [Two](./two.md)\n- [Three](./three.md)\n',
        'a/one.md': '# Overview\n\nBody.\n',
        'a/two.md': '# Two\n\nSee [one](./one.md).\n\n## Overview\n\nAgain.\n',
        'a/three.md': '# Overview\n\nSee [three](./three.md).\n',
      });
      const [r] = compileGuideResults({
        guidesRoot: work,
        compileOrder: ['a'],
        docsRoot: work,
        config: { compileOrder: ['a'] },
        guides: [{ name: 'a', compile: { title: 'Overview' } }],
      });
      expect(r.text).toContain('[one](#overview)');
      expect(r.text).toContain('[three](#overview-2)');
      expect(headingSlugAt(r.text, '### Overview')).toBe('overview-1');
    });
  });

  it('skips a fenced comment that repeats a later section title', () => {
    withTmpDir('mdcp-section-slug-fence-', (work) => {
      writeTree(work, {
        'a/index.md': '# Guide\n\n- [One](./one.md)\n- [Install](./install.md)\n',
        'a/one.md': '# One\n\n```bash\n# install\n```\n\nSee [install](./install.md).\n',
        'a/install.md': '# Install\n\nSteps.\n',
      });
      const [r] = compileGuideResults({
        guidesRoot: work,
        compileOrder: ['a'],
        docsRoot: work,
        config: { compileOrder: ['a'] },
      });
      expect(r.text).toContain('[install](#install)');
      expect(headingSlugAt(r.text, '## Install')).toBe('install');
    });
  });

  it('keeps declared ids and counts their headings for later sections', () => {
    withTmpDir('mdcp-section-slug-declared-', (work) => {
      writeTree(work, {
        'g/index.md':
          '# Guide\n\n- [Find](./FIND-001.md)\n- [Anchored](./anchored.md)\n- [Install](./install.md)\n- [Setup](./setup.md)\n- [Links](./links.md)\n',
        'g/FIND-001.md': '# Install\n\nFinding body.\n',
        'g/anchored.md': '# Setup {#custom}\n\nAnchored body.\n',
        'g/install.md': '# Install\n\nSteps.\n',
        'g/setup.md': '# Setup\n\nSetup body.\n',
        'g/links.md':
          '# Links\n\n[f](./FIND-001.md) [a](./anchored.md) [i](./install.md) [s](./setup.md)\n',
      });
      const [r] = compileGuideResults({
        guidesRoot: work,
        compileOrder: ['g'],
        docsRoot: work,
        config: { compileOrder: ['g'] },
      });
      // The FIND-* and {#id} sections keep their ids, and their headings still take
      // `install` and `setup`, so the later sections with the same titles take `-1`.
      expect(r.text).toContain('[f](#find-001) [a](#custom) [i](#install-1) [s](#setup-1)');
      const slugs = buildSlugRegistry(r.text).headings.map((h) => `${h.title}:${h.slug}`);
      expect(slugs).toEqual([
        'Guide:guide',
        'Install:install',
        'Setup:setup',
        'Install:install-1',
        'Setup:setup-1',
        'Links:links',
      ]);
    });
  });

  it('numbers a heading by the title it renders when compile keeps the markers', () => {
    withTmpDir('mdcp-section-slug-kept-markers-', (work) => {
      writeTree(work, {
        'g/index.md':
          '# Guide\n\n- [Anchored](./anchored.md)\n- [One](./one.md)\n- [Setup](./setup.md)\n- [Install](./install.md)\n- [Links](./links.md)\n',
        'g/anchored.md': '# Setup {#custom}\n\nAnchored body.\n',
        'g/one.md': '# One\n\n## Install {#inst}\n\nText.\n',
        'g/setup.md': '# Setup\n\nSetup body.\n',
        'g/install.md': '# Install\n\nSteps.\n',
        'g/links.md': '# Links\n\n[a](./anchored.md) [s](./setup.md) [i](./install.md)\n',
      });
      const compileWith = (compile: GuideCompile): string =>
        compileGuideResults({
          guidesRoot: work,
          compileOrder: ['g'],
          docsRoot: work,
          config: { compileOrder: ['g'] },
          guides: [{ name: 'g', compile }],
        })[0].text;

      // Neither strip runs, so the headings render as "Setup {#custom}" and "Install {#inst}".
      // A renderer slugs them setup-custom and install-inst, and the later sections keep
      // #setup and #install.
      const kept = compileWith({ stripAnchors: false, hooks: { stripAnchors: false } });
      expect(kept).toContain('## Setup {#custom}');
      expect(kept).toContain('### Install {#inst}');
      expect(kept).toContain('[a](#custom) [s](#setup) [i](#install)');
      // assembleGuide runs no hooks unless asked, so stripAnchors: false keeps the markers too.
      expect(assembleGuide(join(work, 'g'), { stripAnchors: false })).toContain(
        '[a](#custom) [s](#setup) [i](#install)',
      );

      // Either strip removes the heading markers, so the later sections take -1.
      for (const compile of [
        { stripAnchors: false },
        { hooks: { stripAnchors: false } },
      ] as GuideCompile[]) {
        const stripped = compileWith(compile);
        expect(stripped).toContain('## Setup\n');
        expect(stripped).toContain('[a](#custom) [s](#setup-1) [i](#install-1)');
      }
    });
  });

  it('gives a cross-guide link the slug the target guide assembles', () => {
    withTmpDir('mdcp-section-slug-index-', (work) => {
      writeTree(work, {
        'a/index.md': '# Two\n\n- [One](./one.md)\n- [Two](./two.md)\n',
        'a/one.md': '# One\n\nBody.\n',
        'a/two.md': '# Two\n\nSection two.\n',
        'b/index.md': '# Guide B\n\n- [Links](./links.md)\n',
        'b/links.md': '# Links\n\nSee [two](../a/two.md).\n',
      });
      const opts: CompileOptionsInput = {
        guidesRoot: work,
        compileOrder: ['a', 'b'],
        docsRoot: work,
        config: { outputDir: '.', compileOrder: ['a', 'b'] },
        guides: [
          { name: 'a', path: 'a', compile: { outputFile: 'a.md' } },
          { name: 'b', path: 'b', compile: { outputFile: 'b.md' } },
        ],
      };
      const built = buildGuideLinkIndex(opts, work);
      // The per-guide numbering stays internal, off the exported result type.
      expect(built).not.toHaveProperty('slugsByGuide');
      const { index } = built;
      const { slugsByGuide } = buildGuideLinkIndexWithSlugs(opts, work);
      const results = compileGuideResults(opts);
      const a = results.find((r) => r.name === 'a')!.text;
      const b = results.find((r) => r.name === 'b')!.text;

      const assembled = headingSlugAt(a, '## Two');
      expect(assembled).toBe('two-1');
      expect(index.get(join(work, 'a', 'two.md'))?.slug).toBe(assembled);
      // Compile reuses the index's per-guide numbering rather than slugging every guide again.
      expect(slugsByGuide.get('a')?.get(join(work, 'a', 'two.md'))).toBe(assembled);
      expect(b).toContain('[two](a.md#two-1)');
    });
  });

  it('reads each section after the blank line that assembly writes before it', () => {
    // one.md ends inside a list item's paragraph. Assembly puts a blank line between the
    // sections, so two.md's indented fence is top-level code and its `# install` isn't a heading.
    for (const sourceTags of [true, false]) {
      withTmpDir('mdcp-section-slug-separator-', (work) => {
        writeTree(work, {
          'a/index.md':
            '# Guide A\n\n- [One](./one.md)\n- [Two](./two.md)\n- [Three](./three.md)\n- [Install](./install.md)\n',
          'a/one.md': '# One\n\nSee [install](./install.md).\n\n- item\n  para\n',
          'a/two.md': 'Intro text without a heading.\n\n  ```\n# install\n  ```\n',
          'a/three.md': '# Three\n\n```bash\nnpm i\n```\n',
          'a/install.md': '# Install\n\nSteps.\n',
        });
        const [r] = compileGuideResults({
          guidesRoot: work,
          compileOrder: ['a'],
          docsRoot: work,
          config: { compileOrder: ['a'], sourceTags },
        });
        expect(headingSlugAt(r.text, '## Install')).toBe('install');
        expect(r.text).toContain('See [install](#install).');
      });
    }
  });

  it('keeps an in-document anchor for a shard owned only through the transitive walk', () => {
    withTmpDir('mdcp-section-slug-transitive-', (work) => {
      writeTree(work, {
        'shared/setup.md': '# Setup\n\nShared setup.\n',
        'x/index.md': '# Guide X\n\n- [Intro](./intro.md)\n',
        'x/intro.md': '# Intro\n\nSee [shared](../shared/setup.md).\n',
        'y/index.md': '# Guide Y\n\n- [Setup](./setup.md)\n- [Links](./links.md)\n',
        'y/links.md': '# Links\n\nSee [shared](../shared/setup.md).\n',
        'y/setup.md': '# Setup\n\nY setup.\n',
      });
      const opts: CompileOptionsInput = {
        guidesRoot: work,
        compileOrder: ['x', 'y'],
        docsRoot: work,
        config: { outputDir: '_build', compileOrder: ['x', 'y'] },
        guides: [
          { name: 'x', path: 'x', compile: { scopeRoot: '.', outputFile: 'x.md' } },
          { name: 'y', path: 'y', compile: { scopeRoot: '.', outputFile: 'y.md' } },
        ],
      };
      const index = buildGuideLinkIndex(opts, work).index;
      const results = compileGuideResults(opts);
      const x = results.find((r) => r.name === 'x')!.text;
      const y = results.find((r) => r.name === 'y')!.text;

      expect(index.get(join(work, 'shared', 'setup.md'))).toMatchObject({
        guideName: 'x',
        slug: 'setup',
        canonical: false,
      });
      expect(x).toContain('See [shared](#setup).');
      // y stitches the shard after its own Setup section and numbers it there.
      const ySetups = buildSlugRegistry(y).headings.filter((h) => h.title === 'Setup');
      expect(ySetups.map((h) => h.slug)).toEqual(['setup', 'setup-1']);
      expect(y).toContain('See [shared](#setup-1).');
    });
  });

  it("takes a cross-guide slug from the owning guide's numbering", () => {
    withTmpDir('mdcp-section-slug-owner-', (work) => {
      writeTree(work, {
        'x/index.md': '# Guide X\n\n- [Setup](./setup.md)\n',
        'x/setup.md': '# Setup\n\nThen see [the other setup](../y/setup.md).\n',
        'y/index.md': '# Guide Y\n\n- [Setup](./setup.md)\n',
        'y/setup.md': '# Setup\n\nY setup.\n',
      });
      const opts: CompileOptionsInput = {
        guidesRoot: work,
        compileOrder: ['x', 'y'],
        docsRoot: work,
        config: { outputDir: '.', compileOrder: ['x', 'y'] },
        guides: [
          { name: 'x', path: 'x', compile: { scopeRoot: '.', outputFile: 'x.md' } },
          { name: 'y', path: 'y', compile: { outputFile: 'y.md' } },
        ],
      };
      const index = buildGuideLinkIndex(opts, work).index;
      const results = compileGuideResults(opts);
      const x = results.find((r) => r.name === 'x')!.text;
      const y = results.find((r) => r.name === 'y')!.text;

      expect(headingSlugAt(y, '## Setup')).toBe('setup');
      expect(index.get(join(work, 'y', 'setup.md'))).toMatchObject({
        guideName: 'y',
        slug: 'setup',
      });
      expect(x).toContain('[the other setup](y.md#setup)');
    });
  });
});
