/**
 * The refs registry covers every compiled output, each slugged on its own.
 * Spec: docs/features/refs-registry-path.md and docs/client-core/api-refs-validation.md.
 */
import { describe, it, expect } from 'vitest';
import { mkdirSync, readFileSync, writeFileSync } from 'node:fs';
import { dirname, join, resolve } from 'node:path';
import {
  compileGuideResults,
  compileGuidesFromResults,
  writeCompiledGuidesFromResults,
} from '../src/compile/assemble.js';
import { resolveOutputPath } from '../src/config/load.js';
import { MdcpConfigSchema } from '../src/config/schema.js';
import { buildSlugRegistry, type RefsRegistry } from '../src/refs/slugs.js';
import {
  checkRefsRegistry,
  genRefsFromCompiled,
  readRefsRegistry,
  refsOutputTexts,
} from '../src/refs/registry.js';
import * as mdcp from '../src/index.js';
import { withTmpDir } from './helpers/tmp-dir.js';

const BANNER = '<!-- generated -->\n\n';

/**
 * Guides a and b both have a Notes section, so the monolith numbers the second `notes-1` while
 * each compiled guide keeps `notes`. Guide p is a publish output outside `outputDir`, and guide c
 * is a publish output in a subdirectory of it.
 */
function compileFixture(work: string, configInput: Record<string, unknown>) {
  const files: Record<string, string> = {
    'a/index.md': '# Guide A\n\n- [Notes](./notes.md)\n',
    'a/notes.md': '# Notes\n\nText.\n',
    'b/index.md': '# Guide B\n\n- [Notes](./notes.md)\n',
    'b/notes.md': '# Notes\n\nText.\n',
    'p/index.md': '# Pub\n\n- [Start](./start.md)\n',
    'p/start.md': '# Start\n\nText.\n\n## When it runs\n\nText.\n',
    'c/index.md': '# Guide C\n\n- [Notes](./notes.md)\n',
    'c/notes.md': '# Notes\n\nText.\n',
  };
  for (const [rel, text] of Object.entries(files)) {
    mkdirSync(dirname(join(work, rel)), { recursive: true });
    writeFileSync(join(work, rel), text);
  }
  const config = MdcpConfigSchema.parse({
    compileOrder: ['a', 'b', 'p', 'c'],
    banner: BANNER,
    guides: [
      { name: 'p', compile: { outputFile: '../README.md', includeBanner: false } },
      { name: 'c', compile: { outputFile: 'compiled/c.md' } },
    ],
    ...configInput,
  });
  const options = {
    guidesRoot: work,
    compileOrder: config.compileOrder,
    banner: config.banner,
    guides: config.guides,
    docsRoot: work,
    config,
  };
  const results = compileGuideResults(options);
  writeCompiledGuidesFromResults(results, options, resolveOutputPath(config, work));
  return { options, results, compiled: compileGuidesFromResults(results, options) };
}

const slugsOf = (registry: Pick<RefsRegistry, 'headings'>) => registry.headings.map((h) => h.slug);

describe('refsOutputTexts', () => {
  it('gives each compiled output its docs-root-relative file and the text compile writes', () => {
    withTmpDir('mdcp-refs-outputs-', (work) => {
      const { options, results } = compileFixture(work, { outputFile: 'guides.md' });
      const outputs = refsOutputTexts(results, options);
      expect(outputs.map((o) => [o.file, o.guideName])).toEqual([
        ['_build/a.md', 'a'],
        ['_build/b.md', 'b'],
        ['README.md', 'p'],
        ['_build/compiled/c.md', 'c'],
        ['_build/guides.md', undefined],
      ]);
      for (const o of outputs) expect(o.text).toBe(readFileSync(join(work, o.file), 'utf-8'));
    });
  });

  it('is exported from the package entry point', () => {
    expect(typeof mdcp.refsOutputTexts).toBe('function');
  });
});

