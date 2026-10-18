/**
 * Source-file link targets and standalone-guide link linting — the two surfaces
 * the gate used to skip. Driven by docs/features/link-validation.md.
 */
import { describe, it, expect } from 'vitest';
import { mkdirSync, writeFileSync } from 'node:fs';
import { join } from 'node:path';
import {
  fileExtensionSet,
  hasCodeExtension,
  hasFileExtension,
} from '../src/compile/hooks/path-resolve.js';
import { codeEvidenceHook } from '../src/compile/hooks/code-evidence.js';
import { lintShardLinks } from '../src/links/validate-shards.js';
import { validateCompiledLinkTarget } from '../src/links/validate.js';
import { lintLinks } from '../src/links/lint.js';
import { buildSlugRegistry } from '../src/refs/slugs.js';
import { compileGuideResults } from '../src/compile/assemble.js';
import { MerlonConfigSchema } from '../src/config/schema.js';
import { withTmpDir } from './helpers/tmp-dir.js';

describe('hasFileExtension', () => {
  it('accepts files and rejects prose, markdown and directories', () => {
    expect(hasFileExtension('src/thing.ts')).toBe(true);
    expect(hasFileExtension('config/app.yaml#L3')).toBe(true);
    expect(hasFileExtension('notes.md')).toBe(false);
    expect(hasFileExtension('src/')).toBe(false);
    expect(hasFileExtension('path')).toBe(false);
  });

  it('separates code from data while validating both', () => {
    // A data file's existence is as checkable as a code file's. What the two
    // do not share is a citable line, which is why the sets are distinct.
    expect(hasFileExtension('data/measurements.csv')).toBe(true);
    expect(hasCodeExtension('data/measurements.csv')).toBe(false);
    expect(hasCodeExtension('src/thing.ts')).toBe(true);
    expect(hasFileExtension('deploy/values.yaml')).toBe(true);
    expect(hasCodeExtension('deploy/values.yaml')).toBe(false);
  });
});

describe('lintShardLinks source-file targets', () => {
  it('reports a shard link to a source file that no longer exists', () => {
    withTmpDir('merlon-src-link-', (work) => {
      const guideDir = join(work, 'g');
      mkdirSync(guideDir, { recursive: true });
      const shard = join(guideDir, 'section.md');
      writeFileSync(shard, '## S\n\n[store](./removed-module.ts)\n');
      const issues = lintShardLinks({ shardFile: shard, guideDir });
      expect(issues.map((i) => i.kind)).toContain('missing file');
      expect(issues[0].brokenTarget).toBe('./removed-module.ts');
    });
  });

  it('accepts a shard link to a source file that exists', () => {
    withTmpDir('merlon-src-link-ok-', (work) => {
      const guideDir = join(work, 'g');
      mkdirSync(guideDir, { recursive: true });
      writeFileSync(join(guideDir, 'live-module.ts'), 'export const x = 1;\n');
      const shard = join(guideDir, 'section.md');
      writeFileSync(shard, '## S\n\n[store](./live-module.ts)\n');
      expect(lintShardLinks({ shardFile: shard, guideDir })).toEqual([]);
    });
  });

  it('leaves bare words without a source extension unvalidated', () => {
    withTmpDir('merlon-src-link-prose-', (work) => {
      const guideDir = join(work, 'g');
      mkdirSync(guideDir, { recursive: true });
      const shard = join(guideDir, 'section.md');
      writeFileSync(shard, '## S\n\n[a placeholder](path)\n');
      expect(lintShardLinks({ shardFile: shard, guideDir })).toEqual([]);
    });
  });

  it('validates directory link targets and reports a missing directory', () => {
    withTmpDir('merlon-src-link-dir-', (work) => {
      const guideDir = join(work, 'g');
      mkdirSync(join(guideDir, 'live-dir'), { recursive: true });
      const shard = join(guideDir, 'section.md');
      writeFileSync(shard, '## S\n\n[live](./live-dir/) and [gone](./missing-dir/)\n');
      const issues = lintShardLinks({ shardFile: shard, guideDir });
      expect(issues).toHaveLength(1);
      expect(issues[0].kind).toBe('missing file');
      expect(issues[0].brokenTarget).toBe('./missing-dir/');
    });
  });

  it('skips external http://, https:// and protocol-relative // URLs without network calls', () => {
    withTmpDir('merlon-src-link-ext-url-', (work) => {
      const guideDir = join(work, 'g');
      mkdirSync(guideDir, { recursive: true });
      const shard = join(guideDir, 'section.md');
      writeFileSync(
        shard,
        '## S\n\n[h](http://example.invalid/missing.ts) [s](https://example.invalid/gone/) [p](//example.invalid/x.ts)\n',
      );
      expect(lintShardLinks({ shardFile: shard, guideDir })).toEqual([]);
    });
  });

  it('resolves a source path through the line fragment codeEvidence adds', () => {
    withTmpDir('merlon-src-link-frag-', (work) => {
      const guideDir = join(work, 'g');
      mkdirSync(guideDir, { recursive: true });
      writeFileSync(join(guideDir, 'live.ts'), 'export const x = 1;\n');
      const shard = join(guideDir, 'section.md');
      writeFileSync(shard, '## S\n\n[x](./live.ts#L1)\n[gone](./gone.ts#L1)\n');
      const issues = lintShardLinks({ shardFile: shard, guideDir });
      expect(issues).toHaveLength(1);
      expect(issues[0].brokenTarget).toBe('./gone.ts#L1');
    });
  });
});

