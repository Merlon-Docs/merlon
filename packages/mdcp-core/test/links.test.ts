/**
 * Built-in link validation — tests driven by docs/features/link-validation.md.
 */
import { describe, it, expect } from 'vitest';
import { mkdirSync, writeFileSync, readFileSync } from 'node:fs';
import { dirname, join } from 'node:path';
import { extractLinks } from '../src/links/extract.js';
import { markBrokenLinks, formatBrokenLinkMarker } from '../src/links/mark-broken.js';
import { validateCompiledLinkTarget } from '../src/links/validate.js';
import { lintShardLinks, collectShardProvenance } from '../src/links/validate-shards.js';
import { lintCompiledLinks } from '../src/links/validate-compiled.js';
import { lintLinks, formatLinkIssue } from '../src/links/lint.js';
import { buildSlugRegistry } from '../src/refs/slugs.js';
import { compileGuideResults } from '../src/compile/assemble.js';
import { createShardCache, loadShardSnapshot } from '../src/compile/shard-cache.js';
import { MdcpConfigSchema } from '../src/config/schema.js';
import { withTmpDir, withCwd } from './helpers/tmp-dir.js';

describe('extractLinks', () => {
  it('extracts links with line numbers', () => {
    const md = '# Title\n\nSee [doc](./other.md) here.\n';
    const links = extractLinks(md);
    expect(links).toHaveLength(1);
    expect(links[0].label).toBe('doc');
    expect(links[0].target).toBe('./other.md');
    expect(links[0].line).toBe(3);
  });

  it('skips links inside fenced code blocks', () => {
    const md = '```\n[not a link](./x.md)\n```\n[real](./y.md)\n';
    const links = extractLinks(md);
    expect(links).toHaveLength(1);
    expect(links[0].target).toBe('./y.md');
  });

  it('skips links inside inline code spans', () => {
    const md = 'Use `[label](#slug)` syntax.\n[real](./y.md)\n';
    const links = extractLinks(md);
    expect(links).toHaveLength(1);
    expect(links[0].target).toBe('./y.md');
  });

  it('skips links inside double-backtick code spans', () => {
    const md = 'Example `` `[x](./a.md)` `` here.\n';
    expect(extractLinks(md)).toHaveLength(0);
  });
});

