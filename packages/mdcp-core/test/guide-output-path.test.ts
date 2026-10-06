import { describe, it, expect } from 'vitest';
import { basename, join } from 'node:path';
import { writeFileSync, mkdirSync, readFileSync } from 'node:fs';
import { resolveUnderOutputDir, defaultGuideOutputFile } from '../src/config/paths.js';
import { resolveGuideLinkBase, resolveGuideDir } from '../src/config/load.js';
import { MdcpConfigSchema } from '../src/config/schema.js';
import {
  compileGuideResults,
  compileGuides,
  writeCompiledGuides,
} from '../src/compile/assemble.js';
import { registerCompileHook } from '../src/compile/hooks.js';
import { withTmpDir } from './helpers/tmp-dir.js';

describe('resolveUnderOutputDir (unified layout)', () => {
  const docsRoot = '/docs';

  it('joins paths under outputDir', () => {
    expect(resolveUnderOutputDir(docsRoot, '_build', 'features.md')).toBe(
      '/docs/_build/features.md',
    );
  });

  it('resolves publish paths with .. from outputDir', () => {
    expect(resolveUnderOutputDir(docsRoot, '_build', '../packages/foo/README.md')).toBe(
      '/docs/packages/foo/README.md',
    );
    expect(resolveUnderOutputDir(docsRoot, '_build', '../../DEVELOPERS.md')).toBe('/DEVELOPERS.md');
  });

  it('defaults refs under .caches', () => {
    const cfg = MdcpConfigSchema.parse({ compileOrder: ['a'] });
    expect(cfg.refs.registryFile).toBe('.caches/refs.json');
    expect(cfg.outputDir).toBe('_build');
  });
});

describe('defaultGuideOutputFile', () => {
  it('uses guide.md for a single guide', () => {
    expect(defaultGuideOutputFile('glossary', 1)).toBe('guide.md');
  });

  it('uses {name}.md for multiple guides', () => {
    expect(defaultGuideOutputFile('features', 3)).toBe('features.md');
  });
});

describe('resolveGuideDir', () => {
  it('resolves default guide dir under docs root', () => {
    const config = MdcpConfigSchema.parse({ compileOrder: ['features'] });
    expect(resolveGuideDir('features', config, '/docs')).toBe('/docs/features');
  });
});

describe('writeCompiledGuides per-guide defaults', () => {
  it('writes default outputs under outputDir', () => {
    withTmpDir('mdcp-unified-', (work) => {
      const guideDir = join(work, 'glossary');
      mkdirSync(guideDir, { recursive: true });
      writeFileSync(join(guideDir, 'index.md'), '# Guide\n\n- [intro](intro.md)\n');
      writeFileSync(join(guideDir, 'intro.md'), '# Guide\n\n## Hello\n');

      const expected = join(work, '_build', 'guide.md');
      const opts = {
        guidesRoot: work,
        compileOrder: ['glossary'],
        docsRoot: work,
        config: { outputDir: '_build', compileOrder: ['glossary'] },
        guides: [{ name: 'glossary', compile: { manifest: 'index.md' } }],
      };

      writeCompiledGuides(opts);
      expect(readFileSync(expected, 'utf-8')).toContain('## Hello');
    });
  });
});

describe('resolveGuideLinkBase', () => {
  it('uses outputDir join for default per-guide output', () => {
    expect(resolveGuideLinkBase({ outputDir: '_build' }, '/docs', 'glossary', 2, undefined)).toBe(
      '/docs/_build/glossary.md',
    );
  });
});

