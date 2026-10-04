import { describe, it, expect } from 'vitest';
import { mkdirSync, writeFileSync } from 'node:fs';
import { isAbsolute, join, relative, resolve, sep } from 'node:path';
import { MdcpConfigSchema } from '../src/config/schema.js';
import { guideScanDirs, resolveGuideDir, shardLintPaths } from '../src/config/load.js';
import { useTmpDir } from './helpers/tmp-dir.js';

/**
 * The Markdown files under a guide dir, as a markdownlint-cli2 glob relative to the docs
 * root. A bare directory would expand to every file in it, images included.
 */
function mdGlob(pattern: string): string {
  return `${pattern}/**/*.{md,markdown}`;
}

describe('guideScanDirs', () => {
  it('returns compileOrder guide dirs under cwd', () => {
    const config = MdcpConfigSchema.parse({
      compileOrder: ['features', 'developer'],
      guides: [{ name: 'features' }, { name: 'developer', path: 'dev' }],
    });
    const cwd = '/docs';
    expect(guideScanDirs(config, cwd)).toEqual([resolve(cwd, 'features'), resolve(cwd, 'dev')]);
  });

  it('does not expose a removed prose-lint scan helper from core config loading', async () => {
    const load = await import('../src/config/load.js');
    expect('xrefScanDirs' in load).toBe(false);
  });

  it('strips removed lint.xrefs config from parsed config', () => {
    const config = MdcpConfigSchema.parse({
      outputDir: '_build',
      compileOrder: ['a', 'b'],
      guides: [{ name: 'b', path: 'custom/b' }],
      lint: { xrefs: { enabled: false } },
    });
    expect('xrefs' in (config.lint ?? {})).toBe(false);
  });
});

describe('shardLintPaths', () => {
  it('parses lint.markdownlint.shardsGlobs in schema', () => {
    const config = MdcpConfigSchema.parse({
      compileOrder: ['g'],
      lint: { markdownlint: { shardsGlobs: ['glossary', 'review'] } },
    });
    expect(config.lint?.markdownlint?.shardsGlobs).toEqual(['glossary', 'review']);
  });

  it('defaults to a docs-root-relative glob for the Markdown files in each guide dir', () => {
    // markdownlint-cli2 runs with the docs root as its cwd and resolves these against it.
    const config = MdcpConfigSchema.parse({
      compileOrder: ['features', 'developer'],
      guides: [{ name: 'features' }, { name: 'developer', path: 'dev' }],
    });
    expect(shardLintPaths(config, '/docs')).toEqual([mdGlob('features'), mdGlob('dev')]);
  });

  it('passes shardsGlobs as written, so a negated entry still excludes files', () => {
    // markdownlint-cli2 resolves each entry against its cwd, the docs root. Resolving an
    // entry here would turn `!review/legacy/**` into `/docs/!review/legacy/**`, which
    // excludes nothing.
    const config = MdcpConfigSchema.parse({
      compileOrder: ['guide'],
      lint: {
        markdownlint: {
          shardsGlobs: ['glossary', 'review/security', '!review/legacy/**', '#drafts/**'],
        },
      },
    });
    expect(shardLintPaths(config, '/docs')).toEqual([
      'glossary',
      'review/security',
      '!review/legacy/**',
      '#drafts/**',
    ]);
  });

  it('passes a "." shardsGlobs entry as "**", so it reaches every file under the docs root', () => {
    // Given "." as its only path, markdownlint-cli2 lints the Markdown files at the top of
    // its cwd and nothing below them, where it lints every file under any other directory.
    const config = MdcpConfigSchema.parse({
      compileOrder: ['guide'],
      lint: { markdownlint: { shardsGlobs: ['.'] } },
    });
    expect(shardLintPaths(config, '/docs')).toEqual(['**']);
  });
});

/**
 * A relative `--docs-root` (`docs`) must still give absolute guide dirs. markdownlint-cli2
 * and Vale run with the docs root as their cwd, so a relative `docs/guide` would resolve to
 * `docs/docs/guide` there and match nothing.
 */
