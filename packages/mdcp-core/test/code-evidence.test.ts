/**
 * codeEvidence — tests driven by the spec in docs/client-core/compile-hooks/code-evidence.md.
 * Docs first, then TDD: each describe block maps to a spec section.
 */
import { describe, it, expect } from 'vitest';
import { mkdirSync, writeFileSync } from 'node:fs';
import { join } from 'node:path';
import { applyCompileHooks } from '../src/compile/hooks.js';
import '../src/compile/hooks/builtin.js';
import {
  isRepoFilePath,
  lineRangeFromText,
  symbolFromLabel,
} from '../src/compile/hooks/code-evidence.js';
import { assembleGuide, compileGuides } from '../src/compile/assemble.js';
import { resolveGuideLinkBase } from '../src/config/load.js';
import { createLocalePack } from '../src/locale/index.js';
import { useTmpDir, withCwd } from './helpers/tmp-dir.js';

const baseCtx = {
  guideName: 'review',
  filename: 'claim.md',
  config: { guides: [{ name: 'review' }] } as never,
};

function runCodeEvidence(body: string, sourceFile: string, extra: object = {}) {
  return applyCompileHooks(body, { ...baseCtx, sourceFile, ...extra }, ['codeEvidence']);
}

describe('codeEvidence — link matching', () => {
  it('matches source file paths and skips markdown or external URLs', () => {
    expect(isRepoFilePath('util.ts')).toBe(true);
    expect(isRepoFilePath('../../functions/src/foo.ts')).toBe(true);
    expect(isRepoFilePath('firestore.rules')).toBe(true);
    expect(isRepoFilePath('./intro.md')).toBe(false);
    expect(isRepoFilePath('https://example.com/a.ts')).toBe(false);
    expect(isRepoFilePath('#anchor')).toBe(false);
  });
});

describe('codeEvidence — line range detection', () => {
  it('parses common line range forms from label text', () => {
    expect(lineRangeFromText('firestore.rules L6-L8')).toBe('L6-L8');
    expect(lineRangeFromText('line 42')).toBe('L42');
    expect(lineRangeFromText('lines 10-20')).toBe('L10-L20');
    expect(lineRangeFromText('Lines 1\u20135')).toBe('L1-L5'); // en dash
    expect(lineRangeFromText('Lines 1\u20145')).toBe('L1-L5'); // em dash
    expect(lineRangeFromText('Lines 1\u002D5')).toBe('L1-L5'); // hyphen-minus
    expect(lineRangeFromText(':10-20')).toBe('L10-L20');
    expect(lineRangeFromText(':7')).toBe('L7');
    expect(lineRangeFromText('L6')).toBe('L6');
    expect(lineRangeFromText('1-2')).toBeNull();
    expect(lineRangeFromText('L 6-8')).toBe('L6-L8');
    expect(lineRangeFromText('1 - 2')).toBeNull();
    expect(lineRangeFromText(':10-L20')).toBe('L10');
    expect(lineRangeFromText('orgCount')).toBeNull();
    expect(lineRangeFromText('lines 10')).toBeNull();
  });

  it('reads line-range word cues from the locale pack', () => {
    const de = createLocalePack({
      id: 'x-de',
      brokenLinks: {
        markerLabel: 'X',
        markerTemplate: '{markerLabel}',
        reasonDeadAnchor: 'a',
        reasonMissingFile: 'b',
        reasonMissingPublishPath: 'c',
      },
      inserts: { seeInsertFallback: 'insert' },
      lineRangeWords: ['zeilen', 'zeile'],
    });

    expect(lineRangeFromText('zeile 42', de)).toBe('L42');
    expect(lineRangeFromText('Zeilen 10-20', de)).toBe('L10-L20');
    expect(lineRangeFromText('zeilen 10', de)).toBeNull();
    // English word cues are not universal — they come from the active pack.
    expect(lineRangeFromText('line 42', de)).toBeNull();
    // Prefixed forms remain language-neutral even when English words are ignored.
    expect(lineRangeFromText('L6-L8', de)).toBe('L6-L8');
    expect(lineRangeFromText(':7', de)).toBe('L7');
    // Bare digit ranges are ambiguous — require a prefix.
    expect(lineRangeFromText('1-2', de)).toBeNull();
  });
});