describe('validateCompiledLinkTarget source-file targets', () => {
  it('reports a compiled link to a source file that no longer exists', () => {
    withTmpDir('merlon-compiled-src-', (work) => {
      const out = join(work, 'out.md');
      writeFileSync(out, '# Out\n');
      const result = validateCompiledLinkTarget('./removed-module.ts', buildSlugRegistry('# Out'), {
        outputFile: out,
      });
      expect(result.valid).toBe(false);
      expect(result.reason).toBe('missing file');
    });
  });

  it('accepts a compiled link to a source file that exists', () => {
    withTmpDir('merlon-compiled-src-ok-', (work) => {
      const out = join(work, 'out.md');
      writeFileSync(out, '# Out\n');
      writeFileSync(join(work, 'live.ts'), 'export const x = 1;\n');
      const result = validateCompiledLinkTarget('./live.ts#L1', buildSlugRegistry('# Out'), {
        outputFile: out,
      });
      expect(result.valid).toBe(true);
    });
  });

  it('validates a compiled link to a directory target', () => {
    withTmpDir('merlon-compiled-dir-', (work) => {
      const out = join(work, 'out.md');
      writeFileSync(out, '# Out\n');
      mkdirSync(join(work, 'live-dir'), { recursive: true });
      const registry = buildSlugRegistry('# Out');
      expect(validateCompiledLinkTarget('./live-dir/', registry, { outputFile: out }).valid).toBe(
        true,
      );
      const missing = validateCompiledLinkTarget('./missing-dir/', registry, { outputFile: out });
      expect(missing.valid).toBe(false);
      expect(missing.reason).toBe('missing file');
    });
  });
});

describe('lintLinks over standaloneGuides', () => {
  function workspace(work: string) {
    mkdirSync(join(work, 'g'), { recursive: true });
    writeFileSync(join(work, 'g', 'index.md'), '# G\n\n- [s](s.md)\n');
    writeFileSync(join(work, 'g', 's.md'), '# G\n\n## Hi\n');
    return compileGuideResults({
      guidesRoot: work,
      compileOrder: ['g'],
      docsRoot: work,
      config: { outputDir: '.', compileOrder: ['g'] },
      guides: [
        { name: 'g', path: 'g', compile: { outputFile: 'out.md', links: { markBroken: false } } },
      ],
    });
  }

  it('reports a dead link in a file registered as a standalone guide', () => {
    withTmpDir('merlon-standalone-', (work) => {
      const results = workspace(work);
      writeFileSync(join(work, 'CHARTER.md'), '# Charter\n\n[component](./removed/thing.ts)\n');
      const config = MerlonConfigSchema.parse({
        compileOrder: ['g'],
        outputDir: '.',
        standaloneGuides: ['CHARTER.md'],
      });
      const issues = lintLinks({ config, docsRoot: work, results, scanRoot: work });
      const standalone = issues.filter((i) => i.file.endsWith('CHARTER.md'));
      expect(standalone).toHaveLength(1);
      expect(standalone[0].kind).toBe('missing file');
    });
  });

  it('expands standalone globs and leaves clean standalone guides alone', () => {
    withTmpDir('merlon-standalone-glob-', (work) => {
      const results = workspace(work);
      mkdirSync(join(work, 'skills', 'a'), { recursive: true });
      writeFileSync(join(work, 'skills', 'a', 'SKILL.md'), '# A\n\n[gone](../../nope.md)\n');
      writeFileSync(join(work, 'CLEAN.md'), '# Clean\n\n[g](./g/s.md)\n');
      const config = MerlonConfigSchema.parse({
        compileOrder: ['g'],
        outputDir: '.',
        standaloneGuides: ['skills/**/*.md', 'CLEAN.md'],
      });
      const issues = lintLinks({ config, docsRoot: work, results, scanRoot: work });
      expect(issues.filter((i) => i.file.endsWith('SKILL.md'))).toHaveLength(1);
      expect(issues.filter((i) => i.file.endsWith('CLEAN.md'))).toHaveLength(0);
    });
  });

  it('skips standalone guides when no scan root is given', () => {
    withTmpDir('merlon-standalone-off-', (work) => {
      const results = workspace(work);
      writeFileSync(join(work, 'CHARTER.md'), '# Charter\n\n[component](./removed/thing.ts)\n');
      const config = MerlonConfigSchema.parse({
        compileOrder: ['g'],
        outputDir: '.',
        standaloneGuides: ['CHARTER.md'],
      });
      const issues = lintLinks({ config, docsRoot: work, results });
      expect(issues.filter((i) => i.file.endsWith('CHARTER.md'))).toHaveLength(0);
    });
  });
});

