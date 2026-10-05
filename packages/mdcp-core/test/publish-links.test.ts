import { describe, it, expect } from 'vitest';
import { mkdirSync, writeFileSync } from 'node:fs';
import { dirname, join, resolve } from 'node:path';
import {
  buildSectionSlugMap,
  rewriteIntraGuideFileLinks,
  rewritePublishRelativeLinks,
} from '../src/compile/publish-links.js';
import { compileGuideResults, type CompileOptionsInput } from '../src/compile/assemble.js';
import { withTmpDir } from './helpers/tmp-dir.js';

describe('publish link rewriting', () => {
  it('rewrites intra-guide .md links to in-document anchors', () => {
    const guideDir = '/fake/guide';
    const slugByPath = new Map([
      [resolve(guideDir, 'install-and-quick-start.md'), 'install-and-quick-start'],
      [resolve(guideDir, 'llm-collaboration.md'), 'llm-collaboration'],
      [resolve(guideDir, 'agent-integration.md'), 'agent-integration'],
    ]);

    const input =
      'Collaborating with an LLM? See [LLM collaboration](./llm-collaboration.md) for details.\n' +
      'Also see [Agent integration](./agent-integration.md#scripts).\n' +
      'External [Feature catalog](https://github.com/betsalel-williamson/mdcp/blob/main/docs/features/feature-catalog.md).\n';

    const out = rewriteIntraGuideFileLinks(input, slugByPath, guideDir);
    expect(out).toContain('[LLM collaboration](#llm-collaboration)');
    expect(out).toContain('[Agent integration](#scripts)');
    expect(out).toContain(
      '[Feature catalog](https://github.com/betsalel-williamson/mdcp/blob/main/docs/features/feature-catalog.md)',
    );
    expect(out).not.toMatch(/\]\(\.\/llm-collaboration\.md\)/);
  });

  it('rewrites co-compiled glossary shard links by basename', () => {
    const guideDir = '/fake/developer';
    const glossaryDir = '/fake/glossary';
    const slugByPath = new Map([
      [resolve(glossaryDir, 'mdcp.md'), 'mdcp'],
      [resolve(glossaryDir, 'gfm.md'), 'gfm'],
    ]);

    const out = rewriteIntraGuideFileLinks(
      '- [MDCP](./mdcp.md)\n- [GFM](./gfm.md)\n',
      slugByPath,
      guideDir,
    );
    expect(out).toBe('- [MDCP](#mdcp)\n- [GFM](#gfm)\n');
  });

  it('rewrites shard-relative repo paths for publish outputs', () => {
    withTmpDir('mdcp-publish-rel-root-', (work) => {
      const docsDeveloper = join(work, 'docs', 'developer');
      mkdirSync(docsDeveloper, { recursive: true });
      mkdirSync(join(work, 'docs', 'features'), { recursive: true });
      writeFileSync(join(work, 'package.json'), '{}');
      writeFileSync(join(work, 'docs', 'mdcp.config.json'), '{}');
      writeFileSync(join(work, 'docs', 'features', 'feature-catalog.md'), '# Catalog\n');
      const shard = join(docsDeveloper, 'guide.md');
      writeFileSync(shard, '# Guide\n');

      const input =
        'See [`package.json`](../../package.json) and [Feature Catalog](../features/feature-catalog.md).\n' +
        'Config: [`docs/mdcp.config.json`](../mdcp.config.json).\n';

      const out = rewritePublishRelativeLinks(input, {
        sourceFile: shard,
        guideDir: docsDeveloper,
        currentOutputFile: join(work, 'DEVELOPERS.md'),
      });

      expect(out).toContain('[`package.json`](package.json)');
      expect(out).toContain('[Feature Catalog](docs/features/feature-catalog.md)');
      expect(out).toContain('[`docs/mdcp.config.json`](docs/mdcp.config.json)');
    });
  });

  it('rewrites nested shard paths for package publish outputs', () => {
    withTmpDir('mdcp-publish-rel-nested-', (work) => {
      const hooksDir = join(work, 'docs', 'client-core', 'compile-hooks');
      mkdirSync(hooksDir, { recursive: true });
      mkdirSync(join(work, 'docs', 'features', 'design-constraints'), { recursive: true });
      writeFileSync(
        join(work, 'docs', 'features', 'design-constraints', 'preprocessor-templating.md'),
        '# Preprocessor\n',
      );
      const shard = join(hooksDir, 'index.md');
      writeFileSync(shard, '# Hooks\n');

      const input =
        '[Preprocessor](../../features/design-constraints/preprocessor-templating.md#preprocessor--templating-out-of-scope).';
      const out = rewritePublishRelativeLinks(input, {
        sourceFile: shard,
        guideDir: join(work, 'docs', 'client-core'),
        currentOutputFile: join(work, 'packages', 'mdcp-core', 'README.md'),
      });

      expect(out).toBe(
        '[Preprocessor](../../docs/features/design-constraints/preprocessor-templating.md#preprocessor--templating-out-of-scope).',
      );
    });
  });

  it('leaves unresolvable cross-publish paths unchanged', () => {
    withTmpDir('mdcp-publish-rel-skip-', (work) => {
      const guideDir = join(work, 'docs', 'client-cli');
      mkdirSync(guideDir, { recursive: true });
      mkdirSync(join(work, 'docs', 'features'), { recursive: true });
      writeFileSync(join(work, 'docs', 'features', 'feature-catalog.md'), '# Catalog\n');
      const shard = join(guideDir, 'section.md');
      writeFileSync(shard, '# Section\n');

      const input =
        '[Cross-guide](../mdcp-core/README.md#cross-guide-link-rewriting) and [Features](../features/feature-catalog.md).';
      const out = rewritePublishRelativeLinks(input, {
        sourceFile: shard,
        guideDir,
        currentOutputFile: join(work, 'packages', 'mdcp-cli', 'README.md'),
      });

      expect(out).toContain('[Cross-guide](../mdcp-core/README.md#cross-guide-link-rewriting)');
      expect(out).toContain('[Features](../../docs/features/feature-catalog.md)');
    });
  });

  describe('targets made only of ../ segments', () => {
    function devShard(work: string): string {
      mkdirSync(join(work, 'docs', 'dev'), { recursive: true });
      mkdirSync(join(work, 'skills'), { recursive: true });
      const shard = join(work, 'docs', 'dev', 'dogfood.md');
      writeFileSync(shard, '# Dogfood\n');
      return shard;
    }

    it('rebases a bare ../ to the directory it names', () => {
      withTmpDir('mdcp-publish-rel-dotdot-', (work) => {
        const shard = devShard(work);
        const options = { sourceFile: shard, guideDir: join(work, 'docs', 'dev') };

        expect(
          rewritePublishRelativeLinks('See [docs/](../).', {
            ...options,
            currentOutputFile: join(work, 'DEVELOPERS.md'),
          }),
        ).toBe('See [docs/](docs).');
        expect(
          rewritePublishRelativeLinks('See [docs/](../).', {
            ...options,
            currentOutputFile: join(work, 'docs', '_build', 'dev.md'),
          }),
        ).toBe('See [docs/](..).');
      });
    });

    it('writes ./ when the target is the link base directory', () => {
      withTmpDir('mdcp-publish-rel-dotdot-root-', (work) => {
        const shard = devShard(work);
        const out = rewritePublishRelativeLinks(
          'See [root](../../) and [top](../../#top) and [skills](../../skills/).',
          {
            sourceFile: shard,
            guideDir: join(work, 'docs', 'dev'),
            currentOutputFile: join(work, 'DEVELOPERS.md'),
          },
        );

        expect(out).toBe('See [root](./) and [top](./#top) and [skills](skills).');
      });
    });

    it('leaves an unresolvable directory target unchanged', () => {
      withTmpDir('mdcp-publish-rel-dotdot-missing-', (work) => {
        const shard = devShard(work);
        const out = rewritePublishRelativeLinks('See [missing](../../missing/).', {
          sourceFile: shard,
          guideDir: join(work, 'docs', 'dev'),
          currentOutputFile: join(work, 'DEVELOPERS.md'),
        });

        expect(out).toBe('See [missing](../../missing/).');
      });
    });
  });

  it('writes ./ when a named directory target is the link base directory', () => {
    withTmpDir('mdcp-publish-rel-own-dir-', (work) => {
      mkdirSync(join(work, 'docs', 'pkg'), { recursive: true });
      mkdirSync(join(work, 'pkg'), { recursive: true });
      const shard = join(work, 'docs', 'pkg', 'a.md');
      writeFileSync(shard, '# Pkg A\n');
      const out = rewritePublishRelativeLinks(
        'See [pkgdir](../../pkg/) and [usage](../../pkg/#usage).',
        {
          sourceFile: shard,
          guideDir: join(work, 'docs', 'pkg'),
          currentOutputFile: join(work, 'pkg', 'README.md'),
        },
      );

      expect(out).toBe('See [pkgdir](./) and [usage](./#usage).');
    });
  });

  it('buildSectionSlugMap keys by full path so nested index.md files get distinct slugs', () => {
    withTmpDir('mdcp-slug-index-collision-', (work) => {
      const guideDir = join(work, 'client-core');
      const hooksDir = join(guideDir, 'compile-hooks');
      mkdirSync(hooksDir, { recursive: true });
      writeFileSync(join(guideDir, 'index.md'), '# Client core\n');
      writeFileSync(join(hooksDir, 'index.md'), '# Compile hooks — overview\n');

      const slugByPath = buildSectionSlugMap([
        join(guideDir, 'index.md'),
        join(hooksDir, 'index.md'),
      ]);

      expect(slugByPath.get(resolve(guideDir, 'index.md'))).toBe('client-core');
      expect(slugByPath.get(resolve(hooksDir, 'index.md'))).toBe('compile-hooks--overview');
    });
  });

  it('rewrites nested index.md intra-guide links using full path slug', () => {
    withTmpDir('mdcp-intra-nested-index-', (work) => {
      const guideDir = join(work, 'client-core');
      const hooksDir = join(guideDir, 'compile-hooks');
      mkdirSync(hooksDir, { recursive: true });
      writeFileSync(join(guideDir, 'index.md'), '# Client core\n');
      writeFileSync(join(hooksDir, 'index.md'), '# Compile hooks — overview\n');

      const slugByPath = buildSectionSlugMap([
        join(guideDir, 'index.md'),
        join(hooksDir, 'index.md'),
      ]);

      const input = 'See [Compile hooks](./compile-hooks/index.md).';
      const out = rewriteIntraGuideFileLinks(input, slugByPath, guideDir);
      expect(out).toBe('See [Compile hooks](#compile-hooks--overview).');
    });
  });

  it('rewrites cross-guide links when label contains ] inside inline code', () => {
    withTmpDir('mdcp-bracket-label-', (work) => {
      mkdirSync(join(work, 'features', 'design-constraints'), { recursive: true });
      mkdirSync(join(work, 'client-core', 'compile-hooks'), { recursive: true });

      writeFileSync(
        join(work, 'features', 'index.md'),
        '# Features\n\n## Sections\n\n- [Constraints](./design-constraints/preprocessor-templating.md)\n',
      );
      writeFileSync(
        join(work, 'features', 'design-constraints', 'preprocessor-templating.md'),
        '# Preprocessor\n\n[`guides[].compile.hooks`](../../client-core/compile-hooks/index.md)\n',
      );
      writeFileSync(
        join(work, 'client-core', 'index.md'),
        '# Core\n\n## Sections\n\n- [Hooks](./compile-hooks/index.md)\n',
      );
      writeFileSync(join(work, 'client-core', 'compile-hooks', 'index.md'), '# Compile hooks\n');

      const results = compileGuideResults({
        guidesRoot: work,
        compileOrder: ['features', 'client-core'],
        docsRoot: work,
        config: {
          outputDir: '.',
          outputFile: 'guides.md',
          compileOrder: ['features', 'client-core'],
        },
        guides: [
          { name: 'features' },
          { name: 'client-core', compile: { outputFile: 'README.md' } },
        ],
      });

      const features = results.find((r) => r.name === 'features')!.text;
      expect(features).toContain('[`guides[].compile.hooks`](README.md#compile-hooks)');
      expect(features).not.toContain('compile-hooks/index.md');
    });
  });

  // Link validation reads only the image src of a linked image, so no link pass may rewrite the
  // outer target either (docs/features/link-validation.md, "No placeholder links").
  describe('a linked image keeps its outer target', () => {
    it('in the intra-guide pass', () => {
      const guideDir = '/fake/guide';
      const slugByPath = new Map([[resolve(guideDir, 'page.md'), 'page']]);

      const out = rewriteIntraGuideFileLinks(
        '[![Diagram](./d.png)](./page.md)\n[Plain](./page.md)\n',
        slugByPath,
        guideDir,
      );
      expect(out).toBe('[![Diagram](./d.png)](./page.md)\n[Plain](#page)\n');
    });

    it('in the publish-relative pass', () => {
      withTmpDir('mdcp-linked-image-rel-', (work) => {
        const docsDeveloper = join(work, 'docs', 'developer');
        mkdirSync(docsDeveloper, { recursive: true });
        mkdirSync(join(work, 'docs', 'features'), { recursive: true });
        writeFileSync(join(work, 'package.json'), '{}');
        writeFileSync(join(work, 'docs', 'mdcp.config.json'), '{}');
        writeFileSync(join(work, 'docs', 'features', 'page.md'), '# Page\n');
        const shard = join(docsDeveloper, 'guide.md');
        writeFileSync(shard, '# Guide\n');

        const out = rewritePublishRelativeLinks(
          '[![Diagram](./d.png)](../features/page.md)\n[Plain](../features/page.md)\n',
          {
            sourceFile: shard,
            guideDir: docsDeveloper,
            currentOutputFile: join(work, 'DEVELOPERS.md'),
          },
        );
        expect(out).toBe(
          '[![Diagram](./d.png)](../features/page.md)\n[Plain](docs/features/page.md)\n',
        );
      });
    });

    it('in the cross-guide pass', () => {
      withTmpDir('mdcp-linked-image-cross-', (work) => {
        mkdirSync(join(work, 'features'), { recursive: true });
        mkdirSync(join(work, 'client-core'), { recursive: true });
        writeFileSync(join(work, 'features', 'index.md'), '# Features\n\n- [Topic](./topic.md)\n');
        writeFileSync(
          join(work, 'features', 'topic.md'),
          '# Topic\n\n[![Diagram](./d.png)](../client-core/api.md)\n\n[Plain](../client-core/api.md)\n',
        );
        writeFileSync(join(work, 'client-core', 'index.md'), '# Core\n\n- [API](./api.md)\n');
        writeFileSync(join(work, 'client-core', 'api.md'), '# API\n');

        const results = compileGuideResults({
          guidesRoot: work,
          compileOrder: ['features', 'client-core'],
          docsRoot: work,
          config: {
            outputDir: '.',
            outputFile: 'guides.md',
            compileOrder: ['features', 'client-core'],
          },
          guides: [
            { name: 'features' },
            { name: 'client-core', compile: { outputFile: 'README.md' } },
          ],
        });

        const features = results.find((r) => r.name === 'features')!.text;
        expect(features).toContain('[Plain](README.md#api)');
        expect(features).toContain('[![Diagram](./d.png)](../client-core/api.md)');
      });
    });
  });

  it('rewrites publish-rebased parent paths in post-assembly pass without sourceFile', () => {
    const guideDir = '/fake/docs/client-core';
    const glossaryDir = '/fake/docs/glossary';
    const slugByPath = new Map([
      [resolve(glossaryDir, 'ignore-guides.md'), 'ignoreguides'],
      [resolve(guideDir, 'api-config.md'), 'api-config'],
    ]);

    const input = 'See [ignoreGuides](../../docs/glossary/ignore-guides.md).';
    const out = rewriteIntraGuideFileLinks(input, slugByPath, guideDir);
    expect(out).toBe('See [ignoreGuides](#ignoreguides).');
  });

  it('leaves parent-traversal links unchanged even when resolvable via sourceFile', () => {
    const guideDir = '/fake/guide/compiled';
    const sourceFile = '/fake/guide/topic/section.md';
    const slugByPath = new Map([
      [resolve('/fake/guide/topic/section.md'), 'section'],
      [resolve('/fake/guide/other.md'), 'other'],
    ]);

    const input = 'See [Other](../other.md).';
    const out = rewriteIntraGuideFileLinks(input, slugByPath, guideDir, { sourceFile });
    // Should NOT rewrite parent traversal, leave for cross-guide / ignoreGuides passes.
    expect(out).toBe('See [Other](../other.md).');
  });

  it('rewrites bare sibling links when sourceFile is outside guideDir', () => {
    const guideDir = '/fake/guide/compiled';
    const sourceFile = '/fake/guide/section-a.md';
    const slugByPath = new Map([
      [resolve('/fake/guide/section-a.md'), 'section-a'],
      [resolve('/fake/guide/topic/section-b.md'), 'section-b'],
      [resolve('/fake/guide/assets/diagram.md'), 'diagram'],
    ]);

    const input =
      'See [Section B](topic/section-b.md) and [Diagram](assets/diagram.md#architecture).';

    const out = rewriteIntraGuideFileLinks(input, slugByPath, guideDir, { sourceFile });
    expect(out).toBe('See [Section B](#section-b) and [Diagram](#architecture).');
  });

  it('e2e: rewrites bare sibling links when guideDir differs from shard tree', () => {
    withTmpDir('mdcp-bare-sibling-e2e-', (work) => {
      const guideBase = join(work, 'guide');
      const guideCompiled = join(guideBase, 'compiled');
      mkdirSync(guideCompiled, { recursive: true });
      mkdirSync(join(guideBase, 'topic'), { recursive: true });
      mkdirSync(join(guideBase, 'assets'), { recursive: true });

      writeFileSync(
        join(guideCompiled, 'shards.md'),
        '- [A](../section-a.md)\n- [B](../topic/section-b.md)\n- [Diag](../assets/diagram.md)\n',
      );
      writeFileSync(
        join(guideBase, 'section-a.md'),
        '# Section A\n\nSee [Topic B](topic/section-b.md) and [Diagram](assets/diagram.md).\n',
      );
      writeFileSync(join(guideBase, 'topic', 'section-b.md'), '# Section B\n');
      writeFileSync(join(guideBase, 'assets', 'diagram.md'), '# Diagram\n');

      const results = compileGuideResults({
        guidesRoot: work,
        compileOrder: ['guide/compiled'],
        docsRoot: work,
        config: {
          outputDir: '.',
          outputFile: 'guides.md',
          compileOrder: ['guide/compiled'],
        },
        guides: [
          {
            name: 'guide/compiled',
            compile: {
              manifest: 'shards.md',
              outputFile: 'my-guide.md',
              scopeRoot: '.',
            },
          },
        ],
      });

      const guideText = results.find((r) => r.name === 'guide/compiled')!.text;
      expect(guideText).toContain('[Topic B](#section-b)');
      expect(guideText).toContain('[Diagram](#diagram)');
      expect(guideText).not.toContain('topic/section-b.md)');
      expect(guideText).not.toContain('assets/diagram.md)');
    });
  });

  it('e2e #69: transitive out-of-guideDir shards rewrite under outputDir _build', () => {
    withTmpDir('mdcp-issue-69-transitive-', (work) => {
      mkdirSync(join(work, 'guide', 'compiled'), { recursive: true });
      mkdirSync(join(work, 'topics', 'security'), { recursive: true });

      writeFileSync(join(work, 'guide', 'compiled', 'shards.md'), '- [Shard A](../shard-a.md)\n');
      writeFileSync(
        join(work, 'guide', 'shard-a.md'),
        '# Shard A\n\n- [Onboarding](../onboarding.md#setup-prerequisites)\n',
      );
      writeFileSync(
        join(work, 'onboarding.md'),
        '# Onboarding\n\n## Setup prerequisites\n\n- **Security docs**: [Security overview](./topics/security/index.md).\n',
      );
      writeFileSync(join(work, 'topics', 'security', 'index.md'), '# Security overview\n');

      const results = compileGuideResults({
        guidesRoot: work,
        compileOrder: ['example-guide'],
        docsRoot: work,
        config: {
          outputDir: '_build',
          compileOrder: ['example-guide'],
        },
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
      });

      const text = results.find((r) => r.name === 'example-guide')!.text;
      expect(text).toContain('[Onboarding](#setup-prerequisites)');
      expect(text).toContain('[Security overview](#security-overview)');
      expect(text).not.toMatch(/onboarding\.md\)/);
      expect(text).not.toMatch(/topics\/security\/index\.md\)/);
    });
  });
});

