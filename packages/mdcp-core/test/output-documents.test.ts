/**
 * Compiled output documents — the files compile writes, as link lint reads them.
 * Spec: docs/client-core/api-compile.md and docs/features/link-validation.md.
 */
import { describe, it, expect } from 'vitest';
import { mkdirSync, readFileSync, writeFileSync } from 'node:fs';
import { dirname, join, relative } from 'node:path';
import { compileGuideResults, writeCompiledGuidesFromResults } from '../src/compile/assemble.js';
import { compiledOutputDocuments } from '../src/compile/output-documents.js';
import { resolveOutputPath } from '../src/config/load.js';
import { MdcpConfigSchema } from '../src/config/schema.js';
import { withTmpDir } from './helpers/tmp-dir.js';

const BANNER = '<!-- generated -->\n\n';

function compileFixture(work: string, configInput: Record<string, unknown>) {
  const files: Record<string, string> = {
    'a/index.md': '# Guide A\n\n- [One](./one.md)\n',
    'a/one.md': '# One\n\nText.\n',
    'b/index.md': '# Guide B\n\n- [Two](./two.md)\n',
    'b/two.md': '# Two\n\nText.\n',
    'p/index.md': '# Pub\n\n- [Start](./start.md)\n',
    'p/start.md': '# Start\n\nText.\n',
  };
  for (const [rel, text] of Object.entries(files)) {
    mkdirSync(dirname(join(work, rel)), { recursive: true });
    writeFileSync(join(work, rel), text);
  }
  const config = MdcpConfigSchema.parse({
    compileOrder: ['a', 'b', 'p'],
    banner: BANNER,
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
  return { config, options, results: compileGuideResults(options) };
}

describe('compiledOutputDocuments', () => {
  it('returns each file compile writes, with the text compile writes to it', () => {
    withTmpDir('mdcp-output-documents-', (work) => {
      const { config, options, results } = compileFixture(work, {
        outputFile: 'sub/guides.md',
        guides: [{ name: 'p', compile: { outputFile: 'p-out.md', includeBanner: false } }],
      });
      const docs = compiledOutputDocuments(results, options);
      writeCompiledGuidesFromResults(results, options, resolveOutputPath(config, work));

      expect(docs.map((d) => relative(work, d.path))).toEqual([
        '_build/a.md',
        '_build/b.md',
        '_build/p-out.md',
        '_build/sub/guides.md',
      ]);
      for (const doc of docs) expect(doc.text).toBe(readFileSync(doc.path, 'utf-8'));
      expect(docs.map((d) => d.text.startsWith(BANNER))).toEqual([true, true, false, true]);
      expect(docs.map((d) => d.guide?.name)).toEqual(['a', 'b', 'p', undefined]);
      expect(docs.map((d) => d.copies === undefined)).toEqual([true, true, true, false]);
    });
  });

  // Every copy after the first is demoted, and demoting adds a blank line at the end of a copy.
  // Publish-only guide p sits between the copies and has none. Compile ends a banner that lacks a
  // trailing newline with one.
  it.each([
    ['a banner that ends with a blank line', BANNER],
    ['a banner without a trailing newline', '<!-- generated -->'],
  ])('gives the line of the monolith on which each copy starts, after %s', (_case, banner) => {
    withTmpDir('mdcp-output-documents-copies-', (work) => {
      for (const name of ['c', 'd']) {
        mkdirSync(join(work, name), { recursive: true });
        writeFileSync(
          join(work, name, 'index.md'),
          `# Guide ${name.toUpperCase()}\n\n- [Notes](./notes.md)\n`,
        );
        writeFileSync(join(work, name, 'notes.md'), '# Notes\n\nText.\n');
      }
      const { options, results } = compileFixture(work, {
        outputFile: 'guides.md',
        compileOrder: ['a', 'b', 'p', 'c', 'd'],
        guides: [{ name: 'p', compile: { outputFile: 'p-out.md' } }],
        banner,
      });
      const docs = compiledOutputDocuments(results, options);
      const monolith = docs.at(-1)!;
      const lines = monolith.text.split('\n');
      for (const doc of docs) expect(doc.text.startsWith('<!-- generated -->\n')).toBe(true);
      expect(monolith.copies?.map((c) => c.guide.name)).toEqual(['a', 'b', 'c', 'd']);
      expect(monolith.copies?.map((c) => lines[c.firstLine - 1])).toEqual([
        '# Guide A',
        '## Guide B',
        '## Guide C',
        '## Guide D',
      ]);
    });
  });

  it.each([
    ['the config names no monolith', {}],
    [
      'every guide sets compile.outputFile',
      {
        outputFile: 'guides.md',
        guides: ['a', 'b', 'p'].map((name) => ({
          name,
          compile: { outputFile: `${name}-out.md` },
        })),
      },
    ],
  ])('leaves the monolith out when %s', (_case, configInput) => {
    withTmpDir('mdcp-output-documents-no-monolith-', (work) => {
      const { options, results } = compileFixture(work, configInput);
      const docs = compiledOutputDocuments(results, options);
      expect(docs).toHaveLength(3);
      expect(docs.every((d) => d.guide !== undefined)).toBe(true);
    });
  });
});