describe('path builders with a relative docs root', () => {
  const config = MdcpConfigSchema.parse({
    compileOrder: ['features', 'developer'],
    guides: [{ name: 'features' }, { name: 'developer', path: 'dev' }],
  });

  it('resolveGuideDir returns an absolute dir for a guide without guides[].path', () => {
    expect(resolveGuideDir('features', config, 'docs')).toBe(resolve('docs', 'features'));
  });

  it('resolveGuideDir returns an absolute dir for a guide with guides[].path', () => {
    expect(resolveGuideDir('developer', config, 'docs')).toBe(resolve('docs', 'dev'));
  });

  it('guideScanDirs returns absolute guide dirs', () => {
    expect(guideScanDirs(config, 'docs')).toEqual([
      resolve('docs', 'features'),
      resolve('docs', 'dev'),
    ]);
  });

  it('shardLintPaths gives the same docs-root-relative globs as an absolute docs root', () => {
    const relativeRoot = shardLintPaths(config, 'examples/sample-guides');
    expect(relativeRoot).toEqual([mdGlob('features'), mdGlob('dev')]);
    expect(relativeRoot).toEqual(shardLintPaths(config, resolve('examples/sample-guides')));
  });

  it('shardLintPaths passes shardsGlobs as written with a relative root', () => {
    const globbed = MdcpConfigSchema.parse({
      compileOrder: ['guide'],
      lint: { markdownlint: { shardsGlobs: ['glossary'] } },
    });
    expect(shardLintPaths(globbed, 'docs')).toEqual(['glossary']);
  });

  it('shardLintPaths gives a guide outside a relative root the absolute glob of an absolute root', () => {
    const outside = MdcpConfigSchema.parse({
      compileOrder: ['inner', 'outer'],
      guides: [{ name: 'outer', path: '../pkg/guide' }],
    });
    const relativeRoot = shardLintPaths(outside, 'docs');
    expect(relativeRoot).toEqual(shardLintPaths(outside, resolve('docs')));
    expect(relativeRoot[0]).toBe(mdGlob('inner'));
    expect(isAbsolute(relativeRoot[1])).toBe(true);
    expect(relativeRoot[1].endsWith(mdGlob('/pkg/guide'))).toBe(true);
  });
});

/**
 * A shardsGlobs entry that starts with `../` loses the preset's `**` negations next to an
 * in-root entry, and resolves beside the link target under a symlinked docs root, so
 * shardLintPaths makes the part above the docs root absolute.
 */
describe('shardLintPaths with shardsGlobs outside the docs root', () => {
  const work = useTmpDir('mdcp-shards-globs-');

  /** `<tmp>/repo (copy)/docs` with a sibling `pkg/guide/legacy` tree and `pkg/README.md`. */
  function layout() {
    const repo = join(work.path, 'repo (copy)');
    const docs = join(repo, 'docs');
    mkdirSync(join(docs, 'inner'), { recursive: true });
    mkdirSync(join(repo, 'pkg', 'guide', 'legacy'), { recursive: true });
    writeFileSync(join(repo, 'pkg', 'README.md'), '# Pkg\n');
    // The tmp dir itself holds no glob characters, so only `repo (copy)` needs escapes.
    const escapedRepo = `${work.path.split(sep).join('/')}/repo \\(copy\\)`;
    return { docs, escapedRepo };
  }

  it('makes an entry that leaves the docs root absolute and escapes the part above it', () => {
    // globby reads an absolute negation as cwd-relative unless its static prefix equals a
    // positive pattern's, so a negated entry matches the absolute path through `**`.
    const { docs, escapedRepo } = layout();
    const config = MdcpConfigSchema.parse({
      compileOrder: ['inner'],
      lint: {
        markdownlint: {
          shardsGlobs: [
            'inner',
            '../pkg/guide',
            '../pkg/README.md',
            '../pkg/*/legacy/**',
            '!../pkg/guide/legacy',
            '#../pkg/guide/drafts/**',
          ],
        },
      },
    });
    expect(shardLintPaths(config, docs)).toEqual([
      'inner',
      `${escapedRepo}/pkg/guide/**`,
      `${escapedRepo}/pkg/README.md`,
      `${escapedRepo}/pkg/*/legacy/**`,
      `!**${escapedRepo}/pkg/guide/legacy/**`,
      `#**${escapedRepo}/pkg/guide/drafts/**`,
    ]);
  });

  it('gives the same paths for a relative docs root', () => {
    const { docs } = layout();
    const config = MdcpConfigSchema.parse({
      compileOrder: ['inner'],
      lint: { markdownlint: { shardsGlobs: ['inner', '../pkg/guide', '!../pkg/guide/legacy'] } },
    });
    expect(shardLintPaths(config, relative(process.cwd(), docs))).toEqual(
      shardLintPaths(config, docs),
    );
  });
});