describe('markBrokenLinks', () => {
  it('replaces dead anchor with marker showing label, original target, broken target', () => {
    const md = '# Guide\n\n## Section\n\nSee [bad](#missing-slug).\n';
    const { markdown, issues } = markBrokenLinks(md, {
      provenance: [
        {
          label: 'bad',
          originalTarget: '#missing-slug',
          sourceFile: '/docs/client/consumer.md',
          sourceLine: 5,
        },
      ],
      enabled: true,
    });
    expect(markdown).toContain('**BROKEN LINK:**');
    expect(markdown).toContain('"bad"');
    expect(markdown).not.toMatch(/\]\(#missing-slug\)/);
    expect(issues.length).toBeGreaterThan(0);
  });

  it('does not replace unresolved .md paths (peer / shard validation)', () => {
    const md = 'Link [Missing](./gone.md) here.\n';
    const { markdown } = markBrokenLinks(md, {
      enabled: true,
      outputFile: '/out/guide.md',
    });
    expect(markdown).toContain('[Missing](./gone.md)');
    expect(markdown).not.toContain('**BROKEN LINK:**');
  });

  it('leaves link unchanged when disabled', () => {
    const md = '[bad](#missing-slug)\n';
    const { markdown } = markBrokenLinks(md, { enabled: false });
    expect(markdown).toBe(md);
  });
});

describe('formatBrokenLinkMarker', () => {
  it('formats marker prose', () => {
    expect(formatBrokenLinkMarker('T', './a.md', '#x', 'dead anchor in compiled guide')).toBe(
      '**BROKEN LINK:** "T" (`./a.md`) → `#x` (dead anchor in compiled guide)',
    );
  });
});

describe('validateCompiledLinkTarget', () => {
  it('accepts existing slug', () => {
    const md = '# Guide\n\n## Hello\n\n[link](#hello)\n';
    const registry = buildSlugRegistry(md);
    expect(validateCompiledLinkTarget('#hello', registry).valid).toBe(true);
  });

  it('rejects dead anchor', () => {
    const registry = buildSlugRegistry('# Guide\n\n## Hello\n');
    const r = validateCompiledLinkTarget('#missing', registry);
    expect(r.valid).toBe(false);
    expect(r.reason).toBe('dead anchor');
  });

  it('rejects indexed shard paths in publish-only output', () => {
    withTmpDir('mdcp-publish-shard-', (work) => {
      const shard = join(work, 'features', 'legacy.md');
      mkdirSync(join(work, 'features'), { recursive: true });
      writeFileSync(shard, '# Legacy\n');
      const publishOut = join(work, 'packages', 'cli', 'README.md');
      mkdirSync(dirname(publishOut), { recursive: true });
      writeFileSync(publishOut, '# CLI\n');

      const r = validateCompiledLinkTarget(
        '../../docs/features/legacy.md',
        buildSlugRegistry('# CLI\n'),
        {
          outputFile: publishOut,
          publishOnly: true,
          allowedPublishPaths: new Set([publishOut]),
          disallowedShardPaths: new Set([shard]),
        },
      );
      expect(r.valid).toBe(false);
      expect(r.reason).toBe('missing publish path');
    });
  });

  it('allows non-indexed .md paths that exist in publish-only output', () => {
    withTmpDir('mdcp-publish-example-', (work) => {
      const example = join(work, 'examples', 'prompt.md');
      mkdirSync(join(work, 'examples'), { recursive: true });
      writeFileSync(example, '# Prompt\n');
      const publishOut = join(work, 'packages', 'cli', 'README.md');
      mkdirSync(dirname(publishOut), { recursive: true });
      writeFileSync(publishOut, '# CLI\n');

      const r = validateCompiledLinkTarget(
        '../../examples/prompt.md',
        buildSlugRegistry('# CLI\n'),
        {
          outputFile: publishOut,
          publishOnly: true,
          allowedPublishPaths: new Set([publishOut]),
          disallowedShardPaths: new Set(),
        },
      );
      expect(r.valid).toBe(true);
    });
  });

  it('accepts cross-publish README links by fragment when href path is rewritten', () => {
    withTmpDir('mdcp-cross-publish-', (work) => {
      const cliOut = join(work, 'packages', 'cli', 'README.md');
      const coreOut = join(work, 'packages', 'core', 'README.md');
      mkdirSync(dirname(cliOut), { recursive: true });
      mkdirSync(dirname(coreOut), { recursive: true });
      writeFileSync(coreOut, '# Core\n\n## Cross-guide link rewriting\n\nSpec.\n');
      writeFileSync(cliOut, '# CLI\n\nSee [spec](../core/README.md#cross-guide-link-rewriting).\n');

      const r = validateCompiledLinkTarget(
        '../core/README.md#cross-guide-link-rewriting',
        buildSlugRegistry(readFileSync(cliOut, 'utf-8')),
        {
          outputFile: cliOut,
          publishOnly: true,
          allowedPublishPaths: new Set([cliOut, coreOut]),
          disallowedShardPaths: new Set(),
        },
      );
      expect(r.valid).toBe(true);
    });
  });

  describe('compile outputs matched by resolved path, not file name', () => {
    // An output named README.md at the repo root must not vouch for every other
    // README.md: the target's file and fragment are checked on their own.
    function options(work: string) {
      const outputFile = join(work, 'docs', '_build', 'a.md');
      return {
        outputFile,
        knownOutputBasenames: new Set(['a.md', 'README.md']),
        knownOutputPaths: new Set([outputFile, join(work, 'README.md')]),
      };
    }

    it('reports a dead fragment in a non-output file that shares an output basename', () => {
      withTmpDir('mdcp-output-basename-', (work) => {
        mkdirSync(join(work, 'pkg'), { recursive: true });
        writeFileSync(join(work, 'pkg', 'README.md'), '# Pkg\n\n## Usage\n');
        const registry = buildSlugRegistry('# A\n');

        const dead = validateCompiledLinkTarget(
          '../../pkg/README.md#nope',
          registry,
          options(work),
        );
        expect(dead).toMatchObject({
          valid: false,
          reason: 'dead anchor',
          brokenTarget: '../../pkg/README.md#nope',
        });
        expect(
          validateCompiledLinkTarget('../../pkg/README.md#usage', registry, options(work)).valid,
        ).toBe(true);
      });
    });

    it('reports a missing file that shares an output basename', () => {
      withTmpDir('mdcp-output-basename-missing-', (work) => {
        const r = validateCompiledLinkTarget(
          '../../nothere/README.md',
          buildSlugRegistry('# A\n'),
          options(work),
        );
        expect(r).toMatchObject({ valid: false, reason: 'missing publish path' });
      });
    });

    it('checks the fragment of an output not yet on disk against its cached registry', () => {
      withTmpDir('mdcp-output-unwritten-', (work) => {
        const slugRegistryCache = new Map([
          [join(work, 'README.md'), buildSlugRegistry('# Readme\n\n## Start\n')],
        ]);
        const opts = { ...options(work), slugRegistryCache };
        const registry = buildSlugRegistry('# A\n');

        expect(validateCompiledLinkTarget('../../README.md', registry, opts).valid).toBe(true);
        expect(validateCompiledLinkTarget('../../README.md#start', registry, opts).valid).toBe(
          true,
        );
        expect(validateCompiledLinkTarget('../../README.md#nope', registry, opts)).toMatchObject({
          valid: false,
          reason: 'dead anchor',
        });
      });
    });

    it('does not match a publish output by file name in publish-only output', () => {
      withTmpDir('mdcp-publish-basename-', (work) => {
        const rootReadme = join(work, 'README.md');
        const developers = join(work, 'DEVELOPERS.md');
        writeFileSync(rootReadme, '# Readme\n\n## Usage\n');
        writeFileSync(developers, '# Developers\n');

        const r = validateCompiledLinkTarget(
          'pkg/README.md#usage',
          buildSlugRegistry('# Developers\n'),
          {
            outputFile: developers,
            publishOnly: true,
            allowedPublishPaths: new Set([rootReadme, developers]),
            disallowedShardPaths: new Set(),
          },
        );
        expect(r).toMatchObject({ valid: false, reason: 'missing publish path' });
      });
    });

    it('checks the fragment of a publish output not yet on disk against its cached registry', () => {
      withTmpDir('mdcp-publish-unwritten-', (work) => {
        const rootReadme = join(work, 'README.md');
        const developers = join(work, 'DEVELOPERS.md');
        const opts = {
          outputFile: developers,
          publishOnly: true,
          allowedPublishPaths: new Set([rootReadme, developers]),
          disallowedShardPaths: new Set<string>(),
          slugRegistryCache: new Map([[rootReadme, buildSlugRegistry('# Readme\n\n## Start\n')]]),
        };
        const registry = buildSlugRegistry('# Developers\n');

        expect(validateCompiledLinkTarget('README.md#start', registry, opts).valid).toBe(true);
        expect(validateCompiledLinkTarget('README.md#nope', registry, opts)).toMatchObject({
          valid: false,
          reason: 'dead anchor',
        });
      });
    });

    it('checks a publish-only link to an unwritten per-guide output against its cached registry', () => {
      withTmpDir('mdcp-publish-to-guide-', (work) => {
        // Cross-guide rewrite emits this link from a publish-only README to a
        // guide without `compile.outputFile`. Nothing is written yet.
        const readme = join(work, 'README.md');
        const guideOutput = join(work, 'docs', '_build', 'a.md');
        const opts = {
          outputFile: readme,
          publishOnly: true,
          knownOutputPaths: new Set([readme, guideOutput]),
          allowedPublishPaths: new Set([readme]),
          disallowedShardPaths: new Set<string>(),
          slugRegistryCache: new Map([
            [readme, buildSlugRegistry('# Readme\n')],
            [guideOutput, buildSlugRegistry('# Guide A\n\n## Setup\n')],
          ]),
        };
        const registry = buildSlugRegistry('# Readme\n');

        expect(validateCompiledLinkTarget('docs/_build/a.md', registry, opts).valid).toBe(true);
        expect(validateCompiledLinkTarget('docs/_build/a.md#setup', registry, opts).valid).toBe(
          true,
        );
        expect(validateCompiledLinkTarget('docs/_build/a.md#nope', registry, opts)).toMatchObject({
          valid: false,
          reason: 'dead anchor',
          brokenTarget: 'docs/_build/a.md#nope',
        });
      });
    });

    it('accepts any fragment of an output with no cached registry and no file', () => {
      withTmpDir('mdcp-output-no-registry-', (work) => {
        // A library caller may pass output paths without a registry cache.
        // With no compiled text and no file there is nothing to check against.
        const outputFile = join(work, 'docs', '_build', 'a.md');
        const r = validateCompiledLinkTarget('b.md#anything', buildSlugRegistry('# A\n'), {
          outputFile,
          knownOutputPaths: new Set([outputFile, join(work, 'docs', '_build', 'b.md')]),
        });
        expect(r.valid).toBe(true);
      });
    });

    it('normalizes an absolute target before matching it to an output', () => {
      withTmpDir('mdcp-output-absolute-', (work) => {
        const outputFile = join(work, 'docs', '_build', 'a.md');
        const readme = join(work, 'README.md');
        const opts = {
          outputFile,
          knownOutputPaths: new Set([outputFile, readme]),
          slugRegistryCache: new Map([[readme, buildSlugRegistry('# Readme\n\n## Start\n')]]),
        };
        const registry = buildSlugRegistry('# A\n');
        const target = `${work}/docs/_build/../../README.md`;

        expect(validateCompiledLinkTarget(`${target}#start`, registry, opts).valid).toBe(true);
        expect(validateCompiledLinkTarget(`${target}#nope`, registry, opts)).toMatchObject({
          valid: false,
          reason: 'dead anchor',
        });
      });
    });

    it('normalizes output paths before matching a link to them', () => {
      withTmpDir('mdcp-output-unnormalized-', (work) => {
        const outputFile = join(work, 'docs', '_build', 'a.md');
        const readme = join(work, 'README.md');
        const opts = {
          outputFile,
          knownOutputPaths: new Set([outputFile, `${work}/docs/_build/../../README.md`]),
          slugRegistryCache: new Map([[readme, buildSlugRegistry('# Readme\n\n## Start\n')]]),
        };
        const registry = buildSlugRegistry('# A\n');

        expect(validateCompiledLinkTarget('../../README.md#start', registry, opts).valid).toBe(
          true,
        );
        expect(validateCompiledLinkTarget('../../README.md#nope', registry, opts)).toMatchObject({
          valid: false,
          reason: 'dead anchor',
        });
      });
    });

    it('checks a package README fragment against that README in publish-only output', () => {
      withTmpDir('mdcp-publish-package-readme-', (work) => {
        // The root README publish output has no Usage heading. The package
        // README beside it does, so only its headings decide the fragment.
        const rootReadme = join(work, 'README.md');
        const developers = join(work, 'DEVELOPERS.md');
        mkdirSync(join(work, 'pkg'), { recursive: true });
        writeFileSync(rootReadme, '# Readme\n');
        writeFileSync(developers, '# Developers\n');
        writeFileSync(join(work, 'pkg', 'README.md'), '# Pkg\n\n## Usage\n');
        const opts = {
          outputFile: developers,
          publishOnly: true,
          knownOutputPaths: new Set([rootReadme, developers]),
          allowedPublishPaths: new Set([rootReadme, developers]),
          disallowedShardPaths: new Set<string>(),
        };
        const registry = buildSlugRegistry('# Developers\n');

        expect(validateCompiledLinkTarget('pkg/README.md#usage', registry, opts).valid).toBe(true);
        expect(validateCompiledLinkTarget('pkg/README.md#nope', registry, opts)).toMatchObject({
          valid: false,
          reason: 'dead anchor',
          brokenTarget: 'pkg/README.md#nope',
        });
      });
    });

    it.each([false, true])(
      'reports an unwritten output left on disk by an earlier run (publishOnly: %s)',
      (publishOnly) => {
        withTmpDir('mdcp-output-unwritten-stale-', (work) => {
          // The file has the heading, but this run never writes it, so it is stale.
          const readme = join(work, 'README.md');
          const monolith = join(work, 'docs', '_build', 'guides.md');
          mkdirSync(dirname(monolith), { recursive: true });
          writeFileSync(monolith, '# Old monolith\n\n## Start\n');
          const opts = {
            outputFile: readme,
            publishOnly,
            knownOutputPaths: new Set([readme]),
            unwrittenOutputPaths: new Set([`${work}/docs/_build/../_build/guides.md`]),
            disallowedShardPaths: new Set<string>(),
          };
          const registry = buildSlugRegistry('# Readme\n');

          for (const target of ['docs/_build/guides.md', 'docs/_build/guides.md#start']) {
            expect(validateCompiledLinkTarget(target, registry, opts)).toMatchObject({
              valid: false,
              reason: 'missing publish path',
              brokenTarget: target,
            });
          }
        });
      },
    );
  });
});

describe('lintShardLinks', () => {
  it('reports missing .md at shard path:line', () => {
    withTmpDir('mdcp-lint-shard-', (work) => {
      const guideDir = join(work, 'g');
      mkdirSync(guideDir, { recursive: true });
      const shard = join(guideDir, 'section.md');
      writeFileSync(shard, '## S\n\n[Missing](./gone.md)\n');
      const issues = lintShardLinks({ shardFile: shard, guideDir });
      expect(issues.some((i) => i.kind === 'missing file')).toBe(true);
      expect(issues[0].file).toBe(shard);
    });
  });

  it('reports dead #fragment in same shard', () => {
    withTmpDir('mdcp-lint-frag-', (work) => {
      const guideDir = join(work, 'g');
      mkdirSync(guideDir, { recursive: true });
      const shard = join(guideDir, 'section.md');
      writeFileSync(shard, '## S\n\n[bad](#no-such-heading)\n');
      const issues = lintShardLinks({ shardFile: shard, guideDir });
      expect(issues.some((i) => i.kind === 'dead anchor')).toBe(true);
    });
  });

  it('reports a #fragment that only matches a comment in a fenced code block', () => {
    withTmpDir('mdcp-lint-frag-fence-', (work) => {
      const guideDir = join(work, 'g');
      mkdirSync(guideDir, { recursive: true });
      const shard = join(guideDir, 'section.md');
      writeFileSync(shard, '## S\n\n```bash\n# install\n```\n\n[install](#install)\n');
      const snapshot = loadShardSnapshot(shard, createShardCache());
      for (const issues of [
        lintShardLinks({ shardFile: shard, guideDir }),
        lintShardLinks({ shardFile: shard, guideDir, snapshot }),
      ]) {
        expect(issues.map((i) => [i.kind, i.line])).toEqual([['dead anchor', 7]]);
      }
    });
  });
});

describe('lintCompiledLinks', () => {
  it('reports dead #slug after demotion', () => {
    const md = '# Guide\n\n## Real\n\n[bad](#fake-slug)\n';
    const issues = lintCompiledLinks({
      markdown: md,
      outputFile: '/out/guide.md',
    });
    expect(issues.some((i) => i.kind === 'dead anchor')).toBe(true);
  });

  it('detects BROKEN LINK markers in output', () => {
    const md = '**BROKEN LINK:** "X" (`./a.md`) → `#x` (dead anchor)\n';
    const issues = lintCompiledLinks({ markdown: md, outputFile: '/out.md' });
    expect(issues.length).toBe(1);
  });

  it('ignores BROKEN LINK examples inside fenced code blocks', () => {
    const md = '```markdown\n**BROKEN LINK:** "X" (`./a.md`) → `#x` (dead anchor)\n```\n';
    const issues = lintCompiledLinks({ markdown: md, outputFile: '/out.md' });
    expect(issues).toHaveLength(0);
  });
});

describe('formatLinkIssue', () => {
  it('uses link: prefix for error severity', () => {
    const msg = formatLinkIssue(
      {
        kind: 'dead anchor',
        file: 'a.md',
        line: 1,
        label: 'L',
        originalTarget: './x.md',
        brokenTarget: '#x',
      },
      'error',
    );
    expect(msg).toMatch(/^link: a\.md:1:/);
  });

  it('uses link-warn: prefix for warn severity', () => {
    const msg = formatLinkIssue(
      {
        kind: 'dead anchor',
        file: 'a.md',
        line: 1,
        label: 'L',
        originalTarget: './x.md',
        brokenTarget: '#x',
      },
      'warn',
    );
    expect(msg).toMatch(/^link-warn: a\.md:1:/);
  });
});

describe('lintLinks', () => {
  it('aggregates compiled issues', () => {
    withTmpDir('mdcp-lint-links-', (work) => {
      mkdirSync(join(work, 'g'), { recursive: true });
      writeFileSync(join(work, 'g', 'index.md'), '# G\n\n- [s](s.md)\n');
      writeFileSync(join(work, 'g', 's.md'), '# G\n\n## Hi\n\n[bad](#nope)\n');
      const results = compileGuideResults({
        guidesRoot: work,
        compileOrder: ['g'],
        docsRoot: work,
        config: { outputDir: '.', compileOrder: ['g'] },
        guides: [
          {
            name: 'g',
            path: 'g',
            compile: { outputFile: 'out.md', links: { markBroken: false } },
          },
        ],
      });
      const issues = lintLinks({
        config: MdcpConfigSchema.parse({ compileOrder: ['g'], outputDir: '.' }),
        docsRoot: work,
        results,
      });
      expect(issues.length).toBeGreaterThan(0);
    });
  });

  it('checks a .md link that shares a file name with another guide output', () => {
    withTmpDir('mdcp-lint-output-paths-', (work) => {
      const docsRoot = join(work, 'docs');
      mkdirSync(join(docsRoot, 'a'), { recursive: true });
      mkdirSync(join(docsRoot, 'r'), { recursive: true });
      mkdirSync(join(work, 'pkg'), { recursive: true });
      writeFileSync(join(work, 'pkg', 'README.md'), '# Pkg\n\n## Usage\n');
      writeFileSync(join(docsRoot, 'a', 'index.md'), '# Guide A\n\n- [Intro](./intro.md)\n');
      writeFileSync(
        join(docsRoot, 'a', 'intro.md'),
        [
          '# Intro',
          '',
          '- [Usage](../../pkg/README.md#usage)',
          '- [Stale](../../pkg/README.md#nope)',
          '- [Gone](../../nothere/README.md)',
          '- [Start](../../README.md#start)',
          '- [Missing heading](../../README.md#nope)',
          '',
        ].join('\n'),
      );
      writeFileSync(join(docsRoot, 'r', 'index.md'), '# Readme guide\n\n- [Start](./start.md)\n');
      writeFileSync(join(docsRoot, 'r', 'start.md'), '# Start\n\nHello.\n');

      const configInput = {
        compileOrder: ['a', 'r'],
        guides: [{ name: 'r', compile: { outputFile: '../../README.md' } }],
      };
      const compileOptions = {
        guidesRoot: docsRoot,
        compileOrder: configInput.compileOrder,
        docsRoot,
        config: configInput,
        guides: configInput.guides,
      };
      const results = compileGuideResults(compileOptions);

      // Nothing is written: the root README output exists only in memory.
      const issues = lintLinks({
        config: MdcpConfigSchema.parse(configInput),
        docsRoot,
        results,
        compileOptions,
      });
      const found = issues
        .filter((i) => i.guideName === 'a')
        .map((i) => `${i.kind} ${i.originalTarget}`)
        .sort();
      expect(found).toEqual([
        'dead anchor ../../README.md#nope',
        'dead anchor ../../pkg/README.md#nope',
        'missing publish path ../../nothere/README.md',
      ]);
    });
  });

  it('checks a link to the unwritten monolith against its compiled text', () => {
    withTmpDir('mdcp-lint-monolith-path-', (work) => {
      const docsRoot = join(work, 'docs');
      mkdirSync(join(docsRoot, 'a'), { recursive: true });
      mkdirSync(join(docsRoot, 'b'), { recursive: true });
      writeFileSync(join(docsRoot, 'a', 'index.md'), '# Guide A\n\n- [Intro](./intro.md)\n');
      writeFileSync(
        join(docsRoot, 'a', 'intro.md'),
        '# Intro\n\nSee [good](../_build/guides.md#b-setup) and [bad](../_build/guides.md#nope).\n',
      );
      writeFileSync(join(docsRoot, 'b', 'index.md'), '# Guide B\n\n- [Setup](./setup.md)\n');
      writeFileSync(join(docsRoot, 'b', 'setup.md'), '# B setup\n\nText.\n');

      const configInput = { outputFile: 'guides.md', compileOrder: ['a', 'b'] };
      const compileOptions = {
        guidesRoot: docsRoot,
        compileOrder: configInput.compileOrder,
        docsRoot,
        config: configInput,
      };
      const results = compileGuideResults(compileOptions);

      // Nothing is written: guides.md exists only as the stitched text.
      const issues = lintLinks({
        config: MdcpConfigSchema.parse(configInput),
        docsRoot,
        results,
        compileOptions,
      });
      expect(issues.map((i) => `${i.kind} ${i.originalTarget}`)).toEqual([
        'dead anchor ../_build/guides.md#nope',
      ]);
    });
  });

  it('checks a publish-only link to an unwritten guide output against its compiled text', () => {
    withTmpDir('mdcp-lint-publish-to-guide-', (work) => {
      const docsRoot = join(work, 'docs');
      mkdirSync(join(docsRoot, 'a'), { recursive: true });
      mkdirSync(join(docsRoot, 'r'), { recursive: true });
      writeFileSync(join(docsRoot, 'a', 'index.md'), '# Guide A\n\n- [Intro](./intro.md)\n');
      writeFileSync(join(docsRoot, 'a', 'intro.md'), '# Intro\n\n## Setup\n\nText.\n');
      writeFileSync(join(docsRoot, 'r', 'index.md'), '# Readme guide\n\n- [Start](./start.md)\n');
      writeFileSync(
        join(docsRoot, 'r', 'start.md'),
        '# Start\n\nSee [setup](../a/intro.md#setup) and [stale](../a/intro.md#nope).\n',
      );

      const configInput = {
        compileOrder: ['a', 'r'],
        guides: [{ name: 'r', compile: { outputFile: '../../README.md' } }],
      };
      const compileOptions = {
        guidesRoot: docsRoot,
        compileOrder: configInput.compileOrder,
        docsRoot,
        config: configInput,
        guides: configInput.guides,
      };
      const results = compileGuideResults(compileOptions);
      expect(results.find((r) => r.name === 'r')?.text).toContain('(./docs/_build/a.md#setup)');

      // Nothing is written: the README links to a.md, which exists only in memory.
      const issues = lintLinks({
        config: MdcpConfigSchema.parse(configInput),
        docsRoot,
        results,
        compileOptions,
      });
      expect(issues.map((i) => `${i.kind} ${i.guideName} ${i.originalTarget}`)).toEqual([
        'dead anchor r ./docs/_build/a.md#nope',
      ]);
    });
  });

  it.each([
    ['absent', false],
    ['left by an earlier run', true],
  ])('reports links to a monolith that no guide is stitched into (file %s)', (_label, stale) => {
    withTmpDir('mdcp-lint-monolith-unwritten-', (work) => {
      // Every guide is publish-only, so the configured monolith is never written.
      // An old copy on disk must not vouch for links to it.
      const docsRoot = join(work, 'docs');
      mkdirSync(join(docsRoot, 'r'), { recursive: true });
      mkdirSync(join(docsRoot, 'd'), { recursive: true });
      if (stale) {
        mkdirSync(join(docsRoot, '_build'), { recursive: true });
        writeFileSync(join(docsRoot, '_build', 'guides.md'), '# Old monolith\n\n## Start\n');
      }
      writeFileSync(join(docsRoot, 'r', 'index.md'), '# Readme guide\n\n- [Start](./start.md)\n');
      writeFileSync(
        join(docsRoot, 'r', 'start.md'),
        '# Start\n\nSee [mono](docs/_build/guides.md#start) and [mono2](docs/_build/guides.md).\n',
      );
      writeFileSync(join(docsRoot, 'd', 'index.md'), '# Dev guide\n\n- [Setup](./setup.md)\n');
      writeFileSync(join(docsRoot, 'd', 'setup.md'), '# Setup\n\nText.\n');

      const configInput = {
        outputFile: 'guides.md',
        compileOrder: ['r', 'd'],
        guides: [
          { name: 'r', compile: { outputFile: '../../README.md' } },
          { name: 'd', compile: { outputFile: '../../DEVELOPERS.md' } },
        ],
      };
      const compileOptions = {
        guidesRoot: docsRoot,
        compileOrder: configInput.compileOrder,
        docsRoot,
        config: configInput,
        guides: configInput.guides,
      };
      const results = compileGuideResults(compileOptions);

      const issues = lintLinks({
        config: MdcpConfigSchema.parse(configInput),
        docsRoot,
        results,
        compileOptions,
      });
      expect(issues.map((i) => `${i.kind} ${i.originalTarget}`).sort()).toEqual([
        'missing publish path docs/_build/guides.md',
        'missing publish path docs/_build/guides.md#start',
      ]);
    });
  });

  it('accepts a link to the monolith path when a publish-only guide writes that file', () => {
    withTmpDir('mdcp-lint-monolith-guide-output-', (work) => {
      // No guide is stitched, but guide d writes the configured monolith path.
      const docsRoot = join(work, 'docs');
      mkdirSync(join(docsRoot, 'r'), { recursive: true });
      mkdirSync(join(docsRoot, 'd'), { recursive: true });
      writeFileSync(join(docsRoot, 'r', 'index.md'), '# Readme guide\n\n- [Start](./start.md)\n');
      writeFileSync(
        join(docsRoot, 'r', 'start.md'),
        '# Start\n\nSee [setup](docs/_build/guides.md#setup) and [bad](docs/_build/guides.md#nope).\n',
      );
      writeFileSync(join(docsRoot, 'd', 'index.md'), '# Dev guide\n\n- [Setup](./setup.md)\n');
      writeFileSync(join(docsRoot, 'd', 'setup.md'), '# Setup\n\nText.\n');

      const configInput = {
        outputFile: 'guides.md',
        compileOrder: ['r', 'd'],
        guides: [
          { name: 'r', compile: { outputFile: '../../README.md' } },
          { name: 'd', compile: { outputFile: 'guides.md' } },
        ],
      };
      const compileOptions = {
        guidesRoot: docsRoot,
        compileOrder: configInput.compileOrder,
        docsRoot,
        config: configInput,
        guides: configInput.guides,
      };
      const results = compileGuideResults(compileOptions);

      const issues = lintLinks({
        config: MdcpConfigSchema.parse(configInput),
        docsRoot,
        results,
        compileOptions,
      });
      expect(issues.map((i) => `${i.kind} ${i.originalTarget}`)).toEqual([
        'dead anchor docs/_build/guides.md#nope',
      ]);
    });
  });
});

describe('compileGuideResults link validation e2e', () => {
  it('rewrites cross-guide publish link to guides.md#slug after index ownership fix', () => {
    withTmpDir('mdcp-publish-broken-', (work) => {
      mkdirSync(join(work, 'features'), { recursive: true });
      mkdirSync(join(work, 'client-cli'), { recursive: true });

      writeFileSync(
        join(work, 'features', 'index.md'),
        '# Features\n\n## Sections\n\n- [Catalog](./feature-catalog.md)\n',
      );
      writeFileSync(
        join(work, 'features', 'feature-catalog.md'),
        '# Feature catalog\n\nContent.\n',
      );

      writeFileSync(
        join(work, 'client-cli', 'index.md'),
        '# CLI\n\n## Sections\n\n- [Consumer](./consumer.md)\n',
      );
      writeFileSync(
        join(work, 'client-cli', 'consumer.md'),
        '# CLI\n\n## Consumer\n\nSee [Catalog](../features/feature-catalog.md).\n',
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
          {
            name: 'client-cli',
            compile: { outputFile: 'README.md', links: { markBroken: true } },
          },
        ],
      });

      const readme = results.find((r) => r.name === 'client-cli')!.text;
      expect(readme).toContain('guides.md#feature-catalog');
      expect(readme).not.toContain('**BROKEN LINK:**');
    });
  });

  it('ignoreGuides keeps shard paths and lint accepts them in publish output', () => {
    withTmpDir('mdcp-ignore-features-', (work) => {
      const docsRoot = join(work, 'docs');
      mkdirSync(join(docsRoot, 'features'), { recursive: true });
      mkdirSync(join(docsRoot, 'client-cli'), { recursive: true });
      mkdirSync(join(work, 'packages', 'cli'), { recursive: true });

      writeFileSync(
        join(docsRoot, 'features', 'index.md'),
        '# Features\n\n## Sections\n\n- [Catalog](./feature-catalog.md)\n',
      );
      writeFileSync(join(docsRoot, 'features', 'feature-catalog.md'), '# Feature catalog\n');

      writeFileSync(
        join(docsRoot, 'client-cli', 'index.md'),
        '# CLI\n\n## Sections\n\n- [Consumer](./consumer.md)\n',
      );
      writeFileSync(
        join(docsRoot, 'client-cli', 'consumer.md'),
        '## Consumer\n\n[Catalog](../features/feature-catalog.md)\n',
      );

      const compileOptions = {
        guidesRoot: docsRoot,
        compileOrder: ['features', 'client-cli'],
        docsRoot,
        config: {
          outputDir: '.',
          outputFile: 'guides.md',
          compileOrder: ['features', 'client-cli'],
        },
        guides: [
          { name: 'features' },
          {
            name: 'client-cli',
            compile: {
              outputFile: '../../packages/cli/README.md',
              crossGuideLinks: { ignoreGuides: ['features'] },
              links: { markBroken: true },
            },
          },
        ],
      };

      const results = compileGuideResults(compileOptions);

      const readme = results.find((r) => r.name === 'client-cli')!.text;
      expect(readme).toMatch(/\[Catalog\]\([^)]*features\/feature-catalog\.md\)/);
      expect(readme).not.toContain('guides.md#feature-catalog');
      expect(readme).not.toContain('**BROKEN LINK:**');

      const issues = lintLinks({
        config: MdcpConfigSchema.parse({
          compileOrder: ['features', 'client-cli'],
          outputDir: '.',
          outputFile: 'guides.md',
          guides: [
            { name: 'features' },
            {
              name: 'client-cli',
              compile: {
                outputFile: '../../packages/cli/README.md',
                crossGuideLinks: { ignoreGuides: ['features'] },
              },
            },
          ],
        }),
        docsRoot,
        results,
        compileOptions,
      });
      expect(
        issues.some(
          (i) =>
            i.guideName === 'client-cli' &&
            i.kind === 'missing publish path' &&
            i.originalTarget.includes('feature-catalog.md'),
        ),
      ).toBe(false);
    });
  });

  it('keeps cross-publish README paths when linking between publish outputs', () => {
    withTmpDir('mdcp-cross-publish-compile-', (work) => {
      const docsRoot = join(work, 'docs');
      mkdirSync(join(docsRoot, 'client-cli'), { recursive: true });
      mkdirSync(join(docsRoot, 'client-core', 'compile-hooks'), { recursive: true });
      mkdirSync(join(work, 'packages', 'cli'), { recursive: true });
      mkdirSync(join(work, 'packages', 'core'), { recursive: true });

      writeFileSync(
        join(docsRoot, 'client-core', 'index.md'),
        '# Core\n\n## Sections\n\n- [Cross-guide](./compile-hooks/cross-guide-links.md)\n',
      );
      writeFileSync(
        join(docsRoot, 'client-core', 'compile-hooks', 'cross-guide-links.md'),
        '# Cross-guide link rewriting\n\nSpec.\n',
      );
      writeFileSync(
        join(docsRoot, 'client-cli', 'index.md'),
        '# CLI\n\n## Sections\n\n- [Glossary](./glossary.md)\n',
      );
      writeFileSync(
        join(docsRoot, 'client-cli', 'glossary.md'),
        '## ignoreGuides\n\nSee [Cross-guide](../client-core/compile-hooks/cross-guide-links.md).\n',
      );

      const compileOptions = {
        guidesRoot: docsRoot,
        compileOrder: ['client-core', 'client-cli'],
        docsRoot,
        config: {
          outputDir: '.',
          compileOrder: ['client-core', 'client-cli'],
        },
        guides: [
          {
            name: 'client-core',
            compile: { outputFile: '../../packages/core/README.md' },
          },
          {
            name: 'client-cli',
            compile: { outputFile: '../../packages/cli/README.md' },
          },
        ],
      };

      const results = compileGuideResults(compileOptions);
      writeFileSync(
        join(work, 'packages', 'core', 'README.md'),
        results.find((r) => r.name === 'client-core')!.text,
      );
      writeFileSync(
        join(work, 'packages', 'cli', 'README.md'),
        results.find((r) => r.name === 'client-cli')!.text,
      );

      const readme = results.find((r) => r.name === 'client-cli')!.text;
      expect(readme).toContain('../core/README.md#cross-guide-link-rewriting');
      expect(readme).not.toContain('../../docs/core/README.md');

      const issues = lintLinks({
        config: MdcpConfigSchema.parse({
          compileOrder: ['client-core', 'client-cli'],
          outputDir: '.',
        }),
        docsRoot,
        results,
        compileOptions,
      });
      expect(issues.some((i) => i.originalTarget.includes('core/README.md'))).toBe(false);
    });
  });

  it('flags disallowed shard links when docsRoot is relative', () => {
    withTmpDir('mdcp-ignore-rel-root-', (work) => {
      withCwd(work, () => {
        const docsRoot = join(work, 'docs');
        mkdirSync(join(docsRoot, 'features'), { recursive: true });
        mkdirSync(join(docsRoot, 'client-cli'), { recursive: true });
        const publishOut = join(work, 'packages', 'cli', 'README.md');
        mkdirSync(dirname(publishOut), { recursive: true });
        writeFileSync(join(docsRoot, 'features', 'index.md'), '# Features\n');
        writeFileSync(join(docsRoot, 'features', 'legacy.md'), '# Legacy\n');
        writeFileSync(join(docsRoot, 'client-cli', 'index.md'), '# CLI\n');

        const compileOptions = {
          guidesRoot: 'docs',
          compileOrder: ['features', 'client-cli'],
          docsRoot: 'docs',
          config: {
            outputDir: '.',
            outputFile: 'guides.md',
            compileOrder: ['features', 'client-cli'],
          },
          guides: [
            { name: 'features' },
            {
              name: 'client-cli',
              compile: { outputFile: '../../packages/cli/README.md' },
            },
          ],
        };

        const results = [
          {
            name: 'client-cli',
            text: '[Legacy](../../docs/features/legacy.md)\n',
            outputFile: '../../packages/cli/README.md',
            publishOnly: true,
            includeBanner: false,
          },
        ];
        const issues = lintLinks({
          config: MdcpConfigSchema.parse({
            compileOrder: ['features', 'client-cli'],
            outputDir: '.',
            outputFile: 'guides.md',
            guides: [
              { name: 'features' },
              { name: 'client-cli', compile: { outputFile: '../../packages/cli/README.md' } },
            ],
          }),
          docsRoot: 'docs',
          results,
          compileOptions,
        });
        expect(issues.some((i) => i.kind === 'missing publish path')).toBe(true);
      });
    });
  });
});

describe('collectShardProvenance', () => {
  it('collects original targets from shard', () => {
    withTmpDir('mdcp-prov-', (work) => {
      const f = join(work, 'a.md');
      writeFileSync(f, '[L](../b.md)\n');
      const p = collectShardProvenance(f);
      expect(p[0].originalTarget).toBe('../b.md');
    });
  });
});
