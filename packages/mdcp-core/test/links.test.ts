/**
 * Built-in link validation — tests driven by docs/features/link-validation.md.
 */
import { describe, it, expect } from 'vitest';
import { mkdirSync, writeFileSync, readFileSync } from 'node:fs';
import { basename, dirname, join, relative } from 'node:path';
import { extractLinks } from '../src/links/extract.js';
import { markBrokenLinks, formatBrokenLinkMarker } from '../src/links/mark-broken.js';
import { validateCompiledLinkTarget } from '../src/links/validate.js';
import { lintShardLinks, collectShardProvenance } from '../src/links/validate-shards.js';
import { lintCompiledLinks } from '../src/links/validate-compiled.js';
import { lintLinks, formatLinkIssue } from '../src/links/lint.js';
import { buildSlugRegistry } from '../src/refs/slugs.js';
import {
  compileGuideResults,
  compileGuidesFromResults,
  monolithGuideFirstLines,
  writeCompiledGuidesFromResults,
} from '../src/compile/assemble.js';
import { resolveOutputPath } from '../src/config/load.js';
import { createShardCache, loadShardSnapshot } from '../src/compile/shard-cache.js';
import { MdcpConfigSchema } from '../src/config/schema.js';
import { registerCompileHook } from '../src/compile/hooks.js';
import { enUS } from '../src/locale/index.js';
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

  const provenanceOf = (label: string, originalTarget: string, sourceLine: number) => ({
    label,
    originalTarget,
    sourceFile: '/docs/b/use.md',
    sourceLine,
  });
  const markerOf = (label: string, originalTarget: string, brokenTarget: string) =>
    `**BROKEN LINK:** "${label}" (\`${originalTarget}\`) → \`${brokenTarget}\` (dead anchor in compiled guide)`;

  // Provenance lists every link of the stitched shards in order, broken or not.
  it('takes the provenance of the link at the same place among the links with its label', () => {
    const md = 'See [here](c.md#x).\n\nAlso [here](#nope).\n';
    const { markdown, issues } = markBrokenLinks(md, {
      provenance: [provenanceOf('here', '../c/topic.md#x', 3), provenanceOf('here', '#nope', 5)],
    });
    expect(markdown).toBe(`See [here](c.md#x).\n\nAlso ${markerOf('here', '#nope', '#nope')}.\n`);
    expect(issues).toMatchObject([{ line: 3, originalTarget: '#nope', shardLine: 5 }]);
  });

  it('marks each of two links with the same text with its own provenance', () => {
    const md = 'First [x](#nope).\n\nThen [x](#nope).\n';
    const { markdown, issues } = markBrokenLinks(md, {
      provenance: [provenanceOf('x', '../a/setup.md#nope', 3), provenanceOf('x', '#nope', 5)],
    });
    expect(markdown).toBe(
      `First ${markerOf('x', '../a/setup.md#nope', '#nope')}.\n\nThen ${markerOf('x', '#nope', '#nope')}.\n`,
    );
    expect(issues.map((i) => [i.line, i.originalTarget, i.shardLine])).toEqual(
      expect.arrayContaining([
        [1, '../a/setup.md#nope', 3],
        [3, '#nope', 5],
      ]),
    );
  });

  it('marks a broken link where it is, not where its text first appears', () => {
    const md = 'Write `[x](#nope)` for a link.\n\nSee [x](#nope).\n';
    const { markdown, issues } = markBrokenLinks(md);
    expect(markdown).toBe(
      `Write \`[x](#nope)\` for a link.\n\nSee ${markerOf('x', '#nope', '#nope')}.\n`,
    );
    expect(issues.map((i) => i.line)).toEqual([3]);
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

  // The issues markBrokenLinks returns record their shard. Link lint reports a marked link by its
  // marker line instead, which records none.
  it('names the guide, and the shard of an issue that markBrokenLinks returns', () => {
    const shard = (originalTarget: string, sourceLine: number) => ({
      label: 'x',
      originalTarget,
      sourceFile: '/repo/docs/a/intro.md',
      sourceLine,
    });
    const { issues } = markBrokenLinks(
      '# Guide A\n\nFirst see [x](b.md#nope).\n\nThen see [x](#nope).\n',
      {
        compiledOutputPath: '/repo/docs/_build/a.md',
        guideName: 'a',
        provenance: [shard('../b/topic.md#nope', 3), shard('#nope', 5)],
      },
    );
    const first = 'link: /repo/docs/_build/a.md:5: dead anchor "#nope" (compiled guide "a")';
    expect(issues.map((i) => formatLinkIssue(i))).toEqual([
      `${first}\n  → shard: /repo/docs/a/intro.md:5 → #nope`,
    ]);
    expect(formatLinkIssue({ ...issues[0], shardFile: undefined })).toBe(first);
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

  /**
   * Guides a and b in the monolith, where b's use.md holds `useBody` and a's setup.md holds
   * `setupBody`. The docs root also holds a package.json for `../` paths to point at.
   */
  function lintMonolithPair(
    work: string,
    useBody: string,
    { outputFile = 'guides.md', setupBody = 'Text.' } = {},
  ) {
    const docsRoot = join(work, 'docs');
    mkdirSync(join(docsRoot, 'a'), { recursive: true });
    mkdirSync(join(docsRoot, 'b'), { recursive: true });
    writeFileSync(join(docsRoot, 'package.json'), '{}\n');
    writeFileSync(join(docsRoot, 'a', 'index.md'), '# Guide A\n\n- [Setup](./setup.md)\n');
    writeFileSync(join(docsRoot, 'a', 'setup.md'), `# Setup\n\n${setupBody}\n`);
    writeFileSync(join(docsRoot, 'b', 'index.md'), '# Guide B\n\n- [Use](./use.md)\n');
    writeFileSync(join(docsRoot, 'b', 'use.md'), `# Use\n\n${useBody}\n`);

    const configInput = { outputFile, compileOrder: ['a', 'b'] };
    const compileOptions = {
      guidesRoot: docsRoot,
      compileOrder: configInput.compileOrder,
      docsRoot,
      banner: '<!-- generated -->\n\n',
      config: configInput,
    };
    const results = compileGuideResults(compileOptions);
    const issues = lintLinks({
      config: MdcpConfigSchema.parse(configInput),
      docsRoot,
      results,
      compileOptions,
    });
    return {
      docsRoot,
      issues,
      results,
      monolith: compileGuidesFromResults(results, compileOptions),
    };
  }

  it('reports a BROKEN LINK marker that only the monolith holds', () => {
    withTmpDir('mdcp-lint-monolith-marker-', (work) => {
      // b.md links a.md#nope, which lint checks. The monolith links #nope, which compile marks.
      const { docsRoot, issues, monolith } = lintMonolithPair(
        work,
        'Skip [the rest](../a/setup.md#nope).',
      );
      expect(issues.map((i) => `${relative(docsRoot, i.file)} ${i.kind} ${i.guideName}`)).toEqual([
        '_build/b.md dead anchor b',
        '_build/guides.md dead anchor b',
      ]);
      // The line counts the banner, as the written monolith does.
      const marker = issues[1];
      expect(monolith.split('\n')[marker.line - 1]).toBe(marker.brokenTarget);
      expect(marker.brokenTarget).toBe(
        'Skip **BROKEN LINK:** "the rest" (`../a/setup.md#nope`) → `#nope` (dead anchor in compiled guide).',
      );
    });
  });

  // The marker reads the same in both files. The rest of its line can differ, because each file
  // rebases paths and cross-guide links relative to itself.
  it.each([
    ['nothing else on the line', 'guides.md', 'Skip ', 'Skip ', 'Skip '],
    [
      'a link to another guide',
      'guides.md',
      'See [setup](../a/setup.md) and skip ',
      'See [setup](a.md#setup) and skip ',
      'See [setup](#setup) and skip ',
    ],
    [
      'a ../ path and the monolith in sub/',
      'sub/guides.md',
      'See [pkg](../package.json) and skip ',
      'See [pkg](../package.json) and skip ',
      'See [pkg](../../package.json) and skip ',
    ],
  ])(
    'reports a marker that a compiled guide and the monolith both hold once, with %s',
    (_case, outputFile, lead, guideLead, monolithLead) => {
      withTmpDir('mdcp-lint-monolith-marker-once-', (work) => {
        const { docsRoot, issues, results, monolith } = lintMonolithPair(
          work,
          `${lead}[the rest](#nope).`,
          { outputFile },
        );
        const marked =
          '**BROKEN LINK:** "the rest" (`#nope`) → `#nope` (dead anchor in compiled guide).';
        expect(results[1].text.split('\n')).toContain(`${guideLead}${marked}`);
        expect(monolith.split('\n')).toContain(`${monolithLead}${marked}`);
        expect(issues.map((i) => `${relative(docsRoot, i.file)} ${i.kind} ${i.guideName}`)).toEqual(
          ['_build/b.md dead anchor b'],
        );
      });
    },
  );

  // A locale pack may leave out findMarkers. Link lint then matches a marker line in the monolith
  // to a line of the same text in the guide's compiled guide, so a marker on lines that differ
  // elsewhere is reported for both files.
  it.each([
    [
      'only the monolith holds',
      'Skip [the rest](../a/setup.md#nope).',
      ['_build/b.md dead anchor b', '_build/guides.md dead anchor b'],
    ],
    ['both files hold on the same line', 'Skip [the rest](#nope).', ['_build/b.md dead anchor b']],
    [
      'both files hold on lines that differ elsewhere',
      'See [setup](../a/setup.md) and skip [the rest](#nope).',
      ['_build/b.md dead anchor b', '_build/guides.md dead anchor b'],
    ],
  ])(
    'matches whole lines for a marker that %s when the locale pack has no findMarkers',
    (_case, useBody, expected) => {
      const brokenLinks = enUS.brokenLinks;
      const findMarkers = brokenLinks.findMarkers;
      delete brokenLinks.findMarkers;
      try {
        withTmpDir('mdcp-lint-monolith-marker-whole-line-', (work) => {
          const { docsRoot, issues } = lintMonolithPair(work, useBody);
          expect(
            issues.map((i) => `${relative(docsRoot, i.file)} ${i.kind} ${i.guideName}`),
          ).toEqual(expected);
        });
      } finally {
        brokenLinks.findMarkers = findMarkers;
      }
    },
  );

  // Both guides hold the line. The guide that owns the target marks it in its compiled guide and
  // in its copy in the monolith. The other guide's compiled guide links the owner's compiled guide,
  // which lint checks, and only its copy in the monolith marks it. So the monolith holds the same
  // marker twice, on the same text, and lint reports the copy whose compiled guide has no marker.
  it.each([
    ['a', '../a/setup.md#nope', 'second'],
    ['b', '../b/use.md#nope', 'first'],
  ])(
    "matches each monolith copy's markers against its own guide's compiled guide (%s owns the target)",
    (_owner, target, reportedCopy) => {
      withTmpDir('mdcp-lint-monolith-marker-per-guide-', (work) => {
        const line = `Skip [the rest](${target}).`;
        const { docsRoot, issues, monolith } = lintMonolithPair(work, line, { setupBody: line });
        expect(issues.map((i) => `${relative(docsRoot, i.file)} ${i.kind} ${i.guideName}`)).toEqual(
          [
            '_build/a.md dead anchor a',
            '_build/b.md dead anchor b',
            // The guide whose copy holds the reported line.
            `_build/guides.md dead anchor ${reportedCopy === 'first' ? 'a' : 'b'}`,
          ],
        );
        const lines = monolith.split('\n');
        const marked = `Skip **BROKEN LINK:** "the rest" (\`${target}\`) → \`#nope\` (dead anchor in compiled guide).`;
        const first = lines.indexOf(marked) + 1;
        const second = lines.lastIndexOf(marked) + 1;
        expect(first).toBeGreaterThan(0);
        expect(first).toBeLessThan(second);
        expect(issues[2].line).toBe(reportedCopy === 'first' ? first : second);
      });
    },
  );

  // Both links have the same label. b.md links a.md#nope for the first, which lint checks, and
  // marks the second. The monolith marks both. Each marker names the target its own link was
  // written with, so only the first link's marker is missing from b.md.
  it('reports the monolith marker of the link that only the monolith marks, among links with one label', () => {
    withTmpDir('mdcp-lint-monolith-marker-same-label-', (work) => {
      const { docsRoot, issues, results, monolith } = lintMonolithPair(
        work,
        'First see [x](../a/setup.md#nope).\n\nThen see [x](#nope).',
      );
      const marker = (target: string) =>
        `**BROKEN LINK:** "x" (\`${target}\`) → \`#nope\` (dead anchor in compiled guide).`;
      expect(results[1].text).toContain(`First see [x](a.md#nope).\n\nThen see ${marker('#nope')}`);
      expect(monolith).toContain(
        `First see ${marker('../a/setup.md#nope')}\n\nThen see ${marker('#nope')}`,
      );
      expect(issues.map((i) => `${relative(docsRoot, i.file)} ${i.kind}`)).toEqual([
        '_build/b.md dead anchor',
        '_build/b.md dead anchor',
        '_build/guides.md dead anchor',
      ]);
      expect(monolith.split('\n')[issues[2].line - 1]).toBe(
        `First see ${marker('../a/setup.md#nope')}`,
      );
    });
  });

  /** Guides named `names` in the monolith, each stitching one topic.md with `topicBody(name)`. */
  function compileMonolithGuides(
    work: string,
    names: string[],
    topicBody: (name: string) => string,
    configExtra: Record<string, unknown> = {},
  ) {
    const docsRoot = join(work, 'docs');
    for (const name of names) {
      mkdirSync(join(docsRoot, name), { recursive: true });
      const title = `Guide ${name.toUpperCase()}`;
      writeFileSync(join(docsRoot, name, 'index.md'), `# ${title}\n\n- [Topic](./topic.md)\n`);
      writeFileSync(join(docsRoot, name, 'topic.md'), `# Topic\n\n${topicBody(name)}\n`);
    }
    const configInput = { outputFile: 'guides.md', compileOrder: names, ...configExtra };
    const compileOptions = {
      guidesRoot: docsRoot,
      compileOrder: names,
      docsRoot,
      banner: '<!-- generated -->\n\n',
      config: configInput,
    };
    const results = compileGuideResults(compileOptions);
    const issues = lintLinks({
      config: MdcpConfigSchema.parse(configInput),
      docsRoot,
      results,
      compileOptions,
    });
    const monolith = compileGuidesFromResults(results, compileOptions);
    return { docsRoot, results, issues, monolith, compileOptions };
  }

  // Every copy after the first is demoted, and demoting adds a blank line at the end of a copy.
  it('gives the line of the monolith on which each copy starts, for every copy', () => {
    withTmpDir('mdcp-monolith-first-lines-', (work) => {
      const names = ['a', 'b', 'c', 'd'];
      const { results, monolith, compileOptions } = compileMonolithGuides(
        work,
        names,
        () => 'Text.',
      );
      const lines = monolith.split('\n');
      const copies = monolithGuideFirstLines(results, compileOptions);
      expect(copies.map((c) => c.name)).toEqual(names);
      expect(copies.map((c) => lines[c.firstLine - 1])).toEqual([
        '# Guide A',
        '## Guide B',
        '## Guide C',
        '## Guide D',
      ]);
    });
  });

  // Without source tags, a copy's text ends on its last paragraph. Guide d's marker is on that
  // line, which belongs to d's copy, not to the copy of e after it.
  it("matches a marker on a copy's last line against that copy's guide", () => {
    withTmpDir('mdcp-lint-monolith-marker-last-line-', (work) => {
      const { docsRoot, issues, monolith } = compileMonolithGuides(
        work,
        ['a', 'b', 'c', 'd', 'e'],
        (name) => (name === 'd' ? 'Skip [x](#nope).' : 'Text.'),
        { sourceTags: false },
      );
      expect(monolith).toContain('Skip **BROKEN LINK:** "x"');
      expect(issues.map((i) => `${relative(docsRoot, i.file)} ${i.kind} ${i.guideName}`)).toEqual([
        '_build/d.md dead anchor d',
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

describe('lintLinks over each written file', () => {
  const BANNER = '<!-- generated -->\n\n';

  /**
   * Write `files` under `<work>/docs`, compile them with `configInput` and a two-line banner unless
   * `configInput` sets another, write the outputs, and lint them. `summary` lists each issue as `file kind target guide`. Lint gets
   * the compile options unless `passCompileOptions` is false.
   */
  function lintWritten(
    work: string,
    files: Record<string, string>,
    configInput: Record<string, unknown> & { compileOrder: string[] },
    { passCompileOptions = true } = {},
  ) {
    const docsRoot = join(work, 'docs');
    for (const [rel, text] of Object.entries(files)) {
      mkdirSync(dirname(join(docsRoot, rel)), { recursive: true });
      writeFileSync(join(docsRoot, rel), text);
    }
    const config = MdcpConfigSchema.parse({ banner: BANNER, ...configInput });
    const compileOptions = {
      guidesRoot: docsRoot,
      compileOrder: config.compileOrder,
      banner: config.banner,
      guides: config.guides,
      docsRoot,
      config,
    };
    const results = compileGuideResults(compileOptions);
    writeCompiledGuidesFromResults(results, compileOptions, resolveOutputPath(config, docsRoot));
    const issues = lintLinks({
      config,
      docsRoot,
      results,
      ...(passCompileOptions ? { compileOptions } : {}),
    });
    const summary = issues.map(
      (i) => `${relative(docsRoot, i.file)} ${i.kind} ${i.brokenTarget} ${i.guideName}`,
    );
    const textOf = (rel: string) => readFileSync(join(docsRoot, rel), 'utf-8');
    return { docsRoot, results, issues, summary, textOf, compileOptions };
  }

  /** The line of the written file that an issue names. */
  function lineOf(issue: { file: string; line: number }): string {
    return readFileSync(issue.file, 'utf-8').split('\n')[issue.line - 1] ?? '';
  }

  const monolithPair = (introBody: string): Record<string, string> => ({
    'a/index.md': '# Guide A\n\n- [Intro](./intro.md)\n',
    'a/intro.md': `# Intro\n\n${introBody}\n`,
    'b/index.md': '# Guide B\n\n- [Topic](./topic.md)\n',
    'b/topic.md': '# Topic B\n\nBody.\n',
    'notes.md': '# Notes\n\nText.\n',
  });

  const unmarkedA = { name: 'a', compile: { links: { markBroken: false } } };

  it("checks a compiled guide's #fragment against that file, not another guide's", () => {
    withTmpDir('mdcp-lint-own-slugs-', (work) => {
      const { summary, issues, textOf } = lintWritten(
        work,
        monolithPair('See [Topic](#topic-b).'),
        { outputFile: 'guides.md', compileOrder: ['a', 'b'], guides: [unmarkedA] },
      );
      // Only guide b's compiled guide has the heading. The monolith has it too, so the monolith
      // copy of the link is valid there.
      expect(textOf('_build/guides.md')).toContain('See [Topic](#topic-b).');
      expect(summary).toEqual(['_build/a.md dead anchor #topic-b a']);
      expect(lineOf(issues[0])).toBe('See [Topic](#topic-b).');
    });
  });

  // b/side.md is in guide b's directory, and b doesn't stitch it. So b.md has no section for it,
  // and a link there to its slug is a dead anchor, wherever another guide stitches the shard.
  const throughScopeRoot = { 'a/intro.md': '# Intro\n\nSee [s](../b/side.md).\n' };
  const scopedA = { name: 'a', compile: { scopeRoot: '.' } };
  it.each([
    [
      'another guide stitches the shard through its scope root',
      throughScopeRoot,
      { guides: [scopedA] },
      // a.md links b's compiled guide too, which doesn't stitch the shard.
      ['_build/a.md dead anchor b.md#side-notes a', '_build/b.md dead anchor #side-notes b'],
    ],
    [
      'another guide in the monolith stitches the shard',
      throughScopeRoot,
      // The monolith stitches the shard in a's copy, so b's link is valid there.
      { outputFile: 'guides.md', guides: [scopedA] },
      ['_build/b.md dead anchor #side-notes b'],
    ],
    ['no guide stitches the shard', {}, { guides: [] }, ['_build/b.md dead anchor #side-notes b']],
    [
      "another guide's manifest lists the shard",
      { 'a/index.md': '# Guide A\n\n- [Intro](./intro.md)\n- [Side](../b/side.md)\n' },
      { guides: [] },
      ['_build/b.md dead anchor #side-notes b'],
    ],
  ])(
    "reports the slug of a shard in the guide's directory that it doesn't stitch when %s",
    (_case, extraFiles, { guides, ...configInput }, expected) => {
      withTmpDir('mdcp-lint-owned-shard-slug-', (work) => {
        const { summary } = lintWritten(
          work,
          {
            'a/index.md': '# Guide A\n\n- [Intro](./intro.md)\n',
            'a/intro.md': '# Intro\n\nHello.\n',
            'b/index.md': '# Guide B\n\n- [Topic](./topic.md)\n',
            'b/topic.md': '# Topic B\n\nSee [side](#side-notes).\n',
            'b/side.md': '# Side notes\n\nBody.\n',
            ...extraFiles,
          },
          {
            ...configInput,
            compileOrder: ['a', 'b'],
            guides: [...guides, { name: 'b', compile: { links: { markBroken: false } } }],
          },
        );
        expect(summary).toEqual(expected);
      });
    },
  );

  it("marks a link to an unstitched shard's slug in a subdirectory of the guide", () => {
    withTmpDir('mdcp-lint-owned-shard-subdir-', (work) => {
      // The orphan scan doesn't look at b/notes/, so only compile and link lint can catch this.
      const { issues, results, textOf } = lintWritten(
        work,
        {
          'a/index.md': '# Guide A\n\n- [Intro](./intro.md)\n',
          'a/intro.md': '# Intro\n\nSee [s](../b/notes/side.md).\n',
          'b/index.md': '# Guide B\n\n- [Topic](./topic.md)\n',
          'b/topic.md': '# Topic B\n\nSee [side](#side-notes).\n',
          'b/notes/side.md': '# Side notes\n\nBody.\n',
        },
        { outputFile: 'guides.md', compileOrder: ['a', 'b'], guides: [scopedA] },
      );
      const b = results[1];
      expect(b.knownSlugs).not.toContain('side-notes');
      expect(b.text).toContain('**BROKEN LINK:** "side"');
      // The monolith stitches the shard in a's copy, so b's link stays a link there.
      expect(textOf('_build/guides.md')).toContain('See [side](#side-notes).');
      expect(issues.map((i) => `${relative(join(work, 'docs'), i.file)} ${i.guideName}`)).toEqual([
        '_build/b.md b',
      ]);
      expect(lineOf(issues[0])).toContain('**BROKEN LINK:** "side"');
    });
  });

  it.each([false, true])(
    'numbers the lines of a compiled guide as the written file (includeBanner %s)',
    (includeBanner) => {
      withTmpDir('mdcp-lint-banner-lines-', (work) => {
        const { issues, textOf } = lintWritten(
          work,
          { 'g/index.md': '# G\n\n- [S](./s.md)\n', 'g/s.md': '# S\n\n[bad](#nope)\n' },
          {
            compileOrder: ['g'],
            guides: [{ name: 'g', compile: { includeBanner, links: { markBroken: false } } }],
          },
        );
        expect(textOf('_build/guide.md').startsWith(BANNER)).toBe(includeBanner);
        expect(issues).toHaveLength(1);
        expect(lineOf(issues[0])).toBe('[bad](#nope)');
      });
    },
  );

  // Compile ends a banner that lacks a trailing newline with one, in each compiled guide and in the
  // monolith. The lead heading keeps its own line and its anchor, and the lines of each copy in the
  // monolith count the added newline.
  it('adds a newline to a banner without one, so the lead heading keeps its line', () => {
    withTmpDir('mdcp-lint-banner-no-newline-', (work) => {
      const { summary, issues, textOf } = lintWritten(
        work,
        monolithPair(
          'Back to [top](#guide-a).\n\nFirst see [x](../b/topic.md#nope).\n\nThen see [x](#nope).',
        ),
        {
          banner: '<!-- generated -->',
          outputFile: 'guides.md',
          compileOrder: ['a', 'b'],
          guides: [unmarkedA],
        },
      );
      for (const file of ['_build/a.md', '_build/b.md', '_build/guides.md']) {
        expect(textOf(file).split('\n')[0]).toBe('<!-- generated -->');
      }
      expect(textOf('_build/a.md').split('\n')[1]).toBe('# Guide A');
      expect(textOf('_build/guides.md').split('\n')[1]).toBe('# Guide A');
      expect(summary).toEqual([
        '_build/a.md dead anchor b.md#nope a',
        '_build/a.md dead anchor #nope a',
        '_build/guides.md dead anchor #nope a',
      ]);
      expect(issues.map(lineOf)).toEqual([
        'First see [x](b.md#nope).',
        'Then see [x](#nope).',
        'First see [x](#nope).',
      ]);
    });
  });

  it('passes a link to the title after a banner without a trailing newline when the first section takes its slug', () => {
    withTmpDir('mdcp-lint-banner-no-newline-title-', (work) => {
      // compile.title repeats the first shard's heading, so assembly drops that heading and the
      // section takes the title's slug.
      const { results, summary, textOf } = lintWritten(
        work,
        {
          'a/index.md': '# Guide A\n\n- [Intro](./intro.md)\n- [More](./more.md)\n',
          'a/intro.md': '# Intro\n\nBody.\n',
          'a/more.md': '# More\n\nBack to [top](#intro).\n',
          'b/index.md': '# Guide B\n\n- [Topic](./topic.md)\n',
          'b/topic.md': '# Topic B\n\nBody.\n',
        },
        {
          banner: '<!-- generated -->',
          compileOrder: ['a', 'b'],
          guides: [{ name: 'a', compile: { title: 'Intro' } }],
        },
      );
      expect(textOf('_build/a.md').split('\n').slice(0, 2)).toEqual([
        '<!-- generated -->',
        '## Intro',
      ]);
      expect(results[0].text).toContain('Back to [top](#intro).');
      // The title heading in the written file has the slug the link names.
      const writtenSlugs = buildSlugRegistry(textOf('_build/a.md')).headings.map((h) => h.slug);
      expect(writtenSlugs).toContain('intro');
      expect(summary).toEqual([]);
    });
  });

  // A later heading repeats the title, so compile numbers its section installation-1. The written
  // file keeps the title heading, so that heading has the slug installation-1 too.
  it('keeps the numbering of a heading that repeats the title after a banner without a trailing newline', () => {
    withTmpDir('mdcp-lint-banner-no-newline-repeat-', (work) => {
      const { summary, textOf } = lintWritten(
        work,
        {
          'a/index.md': '# Installation\n\n- [Intro](./intro.md)\n- [Install](./install.md)\n',
          'a/intro.md': '# Intro\n\nGo to [install](./install.md).\n',
          'a/install.md': '# Installation\n\nSteps.\n',
          'b/index.md': '# Guide B\n\n- [Topic](./topic.md)\n',
          'b/topic.md': '# Topic B\n\nBody.\n',
        },
        { banner: '<!-- generated -->', compileOrder: ['a', 'b'] },
      );
      expect(textOf('_build/a.md')).toContain('Go to [install](#installation-1).');
      const writtenSlugs = buildSlugRegistry(textOf('_build/a.md')).headings.map((h) => h.slug);
      expect(writtenSlugs).toEqual(['installation', 'intro', 'installation-1']);
      expect(summary).toEqual([]);
    });
  });

  it('takes the banner from compileOptions, which may have none, rather than from config', () => {
    withTmpDir('mdcp-lint-no-banner-', (work) => {
      const docsRoot = join(work, 'docs');
      mkdirSync(join(docsRoot, 'g'), { recursive: true });
      writeFileSync(join(docsRoot, 'g', 'index.md'), '# G\n\n- [S](./s.md)\n');
      writeFileSync(join(docsRoot, 'g', 's.md'), '# S\n\n[bad](#nope)\n');
      // The parsed config carries the default banner. The compile run had none.
      const config = MdcpConfigSchema.parse({
        compileOrder: ['g'],
        guides: [{ name: 'g', compile: { links: { markBroken: false } } }],
      });
      const compileOptions = {
        guidesRoot: docsRoot,
        compileOrder: config.compileOrder,
        guides: config.guides,
        docsRoot,
        config,
      };
      const results = compileGuideResults(compileOptions);
      writeCompiledGuidesFromResults(results, compileOptions);
      const issues = lintLinks({ config, docsRoot, results, compileOptions });
      expect(issues).toHaveLength(1);
      expect(lineOf(issues[0])).toBe('[bad](#nope)');
    });
  });

  // Without compileOptions, lintLinks takes the banner from config. The lines then still count it,
  // and the monolith is still linted.
  it.each([
    ['with compileOptions', true],
    ['without compileOptions', false],
  ])('lints the monolith as its own document, %s', (_case, passCompileOptions) => {
    withTmpDir('mdcp-lint-monolith-doc-', (work) => {
      // The link compiles to b.md#nope in a.md and to #nope in the monolith. Neither file has the
      // heading, so each file reports its own copy.
      const { summary, issues, textOf } = lintWritten(
        work,
        monolithPair('See [Topic](../b/topic.md#nope).'),
        { outputFile: 'sub/guides.md', compileOrder: ['a', 'b'], guides: [unmarkedA] },
        { passCompileOptions },
      );
      expect(textOf('_build/sub/guides.md')).toContain('See [Topic](#nope).');
      expect(summary).toEqual([
        '_build/a.md dead anchor b.md#nope a',
        '_build/sub/guides.md dead anchor #nope a',
      ]);
      for (const issue of issues) {
        expect(lineOf(issue)).toBe(`See [Topic](${issue.brokenTarget}).`);
      }
    });
  });

  // Each case compiles to the same target in both files, as written or as the file it resolves to.
  it.each([
    ['a same-document fragment', 'guides.md', '[x](#nope)', 'dead anchor #nope', '(#nope)'],
    [
      'a missing file, with the monolith in sub/',
      'sub/guides.md',
      '[x](./missing.md)',
      'missing publish path ./missing.md',
      '(./missing.md)',
    ],
    [
      'a stale fragment on a file that is no output, with the monolith in sub/',
      'sub/guides.md',
      '[x](../notes.md#nope)',
      'dead anchor ../notes.md#nope',
      '(../../notes.md#nope)',
    ],
  ])(
    'reports a link issue that a compiled guide and the monolith share once, with %s',
    (_case, outputFile, link, reported, monolithTarget) => {
      withTmpDir('mdcp-lint-monolith-dedupe-', (work) => {
        const { summary, textOf } = lintWritten(work, monolithPair(`See ${link}.`), {
          outputFile,
          compileOrder: ['a', 'b'],
          guides: [unmarkedA],
        });
        expect(textOf(`_build/${outputFile}`)).toContain(monolithTarget);
        expect(summary).toEqual([`_build/a.md ${reported} a`]);
      });
    },
  );

  it('matches a monolith link issue to the compiled guide issue with the same label', () => {
    withTmpDir('mdcp-lint-monolith-dedupe-label-', (work) => {
      // Both links compile to #nope in the monolith. Only [two] is #nope in a.md as well.
      const { issues, textOf } = lintWritten(
        work,
        monolithPair('See [one](../b/topic.md#nope) and [two](#nope).'),
        { outputFile: 'guides.md', compileOrder: ['a', 'b'], guides: [unmarkedA] },
      );
      expect(textOf('_build/guides.md')).toContain('See [one](#nope) and [two](#nope).');
      expect(issues.map((i) => `${i.file.split('/').pop()} ${i.label} ${i.brokenTarget}`)).toEqual([
        'a.md one b.md#nope',
        'a.md two #nope',
        'guides.md one #nope',
      ]);
    });
  });

  it('leaves out at most one monolith link issue for each compiled guide issue', () => {
    withTmpDir('mdcp-lint-monolith-dedupe-once-', (work) => {
      // Both links have the same label and compile to #nope in the monolith. a.md reports #nope
      // once, which leaves out one monolith issue. The other is the monolith copy of b.md#nope.
      const { summary, issues, textOf } = lintWritten(
        work,
        monolithPair('See [x](#nope) and [x](../b/topic.md#nope).'),
        { outputFile: 'guides.md', compileOrder: ['a', 'b'], guides: [unmarkedA] },
      );
      expect(textOf('_build/guides.md')).toContain('See [x](#nope) and [x](#nope).');
      expect(summary).toEqual([
        '_build/a.md dead anchor #nope a',
        '_build/a.md dead anchor b.md#nope a',
        '_build/guides.md dead anchor #nope a',
      ]);
      expect(issues.map(lineOf)).toEqual([
        'See [x](#nope) and [x](b.md#nope).',
        'See [x](#nope) and [x](b.md#nope).',
        'See [x](#nope) and [x](#nope).',
      ]);
    });
  });

  it('matches a monolith link issue to the compiled guide issue at the same line of the copy', () => {
    withTmpDir('mdcp-lint-monolith-dedupe-line-', (work) => {
      // Both links have the same label and compile to #nope in the monolith. a.md reports the
      // second link as #nope. The first is b.md#nope there, so its monolith copy is the one left.
      const { summary, issues } = lintWritten(
        work,
        monolithPair('First see [x](../b/topic.md#nope).\n\nThen see [x](#nope).'),
        { outputFile: 'guides.md', compileOrder: ['a', 'b'], guides: [unmarkedA] },
      );
      expect(summary).toEqual([
        '_build/a.md dead anchor b.md#nope a',
        '_build/a.md dead anchor #nope a',
        '_build/guides.md dead anchor #nope a',
      ]);
      expect(issues.map(lineOf)).toEqual([
        'First see [x](b.md#nope).',
        'Then see [x](#nope).',
        'First see [x](#nope).',
      ]);
    });
  });

  // a's intro.md links b's topic.md#nope, and b's topic.md links #nope. Both links are
  // `[x](#nope)` in the monolith, at the same line of each guide's text. Only b.md reports b's
  // link as #nope, so that issue leaves out the monolith issue in b's copy and not the one in a's.
  it('matches a monolith link issue only against the compiled guide of the guide whose copy holds it', () => {
    withTmpDir('mdcp-lint-monolith-dedupe-own-guide-', (work) => {
      const unmarked = { compile: { links: { markBroken: false } } };
      const { docsRoot, issues } = lintWritten(
        work,
        {
          'a/index.md': '# Guide A\n\n- [Intro](./intro.md)\n',
          'a/intro.md': '# Intro\n\nSee [x](../b/topic.md#nope).\n',
          'b/index.md': '# Guide B\n\n- [Topic](./topic.md)\n',
          'b/topic.md': '# Topic B\n\nSee [x](#nope).\n',
        },
        {
          outputFile: 'guides.md',
          compileOrder: ['a', 'b'],
          guides: [
            { name: 'a', ...unmarked },
            { name: 'b', ...unmarked },
          ],
        },
      );
      expect(
        issues.map(
          (i) => `${relative(docsRoot, i.file)}:${i.line} ${i.brokenTarget} ${i.guideName}`,
        ),
      ).toEqual([
        '_build/a.md:9 b.md#nope a',
        '_build/b.md:9 #nope b',
        '_build/guides.md:9 #nope a',
      ]);
      expect(issues.map(lineOf)).toEqual([
        'See [x](b.md#nope).',
        'See [x](#nope).',
        'See [x](#nope).',
      ]);
    });
  });

  // Guide c's intro.md has two links with one label. c.md links a.md#nope for the first and keeps
  // #nope for the second, and the monolith has #nope for both. Every copy after the first ends
  // with one more blank line in the monolith, so a copy from the third on starts lower than the
  // lines of the copies before it add up to.
  const sameLabelInC = {
    'a/index.md': '# Guide A\n\n- [Setup](./setup.md)\n',
    'a/setup.md': '# Setup\n\nA.\n',
    'b/index.md': '# Guide B\n\n- [Topic](./topic.md)\n',
    'b/topic.md': '# Topic\n\nB.\n',
    'c/index.md': '# Guide C\n\n- [Intro](./intro.md)\n',
    'c/intro.md': '# Intro\n\nFirst see [x](../a/setup.md#nope).\n\nThen see [x](#nope).\n',
    'd/index.md': '# Guide D\n\n- [Notes](./notes.md)\n',
    'd/notes.md': '# Notes\n\nD.\n',
  };
  const lateCopies = [
    ['third', ['a', 'b', 'c']],
    ['fourth', ['a', 'b', 'd', 'c']],
  ] as const;

  it.each(lateCopies)(
    'matches a monolith link issue at the same line of the copy of the %s guide',
    (_place, compileOrder) => {
      withTmpDir('mdcp-lint-monolith-dedupe-line-late-', (work) => {
        const { summary, issues } = lintWritten(work, sameLabelInC, {
          outputFile: 'guides.md',
          compileOrder: [...compileOrder],
          guides: [{ name: 'c', compile: { links: { markBroken: false } } }],
        });
        expect(summary).toEqual([
          '_build/c.md dead anchor a.md#nope c',
          '_build/c.md dead anchor #nope c',
          '_build/guides.md dead anchor #nope c',
        ]);
        expect(issues.map(lineOf)).toEqual([
          'First see [x](a.md#nope).',
          'Then see [x](#nope).',
          'First see [x](#nope).',
        ]);
      });
    },
  );

  it.each(lateCopies)(
    'reports the monolith marker of the link that only the monolith marks in the copy of the %s guide',
    (_place, compileOrder) => {
      withTmpDir('mdcp-lint-monolith-marker-late-', (work) => {
        const { docsRoot, issues } = lintWritten(work, sameLabelInC, {
          outputFile: 'guides.md',
          compileOrder: [...compileOrder],
        });
        const marked = (target: string) =>
          `**BROKEN LINK:** "x" (\`${target}\`) → \`#nope\` (dead anchor in compiled guide).`;
        expect(issues.map((i) => `${relative(docsRoot, i.file)} ${i.guideName}`)).toEqual([
          '_build/c.md c',
          '_build/c.md c',
          '_build/guides.md c',
        ]);
        expect(issues.map(lineOf)).toEqual([
          `Then see ${marked('#nope')}`,
          'First see [x](a.md#nope).',
          `First see ${marked('../a/setup.md#nope')}`,
        ]);
      });
    },
  );

  // b/use.md links guide a's setup.md, which only the monolith marks. b/sub/deep.md links b's own
  // a/setup.md, written the same way, which both files mark. The two markers in b's copy read the
  // same, so only their lines tell them apart.
  it('matches a monolith marker to the marker at the same line of the copy first', () => {
    withTmpDir('mdcp-lint-monolith-marker-line-', (work) => {
      const { docsRoot, issues } = lintWritten(
        work,
        {
          'a/index.md': '# Guide A\n\n- [Setup](./setup.md)\n',
          'a/setup.md': '# Setup\n\nA.\n',
          'b/index.md':
            '# Guide B\n\n- [Use](./use.md)\n- [Local setup](./a/setup.md)\n- [Deep](./sub/deep.md)\n',
          'b/use.md': '# Use\n\nFirst see [x](../a/setup.md#nope).\n',
          'b/a/setup.md': '# Local setup\n\nB.\n',
          'b/sub/deep.md': '# Deep\n\nThen see [x](../a/setup.md#nope).\n',
        },
        { outputFile: 'guides.md', compileOrder: ['a', 'b'] },
      );
      const marked = `**BROKEN LINK:** "x" (\`../a/setup.md#nope\`) → \`#nope\` (dead anchor in compiled guide).`;
      expect(issues.map((i) => `${relative(docsRoot, i.file)} ${i.guideName}`)).toEqual([
        '_build/b.md b',
        '_build/b.md b',
        '_build/guides.md b',
      ]);
      expect(issues.map(lineOf)).toEqual([
        `Then see ${marked}`,
        'First see [x](a.md#nope).',
        `First see ${marked}`,
      ]);
    });
  });

  // A custom hook adds two lines to the monolith copy only, so the link sits two lines lower in
  // the copy than in a.md. It is still the same link, so only a.md reports it, as a link issue or
  // as the line of its marker.
  it.each([
    ['link issue', false, '#nope'],
    [
      'marker',
      true,
      'See **BROKEN LINK:** "x" (`#nope`) → `#nope` (dead anchor in compiled guide).',
    ],
  ])(
    'matches a monolith %s on another line of the copy when none is on its line',
    (_case, markBroken, reported) => {
      withTmpDir('mdcp-lint-monolith-dedupe-shifted-', (work) => {
        registerCompileHook('shiftMonolithCopyForTest', (ctx) =>
          basename(ctx.outputFile ?? '') === 'guides.md' ? `Added line.\n\n${ctx.body}` : ctx.body,
        );
        const { summary, textOf } = lintWritten(work, monolithPair('See [x](#nope).'), {
          outputFile: 'guides.md',
          compileOrder: ['a', 'b'],
          guides: [
            {
              name: 'a',
              compile: { hooks: ['shiftMonolithCopyForTest'], links: { markBroken } },
            },
          ],
        });
        expect(textOf('_build/guides.md')).toContain('Added line.');
        expect(textOf('_build/a.md')).not.toContain('Added line.');
        expect(summary).toEqual([`_build/a.md dead anchor ${reported} a`]);
      });
    },
  );

  // A custom hook swaps the targets of the two links in the monolith copy only. Each a.md issue
  // then has the target of the other link's monolith issue. Each stays with the monolith issue
  // at its own line, which has its label, so both monolith issues are reported.
  it('matches no compiled guide issue on another line when a monolith issue with its label is at its line', () => {
    withTmpDir('mdcp-lint-monolith-dedupe-held-', (work) => {
      registerCompileHook('swapMonolithTargetsForTest', (ctx) =>
        basename(ctx.outputFile ?? '') === 'guides.md'
          ? ctx.body
              .replace('(#one)', '(#swap)')
              .replace('(#two)', '(#one)')
              .replace('(#swap)', '(#two)')
          : ctx.body,
      );
      const { summary, issues } = lintWritten(
        work,
        monolithPair('First see [x](#one).\n\nThen see [x](#two).'),
        {
          outputFile: 'guides.md',
          compileOrder: ['a', 'b'],
          guides: [
            {
              name: 'a',
              compile: { hooks: ['swapMonolithTargetsForTest'], links: { markBroken: false } },
            },
          ],
        },
      );
      expect(summary).toEqual([
        '_build/a.md dead anchor #one a',
        '_build/a.md dead anchor #two a',
        '_build/guides.md dead anchor #two a',
        '_build/guides.md dead anchor #one a',
      ]);
      expect(issues.map(lineOf)).toEqual([
        'First see [x](#one).',
        'Then see [x](#two).',
        'First see [x](#two).',
        'Then see [x](#one).',
      ]);
    });
  });

  // Guide a stitches b's topic.md through its scope root and ignores guide b. a.md links the
  // first link's section as #nope, while the monolith in sub/ keeps the path. The second link
  // goes to c.md#nope in a.md and to #nope in the monolith. The a.md issue for #nope is the first
  // link's, so the monolith issue of the second link is still reported.
  it("reports a monolith issue whose target only another link's compiled guide issue has", () => {
    withTmpDir('mdcp-lint-monolith-dedupe-held-ignored-', (work) => {
      const { docsRoot, issues } = lintWritten(
        work,
        {
          'a/index.md': '# Guide A\n\n- [Intro](./intro.md)\n',
          'a/intro.md':
            '# Intro\n\nFirst see [x](../b/topic.md#nope).\n\nThen see [x](../c/start.md#nope).\n',
          'b/index.md': '# Guide B\n\n- [Topic](./topic.md)\n',
          'b/topic.md': '# Topic B\n\nBody.\n',
          'c/index.md': '# Guide C\n\n- [Start](./start.md)\n',
          'c/start.md': '# Start\n\nBody.\n',
        },
        {
          outputFile: 'sub/guides.md',
          compileOrder: ['a', 'b', 'c'],
          guides: [
            {
              name: 'a',
              compile: {
                scopeRoot: '.',
                links: { markBroken: false },
                crossGuideLinks: { ignoreGuides: ['b'] },
              },
            },
          ],
        },
      );
      expect(
        issues.map(
          (i) => `${relative(docsRoot, i.file)}:${i.line} ${i.brokenTarget} ${i.guideName}`,
        ),
      ).toEqual([
        '_build/a.md:9 #nope a',
        '_build/a.md:11 c.md#nope a',
        '_build/sub/guides.md:9 ../../b/topic.md#nope a',
        '_build/sub/guides.md:11 #nope a',
      ]);
      expect(issues.map(lineOf)).toEqual([
        'First see [x](#nope).',
        'Then see [x](c.md#nope).',
        'First see [x](../../b/topic.md#nope).',
        'Then see [x](#nope).',
      ]);
    });
  });

  it('reports a monolith link issue of another kind than the compiled guide issue', () => {
    withTmpDir('mdcp-lint-monolith-dedupe-kind-', (work) => {
      // ./b.md names no shard, so neither file rebases it. From _build/ it is guide b's compiled
      // guide, which has no #nope heading. From _build/sub/ it names no file.
      const { summary, textOf } = lintWritten(work, monolithPair('See [x](./b.md#nope).'), {
        outputFile: 'sub/guides.md',
        compileOrder: ['a', 'b'],
        guides: [unmarkedA],
      });
      expect(textOf('_build/a.md')).toContain('See [x](./b.md#nope).');
      expect(textOf('_build/sub/guides.md')).toContain('See [x](./b.md#nope).');
      expect(summary).toEqual([
        '_build/a.md dead anchor ./b.md#nope a',
        '_build/sub/guides.md missing publish path ./b.md#nope a',
      ]);
    });
  });

  // Compile marks the #nope link and keeps the link to b.md, whose #gone no heading there has.
  // Link lint reports the line once, by its marker, and doesn't check the other link on it.
  it('reports a line that holds a BROKEN LINK marker once and skips its other links', () => {
    withTmpDir('mdcp-lint-marker-line-links-', (work) => {
      const { issues, textOf } = lintWritten(
        work,
        monolithPair('See [x](#nope) and [y](../b/topic.md#gone).'),
        { compileOrder: ['a', 'b'] },
      );
      const line =
        'See **BROKEN LINK:** "x" (`#nope`) → `#nope` (dead anchor in compiled guide) and [y](b.md#gone).';
      expect(textOf('_build/a.md')).toContain(`\n${line}\n`);
      expect(issues.map((i) => `${i.file.split('/').pop()} ${i.kind} ${i.guideName}`)).toEqual([
        'a.md dead anchor a',
      ]);
      expect(issues.map(lineOf)).toEqual([line]);
    });
  });

  // Guide b has no lead heading and no source tags, so the link is the first line of its copy in
  // the monolith. That line belongs to b's copy, not to a's copy before it.
  it.each([false, true])(
    "matches an issue on a copy's first line to that copy's guide (markBroken %s)",
    (markBroken) => {
      withTmpDir('mdcp-lint-monolith-copy-first-line-', (work) => {
        const { docsRoot, results, issues, compileOptions, textOf } = lintWritten(
          work,
          {
            'a/index.md': '# Guide A\n\n- [Intro](./intro.md)\n',
            'a/intro.md': '# Intro\n\nHello.\n',
            'b/index.md': '- [Topic](./topic.md)\n',
            'b/topic.md': 'See [x](#nope).\n\nMore.\n',
          },
          {
            outputFile: 'guides.md',
            compileOrder: ['a', 'b'],
            guides: [{ name: 'b', compile: { sourceTags: false, links: { markBroken } } }],
          },
        );
        const copyOfB = monolithGuideFirstLines(results, compileOptions)[1];
        expect(copyOfB.name).toBe('b');
        expect(textOf('_build/guides.md').split('\n')[copyOfB.firstLine - 1]).toMatch(/^See /);
        expect(issues.map((i) => `${relative(docsRoot, i.file)} ${i.kind} ${i.guideName}`)).toEqual(
          ['_build/b.md dead anchor b'],
        );
      });
    },
  );

  // Compile names the section by its finding id or declared id, but the heading there takes its
  // slug from its text, so no anchor in the target output has that id.
  it.each([
    ['a FIND-* id, from a compiled guide', {}],
    ['a FIND-* id, from publish output', { outputFile: 'glossary.md' }],
  ])('reports a fragment on a link to another output that names %s', (_case, glossaryCompile) => {
    withTmpDir('mdcp-lint-output-find-', (work) => {
      const { results, summary, textOf } = lintWritten(
        work,
        {
          'glossary/index.md': '# Glossary\n\n- [Terms](./terms.md)\n',
          'glossary/terms.md':
            '# Terms\n\nSee [FIND-004](../review/outcomes/FIND-004.md) and [stale](../review/outcomes/FIND-004.md#nope).\n',
          'review/shards.md': '# Architecture review\n\n- [FIND-004](./outcomes/FIND-004.md)\n',
          'review/outcomes/FIND-004.md': '# FIND-004 — Example finding\n\nBody.\n',
        },
        {
          compileOrder: ['glossary', 'architecture-review'],
          guides: [
            { name: 'glossary', path: 'glossary', compile: { scopeRoot: '.', ...glossaryCompile } },
            {
              name: 'architecture-review',
              path: 'review',
              compile: {
                scopeRoot: '.',
                manifest: 'shards.md',
                outputFile: 'architecture-review.md',
              },
            },
          ],
        },
      );
      expect(results[0].text).toContain('(architecture-review.md#find-004)');
      expect(textOf('_build/architecture-review.md')).toContain('## FIND-004 — Example finding\n');
      expect(summary).toEqual([
        '_build/glossary.md dead anchor architecture-review.md#find-004 glossary',
        '_build/glossary.md dead anchor architecture-review.md#nope glossary',
      ]);
    });
  });

  it('reports a fragment on a link to another output that names a declared id', () => {
    withTmpDir('mdcp-lint-output-declared-id-', (work) => {
      const { results, summary, textOf } = lintWritten(
        work,
        {
          'a/index.md': '# Guide A\n\n- [Intro](./intro.md)\n',
          'a/intro.md': '# Intro\n\nSee [setup](../b/setup.md) and [stale](../b/setup.md#nope).\n',
          'b/index.md': '# Guide B\n\n- [Setup](./setup.md)\n',
          'b/setup.md': '# Setup steps {#custom-setup}\n\nText.\n',
        },
        { compileOrder: ['a', 'b'] },
      );
      expect(results[0].text).toContain('(b.md#custom-setup)');
      // Compile strips the marker, so the heading's anchor is setup-steps.
      expect(textOf('_build/b.md')).toContain('## Setup steps\n');
      expect(summary).toEqual([
        '_build/a.md dead anchor b.md#custom-setup a',
        '_build/a.md dead anchor b.md#nope a',
      ]);
    });
  });

  it("checks a fragment on a link to another output against that output's headings", () => {
    withTmpDir('mdcp-lint-output-sections-', (work) => {
      // Guide b owns extra.md by its path but doesn't stitch it. Guide a stitches it through its
      // scope root. Compile links it to b.md#extra-notes, a section that b.md doesn't have.
      const { results, summary } = lintWritten(
        work,
        {
          'a/index.md': '# Guide A\n\n- [Intro](./intro.md)\n',
          'a/intro.md': '# Intro\n\nSee [s](../b/extra.md).\n',
          'b/index.md': '# Guide B\n\n- [Topic](./topic.md)\n',
          'b/topic.md': '# Topic B\n\nBody.\n',
          'b/extra.md': '# Extra notes\n\nBody.\n',
          'c/index.md': '# Guide C\n\n- [Start](./start.md)\n',
          'c/start.md':
            '# Start\n\nSee [extra](../b/extra.md#extra-notes) and [plain](../b/extra.md).\n',
        },
        { compileOrder: ['a', 'b', 'c'], guides: [{ name: 'a', compile: { scopeRoot: '.' } }] },
      );
      const [a, b, c] = results;
      expect(a.text).toContain('## Extra notes');
      expect(b.text).not.toContain('Extra notes');
      expect(c.text).toContain('See [extra](b.md#extra-notes) and [plain](b.md#extra-notes).');
      expect(summary).toEqual([
        '_build/a.md dead anchor b.md#extra-notes a',
        '_build/c.md dead anchor b.md#extra-notes c',
        '_build/c.md dead anchor b.md#extra-notes c',
      ]);
      // b.md has no section for the shard, so marking doesn't accept its slug there either.
      expect(b.knownSlugs).toEqual(['topic-b']);
    });
  });

  it("checks a fragment on a link to the monolith against the monolith's headings", () => {
    withTmpDir('mdcp-lint-monolith-sections-', (work) => {
      // Guide b owns extra.md by its path, and no guide in the monolith stitches it. Publish-only
      // guide p does. Compile links it to guides.md#extra-notes, a section the monolith doesn't have.
      const { results, summary, textOf } = lintWritten(
        work,
        {
          'a/index.md': '# Guide A\n\n- [Intro](./intro.md)\n',
          'a/intro.md': '# Intro\n\nSee [x](../b/extra.md#extra-notes).\n',
          'b/index.md': '# Guide B\n\n- [Topic](./topic.md)\n',
          'b/topic.md': '# Topic B\n\nSee [extra notes](#extra-notes).\n',
          'b/extra.md': '# Extra notes\n\nBody.\n',
          'p/index.md': '# Pub\n\n- [Start](./start.md)\n',
          'p/start.md': '# Start\n\nSee [s](../b/extra.md).\n',
        },
        {
          outputFile: 'guides.md',
          compileOrder: ['a', 'b', 'p'],
          guides: [
            { name: 'a', compile: { links: { markBroken: false } } },
            { name: 'b', compile: { links: { markBroken: false } } },
            { name: 'p', compile: { outputFile: 'p-out.md', scopeRoot: '.' } },
          ],
        },
      );
      expect(results[2].text).toContain('## Extra notes');
      // In the monolith, a's link lands on the monolith itself, so it targets #extra-notes there.
      expect(textOf('_build/guides.md')).toContain('See [x](#extra-notes).');
      // b's own link is the same in b.md and the monolith, so only b.md reports it.
      expect(summary).toEqual([
        '_build/a.md dead anchor guides.md#extra-notes a',
        '_build/b.md dead anchor #extra-notes b',
        '_build/p-out.md dead anchor guides.md#extra-notes p',
        '_build/guides.md dead anchor #extra-notes a',
      ]);
      expect(results[1].knownSlugs).toEqual(['topic-b']);
      expect(results[1].monolithKnownSlugs).toEqual(['intro', 'topic-b']);
    });
  });

  // b/notes/extra.md is titled Setup, and b doesn't stitch it. A link to it takes the slug of its
  // section in the first guide that stitches it, setup. The output the link points into has no
  // section for the shard, but another heading there has that slug, so compile leaves the link
  // and link lint passes it. It points at the other heading.
  const extraSetup = {
    'b/index.md': '# Guide B\n\n- [Topic](./topic.md)\n',
    'b/topic.md': '# Topic\n\nB.\n',
    'b/notes/extra.md': '# Setup\n\nExtra setup steps.\n',
  };
  it.each([
    [
      'the monolith, where an earlier guide has a Setup heading',
      {
        'a/index.md': '# Guide A\n\n- [Setup](./setup.md)\n- [Intro](./intro.md)\n',
        'a/setup.md': '# Setup\n\nInstall A.\n',
        'a/intro.md': '# Intro\n\nSee [extra](../b/notes/extra.md).\n',
        'p/index.md': '# Pub\n\n- [Start](./start.md)\n',
        'p/start.md': '# Start\n\nRead [extra](../b/notes/extra.md).\n',
      },
      {
        outputFile: 'guides.md',
        compileOrder: ['a', 'b', 'p'],
        guides: [{ name: 'p', compile: { outputFile: 'p-out.md', scopeRoot: '.' } }],
      },
      {
        '_build/guides.md': 'See [extra](#setup).',
        '_build/a.md': 'See [extra](guides.md#setup).',
        '_build/p-out.md': 'Read [extra](guides.md#setup).',
      },
      // The monolith's only Setup heading is guide a's. p-out.md holds the shard's section.
      { '_build/guides.md': 1, '_build/p-out.md': 1 },
    ],
    [
      "the owner's compiled guide, which has a Setup heading of its own",
      {
        'a/index.md': '# Guide A\n\n- [Intro](./intro.md)\n',
        'a/intro.md': '# Intro\n\nSee [extra](../b/notes/extra.md).\n',
        'b/index.md': '# Guide B\n\n- [Setup](./setup.md)\n- [Topic](./topic.md)\n',
        'b/setup.md': '# Setup\n\nInstall B.\n',
      },
      { compileOrder: ['a', 'b'], guides: [{ name: 'a', compile: { scopeRoot: '.' } }] },
      { '_build/a.md': 'See [extra](b.md#setup).' },
      // a.md holds the shard's section, and b.md's only Setup heading is b's own.
      { '_build/a.md': 1, '_build/b.md': 1 },
    ],
  ])(
    'passes a link to a shard whose section is missing from %s',
    (_case, files, configInput, links, setupHeadings) => {
      withTmpDir('mdcp-lint-unstitched-slug-collision-', (work) => {
        const { summary, textOf } = lintWritten(work, { ...extraSetup, ...files }, configInput);
        for (const [file, link] of Object.entries(links)) {
          expect(textOf(file)).toContain(`\n${link}\n`);
        }
        for (const [file, count] of Object.entries(setupHeadings)) {
          expect(textOf(file).match(/^#+ Setup$/gm)).toHaveLength(count);
          expect(textOf(file)).not.toContain('BROKEN LINK');
        }
        expect(summary).toEqual([]);
      });
    },
  );

  // a/install.md declares setup as its id, and its heading takes the anchor install. Only p
  // stitches b/notes/extra.md, so a link to it takes p's slug, setup. In the monolith, compile and
  // link lint accept setup as the section slug of a's install.md, so the link stays there and
  // points at no heading. a.md and p-out.md link guides.md#setup, which no heading there has.
  it('passes a link in the monolith to a shard it lacks when a section there declares the slug', () => {
    withTmpDir('mdcp-lint-unstitched-declared-id-', (work) => {
      const { summary, textOf } = lintWritten(
        work,
        {
          ...extraSetup,
          'a/index.md': '# Guide A\n\n- [Install](./install.md)\n- [Intro](./intro.md)\n',
          'a/install.md': '# Install {#setup}\n\nInstall A.\n',
          'a/intro.md': '# Intro\n\nSee [extra](../b/notes/extra.md).\n',
          'p/index.md': '# Pub\n\n- [Start](./start.md)\n',
          'p/start.md': '# Start\n\nRead [extra](../b/notes/extra.md).\n',
        },
        {
          outputFile: 'guides.md',
          compileOrder: ['a', 'b', 'p'],
          guides: [{ name: 'p', compile: { outputFile: 'p-out.md', scopeRoot: '.' } }],
        },
      );
      const monolith = textOf('_build/guides.md');
      expect(monolith).toContain('\nSee [extra](#setup).\n');
      expect(monolith).toContain('\n## Install\n');
      expect(monolith).not.toMatch(/^#+ Setup$/m);
      expect(monolith).not.toContain('BROKEN LINK');
      expect(summary).toEqual([
        '_build/a.md dead anchor guides.md#setup a',
        '_build/p-out.md dead anchor guides.md#setup p',
      ]);
    });
  });

  it('reports a fragment on a link to the monolith that names a section id of its second guide', () => {
    withTmpDir('mdcp-lint-monolith-section-ids-', (work) => {
      // Neither id is a heading slug of the monolith. Each is the slug that b's copy gives its
      // section, which a link inside the monolith may name, but no anchor has it.
      const { results, summary } = lintWritten(
        work,
        {
          'a/index.md': '# Guide A\n\n- [Intro](./intro.md)\n',
          'a/intro.md': '# Intro\n\nHello.\n',
          'b/index.md': '# Guide B\n\n- [FIND-001](./FIND-001.md)\n- [Setup](./setup.md)\n',
          'b/FIND-001.md': '# FIND-001 — First finding\n\nBody.\n',
          'b/setup.md': '# Setup steps {#custom-setup}\n\nBody.\n',
          'p/index.md': '# Pub\n\n- [Start](./start.md)\n',
          'p/start.md':
            '# Start\n\nSee [f](../b/FIND-001.md), [s](../b/setup.md) and [stale](../b/setup.md#nope).\n',
        },
        {
          outputFile: 'guides.md',
          compileOrder: ['a', 'b', 'p'],
          guides: [
            { name: 'p', compile: { outputFile: 'p-out.md', links: { markBroken: false } } },
          ],
        },
      );
      expect(results[2].text).toContain(
        'See [f](guides.md#find-001), [s](guides.md#custom-setup) and [stale](guides.md#nope).',
      );
      expect(summary).toEqual([
        '_build/p-out.md dead anchor guides.md#find-001 p',
        '_build/p-out.md dead anchor guides.md#custom-setup p',
        '_build/p-out.md dead anchor guides.md#nope p',
      ]);
    });
  });

  it('reports a link to a FIND-* shard of another guide in the monolith from the compiled guide only', () => {
    withTmpDir('mdcp-lint-monolith-find-', (work) => {
      const { results, summary, textOf } = lintWritten(
        work,
        {
          'a/index.md': '# Guide A\n\n- [Intro](./intro.md)\n',
          'a/intro.md': '# Intro\n\nSee [the finding](../b/FIND-001.md).\n',
          'b/index.md': '# Guide B\n\n- [FIND-001](./FIND-001.md)\n',
          'b/FIND-001.md': '# FIND-001 — First finding\n\nBody.\n',
        },
        { outputFile: 'guides.md', compileOrder: ['a', 'b'] },
      );
      // In a.md the link goes to another output, whose heading anchor is find-001--first-finding.
      // In the monolith it is in-document, where the finding id is a section slug.
      expect(results[0].text).toContain('See [the finding](b.md#find-001).');
      expect(textOf('_build/guides.md')).toContain('See [the finding](#find-001).');
      expect(summary).toEqual(['_build/a.md dead anchor b.md#find-001 a']);
    });
  });

  it("checks a link in a guide's copy in the monolith against the section slugs there", () => {
    withTmpDir('mdcp-lint-monolith-copy-slugs-', (work) => {
      // Publish-only guide p owns the finding, and b's copy stitches it, so its id is a section
      // slug of the monolith.
      const { summary, textOf } = lintWritten(
        work,
        {
          'p/index.md': '# Pub\n\n- [Start](./start.md)\n',
          'p/start.md': '# Start\n\nSee [f](../shared/FIND-002.md).\n',
          'a/index.md': '# Guide A\n\n- [Intro](./intro.md)\n',
          'a/intro.md': '# Intro\n\nHello.\n',
          'b/index.md': '# Guide B\n\n- [Topic](./topic.md)\n',
          'b/topic.md': '# Topic B\n\nSee [the finding](../shared/FIND-002.md).\n',
          'shared/FIND-002.md': '# FIND-002 — Shared finding\n\nBody.\n',
        },
        {
          outputFile: 'guides.md',
          compileOrder: ['p', 'a', 'b'],
          guides: [
            { name: 'p', compile: { outputFile: 'p-out.md', scopeRoot: '.' } },
            { name: 'b', compile: { scopeRoot: '.' } },
          ],
        },
      );
      expect(textOf('_build/guides.md')).toContain('See [the finding](#find-002).');
      expect(summary).toEqual([]);
    });
  });

  // Inside the monolith, a copy accepts the section slug of any copy there. The guide that owns the
  // finding is p, a publish-only guide, when p comes first in compileOrder, and b otherwise.
  // Neither the owner nor a's markBroken changes what the monolith accepts.
  it.each([
    ['p, a, b', true, ['p', 'a', 'b']],
    ['p, a, b', false, ['p', 'a', 'b']],
    ['a, b, p', true, ['a', 'b', 'p']],
    ['a, b, p', false, ['a', 'b', 'p']],
  ])(
    "accepts another copy's finding id in a guide's copy in the monolith, in compileOrder %s with markBroken %s",
    (_order, markBroken, compileOrder) => {
      withTmpDir('mdcp-lint-monolith-copy-slugs-outside-', (work) => {
        const { summary, textOf } = lintWritten(
          work,
          {
            'p/index.md': '# Pub\n\n- [Start](./start.md)\n',
            'p/start.md': '# Start\n\nSee [f](../shared/FIND-002.md).\n',
            'a/index.md': '# Guide A\n\n- [Intro](./intro.md)\n',
            'a/intro.md': '# Intro\n\nSee [t](../b/topic.md#find-002).\n',
            'b/index.md': '# Guide B\n\n- [Topic](./topic.md)\n',
            'b/topic.md': '# Topic B\n\nSee [the finding](../shared/FIND-002.md).\n',
            'shared/FIND-002.md': '# FIND-002 — Shared finding\n\nBody.\n',
          },
          {
            outputFile: 'guides.md',
            compileOrder,
            guides: [
              { name: 'p', compile: { outputFile: 'p-out.md', scopeRoot: '.' } },
              { name: 'a', compile: { links: { markBroken } } },
              { name: 'b', compile: { scopeRoot: '.' } },
            ],
          },
        );
        expect(textOf('_build/guides.md')).toContain('See [t](#find-002).');
        // a.md links b.md, another output, where no heading has the finding id as its anchor.
        expect(textOf('_build/a.md')).toContain('See [t](b.md#find-002).');
        expect(summary).toEqual(['_build/a.md dead anchor b.md#find-002 a']);
      });
    },
  );

  it('accepts a declared id on a shard that another guide owns and this guide also stitches', () => {
    withTmpDir('mdcp-lint-co-included-id-', (work) => {
      const files: Record<string, string> = {
        'shared/note.md': '# Shared note {#shared-id}\n\nBody.\n',
      };
      for (const name of ['guide-a', 'guide-b']) {
        files[`${name}/index.md`] = `# ${name}\n\n- [Body](./body.md)\n`;
        files[`${name}/body.md`] = '# Body\n\nSee [Shared](../shared/note.md).\n';
      }
      const { results, summary } = lintWritten(work, files, {
        compileOrder: ['guide-a', 'guide-b'],
        guides: ['guide-a', 'guide-b'].map((name) => ({
          name,
          path: name,
          compile: { scopeRoot: '.', outputFile: `${name}.md`, links: { markBroken: false } },
        })),
      });
      for (const r of results) expect(r.text).toContain('See [Shared](#shared-id).');
      expect(summary).toEqual([]);
    });
  });

  it('exposes the slugs each assembly accepted besides its headings', () => {
    withTmpDir('mdcp-result-known-slugs-', (work) => {
      const { results } = lintWritten(
        work,
        {
          'a/index.md': '# Guide A\n\n- [Setup](./setup.md)\n',
          'a/setup.md': '# Setup\n\nA.\n',
          'b/index.md': '# Guide B\n\n- [Setup](./setup.md)\n- [FIND-002](./FIND-002.md)\n',
          'b/setup.md': '# Setup\n\nB.\n',
          'b/FIND-002.md': '# FIND-002 — Second finding\n\nBody.\n',
          'p/index.md': '# Pub\n\n- [Start](./start.md)\n',
          'p/start.md': '# Start\n\nGo.\n',
        },
        {
          outputFile: 'guides.md',
          compileOrder: ['a', 'b', 'p'],
          guides: [{ name: 'p', compile: { outputFile: 'p-out.md' } }],
        },
      );
      const [a, b, p] = results;
      // Each compiled guide accepts the sections it stitches.
      expect(a.knownSlugs).toEqual(['setup']);
      expect(b.knownSlugs).toEqual(['setup', 'find-002']);
      expect(p.knownSlugs).toEqual(['start']);
      // Every copy in the monolith accepts the sections of every copy, and the monolith numbers
      // b's Setup after a's.
      expect(a.monolithKnownSlugs).toEqual(['setup', 'setup-1', 'find-002']);
      expect(b.monolithKnownSlugs).toEqual(['setup', 'setup-1', 'find-002']);
      expect(p.monolithKnownSlugs).toBeUndefined();
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
