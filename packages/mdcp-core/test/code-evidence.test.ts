/**
 * codeEvidence — tests driven by the spec in docs/client-core/compile-hooks/code-evidence.md.
 * Docs first, then TDD: each describe block maps to a spec section.
 */
import { describe, it, expect } from 'vitest';
import { mkdirSync, writeFileSync } from 'node:fs';
import { dirname, join } from 'node:path';
import { applyCompileHooks, registerCompileHook } from '../src/compile/hooks.js';
import '../src/compile/hooks/builtin.js';
import {
  isRepoFilePath,
  lineRangeFromText,
  symbolFromLabel,
} from '../src/compile/hooks/code-evidence.js';
import {
  assembleGuide,
  compileGuideResults,
  compileGuides,
  type CompileOptionsInput,
} from '../src/compile/assemble.js';
import { resolveGuideLinkBase } from '../src/config/load.js';
import { createLocalePack } from '../src/locale/index.js';
import { useTmpDir, withCwd, withTmpDir } from './helpers/tmp-dir.js';

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

  it('trims every backtick from both ends of a label, then whitespace', () => {
    expect(symbolFromLabel('``orgCount``')).toBe('orgCount');
    expect(symbolFromLabel('`orgCount')).toBe('orgCount');
    expect(symbolFromLabel('orgCount```')).toBe('orgCount');
    expect(symbolFromLabel('` orgCount `')).toBe('orgCount');
    expect(symbolFromLabel('```')).toBeNull();
    expect(symbolFromLabel('')).toBeNull();
    expect(symbolFromLabel('a`b')).toBeNull();
    expect(symbolFromLabel('`a` `b`')).toBeNull();
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

  it('writes each l of an existing line fragment as L', () => {
    const body = [
      '[a](firestore.rules#l6)',
      '[b](firestore.rules#l6-l8)',
      '[c](firestore.rules#L6-l8)',
    ];
    const out = runCodeEvidence(body.join('\n'), '/tmp/claim.md');
    expect(out.split('\n')).toEqual([
      '[a](firestore.rules#L6)',
      '[b](firestore.rules#L6-L8)',
      '[c](firestore.rules#L6-L8)',
    ]);
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

function writeTree(root: string, files: Record<string, string>): void {
  for (const [rel, text] of Object.entries(files)) {
    mkdirSync(dirname(join(root, rel)), { recursive: true });
    writeFileSync(join(root, rel), text);
  }
}

/** Guide a under `docs/`, compiled into `outputDir` under `docs/` and the monolith there. */
function guideAOptions(work: string, outputDir: string, hooks?: string[]): CompileOptionsInput {
  const docs = join(work, 'docs');
  return {
    guidesRoot: docs,
    compileOrder: ['a'],
    docsRoot: docs,
    config: { outputDir, outputFile: 'guides.md', compileOrder: ['a'] },
    guides: [{ name: 'a', compile: hooks ? { hooks } : {} }],
  };
}

// `target` is on line 3 of the real src/foo.ts. The decoy is another foo.ts that the link the hook
// writes leads to from the shard's directory or the guide directory. The shard writes the link twice
// with the same text, and assembly has to mark each copy.
const EVIDENCE_TREE = {
  'src/foo.ts': 'const a = 1;\nconst b = 2;\nexport function target() {}\n',
  'docs/a/index.md': '# Guide A\n\n- [Deep](./sub/deep.md)\n',
  'docs/a/sub/deep.md':
    '# Deep\n\nSee [`target`](../../../src/foo.ts).\n\nAgain [`target`](../../../src/foo.ts).\n',
};

/** Expect both copies of the shard's link in `text`, each with the path `path`. */
function expectBothCopies(text: string | undefined, path: string): void {
  expect(text).toContain(`See [\`target\`](${path}).`);
  expect(text).toContain(`Again [\`target\`](${path}).`);
}

describe('codeEvidence — publish-relative pass', () => {
  // The hook writes ../../src/foo.ts#L3 for docs/_build/a.md. From docs/a/sub that path names
  // docs/src/foo.ts, which the publish-relative pass used to rebase the link to.
  it('leaves the path the hook wrote when it names another file from the shard directory', () => {
    withTmpDir('mdcp-evidence-decoy-shard-', (work) => {
      writeTree(work, { ...EVIDENCE_TREE, 'docs/src/foo.ts': 'export const decoy = 1;\n' });
      const [a] = compileGuideResults(guideAOptions(work, '_build'));

      expectBothCopies(a.text, '../../src/foo.ts#L3');
      expectBothCopies(a.monolithText, '../../src/foo.ts#L3');
    });
  });

  // For docs/a.md the hook writes ../src/foo.ts#L3, which names docs/a/src/foo.ts from docs/a/sub.
  it('leaves the path the hook wrote when it names another file one level up from the shard', () => {
    withTmpDir('mdcp-evidence-decoy-guide-', (work) => {
      writeTree(work, { ...EVIDENCE_TREE, 'docs/a/src/foo.ts': 'export const decoy = 1;\n' });
      const [a] = compileGuideResults(guideAOptions(work, '.'));

      expectBothCopies(a.text, '../src/foo.ts#L3');
      expectBothCopies(a.monolithText, '../src/foo.ts#L3');
    });
  });

  // Assembly tells the publish-relative pass which links the hook rebased without marking them in
  // the text a hook returns, so neither a direct caller nor a hook that runs after it sees a mark.
  it('shows no mark to a direct caller or to a hook after it', () => {
    withTmpDir('mdcp-evidence-no-mark-', (work) => {
      writeTree(work, { ...EVIDENCE_TREE, 'docs/src/foo.ts': 'export const decoy = 1;\n' });
      const seen: string[] = [];
      registerCompileHook('evidenceSpy', (ctx) => {
        seen.push(ctx.body);
        return ctx.body;
      });
      const [a] = compileGuideResults(
        guideAOptions(work, '_build', ['codeEvidence', 'evidenceSpy']),
      );
      const direct = runCodeEvidence(
        'See [`target`](../../../src/foo.ts).',
        join(work, 'docs', 'a', 'sub', 'deep.md'),
        { outputFile: join(work, 'docs', '_build', 'a.md') },
      );

      expect(seen.length).toBeGreaterThan(0);
      expect(seen.join('')).toContain('See [`target`](../../src/foo.ts#L3).');
      expect(seen.join('')).not.toContain('\u0000');
      expect(direct).toBe('See [`target`](../../src/foo.ts#L3).');
      expect(a.text).toContain('See [`target`](../../src/foo.ts#L3).');
      expect(a.text).not.toContain('\u0000');
    });
  });

  // The hook finds no file for the first link, so it leaves it as written. It rebases the second
  // link to that same text. Assembly has to mark the second link and leave the first one to the
  // publish-relative pass, which finds docs/q/conf.yaml from the guide directory.
  it('marks the link the hook rebased, not an earlier link with the same text', () => {
    withTmpDir('mdcp-evidence-same-text-', (work) => {
      writeTree(work, {
        'packages/q/conf.yaml': 'real: 1\n',
        'docs/q/conf.yaml': 'other: 1\n',
        'docs/g/index.md': '# G\n\n- [S](./sub/s.md)\n',
        'docs/g/sub/s.md':
          '# S\n\nFirst [c](../q/conf.yaml).\n\nSecond [c](../../../packages/q/conf.yaml).\n',
      });
      const docs = join(work, 'docs');
      const [g] = withCwd(work, () =>
        compileGuideResults({
          guidesRoot: docs,
          compileOrder: ['g'],
          docsRoot: docs,
          config: { outputDir: '_build', compileOrder: ['g'] },
          guides: [{ name: 'g', compile: { outputFile: join(work, 'packages/p/README.md') } }],
        }),
      );

      expect(g.text).toContain('First [c](../../docs/q/conf.yaml).');
      expect(g.text).toContain('Second [c](../q/conf.yaml).');
    });
  });
});