function writeFiles(work: string, files: Record<string, string>): void {
  for (const [rel, text] of Object.entries(files)) {
    mkdirSync(dirname(join(work, rel)), { recursive: true });
    writeFileSync(join(work, rel), text);
  }
}

/**
 * Guide a's shard sits two directories below the repository root and links two outputs of the
 * run, README.md and DEVELOPERS.md, which sit at the root. Neither output is on disk yet, as on a
 * first compile.
 */
function writeOutputLinkFixture(work: string): void {
  writeFiles(work, {
    'docs/a/index.md': '# Guide A\n\n- [Intro](./intro.md)\n',
    'docs/a/intro.md':
      '# Intro\n\nSee [readme](../../README.md) and [setup](../../DEVELOPERS.md#setup).\n',
    'docs/r/index.md': '# Readme\n\n- [Start](./start.md)\n',
    'docs/r/start.md': '# Start\n\nBody.\n',
    'docs/d/index.md': '# Developers\n\n- [Setup](./setup.md)\n',
    'docs/d/setup.md': '# Setup\n\nBody.\n',
  });
}

function outputLinkOptions(
  work: string,
  aCompile: NonNullable<NonNullable<CompileOptionsInput['guides']>[number]['compile']>,
): CompileOptionsInput {
  const compileOrder = ['a', 'r', 'd'];
  return {
    guidesRoot: work,
    compileOrder,
    docsRoot: work,
    config: { outputDir: '_build', outputFile: 'guides.md', compileOrder },
    guides: [
      { name: 'a', path: 'docs/a', compile: aCompile },
      { name: 'r', path: 'docs/r', compile: { outputFile: '../README.md' } },
      { name: 'd', path: 'docs/d', compile: { outputFile: '../DEVELOPERS.md' } },
    ],
  };
}

