/**
 * Backtick-path resolution in prose — driven by docs/features/path-resolution.md.
 */
import { describe, it, expect } from 'vitest';
import { mkdirSync, writeFileSync } from 'node:fs';
import { join, resolve } from 'node:path';
import {
  ILLUSTRATIVE_MARKER,
  hasIllustrativeMarker,
  isPathClaim,
  lineOptsOut,
  pathClaimExtensions,
  pathProbeInputs,
  probeDocumentPaths,
  probePathClaims,
  formatPathProbeIssue,
} from '../src/validate/path-probe.js';
import { MdcpConfigSchema } from '../src/config/schema.js';
import { withTmpDir } from './helpers/tmp-dir.js';

const noRoots = { searchRoots: [], generated: [], vocabulary: [] };

describe('isPathClaim', () => {
  it('accepts a path with a directory segment', () => {
    expect(isPathClaim('src/session/store.ts')).toBe('src/session/store.ts');
    expect(isPathClaim('docs/client/')).toBe('docs/client');
    expect(isPathClaim('./docs/a.md')).toBe('docs/a.md');
    expect(isPathClaim('docs/a.md#heading')).toBe('docs/a.md');
  });

  it('rejects a bare filename, which has no root to resolve against', () => {
    expect(isPathClaim('index.md')).toBeNull();
    expect(isPathClaim('refs.json')).toBeNull();
  });

  it('rejects prose, commands, flags, globs, scopes and absolute paths', () => {
    expect(isPathClaim('pnpm docs:compile')).toBeNull();
    expect(isPathClaim('--warn-broken-links')).toBeNull();
    expect(isPathClaim('packages/*/README.md')).toBeNull();
    expect(isPathClaim('@bwilliamson/mdcp-core')).toBeNull();
    expect(isPathClaim('/etc/hosts')).toBeNull();
    expect(isPathClaim('https://example.com/a.md')).toBeNull();
    expect(isPathClaim('lintShardLinks')).toBeNull();
    expect(isPathClaim('scan.root')).toBeNull();
  });

  it('rejects a single-segment name, file or directory, as unanchored', () => {
    expect(isPathClaim('store.ts')).toBeNull();
    // `src/` is spoken of generically, with no path to anchor it — same as a
    // bare filename. A claim needs at least one directory segment plus a name.
    expect(isPathClaim('src/')).toBeNull();
    expect(isPathClaim('packages/src/')).toBe('packages/src');
  });
});

describe('probePathClaims', () => {
  it('reports a claim that resolves against no root', () => {
    withTmpDir('mdcp-probe-', (work) => {
      const file = join(work, 'shard.md');
      writeFileSync(file, '# S\n\nLives in `src/session/store.ts`.\n');
      const issues = probePathClaims(file, '# S\n\nLives in `src/session/store.ts`.\n', noRoots);
      expect(issues).toHaveLength(1);
      expect(issues[0]).toMatchObject({ line: 3, path: 'src/session/store.ts' });
    });
  });

  it('resolves against the file own directory first', () => {
    withTmpDir('mdcp-probe-own-', (work) => {
      mkdirSync(join(work, 'sub'), { recursive: true });
      writeFileSync(join(work, 'sub', 'real.md'), '# R\n');
      const file = join(work, 'shard.md');
      const text = 'See `sub/real.md`.\n';
      expect(probePathClaims(file, text, noRoots)).toEqual([]);
    });
  });

  it('resolves against a configured search root', () => {
    withTmpDir('mdcp-probe-root-', (work) => {
      mkdirSync(join(work, 'pkg', 'src'), { recursive: true });
      writeFileSync(join(work, 'pkg', 'src', 'thing.ts'), 'export const x = 1;\n');
      const file = join(work, 'docs', 'shard.md');
      const text = 'See `src/thing.ts`.\n';
      expect(probePathClaims(file, text, { ...noRoots, searchRoots: [join(work, 'pkg')] })).toEqual(
        [],
      );
      expect(probePathClaims(file, text, noRoots)).toHaveLength(1);
    });
  });

  it('skips claims inside fenced code blocks', () => {
    const text = '```\n`src/gone.ts`\n```\n\n`src/also-gone.ts`\n';
    const issues = probePathClaims('/x/shard.md', text, noRoots);
    expect(issues.map((i) => i.path)).toEqual(['src/also-gone.ts']);
  });

  it('does not report a claim under a generated prefix', () => {
    const text = 'Output lands in `docs/_build/guides.md`.\n';
    expect(
      probePathClaims('/x/shard.md', text, { ...noRoots, generated: ['docs/_build'] }),
    ).toEqual([]);
    expect(probePathClaims('/x/shard.md', text, noRoots)).toHaveLength(1);
  });

  it('does not treat a sibling prefix as a generated match', () => {
    const text = 'See `docs/_buildings/a.md`.\n';
    expect(
      probePathClaims('/x/shard.md', text, { ...noRoots, generated: ['docs/_build'] }),
    ).toHaveLength(1);
  });

  it('accepts a vocabulary name exactly, not the paths beneath it', () => {
    // `docs/client/` is a tier the protocol defines and this repository does
    // not instantiate. An invented file under that name is still a defect.
    const declared = { ...noRoots, vocabulary: ['docs/client/'] };
    expect(probePathClaims('/x/shard.md', 'Tiers include `docs/client/`.\n', declared)).toEqual([]);
    expect(
      probePathClaims('/x/shard.md', 'See `docs/client/onboarding.md`.\n', declared),
    ).toHaveLength(1);
  });

  it('exempts the whole file when the marker stands alone on a line', () => {
    const text = `# Teaching\n\n${ILLUSTRATIVE_MARKER}\n\nLink \`topic/section.md\` from \`guide/other.md\`.\n`;
    expect(probePathClaims('/x/shard.md', text, noRoots)).toEqual([]);
    expect(hasIllustrativeMarker(text)).toBe(true);
  });

  it('exempts only the line when the marker trails content', () => {
    const text = `One \`src/illustrative.ts\` here. ${ILLUSTRATIVE_MARKER}\n\nTwo \`src/real-claim.ts\` here.\n`;
    const issues = probePathClaims('/x/shard.md', text, noRoots);
    expect(issues.map((i) => i.path)).toEqual(['src/real-claim.ts']);
    expect(hasIllustrativeMarker(text)).toBe(false);
    expect(lineOptsOut(`a \`x/y.ts\` ${ILLUSTRATIVE_MARKER}`)).toBe(true);
    expect(lineOptsOut(ILLUSTRATIVE_MARKER)).toBe(false);
  });
});

