import { describe, it, expect } from 'vitest';
import { DEFAULT_STANDARD_VERSION, MerlonConfigSchema } from '../src/config/schema.js';
import { loadConfig, parseConfig, resolveOutputPath, resolveRefsPath } from '../src/config/load.js';
import { writeFileSync, mkdirSync } from 'node:fs';
import { join } from 'node:path';
import { useTmpDir, withTmpDir } from './helpers/tmp-dir.js';

describe('MerlonConfigSchema', () => {
  it('parses minimal config', () => {
    const cfg = MerlonConfigSchema.parse({
      compileOrder: ['glossary'],
    });
    expect(cfg.outputFile).toBeUndefined();
    expect(cfg.outputDir).toBe('_build');
    expect(cfg.refs.registryFile).toBe('.caches/refs.json');
  });

  it('parses per-guide compile options', () => {
    const cfg = MerlonConfigSchema.parse({
      compileOrder: ['glossary'],
      guides: [
        {
          name: 'glossary',
          path: 'docs/example',
          compile: {
            title: 'Example glossary',
            manifest: 'index.md',
            outputFile: 'out/glossary.md',
            hooks: ['stripAnchors'],
          },
        },
      ],
    });
    expect(cfg.guides?.[0].compile?.title).toBe('Example glossary');
    expect(cfg.guides?.[0].compile?.hooks).toContain('stripAnchors');
  });

  it('parses object-form hook opt-out', () => {
    const cfg = MerlonConfigSchema.parse({
      compileOrder: ['glossary'],
      guides: [
        {
          name: 'glossary',
          compile: {
            hooks: { codeEvidence: false, inlineInserts: false },
          },
        },
      ],
    });
    const hooks = cfg.guides?.[0].compile?.hooks;
    expect(hooks).toEqual({ codeEvidence: false, inlineInserts: false });
  });

  it('rejects empty compileOrder', () => {
    expect(() => MerlonConfigSchema.parse({ compileOrder: [] })).toThrow();
  });

  it('parses backup defaults', () => {
    const cfg = MerlonConfigSchema.parse({
      compileOrder: ['glossary'],
    });
    expect(cfg.backup.enabled).toBe(false);
    expect(cfg.backup.dir).toBe('.caches/backups');
    expect(cfg.backup.ext).toBe('');
  });

  it('parses explicit backup config', () => {
    const cfg = MerlonConfigSchema.parse({
      compileOrder: ['glossary'],
      backup: { enabled: true, dir: 'archive', ext: '.bak' },
    });
    expect(cfg.backup.enabled).toBe(true);
    expect(cfg.backup.dir).toBe('archive');
    expect(cfg.backup.ext).toBe('.bak');
  });

  it('defaults standaloneGuides and scan when absent', () => {
    const cfg = MerlonConfigSchema.parse({
      compileOrder: ['glossary'],
    });
    expect(cfg.standaloneGuides).toEqual([]);
    expect(cfg.scan.gitignore).toBe(true);
    expect(cfg.scan.ignore).toEqual([]);
    expect(cfg.scan.root).toBeUndefined();
    expect(cfg.scan.strict).toBe(false);
  });

  it('parses explicit standaloneGuides and scan config', () => {
    const cfg = MerlonConfigSchema.parse({
      compileOrder: ['glossary'],
      standaloneGuides: ['packages/*/README.md', 'SECURITY.md'],
      scan: { gitignore: false, ignore: ['legacy'], root: '.', strict: true },
    });
    expect(cfg.standaloneGuides).toEqual(['packages/*/README.md', 'SECURITY.md']);
    expect(cfg.scan.gitignore).toBe(false);
    expect(cfg.scan.ignore).toEqual(['legacy']);
    expect(cfg.scan.root).toBe('.');
    expect(cfg.scan.strict).toBe(true);
  });

  it('parses link validation defaults', () => {
    const cfg = MerlonConfigSchema.parse({
      compileOrder: ['glossary'],
      guides: [
        {
          name: 'glossary',
          compile: { links: { markBroken: true } },
        },
      ],
      lint: { links: { enabled: true, severity: 'error' } },
    });
    expect(cfg.guides?.[0].compile?.links?.markBroken).toBe(true);
    expect(cfg.lint?.links?.enabled).toBe(true);
    expect(cfg.lint?.links?.severity).toBe('error');
  });
});

