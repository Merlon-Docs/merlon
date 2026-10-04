import { describe, it, expect } from 'vitest';
import { readFileSync } from 'node:fs';
import { join } from 'node:path';
import GithubSlugger, { slug as githubSlug } from 'github-slugger';
import { githubSlugify, headingTextToPlain, buildSlugRegistry } from '../src/refs/slugs.js';
import * as mdcp from '../src/index.js';
import { genRefsFromCompiled, checkRefsRegistry } from '../src/refs/registry.js';
import { resolveRefsPath } from '../src/config/load.js';
import { useTmpDir } from './helpers/tmp-dir.js';

const PREPROCESSOR_HEADING = 'Preprocessor / templating (out of scope)';

describe('githubSlugify', () => {
  it('strips brace ids and punctuation', () => {
    const raw = 'Hello {#world}!';
    expect(githubSlugify(raw)).toBe(githubSlug(headingTextToPlain(raw)));
    expect(githubSlugify(raw)).toBe('hello-');
  });

  it('preserves consecutive dashes from CLI flag headings', () => {
    const raw = '`--config` vs `--docs-root`';
    expect(githubSlugify(raw)).toBe('--config-vs---docs-root');
    expect(githubSlugify(raw)).toBe(githubSlug(headingTextToPlain(raw)));
  });

  it('matches github-slugger on plain repo headings', () => {
    expect(githubSlugify(PREPROCESSOR_HEADING)).toBe('preprocessor--templating-out-of-scope');
    expect(githubSlugify(PREPROCESSOR_HEADING)).toBe(githubSlug(PREPROCESSOR_HEADING));
  });

  it.each([
    ['Authentication flow', 'authentication-flow'],
    ['config --', 'config---'],
    ['😄 emoji', '-emoji'],
    ['Привет non-latin 你好', 'привет-non-latin-你好'],
  ])('matches github-slugger for plain text %j', (plain, expected) => {
    expect(githubSlug(plain)).toBe(expected);
    expect(githubSlugify(plain)).toBe(expected);
  });

  it('keeps trailing dashes (GitHub html-pipeline behavior)', () => {
    const plain = 'Trailing dash -';
    expect(githubSlugify(plain)).toBe('trailing-dash--');
    expect(githubSlugify(plain)).toBe(githubSlug(plain));
  });
});

describe('headingTextToPlain', () => {
  it('strips explicit ids and inline markdown before slugging', () => {
    expect(headingTextToPlain('**Bold** `{#custom-id}`')).toBe('Bold');
  });
});

describe('buildSlugRegistry', () => {
  it('disambiguates duplicate slugs like github-slugger', () => {
    const text = '# Guide\n\n## Foo\n\n## Foo\n';
    const reg = buildSlugRegistry(text);
    const slugs = reg.headings.map((h) => h.slug);

    const slugger = new GithubSlugger();
    const expected = ['Guide', 'Foo', 'Foo'].map((title) => slugger.slug(title));
    expect(slugs).toEqual(expected);
    expect(slugs).toContain('foo');
    expect(slugs).toContain('foo-1');
  });

  it('tracks duplicates across the full compiled document', () => {
    const text = '# Guide\n\n## Alpha\n\n## Beta\n\n## Alpha\n\n## Alpha\n';
    const reg = buildSlugRegistry(text);
    const slugger = new GithubSlugger();
    const expected = ['Guide', 'Alpha', 'Beta', 'Alpha', 'Alpha'].map((title) =>
      slugger.slug(title),
    );
    expect(reg.headings.map((h) => h.slug)).toEqual(expected);
  });

  it('skips headings whose title is empty after stripping anchors', () => {
    const reg = buildSlugRegistry('# Guide\n\n## {#only-id}\n\n## Real\n');
    expect(reg.headings.map((h) => h.title)).toEqual(['Guide', 'Real']);
  });

  it('falls back to guide when the h1 slug is empty', () => {
    const reg = buildSlugRegistry('# !!!\n\n## Section\n');
    const section = reg.headings.find((h) => h.title === 'Section');
    expect(section?.guide).toBe('guide');
  });

  it('skips heading lines inside fenced code blocks', () => {
    const text = [
      '# Guide',
      '',
      '```bash',
      '# install',
      '```',
      '',
      '~~~~markdown',
      '## Install',
      '~~~',
      '~~~~',
      '',
      '## Install',
      '',
    ].join('\n');
    const reg = buildSlugRegistry(text);
    expect(reg.headings.map((h) => [h.slug, h.line])).toEqual([
      ['guide', 1],
      ['install', 12],
    ]);
  });

  it('counts a heading after a fence that an empty list item holds', () => {
    // The fence belongs to the item that the bare `-` opens, so the unindented line ends both.
    const reg = buildSlugRegistry('# Guide\n\n-\n  ```\n  code\n# Next\n');
    expect(reg.headings.map((h) => [h.slug, h.line])).toEqual([
      ['guide', 1],
      ['next', 6],
    ]);
  });

  it('keeps the guide when a fenced comment looks like a level-one heading', () => {
    const reg = buildSlugRegistry('# Guide\n\n```bash\n# install the deps\n```\n\n## Setup\n');
    expect(reg.headings.map((h) => [h.title, h.guide])).toEqual([
      ['Guide', 'guide'],
      ['Setup', 'guide'],
    ]);
  });
});