describe('probeDocumentPaths', () => {
  it('scans every file and tolerates one that cannot be read', () => {
    withTmpDir('mdcp-probe-many-', (work) => {
      writeFileSync(join(work, 'a.md'), 'See `src/gone-a.ts`.\n');
      writeFileSync(join(work, 'b.md'), 'See `src/gone-b.ts`.\n');
      const issues = probeDocumentPaths({
        files: [join(work, 'a.md'), join(work, 'b.md'), join(work, 'missing.md')],
        searchRoots: [],
        generated: [],
        vocabulary: [],
      });
      expect(issues.map((i) => i.path).sort()).toEqual(['src/gone-a.ts', 'src/gone-b.ts']);
    });
  });
});

describe('pathProbeInputs', () => {
  it('collects guide shards and standalone guides but not compiled output', () => {
    withTmpDir('mdcp-probe-inputs-', (work) => {
      mkdirSync(join(work, 'docs', 'g'), { recursive: true });
      mkdirSync(join(work, 'docs', 'glossary'), { recursive: true });
      mkdirSync(join(work, 'docs', '_build'), { recursive: true });
      writeFileSync(join(work, 'docs', 'g', 'index.md'), '# G\n');
      writeFileSync(join(work, 'docs', 'g', 'section.md'), '# S\n');
      writeFileSync(join(work, 'docs', '_build', 'guides.md'), '# compiled\n');
      writeFileSync(join(work, 'CHARTER.md'), '# C\n');

      const config = MdcpConfigSchema.parse({
        compileOrder: ['g'],
        outputDir: '_build',
        standaloneGuides: ['CHARTER.md'],
        guides: [{ name: 'g', compile: { scopeRoot: 'glossary' } }],
        lint: { paths: { severity: 'error', searchRoots: ['pkg'] } },
      });

      const inputs = pathProbeInputs(config, join(work, 'docs'), work);
      const names = inputs.files.map((f) => f.replace(work, '')).sort();
      expect(names).toEqual(['/CHARTER.md', '/docs/g/index.md', '/docs/g/section.md']);
      expect(inputs.searchRoots).toContain(resolve(work));
      expect(inputs.searchRoots).toContain(resolve(work, 'docs'));
      expect(inputs.searchRoots).toContain(resolve(work, 'docs', 'glossary'));
      expect(inputs.searchRoots).toContain(resolve(work, 'pkg'));
    });
  });
});

describe('path probe config', () => {
  it('defaults to off so adopting the checker does not fail an unprepared corpus', () => {
    const config = MdcpConfigSchema.parse({ compileOrder: ['g'], lint: { paths: {} } });
    expect(config.lint?.paths?.severity).toBe('off');
  });

  it('formats diagnostics with a severity-specific prefix', () => {
    const issue = { file: '/x/shard.md', line: 7, path: 'src/gone.ts' };
    expect(formatPathProbeIssue(issue, 'error')).toBe(
      'path: /x/shard.md:7: unresolved path "src/gone.ts"',
    );
    expect(formatPathProbeIssue(issue, 'warn')).toBe(
      'path-warn: /x/shard.md:7: unresolved path "src/gone.ts"',
    );
  });
});

describe('configurable extensions', () => {
  it('treats a configured extension as a claim', () => {
    const text = 'Rules live in `policy/access.rego2`.\n';
    expect(probePathClaims('/x/shard.md', text, noRoots)).toEqual([]);
    expect(
      probePathClaims('/x/shard.md', text, {
        ...noRoots,
        extensions: pathClaimExtensions({ codeExtensions: ['rego2'] }),
      }),
    ).toHaveLength(1);
  });

  it('accepts a configured extension written with a leading dot', () => {
    expect(pathClaimExtensions({ codeExtensions: ['.rego2'] }).has('rego2')).toBe(true);
  });

  it('claims data extensions as readily as code ones', () => {
    const set = pathClaimExtensions({ dataExtensions: ['sav'] });
    expect(set.has('ts')).toBe(true);
    expect(set.has('csv')).toBe(true);
    expect(set.has('md')).toBe(true);
    expect(set.has('sav')).toBe(true);
  });

  it('carries both extension knobs into probe inputs', () => {
    withTmpDir('mdcp-probe-ext-', (work) => {
      mkdirSync(join(work, 'docs', 'g'), { recursive: true });
      writeFileSync(join(work, 'docs', 'g', 'index.md'), '# G\n');
      const config = MdcpConfigSchema.parse({
        compileOrder: ['g'],
        lint: {
          codeExtensions: ['rego2'],
          dataExtensions: ['sav'],
          paths: { severity: 'error' },
        },
      });
      const inputs = pathProbeInputs(config, join(work, 'docs'), work);
      expect(inputs.extensions?.has('rego2')).toBe(true);
      expect(inputs.extensions?.has('sav')).toBe(true);
    });
  });
});