describe('standardVersion', () => {
  it('defaults to the package version and mirrors it in protocolVersion', () => {
    const cfg = parseConfig({ compileOrder: ['a'] });
    expect(cfg.standardVersion).toBe(DEFAULT_STANDARD_VERSION);
    expect(cfg.protocolVersion).toBe(DEFAULT_STANDARD_VERSION);
  });

  it('migrates the former protocolVersion key to the package version', () => {
    const cfg = parseConfig({ compileOrder: ['a'], protocolVersion: '0.6.0.0' });
    expect(cfg.standardVersion).toBe(DEFAULT_STANDARD_VERSION);
    expect(cfg.protocolVersion).toBe(DEFAULT_STANDARD_VERSION);
  });

  it('prefers standardVersion and accepts the same value under both keys', () => {
    const cfg = parseConfig({
      compileOrder: ['a'],
      standardVersion: '0.6.0.0',
      protocolVersion: '0.6.0.0',
    });
    expect(cfg.standardVersion).toBe('0.6.0.0');
  });

  it('rejects different values under the two keys', () => {
    expect(() =>
      parseConfig({ compileOrder: ['a'], standardVersion: '0.6.0.0', protocolVersion: '0.5.0.0' }),
    ).toThrow(/standardVersion.*protocolVersion/);
  });

  it('loadConfig migrates protocolVersion from a file to the default standard version', () => {
    withTmpDir('merlon-config-', (dir) => {
      writeFileSync(
        join(dir, 'merlon.config.json'),
        JSON.stringify({ compileOrder: ['a'], protocolVersion: '0.6.0.0' }),
      );
      expect(loadConfig('merlon.config.json', dir).standardVersion).toBe(DEFAULT_STANDARD_VERSION);
    });
  });
});

describe('loadConfig', () => {
  const work = useTmpDir('merlon-config-');

  it('loads config from disk', () => {
    writeFileSync(join(work.path, 'merlon.config.json'), JSON.stringify({ compileOrder: ['a'] }));
    const cfg = loadConfig('merlon.config.json', work.path);
    expect(cfg.compileOrder).toEqual(['a']);
  });

  it('throws when config missing', () => {
    expect(() => loadConfig('missing.json', work.path)).toThrow(/Config not found/);
  });

  it('resolves config path from configBase, not docs cwd', () => {
    withTmpDir('merlon-config-', (repo) => {
      const docs = join(repo, 'docs');
      mkdirSync(docs, { recursive: true });
      writeFileSync(join(docs, 'merlon.config.json'), JSON.stringify({ compileOrder: ['a'] }));
      const cfg = loadConfig('docs/merlon.config.json', repo);
      expect(cfg.compileOrder).toEqual(['a']);
    });
  });
});

describe('resolveUnderOutputDir paths', () => {
  it('resolves outputFile relative to outputDir', () => {
    const config = MerlonConfigSchema.parse({
      compileOrder: ['a'],
      outputDir: '_build/compiled',
      outputFile: 'guides.md',
    });
    expect(resolveOutputPath(config, '/docs')).toBe('/docs/_build/compiled/guides.md');
  });

  it('normalizes cwd-relative outputFile under outputDir', () => {
    const config = MerlonConfigSchema.parse({
      compileOrder: ['a'],
      outputDir: '_build/compiled',
      outputFile: '_build/compiled/guides.md',
    });
    expect(resolveOutputPath(config, '/docs')).toBe('/docs/_build/compiled/guides.md');
  });

  it('resolves refs.registryFile via resolveRefsPath', () => {
    expect(resolveRefsPath('/docs', '_build', '.caches/refs.json')).toBe(
      '/docs/_build/.caches/refs.json',
    );
  });
});