describe('codeEvidence — symbol resolution', () => {
  it('extracts symbol names from backtick labels', () => {
    expect(symbolFromLabel('`orgCount`')).toBe('orgCount');
    expect(symbolFromLabel('orgCount')).toBe('orgCount');
    expect(symbolFromLabel('L6-L8')).toBeNull();
  });

  const work = useTmpDir('mdcp-code-evidence-');

  it('resolves symbol from URL fragment when file exists', () => {
    const guideDir = join(work.path, 'review');
    mkdirSync(guideDir, { recursive: true });
    writeFileSync(join(guideDir, 'util.ts'), 'export function helper() {\n  return 1;\n}\n');
    const sourceFile = join(guideDir, 'claim.md');
    withCwd(work.path, () => {
      const out = runCodeEvidence('Evidence: [helper](util.ts#helper)', sourceFile);
      expect(out).toMatch(/util\.ts#L\d+\)/);
    });
  });

  it('resolves symbol from link label when no URL fragment is present', () => {
    const functionsDir = join(work.path, 'functions', 'src');
    const guideDir = join(work.path, 'docs', 'review');
    mkdirSync(functionsDir, { recursive: true });
    mkdirSync(guideDir, { recursive: true });
    writeFileSync(
      join(functionsDir, 'foo.ts'),
      'export const orgCount = 3;\nexport const other = 1;\n',
    );
    const sourceFile = join(guideDir, 'claim.md');
    withCwd(work.path, () => {
      const out = runCodeEvidence(
        'Evidence: [`orgCount`](../../functions/src/foo.ts)',
        sourceFile,
        { scopeRoot: work.path },
      );
      expect(out).toContain('foo.ts#L1)');
    });
  });
});

describe('codeEvidence — path rewrite for rendered output', () => {
  const work = useTmpDir('mdcp-code-evidence-path-');

  it('rewrites shard-relative paths relative to compile.outputFile', () => {
    const functionsDir = join(work.path, 'functions', 'src');
    const guideDir = join(work.path, 'docs', 'review');
    mkdirSync(functionsDir, { recursive: true });
    mkdirSync(guideDir, { recursive: true });
    writeFileSync(join(functionsDir, 'foo.ts'), 'export const orgCount = 1;\n');
    writeFileSync(join(guideDir, 'index.md'), '# Review\n\n- [Claim](./claim.md)\n');
    writeFileSync(
      join(guideDir, 'claim.md'),
      'Evidence: [`orgCount`](../../functions/src/foo.ts)\n',
    );

    withCwd(work.path, () => {
      const out = assembleGuide(guideDir, {
        manifest: 'index.md',
        hooks: ['codeEvidence'],
        scopeRoot: work.path,
        outputFile: join(work.path, 'docs', 'architecture-review.md'),
        config: baseCtx.config,
      });
      expect(out).toContain('[`orgCount`](../functions/src/foo.ts#L1)');
      expect(out).not.toContain('../../functions/src/foo.ts');
    });
  });

  it('rewrites evidence paths relative to monolith output by default', () => {
    const functionsDir = join(work.path, 'functions', 'src');
    const guideDir = join(work.path, 'docs', 'review');
    mkdirSync(functionsDir, { recursive: true });
    mkdirSync(guideDir, { recursive: true });
    writeFileSync(join(functionsDir, 'foo.ts'), 'export const orgCount = 1;\n');
    writeFileSync(join(guideDir, 'index.md'), '# Review\n\n- [Claim](./claim.md)\n');
    writeFileSync(
      join(guideDir, 'claim.md'),
      'Evidence: [`orgCount`](../../functions/src/foo.ts)\n',
    );

    withCwd(work.path, () => {
      const out = compileGuides({
        guidesRoot: join(work.path, 'docs'),
        compileOrder: ['review'],
        docsRoot: work.path,
        config: {
          outputDir: 'docs',
          outputFile: 'guides.md',
          compileOrder: ['review'],
        },
        guides: [{ name: 'review', compile: { hooks: ['codeEvidence'] } }],
      });
      expect(out).toContain('[`orgCount`](../functions/src/foo.ts#L1)');
      expect(out).not.toContain('../../functions/src/foo.ts');
    });
  });

  it('resolveGuideLinkBase prefers per-guide output over monolith', () => {
    withCwd(work.path, () => {
      expect(
        resolveGuideLinkBase(
          { outputDir: 'docs', outputFile: 'guides.md' },
          work.path,
          'review',
          1,
          {
            outputFile: 'architecture-review.md',
          },
        ),
      ).toBe(join(work.path, 'docs', 'architecture-review.md'));
    });
  });

  it('adds line fragments from label text without resolving symbols', () => {
    const out = runCodeEvidence(
      'See [firestore.rules L6-L8](firestore.rules) for rules.',
      '/tmp/claim.md',
    );
    expect(out).toContain('](firestore.rules#L6-L8)');
  });
});

describe('codeEvidence — exclusions', () => {
  const work = useTmpDir('mdcp-code-evidence-excl-');

  it('leaves markdown shard links unchanged', () => {
    const guideDir = join(work.path, 'review');
    mkdirSync(guideDir, { recursive: true });
    const body = 'See [intro](./intro.md) for context.';
    expect(runCodeEvidence(body, join(guideDir, 'claim.md'))).toBe(body);
  });

  it('leaves unresolved source links without line hints unchanged', () => {
    const guideDir = join(work.path, 'review');
    mkdirSync(guideDir, { recursive: true });
    const body = 'Evidence: [`missing`](../../nowhere/missing.ts)';
    expect(runCodeEvidence(body, join(guideDir, 'claim.md'))).toBe(body);
  });
});