describe('a guide in the monolith', () => {
  /** Guide a goes in the monolith at _build/sub/guides.md. Guide b publishes to _build/b-out.md. */
  function writeMonolithFixture(work: string) {
    mkdirSync(join(work, 'a'), { recursive: true });
    mkdirSync(join(work, 'b'), { recursive: true });
    mkdirSync(join(work, 'src'), { recursive: true });
    writeFileSync(join(work, 'package.json'), '{}\n');
    writeFileSync(
      join(work, 'src', 'foo.ts'),
      '// Foo.\nexport function foo() {\n  return 1;\n}\n',
    );
    writeFileSync(join(work, 'a', 'index.md'), '# Guide A\n\n- [One](./one.md)\n');
    writeFileSync(
      join(work, 'a', 'one.md'),
      '# One\n\nSee [pkg](../package.json).\n\nCall [foo](../src/foo.ts).\n',
    );
    writeFileSync(join(work, 'b', 'index.md'), '# Guide B\n\n- [Bee](./bee.md)\n');
    writeFileSync(join(work, 'b', 'bee.md'), '# Bee\n\nB.\n');
    return {
      guidesRoot: work,
      compileOrder: ['a', 'b'],
      docsRoot: work,
      config: { outputDir: '_build', outputFile: 'sub/guides.md', compileOrder: ['a', 'b'] },
      guides: [{ name: 'b', compile: { outputFile: 'b-out.md' } }],
    };
  }

  it('rebases its compiled guide and its copy in the monolith each to its own directory', () => {
    withTmpDir('mdcp-monolith-geometry-', (work) => {
      const opts = writeMonolithFixture(work);
      writeCompiledGuides(opts, join(work, '_build', 'sub', 'guides.md'));

      const own = readFileSync(join(work, '_build', 'a.md'), 'utf-8');
      expect(own).toContain('See [pkg](../package.json).');
      expect(own).toContain('<!-- mdcp-shard: start ../a/one.md -->');
      // codeEvidence rebases the link and adds the line of the foo symbol.
      expect(own).toContain('Call [foo](../src/foo.ts#L2).');

      const monolith = readFileSync(join(work, '_build', 'sub', 'guides.md'), 'utf-8');
      expect(monolith).toContain('See [pkg](../../package.json).');
      expect(monolith).toContain('<!-- mdcp-shard: start ../../a/one.md -->');
      expect(monolith).toContain('Call [foo](../../src/foo.ts#L2).');

      const publish = readFileSync(join(work, '_build', 'b-out.md'), 'utf-8');
      expect(publish).toContain('<!-- mdcp-shard: start ../b/bee.md -->');
      expect(monolith).not.toContain('Bee');
    });
  });

  it('keeps the monolith copy in monolithText, and compileGuides returns it', () => {
    withTmpDir('mdcp-monolith-text-', (work) => {
      const opts = writeMonolithFixture(work);
      const results = compileGuideResults(opts);
      const a = results.find((r) => r.name === 'a')!;
      const b = results.find((r) => r.name === 'b')!;

      expect(a.text).toContain('See [pkg](../package.json).');
      expect(a.monolithText).toContain('See [pkg](../../package.json).');
      expect(b.monolithText).toBeUndefined();
      expect(compileGuides(opts)).toContain('See [pkg](../../package.json).');
    });
  });

  it('runs its hooks once for each file, with fresh hookState for each assembly', () => {
    withTmpDir('mdcp-monolith-hook-state-', (work) => {
      mkdirSync(join(work, 'a'), { recursive: true });
      mkdirSync(join(work, 'tables'), { recursive: true });
      writeFileSync(
        join(work, 'a', 'index.md'),
        '# Guide A\n\n- [One](./one.md)\n- [Two](./two.md)\n',
      );
      writeFileSync(join(work, 'a', 'one.md'), '# One\n\nSee [the table](../tables/t.md).\n');
      writeFileSync(join(work, 'a', 'two.md'), '# Two\n\nText.\n');
      writeFileSync(join(work, 'tables', 't.md'), '# Sizes\n\n| a | b |\n| - | - |\n| 1 | 2 |\n');
      // A custom hook that counts the shards it sees in hookState.
      const seen: string[] = [];
      registerCompileHook('countShardsForTest', (ctx) => {
        const state = ctx.hookState as { shardsSeen?: number };
        state.shardsSeen = (state.shardsSeen ?? 0) + 1;
        seen.push(`${basename(ctx.outputFile ?? '')} ${ctx.filename} ${state.shardsSeen}`);
        return ctx.body;
      });
      const results = compileGuideResults({
        guidesRoot: work,
        compileOrder: ['a'],
        docsRoot: work,
        config: { outputDir: '_build', outputFile: 'guides.md', compileOrder: ['a'] },
        guides: [{ name: 'a', compile: { hooks: ['inlineInserts', 'countShardsForTest'] } }],
      });

      // inlineInserts inlines the first link to an insert in each assembly, and numbers it from 1.
      const [a] = results;
      expect(a.text).toContain('#### Table 1. the table');
      expect(a.monolithText).toContain('#### Table 1. the table');
      expect(seen).toEqual([
        'guide.md one.md 1',
        'guide.md two.md 2',
        'guides.md one.md 1',
        'guides.md two.md 2',
      ]);
    });
  });
});