describe('public refs API', () => {
  it('does not export lookupHeadings', () => {
    expect('lookupHeadings' in mdcp).toBe(false);
  });

  it('still exports buildSlugRegistry and registry helpers', () => {
    expect(typeof mdcp.buildSlugRegistry).toBe('function');
    expect(typeof mdcp.genRefsFromCompiled).toBe('function');
  });
});

describe('semantic heading keys', () => {
  it('assigns semantic keys for acronym chapter headings', () => {
    const text = '# Admin Guide\n\n## ADM Chapter 1 — Getting started\n';
    const reg = buildSlugRegistry(text);
    const entry = reg.headings.find((h) => h.title.includes('ADM Chapter 1'));
    expect(entry?.key).toBe('adm.ch1');
    expect(reg.slugs[entry!.slug]).toBe('adm.ch1');
  });
});

describe('resolveRefsPath', () => {
  it('resolves registryFile relative to outputDir (#11)', () => {
    const cwd = '/docs';
    expect(resolveRefsPath(cwd, '_build/compiled', 'refs.json')).toBe(
      '/docs/_build/compiled/refs.json',
    );
  });

  it('normalizes cwd-relative registryFile under outputDir (#11)', () => {
    const cwd = '/docs';
    expect(resolveRefsPath(cwd, '_build/compiled', '_build/compiled/refs.json')).toBe(
      '/docs/_build/compiled/refs.json',
    );
  });

  it('keeps nested paths relative to outputDir', () => {
    const cwd = '/docs';
    expect(resolveRefsPath(cwd, '_build/compiled', 'meta/refs.json')).toBe(
      '/docs/_build/compiled/meta/refs.json',
    );
  });

  it('resolves registryFile when outputDir is "."', () => {
    expect(resolveRefsPath('/docs', '.', 'refs.json')).toBe('/docs/refs.json');
  });

  it('does not treat outputDir-relative refs.json as cwd-relative', () => {
    const cwd = '/docs';
    expect(resolveRefsPath(cwd, '_build/compiled', 'refs.json')).toBe(
      '/docs/_build/compiled/refs.json',
    );
  });
});

describe('checkRefsRegistry', () => {
  const work = useTmpDir('mdcp-refs-');

  it('reports stale registry', () => {
    const refsPath = join(work.path, 'refs.json');
    genRefsFromCompiled('# A\n\n## B\n', refsPath);
    const stale = checkRefsRegistry('# A\n\n## B\n\n## C\n', refsPath);
    expect(stale.ok).toBe(false);
  });

  it('passes when registry matches compile', () => {
    const refsPath = join(work.path, 'refs.json');
    const text = '# A\n\n## B\n';
    genRefsFromCompiled(text, refsPath);
    const ok = checkRefsRegistry(text, refsPath);
    expect(ok.ok).toBe(true);
    expect(readFileSync(refsPath, 'utf-8')).toContain('"slug": "b"');
  });
});