describe('configurable extensions for links', () => {
  it('defaults cover more than one ecosystem', () => {
    for (const path of [
      'src/a.ts',
      'app/main.py',
      'cmd/serve.go',
      'lib/thing.rb',
      'src/Main.java',
      'infra/main.tf',
      'policy/access.rego',
      'schema/user.proto',
      'build.gradle',
      'deploy/values.yaml',
    ]) {
      expect(hasFileExtension(path)).toBe(true);
    }
    expect(hasFileExtension('notes.md')).toBe(false);
    expect(hasFileExtension('src/thing.unheardof')).toBe(false);
  });

  it('accepts an extension a repository adds in config, code or data', () => {
    const extensions = fileExtensionSet({
      codeExtensions: ['unheardof', '.alsoOK'],
      dataExtensions: ['sav'],
    });
    expect(hasFileExtension('src/thing.unheardof', extensions)).toBe(true);
    expect(hasFileExtension('src/thing.ALSOOK', extensions)).toBe(true);
    expect(hasFileExtension('data/records.sav', extensions)).toBe(true);
    expect(hasFileExtension('src/thing.ts', extensions)).toBe(true);
  });

  it('validates a link whose extension comes only from config', () => {
    withTmpDir('merlon-ext-link-', (work) => {
      const guideDir = join(work, 'g');
      mkdirSync(guideDir, { recursive: true });
      const shard = join(guideDir, 'section.md');
      writeFileSync(shard, '## S\n\n[rules](./gone.unheardof)\n');
      expect(lintShardLinks({ shardFile: shard, guideDir })).toEqual([]);
      const issues = lintShardLinks({
        shardFile: shard,
        guideDir,
        fileExtensions: fileExtensionSet({ codeExtensions: ['unheardof'] }),
      });
      expect(issues.map((i) => i.kind)).toEqual(['missing file']);
    });
  });
});

describe('codeEvidence rebases source links without a line fragment', () => {
  it('rebases a data-file link for output published elsewhere', () => {
    withTmpDir('merlon-evidence-data-', (work) => {
      const guideDir = join(work, 'g');
      mkdirSync(guideDir, { recursive: true });
      mkdirSync(join(work, 'out'), { recursive: true });
      writeFileSync(join(guideDir, 'measurements.csv'), 'a,b\n1,2\n');
      const body = codeEvidenceHook({
        guideName: 'g',
        filename: 'section.md',
        body: 'Source: [measurements](./measurements.csv)\n',
        config: { compileOrder: ['g'] },
        sourceFile: join(guideDir, 'section.md'),
        outputFile: join(work, 'out', 'guide.md'),
      });
      expect(body).toContain('](../g/measurements.csv)');
    });
  });

  it('cites a line in code but not in data', () => {
    withTmpDir('merlon-evidence-split-', (work) => {
      const guideDir = join(work, 'g');
      mkdirSync(guideDir, { recursive: true });
      writeFileSync(join(guideDir, 'store.ts'), 'line one\nexport const threshold = 1;\n');
      writeFileSync(join(guideDir, 'thresholds.csv'), 'name,value\nthreshold,1\n');
      const run = (body: string, lint?: Record<string, string[]>) =>
        codeEvidenceHook({
          guideName: 'g',
          filename: 'section.md',
          body,
          config: { compileOrder: ['g'], ...(lint ? { lint } : {}) },
          sourceFile: join(guideDir, 'section.md'),
        });

      expect(run('See [`threshold`](./store.ts)\n')).toContain('./store.ts#L2');
      // The same symbol occurs in the data file, as a cell rather than a
      // declaration, so the link is left without a fragment.
      expect(run('See [`threshold`](./thresholds.csv)\n')).toContain('](./thresholds.csv)');
      expect(run('See [`threshold`](./thresholds.csv)\n')).not.toContain('#L');
      // A repository that wants lines cited in a data format says so.
      expect(run('See [`threshold`](./thresholds.csv)\n', { codeExtensions: ['csv'] })).toContain(
        './thresholds.csv#L2',
      );
    });
  });

  it('leaves a link alone when its target does not resolve', () => {
    withTmpDir('merlon-evidence-unresolved-', (work) => {
      const guideDir = join(work, 'g');
      mkdirSync(guideDir, { recursive: true });
      const body = codeEvidenceHook({
        guideName: 'g',
        filename: 'section.md',
        body: 'Source: [gone](./gone.csv)\n',
        config: { compileOrder: ['g'] },
        sourceFile: join(guideDir, 'section.md'),
        outputFile: join(work, 'out', 'guide.md'),
      });
      expect(body).toContain('](./gone.csv)');
    });
  });
});