describe('genRefsFromCompiled with compiled outputs', () => {
  it('keeps the monolith headings at the top level and adds every output slugged on its own', () => {
    withTmpDir('mdcp-refs-registry-', (work) => {
      const { options, results, compiled } = compileFixture(work, { outputFile: 'guides.md' });
      const refsPath = join(work, '_build', 'refs.json');
      const registry = genRefsFromCompiled(compiled, refsPath, refsOutputTexts(results, options));

      // The top level is the registry the monolith alone gives, as before.
      const topLevel = buildSlugRegistry(compiled);
      expect(registry.headings).toEqual(topLevel.headings);
      expect(registry.slugs).toEqual(topLevel.slugs);
      expect(Object.keys(registry)).toEqual(['generatedFrom', 'headings', 'slugs', 'outputs']);
      expect(readRefsRegistry(refsPath)).toEqual(registry);

      const outputs = registry.outputs ?? [];
      expect(outputs.map((o) => [o.file, o.guideName, slugsOf(o)])).toEqual([
        ['_build/a.md', 'a', ['guide-a', 'notes']],
        ['_build/b.md', 'b', ['guide-b', 'notes']],
        ['README.md', 'p', ['pub', 'start', 'when-it-runs']],
        ['_build/compiled/c.md', 'c', ['guide-c', 'notes']],
        ['_build/guides.md', undefined, ['guide-a', 'notes', 'guide-b', 'notes-1']],
      ]);
      // The publish output's headings are in the registry although the monolith leaves it out.
      expect(slugsOf(registry)).not.toContain('when-it-runs');
      expect(outputs[2].slugs['when-it-runs']).toBe('pub.when-it-runs');
    });
  });

  it('numbers each heading by its line in the written file, banner included', () => {
    withTmpDir('mdcp-refs-lines-', (work) => {
      const { options, results, compiled } = compileFixture(work, { outputFile: 'guides.md' });
      const registry = genRefsFromCompiled(
        compiled,
        join(work, '_build', 'refs.json'),
        refsOutputTexts(results, options),
      );
      const outputs = registry.outputs ?? [];
      expect(outputs).toHaveLength(5);
      for (const output of outputs) {
        const lines = readFileSync(resolve(work, output.file), 'utf-8').split('\n');
        for (const h of output.headings) {
          expect(lines[h.line - 1]).toBe(`${'#'.repeat(h.level)} ${h.title}`);
        }
      }
      // The banner takes the first two lines of each compiled guide; README.md has none.
      expect(outputs.map((o) => o.headings[0].line)).toEqual([3, 3, 1, 3, 3]);
      // The nested output keeps its subdirectory in `file`, and each line is a line of that file.
      expect(outputs[3].file).toBe('_build/compiled/c.md');
      expect(outputs[3].headings.map((h) => [h.slug, h.line])).toEqual([
        ['guide-c', 3],
        ['notes', 7],
      ]);
    });
  });

  it('lists every compiled guide when the config names no monolith', () => {
    withTmpDir('mdcp-refs-no-monolith-', (work) => {
      const { options, results, compiled } = compileFixture(work, {});
      const registry = genRefsFromCompiled(
        compiled,
        join(work, '_build', 'refs.json'),
        refsOutputTexts(results, options),
      );
      expect(registry.headings).toEqual(buildSlugRegistry(compiled).headings);
      expect(registry.outputs?.map((o) => o.file)).toEqual([
        '_build/a.md',
        '_build/b.md',
        'README.md',
        '_build/compiled/c.md',
      ]);
    });
  });

  it('writes the registry without outputs when it gets the compiled text alone', () => {
    withTmpDir('mdcp-refs-text-only-', (work) => {
      const refsPath = join(work, 'refs.json');
      const registry = genRefsFromCompiled('# A\n\n## B\n', refsPath);
      expect(registry).toEqual(buildSlugRegistry('# A\n\n## B\n'));
      expect(Object.keys(readRefsRegistry(refsPath))).not.toContain('outputs');
    });
  });
});

describe('checkRefsRegistry with compiled outputs', () => {
  it('reports a stale registry when only a publish output changed', () => {
    withTmpDir('mdcp-refs-check-', (work) => {
      const { options, results, compiled } = compileFixture(work, { outputFile: 'guides.md' });
      const refsPath = join(work, '_build', 'refs.json');
      const outputs = refsOutputTexts(results, options);
      genRefsFromCompiled(compiled, refsPath, outputs);
      expect(checkRefsRegistry(compiled, refsPath, outputs).ok).toBe(true);

      const edited = outputs.map((o) =>
        o.file === 'README.md' ? { ...o, text: `${o.text}\n## Later\n` } : o,
      );
      expect(checkRefsRegistry(compiled, refsPath, edited)).toEqual({
        ok: false,
        message: 'refs.json is stale; run: mdcp refs gen',
      });
    });
  });

  it('reports a registry written without outputs as stale', () => {
    withTmpDir('mdcp-refs-check-old-', (work) => {
      const { options, results, compiled } = compileFixture(work, { outputFile: 'guides.md' });
      const refsPath = join(work, '_build', 'refs.json');
      genRefsFromCompiled(compiled, refsPath);
      expect(checkRefsRegistry(compiled, refsPath).ok).toBe(true);
      expect(checkRefsRegistry(compiled, refsPath, refsOutputTexts(results, options)).ok).toBe(
        false,
      );
    });
  });
});