describe("a shard's own link to an output of the run", () => {
  it('is rebased for a publish output at another depth', () => {
    withTmpDir('mdcp-publish-rel-output-link-', (work) => {
      writeOutputLinkFixture(work);
      const results = compileGuideResults(outputLinkOptions(work, { outputFile: '../a.md' }));
      const a = results.find((r) => r.name === 'a')!;

      expect(a.text).toContain('See [readme](README.md) and [setup](DEVELOPERS.md#setup).');
    });
  });

  it('is rebased for the compiled guide and the monolith of a monolith guide', () => {
    withTmpDir('mdcp-publish-rel-output-link-monolith-', (work) => {
      writeOutputLinkFixture(work);
      const results = compileGuideResults(outputLinkOptions(work, {}));
      const a = results.find((r) => r.name === 'a')!;

      expect(a.text).toContain('See [readme](../README.md) and [setup](../DEVELOPERS.md#setup).');
      expect(a.monolithText).toContain(
        'See [readme](../README.md) and [setup](../DEVELOPERS.md#setup).',
      );
    });
  });

  it('compiles the same whether or not an earlier run left the outputs on disk', () => {
    withTmpDir('mdcp-publish-rel-output-link-written-', (work) => {
      writeOutputLinkFixture(work);
      const options = outputLinkOptions(work, { outputFile: '../a.md' });
      const first = compileGuideResults(options).map((r) => r.text);
      writeFiles(work, {
        'README.md': '# Readme\n',
        'DEVELOPERS.md': '# Developers\n\n## Setup\n',
      });

      expect(compileGuideResults(options).map((r) => r.text)).toEqual(first);
    });
  });

  it("is rebased for a monolith guide's compiled guide that isn't on disk yet", () => {
    withTmpDir('mdcp-publish-rel-output-link-guide-', (work) => {
      writeOutputLinkFixture(work);
      writeFiles(work, { 'docs/a/intro.md': '# Intro\n\nSee [d](../../_build/d.md#setup).\n' });
      const options = outputLinkOptions(work, { outputFile: '../a.md' });
      options.guides![2] = { name: 'd', path: 'docs/d' };
      const a = compileGuideResults(options).find((r) => r.name === 'a')!;

      expect(a.text).toContain('See [d](_build/d.md#setup).');
    });
  });

  it('keeps a link to a monolith that no guide is stitched into as written, even when an earlier run left the file', () => {
    withTmpDir('mdcp-publish-rel-output-link-no-monolith-', (work) => {
      writeOutputLinkFixture(work);
      writeFiles(work, {
        'docs/a/intro.md': '# Intro\n\nSee [all](../../_build/guides.md#setup).\n',
      });
      const options = outputLinkOptions(work, { outputFile: '../a.md' });
      const compileA = () => compileGuideResults(options).find((r) => r.name === 'a')!.text;

      expect(compileA()).toContain('See [all](../../_build/guides.md#setup).');
      // The run never writes the monolith, so a file at its path is stale and doesn't count.
      writeFiles(work, { '_build/guides.md': '# Old\n\n## Setup\n' });
      expect(compileA()).toContain('See [all](../../_build/guides.md#setup).');
    });
  });
});