/**
 * markdownlint-cli2 reads every shard lint path as a glob, so glob characters in a path,
 * such as the parentheses in `repo (copy)`, must not reach it unescaped. It also
 * rewrites a backslash before `{`, `}` or `|` into `/`, so those three go in brackets.
 */
describe('shardLintPaths with glob characters in paths', () => {
  it('leaves the docs root path out of the guide globs', () => {
    const config = MdcpConfigSchema.parse({ compileOrder: ['guide'] });
    for (const root of ['/home/u/repo (copy)/docs', '/srv/proj {a,b}/a+(b)/docs']) {
      expect(shardLintPaths(config, root)).toEqual([mdGlob('guide')]);
    }
  });

  it('escapes glob characters in a guide path under the docs root', () => {
    const config = MdcpConfigSchema.parse({
      compileOrder: ['old', 'braces', 'pipe', 'brackets', 'wild'],
      guides: [
        { name: 'old', path: 'guide (old)' },
        { name: 'braces', path: 'x{a,b}y' },
        { name: 'pipe', path: 'p|q' },
        { name: 'brackets', path: 'notes [1]' },
        { name: 'wild', path: 'star*/q?' },
      ],
    });
    expect(shardLintPaths(config, '/docs')).toEqual([
      mdGlob('guide \\(old\\)'),
      mdGlob('x[{]a,b[}]y'),
      mdGlob('p[|]q'),
      mdGlob('notes \\[1\\]'),
      mdGlob('star\\*/q\\?'),
    ]);
  });

  it('starts a guide path that markdownlint-cli2 would read as a negation or a literal with ./', () => {
    const config = MdcpConfigSchema.parse({ compileOrder: ['!draft', '#notes', ':raw'] });
    expect(shardLintPaths(config, '/docs')).toEqual([
      mdGlob('./!draft'),
      mdGlob('./#notes'),
      mdGlob('./:raw'),
    ]);
  });

  it('gives a guide outside the docs root an escaped absolute glob', () => {
    // A `../` glob next to an in-root glob loses the preset's `!**/index.md`: globby rebases
    // `**/` negations onto a `../` prefix only when every pattern shares it. Under a
    // symlinked docs root, `../` would also resolve beside the link target.
    const config = MdcpConfigSchema.parse({
      compileOrder: ['inner', 'shared'],
      guides: [{ name: 'shared', path: '../shared (old)/guide' }],
    });
    expect(shardLintPaths(config, '/srv/repo (copy)/docs')).toEqual([
      mdGlob('inner'),
      mdGlob('/srv/repo \\(copy\\)/shared \\(old\\)/guide'),
    ]);
  });

  it('brackets the quote characters that brace expansion reads as quoting', () => {
    // markdownlint-cli2's brace expansion reads ', " and ` as the start of a quoted literal,
    // so `what's-new/**/*.{md,markdown}` never expands {md,markdown} and matches nothing.
    const config = MdcpConfigSchema.parse({
      compileOrder: ["what's-new", 'quoted', 'tick', 'outside'],
      guides: [
        { name: 'quoted', path: 'say "hi"' },
        { name: 'tick', path: 'run `x`' },
        { name: 'outside', path: '../pkg' },
      ],
    });
    expect(shardLintPaths(config, "/home/o'neil/docs")).toEqual([
      mdGlob("what[']s-new"),
      mdGlob('say ["]hi["]'),
      mdGlob('run [`]x[`]'),
      mdGlob("/home/o[']neil/pkg"),
    ]);
  });

  it('globs every Markdown file under the docs root for a guide at the docs root', () => {
    const config = MdcpConfigSchema.parse({
      compileOrder: ['root'],
      guides: [{ name: 'root', path: '.' }],
    });
    expect(shardLintPaths(config, '/docs')).toEqual(['**/*.{md,markdown}']);
  });
});
